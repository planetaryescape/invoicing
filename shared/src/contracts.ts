import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/unstable/rpc"

export const BusinessInfo = Schema.Struct({
  id: Schema.Number,
  companyName: Schema.String,
  streetAddress: Schema.String,
  city: Schema.String,
  postalCode: Schema.String,
  country: Schema.String,
  vatNumber: Schema.String,
  email: Schema.String,
  phone: Schema.String,
  logoPath: Schema.NullOr(Schema.String),
  accountHolderName: Schema.String,
  bankName: Schema.String,
  accountNumber: Schema.String,
  branchCode: Schema.String,
  defaultVatRate: Schema.NullOr(Schema.Number),
})
export type BusinessInfo = typeof BusinessInfo.Type

export const BusinessInfoInput = Schema.Struct({
  companyName: Schema.String,
  streetAddress: Schema.String,
  city: Schema.String,
  postalCode: Schema.String,
  country: Schema.String,
  vatNumber: Schema.String,
  email: Schema.String,
  phone: Schema.String,
  logoPath: Schema.optionalKey(Schema.NullOr(Schema.String)),
  accountHolderName: Schema.String,
  bankName: Schema.String,
  accountNumber: Schema.String,
  branchCode: Schema.String,
  defaultVatRate: Schema.optionalKey(Schema.NullOr(Schema.Number)),
})
export type BusinessInfoInput = typeof BusinessInfoInput.Type

export const Customer = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  vatNumber: Schema.NullOr(Schema.String),
  streetAddress: Schema.String,
  city: Schema.String,
  postalCode: Schema.String,
  country: Schema.String,
  email: Schema.String,
  phone: Schema.String,
  createdAt: Schema.String,
})
export type Customer = typeof Customer.Type

export const CustomerInput = Schema.Struct({
  name: Schema.String,
  vatNumber: Schema.NullOr(Schema.String),
  streetAddress: Schema.String,
  city: Schema.String,
  postalCode: Schema.String,
  country: Schema.String,
  email: Schema.String,
  phone: Schema.String,
})
export type CustomerInput = typeof CustomerInput.Type

export const Product = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  defaultPrice: Schema.Number,
  createdAt: Schema.String,
})
export type Product = typeof Product.Type

export const ProductInput = Schema.Struct({
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  defaultPrice: Schema.Number,
})
export type ProductInput = typeof ProductInput.Type

export const BankAccount = Schema.Struct({
  id: Schema.Number,
  label: Schema.String,
  currency: Schema.String,
  accountHolderName: Schema.String,
  bankName: Schema.String,
  accountNumber: Schema.NullOr(Schema.String),
  branchCode: Schema.NullOr(Schema.String),
  iban: Schema.NullOr(Schema.String),
  swiftBic: Schema.NullOr(Schema.String),
  bankAddress: Schema.NullOr(Schema.String),
  isDefault: Schema.Boolean,
  createdAt: Schema.String,
})
export type BankAccount = typeof BankAccount.Type

export const BankAccountInput = Schema.Struct({
  label: Schema.String,
  currency: Schema.String,
  accountHolderName: Schema.String,
  bankName: Schema.String,
  accountNumber: Schema.optionalKey(Schema.NullOr(Schema.String)),
  branchCode: Schema.optionalKey(Schema.NullOr(Schema.String)),
  iban: Schema.optionalKey(Schema.NullOr(Schema.String)),
  swiftBic: Schema.optionalKey(Schema.NullOr(Schema.String)),
  bankAddress: Schema.optionalKey(Schema.NullOr(Schema.String)),
  isDefault: Schema.optionalKey(Schema.Boolean),
})
export type BankAccountInput = typeof BankAccountInput.Type

export const InvoiceStatus = Schema.Literals(["draft", "sent", "paid", "overdue", "cancelled"])
export type InvoiceStatus = typeof InvoiceStatus.Type

export const Invoice = Schema.Struct({
  id: Schema.Number,
  invoiceNumber: Schema.String,
  customerId: Schema.Number,
  bankAccountId: Schema.NullOr(Schema.Number),
  currency: Schema.String,
  createdAt: Schema.String,
  dueDate: Schema.String,
  vatRate: Schema.NullOr(Schema.Number),
  notes: Schema.NullOr(Schema.String),
  subtotal: Schema.Number,
  vatAmount: Schema.Number,
  total: Schema.Number,
  status: InvoiceStatus,
  paidAt: Schema.NullOr(Schema.String),
})
export type Invoice = typeof Invoice.Type

export const InvoiceLineItem = Schema.Struct({
  id: Schema.Number,
  invoiceId: Schema.Number,
  productId: Schema.NullOr(Schema.Number),
  productName: Schema.optionalKey(Schema.NullOr(Schema.String)),
  description: Schema.String,
  quantity: Schema.Number,
  unitPrice: Schema.Number,
  lineTotal: Schema.Number,
  additionalNotes: Schema.NullOr(Schema.String),
})
export type InvoiceLineItem = typeof InvoiceLineItem.Type

export const InvoiceWithLineItems = Invoice.pipe(
  Schema.fieldsAssign({ lineItems: Schema.Array(InvoiceLineItem) }),
)
export type InvoiceWithLineItems = typeof InvoiceWithLineItems.Type

