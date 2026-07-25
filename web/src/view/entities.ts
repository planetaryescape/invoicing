import { Option } from "effect"
import { Button } from "@foldkit/ui"
import { html, type Html } from "foldkit/html"
import type { ApplicationData, Model } from "../model.ts"
import {
  ClickedDeleteBankAccount,
  ClickedDeleteCustomer,
  ClickedDeleteProduct,
  ClickedSetDefaultBankAccount,
  ClickedToggleRevenue,
  SubmittedBankAccountForm,
  SubmittedBusinessInfoForm,
  SubmittedCustomerForm,
  SubmittedProductForm,
  ToggledBankAccountDefault,
  UpdatedBankAccountForm,
  UpdatedBusinessInfoForm,
  UpdatedCustomerForm,
  UpdatedProductForm,
  type Message,
} from "../message.ts"
import {
  editBankAccountRouter,
  editCustomerRouter,
  editProductRouter,
  invoicesRouter,
  invoiceRouter,
  newBankAccountRouter,
  newCustomerRouter,
  newInvoiceRouter,
  newProductRouter,
} from "../route.ts"
import { actionButton, selectField, textAreaField, textField } from "./form.ts"
import { formatAmount, formatCurrency } from "./format.ts"
import { pageHeading } from "./shell.ts"

const editLink = (href: string): Html => {
  const h = html<Message>()
  return h.a([h.Href(href), h.Class("button button-quiet button-small")], ["Edit"])
}

export const dashboardView = (model: Model, data: ApplicationData): Html => {
  const h = html<Message>()
  const revenue = Object.entries(data.dashboard.revenueByCurrency)
  return h.div([], [
    pageHeading("Overview", "Dashboard", h.a([h.Href(newInvoiceRouter()), h.Class("button button-primary")], ["New invoice"])),
    h.section([h.Class("stats-grid"), h.AriaLabel("Business summary")], [
      Button.view<Message>({
        type: "button",
        onClick: ClickedToggleRevenue(),
        toView: (attributes) => h.button([
          ...attributes.button,
          h.Class("stat-card stat-revenue"),
          h.AriaLabel(model.isRevenueHidden ? "Show revenue" : "Hide revenue"),
          h.AriaPressed(String(!model.isRevenueHidden)),
        ], [
          h.span([h.Class("stat-label")], ["Revenue"]),
          h.strong([], [model.isRevenueHidden ? "••••••" : revenue.map(([currency, total]) => formatCurrency(total, currency)).join(" · ") || "R 0.00"]),
        ]),
      }),
      h.div([h.Class("stat-card")], [h.span([h.Class("stat-label")], ["Invoices"]), h.strong([], [String(data.dashboard.invoiceCount)])]),
      h.div([h.Class("stat-card")], [h.span([h.Class("stat-label")], ["Customers"]), h.strong([], [String(data.dashboard.customerCount)])]),
      h.div([h.Class("stat-card")], [h.span([h.Class("stat-label")], ["Products"]), h.strong([], [String(data.dashboard.productCount)])]),
    ]),
    h.section([h.Class("panel")], [
      h.div([h.Class("panel-heading")], [h.h2([], ["Recent invoices"]), h.a([h.Href(invoicesRouter())], ["View all"])]),
      invoiceSummaryTable(data.dashboard.recentInvoices),
    ]),
  ])
}

const invoiceSummaryTable = (invoices: ApplicationData["invoices"]): Html => {
  const h = html<Message>()
  if (invoices.length === 0) {
    return h.div([h.Class("empty-state")], [h.p([], ["No invoices yet."]), h.a([h.Href(newInvoiceRouter())], ["Create the first invoice"])] )
  }
  return h.div([h.Class("table-scroll")], [h.table([], [
    h.thead([], [h.tr([], [h.th([], ["Number"]), h.th([], ["Due"]), h.th([], ["Status"]), h.th([h.Class("numeric")], ["Total"])])]),
    h.tbody([], invoices.map((invoice) => h.keyed("tr")(String(invoice.id), [], [
      h.td([], [h.a([h.Href(invoiceRouter({ id: invoice.id }))], [invoice.invoiceNumber])]),
      h.td([], [invoice.dueDate]), h.td([], [h.span([h.Class(`status status-${invoice.status}`)], [invoice.status])]),
      h.td([h.Class("numeric")], [formatCurrency(invoice.total, invoice.currency)]),
    ]))),
  ])])
}

