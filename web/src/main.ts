import { Array, Match as M, Option } from "effect"
import { AsyncData, Command, Runtime } from "foldkit"
import { evo } from "foldkit/struct"
import { Url, toString as urlToString } from "foldkit/url"
import { InvoicingClient, type BankAccount, type BusinessInfo, type Customer, type InvoiceInput, type InvoiceWithLineItems, type Product } from "@invoicing/shared"
import {
  DeleteBankAccount,
  DeleteCustomer,
  DeleteProduct,
  LoadData,
  LoadExternal,
  LoadInvoice,
  LoadRevenueVisibility,
  NavigateInternal,
  RunMutation,
  SaveBankAccount,
  SaveBusinessInfo,
  SaveCustomer,
  SaveInvoice,
  SaveProduct,
  SetDefaultBankAccount,
  StoreRevenueVisibility,
  UpdateInvoiceStatus,
} from "./command.ts"
import {
  ApplicationDataState,
  InvoiceDataState,
  Model,
  emptyBankAccountForm,
  emptyBusinessInfoForm,
  emptyCustomerForm,
  emptyInvoiceForm,
  emptyLineItemForm,
  emptyProductForm,
  type BankAccountForm,
  type BusinessInfoForm,
  type CustomerForm,
  type InvoiceForm,
  type ProductForm,
} from "./model.ts"
import { Message } from "./message.ts"
import {
  type AppRoute,
  bankAccountsRouter,
  businessInfoRouter,
  customersRouter,
  invoiceRouter,
  invoicesRouter,
  productsRouter,
  urlToAppRoute,
} from "./route.ts"
import { view } from "./view.ts"

const toCustomerForm = (customer: Customer): CustomerForm => ({
  id: Option.some(customer.id), name: customer.name, vatNumber: customer.vatNumber ?? "", streetAddress: customer.streetAddress,
  city: customer.city, postalCode: customer.postalCode, country: customer.country, email: customer.email, phone: customer.phone,
})

const toProductForm = (product: Product): ProductForm => ({
  id: Option.some(product.id), name: product.name, description: product.description ?? "", defaultPrice: String(product.defaultPrice),
})

const toBankAccountForm = (account: BankAccount): BankAccountForm => ({
  id: Option.some(account.id), label: account.label, currency: account.currency, accountHolderName: account.accountHolderName,
  bankName: account.bankName, accountNumber: account.accountNumber ?? "", branchCode: account.branchCode ?? "", iban: account.iban ?? "",
  swiftBic: account.swiftBic ?? "", bankAddress: account.bankAddress ?? "", isDefault: account.isDefault,
})

const toBusinessInfoForm = (info: BusinessInfo): BusinessInfoForm => ({
  companyName: info.companyName, streetAddress: info.streetAddress, city: info.city, postalCode: info.postalCode, country: info.country,
  vatNumber: info.vatNumber, email: info.email, phone: info.phone, accountHolderName: info.accountHolderName, bankName: info.bankName,
  accountNumber: info.accountNumber, branchCode: info.branchCode, defaultVatRate: info.defaultVatRate === null ? "" : String(info.defaultVatRate),
})

const toInvoiceForm = (invoice: InvoiceWithLineItems): InvoiceForm => ({
  id: Option.some(invoice.id), customerId: String(invoice.customerId), bankAccountId: invoice.bankAccountId === null ? "" : String(invoice.bankAccountId),
  dueDate: invoice.dueDate, vatRate: invoice.vatRate === null ? "" : String(invoice.vatRate), notes: invoice.notes ?? "",
  lineItems: invoice.lineItems.map((item, index) => ({
    key: index, productId: item.productId === null ? "" : String(item.productId), description: item.description,
    quantity: String(item.quantity), unitPrice: String(item.unitPrice), additionalNotes: item.additionalNotes ?? "",
  })),
  nextLineKey: invoice.lineItems.length,
})

const parseOptionalNumber = (value: string): number | null => value.trim() === "" ? null : Number(value)
const isValidOptionalNumber = (value: string): boolean => value.trim() === "" || Number.isFinite(Number(value))
const emptyToNull = (value: string): string | null => value.trim() === "" ? null : value.trim()

