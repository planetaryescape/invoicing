import { describe, test, expect } from "bun:test"
import { generateInvoiceHTML } from "./invoice-template.ts"
import type { InvoiceTemplateData, } from "./invoice-template.ts"
import type { BankAccount, BusinessInfo, Customer, Invoice, InvoiceLineItem } from "../types/index.ts"

const baseCustomer: Customer = {
  id: 1,
  name: "Acme Corp",
  vatNumber: null,
  streetAddress: "1 Main St",
  city: "Cape Town",
  postalCode: "8001",
  country: "South Africa",
  email: "billing@acme.com",
  phone: "+27 21 000 0000",
  createdAt: "2024-01-01T00:00:00.000Z",
}

const baseBusinessInfo: BusinessInfo = {
  id: 1,
  companyName: "Test Biz",
  streetAddress: "2 Business Ave",
  city: "Johannesburg",
  postalCode: "2000",
  country: "South Africa",
  vatNumber: "4123456789",
  email: "info@testbiz.co.za",
  phone: "+27 11 000 0000",
  logoPath: null,
  accountHolderName: "Test Biz Ltd",
  bankName: "FNB",
  accountNumber: "111111111",
  branchCode: "250655",
  defaultVatRate: 15,
}

const baseInvoice: Invoice = {
  id: 1,
  invoiceNumber: "INV-001",
  customerId: 1,
  bankAccountId: null,
  currency: "ZAR",
  createdAt: "2024-01-01T00:00:00.000Z",
  dueDate: "2024-01-31T00:00:00.000Z",
  vatRate: 15,
  notes: null,
  subtotal: 1000,
  vatAmount: 150,
  total: 1150,
  status: "sent",
  paidAt: null,
}

const baseLineItem: InvoiceLineItem = {
  id: 1,
  invoiceId: 1,
  productId: null,
  productName: null,
  description: "Consulting",
  quantity: 1,
  unitPrice: 1000,
  lineTotal: 1000,
  additionalNotes: null,
}

const localBankAccount: BankAccount = {
  id: 1,
  label: "ZAR Account",
  currency: "ZAR",
  accountHolderName: "Test Biz Ltd",
  bankName: "FNB",
  accountNumber: "12345678",
  branchCode: "250655",
  iban: null,
  swiftBic: null,
  bankAddress: null,
  isDefault: true,
  createdAt: "2024-01-01T00:00:00.000Z",
}

const ibanBankAccount: BankAccount = {
  id: 2,
  label: "EUR Account",
  currency: "EUR",
  accountHolderName: "Test Biz Ltd",
  bankName: "Deutsche Bank",
  accountNumber: null,
  branchCode: null,
  iban: "DE89370400440532013000",
  swiftBic: "DEUTDEDB",
  bankAddress: "Taunusanlage 12, 60325 Frankfurt",
  isDefault: false,
  createdAt: "2024-01-01T00:00:00.000Z",
}

// Wise-style GBP account: has BOTH domestic details (account number + sort code)
// and international details (IBAN + SWIFT/BIC)
const gbpBankAccount: BankAccount = {
  id: 3,
  label: "Wise (GBP)",
  currency: "GBP",
  accountHolderName: "Test Biz Ltd",
  bankName: "Wise Payments Limited",
  accountNumber: "36945893",
  branchCode: "23-14-70",
  iban: "GB57TRWI23147036945893",
  swiftBic: "TRWIGB2LXXX",
  bankAddress: "1st Floor, Worship Square, 65 Clifton Street, London, EC2A 4JE, United Kingdom",
  isDefault: false,
  createdAt: "2024-01-01T00:00:00.000Z",
}

const baseData = (bankAccount?: BankAccount): InvoiceTemplateData => ({
  invoice: baseInvoice,
  lineItems: [baseLineItem],
  customer: baseCustomer,
  businessInfo: baseBusinessInfo,
  bankAccount,
})