export const customersView = (data: ApplicationData): Html => {
  const h = html<Message>()
  return h.div([], [
    pageHeading("Directory", "Customers", h.a([h.Href(newCustomerRouter()), h.Class("button button-primary")], ["Add customer"])),
    h.section([h.Class("panel table-scroll")], [h.table([], [
      h.thead([], [h.tr([], [h.th([], ["Customer"]), h.th([], ["Email"]), h.th([], ["Location"]), h.th([], ["Actions"])])]),
      h.tbody([], data.customers.map((customer) => h.keyed("tr")(String(customer.id), [], [
        h.td([], [h.strong([], [customer.name]), h.small([], [customer.vatNumber ?? "No VAT number"])]),
        h.td([], [customer.email]), h.td([], [`${customer.city}, ${customer.country}`]),
        h.td([h.Class("actions")], [editLink(editCustomerRouter({ id: customer.id })), actionButton("Delete", ClickedDeleteCustomer({ id: customer.id }), { kind: "danger" })]),
      ]))),
    ])]),
  ])
}

export const customerFormView = (model: Model): Html => {
  const h = html<Message>()
  const title = Option.isSome(model.customerForm.id) ? "Edit customer" : "New customer"
  const field = (name: Parameters<typeof UpdatedCustomerForm>[0]["field"], label: string, type = "text") =>
    textField(`customer-${name}`, label, model.customerForm[name], (value) => UpdatedCustomerForm({ field: name, value }), { type, required: name === "name" })
  return h.div([], [pageHeading("Customers", title), h.form([h.Class("panel form-grid"), h.OnSubmit(SubmittedCustomerForm())], [
    field("name", "Name"), field("vatNumber", "VAT number"), field("email", "Email", "email"), field("phone", "Phone", "tel"),
    field("streetAddress", "Street address"), field("city", "City"), field("postalCode", "Postal code"), field("country", "Country"),
    h.div([h.Class("form-actions field-wide")], [actionButton(model.submission === "Submitting" ? "Saving…" : "Save customer", SubmittedCustomerForm(), { kind: "primary", type: "submit", disabled: model.submission === "Submitting" })]),
  ])])
}

export const productsView = (data: ApplicationData): Html => {
  const h = html<Message>()
  return h.div([], [pageHeading("Catalog", "Products", h.a([h.Href(newProductRouter()), h.Class("button button-primary")], ["Add product"])),
    h.section([h.Class("panel table-scroll")], [h.table([], [
      h.thead([], [h.tr([], [h.th([], ["Product"]), h.th([], ["Description"]), h.th([h.Class("numeric")], ["Default price"]), h.th([], ["Actions"])])]),
      h.tbody([], data.products.map((product) => h.keyed("tr")(String(product.id), [], [
        h.td([], [h.strong([], [product.name])]), h.td([], [product.description ?? "—"]), h.td([h.Class("numeric")], [formatAmount(product.defaultPrice)]),
        h.td([h.Class("actions")], [editLink(editProductRouter({ id: product.id })), actionButton("Delete", ClickedDeleteProduct({ id: product.id }), { kind: "danger" })]),
      ]))),
    ])])])
}

export const productFormView = (model: Model): Html => {
  const h = html<Message>()
  const title = Option.isSome(model.productForm.id) ? "Edit product" : "New product"
  return h.div([], [pageHeading("Products", title), h.form([h.Class("panel form-grid"), h.OnSubmit(SubmittedProductForm())], [
    textField("product-name", "Name", model.productForm.name, (value) => UpdatedProductForm({ field: "name", value }), { required: true }),
    textField("product-price", "Default price", model.productForm.defaultPrice, (value) => UpdatedProductForm({ field: "defaultPrice", value }), { type: "number", required: true, min: "0", step: "any" }),
    textAreaField("product-description", "Description", model.productForm.description, (value) => UpdatedProductForm({ field: "description", value })),
    h.div([h.Class("form-actions field-wide")], [actionButton("Save product", SubmittedProductForm(), { kind: "primary", type: "submit" })]),
  ])])
}

