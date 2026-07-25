import { afterAll, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { InvoicePDFError, InvoicePDFService } from "@invoicing/core"
import { PdfRoutes } from "./routes.ts"

const PdfServiceTest = Layer.succeed(
  InvoicePDFService,
  InvoicePDFService.of({
    generatePDF: (id) => Effect.succeed(Buffer.from(`invoice-${id}`)),
    generateReceiptPDF: (id) => Effect.succeed(Buffer.from(`receipt-${id}`)),
  }),
)

const handler = HttpRouter.toWebHandler(
  PdfRoutes.pipe(
    HttpRouter.provideRequest(PdfServiceTest),
    Layer.provide(HttpServer.layerServices),
  ),
  { disableLogger: true },
)

test("serves both PDF route shapes with download headers", async () => {
  const invoice = await handler.handler(new Request("http://localhost/api/invoices/42/pdf"))
  const receipt = await handler.handler(new Request("http://localhost/api/invoices/42/receipt/pdf"))

  expect(invoice.status).toBe(200)
  expect(invoice.headers.get("content-type")).toBe("application/pdf")
  expect(invoice.headers.get("content-disposition")).toBe('attachment; filename="invoice-42.pdf"')
  expect(await invoice.text()).toBe("invoice-42")
  expect(receipt.status).toBe(200)
  expect(receipt.headers.get("content-type")).toBe("application/pdf")
  expect(receipt.headers.get("content-disposition")).toBe('attachment; filename="receipt-42.pdf"')
  expect(await receipt.text()).toBe("receipt-42")
})

test("returns 400 for invalid PDF IDs and 500 for generation failures", async () => {
  const invalid = await handler.handler(new Request("http://localhost/api/invoices/not-a-number/pdf"))
  expect(invalid.status).toBe(400)
  expect(await invalid.json()).toEqual({ error: "Invalid ID parameter" })

  const failingService = Layer.succeed(
    InvoicePDFService,
    InvoicePDFService.of({
      generatePDF: () => Effect.fail(InvoicePDFError.new("PDF failed")),
      generateReceiptPDF: () => Effect.fail(InvoicePDFError.new("Receipt failed")),
    }),
  )
  const failingHandler = HttpRouter.toWebHandler(
    PdfRoutes.pipe(
      HttpRouter.provideRequest(failingService),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  )
  const failed = await failingHandler.handler(new Request("http://localhost/api/invoices/1/pdf"))

  expect(failed.status).toBe(500)
  expect(await failed.json()).toEqual({ error: "PDF failed" })
  await failingHandler.dispose()
})

afterAll(async () => {
  await handler.dispose()
})
