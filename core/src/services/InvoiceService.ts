import { Context, Effect, Layer } from "effect"
import { eq, desc, sql, like } from "drizzle-orm"
import { Database, DatabaseError } from "./Database.ts"
import { ProductService } from "./ProductService.ts"
import { BusinessInfoService } from "./BusinessInfoService.ts"
import { BankAccountService } from "./BankAccountService.ts"
import { invoices, invoiceLineItems, products } from "../db/drizzle-schema.ts"
import type { Invoice, InvoiceLineItem, InvoiceStatus, CreateInvoiceInput, UpdateInvoiceInput, CreateLineItemInput } from "../types/index.ts"

export interface InvoiceWithLineItems extends Invoice {
  lineItems: InvoiceLineItem[]
}

export class InvoiceService extends Context.Service<
  InvoiceService,
  {
    readonly list: () => Effect.Effect<Invoice[], DatabaseError>
    readonly get: (id: number) => Effect.Effect<InvoiceWithLineItems | undefined, DatabaseError>
    readonly create: (input: CreateInvoiceInput) => Effect.Effect<InvoiceWithLineItems, DatabaseError>
    readonly update: (id: number, input: UpdateInvoiceInput) => Effect.Effect<InvoiceWithLineItems, DatabaseError>
    readonly updateStatus: (id: number, status: InvoiceStatus) => Effect.Effect<Invoice, DatabaseError>
    readonly getNextInvoiceNumber: () => Effect.Effect<string, DatabaseError>
  }
>()("InvoiceService") {}