describe("generateInvoiceHTML - bank details rendering", () => {
  test("renders account number and branch code for local account", () => {
    const html = generateInvoiceHTML(baseData(localBankAccount))

    expect(html).toContain("FNB")
    expect(html).toContain("12345678")
    expect(html).toContain("250655")
    expect(html).toContain("Account Holder")
    expect(html).not.toContain("IBAN")
    expect(html).not.toContain("SWIFT")
  })

  test("renders IBAN and SWIFT/BIC for international account", () => {
    const html = generateInvoiceHTML(baseData(ibanBankAccount))

    expect(html).toContain("Deutsche Bank")
    expect(html).toContain("DE89370400440532013000")
    expect(html).toContain("DEUTDEDB")
    expect(html).toContain("SWIFT/BIC")
    expect(html).toContain("Account Holder")
  })

  test("does not render empty account number or branch code for IBAN account", () => {
    const html = generateInvoiceHTML(baseData(ibanBankAccount))

    expect(html).not.toContain(">Account:<")
    expect(html).not.toContain(">Branch Code:<")
  })

  test("renders bank address when present on international account", () => {
    const html = generateInvoiceHTML(baseData(ibanBankAccount))

    expect(html).toContain("Taunusanlage 12, 60325 Frankfurt")
    expect(html).toContain("Bank Address")
  })

  test("omits bank address section when not present", () => {
    const accountWithoutAddress: BankAccount = { ...ibanBankAccount, bankAddress: null }
    const html = generateInvoiceHTML(baseData(accountWithoutAddress))

    expect(html).not.toContain("Bank Address")
  })

  test("omits SWIFT/BIC section when not present", () => {
    const accountWithoutSwift: BankAccount = { ...ibanBankAccount, swiftBic: null }
    const html = generateInvoiceHTML(baseData(accountWithoutSwift))

    expect(html).not.toContain("SWIFT/BIC")
    expect(html).toContain("DE89370400440532013000")
  })

  test("falls back to businessInfo bank details when no bankAccount is provided", () => {
    const html = generateInvoiceHTML(baseData(undefined))

    expect(html).toContain("FNB")
    expect(html).toContain("111111111")
    expect(html).toContain("250655")
  })

  test("renders both domestic and international details for GBP account with both", () => {
    const html = generateInvoiceHTML(baseData(gbpBankAccount))

    // Domestic (UK) details
    expect(html).toContain(">Account:<")
    expect(html).toContain("36945893")
    expect(html).toContain("Sort Code")
    expect(html).toContain("23-14-70")

    // International details
    expect(html).toContain("GB57TRWI23147036945893")
    expect(html).toContain("TRWIGB2LXXX")
    expect(html).toContain("SWIFT/BIC")
    expect(html).toContain("Bank Address")
    expect(html).toContain("Account Holder")

    // GBP accounts never say "Branch Code"
    expect(html).not.toContain(">Branch Code:<")
  })

  test("labels branch code as Sort Code only for GBP, Branch Code for ZAR", () => {
    const gbpHtml = generateInvoiceHTML(baseData(gbpBankAccount))
    const zarHtml = generateInvoiceHTML(baseData(localBankAccount))

    expect(gbpHtml).toContain(">Sort Code:<")
    expect(zarHtml).toContain(">Branch Code:<")
  })

  test("renders product name and description for product-backed items", () => {
    const html = generateInvoiceHTML({
      ...baseData(undefined),
      lineItems: [{ ...baseLineItem, productId: 2, productName: "Admin", description: "Billed by the hour" }],
    })

    expect(html).toContain("Admin")
    expect(html).toContain("Billed by the hour")
  })

  test("uses description for custom items without a product name", () => {
    const html = generateInvoiceHTML({
      ...baseData(undefined),
      lineItems: [{ ...baseLineItem, productId: null, productName: null, description: "Custom work" }],
    })

    expect(html).toContain("Custom work")
  })
})
