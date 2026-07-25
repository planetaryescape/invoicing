import { Scene } from "foldkit"
import { test } from "vitest"
import { NewCustomerRoute } from "./route.ts"
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
