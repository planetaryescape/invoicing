import { Option, Schema as S } from "effect"
import { AsyncData } from "foldkit"
import {
  BankAccount,
  BusinessInfo,
  Customer,
  Dashboard,
  Invoice,
  InvoiceWithLineItems,
  Product,
} from "@invoicing/shared"
import { AppRoute } from "./route.ts"

export const ApplicationData = S.Struct({
  dashboard: Dashboard,
  customers: S.Array(Customer),
  products: S.Array(Product),
  bankAccounts: S.Array(BankAccount),
  businessInfo: S.Option(BusinessInfo),
  invoices: S.Array(Invoice),
})
export type ApplicationData = typeof ApplicationData.Type
export const ApplicationDataState = AsyncData.Schema(ApplicationData, S.String)
export const InvoiceDataState = AsyncData.Schema(InvoiceWithLineItems, S.String)

export const CustomerForm = S.Struct({
  id: S.Option(S.Number),
  name: S.String,
  vatNumber: S.String,
  streetAddress: S.String,
  city: S.String,
  postalCode: S.String,
  country: S.String,
  email: S.String,
  phone: S.String,
})
export type CustomerForm = typeof CustomerForm.Type

export const ProductForm = S.Struct({
  id: S.Option(S.Number),
  name: S.String,
  description: S.String,
  defaultPrice: S.String,
})
export type ProductForm = typeof ProductForm.Type

export const BankAccountForm = S.Struct({
  id: S.Option(S.Number),
  label: S.String,
  currency: S.String,
  accountHolderName: S.String,
  bankName: S.String,
  accountNumber: S.String,
  branchCode: S.String,
  iban: S.String,
  swiftBic: S.String,
  bankAddress: S.String,
  isDefault: S.Boolean,
})
export type BankAccountForm = typeof BankAccountForm.Type

export const BusinessInfoForm = S.Struct({
  companyName: S.String,
  streetAddress: S.String,
  city: S.String,
  postalCode: S.String,
  country: S.String,
  vatNumber: S.String,
  email: S.String,
  phone: S.String,
  accountHolderName: S.String,
  bankName: S.String,
  accountNumber: S.String,
  branchCode: S.String,
  defaultVatRate: S.String,
})
export type BusinessInfoForm = typeof BusinessInfoForm.Type

export const LineItemForm = S.Struct({
  key: S.Number,
  productId: S.String,
  description: S.String,
  quantity: S.String,
  unitPrice: S.String,
  additionalNotes: S.String,
})
export type LineItemForm = typeof LineItemForm.Type

export const InvoiceForm = S.Struct({
  id: S.Option(S.Number),
  customerId: S.String,
  bankAccountId: S.String,
  dueDate: S.String,
  vatRate: S.String,
  notes: S.String,
  lineItems: S.Array(LineItemForm),
  nextLineKey: S.Number,
})
export type InvoiceForm = typeof InvoiceForm.Type

export const Submission = S.Literals(["Idle", "Submitting"])

export const Model = S.Struct({
  route: AppRoute,
  data: ApplicationDataState.schema,
  selectedInvoice: InvoiceDataState.schema,
  customerForm: CustomerForm,
  productForm: ProductForm,
  bankAccountForm: BankAccountForm,
  businessInfoForm: BusinessInfoForm,
  invoiceForm: InvoiceForm,
  submission: Submission,
  error: S.Option(S.String),
  isRevenueHidden: S.Boolean,
})
export type Model = typeof Model.Type

export const emptyCustomerForm = (): CustomerForm => ({
  id: Option.none(), name: "", vatNumber: "", streetAddress: "", city: "", postalCode: "", country: "South Africa", email: "", phone: "",
})
export const emptyProductForm = (): ProductForm => ({ id: Option.none(), name: "", description: "", defaultPrice: "" })
export const emptyBankAccountForm = (): BankAccountForm => ({
  id: Option.none(), label: "", currency: "ZAR", accountHolderName: "", bankName: "", accountNumber: "", branchCode: "", iban: "", swiftBic: "", bankAddress: "", isDefault: false,
})
export const emptyBusinessInfoForm = (): BusinessInfoForm => ({
  companyName: "", streetAddress: "", city: "", postalCode: "", country: "South Africa", vatNumber: "", email: "", phone: "", accountHolderName: "", bankName: "", accountNumber: "", branchCode: "", defaultVatRate: "",
})
export const emptyLineItemForm = (key: number): LineItemForm => ({
  key, productId: "", description: "", quantity: "1", unitPrice: "", additionalNotes: "",
})
export const emptyInvoiceForm = (): InvoiceForm => ({
  id: Option.none(), customerId: "", bankAccountId: "", dueDate: "", vatRate: "", notes: "", lineItems: [emptyLineItemForm(0)], nextLineKey: 1,
})
