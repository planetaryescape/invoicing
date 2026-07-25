import { Schema as S, pipe } from "effect"
import { Route } from "foldkit"
import { int, literal, r, slash } from "foldkit/route"

export const DashboardRoute = r("Dashboard")
export const InvoicesRoute = r("Invoices")
export const NewInvoiceRoute = r("NewInvoice")
export const InvoiceRoute = r("Invoice", { id: S.Number })
export const EditInvoiceRoute = r("EditInvoice", { id: S.Number })
export const CustomersRoute = r("Customers")
export const NewCustomerRoute = r("NewCustomer")
export const EditCustomerRoute = r("EditCustomer", { id: S.Number })
export const ProductsRoute = r("Products")
export const NewProductRoute = r("NewProduct")
export const EditProductRoute = r("EditProduct", { id: S.Number })
export const BankAccountsRoute = r("BankAccounts")
export const NewBankAccountRoute = r("NewBankAccount")
export const EditBankAccountRoute = r("EditBankAccount", { id: S.Number })
export const BusinessInfoRoute = r("BusinessInfo")
export const NotFoundRoute = r("NotFound", { path: S.String })

export const AppRoute = S.Union([
  DashboardRoute,
  InvoicesRoute,
  NewInvoiceRoute,
  InvoiceRoute,
  EditInvoiceRoute,
  CustomersRoute,
  NewCustomerRoute,
  EditCustomerRoute,
  ProductsRoute,
  NewProductRoute,
  EditProductRoute,
  BankAccountsRoute,
  NewBankAccountRoute,
  EditBankAccountRoute,
  BusinessInfoRoute,
  NotFoundRoute,
])
export type AppRoute = typeof AppRoute.Type

export const dashboardRouter = pipe(Route.root, Route.mapTo(DashboardRoute))
export const invoicesRouter = pipe(literal("invoices"), Route.mapTo(InvoicesRoute))
export const newInvoiceRouter = pipe(literal("invoices"), slash(literal("new")), Route.mapTo(NewInvoiceRoute))
export const invoiceRouter = pipe(literal("invoices"), slash(int("id")), Route.mapTo(InvoiceRoute))
export const editInvoiceRouter = pipe(literal("invoices"), slash(int("id")), slash(literal("edit")), Route.mapTo(EditInvoiceRoute))
export const customersRouter = pipe(literal("customers"), Route.mapTo(CustomersRoute))
export const newCustomerRouter = pipe(literal("customers"), slash(literal("new")), Route.mapTo(NewCustomerRoute))
export const editCustomerRouter = pipe(literal("customers"), slash(int("id")), Route.mapTo(EditCustomerRoute))
export const productsRouter = pipe(literal("products"), Route.mapTo(ProductsRoute))
export const newProductRouter = pipe(literal("products"), slash(literal("new")), Route.mapTo(NewProductRoute))
export const editProductRouter = pipe(literal("products"), slash(int("id")), Route.mapTo(EditProductRoute))
export const bankAccountsRouter = pipe(literal("bank-accounts"), Route.mapTo(BankAccountsRoute))
export const newBankAccountRouter = pipe(literal("bank-accounts"), slash(literal("new")), Route.mapTo(NewBankAccountRoute))
export const editBankAccountRouter = pipe(literal("bank-accounts"), slash(int("id")), Route.mapTo(EditBankAccountRoute))
export const businessInfoRouter = pipe(literal("business-info"), Route.mapTo(BusinessInfoRoute))

const parser = Route.oneOf(
  editInvoiceRouter,
  newInvoiceRouter,
  invoiceRouter,
  invoicesRouter,
  newCustomerRouter,
  editCustomerRouter,
  customersRouter,
  newProductRouter,
  editProductRouter,
  productsRouter,
  newBankAccountRouter,
  editBankAccountRouter,
  bankAccountsRouter,
  businessInfoRouter,
  dashboardRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(parser, NotFoundRoute)
