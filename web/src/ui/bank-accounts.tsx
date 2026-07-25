/** @jsx jsx */
/** @jsxImportSource hono/jsx */
import { Hono } from "hono"
import { Layout } from "./Layout.tsx"
import { Effect } from "effect"
import { BankAccountService, AppRuntime, routingCodeLabel } from "@invoicing/core"

const app = new Hono()

const CURRENCIES = ["ZAR", "USD", "EUR", "GBP"]

// Keeps the local routing code field (branch code / sort code / routing number)
// labelled per the selected currency.
const routingLabelScript = `
const routingLabels = { GBP: "Sort Code", USD: "Routing Number" }
const routingPlaceholders = { ZAR: "e.g. 250655", GBP: "e.g. 23-14-70", USD: "e.g. 021000021" }
const currencySelect = document.getElementById("currency")
const syncRoutingField = () => {
  const cur = currencySelect.value
  document.getElementById("branchCodeLabel").textContent = routingLabels[cur] || "Branch Code"
  document.getElementById("branchCode").placeholder = routingPlaceholders[cur] || ""
}
currencySelect.addEventListener("change", syncRoutingField)
syncRoutingField()
`

app.get("/", async (c) => {
  const bankAccounts = await AppRuntime.runPromise(
    Effect.gen(function* () {
      const service = yield* BankAccountService
      return yield* service.list()
    })
  )

  return c.html(
    <Layout title="Bank Accounts" currentPath="/bank-accounts">
      <div class="page-header">
        <h1>Bank Accounts</h1>
        <a href="/bank-accounts/new" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Bank Account
        </a>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>Currency</th>
              <th>Bank</th>
              <th>Account Number</th>
              <th>Default</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bankAccounts.map((account) => (
              <tr>
                <td class="font-medium">{account.label}</td>
                <td><span class="badge">{account.currency}</span></td>
                <td class="text-secondary">{account.bankName}</td>
                <td class="text-secondary">{account.iban ?? account.accountNumber}</td>
                <td>
                  {account.isDefault ? (
                    <span class="badge badge-success">Default</span>
                  ) : (
                    <form method="post" action={`/bank-accounts/${account.id}/set-default`} style="display:inline;">
                      <button type="submit" class="btn btn-sm btn-ghost">Set Default</button>
                    </form>
                  )}
                </td>
                <td class="text-right td-actions">
                  <div class="flex gap-2 justify-end">
                    <a href={`/bank-accounts/${account.id}`} class="btn btn-sm btn-outline">Edit</a>
                    {!account.isDefault && (
                      <form method="post" action={`/bank-accounts/${account.id}/delete`} onsubmit="return confirm('Delete this bank account?');" style="display:inline;">
                        <button type="submit" class="btn btn-sm btn-ghost" style="color: var(--danger);">Delete</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {bankAccounts.length === 0 && (
              <tr>
                <td colspan={6}>
                  <div class="empty-state">
                    <p>No bank accounts yet. Add your first bank account to get started.</p>
                    <a href="/bank-accounts/new" class="btn btn-primary btn-sm">Add Bank Account</a>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
})

app.get("/new", (c) => {
  return c.html(
    <Layout title="New Bank Account" currentPath="/bank-accounts">
      <div class="page-header">
        <h1>New Bank Account</h1>
        <a href="/bank-accounts" class="btn btn-outline">Back to Bank Accounts</a>
      </div>

      <div class="card">
        <form method="post" action="/bank-accounts">
          <div class="form-section">
            <div class="form-section-title">Account Details</div>
            <div class="form-grid">
              <div class="form-group">
                <label for="label">Label <span class="required">*</span></label>
                <input type="text" id="label" name="label" placeholder="e.g. ZAR Business Account" required />
              </div>

              <div class="form-group">
                <label for="currency">Currency <span class="required">*</span></label>
                <select id="currency" name="currency" required>
                  {CURRENCIES.map((cur) => (
                    <option value={cur} selected={cur === "ZAR"}>{cur}</option>
                  ))}
                </select>
              </div>

              <div class="form-group">
                <label for="accountHolderName">Account Holder Name <span class="required">*</span></label>
                <input type="text" id="accountHolderName" name="accountHolderName" required />
              </div>

              <div class="form-group">
                <label for="bankName">Bank Name <span class="required">*</span></label>
                <input type="text" id="bankName" name="bankName" required />
              </div>

              <div class="form-group">
                <label for="accountNumber">Account Number</label>
                <input type="text" id="accountNumber" name="accountNumber" />
              </div>

              <div class="form-group">
                <label for="branchCode"><span id="branchCodeLabel">{routingCodeLabel("ZAR")}</span></label>
                <input type="text" id="branchCode" name="branchCode" placeholder="e.g. 250655" />
              </div>

              <div class="form-group">
                <label for="iban">IBAN</label>
                <input type="text" id="iban" name="iban" placeholder="e.g. DE89370400440532013000" />
              </div>

              <div class="form-group">
                <label for="swiftBic">SWIFT/BIC</label>
                <input type="text" id="swiftBic" name="swiftBic" placeholder="e.g. DEUTDEDB" />
              </div>

              <div class="form-group full-width">
                <label for="bankAddress">Bank Address</label>
                <textarea id="bankAddress" name="bankAddress" rows={2} placeholder="Optional — for international transfers" />
              </div>

              <div class="form-group full-width">
                <p class="form-hint">For local accounts use Account Number + Branch Code. For international accounts use IBAN + SWIFT/BIC. Some accounts (e.g. Wise GBP) use both — fill in Account Number + Sort Code for UK transfers and IBAN + SWIFT/BIC for international.</p>
              </div>

              <div class="form-group full-width">
                <label class="checkbox-label">
                  <input type="checkbox" name="isDefault" value="1" />
                  Set as default bank account
                </label>
              </div>
            </div>
          </div>

          <div class="flex gap-2">
            <button type="submit" class="btn btn-primary">Create Bank Account</button>
            <a href="/bank-accounts" class="btn btn-ghost">Cancel</a>
          </div>
        </form>
      </div>

      <script dangerouslySetInnerHTML={{ __html: routingLabelScript }} />
    </Layout>
  )
})

app.post("/", async (c) => {
  const body = await c.req.parseBody()

  await AppRuntime.runPromise(
    Effect.gen(function* () {
      const service = yield* BankAccountService
      yield* service.create({
        label: body["label"] as string,
        currency: body["currency"] as string,
        accountHolderName: body["accountHolderName"] as string,
        bankName: body["bankName"] as string,
        accountNumber: (body["accountNumber"] as string) || null,
        branchCode: (body["branchCode"] as string) || null,
        iban: (body["iban"] as string) || null,
        swiftBic: (body["swiftBic"] as string) || null,
        bankAddress: (body["bankAddress"] as string) || null,
        isDefault: body["isDefault"] === "1",
      })
    })
  )

  return c.redirect("/bank-accounts")
})

app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"))
  if (isNaN(id)) return c.text("Invalid ID", 400)

  const account = await AppRuntime.runPromise(
    Effect.gen(function* () {
      const service = yield* BankAccountService
      return yield* service.get(id)
    })
  )

  if (!account) return c.text("Bank account not found", 404)

  return c.html(
    <Layout title={`${account.label}`} currentPath="/bank-accounts">
      <div class="page-header">
        <h1>{account.label}</h1>
        <a href="/bank-accounts" class="btn btn-outline">Back to Bank Accounts</a>
      </div>

      <div class="card">
        <form method="post" action={`/bank-accounts/${id}`}>
          <div class="form-section">
            <div class="form-section-title">Account Details</div>
            <div class="form-grid">
              <div class="form-group">
                <label for="label">Label <span class="required">*</span></label>
                <input type="text" id="label" name="label" value={account.label} required />
              </div>

              <div class="form-group">
                <label for="currency">Currency <span class="required">*</span></label>
                <select id="currency" name="currency" required>
                  {CURRENCIES.map((cur) => (
                    <option value={cur} selected={cur === account.currency}>{cur}</option>
                  ))}
                </select>
              </div>

              <div class="form-group">
                <label for="accountHolderName">Account Holder Name <span class="required">*</span></label>
                <input type="text" id="accountHolderName" name="accountHolderName" value={account.accountHolderName} required />
              </div>

              <div class="form-group">
                <label for="bankName">Bank Name <span class="required">*</span></label>
                <input type="text" id="bankName" name="bankName" value={account.bankName} required />
              </div>

              <div class="form-group">
                <label for="accountNumber">Account Number</label>
                <input type="text" id="accountNumber" name="accountNumber" value={account.accountNumber ?? ""} />
              </div>

              <div class="form-group">
                <label for="branchCode"><span id="branchCodeLabel">{routingCodeLabel(account.currency)}</span></label>
                <input type="text" id="branchCode" name="branchCode" value={account.branchCode ?? ""} />
              </div>

              <div class="form-group">
                <label for="iban">IBAN</label>
                <input type="text" id="iban" name="iban" value={account.iban ?? ""} placeholder="e.g. DE89370400440532013000" />
              </div>

              <div class="form-group">
                <label for="swiftBic">SWIFT/BIC</label>
                <input type="text" id="swiftBic" name="swiftBic" value={account.swiftBic ?? ""} placeholder="e.g. DEUTDEDB" />
              </div>

              <div class="form-group full-width">
                <label for="bankAddress">Bank Address</label>
                <textarea id="bankAddress" name="bankAddress" rows={2} placeholder="Optional — for international transfers">{account.bankAddress ?? ""}</textarea>
              </div>

              <div class="form-group full-width">
                <p class="form-hint">For local accounts use Account Number + Branch Code. For international accounts use IBAN + SWIFT/BIC. Some accounts (e.g. Wise GBP) use both — fill in Account Number + Sort Code for UK transfers and IBAN + SWIFT/BIC for international.</p>
              </div>

              <div class="form-group full-width">
                <label class="checkbox-label">
                  <input type="checkbox" name="isDefault" value="1" checked={account.isDefault} />
                  Set as default bank account
                </label>
              </div>
            </div>
          </div>

          <div class="flex gap-2">
            <button type="submit" class="btn btn-primary">Save Changes</button>
            <a href="/bank-accounts" class="btn btn-ghost">Cancel</a>
          </div>
        </form>
      </div>

      <script dangerouslySetInnerHTML={{ __html: routingLabelScript }} />
    </Layout>
  )
})

app.post("/:id", async (c) => {
  const id = Number(c.req.param("id"))
  if (isNaN(id)) return c.text("Invalid ID", 400)

  const body = await c.req.parseBody()

  await AppRuntime.runPromise(
    Effect.gen(function* () {
      const service = yield* BankAccountService
      yield* service.update(id, {
        label: body["label"] as string,
        currency: body["currency"] as string,
        accountHolderName: body["accountHolderName"] as string,
        bankName: body["bankName"] as string,
        accountNumber: (body["accountNumber"] as string) || null,
        branchCode: (body["branchCode"] as string) || null,
        iban: (body["iban"] as string) || null,
        swiftBic: (body["swiftBic"] as string) || null,
        bankAddress: (body["bankAddress"] as string) || null,
        isDefault: body["isDefault"] === "1",
      })
    })
  )

  return c.redirect("/bank-accounts")
})

app.post("/:id/set-default", async (c) => {
  const id = Number(c.req.param("id"))
  if (isNaN(id)) return c.text("Invalid ID", 400)

  await AppRuntime.runPromise(
    Effect.gen(function* () {
      const service = yield* BankAccountService
      yield* service.setDefault(id)
    })
  )

  return c.redirect("/bank-accounts")
})

app.post("/:id/delete", async (c) => {
  const id = Number(c.req.param("id"))
  if (isNaN(id)) return c.text("Invalid ID", 400)

  await AppRuntime.runPromise(
    Effect.gen(function* () {
      const service = yield* BankAccountService
      yield* service.delete(id)
    })
  )

  return c.redirect("/bank-accounts")
})

export default app