export const bankAccountsView = (data: ApplicationData): Html => {
  const h = html<Message>()
  return h.div([], [pageHeading("Payments", "Bank accounts", h.a([h.Href(newBankAccountRouter()), h.Class("button button-primary")], ["Add account"])),
    h.section([h.Class("card-grid")], data.bankAccounts.map((account) => h.keyed("article")(String(account.id), [h.Class("account-card")], [
      h.div([h.Class("account-card-heading")], [h.div([], [h.h2([], [account.label]), h.p([], [`${account.bankName} · ${account.currency}`])]), account.isDefault ? h.span([h.Class("default-badge")], ["Default"]) : h.empty]),
      h.dl([], [h.dt([], ["Account holder"]), h.dd([], [account.accountHolderName]), h.dt([], ["Account number"]), h.dd([], [account.accountNumber ?? "—"]), h.dt([], [account.currency === "GBP" ? "Sort code" : account.currency === "USD" ? "Routing number" : "Branch code"]), h.dd([], [account.branchCode ?? "—"])]),
      h.div([h.Class("actions")], [editLink(editBankAccountRouter({ id: account.id })), ...(account.isDefault ? [] : [actionButton("Set default", ClickedSetDefaultBankAccount({ id: account.id })), actionButton("Delete", ClickedDeleteBankAccount({ id: account.id }), { kind: "danger" })])]),
    ])))])
}

export const bankAccountFormView = (model: Model): Html => {
  const h = html<Message>()
  const form = model.bankAccountForm
  const input = (field: Parameters<typeof UpdatedBankAccountForm>[0]["field"], label: string) => textField(`bank-${field}`, label, form[field], (value) => UpdatedBankAccountForm({ field, value }))
  return h.div([], [pageHeading("Bank accounts", Option.isSome(form.id) ? "Edit account" : "New account"), h.form([h.Class("panel form-grid"), h.OnSubmit(SubmittedBankAccountForm())], [
    input("label", "Label"), selectField("bank-currency", "Currency", form.currency, [["ZAR", "ZAR"], ["USD", "USD"], ["EUR", "EUR"], ["GBP", "GBP"]], (value) => UpdatedBankAccountForm({ field: "currency", value })),
    input("accountHolderName", "Account holder"), input("bankName", "Bank name"), input("accountNumber", "Account number"), input("branchCode", form.currency === "GBP" ? "Sort code" : form.currency === "USD" ? "Routing number" : "Branch code"),
    input("iban", "IBAN"), input("swiftBic", "SWIFT / BIC"), input("bankAddress", "Bank address"),
    form.isDefault
      ? h.span([h.Class("default-badge")], ["Default account"])
      : actionButton("Make default", ToggledBankAccountDefault({ value: true })),
    h.div([h.Class("form-actions field-wide")], [actionButton("Save account", SubmittedBankAccountForm(), { kind: "primary", type: "submit" })]),
  ])])
}

export const businessInfoView = (model: Model): Html => {
  const h = html<Message>()
  const form = model.businessInfoForm
  const input = (field: Parameters<typeof UpdatedBusinessInfoForm>[0]["field"], label: string, type = "text") => textField(`business-${field}`, label, form[field], (value) => UpdatedBusinessInfoForm({ field, value }), { type })
  return h.div([], [pageHeading("Settings", "Business information"), h.form([h.Class("panel form-grid"), h.OnSubmit(SubmittedBusinessInfoForm())], [
    input("companyName", "Company name"), input("vatNumber", "VAT number"), input("email", "Email", "email"), input("phone", "Phone", "tel"),
    input("streetAddress", "Street address"), input("city", "City"), input("postalCode", "Postal code"), input("country", "Country"), textField("business-defaultVatRate", "Default VAT rate", form.defaultVatRate, (value) => UpdatedBusinessInfoForm({ field: "defaultVatRate", value }), { type: "number", min: "0", max: "100", step: "any" }),
    h.div([h.Class("section-label field-wide")], ["Legacy payment details"]), input("accountHolderName", "Account holder"), input("bankName", "Bank name"), input("accountNumber", "Account number"), input("branchCode", "Branch code"),
    h.div([h.Class("form-actions field-wide")], [actionButton("Save business information", SubmittedBusinessInfoForm(), { kind: "primary", type: "submit" })]),
  ])])
}
