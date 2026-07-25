import { expect, test } from "bun:test"
import { Effect } from "effect"
import { TestDatabaseLive } from "../../core/src/db/test-utils.ts"
import {
  BankAccountNotFoundError,
  CustomerNotFoundError,
  InvoicingClient,
  InvoicingClientLive,
  InvoiceNotFoundError,
  OperationError,
  ProductNotFoundError,
} from "@invoicing/shared"
import { makeWebHandler } from "./routes.ts"

const customerInput = {
  name: "Cycle Customer",
  vatNumber: null,
  streetAddress: "1 Main Road",
  city: "Cape Town",
  postalCode: "8001",
  country: "South Africa",
  email: "cycle@example.com",
  phone: "0210000000",
}

const withRpc = async <A>(run: (rpcUrl: string) => Promise<A>): Promise<A> => {
  const rpc = makeWebHandler(TestDatabaseLive)
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: (request) => rpc.handler(request) })
  try {
    return await run(`http://${server.hostname}:${server.port}/rpc`)
  } finally {
    server.stop(true)
    await rpc.dispose()
  }
}

const runClient = <A, E>(rpcUrl: string, effect: Effect.Effect<A, E, InvoicingClient>) =>
  Effect.runPromise(effect.pipe(Effect.provide(InvoicingClientLive(rpcUrl))))

test("reads nullable business info through RPC serialization", () =>
  withRpc((rpcUrl) =>
    runClient(
      rpcUrl,
      Effect.gen(function* () {
        const client = yield* InvoicingClient
        const businessInfo = yield* client.getBusinessInfo()
        const customers = yield* client.listCustomers()
        return { businessInfo, customers }
      }),
    ).then((result) => {
      expect(result.businessInfo).toBeNull()
      expect(result.customers).toEqual([])
    }),
  ))

test("completes customer CRUD and keeps missing deletes idempotent", () =>
  withRpc((rpcUrl) =>
    runClient(
      rpcUrl,
      Effect.gen(function* () {
        const client = yield* InvoicingClient
        const created = yield* client.createCustomer(customerInput)
        const read = yield* client.getCustomer({ id: created.id })
        const updated = yield* client.updateCustomer({
          id: created.id,
          input: { ...customerInput, name: "Updated Customer", vatNumber: "VAT-1" },
        })
        yield* client.deleteCustomer({ id: created.id })
        yield* client.deleteCustomer({ id: created.id })
        yield* client.deleteProduct({ id: 999_999 })
        return { read, updated, customers: yield* client.listCustomers() }
      }),
    ).then((result) => {
      expect(result.read.name).toBe("Cycle Customer")
      expect(result.updated.name).toBe("Updated Customer")
      expect(result.customers).toEqual([])
    }),
  ))

test("decodes typed not-found errors", () =>
  withRpc((rpcUrl) =>
    runClient(
      rpcUrl,
      Effect.gen(function* () {
        const client = yield* InvoicingClient
        const customer = yield* Effect.flip(client.getCustomer({ id: 999_996 }))
        const product = yield* Effect.flip(client.getProduct({ id: 999_997 }))
        const bankAccount = yield* Effect.flip(client.getBankAccount({ id: 999_998 }))
        const invoice = yield* Effect.flip(client.getInvoice({ id: 999_999 }))
        return { bankAccount, customer, invoice, product }
      }),
    ).then(({ bankAccount, customer, invoice, product }) => {
      expect(customer).toBeInstanceOf(CustomerNotFoundError)
      expect(product).toBeInstanceOf(ProductNotFoundError)
      expect(bankAccount).toBeInstanceOf(BankAccountNotFoundError)
      expect(invoice).toBeInstanceOf(InvoiceNotFoundError)
    }),
  ))

test("rejects malformed input at the RPC schema boundary", () =>
  withRpc(async (rpcUrl) => {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/ndjson" },
      body: `${JSON.stringify({
        _tag: "Request",
        id: "malformed-status",
        tag: "updateInvoiceStatus",
        payload: { id: 1, status: "invalid" },
        headers: [],
      })}\n`,
    })
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain("Die")
    expect(body).toContain("invalid")
    expect(body).toContain("cancelled")
  }))

test("gets and updates products and bank accounts", () =>
  withRpc((rpcUrl) =>
    runClient(
      rpcUrl,
      Effect.gen(function* () {
        const client = yield* InvoicingClient
        const product = yield* client.createProduct({
          name: "Consulting",
          description: null,
          defaultPrice: 100,
        })
        const readProduct = yield* client.getProduct({ id: product.id })
        const updatedProduct = yield* client.updateProduct({
          id: product.id,
          input: { name: "Advisory", description: "Monthly", defaultPrice: 125 },
        })
        const bankAccount = yield* client.createBankAccount({
          label: "Primary",
          currency: "ZAR",
          accountHolderName: "Invoicing",
          bankName: "Example Bank",
          accountNumber: null,
        })
        const readBankAccount = yield* client.getBankAccount({ id: bankAccount.id })
        const updatedBankAccount = yield* client.updateBankAccount({
          id: bankAccount.id,
          input: {
            label: "Operations",
            currency: "USD",
            accountHolderName: "Invoicing Ltd",
            bankName: "Updated Bank",
            accountNumber: null,
            branchCode: null,
            iban: null,
            swiftBic: null,
            bankAddress: null,
          },
        })
        return { readBankAccount, readProduct, updatedBankAccount, updatedProduct }
      }),
    ).then((result) => {
      expect(result.readProduct.name).toBe("Consulting")
      expect(result.updatedProduct.name).toBe("Advisory")
      expect(result.readBankAccount.label).toBe("Primary")
      expect(result.updatedBankAccount.label).toBe("Operations")
      expect(result.updatedBankAccount.accountNumber).toBeNull()
    }),
  ))

