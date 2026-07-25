import { Context, Layer } from "effect"
import { FetchHttpClient } from "effect/unstable/http"
import { RpcClient, RpcClientError, RpcSerialization } from "effect/unstable/rpc"
import { InvoicingRpcs } from "./contracts.ts"

type Client = RpcClient.FromGroup<typeof InvoicingRpcs, RpcClientError.RpcClientError>

export class InvoicingClient extends Context.Service<InvoicingClient, Client>()(
  "@invoicing/shared/InvoicingClient",
) {}

export const makeInvoicingClient = RpcClient.make(InvoicingRpcs)

export const InvoicingClientLive = (url = "/rpc") => {
  const protocol = RpcClient.layerProtocolHttp({ url }).pipe(
    Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]),
  )
  return Layer.effect(InvoicingClient, makeInvoicingClient).pipe(Layer.provide(protocol))
}