export const LineItemInput = Schema.Struct({
  productId: Schema.NullOr(Schema.Number),
  description: Schema.optionalKey(Schema.String),
  quantity: Schema.Number,
  unitPrice: Schema.optionalKey(Schema.Number),
  additionalNotes: Schema.optionalKey(Schema.NullOr(Schema.String)),
})
export type LineItemInput = typeof LineItemInput.Type

export const InvoiceInput = Schema.Struct({
  customerId: Schema.Number,
  bankAccountId: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  dueDate: Schema.String,
  vatRate: Schema.NullOr(Schema.Number),
  notes: Schema.NullOr(Schema.String),
  lineItems: Schema.Array(LineItemInput),
})
export type InvoiceInput = typeof InvoiceInput.Type

export const Dashboard = Schema.Struct({
  revenueByCurrency: Schema.Record(Schema.String, Schema.Number),
  invoiceCount: Schema.Number,
  customerCount: Schema.Number,
  productCount: Schema.Number,
  recentInvoices: Schema.Array(Invoice),
})
export type Dashboard = typeof Dashboard.Type

export class OperationError extends Schema.TaggedErrorClass<OperationError>()("OperationError", {
  operation: Schema.String,
  message: Schema.String,
}) {}

export class CustomerNotFoundError extends Schema.TaggedErrorClass<CustomerNotFoundError>()("CustomerNotFoundError", {
  id: Schema.Number,
}) {}

export class ProductNotFoundError extends Schema.TaggedErrorClass<ProductNotFoundError>()("ProductNotFoundError", {
  id: Schema.Number,
}) {}

export class BankAccountNotFoundError extends Schema.TaggedErrorClass<BankAccountNotFoundError>()("BankAccountNotFoundError", {
  id: Schema.Number,
}) {}

export class InvoiceNotFoundError extends Schema.TaggedErrorClass<InvoiceNotFoundError>()("InvoiceNotFoundError", {
  id: Schema.Number,
}) {}

const IdPayload = Schema.Struct({ id: Schema.Number })
const OperationOnly = OperationError
const CustomerFailure = Schema.Union([OperationError, CustomerNotFoundError])
const ProductFailure = Schema.Union([OperationError, ProductNotFoundError])
const BankAccountFailure = Schema.Union([OperationError, BankAccountNotFoundError])
const InvoiceFailure = Schema.Union([OperationError, InvoiceNotFoundError])

export const InvoicingRpcs = RpcGroup.make(
  Rpc.make("dashboard", { success: Dashboard, error: OperationOnly }),
  Rpc.make("listCustomers", { success: Schema.Array(Customer), error: OperationOnly }),
  Rpc.make("getCustomer", { payload: IdPayload, success: Customer, error: CustomerFailure }),
  Rpc.make("createCustomer", { payload: CustomerInput, success: Customer, error: OperationOnly }),
  Rpc.make("updateCustomer", { payload: Schema.Struct({ id: Schema.Number, input: CustomerInput }), success: Customer, error: CustomerFailure }),
  Rpc.make("deleteCustomer", { payload: IdPayload, success: Schema.Void, error: OperationOnly }),
  Rpc.make("listProducts", { success: Schema.Array(Product), error: OperationOnly }),
  Rpc.make("getProduct", { payload: IdPayload, success: Product, error: ProductFailure }),
  Rpc.make("createProduct", { payload: ProductInput, success: Product, error: OperationOnly }),
  Rpc.make("updateProduct", { payload: Schema.Struct({ id: Schema.Number, input: ProductInput }), success: Product, error: ProductFailure }),
  Rpc.make("deleteProduct", { payload: IdPayload, success: Schema.Void, error: OperationOnly }),
  Rpc.make("listBankAccounts", { success: Schema.Array(BankAccount), error: OperationOnly }),
  Rpc.make("getBankAccount", { payload: IdPayload, success: BankAccount, error: BankAccountFailure }),
  Rpc.make("createBankAccount", { payload: BankAccountInput, success: BankAccount, error: OperationOnly }),
  Rpc.make("updateBankAccount", { payload: Schema.Struct({ id: Schema.Number, input: BankAccountInput }), success: BankAccount, error: BankAccountFailure }),
  Rpc.make("deleteBankAccount", { payload: IdPayload, success: Schema.Void, error: OperationOnly }),
  Rpc.make("setDefaultBankAccount", { payload: IdPayload, success: BankAccount, error: BankAccountFailure }),
  Rpc.make("getBusinessInfo", { success: Schema.NullOr(BusinessInfo), error: OperationOnly }),
  Rpc.make("saveBusinessInfo", { payload: BusinessInfoInput, success: BusinessInfo, error: OperationOnly }),
  Rpc.make("listInvoices", { success: Schema.Array(Invoice), error: OperationOnly }),
  Rpc.make("getInvoice", { payload: IdPayload, success: InvoiceWithLineItems, error: InvoiceFailure }),
  Rpc.make("createInvoice", { payload: InvoiceInput, success: InvoiceWithLineItems, error: OperationOnly }),
  Rpc.make("updateInvoice", { payload: Schema.Struct({ id: Schema.Number, input: InvoiceInput }), success: InvoiceWithLineItems, error: InvoiceFailure }),
  Rpc.make("updateInvoiceStatus", { payload: Schema.Struct({ id: Schema.Number, status: InvoiceStatus }), success: Invoice, error: InvoiceFailure }),
)
export type InvoicingRpcs = typeof InvoicingRpcs