const invoiceInput = (form: InvoiceForm): Option.Option<InvoiceInput> => {
  const customerId = Number(form.customerId)
  const lineItems = form.lineItems.map((item) => ({
    productId: parseOptionalNumber(item.productId),
    ...(item.description.trim() === "" ? {} : { description: item.description.trim() }),
    quantity: Number(item.quantity),
    ...(item.unitPrice.trim() === "" ? {} : { unitPrice: Number(item.unitPrice) }),
    additionalNotes: emptyToNull(item.additionalNotes),
  }))
  if (
    form.customerId.trim() === ""
    || form.dueDate.trim() === ""
    || !Number.isFinite(customerId)
    || !isValidOptionalNumber(form.bankAccountId)
    || !isValidOptionalNumber(form.vatRate)
    || lineItems.some((item) => !Number.isFinite(item.quantity) || (item.unitPrice !== undefined && !Number.isFinite(item.unitPrice)))
  ) {
    return Option.none()
  }
  return Option.some({
    customerId,
    bankAccountId: parseOptionalNumber(form.bankAccountId),
    dueDate: form.dueDate,
    vatRate: parseOptionalNumber(form.vatRate),
    notes: emptyToNull(form.notes),
    lineItems,
  })
}

const updateCustomerField = (form: CustomerForm, field: "name" | "vatNumber" | "streetAddress" | "city" | "postalCode" | "country" | "email" | "phone", value: string): CustomerForm =>
  M.value(field).pipe(
    M.when("name", () => evo(form, { name: () => value })), M.when("vatNumber", () => evo(form, { vatNumber: () => value })),
    M.when("streetAddress", () => evo(form, { streetAddress: () => value })), M.when("city", () => evo(form, { city: () => value })),
    M.when("postalCode", () => evo(form, { postalCode: () => value })), M.when("country", () => evo(form, { country: () => value })),
    M.when("email", () => evo(form, { email: () => value })), M.orElse(() => evo(form, { phone: () => value })),
  )

type AppCommand = Command.Command<Message, never, InvoicingClient>

const prepareRoute = (model: Model, route: AppRoute): readonly [Model, ReadonlyArray<AppCommand>] => {
  const maybeData = AsyncData.getData(model.data)
  const next: Model = evo(model, {
    route: () => route,
    selectedInvoice: () => InvoiceDataState.Idle(),
    error: () => Option.none(),
  })
  return M.value(route).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<AppCommand>]>(),
    M.tag("NewCustomer", () => [evo(next, { customerForm: emptyCustomerForm }), []]),
    M.tag("NewProduct", () => [evo(next, { productForm: emptyProductForm }), []]),
    M.tag("NewBankAccount", () => [evo(next, { bankAccountForm: emptyBankAccountForm }), []]),
    M.tag("NewInvoice", () => [evo(next, { invoiceForm: emptyInvoiceForm }), []]),
    M.tag("EditCustomer", ({ id }) => [Option.match(maybeData, { onNone: () => evo(next, { customerForm: emptyCustomerForm }), onSome: (data) => Option.match(Array.findFirst(data.customers, (item) => item.id === id), { onNone: () => evo(next, { customerForm: emptyCustomerForm }), onSome: (item) => evo(next, { customerForm: () => toCustomerForm(item) }) }) }), []]),
    M.tag("EditProduct", ({ id }) => [Option.match(maybeData, { onNone: () => evo(next, { productForm: emptyProductForm }), onSome: (data) => Option.match(Array.findFirst(data.products, (item) => item.id === id), { onNone: () => evo(next, { productForm: emptyProductForm }), onSome: (item) => evo(next, { productForm: () => toProductForm(item) }) }) }), []]),
    M.tag("EditBankAccount", ({ id }) => [Option.match(maybeData, { onNone: () => evo(next, { bankAccountForm: emptyBankAccountForm }), onSome: (data) => Option.match(Array.findFirst(data.bankAccounts, (item) => item.id === id), { onNone: () => evo(next, { bankAccountForm: emptyBankAccountForm }), onSome: (item) => evo(next, { bankAccountForm: () => toBankAccountForm(item) }) }) }), []]),
    M.tag("BusinessInfo", () => [Option.match(maybeData, { onNone: () => next, onSome: (data) => Option.match(data.businessInfo, { onNone: () => evo(next, { businessInfoForm: emptyBusinessInfoForm }), onSome: (info) => evo(next, { businessInfoForm: () => toBusinessInfoForm(info) }) }) }), []]),
    M.tag("Invoice", ({ id }) => [evo(next, { selectedInvoice: () => InvoiceDataState.Loading() }), [LoadInvoice({ id })]]),
    M.tag("EditInvoice", ({ id }) => [evo(next, { selectedInvoice: () => InvoiceDataState.Loading() }), [LoadInvoice({ id })]]),
    M.orElse(() => [next, []]),
  )
}

