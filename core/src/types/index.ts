export interface BusinessInfo {
  id: number
  companyName: string
  streetAddress: string
  city: string
  postalCode: string
  country: string
  vatNumber: string
  email: string
  phone: string
  logoPath: string | null
  accountHolderName: string
  bankName: string
  accountNumber: string
  branchCode: string
  defaultVatRate: number | null
}

export interface CreateBusinessInfoInput {
  companyName: string
  streetAddress: string
  city: string
  postalCode: string
  country: string
  vatNumber: string
  email: string
  phone: string
  logoPath?: string | null
  accountHolderName: string
  bankName: string
  accountNumber: string
  branchCode: string
  defaultVatRate?: number | null
}

export interface Customer {
  id: number
  name: string
  vatNumber: string | null
  streetAddress: string
  city: string
  postalCode: string
  country: string
  email: string
  phone: string
  createdAt: string
}

export interface Product {
  id: number
  name: string
  description: string | null
  defaultPrice: number
  createdAt: string
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled"

export interface Invoice {
  id: number
  invoiceNumber: string
  customerId: number
  bankAccountId: number | null
  currency: string
  createdAt: string
  dueDate: string
  vatRate: number | null
  notes: string | null
  subtotal: number
  vatAmount: number
  total: number
  status: InvoiceStatus
  paidAt: string | null
}

export interface InvoiceLineItem {
  id: number
  invoiceId: number
  productId: number | null
  productName?: string | null
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
  additionalNotes: string | null
}

export interface BankAccount {
  id: number
  label: string
  currency: string
  accountHolderName: string
  bankName: string
  accountNumber: string | null
  /**
   * Generic local routing code — branch code (ZA), sort code (GB),
   * routing number (US). Use `routingCodeLabel(currency)` for display.
   */
  branchCode: string | null
  iban: string | null
  swiftBic: string | null
  bankAddress: string | null
  isDefault: boolean
  createdAt: string
}

/**
 * Display label for the local routing code field, per currency.
 * GBP → Sort Code, USD → Routing Number, everything else → Branch Code.
 */
export const routingCodeLabel = (currency: string): string => {
  switch (currency) {
    case "GBP":
      return "Sort Code"
    case "USD":
      return "Routing Number"
    default:
      return "Branch Code"
  }
}

export interface CreateBankAccountInput {
  label: string
  currency: string
  accountHolderName: string
  bankName: string
  accountNumber?: string | null
  /** Local routing code — branch code (ZA), sort code (GB), routing number (US). */
  branchCode?: string | null
  iban?: string | null
  swiftBic?: string | null
  bankAddress?: string | null
  isDefault?: boolean
}

export interface BankDetails {
  accountHolderName: string
  bankName: string
  accountNumber: string | null
  branchCode: string | null
  iban: string | null
  swiftBic: string | null
  bankAddress: string | null
}

export interface CreateCustomerInput {
  name: string
  vatNumber: string | null
  streetAddress: string
  city: string
  postalCode: string
  country: string
  email: string
  phone: string
}

export interface CreateProductInput {
  name: string
  description: string | null
  defaultPrice: number
}

export interface CreateInvoiceInput {
  customerId: number
  bankAccountId?: number | null
  dueDate: string
  vatRate: number | null
  notes: string | null
  lineItems: CreateLineItemInput[]
}

export interface CreateLineItemInput {
  productId: number | null
  description?: string
  quantity: number
  unitPrice?: number
  additionalNotes?: string | null
}

export interface UpdateInvoiceInput extends CreateInvoiceInput {}
