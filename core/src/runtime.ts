import { Layer, ManagedRuntime } from "effect"
import { BunFileSystem, BunPath } from "@effect/platform-bun"
import { DatabaseLive } from "./services/Database.ts"
import { CustomerServiceLive } from "./services/CustomerService.ts"
import { ProductServiceLive } from "./services/ProductService.ts"
import { InvoiceServiceLive } from "./services/InvoiceService.ts"
import { BusinessInfoServiceLive } from "./services/BusinessInfoService.ts"
import { BankAccountServiceLive } from "./services/BankAccountService.ts"
import { PDFServiceLive } from "./services/PDFService.ts"
import { InvoicePDFServiceLive } from "./services/InvoicePDFService.ts"

export const AppLayer = InvoicePDFServiceLive.pipe(
  Layer.provideMerge(
    InvoiceServiceLive.pipe(
      Layer.provideMerge(ProductServiceLive),
      Layer.provideMerge(CustomerServiceLive),
      Layer.provideMerge(BusinessInfoServiceLive),
      Layer.provideMerge(BankAccountServiceLive)
    )
  ),
  Layer.provideMerge(PDFServiceLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
)

export const AppRuntime = ManagedRuntime.make(AppLayer)
