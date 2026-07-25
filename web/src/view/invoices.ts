import { Option } from "effect"
import { AsyncData } from "foldkit"
import { html, type Html } from "foldkit/html"
import type { InvoiceStatus } from "@invoicing/shared"
import type { ApplicationData, Model } from "../model.ts"
import {
  ClickedAddLineItem,
  ClickedRemoveLineItem,
  ClickedRetryInvoice,
  ClickedUpdateInvoiceStatus,
  SubmittedInvoiceForm,
  UpdatedInvoiceForm,
  UpdatedLineItem,
  type Message,
} from "../message.ts"
import { editInvoiceRouter, invoiceRouter, newInvoiceRouter } from "../route.ts"
import { actionButton, selectField, textAreaField, textField } from "./form.ts"
import { pageHeading } from "./shell.ts"

const formatCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(amount)

export const invoicesView = (data: ApplicationData): Html => {
  const h = html<Message>()
  return h.div([], [
    pageHeading("Receivables", "Invoices", h.a([h.Href(newInvoiceRouter()), h.Class("button button-primary")], ["New invoice"])),
    h.section([h.Class("panel table-scroll")], [h.table([], [
      h.thead([], [h.tr([], [h.th([], ["Invoice"]), h.th([], ["Created"]), h.th([], ["Due"]), h.th([], ["Status"]), h.th([h.Class("numeric")], ["Total"])])]),
      h.tbody([], data.invoices.map((invoice) => h.keyed("tr")(String(invoice.id), [], [
        h.td([], [h.a([h.Href(invoiceRouter({ id: invoice.id }))], [invoice.invoiceNumber])]), h.td([], [invoice.createdAt]), h.td([], [invoice.dueDate]),
        h.td([], [h.span([h.Class(`status status-${invoice.status}`)], [invoice.status])]), h.td([h.Class("numeric")], [formatCurrency(invoice.total, invoice.currency)]),
      ]))),
    ])]),
  ])
}

export const invoiceDetailView = (model: Model, data: ApplicationData): Html => {
  const h = html<Message>()
  return AsyncData.matchDataSplitEmpty(model.selectedInvoice, {
    onIdle: () => h.div([h.Class("loading-panel"), h.Role("status")], [h.h1([], ["Invoice"]), h.p([], ["Preparing invoice…"])]),
    onLoading: () => h.div([h.Class("loading-panel"), h.Role("status")], [h.h1([], ["Invoice"]), h.p([], ["Loading invoice…"])]),
    onFailure: (error) => h.div([h.Class("error-panel"), h.Role("alert")], [
      h.h1([], ["Could not load invoice"]),
      h.p([], [error]),
      ...(model.route._tag === "Invoice" || model.route._tag === "EditInvoice"
        ? [actionButton("Try again", ClickedRetryInvoice({ id: model.route.id }), { kind: "primary" })]
        : []),
    ]),
    onData: (invoice) => {
      const customer = data.customers.find((item) => item.id === invoice.customerId)
      return h.div([], [
        pageHeading("Invoice", invoice.invoiceNumber, h.div([h.Class("actions")], [
          h.a([h.Href(editInvoiceRouter({ id: invoice.id })), h.Class("button button-quiet")], ["Edit"]),
          h.a([h.Href(`/api/invoices/${invoice.id}/pdf`), h.Target("_blank"), h.Rel("noopener noreferrer"), h.Class("button button-primary")], ["Download PDF"]),
          ...(invoice.status === "paid" ? [h.a([h.Href(`/api/invoices/${invoice.id}/receipt/pdf`), h.Target("_blank"), h.Rel("noopener noreferrer"), h.Class("button button-quiet")], ["Receipt"])] : []),
        ])),
        h.section([h.Class("invoice-meta")], [
          h.div([], [h.span([], ["Customer"]), h.strong([], [customer?.name ?? `Customer ${invoice.customerId}`])]),
          h.div([], [h.span([], ["Created"]), h.strong([], [invoice.createdAt])]),
          h.div([], [h.span([], ["Due"]), h.strong([], [invoice.dueDate])]),
          h.div([], [h.span([], ["Status"]), h.strong([h.Class(`status status-${invoice.status}`)], [invoice.status])]),
        ]),
        h.section([h.Class("panel table-scroll")], [h.table([], [
          h.thead([], [h.tr([], [h.th([], ["Description"]), h.th([h.Class("numeric")], ["Quantity"]), h.th([h.Class("numeric")], ["Unit price"]), h.th([h.Class("numeric")], ["Line total"])])]),
          h.tbody([], invoice.lineItems.map((item) => h.keyed("tr")(String(item.id), [], [
            h.td([], [h.strong([], [item.productName ?? item.description]), ...(item.productName === null || item.productName === undefined ? [] : [h.small([], [item.description])]), ...(item.additionalNotes === null ? [] : [h.small([], [item.additionalNotes])])]),
            h.td([h.Class("numeric")], [String(item.quantity)]), h.td([h.Class("numeric")], [formatCurrency(item.unitPrice, invoice.currency)]), h.td([h.Class("numeric")], [formatCurrency(item.lineTotal, invoice.currency)]),
          ]))),
        ])]),
        h.section([h.Class("totals-card")], [
          h.div([], [h.span([], ["Subtotal"]), h.strong([], [formatCurrency(invoice.subtotal, invoice.currency)])]),
          h.div([], [h.span([], [`VAT ${invoice.vatRate ?? 0}%`]), h.strong([], [formatCurrency(invoice.vatAmount, invoice.currency)])]),
          h.div([h.Class("total-line")], [h.span([], ["Total"]), h.strong([], [formatCurrency(invoice.total, invoice.currency)])]),
        ]),
        h.section([h.Class("status-actions")], [h.h2([], ["Update status"]), h.div([h.Class("actions")], (["draft", "sent", "paid", "overdue", "cancelled"] satisfies ReadonlyArray<InvoiceStatus>).filter((status) => status !== invoice.status).map((status) =>
          actionButton(`Mark ${status}`, ClickedUpdateInvoiceStatus({ id: invoice.id, status }), { kind: status === "cancelled" ? "danger" : "quiet" }),
        ))]),
      ])
    },
  })
}

