import { code as lookupCurrency, codes } from "currency-codes-ts";
import countries from "world-countries";

export type CurrencyOption = {
  code: string;
  label: string;
  name: string;
  symbol: string;
  flagCountryCode: string | null;
};

export const DEFAULT_CURRENCY = "PKR";

/** Primary flag for currencies used in many countries. */
const FLAG_COUNTRY_PRIORITY: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  PKR: "PK",
  INR: "IN",
  AED: "AE",
  SAR: "SA",
  CHF: "CH",
  JPY: "JP",
  CNY: "CN",
  AUD: "AU",
  CAD: "CA",
  NZD: "NZ",
  SGD: "SG",
  HKD: "HK",
  KRW: "KR",
  BRL: "BR",
  MXN: "MX",
  ZAR: "ZA",
  TRY: "TR",
  RUB: "RU",
  PLN: "PL",
  SEK: "SE",
  NOK: "NO",
  DKK: "DK",
  THB: "TH",
  IDR: "ID",
  MYR: "MY",
  PHP: "PH",
  VND: "VN",
  BDT: "BD",
  NGN: "NG",
  EGP: "EG",
  ILS: "IL",
  QAR: "QA",
  KWD: "KW",
  BHD: "BH",
  OMR: "OM",
  ARS: "AR",
  CLP: "CL",
  COP: "CO",
  PEN: "PE",
  CHE: "CH",
  CHW: "CH",
};

function normalizeCountryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(the\)\s*/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

const COUNTRY_BY_NORMALIZED = new Map<string, string>();
for (const country of countries) {
  if (!country.cca2 || !country.name?.common) continue;
  COUNTRY_BY_NORMALIZED.set(
    normalizeCountryName(country.name.common),
    country.cca2
  );
  if (country.name.official) {
    COUNTRY_BY_NORMALIZED.set(
      normalizeCountryName(country.name.official),
      country.cca2
    );
  }
}

function matchCountryNameToCode(countryName: string): string | null {
  const normalized = normalizeCountryName(countryName);
  const direct = COUNTRY_BY_NORMALIZED.get(normalized);
  if (direct) return direct;

  for (const [key, cca2] of COUNTRY_BY_NORMALIZED) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return cca2;
    }
  }
  return null;
}

export function resolveCurrencyFlagCountryCode(
  currencyCode: string
): string | null {
  const code = currencyCode.trim().toUpperCase();
  if (!code) return null;

  const priority = FLAG_COUNTRY_PRIORITY[code];
  if (priority) return priority;

  const record = lookupCurrency(code);
  if (record?.countries?.length) {
    for (const countryName of record.countries) {
      const matched = matchCountryNameToCode(countryName);
      if (matched) return matched;
    }
  }

  for (const country of countries) {
    if (country.cca2 && country.currencies && code in country.currencies) {
      return country.cca2;
    }
  }

  return null;
}

function buildCurrencyOptions(): CurrencyOption[] {
  return codes()
    .map((currencyCode) => {
      const record = lookupCurrency(currencyCode);
      const name = record?.currency ?? currencyCode;
      return {
        code: currencyCode,
        name,
        label: `${name} (${currencyCode})`,
        symbol: currencyCode,
        flagCountryCode: resolveCurrencyFlagCountryCode(currencyCode),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const CURRENCY_OPTIONS: CurrencyOption[] = buildCurrencyOptions();

const BY_CODE = new Map(CURRENCY_OPTIONS.map((c) => [c.code, c]));

export function getCurrencyOption(
  raw: string | null | undefined
): CurrencyOption | null {
  const code = raw?.trim().toUpperCase() ?? "";
  if (!code) return null;
  return BY_CODE.get(code) ?? null;
}

export function normalizeCurrency(raw: string | null | undefined): string {
  const code = raw?.trim().toUpperCase() ?? "";
  if (code && lookupCurrency(code)) return code;
  return DEFAULT_CURRENCY;
}

export function isValidCurrency(raw: string | null | undefined): boolean {
  const code = raw?.trim().toUpperCase() ?? "";
  return Boolean(code && lookupCurrency(code));
}

export function currencySymbol(code: string | null | undefined): string {
  const normalized = normalizeCurrency(code);
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalized,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    const symbol = parts.find((p) => p.type === "currency")?.value?.trim();
    return symbol || normalized;
  } catch {
    return normalized;
  }
}

export function formatMoney(
  amount: number,
  currencyCode: string | null | undefined
): string {
  const code = normalizeCurrency(currencyCode);
  const n = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${code} ${n.toLocaleString()}`;
  }
}

export function currencyLabel(code: string | null | undefined): string {
  const c = BY_CODE.get(normalizeCurrency(code));
  return c?.label ?? normalizeCurrency(code);
}
