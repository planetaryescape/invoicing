import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Layer } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { DatabaseLive } from "@invoicing/core"
import { makeAppRoutes } from "./routes.ts"

const port = Number.parseInt(Bun.env.PORT ?? "3333")

const ServerLive = HttpRouter.serve(makeAppRoutes(DatabaseLive)).pipe(
  Layer.provide(BunHttpServer.layer({ port })),
)

BunRuntime.runMain(Layer.launch(ServerLive))
