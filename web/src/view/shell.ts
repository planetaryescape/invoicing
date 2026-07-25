import { html, type Html } from "foldkit/html"
import type { Message } from "../message.ts"
import type { AppRoute } from "../route.ts"
import {
  bankAccountsRouter,
  businessInfoRouter,
  customersRouter,
  dashboardRouter,
  invoicesRouter,
  productsRouter,
} from "../route.ts"

const navItem = (label: string, href: string, isActive: boolean): Html => {
  const h = html<Message>()
  return h.li([], [h.a([
    h.Href(href),
    h.Class(isActive ? "nav-link nav-link-active" : "nav-link"),
    ...(isActive ? [h.AriaCurrent("page")] : []),
  ], [label])])
}

export const shellView = (route: AppRoute, content: Html): Html => {
  const h = html<Message>()
  const section = route._tag
  return h.div([h.Class("app-shell")], [
    h.aside([h.Class("sidebar")], [
      h.a([h.Href(dashboardRouter()), h.Class("brand")], [
        h.span([h.Class("brand-mark")], ["PE"]),
        h.span([], ["Invoicing"]),
      ]),
      h.nav([h.AriaLabel("Main navigation")], [h.ul([h.Class("nav-list")], [
        navItem("Dashboard", dashboardRouter(), section === "Dashboard"),
        navItem("Invoices", invoicesRouter(), section.includes("Invoice")),
        navItem("Customers", customersRouter(), section.includes("Customer")),
        navItem("Products", productsRouter(), section.includes("Product")),
        navItem("Bank accounts", bankAccountsRouter(), section.includes("BankAccount")),
        navItem("Business", businessInfoRouter(), section === "BusinessInfo"),
      ])]),
      h.p([h.Class("sidebar-note")], ["Planetary Escape", h.br([]), "Operations ledger"]),
    ]),
    h.main([h.Class("main-content")], [content]),
  ])
}

export const pageHeading = (eyebrow: string, title: string, action: Html = html<Message>().empty): Html => {
  const h = html<Message>()
  return h.header([h.Class("page-heading")], [
    h.div([], [h.p([h.Class("eyebrow")], [eyebrow]), h.h1([], [title])]),
    action,
  ])
}
