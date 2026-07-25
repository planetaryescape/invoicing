# Multi-Bank Account & Multi-Currency Support

## Current State

- Bank details are embedded directly in `business_info` (single row, single bank account)
- Currency is hardcoded to ZAR everywhere (template, spec, `formatCurrency` helper)
- Invoices have no currency or bank account reference fields

---

## Phase 1: Core — New `bank_accounts` table + schema

**`core/src/db/drizzle-schema.ts`** — Add new table:

```
bank_accounts: id, label, currency (e.g. "ZAR","USD","EUR"),
  accountHolderName, bankName, accountNumber, branchCode,
  isDefault (integer 0/1), createdAt
```

**`core/src/db/schema.ts`** — Add matching raw SQL `CREATE TABLE`

**`core/src/types/index.ts`** — Add `BankAccount`, `CreateBankAccountInput` types. Add `currency` + `bankAccountId` to `Invoice` and `CreateInvoiceInput`.

**Migration**: Drizzle migration to add the table and new invoice columns. Seed a default bank account from existing `business_info` bank fields.

## Phase 2: Core — `BankAccountService`

**`core/src/services/BankAccountService.ts`** — New Effect service:

- `list()` — all accounts
- `get(id)` — single account
- `create(input)` — create (if `isDefault`, unset other defaults)
- `update(id, input)` — update (same default logic)
- `delete(id)` — delete (prevent if used by invoices, prevent deleting last default)
- `getDefault()` — get the default account

## Phase 3: Core — Update `InvoiceService` + PDF template

**`InvoiceService.ts`**:

- `create`/`update`: accept optional `bankAccountId`; if omitted, use default. Store `currency` and `bankAccountId` on the invoice row.

**`InvoicePDFService.ts`**:

- Fetch the bank account for the invoice and pass it to the template.

**`templates/invoice-template.ts`**:

- `formatCurrency(amount, currency)` — use the invoice's currency code instead of hardcoded ZAR.
- Bank details section uses the invoice's bank account, not `business_info`.

## Phase 4: Server API

Bank account operations are exposed through the typed Effect RPC contract:

- `listBankAccounts`
- `createBankAccount`
- `updateBankAccount`
- `deleteBankAccount`
- `setDefaultBankAccount`

## Phase 5: Web — UI pages

**`web/src/ui/business-info.tsx`**:

- Remove the inline "Bank Details" form section.
- Add a link/section to "Manage Bank Accounts" page.

**`web/src/ui/bank-accounts.tsx`** — New page:

- List all bank accounts (show label, bank, currency, default badge)
- Create/edit form (label, currency dropdown, account details, "set as default" toggle)
- Delete button (with guard)

**`web/src/ui/invoices.tsx`** (new + edit forms):

- Add bank account selector dropdown (pre-selects default)
- Currency display auto-set from selected bank account
- Invoice detail view: show currency-formatted totals + bank details from the linked account

## Phase 6: Remove legacy bank fields from `business_info`

After migration/backfill, drop `account_holder_name`, `bank_name`, `account_number`, `branch_code` from `business_info` table and types.

---

## Execution Order

1. **Phase 1+2** first (schema + service) — can be tested independently
2. **Phase 3** (invoice changes) — depends on Phase 2
3. **Phase 4+5** together (API + UI) — depends on Phase 3
4. **Phase 6** last (cleanup) — optional, do when confident
