import { Context, Effect, Layer, Schema } from "effect"
import { InvoiceService } from "./InvoiceService.ts"
import { CustomerService } from "./CustomerService.ts"
import { BusinessInfoService } from "./BusinessInfoService.ts"
import { BankAccountService } from "./BankAccountService.ts"
import { PDFService, PDFError } from "./PDFService.ts"
import { DatabaseError } from "./Database.ts"
import { generateInvoiceHTML, generateReceiptHTML } from "../templates/invoice-template.ts"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export class InvoicePDFError extends Schema.TaggedErrorClass<InvoicePDFError>()("InvoicePDFError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Defect()),
}) {
  static new(message: string, cause?: unknown): InvoicePDFError {
    return new InvoicePDFError({ message, ...(cause === undefined ? {} : { cause }) })
  }
}

export class InvoicePDFService extends Context.Service<
  InvoicePDFService,
  {
    readonly generatePDF: (
      invoiceId: number
    ) => Effect.Effect<Buffer, InvoicePDFError | DatabaseError | PDFError>
    readonly generateReceiptPDF: (
      invoiceId: number
    ) => Effect.Effect<Buffer, InvoicePDFError | DatabaseError | PDFError>
  }
>()("InvoicePDFService") {}

export const InvoicePDFServiceLive = Layer.effect(
  InvoicePDFService,
  Effect.gen(function* () {
    const invoiceService = yield* InvoiceService
    const customerService = yield* CustomerService
    const businessInfoService = yield* BusinessInfoService
    const bankAccountService = yield* BankAccountService
    const pdfService = yield* PDFService

    const buildTemplateData = (invoiceId: number) =>
      Effect.gen(function* () {
        const invoiceWithLineItems = yield* invoiceService.get(invoiceId)
        if (!invoiceWithLineItems) {
          return yield* InvoicePDFError.new(`Invoice with id ${invoiceId} not found`)
        }

        const customer = yield* customerService.get(invoiceWithLineItems.customerId)
        if (!customer) {
          return yield* InvoicePDFError.new(
            `Customer with id ${invoiceWithLineItems.customerId} not found`
          )
        }

        const businessInfo = yield* businessInfoService.get()
        if (!businessInfo) {
          return yield* InvoicePDFError.new("Business info not configured")
        }

        const bankAccount = invoiceWithLineItems.bankAccountId
          ? yield* bankAccountService.get(invoiceWithLineItems.bankAccountId)
          : undefined

        let logoDataUrl: string | undefined
        if (businessInfo.logoPath) {
          const logoPath = join(process.cwd(), businessInfo.logoPath)
          const logoBuffer = yield* Effect.tryPromise({
            try: () => readFile(logoPath),
            catch: () => InvoicePDFError.new(`Failed to read logo file: ${businessInfo.logoPath}`),
          }).pipe(Effect.orElseSucceed(() => undefined))

          if (logoBuffer) {
            const ext = businessInfo.logoPath.split(".").pop()?.toLowerCase()
            const mimeType = ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : "image/jpeg"
            logoDataUrl = `data:${mimeType};base64,${logoBuffer.toString("base64")}`
          }
        }

        return {
          invoice: invoiceWithLineItems,
          lineItems: invoiceWithLineItems.lineItems,
          customer,
          businessInfo,
          bankAccount: bankAccount ?? undefined,
          logoDataUrl,
        }
      })

    return InvoicePDFService.of({
      generateReceiptPDF: (invoiceId: number) =>
        Effect.gen(function* () {
          const templateData = yield* buildTemplateData(invoiceId)
          if (templateData.invoice.status !== "paid") {
            return yield* InvoicePDFError.new("Receipt can only be generated for paid invoices")
          }
          const html = generateReceiptHTML(templateData)
          return yield* pdfService.generatePDF({ html, format: "A4", printBackground: true })
        }),

      generatePDF: (invoiceId: number) =>
        Effect.gen(function* () {
          const templateData = yield* buildTemplateData(invoiceId)
          const html = generateInvoiceHTML(templateData)
          return yield* pdfService.generatePDF({ html, format: "A4", printBackground: true })
        }),
    })
  })
)
