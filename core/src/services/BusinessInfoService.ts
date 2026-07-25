import { Context, Effect, Layer } from "effect"
import { eq } from "drizzle-orm"
import { Database, DatabaseError } from "./Database.ts"
import { businessInfo } from "../db/drizzle-schema.ts"
import type { BusinessInfo, CreateBusinessInfoInput } from "../types/index.ts"

export class BusinessInfoService extends Context.Service<
  BusinessInfoService,
  {
    readonly get: () => Effect.Effect<BusinessInfo | undefined, DatabaseError>
    readonly createOrUpdate: (input: CreateBusinessInfoInput) => Effect.Effect<BusinessInfo, DatabaseError>
    readonly update: (input: Partial<CreateBusinessInfoInput>) => Effect.Effect<BusinessInfo, DatabaseError>
  }
>()("BusinessInfoService") {}

export const BusinessInfoServiceLive = Layer.effect(
  BusinessInfoService,
  Effect.gen(function* () {
    const database = yield* Database

    const get = () =>
      Effect.try({
        try: () => database.db.select().from(businessInfo).where(eq(businessInfo.id, 1)).get(),
        catch: (error) => DatabaseError.new("Failed to get business info", error),
      }).pipe(Effect.map((result) => result as BusinessInfo | undefined))

    const update = (input: Partial<CreateBusinessInfoInput>) =>
      Effect.gen(function* () {
        const existing = yield* Effect.try({
          try: () => database.db.select().from(businessInfo).where(eq(businessInfo.id, 1)).get(),
          catch: (error) => DatabaseError.new("Failed to check existing business info", error),
        })

        if (!existing) {
          return yield* DatabaseError.new("Business info not found")
        }

        yield* Effect.try({
          try: () =>
            database.db
              .update(businessInfo)
              .set({
                ...(input.companyName ? { companyName: input.companyName } : {}),
                ...(input.streetAddress ? { streetAddress: input.streetAddress } : {}),
                ...(input.city ? { city: input.city } : {}),
                ...(input.postalCode ? { postalCode: input.postalCode } : {}),
                ...(input.country ? { country: input.country } : {}),
                ...(input.vatNumber ? { vatNumber: input.vatNumber } : {}),
                ...(input.email ? { email: input.email } : {}),
                ...(input.phone ? { phone: input.phone } : {}),
                ...(input.logoPath !== undefined ? { logoPath: input.logoPath } : {}),
                ...(input.accountHolderName ? { accountHolderName: input.accountHolderName } : {}),
                ...(input.bankName ? { bankName: input.bankName } : {}),
                ...(input.accountNumber ? { accountNumber: input.accountNumber } : {}),
                ...(input.branchCode ? { branchCode: input.branchCode } : {}),
                ...(input.defaultVatRate !== undefined ? { defaultVatRate: input.defaultVatRate } : {}),
              })
              .where(eq(businessInfo.id, 1))
              .run(),
          catch: (error) => DatabaseError.new("Failed to update business info", error),
        })

        const result = yield* Effect.try({
          try: () => database.db.select().from(businessInfo).where(eq(businessInfo.id, 1)).get(),
          catch: (error) => DatabaseError.new("Failed to retrieve business info", error),
        })

        if (!result) {
          return yield* DatabaseError.new("Failed to retrieve business info")
        }

        return result as BusinessInfo
      })

    const createOrUpdate = (input: CreateBusinessInfoInput) =>
      Effect.gen(function* () {
        const existing = yield* Effect.try({
          try: () => database.db.select().from(businessInfo).where(eq(businessInfo.id, 1)).get(),
          catch: (error) => DatabaseError.new("Failed to check existing business info", error),
        })

        if (existing) {
          return yield* update(input)
        }

        yield* Effect.try({
          try: () =>
            database.db
              .insert(businessInfo)
              .values({
                id: 1,
                companyName: input.companyName,
                streetAddress: input.streetAddress,
                city: input.city,
                postalCode: input.postalCode,
                country: input.country,
                vatNumber: input.vatNumber,
                email: input.email,
                phone: input.phone,
                logoPath: input.logoPath ?? null,
                accountHolderName: input.accountHolderName,
                bankName: input.bankName,
                accountNumber: input.accountNumber,
                branchCode: input.branchCode,
                defaultVatRate: input.defaultVatRate ?? null,
              })
              .run(),
          catch: (error) => DatabaseError.new("Failed to create business info", error),
        })

        const result = yield* Effect.try({
          try: () => database.db.select().from(businessInfo).where(eq(businessInfo.id, 1)).get(),
          catch: (error) => DatabaseError.new("Failed to retrieve business info", error),
        })

        if (!result) {
          return yield* DatabaseError.new("Failed to retrieve business info")
        }

        return result as BusinessInfo
      })

    return BusinessInfoService.of({
      get,
      createOrUpdate,
      update,
    })
  })
)
