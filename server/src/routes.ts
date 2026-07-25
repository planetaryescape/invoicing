import { Effect, Layer } from "effect"
import { BunFileSystem, BunPath } from "@effect/platform-bun"
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

const parseInvoiceId = Effect.fn("PdfRoute.parseInvoiceId")(function* () {
  const { id } = yield* HttpRouter.params
  const invoiceId = Number(id)
  if (!/^[1-9]\d*$/.test(id ?? "") || !Number.isSafeInteger(invoiceId)) {
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

export const makeAppRoutes = <E>(databaseLayer: Layer.Layer<Database, E>) => {
  const coreServices = makeCoreServicesLayer(databaseLayer)
  const pdfService = InvoicePDFServiceLive.pipe(
    Layer.provide(PDFServiceLive),
    Layer.provide(coreServices),
    Layer.provide(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  )
  return Layer.mergeAll(makeRpcRoutes(databaseLayer), PdfRoutes.pipe(HttpRouter.provideRequest(pdfService)))
}

export const makeWebHandler = <E>(databaseLayer: Layer.Layer<Database, E>) =>
  HttpRouter.toWebHandler(
    makeAppRoutes(databaseLayer).pipe(Layer.provide(HttpServer.layerServices)),
    { disableLogger: true },
  )