export const InvoiceServiceLive = Layer.effect(
  InvoiceService,
  Effect.gen(function* () {
    const database = yield* Database
    const productService = yield* ProductService
    const businessInfoService = yield* BusinessInfoService
    const bankAccountService = yield* BankAccountService

    const getNextInvoiceNumber = () =>
      Effect.gen(function* () {
        const result = yield* Effect.try({
          try: () =>
            database.db
              .select({
                maxNum: sql<number | null>`MAX(CAST(SUBSTR(${invoices.invoiceNumber}, 5) AS INTEGER))`,
              })
              .from(invoices)
              .where(like(invoices.invoiceNumber, "INV-%"))
              .get(),
          catch: (error) => DatabaseError.new("Failed to get next invoice number", error),
        })

        const nextNum = (result?.maxNum ?? 0) + 1
        return `INV-${String(nextNum).padStart(3, "0")}`
      })

    const getInvoiceLineItems = (invoiceId: number) =>
      Effect.try({
        try: () =>
          database.db
            .select({
              id: invoiceLineItems.id,
              invoiceId: invoiceLineItems.invoiceId,
              productId: invoiceLineItems.productId,
              productName: products.name,
              description: invoiceLineItems.description,
              quantity: invoiceLineItems.quantity,
              unitPrice: invoiceLineItems.unitPrice,
              lineTotal: invoiceLineItems.lineTotal,
              additionalNotes: invoiceLineItems.additionalNotes,
            })
            .from(invoiceLineItems)
            .leftJoin(products, eq(invoiceLineItems.productId, products.id))
            .where(eq(invoiceLineItems.invoiceId, invoiceId))
            .all() as InvoiceLineItem[],
        catch: (error) => DatabaseError.new("Failed to get invoice line items", error),
      })

    return InvoiceService.of({
      getNextInvoiceNumber,

      list: () =>
        Effect.try({
          try: () =>
            database.db.select().from(invoices).orderBy(desc(invoices.createdAt)).all() as Invoice[],
          catch: (error) => DatabaseError.new("Failed to list invoices", error),
        }),

      get: (id: number) =>
        Effect.gen(function* () {
          const invoice = yield* Effect.try({
            try: () => database.db.select().from(invoices).where(eq(invoices.id, id)).get(),
            catch: (error) => DatabaseError.new("Failed to get invoice", error),
          })

          if (!invoice) return undefined

          const lineItemsResult = yield* getInvoiceLineItems(id)

          return {
            ...invoice,
            lineItems: lineItemsResult as InvoiceLineItem[],
          } as InvoiceWithLineItems
        }),

      create: (input: CreateInvoiceInput) =>
        Effect.gen(function* () {
          const invoiceNumber = yield* getNextInvoiceNumber()

          // Resolve bank account
          let bankAccountId: number | null = input.bankAccountId ?? null
          let currency = "ZAR"
          if (bankAccountId) {
            const bankAccount = yield* bankAccountService.get(bankAccountId)
            if (bankAccount) {
              currency = bankAccount.currency
            }
          } else {
            const defaultAccount = yield* bankAccountService.getDefault()
            if (defaultAccount) {
              bankAccountId = defaultAccount.id
              currency = defaultAccount.currency
            }
          }

          const enrichedLineItems = yield* Effect.all(
            input.lineItems.map((item) =>
              Effect.gen(function* () {
                let description = item.description
                let unitPrice = item.unitPrice

                if (item.productId !== null && (description === undefined || unitPrice === undefined)) {
                  const product = yield* productService.get(item.productId)
                  if (!product) {
                    return yield* DatabaseError.new(`Product with ID ${item.productId} not found`)
                  }
                  description = description ?? product.name
                  unitPrice = unitPrice ?? product.defaultPrice
                }

                if (description === undefined || unitPrice === undefined) {
                  return yield* DatabaseError.new(
                    "Line item must have either productId or both description and unitPrice"
                  )
                }

                return {
                  productId: item.productId,
                  description,
                  quantity: item.quantity,
                  unitPrice,
                  additionalNotes: item.additionalNotes ?? null,
                }
              })
            )
          )

          const subtotal = enrichedLineItems.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          )

          let effectiveVatRate = 0
          if (input.vatRate !== null && input.vatRate !== undefined) {
             effectiveVatRate = input.vatRate
          } else {
             const businessInfo = yield* businessInfoService.get()
             if (businessInfo?.defaultVatRate) {
                effectiveVatRate = businessInfo.defaultVatRate
             }
          }

          const vatAmount = subtotal * (effectiveVatRate / 100)
          const total = subtotal + vatAmount

          yield* Effect.try({
            try: () =>
              database.db
                .insert(invoices)
                .values({
                  invoiceNumber,
                  customerId: input.customerId,
                  bankAccountId,
                  currency,
                  dueDate: input.dueDate,
                  vatRate: effectiveVatRate,
                  notes: input.notes,
                  subtotal,
                  vatAmount,
                  total,
                })
                .run(),
            catch: (error) => DatabaseError.new("Failed to create invoice", error),
          })

          const lastId = yield* Effect.try({
            try: () => database.sqlite.query("SELECT last_insert_rowid() as id").get() as { id: number },
            catch: (error) => DatabaseError.new("Failed to get last insert ID", error),
          })

          const invoice = yield* Effect.try({
            try: () => database.db.select().from(invoices).where(eq(invoices.id, lastId.id)).get(),
            catch: (error) => DatabaseError.new("Failed to retrieve created invoice", error),
          })

          if (!invoice) {
            return yield* DatabaseError.new("Failed to retrieve created invoice")
          }

          for (const item of enrichedLineItems) {
            const lineTotal = item.quantity * item.unitPrice
            yield* Effect.try({
              try: () =>
                database.db
                  .insert(invoiceLineItems)
                  .values({
                    invoiceId: invoice.id,
                    productId: item.productId,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal,
                    additionalNotes: item.additionalNotes,
                  })
                  .run(),
              catch: (error) => DatabaseError.new("Failed to create invoice line item", error),
            })
          }

          const lineItemsResult = yield* getInvoiceLineItems(invoice.id).pipe(
            Effect.mapError((error) => DatabaseError.new("Failed to get created invoice line items", error))
          )

          return {
            ...invoice,
            lineItems: lineItemsResult as InvoiceLineItem[],
          } as InvoiceWithLineItems
        }),

      updateStatus: (id: number, status: InvoiceStatus) =>
        Effect.gen(function* () {
          const paidAt = status === "paid" ? new Date().toISOString() : null

          yield* Effect.try({
            try: () =>
              database.db
                .update(invoices)
                .set({ status, paidAt })
                .where(eq(invoices.id, id))
                .run(),
            catch: (error) => DatabaseError.new("Failed to update invoice status", error),
          })

          const invoice = yield* Effect.try({
            try: () => database.db.select().from(invoices).where(eq(invoices.id, id)).get(),
            catch: (error) => DatabaseError.new("Failed to retrieve updated invoice", error),
          })

          if (!invoice) {
            return yield* DatabaseError.new("Invoice not found")
          }

          return invoice as Invoice
        }),

      update: (id: number, input: UpdateInvoiceInput) =>
        Effect.gen(function* () {
          // Resolve bank account
          let bankAccountId: number | null = input.bankAccountId ?? null
          let currency = "ZAR"
          if (bankAccountId) {
            const bankAccount = yield* bankAccountService.get(bankAccountId)
            if (bankAccount) {
              currency = bankAccount.currency
            }
          } else {
            const defaultAccount = yield* bankAccountService.getDefault()
            if (defaultAccount) {
              bankAccountId = defaultAccount.id
              currency = defaultAccount.currency
            }
          }

          const enrichedLineItems = yield* Effect.all(
            input.lineItems.map((item: CreateLineItemInput) =>
              Effect.gen(function* () {
                let description = item.description
                let unitPrice = item.unitPrice

                if (item.productId !== null && (description === undefined || unitPrice === undefined)) {
                  const product = yield* productService.get(item.productId)
                  if (!product) {
                    return yield* DatabaseError.new(`Product with ID ${item.productId} not found`)
                  }
                  description = description ?? product.name
                  unitPrice = unitPrice ?? product.defaultPrice
                }

                if (description === undefined || unitPrice === undefined) {
                  return yield* DatabaseError.new(
                    "Line item must have either productId or both description and unitPrice"
                  )
                }

                return {
                  productId: item.productId,
                  description,
                  quantity: item.quantity,
                  unitPrice,
                  additionalNotes: item.additionalNotes ?? null,
                } as const
              })
            )
          )

          const subtotal = enrichedLineItems.reduce(
            (sum: number, item) => sum + item.quantity * item.unitPrice,
            0
          )

          let effectiveVatRate = 0
          if (input.vatRate !== null && input.vatRate !== undefined) {
             effectiveVatRate = input.vatRate
          } else {
             const businessInfo = yield* businessInfoService.get()
             if (businessInfo?.defaultVatRate) {
                effectiveVatRate = businessInfo.defaultVatRate
             }
          }

          const vatAmount = subtotal * (effectiveVatRate / 100)
          const total = subtotal + vatAmount

          yield* Effect.try({
            try: () =>
              database.db
                .update(invoices)
                .set({
                  customerId: input.customerId,
                  bankAccountId,
                  currency,
                  dueDate: input.dueDate,
                  vatRate: effectiveVatRate,
                  notes: input.notes,
                  subtotal,
                  vatAmount,
                  total,
                })
                .where(eq(invoices.id, id))
                .run(),
            catch: (error) => DatabaseError.new("Failed to update invoice", error),
          })

          // Update line items: simplest way is to delete and re-insert
          yield* Effect.try({
            try: () => database.db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id)).run(),
            catch: (error) => DatabaseError.new("Failed to delete old line items", error),
          })

          for (const item of enrichedLineItems) {
            const lineTotal = item.quantity * item.unitPrice
            yield* Effect.try({
              try: () =>
                database.db
                  .insert(invoiceLineItems)
                  .values({
                    invoiceId: id,
                    productId: item.productId,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal,
                    additionalNotes: item.additionalNotes,
                  })
                  .run(),
              catch: (error) => DatabaseError.new("Failed to create invoice line item", error),
            })
          }

          const invoice = yield* Effect.try({
            try: () => database.db.select().from(invoices).where(eq(invoices.id, id)).get(),
            catch: (error) => DatabaseError.new("Failed to retrieve updated invoice", error),
          })

          if (!invoice) {
            return yield* DatabaseError.new("Failed to retrieve updated invoice")
          }

          const lineItemsResult = yield* getInvoiceLineItems(id).pipe(
            Effect.mapError((error) => DatabaseError.new("Failed to get updated invoice line items", error))
          )

          return {
            ...invoice,
            lineItems: lineItemsResult as InvoiceLineItem[],
          } as InvoiceWithLineItems
        }),
    })
  })
)
