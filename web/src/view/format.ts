export const formatCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(amount)

export const formatAmount = (amount: number): string =>
  new Intl.NumberFormat("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
