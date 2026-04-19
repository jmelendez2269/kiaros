declare module 'astronomia' {
  export const julian: {
    CalendarGregorianToJD(year: number, month: number, day: number): number
  }
  export const sidereal: {
    mean(jd: number): number
    apparent(jd: number): number
    mean0UT(jd: number): number
    apparent0UT(jd: number): number
  }
  export const solar: {
    apparentLongitude(T: number, earth: unknown): number
  }
  export const moonposition: {
    position(jde: number): { lon: number; lat: number; range: number }
  }
  export const moonphase: {
    meanLunarMonth: number
    newMoon(year: number): number
    new(year: number): number
    first(year: number): number
    full(year: number): number
    last(year: number): number
    meanNew(year: number): number
    meanFirst(year: number): number
    meanFull(year: number): number
    meanLast(year: number): number
  }
  export const nutation: {
    nutation(jde: number): [number, number]
    meanObliquity(jde: number): number
  }
  export const elliptic: {
    position(planet: unknown, earth: unknown, jde: number): { ra: number; dec: number }
  }
  export const planetposition: {
    Planet: new (data: unknown) => {
      position(T: number): { lon: number; lat: number; range: number }
    }
  }
  export const coord: {
    Equatorial: new (ra: number, dec: number) => {
      toEcliptic(eps: number): { lon: number; lat: number }
    }
    Ecliptic: new (lon: number, lat: number) => {
      toEquatorial(eps: number): { ra: number; dec: number }
    }
  }
}

declare module 'astronomia/data/vsop87Bearth' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bmercury' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bvenus' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bmars' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bjupiter' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bsaturn' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Buranus' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bneptune' {
  const data: unknown
  export default data
}
