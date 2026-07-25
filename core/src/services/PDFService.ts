import { Context, Effect, Layer, Schema } from "effect"
import puppeteer from "puppeteer"

export class PDFError extends Schema.TaggedErrorClass<PDFError>()("PDFError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Defect()),
}) {
  static new(message: string, cause?: unknown): PDFError {
    return new PDFError({ message, ...(cause === undefined ? {} : { cause }) })
  }
}

export interface GeneratePDFOptions {
  html: string
  format?: "A4" | "Letter"
  printBackground?: boolean
}

export class PDFService extends Context.Service<
  PDFService,
  {
    readonly generatePDF: (options: GeneratePDFOptions) => Effect.Effect<Buffer, PDFError>
  }
>()("PDFService") {}

export const PDFServiceLive = Layer.succeed(
  PDFService,
  PDFService.of({
    generatePDF: (options: GeneratePDFOptions) =>
      Effect.acquireUseRelease(
        Effect.tryPromise({
          try: () => puppeteer.launch({ headless: true }),
          catch: (error) => PDFError.new("Failed to launch browser", error),
        }),
        (browser) =>
          Effect.gen(function* () {
          const page = yield* Effect.tryPromise({
            try: () => browser.newPage(),
            catch: (error) => PDFError.new("Failed to create new page", error),
          })

          yield* Effect.tryPromise({
            try: () => page.setContent(options.html, { waitUntil: "networkidle0" }),
            catch: (error) => PDFError.new("Failed to set page content", error),
          })

          const pdfBuffer = yield* Effect.tryPromise({
            try: () =>
              page.pdf({
                format: options.format || "A4",
                printBackground: options.printBackground ?? true,
                margin: {
                  top: "20mm",
                  right: "15mm",
                  bottom: "20mm",
                  left: "15mm",
                },
              }),
            catch: (error) => PDFError.new("Failed to generate PDF", error),
          })

          return Buffer.from(pdfBuffer)
          }),
        (browser) =>
          Effect.tryPromise({
            try: () => browser.close(),
            catch: () => PDFError.new("Failed to close browser"),
          }).pipe(Effect.ignore)
      ),
  })
)
