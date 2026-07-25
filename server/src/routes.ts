import { Effect, Layer } from "effect"
import { HttpRouter, HttpServer, HttpServerResponse } from "effect/unstable/http"
import { RpcSerialization, RpcServer } from "effect/unstable/rpc"
import {
  Database,
  InvoicePDFService,
  InvoicePDFServiceLive,
  PDFServiceLive,
} from "@invoicing/core"
import { InvoicingRpcs } from "@invoicing/shared"
import { InvoicingHandlersLive, makeCoreServicesLayer } from "./handlers.ts"

const errorResponse = (message: string, status: number) =>
  HttpServerResponse.jsonUnsafe({ error: message }, { status })

const webRoot = new URL("./public/", import.meta.url).pathname
const assetFileNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

const parseInvoiceId = Effect.fn("PdfRoute.parseInvoiceId")(function* () {
  const { id } = yield* HttpRouter.params
  const invoiceId = Number.parseInt(id ?? "")
  if (Number.isNaN(invoiceId)) {
    return yield* Effect.fail(errorResponse("Invalid ID parameter", 400))
  }
  return invoiceId
})

const pdfHandler = (kind: "invoice" | "receipt") =>
  Effect.gen(function* () {
    const invoiceId = yield* parseInvoiceId()
    const service = yield* InvoicePDFService
    const pdf = kind === "invoice"
      ? yield* service.generatePDF(invoiceId)
      : yield* service.generateReceiptPDF(invoiceId)
    return HttpServerResponse.uint8Array(pdf, {
      contentType: "application/pdf",
      headers: {
        "content-disposition": `attachment; filename="${kind}-${invoiceId}.pdf"`,
      },
    })
  }).pipe(
    Effect.catch((error) =>
      Effect.succeed(
        HttpServerResponse.isHttpServerResponse(error)
          ? error
          : errorResponse(error instanceof Error ? error.message : "Internal server error", 500),
      ),
    ),
  )

export const PdfRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/api/invoices/:id/pdf", pdfHandler("invoice")),
  HttpRouter.add("GET", "/api/invoices/:id/receipt/pdf", pdfHandler("receipt")),
)

const indexResponse = HttpServerResponse.file(`${webRoot}index.html`).pipe(
  Effect.catch(() => Effect.succeed(errorResponse("Web application is not built", 503))),
)

export const WebRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/assets/:file", Effect.gen(function* () {
    const { file } = yield* HttpRouter.params
    if (file === undefined || !assetFileNamePattern.test(file)) {
      return errorResponse("Asset not found", 404)
    }
    return yield* HttpServerResponse.file(`${webRoot}assets/${file}`).pipe(
      Effect.catch(() => Effect.succeed(errorResponse("Asset not found", 404))),
    )
  })),
  HttpRouter.add("GET", "/assets/*", Effect.succeed(errorResponse("Asset not found", 404))),
  HttpRouter.add("GET", "/api/*", Effect.succeed(errorResponse("API route not found", 404))),
  HttpRouter.add("GET", "/rpc/*", Effect.succeed(errorResponse("RPC route not found", 404))),
  HttpRouter.add("GET", "/", indexResponse),
  HttpRouter.add("GET", "/*", indexResponse),
)

export const makeRpcRoutes = <E>(databaseLayer: Layer.Layer<Database, E>) => {
  const handlers = InvoicingHandlersLive.pipe(Layer.provide(makeCoreServicesLayer(databaseLayer)))
  return RpcServer.layerHttp({
    group: InvoicingRpcs,
    path: "/rpc",
    protocol: "http",
  }).pipe(
    Layer.provide(handlers),
    Layer.provide(RpcSerialization.layerNdjson),
  )
}

const makeApiRoutes = <E>(databaseLayer: Layer.Layer<Database, E>) => {
  const coreServices = makeCoreServicesLayer(databaseLayer)
  const pdfService = InvoicePDFServiceLive.pipe(
    Layer.provide(PDFServiceLive),
    Layer.provide(coreServices),
  )
  return Layer.mergeAll(
    makeRpcRoutes(databaseLayer),
    PdfRoutes.pipe(HttpRouter.provideRequest(pdfService)),
  )
}

export const makeAppRoutes = <E>(databaseLayer: Layer.Layer<Database, E>) =>
  Layer.mergeAll(makeApiRoutes(databaseLayer), WebRoutes)

export const makeWebHandler = <E>(databaseLayer: Layer.Layer<Database, E>) =>
  HttpRouter.toWebHandler(
    makeApiRoutes(databaseLayer).pipe(Layer.provide(HttpServer.layerServices)),
    { disableLogger: true },
  )