test("saves business info with nullable values", () =>
  withRpc((rpcUrl) =>
    runClient(
      rpcUrl,
      Effect.gen(function* () {
        const client = yield* InvoicingClient
        const saved = yield* client.saveBusinessInfo({
          companyName: "Invoicing Ltd",
          streetAddress: "2 Main Road",
          city: "Cape Town",
          postalCode: "8001",
          country: "South Africa",
          vatNumber: "",
          email: "billing@example.com",
          phone: "",
          logoPath: null,
          accountHolderName: "Invoicing Ltd",
          bankName: "Example Bank",
          accountNumber: "1234",
          branchCode: "0001",
          defaultVatRate: null,
        })
        return { read: yield* client.getBusinessInfo(), saved }
      }),
    ).then(({ read, saved }) => {
      expect(saved.logoPath).toBeNull()
      expect(saved.defaultVatRate).toBeNull()
      expect(read).toEqual(saved)
    }),
  ))

test("gets and updates invoices and records paidAt", () =>
  withRpc((rpcUrl) =>
    runClient(
      rpcUrl,
      Effect.gen(function* () {
        const client = yield* InvoicingClient
        const customer = yield* client.createCustomer(customerInput)
        const created = yield* client.createInvoice({
          customerId: customer.id,
          dueDate: "2026-08-01",
          vatRate: 15,
          notes: null,
          lineItems: [{ productId: null, description: "Consulting", quantity: 2, unitPrice: 50 }],
        })
        const read = yield* client.getInvoice({ id: created.id })
        const updated = yield* client.updateInvoice({
          id: created.id,
          input: {
            customerId: customer.id,
            dueDate: "2026-09-01",
            vatRate: null,
            notes: "Updated",
            lineItems: [{ productId: null, description: "Advisory", quantity: 3, unitPrice: 75 }],
          },
        })
        const paid = yield* client.updateInvoiceStatus({ id: created.id, status: "paid" })
        return { paid, read, updated }
      }),
    ).then(({ paid, read, updated }) => {
      expect(read.lineItems).toHaveLength(1)
      expect(updated.dueDate).toBe("2026-09-01")
      expect(updated.lineItems[0]?.description).toBe("Advisory")
      expect(paid.status).toBe("paid")
      expect(paid.paidAt).toBeString()
    }),
  ))

test("aggregates dashboard data and preserves invoice ordering", () =>
  withRpc((rpcUrl) =>
    runClient(
      rpcUrl,
      Effect.gen(function* () {
        const client = yield* InvoicingClient
        const customer = yield* client.createCustomer(customerInput)
        yield* client.createProduct({ name: "Dashboard Product", description: null, defaultPrice: 50 })
        for (let index = 0; index < 6; index += 1) {
          yield* client.createInvoice({
            customerId: customer.id,
            dueDate: "2026-08-01",
            vatRate: 15,
            notes: null,
            lineItems: [{ productId: null, description: `Consulting ${index}`, quantity: 2, unitPrice: 50 }],
          })
        }
        const invoices = yield* client.listInvoices()
        const dashboard = yield* client.dashboard()
        return { dashboard, invoices }
      }),
    ).then(({ dashboard, invoices }) => {
      expect(dashboard.revenueByCurrency).toEqual({ ZAR: 690 })
      expect(dashboard.invoiceCount).toBe(6)
      expect(dashboard.customerCount).toBe(1)
      expect(dashboard.productCount).toBe(1)
      expect(dashboard.recentInvoices.map((invoice) => invoice.id)).toEqual(
        invoices.slice(0, 5).map((invoice) => invoice.id),
      )
    }),
  ))

test("sets a default bank account and maps default deletion to OperationError", () =>
  withRpc((rpcUrl) =>
    runClient(
      rpcUrl,
      Effect.gen(function* () {
        const client = yield* InvoicingClient
        yield* client.createBankAccount({
          label: "Primary",
          currency: "ZAR",
          accountHolderName: "Invoicing",
          bankName: "Example Bank",
        })
        const secondary = yield* client.createBankAccount({
          label: "Secondary",
          currency: "USD",
          accountHolderName: "Invoicing",
          bankName: "Example Bank",
        })
        const selected = yield* client.setDefaultBankAccount({ id: secondary.id })
        const accounts = yield* client.listBankAccounts()
        const deletionError = yield* Effect.flip(client.deleteBankAccount({ id: secondary.id }))
        return { accounts, deletionError, selected }
      }),
    ).then(({ accounts, deletionError, selected }) => {
      expect(selected.isDefault).toBe(true)
      expect(accounts.find((account) => account.label === "Primary")?.isDefault).toBe(false)
      expect(accounts.find((account) => account.label === "Secondary")?.isDefault).toBe(true)
      expect(deletionError).toBeInstanceOf(OperationError)
    }),
  ))
