import { Scene } from "foldkit"
import { evo } from "foldkit/struct"
import { test } from "vitest"
import { ApplicationDataState, InvoiceDataState } from "./model.ts"
import { EditInvoiceRoute, NewCustomerRoute, NotFoundRoute } from "./route.ts"
import { modelFixture } from "./test-fixtures.ts"
import { update, view } from "./main.ts"

test("dashboard exposes navigation and business summary", () => {
  Scene.scene(
    { update, view },
    Scene.with(modelFixture()),
    Scene.expect(Scene.role("heading", { name: "Dashboard" })).toExist(),
    Scene.expect(Scene.role("navigation", { name: "Main navigation" })).toExist(),
    Scene.expect(Scene.text("437,50", { exact: false })).toExist(),
    Scene.expect(Scene.role("link", { name: "New invoice" })).toExist(),
  )
})

test("customer form updates through Messages", () => {
  Scene.scene(
    { update, view },
    Scene.with(modelFixture(NewCustomerRoute())),
    Scene.type(Scene.label("Name"), "Acme"),
    Scene.expect(Scene.label("Name")).toHaveValue("Acme"),
    Scene.expect(Scene.role("button", { name: "Save customer" })).toExist(),
  )
})

test("unknown routes remain visible when application data fails", () => {
  Scene.scene(
    { update, view },
    Scene.with(evo(modelFixture(NotFoundRoute({ path: "/missing" })), {
      data: () => ApplicationDataState.Failure({ error: "API unavailable" }),
    })),
    Scene.expect(Scene.role("heading", { name: "Page not found" })).toExist(),
    Scene.expect(Scene.text("No route matches /missing")).toExist(),
  )
})

test("invoice edit load failures replace the form", () => {
  Scene.scene(
    { update, view },
    Scene.with(evo(modelFixture(EditInvoiceRoute({ id: 2 })), {
      selectedInvoice: () => InvoiceDataState.Failure({ error: "Invoice unavailable" }),
    })),
    Scene.expect(Scene.role("heading", { name: "Could not load invoice" })).toExist(),
    Scene.expect(Scene.role("button", { name: "Try again" })).toExist(),
  )
})

test("submitting buttons use native disabled state", () => {
  Scene.scene(
    { update, view },
    Scene.with(evo(modelFixture(NewCustomerRoute()), { submission: () => "Submitting" })),
    Scene.expect(Scene.role("button", { name: "Saving…" })).toBeDisabled(),
  )
})
