import { describe, test, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { BankAccountService, BankAccountServiceLive } from "./BankAccountService.ts"
import { TestDatabaseLive } from "../db/test-utils.ts"
import type { CreateBankAccountInput } from "../types/index.ts"

const TestLayer = Layer.provide(BankAccountServiceLive, TestDatabaseLive)

const runTest = <A, E>(effect: Effect.Effect<A, E, BankAccountService>) =>
  Effect.runPromise(Effect.provide(effect, TestLayer))

const zarAccount: CreateBankAccountInput = {
  label: "ZAR Business Account",
  currency: "ZAR",
  accountHolderName: "Test Corp",
  bankName: "FNB",
  accountNumber: "12345678",
  branchCode: "250655",
}

const usdAccount: CreateBankAccountInput = {
  label: "USD Account",
  currency: "USD",
  accountHolderName: "Test Corp",
  bankName: "Wise",
  accountNumber: "87654321",
  branchCode: "000000",
}

const eurAccount: CreateBankAccountInput = {
  label: "EUR Business Account",
  currency: "EUR",
  accountHolderName: "Test Corp",
  bankName: "Deutsche Bank",
  iban: "DE89370400440532013000",
  swiftBic: "DEUTDEDB",
  bankAddress: "Taunusanlage 12, 60325 Frankfurt",
}

describe("BankAccountService", () => {
  test("should create a bank account", async () => {
    const account = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        return yield* service.create(zarAccount)
      })
    )

    expect(account.id).toBeGreaterThan(0)
    expect(account.label).toBe(zarAccount.label)
    expect(account.currency).toBe("ZAR")
    expect(account.bankName).toBe("FNB")
    expect(account.accountNumber).toBe("12345678")
  })

  test("first account should be default automatically", async () => {
    const account = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        return yield* service.create(zarAccount)
      })
    )

    expect(account.isDefault).toBe(true)
  })

  test("second account should not be default by default", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        const first = yield* service.create(zarAccount)
        const second = yield* service.create(usdAccount)
        return { first, second }
      })
    )

    expect(result.first.isDefault).toBe(true)
    expect(result.second.isDefault).toBe(false)
  })

  test("should list all bank accounts sorted by label", async () => {
    const accounts = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        yield* service.create(usdAccount) // "USD Account" comes after
        yield* service.create(zarAccount) // "ZAR Business Account"
        return yield* service.list()
      })
    )

    expect(accounts).toHaveLength(2)
    expect(accounts[0]?.label).toBe("USD Account")
    expect(accounts[1]?.label).toBe("ZAR Business Account")
  })

  test("should get a bank account by id", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        const created = yield* service.create(zarAccount)
        return yield* service.get(created.id)
      })
    )

    expect(result).toBeDefined()
    expect(result?.label).toBe(zarAccount.label)
    expect(result?.currency).toBe("ZAR")
  })

  test("should get default bank account", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        yield* service.create(zarAccount)
        yield* service.create(usdAccount)
        return yield* service.getDefault()
      })
    )

    expect(result).toBeDefined()
    expect(result?.label).toBe(zarAccount.label)
    expect(result?.isDefault).toBe(true)
  })

  test("should update a bank account", async () => {
    const updated = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        const created = yield* service.create(zarAccount)
        return yield* service.update(created.id, {
          ...zarAccount,
          label: "Updated Label",
          currency: "EUR",
        })
      })
    )

    expect(updated.label).toBe("Updated Label")
    expect(updated.currency).toBe("EUR")
  })

  test("should not unset the default account during an update", async () => {
    const updated = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        const created = yield* service.create(zarAccount)
        return yield* service.update(created.id, { ...zarAccount, isDefault: false })
      })
    )

    expect(updated.isDefault).toBe(true)
  })

  test("should set a new default and unset old one", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        yield* service.create(zarAccount)
        const second = yield* service.create(usdAccount)
        const newDefault = yield* service.setDefault(second.id)
        const all = yield* service.list()
        return { newDefault, all }
      })
    )

    expect(result.newDefault.isDefault).toBe(true)
    expect(result.newDefault.label).toBe("USD Account")
    const defaults = result.all.filter((a) => a.isDefault)
    expect(defaults).toHaveLength(1)
    expect(defaults[0]?.id).toBe(result.newDefault.id)
  })

  test("should delete a non-default bank account", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        yield* service.create(zarAccount)
        const second = yield* service.create(usdAccount)
        yield* service.delete(second.id)
        return yield* service.list()
      })
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.label).toBe(zarAccount.label)
  })

  test("should prevent deleting default bank account", async () => {
    try {
      await runTest(
        Effect.gen(function* () {
          const service = yield* BankAccountService
          const defaultAccount = yield* service.create(zarAccount)
          yield* service.delete(defaultAccount.id)
        })
      )
      expect(true).toBe(false) // Should not reach here
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  test("creating with isDefault=true should unset previous default", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        yield* service.create(zarAccount)
        const second = yield* service.create({ ...usdAccount, isDefault: true })
        const all = yield* service.list()
        return { second, all }
      })
    )

    expect(result.second.isDefault).toBe(true)
    const defaults = result.all.filter((a) => a.isDefault)
    expect(defaults).toHaveLength(1)
    expect(defaults[0]?.id).toBe(result.second.id)
  })

  test("should create an international account with IBAN and SWIFT/BIC", async () => {
    const account = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        return yield* service.create(eurAccount)
      })
    )

    expect(account.iban).toBe("DE89370400440532013000")
    expect(account.swiftBic).toBe("DEUTDEDB")
    expect(account.bankAddress).toBe("Taunusanlage 12, 60325 Frankfurt")
    expect(account.accountNumber).toBeNull()
    expect(account.branchCode).toBeNull()
  })

  test("local account should have null IBAN and SWIFT fields", async () => {
    const account = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        return yield* service.create(zarAccount)
      })
    )

    expect(account.iban).toBeNull()
    expect(account.swiftBic).toBeNull()
    expect(account.bankAddress).toBeNull()
    expect(account.accountNumber).toBe("12345678")
    expect(account.branchCode).toBe("250655")
  })

  test("should update an account to use IBAN/SWIFT", async () => {
    const updated = await runTest(
      Effect.gen(function* () {
        const service = yield* BankAccountService
        const created = yield* service.create(zarAccount)
        return yield* service.update(created.id, {
          ...zarAccount,
          accountNumber: null,
          branchCode: null,
          iban: "DE89370400440532013000",
          swiftBic: "DEUTDEDB",
        })
      })
    )

    expect(updated.iban).toBe("DE89370400440532013000")
    expect(updated.swiftBic).toBe("DEUTDEDB")
    expect(updated.accountNumber).toBeNull()
    expect(updated.branchCode).toBeNull()
  })
})
