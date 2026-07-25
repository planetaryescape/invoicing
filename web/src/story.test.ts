import { Option } from "effect"
import { Story } from "foldkit"
import { evo } from "foldkit/struct"
import { expect, test } from "vitest"
import { LoadInvoice, RunMutation } from "./command.ts"
import { InvoiceDataState } from "./model.ts"
import { ClickedAddLineItem, FailedLoadInvoice, FailedMutation, SubmittedBusinessInfoForm, SubmittedCustomerForm, SubmittedInvoiceForm, SucceededLoadData, UpdatedCustomerForm } from "./message.ts"
import { BusinessInfoRoute, EditCustomerRoute, EditInvoiceRoute, InvoiceRoute, NewCustomerRoute, NewInvoiceRoute } from "./route.ts"
import { applicationData, modelFixture } from "./test-fixtures.ts"
import { update } from "./main.ts"

test("submitting a valid customer produces an RPC mutation Command", () => {
  Story.story(
    update,
    Story.with(modelFixture(NewCustomerRoute())),
    Story.message(UpdatedCustomerForm({ field: "name", value: "Acme" })),
    Story.message(SubmittedCustomerForm()),
    Story.model((model) => {
      expect(model.submission).toBe("Submitting")
    }),
    Story.Command.expectHas(RunMutation),
    Story.Command.resolve(RunMutation, FailedMutation({ error: "Test failure" })),
  )
})

test("adding an invoice line preserves stable row keys", () => {
  Story.story(
    update,
    Story.with(modelFixture(NewInvoiceRoute())),
    Story.message(ClickedAddLineItem()),
    Story.model((model) => {
      expect(model.invoiceForm.lineItems).toHaveLength(2)
      expect(model.invoiceForm.lineItems.map((item) => item.key)).toEqual([0, 1])
    }),
  )
})

test("loading a missing customer clears the previous edit form", () => {
  Story.story(
    update,
    Story.with(evo(modelFixture(EditCustomerRoute({ id: 999 })), {
      customerForm: (form) => evo(form, { name: () => "Previous customer" }),
    })),
    Story.message(SucceededLoadData({ data: applicationData })),
    Story.model((model) => {
      expect(model.customerForm.name).toBe("")
    }),
  )
})

test("ignores invoice failures from an obsolete route", () => {
  Story.story(
    update,
    Story.with(evo(modelFixture(InvoiceRoute({ id: 2 })), {
      selectedInvoice: () => InvoiceDataState.Loading(),
    })),
    Story.message(FailedLoadInvoice({ id: 1, error: "Stale failure" })),
    Story.model((model) => {
      expect(model.selectedInvoice._tag).toBe("Loading")
    }),
    Story.message(FailedLoadInvoice({ id: 2, error: "Current failure" })),
    Story.model((model) => {
      expect(model.selectedInvoice).toEqual(InvoiceDataState.Failure({ error: "Current failure" }))
    }),
  )
})

test("entering an invoice edit route clears stale form data while loading", () => {
  Story.story(
    update,
    Story.with(evo(modelFixture(EditInvoiceRoute({ id: 2 })), {
      invoiceForm: (form) => evo(form, { customerId: () => "previous-customer" }),
    })),
    Story.message(SucceededLoadData({ data: applicationData })),
    Story.model((model) => {
      expect(model.invoiceForm.customerId).toBe("")
      expect(model.selectedInvoice).toEqual(InvoiceDataState.Loading())
    }),
    Story.Command.expectHas(LoadInvoice),
    Story.Command.resolve(LoadInvoice, FailedLoadInvoice({ id: 2, error: "Test failure" })),
  )
})

test("rejects non-positive invoice quantities before creating a Command", () => {
  Story.story(
    update,
    Story.with(evo(modelFixture(NewInvoiceRoute()), {
      invoiceForm: (form) => evo(form, {
        customerId: () => "1",
        dueDate: () => "2026-08-01",
        lineItems: (items) => items.map((item) => ({ ...item, description: "Consulting", quantity: "-1", unitPrice: "50" })),
      }),
    })),
    Story.message(SubmittedInvoiceForm()),
    Story.Command.expectNone(),
    Story.model((model) => {
      expect(Option.getOrThrow(model.error)).toBe("Complete the invoice with valid positive quantities and prices")
    }),
  )
})

test("requires a unit price for custom invoice lines", () => {
  Story.story(
    update,
    Story.with(evo(modelFixture(NewInvoiceRoute()), {
      invoiceForm: (form) => evo(form, {
        customerId: () => "1",
        dueDate: () => "2026-08-01",
        lineItems: (items) => items.map((item) => ({ ...item, description: "Consulting", unitPrice: "" })),
      }),
    })),
    Story.message(SubmittedInvoiceForm()),
    Story.Command.expectNone(),
  )
})

test("saving business information leaves the existing logo unchanged", () => {
  const model = evo(modelFixture(BusinessInfoRoute()), {
    businessInfoForm: (form) => evo(form, { companyName: () => "Invoicing Ltd" }),
  })
  const [, commands] = update(model, SubmittedBusinessInfoForm())

  expect(commands).toHaveLength(1)
  expect(JSON.stringify(commands)).not.toContain("logoPath")
})
