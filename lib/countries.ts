import countries from "world-countries";

export type CountryOption = {
  code: string;
  name: string;
  flag: string;
};

const PLACEHOLDER = "Select country...";

/** ISO 3166-1 alpha-2 → flag emoji (e.g. US → 🇺🇸). */
export function countryFlagEmoji(iso2: string): string {
  const code = iso2.trim().toUpperCase();
  if (code.length !== 2) return "";
  return code
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

let cached: CountryOption[] | null = null;

/** All countries with common English name and flag emoji (offline, via world-countries). */
export function getCountryOptions(): CountryOption[] {
  if (cached) return cached;

  cached = countries
    .filter((c) => c.cca2 && c.name?.common)
    .map((c) => ({
      code: c.cca2,
      name: c.name.common,
      flag: countryFlagEmoji(c.cca2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  return cached;
}

export function getCountryPlaceholder(): string {
  return PLACEHOLDER;
}

export function isUnsetCountrySelection(raw: string | null | undefined): boolean {
  if (raw == null || !String(raw).trim()) return true;
  return String(raw).trim() === PLACEHOLDER;
}

export function isKnownCountryName(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  return getCountryOptions().some((c) => c.name === n);
}

export function formatCountryLabel(c: CountryOption): string {
  return `${c.flag} ${c.name}`;
}

/** Default ISO 4217 currency for a selected country name (e.g. Pakistan → PKR). */
export function getDefaultCurrencyForCountry(
  countryName: string
): string | null {
  const n = countryName.trim();
  if (!n || n === PLACEHOLDER) return null;

  const match = countries.find((c) => c.name?.common === n);
  if (!match?.currencies) return null;

  const [code] = Object.keys(match.currencies);
  return code?.trim().toUpperCase() ?? null;
}
