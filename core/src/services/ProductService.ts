import { Context, Effect, Layer } from "effect"
import { eq, asc } from "drizzle-orm"
import { Database, DatabaseError } from "./Database.ts"
import { products } from "../db/drizzle-schema.ts"
import type { Product, CreateProductInput } from "../types/index.ts"

export class ProductService extends Context.Service<
  ProductService,
  {
    readonly list: () => Effect.Effect<Product[], DatabaseError>
    readonly get: (id: number) => Effect.Effect<Product | undefined, DatabaseError>
    readonly create: (input: CreateProductInput) => Effect.Effect<Product, DatabaseError>
    readonly update: (id: number, input: CreateProductInput) => Effect.Effect<Product, DatabaseError>
    readonly delete: (id: number) => Effect.Effect<void, DatabaseError>
  }
>()("ProductService") {}

export const ProductServiceLive = Layer.effect(
  ProductService,
  Effect.gen(function* () {
    const database = yield* Database

    return ProductService.of({
      list: () =>
        Effect.try({
          try: () => database.db.select().from(products).orderBy(asc(products.name)).all() as Product[],
          catch: (error) => DatabaseError.new("Failed to list products", error),
        }),

      get: (id: number) =>
        Effect.try({
          try: () => {
            const result = database.db.select().from(products).where(eq(products.id, id)).get()
            return result as Product | undefined
          },
          catch: (error) => DatabaseError.new("Failed to get product", error),
        }),

      create: (input: CreateProductInput) =>
        Effect.gen(function* () {
          yield* Effect.try({
            try: () =>
              database.db
                .insert(products)
                .values({
                  name: input.name,
                  description: input.description,
                  defaultPrice: input.defaultPrice,
                })
                .run(),
            catch: (error) => DatabaseError.new("Failed to create product", error),
          })

          const lastId = yield* Effect.try({
            try: () => database.sqlite.query("SELECT last_insert_rowid() as id").get() as { id: number },
            catch: (error) => DatabaseError.new("Failed to get last insert ID", error),
          })

          const product = yield* Effect.try({
            try: () => database.db.select().from(products).where(eq(products.id, lastId.id)).get(),
            catch: (error) => DatabaseError.new("Failed to retrieve created product", error),
          })

          if (!product) {
            return yield* DatabaseError.new("Failed to retrieve created product")
          }

          return product as Product
        }),

      update: (id: number, input: CreateProductInput) =>
        Effect.gen(function* () {
          yield* Effect.try({
            try: () =>
              database.db
                .update(products)
                .set({
                  name: input.name,
                  description: input.description,
                  defaultPrice: input.defaultPrice,
                })
                .where(eq(products.id, id))
                .run(),
            catch: (error) => DatabaseError.new("Failed to update product", error),
          })

          const product = yield* Effect.try({
            try: () => database.db.select().from(products).where(eq(products.id, id)).get(),
            catch: (error) => DatabaseError.new("Failed to retrieve updated product", error),
          })

          if (!product) {
            return yield* DatabaseError.new("Product not found after update")
          }

          return product as Product
        }),

      delete: (id: number) =>
        Effect.try({
          try: () => {
            database.db.delete(products).where(eq(products.id, id)).run()
          },
          catch: (error) => DatabaseError.new("Failed to delete product", error),
        }),
    })
  })
)
