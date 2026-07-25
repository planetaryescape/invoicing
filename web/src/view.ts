import { Match as M, Option } from "effect"
import { AsyncData } from "foldkit"
import { html, type Document, type Html } from "foldkit/html"
import type { Model } from "./model.ts"
import { ClickedRetry, type Message } from "./message.ts"
import {
  bankAccountFormView,
  bankAccountsView,
  businessInfoView,
  customerFormView,
  customersView,
  dashboardView,
  productFormView,
  productsView,
} from "./view/entities.ts"
import { actionButton } from "./view/form.ts"
import { invoiceDetailView, invoiceFormView, invoicesView } from "./view/invoices.ts"
import { shellView } from "./view/shell.ts"

const pageTitle = (model: Model): string => `${M.value(model.route).pipe(
  M.tagsExhaustive({
    Dashboard: () => "Dashboard", Invoices: () => "Invoices", NewInvoice: () => "New invoice", Invoice: () => "Invoice", EditInvoice: () => "Edit invoice",
    Customers: () => "Customers", NewCustomer: () => "New customer", EditCustomer: () => "Edit customer",
    Products: () => "Products", NewProduct: () => "New product", EditProduct: () => "Edit product",
    BankAccounts: () => "Bank accounts", NewBankAccount: () => "New bank account", EditBankAccount: () => "Edit bank account",
    BusinessInfo: () => "Business information", NotFound: () => "Not found",
  }),
)} | Invoicing`

const routeView = (model: Model): Html => {
  const h = html<Message>()
  return AsyncData.matchDataSplitEmpty(model.data, {
    onIdle: () => h.div([h.Class("loading-panel"), h.Role("status")], [h.h1([], ["Invoicing"]), h.p([], ["Preparing your workspace…"])]),
    onLoading: () => h.div([h.Class("loading-panel"), h.Role("status")], [h.h1([], ["Invoicing"]), h.p([], ["Loading invoicing data…"])]),
    onFailure: (error) => h.div([h.Class("error-panel"), h.Role("alert")], [h.h1([], ["Could not load invoicing"]), h.p([], [error]), actionButton("Try again", ClickedRetry(), { kind: "primary" })]),
    onData: (data) => M.value(model.route).pipe(M.tagsExhaustive({
      Dashboard: () => dashboardView(model, data),
      Invoices: () => invoicesView(data), NewInvoice: () => invoiceFormView(model, data), Invoice: () => invoiceDetailView(model, data), EditInvoice: () => invoiceFormView(model, data),
      Customers: () => customersView(data), NewCustomer: () => customerFormView(model), EditCustomer: () => customerFormView(model),
      Products: () => productsView(data), NewProduct: () => productFormView(model), EditProduct: () => productFormView(model),
      BankAccounts: () => bankAccountsView(data), NewBankAccount: () => bankAccountFormView(model), EditBankAccount: () => bankAccountFormView(model),
      BusinessInfo: () => businessInfoView(model),
      NotFound: ({ path }) => h.div([h.Class("empty-state")], [h.h1([], ["Page not found"]), h.p([], [`No route matches ${path}`])]),
    })),
  })
}

export const view = (model: Model): Document => {
  const h = html<Message>()
  const error = Option.match(model.error, {
    onNone: () => h.empty,
    onSome: (message) => h.div([h.Class("toast-error"), h.Role("alert")], [message]),
  })
  return {
    title: pageTitle(model),
    body: shellView(model.route, h.div([], [error, routeView(model)])),
  }
}
