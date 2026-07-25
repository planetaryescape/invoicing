import { Option } from "effect"
import { ApplicationDataState, InvoiceDataState, Model, emptyBankAccountForm, emptyBusinessInfoForm, emptyCustomerForm, emptyInvoiceForm, emptyProductForm, type ApplicationData } from "./model.ts"
import { DashboardRoute, type AppRoute } from "./route.ts"

export const applicationData: ApplicationData = {
  dashboard: {
    revenueByCurrency: { ZAR: 1437.5 },
    invoiceCount: 1,
    customerCount: 1,
    productCount: 1,
    recentInvoices: [{
      id: 1, invoiceNumber: "INV-001", customerId: 1, bankAccountId: 1, currency: "ZAR", createdAt: "2026-07-25",
      dueDate: "2026-08-31", vatRate: 15, notes: null, subtotal: 1250, vatAmount: 187.5, total: 1437.5, status: "draft", paidAt: null,
    }],
  },
  customers: [{ id: 1, name: "Acme", vatNumber: null, streetAddress: "1 Main", city: "Cape Town", postalCode: "8001", country: "South Africa", email: "billing@acme.test", phone: "", createdAt: "2026-07-25" }],
  products: [{ id: 1, name: "Consulting", description: "Professional services", defaultPrice: 1250, createdAt: "2026-07-25" }],
  bankAccounts: [{ id: 1, label: "Primary", currency: "ZAR", accountHolderName: "Planetary Escape", bankName: "Example Bank", accountNumber: "1234", branchCode: "250655", iban: null, swiftBic: null, bankAddress: null, isDefault: true, createdAt: "2026-07-25" }],
  businessInfo: Option.none(),
  invoices: [{
    id: 1, invoiceNumber: "INV-001", customerId: 1, bankAccountId: 1, currency: "ZAR", createdAt: "2026-07-25",
    dueDate: "2026-08-31", vatRate: 15, notes: null, subtotal: 1250, vatAmount: 187.5, total: 1437.5, status: "draft", paidAt: null,
  }],
}

export const modelFixture = (route: AppRoute = DashboardRoute()) => Model.make({
  route,
  data: ApplicationDataState.Success({ data: applicationData }),
  selectedInvoice: InvoiceDataState.Idle(),
  customerForm: emptyCustomerForm(),
  productForm: emptyProductForm(),
  bankAccountForm: emptyBankAccountForm(),
  businessInfoForm: emptyBusinessInfoForm(),
  invoiceForm: emptyInvoiceForm(),
  submission: "Idle",
  error: Option.none(),
  isRevenueHidden: false,
})