export const invoiceFormView = (model: Model, data: ApplicationData): Html => {
  const h = html<Message>()
  const form = model.invoiceForm
  const customerOptions: ReadonlyArray<readonly [string, string]> = [["", "Select a customer"], ...data.customers.map((item) => [String(item.id), item.name] as const)]
  const bankOptions: ReadonlyArray<readonly [string, string]> = [["", "Use default account"], ...data.bankAccounts.map((item) => [String(item.id), `${item.label} (${item.currency})`] as const)]
  const productOptions: ReadonlyArray<readonly [string, string]> = [["", "Custom line item"], ...data.products.map((item) => [String(item.id), item.name] as const)]
  return h.div([], [
    pageHeading("Invoices", Option.isSome(form.id) ? "Edit invoice" : "New invoice"),
    h.form([h.Class("invoice-form"), h.OnSubmit(SubmittedInvoiceForm())], [
      h.section([h.Class("panel form-grid")], [
        selectField("invoice-customer", "Customer", form.customerId, customerOptions, (value) => UpdatedInvoiceForm({ field: "customerId", value })),
        textField("invoice-due", "Due date", form.dueDate, (value) => UpdatedInvoiceForm({ field: "dueDate", value }), { type: "date", required: true }),
        selectField("invoice-bank", "Bank account", form.bankAccountId, bankOptions, (value) => UpdatedInvoiceForm({ field: "bankAccountId", value })),
        textField("invoice-vat", "VAT rate", form.vatRate, (value) => UpdatedInvoiceForm({ field: "vatRate", value }), { type: "number", placeholder: "Business default" }),
        textAreaField("invoice-notes", "Invoice notes", form.notes, (value) => UpdatedInvoiceForm({ field: "notes", value })),
      ]),
      h.section([h.Class("panel")], [
        h.div([h.Class("panel-heading")], [h.h2([], ["Line items"]), actionButton("Add line", ClickedAddLineItem(), { kind: "quiet" })]),
        h.div([h.Class("line-items")], form.lineItems.map((item, index) => h.keyed("fieldset")(String(item.key), [h.Class("line-item")], [
          h.legend([], [`Line ${index + 1}`]),
          selectField(`line-product-${item.key}`, "Product", item.productId, productOptions, (value) => UpdatedLineItem({ key: item.key, field: "productId", value })),
          textField(`line-description-${item.key}`, "Description", item.description, (value) => UpdatedLineItem({ key: item.key, field: "description", value }), { required: true }),
          textField(`line-quantity-${item.key}`, "Quantity", item.quantity, (value) => UpdatedLineItem({ key: item.key, field: "quantity", value }), { type: "number", required: true }),
          textField(`line-price-${item.key}`, "Unit price", item.unitPrice, (value) => UpdatedLineItem({ key: item.key, field: "unitPrice", value }), { type: "number" }),
          textField(`line-notes-${item.key}`, "Additional notes", item.additionalNotes, (value) => UpdatedLineItem({ key: item.key, field: "additionalNotes", value })),
          ...(form.lineItems.length > 1 ? [actionButton("Remove line", ClickedRemoveLineItem({ key: item.key }), { kind: "danger" })] : []),
        ]))),
      ]),
      h.div([h.Class("form-actions")], [actionButton(model.submission === "Submitting" ? "Saving invoice…" : "Save invoice", SubmittedInvoiceForm(), { kind: "primary", type: "submit", disabled: model.submission === "Submitting" })]),
    ]),
  ])
}
