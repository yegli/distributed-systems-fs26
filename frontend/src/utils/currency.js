// Static exchange rates — 1 unit of currency X = N USD (approx. Feb 2026)
const RATES_TO_USD = {
  USD: 1.0,
  EUR: 1.04,
  GBP: 1.25,
  CHF: 1.12,
  JPY: 0.0065,
  THB: 0.029,
  AUD: 0.63,
  CAD: 0.71,
  NOK: 0.089,
  ISK: 0.0071,
}

export const HOME_CURRENCIES = ['CHF', 'USD', 'EUR']

/**
 * Convert amount from one currency to another using static rates.
 * Falls back to 1:1 with USD for unknown currency codes.
 */
export function convert(amount, from, to) {
  const f = (from || '').trim()
  const t = (to || '').trim()
  if (!f || !t || f === t) return +amount
  const fromRate = RATES_TO_USD[f] ?? 1
  const toRate   = RATES_TO_USD[t] ?? 1
  return (+amount * fromRate) / toRate
}

/** Format a number as a localized currency string. */
export function fmtCurrency(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'USD').trim(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getStoredHomeCurrency() {
  const v = localStorage.getItem('homeCurrency')
  return HOME_CURRENCIES.includes(v) ? v : 'CHF'
}

export function setStoredHomeCurrency(v) {
  localStorage.setItem('homeCurrency', v)
}