export const init: Runtime.RoutingApplicationInit<Model, Message, void, InvoicingClient> = (url: Url) => [
  {
    route: urlToAppRoute(url), data: ApplicationDataState.Loading(), selectedInvoice: InvoiceDataState.Idle(), customerForm: emptyCustomerForm(),
    productForm: emptyProductForm(), bankAccountForm: emptyBankAccountForm(), businessInfoForm: emptyBusinessInfoForm(), invoiceForm: emptyInvoiceForm(),
    submission: "Idle", error: Option.none(), isRevenueHidden: false,
  },
  [LoadData(), LoadRevenueVisibility()],
]

type UpdateReturn = readonly [Model, ReadonlyArray<AppCommand>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const failForm = (model: Model, error: string): UpdateReturn => [evo(model, { error: () => Option.some(error) }), []]
const isCurrentInvoice = (model: Model, id: number): boolean =>
  (model.route._tag === "Invoice" || model.route._tag === "EditInvoice") && model.route.id === id

const runMutation = (model: Model, mutation: Parameters<typeof RunMutation>[0]["mutation"], destination: string): UpdateReturn => {
  if (model.submission === "Submitting") {
    return [model, []]
  }
  return [
    evo(model, { submission: () => "Submitting", error: () => Option.none() }),
    [RunMutation({ mutation, destination })],
  ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CompletedNavigateInternal: () => [model, []],
      CompletedLoadExternal: () => [model, []],
      CompletedStoreRevenueVisibility: () => [model, []],
      LoadedRevenueVisibility: ({ isHidden }) => [evo(model, { isRevenueHidden: () => isHidden }), []],
      ClickedLink: ({ request }) => M.value(request).pipe(withUpdateReturn, M.tagsExhaustive({
        Internal: ({ url }) => [model, [NavigateInternal({ url: urlToString(url) })]],
        External: ({ href }) => [model, [LoadExternal({ href })]],
      })),
      ChangedUrl: ({ url }) => prepareRoute(model, urlToAppRoute(url)),
      ClickedRetry: () => [evo(model, { data: () => ApplicationDataState.Loading() }), [LoadData()]],
      ClickedToggleRevenue: () => {
        const isRevenueHidden = !model.isRevenueHidden
        return [evo(model, { isRevenueHidden: () => isRevenueHidden }), [StoreRevenueVisibility({ isHidden: isRevenueHidden })]]
      },
      SucceededLoadData: ({ data }) => prepareRoute(evo(model, { data: () => ApplicationDataState.Success({ data }) }), model.route),
      FailedLoadData: ({ error }) => [evo(model, { data: () => ApplicationDataState.Failure({ error }) }), []],
      SucceededLoadInvoice: ({ invoice }) => {
        if (!isCurrentInvoice(model, invoice.id)) {
          return [model, []]
        }
        const next = evo(model, { selectedInvoice: () => InvoiceDataState.Success({ data: invoice }) })
        return model.route._tag === "EditInvoice" ? [evo(next, { invoiceForm: () => toInvoiceForm(invoice) }), []] : [next, []]
      },
      FailedLoadInvoice: ({ id, error }) => isCurrentInvoice(model, id)
        ? [evo(model, { selectedInvoice: () => InvoiceDataState.Failure({ error }) }), []]
        : [model, []],
      ClickedRetryInvoice: ({ id }) => isCurrentInvoice(model, id)
        ? [evo(model, { selectedInvoice: () => InvoiceDataState.Loading() }), [LoadInvoice({ id })]]
        : [model, []],
      UpdatedCustomerForm: ({ field, value }) => [evo(model, { customerForm: (form) => updateCustomerField(form, field, value) }), []],
      UpdatedProductForm: ({ field, value }) => [evo(model, { productForm: (form) => field === "name" ? evo(form, { name: () => value }) : field === "description" ? evo(form, { description: () => value }) : evo(form, { defaultPrice: () => value }) }), []],
      UpdatedBankAccountForm: ({ field, value }) => [evo(model, { bankAccountForm: (form) => ({ ...form, [field]: value }) }), []],
      ToggledBankAccountDefault: ({ value }) => [evo(model, { bankAccountForm: (form) => evo(form, { isDefault: () => value }) }), []],
      UpdatedBusinessInfoForm: ({ field, value }) => [evo(model, { businessInfoForm: (form) => ({ ...form, [field]: value }) }), []],
      UpdatedInvoiceForm: ({ field, value }) => [evo(model, { invoiceForm: (form) => ({ ...form, [field]: value }) }), []],
      UpdatedLineItem: ({ key, field, value }) => {
        if (field !== "productId" || value === "") {
          return [evo(model, { invoiceForm: (form) => evo(form, { lineItems: Array.map((item) => item.key === key ? { ...item, [field]: value } : item) }) }), []]
        }
        const maybeProduct = AsyncData.getData(model.data).pipe(
          Option.flatMap((data) => Array.findFirst(data.products, (product) => product.id === Number(value))),
        )
        return [evo(model, { invoiceForm: (form) => evo(form, { lineItems: Array.map((item) => item.key === key ? Option.match(maybeProduct, {
          onNone: () => evo(item, { productId: () => value }),
          onSome: (product) => evo(item, { productId: () => value, description: () => product.name, unitPrice: () => String(product.defaultPrice) }),
        }) : item) }) }), []]
      },
      ClickedAddLineItem: () => [evo(model, { invoiceForm: (form) => evo(form, { lineItems: (items) => Array.append(items, emptyLineItemForm(form.nextLineKey)), nextLineKey: (key) => key + 1 }) }), []],
      ClickedRemoveLineItem: ({ key }) => [evo(model, { invoiceForm: (form) => evo(form, { lineItems: Array.filter((item) => item.key !== key) }) }), []],
      SubmittedCustomerForm: () => model.customerForm.name.trim() === "" ? failForm(model, "Customer name is required") : runMutation(model, SaveCustomer({ id: model.customerForm.id, input: { name: model.customerForm.name, vatNumber: emptyToNull(model.customerForm.vatNumber), streetAddress: model.customerForm.streetAddress, city: model.customerForm.city, postalCode: model.customerForm.postalCode, country: model.customerForm.country, email: model.customerForm.email, phone: model.customerForm.phone } }), customersRouter()),
      SubmittedProductForm: () => model.productForm.name.trim() === "" || model.productForm.defaultPrice.trim() === "" || !Number.isFinite(Number(model.productForm.defaultPrice)) ? failForm(model, "Product name and price are required") : runMutation(model, SaveProduct({ id: model.productForm.id, input: { name: model.productForm.name, description: emptyToNull(model.productForm.description), defaultPrice: Number(model.productForm.defaultPrice) } }), productsRouter()),
      SubmittedBankAccountForm: () => model.bankAccountForm.label.trim() === "" ? failForm(model, "Account label is required") : runMutation(model, SaveBankAccount({ id: model.bankAccountForm.id, input: { label: model.bankAccountForm.label, currency: model.bankAccountForm.currency, accountHolderName: model.bankAccountForm.accountHolderName, bankName: model.bankAccountForm.bankName, accountNumber: emptyToNull(model.bankAccountForm.accountNumber), branchCode: emptyToNull(model.bankAccountForm.branchCode), iban: emptyToNull(model.bankAccountForm.iban), swiftBic: emptyToNull(model.bankAccountForm.swiftBic), bankAddress: emptyToNull(model.bankAccountForm.bankAddress), isDefault: model.bankAccountForm.isDefault } }), bankAccountsRouter()),
      SubmittedBusinessInfoForm: () => model.businessInfoForm.companyName.trim() === "" || !isValidOptionalNumber(model.businessInfoForm.defaultVatRate) ? failForm(model, "Company name and VAT rate must be valid") : runMutation(model, SaveBusinessInfo({ input: { ...model.businessInfoForm, defaultVatRate: parseOptionalNumber(model.businessInfoForm.defaultVatRate), logoPath: null } }), businessInfoRouter()),
      SubmittedInvoiceForm: () => Option.match(invoiceInput(model.invoiceForm), { onNone: () => failForm(model, "Invoice fields contain invalid numbers"), onSome: (input) => runMutation(model, SaveInvoice({ id: model.invoiceForm.id, input }), invoicesRouter()) }),
      ClickedDeleteCustomer: ({ id }) => runMutation(model, DeleteCustomer({ id }), customersRouter()),
      ClickedDeleteProduct: ({ id }) => runMutation(model, DeleteProduct({ id }), productsRouter()),
      ClickedDeleteBankAccount: ({ id }) => runMutation(model, DeleteBankAccount({ id }), bankAccountsRouter()),
      ClickedSetDefaultBankAccount: ({ id }) => runMutation(model, SetDefaultBankAccount({ id }), bankAccountsRouter()),
      ClickedUpdateInvoiceStatus: ({ id, status }) => runMutation(model, UpdateInvoiceStatus({ id, status }), invoiceRouter({ id })),
      SucceededMutation: ({ destination }) => [evo(model, { submission: () => "Idle", data: () => ApplicationDataState.Loading() }), [NavigateInternal({ url: destination }), LoadData()]],
      FailedMutation: ({ error }) => [evo(model, { submission: () => "Idle", error: () => Option.some(error) }), []],
    }),
  )

export { Message, Model, view }
