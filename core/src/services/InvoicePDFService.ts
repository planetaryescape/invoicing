import { Context, Effect, Encoding, FileSystem, Layer, Path, Schema } from "effect"
import { InvoiceService } from "./InvoiceService.ts"
import { CustomerService } from "./CustomerService.ts"
import { BusinessInfoService } from "./BusinessInfoService.ts"
import { BankAccountService } from "./BankAccountService.ts"
import { PDFService, PDFError } from "./PDFService.ts"
import { DatabaseError } from "./Database.ts"
import { generateInvoiceHTML, generateReceiptHTML } from "../templates/invoice-template.ts"

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
    const fileSystem = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const projectRoot = path.resolve(".")
    const logoRoot = path.resolve("uploads")

    const isWithin = (root: string, filePath: string): boolean => {
      const relativePath = path.relative(root, filePath)
      return relativePath !== ""
        && !path.isAbsolute(relativePath)
        && relativePath !== ".."
        && !relativePath.startsWith(`..${path.sep}`)
    }

    const legacyFileName = (fileName: string): string => {
      if (!path.isAbsolute(fileName)) {
        return fileName
      }
      return path.relative(path.parse(fileName).root, fileName)
    }

    const resolveLogoPath = Effect.fn("InvoicePDFService.resolveLogoPath")(function* (fileName: string) {
      if (![".jpeg", ".jpg", ".png", ".svg"].includes(path.extname(fileName).toLowerCase())) {
        return undefined
      }

      if (path.isAbsolute(fileName) && isWithin(logoRoot, fileName)) {
        return path.resolve(fileName)
      }

      if (path.basename(fileName) === fileName) {
        const uploadPath = path.resolve(logoRoot, fileName)
        const uploadExists = yield* fileSystem.exists(uploadPath).pipe(Effect.orElseSucceed(() => false))
        if (uploadExists) {
          return uploadPath
        }
      }

      const legacyPath = path.resolve(projectRoot, legacyFileName(fileName))
      return isWithin(projectRoot, legacyPath) ? legacyPath : undefined
    })

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
          const logoPath = yield* resolveLogoPath(businessInfo.logoPath)
          const logoBuffer = logoPath === undefined
            ? undefined
            : yield* fileSystem.readFile(logoPath).pipe(
              Effect.mapError(() => InvoicePDFError.new(`Failed to read logo file: ${businessInfo.logoPath}`)),
              Effect.orElseSucceed(() => undefined),
            )

          if (logoBuffer) {
            const ext = businessInfo.logoPath.split(".").pop()?.toLowerCase()
            const mimeType = ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : "image/jpeg"
            logoDataUrl = `data:${mimeType};base64,${Encoding.encodeBase64(logoBuffer)}`
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
