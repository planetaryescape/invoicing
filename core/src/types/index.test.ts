import { describe, test, expect } from "bun:test"
import { routingCodeLabel } from "./index.ts"

describe("routingCodeLabel", () => {
  test("GBP accounts use Sort Code", () => {
    expect(routingCodeLabel("GBP")).toBe("Sort Code")
  })

  test("USD accounts use Routing Number", () => {
    expect(routingCodeLabel("USD")).toBe("Routing Number")
  })

  test("ZAR and other accounts default to Branch Code", () => {
    expect(routingCodeLabel("ZAR")).toBe("Branch Code")
    expect(routingCodeLabel("EUR")).toBe("Branch Code")
  })
})
