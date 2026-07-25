import { Button, Input, Select, Textarea } from "@foldkit/ui"
import { html, type Html } from "foldkit/html"
import type { Message } from "../message.ts"

export const textField = (
  id: string,
  label: string,
  value: string,
  onInput: (value: string) => Message,
  options: { type?: string; placeholder?: string; required?: boolean; min?: string; max?: string; step?: string } = {},
): Html => {
  const h = html<Message>()
  return Input.view<Message>({
    id,
    value,
    onInput,
    ...(options.placeholder === undefined ? {} : { placeholder: options.placeholder }),
    toView: (attributes) => h.div([h.Class("field")], [
      h.label([...attributes.label, h.Class("field-label")], [label]),
      h.input([
        ...attributes.input,
        h.Type(options.type ?? "text"),
        h.Class("field-input"),
        ...(options.required === true ? [h.AriaRequired(true), h.Required(true)] : []),
        ...(options.min === undefined ? [] : [h.Min(options.min)]),
        ...(options.max === undefined ? [] : [h.Max(options.max)]),
        ...(options.step === undefined ? [] : [h.Step(options.step)]),
      ]),
      h.span([...attributes.description, h.Class("visually-hidden")], [options.required === true ? `${label} is required.` : `${label} is optional.`]),
    ]),
  })
}

export const textAreaField = (
  id: string,
  label: string,
  value: string,
  onInput: (value: string) => Message,
): Html => {
  const h = html<Message>()
  return Textarea.view<Message>({
    id,
    value,
    onInput,
    toView: (attributes) => h.div([h.Class("field field-wide")], [
      h.label([...attributes.label, h.Class("field-label")], [label]),
      h.textarea([...attributes.textarea, h.Class("field-input field-textarea")], []),
      h.span([...attributes.description, h.Class("visually-hidden")], [`${label} is optional.`]),
    ]),
  })
}

export const selectField = (
  id: string,
  label: string,
  value: string,
  options: ReadonlyArray<readonly [string, string]>,
  onChange: (value: string) => Message,
): Html => {
  const h = html<Message>()
  return Select.view<Message>({
    id,
    value,
    onChange,
    toView: (attributes) => h.div([h.Class("field")], [
      h.label([...attributes.label, h.Class("field-label")], [label]),
      h.select(
        [...attributes.select, h.Class("field-input")],
        options.map(([optionValue, optionLabel]) => h.option([h.Value(optionValue)], [optionLabel])),
      ),
      h.span([...attributes.description, h.Class("visually-hidden")], [`Choose ${label.toLowerCase()} from the available options.`]),
    ]),
  })
}

export const actionButton = (
  label: string,
  message: Message,
  options: { kind?: "primary" | "quiet" | "danger"; type?: "button" | "submit"; disabled?: boolean } = {},
): Html => {
  const h = html<Message>()
  return options.type === "submit" ? Button.view<Message>({
    type: "submit",
    isDisabled: options.disabled ?? false,
    toView: (attributes) => h.button(
      [...attributes.button, h.Class(`button button-${options.kind ?? "quiet"}`), h.Disabled(options.disabled ?? false)],
      [label],
    ),
  }) : Button.view<Message>({
    type: "button",
    isDisabled: options.disabled ?? false,
    onClick: message,
    toView: (attributes) => h.button(
      [...attributes.button, h.Class(`button button-${options.kind ?? "quiet"}`), h.Disabled(options.disabled ?? false)],
      [label],
    ),
  })
}
