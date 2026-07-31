import assert from 'node:assert/strict'
import {
  buildHumanDesignTransitWeather,
  HUMAN_DESIGN_CHANNELS,
  selectHumanDesignWeatherFocus,
  TRANSIT_PLANET_META,
  type LiveHumanDesignGate,
  type NatalDesignForTransits,
  type TransitPlanet,
} from '../lib/human-design-transit-model.ts'

function activation(
  planet: TransitPlanet,
  gate: number,
  options: Partial<LiveHumanDesignGate> = {},
): LiveHumanDesignGate {
  const meta = TRANSIT_PLANET_META[planet]
  return {
    planet,
    planetLabel: meta.label,
    planetGlyph: meta.glyph,
    gate,
    line: 3,
    longitude: 120,
    zodiacSign: 'Leo',
    degreeInSign: 0,
    theme: 'Leadership',
    shadow: 'Arrogance',
    boundarySensitive: false,
    ...options,
  }
}

function natal(
  activatedGates: number[],
  options: Partial<NatalDesignForTransits> = {},
): NatalDesignForTransits {
  return {
    hasKnownBirthTime: true,
    type: 'Projector',
    authority: 'Emotional',
    activatedGates,
    definedCenters: [],
    ...options,
  }
}

assert.equal(HUMAN_DESIGN_CHANNELS.length, 36, 'the canonical channel table should contain 36 channels')
assert.equal(
  new Set(HUMAN_DESIGN_CHANNELS.map((channel) => channel.gates.join('-'))).size,
  36,
  'channel gate pairs should be unique',
)

const channelFocus = selectHumanDesignWeatherFocus(
  [activation('sun', 31), activation('moon', 56)],
  natal([7]),
)
assert.equal(channelFocus.kind, 'channel-completion')
assert.equal(channelFocus.natalGate, 7)
assert.deepEqual(channelFocus.channel?.gates, [7, 31])
assert.equal(channelFocus.channel?.name, 'Alpha')

const resonanceFocus = selectHumanDesignWeatherFocus(
  [activation('sun', 31), activation('moon', 56)],
  natal([31]),
)
assert.equal(resonanceFocus.kind, 'natal-resonance')
assert.equal(resonanceFocus.activation.gate, 31)

const collectiveFocus = selectHumanDesignWeatherFocus(
  [activation('sun', 31), activation('saturn', 51)],
  natal([25], { hasKnownBirthTime: false }),
)
assert.equal(collectiveFocus.kind, 'collective-weather')
assert.equal(collectiveFocus.activation.planet, 'sun')

const rankedFocus = selectHumanDesignWeatherFocus(
  [
    activation('sun', 31, { boundarySensitive: true }),
    activation('saturn', 51),
  ],
  natal([7, 25]),
)
assert.equal(rankedFocus.kind, 'channel-completion')
assert.equal(rankedFocus.activation.planet, 'saturn')
assert.equal(rankedFocus.channel?.name, 'Initiation')

// buildHumanDesignTransitWeather: today card, fast planet, channel-completion
const weather = buildHumanDesignTransitWeather({
  generatedAt: new Date('2026-07-29T16:00:00.000Z'),
  activations: [activation('sun', 31)],
  natal: natal([7]),
})
assert.equal(weather.personalization, 'personalized')
assert.equal(weather.today.headline, 'Leadership may feel more available right now')
assert.match(weather.today.detail, /completing a channel with your natal design/)
assert.match(weather.today.detail, /toward leadership right now/)
assert.match(weather.today.technicalDetail, /Gate 31\.3/)
assert.match(weather.today.technicalDetail, /Channel 7–31, Alpha/)
assert.match(weather.today.technicalDetail, /Throat/)
assert.match(weather.guidance, /emotional wave settle/)
assert.equal(weather.holding, null, 'no slow-planet activations were supplied, so there is nothing to hold')

// today (fast) and holding (slow) split into separate, non-duplicate cards
const splitWeather = buildHumanDesignTransitWeather({
  generatedAt: new Date('2026-07-29T16:00:00.000Z'),
  activations: [
    activation('sun', 31), // fast, completes natal Gate 7 -> Alpha channel
    activation('saturn', 51, { theme: 'Initiation', shadow: 'Agitation' }), // slow, completes natal Gate 25 -> Initiation
  ],
  natal: natal([7, 25]),
})
assert.equal(splitWeather.today.focus.activation.planet, 'sun')
assert.equal(splitWeather.today.focus.kind, 'channel-completion')
assert.ok(splitWeather.holding, 'a personal slow-planet connection should produce a holding card')
assert.equal(splitWeather.holding?.focus.activation.planet, 'saturn')
assert.equal(splitWeather.holding?.focus.kind, 'channel-completion')
assert.match(splitWeather.holding?.headline ?? '', /building in the background/)
assert.match(splitWeather.holding?.detail ?? '', /this stretch/)

// slow planet with no personal connection collapses to collective weather,
// which should not be promoted to its own holding card
const noHoldingWeather = buildHumanDesignTransitWeather({
  generatedAt: new Date('2026-07-29T16:00:00.000Z'),
  activations: [activation('sun', 31), activation('saturn', 51)],
  natal: natal([99]), // no natal gate completes either transit
})
assert.equal(noHoldingWeather.holding, null)

console.log('Human Design transit model checks passed.')
