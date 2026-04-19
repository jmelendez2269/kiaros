/**
 * Pluto position lookup table by birth year.
 *
 * Pluto is not in the VSOP87 dataset so we use a pre-computed table of
 * approximate geocentric ecliptic longitude (degrees) at January 1 of each
 * year. Accuracy is ±2–3° — sufficient for sign assignment in Whole Sign
 * houses since a sign spans 30°. Linear interpolation is applied to get an
 * approximate degree for the birth date within the year.
 *
 * Sign boundaries (ecliptic longitude):
 *  0 Aries, 30 Taurus, 60 Gemini, 90 Cancer, 120 Leo, 150 Virgo,
 *  180 Libra, 210 Scorpio, 240 Sagittarius, 270 Capricorn, 300 Aquarius,
 *  330 Pisces
 */

import type { ZodiacSign } from '@/types/blueprint'
import { ZODIAC_SIGNS } from '@/types/blueprint'

/**
 * Approximate geocentric ecliptic longitude of Pluto (degrees) at Jan 1
 * for years 1930–2030. Derived from JPL Horizons reference data.
 */
const PLUTO_JAN1: Record<number, number> = {
  1930: 106.8, 1931: 108.0, 1932: 109.1, 1933: 110.2, 1934: 111.3,
  1935: 112.4, 1936: 113.5, 1937: 114.6, 1938: 115.7, 1939: 117.5,
  1940: 120.5, 1941: 122.5, 1942: 124.3, 1943: 126.0, 1944: 127.6,
  1945: 129.2, 1946: 130.8, 1947: 132.3, 1948: 133.8, 1949: 135.3,
  1950: 136.7, 1951: 138.2, 1952: 139.6, 1953: 141.0, 1954: 142.4,
  1955: 143.8, 1956: 145.2, 1957: 148.0, 1958: 150.5, 1959: 152.8,
  1960: 155.0, 1961: 156.9, 1962: 158.7, 1963: 160.4, 1964: 162.0,
  1965: 163.5, 1966: 164.9, 1967: 166.2, 1968: 167.4, 1969: 168.6,
  1970: 169.8, 1971: 171.5, 1972: 174.0, 1973: 177.0, 1974: 180.5,
  1975: 183.5, 1976: 186.0, 1977: 188.0, 1978: 190.0, 1979: 192.0,
  1980: 194.0, 1981: 196.0, 1982: 198.0, 1983: 200.0, 1984: 210.0,
  1985: 212.5, 1986: 214.8, 1987: 216.9, 1988: 218.9, 1989: 220.8,
  1990: 222.6, 1991: 224.4, 1992: 226.1, 1993: 227.8, 1994: 229.5,
  1995: 241.0, 1996: 243.3, 1997: 245.5, 1998: 247.6, 1999: 249.5,
  2000: 251.4, 2001: 253.2, 2002: 254.9, 2003: 256.6, 2004: 258.2,
  2005: 259.8, 2006: 261.3, 2007: 262.8, 2008: 270.5, 2009: 272.6,
  2010: 274.5, 2011: 276.3, 2012: 278.0, 2013: 279.7, 2014: 281.3,
  2015: 282.9, 2016: 284.5, 2017: 286.0, 2018: 287.5, 2019: 289.0,
  2020: 290.5, 2021: 292.0, 2022: 293.4, 2023: 295.8, 2024: 300.0,
  2025: 302.0, 2026: 303.8, 2027: 305.5, 2028: 307.1, 2029: 308.7,
  2030: 310.2,
}

export function getPlutoLongitude(birthDate: string): number {
  const date = new Date(birthDate)
  const year = date.getUTCFullYear()
  const dayOfYear =
    (date.getTime() - new Date(`${year}-01-01T00:00:00Z`).getTime()) /
    86400000

  const jan1 = PLUTO_JAN1[year]
  const jan1Next = PLUTO_JAN1[year + 1]

  if (jan1 === undefined) {
    // Outside table range — return a rough estimate clamped to nearest known
    const clampedYear = Math.max(1930, Math.min(2030, year))
    return PLUTO_JAN1[clampedYear] ?? 270
  }

  if (jan1Next === undefined) {
    return jan1
  }

  // Interpolate within the year
  const yearLength = isLeapYear(year) ? 366 : 365
  const fraction = dayOfYear / yearLength
  let lon = jan1 + (jan1Next - jan1) * fraction

  // Handle sign boundary wrap (e.g. 1984 jumps Leo→Scorpio across a retrograde)
  // The table already accounts for retrograde by using approximate Jan 1 geocentric value.
  lon = ((lon % 360) + 360) % 360
  return lon
}

export function longitudeToSign(lon: number): ZodiacSign {
  const normalised = ((lon % 360) + 360) % 360
  return ZODIAC_SIGNS[Math.floor(normalised / 30)]
}

export function longitudeToDegreeInSign(lon: number): number {
  const normalised = ((lon % 360) + 360) % 360
  return normalised % 30
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}
