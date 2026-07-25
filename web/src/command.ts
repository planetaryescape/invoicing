import { Effect, Match as M, Option, Schema as S } from "effect"
import { BrowserKeyValueStore } from "@effect/platform-browser"
import { KeyValueStore } from "effect/unstable/persistence"
import { Command } from "foldkit"
import { load, pushUrl } from "foldkit/navigation"
import { ts } from "foldkit/schema"
import {
  BankAccountInput,
  BusinessInfoInput,
  CustomerInput,
  InvoicingClient,
  InvoiceInput,
  InvoiceStatus,
  ProductInput,
} from "@invoicing/shared"
import {
  CompletedLoadExternal,
  CompletedNavigateInternal,
  CompletedStoreRevenueVisibility,
  FailedLoadData,
  FailedLoadInvoice,
  FailedMutation,
  LoadedRevenueVisibility,
  SucceededLoadData,
  SucceededLoadInvoice,
  SucceededMutation,
} from "./message.ts"

export const NavigateInternal = Command.define(
  "NavigateInternal",
  { url: S.String },
  CompletedNavigateInternal,
)(({ url }) => pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())))

export const LoadExternal = Command.define(
  "LoadExternal",
  { href: S.String },
  CompletedLoadExternal,
)(({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())))

export const LoadData = Command.define(
  "LoadData",
  SucceededLoadData,
  FailedLoadData,
)(
  Effect.gen(function* () {
    const client = yield* InvoicingClient
    const [dashboard, customers, products, bankAccounts, businessInfo, invoices] = yield* Effect.all([
      client.dashboard(),
      client.listCustomers(),
      client.listProducts(),
      client.listBankAccounts(),
      client.getBusinessInfo(),
      client.listInvoices(),
    ])
    return SucceededLoadData({
      data: {
        dashboard,
        customers,
        products,
        bankAccounts,
        businessInfo: Option.fromNullishOr(businessInfo),
        invoices,
      },
    })
  }).pipe(
    Effect.catch((error) => Effect.succeed(FailedLoadData({ error: String(error) }))),
  ),
)

export const LoadInvoice = Command.define(
  "LoadInvoice",
  { id: S.Number },
  SucceededLoadInvoice,
  FailedLoadInvoice,
)(({ id }) =>
  InvoicingClient.use((client) => client.getInvoice({ id })).pipe(
    Effect.map((invoice) => SucceededLoadInvoice({ invoice })),
    Effect.catch((error) => Effect.succeed(FailedLoadInvoice({ id, error: String(error) }))),
  ),
)

export const SaveCustomer = ts("SaveCustomer", { id: S.Option(S.Number), input: CustomerInput })
export const DeleteCustomer = ts("DeleteCustomer", { id: S.Number })
export const SaveProduct = ts("SaveProduct", { id: S.Option(S.Number), input: ProductInput })
export const DeleteProduct = ts("DeleteProduct", { id: S.Number })
export const SaveBankAccount = ts("SaveBankAccount", { id: S.Option(S.Number), input: BankAccountInput })
export const DeleteBankAccount = ts("DeleteBankAccount", { id: S.Number })
export const SetDefaultBankAccount = ts("SetDefaultBankAccount", { id: S.Number })
export const SaveBusinessInfo = ts("SaveBusinessInfo", { input: BusinessInfoInput })
export const SaveInvoice = ts("SaveInvoice", { id: S.Option(S.Number), input: InvoiceInput })
export const UpdateInvoiceStatus = ts("UpdateInvoiceStatus", { id: S.Number, status: InvoiceStatus })

export const Mutation = S.Union([
  SaveCustomer, DeleteCustomer, SaveProduct, DeleteProduct, SaveBankAccount, DeleteBankAccount,
  SetDefaultBankAccount, SaveBusinessInfo, SaveInvoice, UpdateInvoiceStatus,
])
export type Mutation = typeof Mutation.Type

const executeMutation = (mutation: Mutation) =>
  InvoicingClient.use((client) =>
    M.value(mutation).pipe(
      M.tagsExhaustive({
        SaveCustomer: ({ id, input }) => Option.match(id, {
          onNone: () => client.createCustomer(input),
          onSome: (customerId) => client.updateCustomer({ id: customerId, input }),
        }),
        DeleteCustomer: ({ id }) => client.deleteCustomer({ id }),
        SaveProduct: ({ id, input }) => Option.match(id, {
          onNone: () => client.createProduct(input),
          onSome: (productId) => client.updateProduct({ id: productId, input }),
        }),
        DeleteProduct: ({ id }) => client.deleteProduct({ id }),
        SaveBankAccount: ({ id, input }) => Option.match(id, {
          onNone: () => client.createBankAccount(input),
          onSome: (bankAccountId) => client.updateBankAccount({ id: bankAccountId, input }),
        }),
        DeleteBankAccount: ({ id }) => client.deleteBankAccount({ id }),
        SetDefaultBankAccount: ({ id }) => client.setDefaultBankAccount({ id }),
        SaveBusinessInfo: ({ input }) => client.saveBusinessInfo(input),
        SaveInvoice: ({ id, input }) => Option.match(id, {
          onNone: () => client.createInvoice(input),
          onSome: (invoiceId) => client.updateInvoice({ id: invoiceId, input }),
        }),
        UpdateInvoiceStatus: ({ id, status }) => client.updateInvoiceStatus({ id, status }),
      }),
      Effect.asVoid,
    ),
  )

export const RunMutation = Command.define(
  "RunMutation",
  { mutation: Mutation, destination: S.String },
  SucceededMutation,
  FailedMutation,
)(({ mutation, destination }) =>
  executeMutation(mutation).pipe(
    Effect.as(SucceededMutation({ destination })),
    Effect.catch((error) => Effect.succeed(FailedMutation({ error: String(error) }))),
  ),
)

export const StoreRevenueVisibility = Command.define(
  "StoreRevenueVisibility",
  { isHidden: S.Boolean },
  CompletedStoreRevenueVisibility,
)(({ isHidden }) =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set("revenue-hidden", isHidden ? "true" : "false")
    return CompletedStoreRevenueVisibility()
  }).pipe(
    Effect.catch(() => Effect.succeed(CompletedStoreRevenueVisibility())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)

export const LoadRevenueVisibility = Command.define(
  "LoadRevenueVisibility",
  LoadedRevenueVisibility,
)(
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const stored = yield* store.get("revenue-hidden")
    return LoadedRevenueVisibility({ isHidden: stored === "true" })
  }).pipe(
    Effect.catch(() => Effect.succeed(LoadedRevenueVisibility({ isHidden: false }))),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)
