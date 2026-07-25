import { Context, Effect, Layer } from "effect"
import { eq, asc } from "drizzle-orm"
import { Database, DatabaseError } from "./Database.ts"
import { bankAccounts } from "../db/drizzle-schema.ts"
import type { BankAccount, CreateBankAccountInput } from "../types/index.ts"

export class BankAccountService extends Context.Service<
  BankAccountService,
  {
    readonly list: () => Effect.Effect<BankAccount[], DatabaseError>
    readonly get: (id: number) => Effect.Effect<BankAccount | undefined, DatabaseError>
    readonly getDefault: () => Effect.Effect<BankAccount | undefined, DatabaseError>
    readonly create: (input: CreateBankAccountInput) => Effect.Effect<BankAccount, DatabaseError>
    readonly update: (id: number, input: CreateBankAccountInput) => Effect.Effect<BankAccount, DatabaseError>
    readonly delete: (id: number) => Effect.Effect<void, DatabaseError>
    readonly setDefault: (id: number) => Effect.Effect<BankAccount, DatabaseError>
  }
>()("BankAccountService") {}

export const BankAccountServiceLive = Layer.effect(
  BankAccountService,
  Effect.gen(function* () {
    const database = yield* Database

    const clearDefaults = () =>
      Effect.try({
        try: () =>
          database.db
            .update(bankAccounts)
            .set({ isDefault: false })
            .run(),
        catch: (error) => DatabaseError.new("Failed to clear default bank accounts", error),
      })

    return BankAccountService.of({
      list: () =>
        Effect.try({
          try: () =>
            database.db.select().from(bankAccounts).orderBy(asc(bankAccounts.label)).all() as BankAccount[],
          catch: (error) => DatabaseError.new("Failed to list bank accounts", error),
        }),

      get: (id: number) =>
        Effect.try({
          try: () => {
            const result = database.db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).get()
            return result as BankAccount | undefined
          },
          catch: (error) => DatabaseError.new("Failed to get bank account", error),
        }),

      getDefault: () =>
        Effect.try({
          try: () => {
            const result = database.db
              .select()
              .from(bankAccounts)
              .where(eq(bankAccounts.isDefault, true))
              .get()
            return result as BankAccount | undefined
          },
          catch: (error) => DatabaseError.new("Failed to get default bank account", error),
        }),

      create: (input: CreateBankAccountInput) =>
        Effect.gen(function* () {
          if (input.isDefault) {
            yield* clearDefaults()
          }

          // If this is the first bank account, make it default regardless
          const existing = yield* Effect.try({
            try: () => database.db.select().from(bankAccounts).all(),
            catch: (error) => DatabaseError.new("Failed to check existing bank accounts", error),
          })
          const shouldBeDefault = input.isDefault || existing.length === 0

          yield* Effect.try({
            try: () =>
              database.db
                .insert(bankAccounts)
                .values({
                  label: input.label,
                  currency: input.currency,
                  accountHolderName: input.accountHolderName,
                  bankName: input.bankName,
                  accountNumber: input.accountNumber ?? null,
                  branchCode: input.branchCode ?? null,
                  iban: input.iban ?? null,
                  swiftBic: input.swiftBic ?? null,
                  bankAddress: input.bankAddress ?? null,
                  isDefault: shouldBeDefault,
                })
                .run(),
            catch: (error) => DatabaseError.new("Failed to create bank account", error),
          })

          const lastId = yield* Effect.try({
            try: () => database.sqlite.query("SELECT last_insert_rowid() as id").get() as { id: number },
            catch: (error) => DatabaseError.new("Failed to get last insert ID", error),
          })

          const account = yield* Effect.try({
            try: () => database.db.select().from(bankAccounts).where(eq(bankAccounts.id, lastId.id)).get(),
            catch: (error) => DatabaseError.new("Failed to retrieve created bank account", error),
          })

          if (!account) {
            return yield* DatabaseError.new("Failed to retrieve created bank account")
          }

          return account as BankAccount
        }),

      update: (id: number, input: CreateBankAccountInput) =>
        Effect.gen(function* () {
          if (input.isDefault) {
            yield* clearDefaults()
          }

          yield* Effect.try({
            try: () =>
              database.db
                .update(bankAccounts)
                .set({
                  label: input.label,
                  currency: input.currency,
                  accountHolderName: input.accountHolderName,
                  bankName: input.bankName,
                  accountNumber: input.accountNumber ?? null,
                  branchCode: input.branchCode ?? null,
                  iban: input.iban ?? null,
                  swiftBic: input.swiftBic ?? null,
                  bankAddress: input.bankAddress ?? null,
                  ...(input.isDefault === undefined ? {} : { isDefault: input.isDefault }),
                })
                .where(eq(bankAccounts.id, id))
                .run(),
            catch: (error) => DatabaseError.new("Failed to update bank account", error),
          })

          const account = yield* Effect.try({
            try: () => database.db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).get(),
            catch: (error) => DatabaseError.new("Failed to retrieve updated bank account", error),
          })

          if (!account) {
            return yield* DatabaseError.new("Bank account not found after update")
          }

          return account as BankAccount
        }),

      delete: (id: number) =>
        Effect.gen(function* () {
          const account = yield* Effect.try({
            try: () => database.db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).get(),
            catch: (error) => DatabaseError.new("Failed to get bank account", error),
          })

          if (!account) {
            return yield* DatabaseError.new("Bank account not found")
          }

          const typed = account as BankAccount
          if (typed.isDefault) {
            return yield* DatabaseError.new("Cannot delete the default bank account")
          }

          yield* Effect.try({
            try: () => {
              database.db.delete(bankAccounts).where(eq(bankAccounts.id, id)).run()
            },
            catch: (error) => DatabaseError.new("Failed to delete bank account", error),
          })
        }),

      setDefault: (id: number) =>
        Effect.gen(function* () {
          yield* clearDefaults()

          yield* Effect.try({
            try: () =>
              database.db
                .update(bankAccounts)
                .set({ isDefault: true })
                .where(eq(bankAccounts.id, id))
                .run(),
            catch: (error) => DatabaseError.new("Failed to set default bank account", error),
          })

          const account = yield* Effect.try({
            try: () => database.db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).get(),
            catch: (error) => DatabaseError.new("Failed to retrieve bank account", error),
          })

          if (!account) {
            return yield* DatabaseError.new("Bank account not found")
          }

          return account as BankAccount
        }),
    })
  })
)
