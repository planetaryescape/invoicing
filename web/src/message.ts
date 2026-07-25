import { Schema as S } from "effect"
import { UrlRequest } from "foldkit/navigation"
import { m } from "foldkit/message"
import { Url } from "foldkit/url"
import { ApplicationData } from "./model.ts"
import { InvoiceWithLineItems } from "@invoicing/shared"

export const CompletedNavigateInternal = m("CompletedNavigateInternal")
export const CompletedLoadExternal = m("CompletedLoadExternal")
export const CompletedStoreRevenueVisibility = m("CompletedStoreRevenueVisibility")
export const LoadedRevenueVisibility = m("LoadedRevenueVisibility", { isHidden: S.Boolean })
export const ClickedLink = m("ClickedLink", { request: UrlRequest })
export const ChangedUrl = m("ChangedUrl", { url: Url })
export const ClickedRetry = m("ClickedRetry")
export const ClickedToggleRevenue = m("ClickedToggleRevenue")
export const SucceededLoadData = m("SucceededLoadData", { data: ApplicationData })
export const FailedLoadData = m("FailedLoadData", { error: S.String })
export const SucceededLoadInvoice = m("SucceededLoadInvoice", { invoice: InvoiceWithLineItems })
export const FailedLoadInvoice = m("FailedLoadInvoice", { id: S.Number, error: S.String })
export const ClickedRetryInvoice = m("ClickedRetryInvoice", { id: S.Number })
export const UpdatedCustomerForm = m("UpdatedCustomerForm", { field: S.Literals(["name", "vatNumber", "streetAddress", "city", "postalCode", "country", "email", "phone"]), value: S.String })
export const UpdatedProductForm = m("UpdatedProductForm", { field: S.Literals(["name", "description", "defaultPrice"]), value: S.String })
export const UpdatedBankAccountForm = m("UpdatedBankAccountForm", { field: S.Literals(["label", "currency", "accountHolderName", "bankName", "accountNumber", "branchCode", "iban", "swiftBic", "bankAddress"]), value: S.String })
export const ToggledBankAccountDefault = m("ToggledBankAccountDefault", { value: S.Boolean })
export const UpdatedBusinessInfoForm = m("UpdatedBusinessInfoForm", { field: S.Literals(["companyName", "streetAddress", "city", "postalCode", "country", "vatNumber", "email", "phone", "accountHolderName", "bankName", "accountNumber", "branchCode", "defaultVatRate"]), value: S.String })
export const UpdatedInvoiceForm = m("UpdatedInvoiceForm", { field: S.Literals(["customerId", "bankAccountId", "dueDate", "vatRate", "notes"]), value: S.String })
export const UpdatedLineItem = m("UpdatedLineItem", { key: S.Number, field: S.Literals(["productId", "description", "quantity", "unitPrice", "additionalNotes"]), value: S.String })
export const ClickedAddLineItem = m("ClickedAddLineItem")
export const ClickedRemoveLineItem = m("ClickedRemoveLineItem", { key: S.Number })
export const SubmittedCustomerForm = m("SubmittedCustomerForm")
export const SubmittedProductForm = m("SubmittedProductForm")
export const SubmittedBankAccountForm = m("SubmittedBankAccountForm")
export const SubmittedBusinessInfoForm = m("SubmittedBusinessInfoForm")
export const SubmittedInvoiceForm = m("SubmittedInvoiceForm")
export const ClickedDeleteCustomer = m("ClickedDeleteCustomer", { id: S.Number })
export const ClickedDeleteProduct = m("ClickedDeleteProduct", { id: S.Number })
export const ClickedDeleteBankAccount = m("ClickedDeleteBankAccount", { id: S.Number })
export const ClickedSetDefaultBankAccount = m("ClickedSetDefaultBankAccount", { id: S.Number })
export const ClickedUpdateInvoiceStatus = m("ClickedUpdateInvoiceStatus", { id: S.Number, status: S.Literals(["draft", "sent", "paid", "overdue", "cancelled"]) })
export const SucceededMutation = m("SucceededMutation", { destination: S.String })
export const FailedMutation = m("FailedMutation", { error: S.String })

export const Message = S.Union([
  CompletedNavigateInternal, CompletedLoadExternal, CompletedStoreRevenueVisibility, LoadedRevenueVisibility, ClickedLink, ChangedUrl, ClickedRetry, ClickedToggleRevenue,
  SucceededLoadData, FailedLoadData, SucceededLoadInvoice, FailedLoadInvoice, ClickedRetryInvoice,
  UpdatedCustomerForm, UpdatedProductForm, UpdatedBankAccountForm, ToggledBankAccountDefault, UpdatedBusinessInfoForm, UpdatedInvoiceForm, UpdatedLineItem,
  ClickedAddLineItem, ClickedRemoveLineItem, SubmittedCustomerForm, SubmittedProductForm, SubmittedBankAccountForm, SubmittedBusinessInfoForm, SubmittedInvoiceForm,
  ClickedDeleteCustomer, ClickedDeleteProduct, ClickedDeleteBankAccount, ClickedSetDefaultBankAccount, ClickedUpdateInvoiceStatus,
  SucceededMutation, FailedMutation,
])
export type Message = typeof Message.Type
