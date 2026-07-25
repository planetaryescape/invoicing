import { Story } from "foldkit"
import { evo } from "foldkit/struct"
import { expect, test } from "vitest"
import { RunMutation } from "./command.ts"
import { InvoiceDataState } from "./model.ts"
import { ClickedAddLineItem, FailedLoadInvoice, FailedMutation, SubmittedCustomerForm, SucceededLoadData, UpdatedCustomerForm } from "./message.ts"
import { EditCustomerRoute, InvoiceRoute, NewCustomerRoute, NewInvoiceRoute } from "./route.ts"
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
