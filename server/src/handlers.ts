import { Effect, Layer } from "effect"
import {
  BankAccountService,
  BankAccountServiceLive,
  BusinessInfoService,
  BusinessInfoServiceLive,
  CustomerService,
  CustomerServiceLive,
  Database,
  type DatabaseError,
  InvoiceService,
  InvoiceServiceLive,
  ProductService,
  ProductServiceLive,
  type CreateInvoiceInput,
} from "@invoicing/core"
import {
  BankAccountNotFoundError,
  CustomerNotFoundError,
  InvoicingRpcs,
  InvoiceNotFoundError,
  OperationError,
  ProductNotFoundError,
  type InvoiceInput,
} from "@invoicing/shared"

const mapDatabaseError = (operation: string) =>
  Effect.mapError((error: DatabaseError) => new OperationError({ operation, message: error.message }))

const toInvoiceInput = (input: InvoiceInput): CreateInvoiceInput => ({
  customerId: input.customerId,
  ...(input.bankAccountId === undefined ? {} : { bankAccountId: input.bankAccountId }),
  dueDate: input.dueDate,
  vatRate: input.vatRate,
  notes: input.notes,
  lineItems: input.lineItems.map((lineItem) => ({
    productId: lineItem.productId,
    ...(lineItem.description === undefined ? {} : { description: lineItem.description }),
    quantity: lineItem.quantity,
    ...(lineItem.unitPrice === undefined ? {} : { unitPrice: lineItem.unitPrice }),
    ...(lineItem.additionalNotes === undefined ? {} : { additionalNotes: lineItem.additionalNotes }),
  })),
})

export const InvoicingHandlersLive = InvoicingRpcs.toLayer(
  Effect.gen(function* () {
    const customers = yield* CustomerService
    const products = yield* ProductService
    const bankAccounts = yield* BankAccountService
    const businessInfo = yield* BusinessInfoService
    const invoices = yield* InvoiceService

    const getCustomer = Effect.fn("InvoicingRpc.getCustomer")(function* (id: number, operation: string) {
      const customer = yield* customers.get(id).pipe(mapDatabaseError(operation))
      if (customer === undefined) {
        return yield* new CustomerNotFoundError({ id })
      }
      return customer
    })

    const getProduct = Effect.fn("InvoicingRpc.getProduct")(function* (id: number, operation: string) {
      const product = yield* products.get(id).pipe(mapDatabaseError(operation))
      if (product === undefined) {
        return yield* new ProductNotFoundError({ id })
      }
      return product
    })

    const getBankAccount = Effect.fn("InvoicingRpc.getBankAccount")(function* (id: number, operation: string) {
      const bankAccount = yield* bankAccounts.get(id).pipe(mapDatabaseError(operation))
      if (bankAccount === undefined) {
        return yield* new BankAccountNotFoundError({ id })
      }
      return bankAccount
    })

    const getInvoice = Effect.fn("InvoicingRpc.getInvoice")(function* (id: number, operation: string) {
      const invoice = yield* invoices.get(id).pipe(mapDatabaseError(operation))
      if (invoice === undefined) {
        return yield* new InvoiceNotFoundError({ id })
      }
      return invoice
    })

    return {
      dashboard: () =>
        Effect.gen(function* () {
          const [invoiceList, customerList, productList] = yield* Effect.all([
            invoices.list().pipe(mapDatabaseError("dashboard")),
            customers.list().pipe(mapDatabaseError("dashboard")),
            products.list().pipe(mapDatabaseError("dashboard")),
          ])
          const revenueByCurrency = invoiceList.reduce<Record<string, number>>((totals, invoice) => {
            totals[invoice.currency] = (totals[invoice.currency] ?? 0) + invoice.total
            return totals
          }, {})
          return {
            revenueByCurrency,
            invoiceCount: invoiceList.length,
            customerCount: customerList.length,
            productCount: productList.length,
            recentInvoices: invoiceList.slice(0, 5),
          }
        }),
      listCustomers: () => customers.list().pipe(mapDatabaseError("listCustomers")),
      getCustomer: ({ id }) => getCustomer(id, "getCustomer"),
      createCustomer: (input) => customers.create(input).pipe(mapDatabaseError("createCustomer")),
      updateCustomer: ({ id, input }) =>
        Effect.andThen(getCustomer(id, "updateCustomer"), customers.update(id, input).pipe(mapDatabaseError("updateCustomer"))),
      deleteCustomer: ({ id }) => customers.delete(id).pipe(mapDatabaseError("deleteCustomer")),
      listProducts: () => products.list().pipe(mapDatabaseError("listProducts")),
      getProduct: ({ id }) => getProduct(id, "getProduct"),
      createProduct: (input) => products.create(input).pipe(mapDatabaseError("createProduct")),
      updateProduct: ({ id, input }) =>
        Effect.andThen(getProduct(id, "updateProduct"), products.update(id, input).pipe(mapDatabaseError("updateProduct"))),
      deleteProduct: ({ id }) => products.delete(id).pipe(mapDatabaseError("deleteProduct")),
      listBankAccounts: () => bankAccounts.list().pipe(mapDatabaseError("listBankAccounts")),
      getBankAccount: ({ id }) => getBankAccount(id, "getBankAccount"),
      createBankAccount: (input) => bankAccounts.create(input).pipe(mapDatabaseError("createBankAccount")),
      updateBankAccount: ({ id, input }) =>
        Effect.andThen(
          getBankAccount(id, "updateBankAccount"),
          bankAccounts.update(id, input).pipe(mapDatabaseError("updateBankAccount")),
        ),
      deleteBankAccount: ({ id }) => bankAccounts.delete(id).pipe(mapDatabaseError("deleteBankAccount")),
      setDefaultBankAccount: ({ id }) =>
        Effect.andThen(
          getBankAccount(id, "setDefaultBankAccount"),
          bankAccounts.setDefault(id).pipe(mapDatabaseError("setDefaultBankAccount")),
        ),
      getBusinessInfo: () =>
        businessInfo.get().pipe(
          mapDatabaseError("getBusinessInfo"),
          Effect.map((info) => info ?? null),
        ),
      saveBusinessInfo: (input) => businessInfo.createOrUpdate(input).pipe(mapDatabaseError("saveBusinessInfo")),
      listInvoices: () => invoices.list().pipe(mapDatabaseError("listInvoices")),
      getInvoice: ({ id }) => getInvoice(id, "getInvoice"),
      createInvoice: (input) => invoices.create(toInvoiceInput(input)).pipe(mapDatabaseError("createInvoice")),
      updateInvoice: ({ id, input }) =>
        Effect.andThen(
          getInvoice(id, "updateInvoice"),
          invoices.update(id, toInvoiceInput(input)).pipe(mapDatabaseError("updateInvoice")),
        ),
      updateInvoiceStatus: ({ id, status }) =>
        Effect.andThen(
          getInvoice(id, "updateInvoiceStatus"),
          invoices.updateStatus(id, status).pipe(mapDatabaseError("updateInvoiceStatus")),
        ),
    }
  }),
)

export const makeCoreServicesLayer = <E>(databaseLayer: Layer.Layer<Database, E>) =>
  InvoiceServiceLive.pipe(
    Layer.provideMerge(ProductServiceLive),
    Layer.provideMerge(CustomerServiceLive),
    Layer.provideMerge(BusinessInfoServiceLive),
    Layer.provideMerge(BankAccountServiceLive),
    Layer.provideMerge(databaseLayer),
  )
