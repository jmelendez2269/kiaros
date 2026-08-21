/**
 * lineage-meanings.ts
 *
 * One meaning per ranked lineage. Twelve pieces.
 *
 * ---------------------------------------------------------------------------
 * THE VOICE. Read this before changing a word below.
 *
 * The first version of this file was written in the voice of the engineering
 * around it - careful, hedged, "consider whether", "look at", "notice how
 * much". That was a mistake and it was caught by reading a real report. It
 * read as though it had been written by someone worried about a refund.
 *
 * The person buying this is not a sceptic. They are usually carrying one
 * specific thing: the sense of not being from here. A homesickness with no
 * address. That feeling is the reason this category exists, and it is what the
 * writing has to meet.
 *
 * So: the rigour lives in the engine and in the workings table. It does not
 * belong in the prose. The maths is why a buyer can trust us; it is not what
 * they came to read. Two rules follow.
 *
 *   1. WRITE WITH CONVICTION. "This is what you carry", not "you might
 *      consider whether you carry". Never hedge a meaning. Hedging a meaning
 *      is not honesty, it is just weak writing - the honest thing is that we
 *      do not claim to predict events, which is a different sentence entirely.
 *
 *   2. LEAD WITH THE HISTORY, AND MAKE IT REAL. Every one of these stars has
 *      thousands of years of human attention on it - Egyptian, Greek, Arabic,
 *      Polynesian, Lakota. That history is true, it is extraordinary, and
 *      almost nobody selling this does the reading. It is the difference
 *      between a report that feels ancient and one that feels generated.
 *
 * What is still forbidden: predicting events, anything touching health, money
 * or death as a forecast, and anything comparative about other methods. None
 * of that costs us a single degree of warmth.
 * ---------------------------------------------------------------------------
 *
 * These reuse the marker voices from body-voices.ts unchanged.
 *
 * Only the twelve RANKED lineages are here. The other 24 catalogue objects are
 * reported as findings; their writing is in star-meanings.ts.
 */

export interface LineageMeaning {
  /** Matches the grouped lineage id used by the scorer. */
  id: string;
  displayName: string;
  /** Names the same lineage goes by elsewhere, so a buyer finds themselves. */
  subStrands: readonly string[];
  /** Short noun phrase, printed under the name. */
  image: string;
  /**
   * One clause on what this family is, for the map of all twelve. It has to
   * stand completely alone - in the map a buyer reads it about a line they
   * have no contact with, so it cannot lean on anything around it.
   */
  essence: string;
  /**
   * What this star is in human memory. Real history and real myth - the part
   * nobody else does the reading for. Three or four sentences, and they should
   * be the best three or four sentences in the report.
   */
  history: string;
  /** What you are. Stated, not suggested. */
  nature: string;
  /** The ache. Why you have always felt the particular way you have felt. */
  longing: string;
  /** What you came here to do. */
  purpose: string;
  /** What it costs. Every real gift has one; naming it is what makes it real. */
  cost: string;
}

export const LINEAGE_MEANINGS: Readonly<Record<string, LineageMeaning>> = {
  pleiades: {
    id: "pleiades",
    displayName: "The Pleiades",
    subStrands: ["Pleiadian", "Alcyonean", "Tolekan"],
    image: "the seven sisters, and the one who is missing",
    essence: "feeling, attunement, the raising of everyone nearby",
    history:
      "Almost every people on earth has named this cluster. The Japanese call it Subaru, the gathered ones. For the Māori its rising is Matariki and begins the new year. The Lakota, the Aztec, the Kiowa, the Greeks and the Aboriginal nations of Australia all told stories about it, and the strangest fact in astronomy is that so many of those stories are the same story: seven sisters, pursued, who fled into the sky — and one of them is missing from the count. Cultures that never met each other lost the same sister. It may be the oldest story humans still tell. And the hunter who chased them is still chasing them: Orion crosses the sky behind the Pleiades every night of the year and has never once caught up.",
    nature:
      "You feel a room before anyone in it has spoken. This is not a skill you developed and it is not something you can put down; it arrived with you, and by the time you were old enough to notice it you had already been using it for years.",
    longing:
      "A homesickness with no address. You have known since you were small that you came from somewhere, and that everyone here had quietly agreed not to talk about it. The ache is not for a place you can find on a map. It is for a way of being together that you remember and have never once encountered.",
    purpose:
      "To raise the temperature of every room you enter. Pleiadian work is almost never grand and it is almost never credited — it is the friend who noticed, the hand on the back, the question asked at the right moment. Whole lives have been turned by it. You will rarely be told which ones.",
    cost:
      "You have carried other people's feelings for so long that you have trouble telling which ones are yours. Feeling the room accurately is not the same as being responsible for it, and nobody taught you the difference early enough.",
  },

  lyra: {
    id: "lyra",
    displayName: "Lyra",
    subStrands: ["Lyran", "Vegan", "Avian", "Feline"],
    image: "the instrument everything else was tuned against",
    essence: "first principles, pitch, the original version of things",
    history:
      "Vega was the pole star twelve thousand years ago and will be the pole star again in twelve thousand more — the whole sky turns on a wheel far longer than any civilisation, and this is the star at both ends of it. The lyre is Orpheus's, the instrument that made stones weep and stopped rivers to listen, and which could not in the end bring back the one thing he wanted. When he died the gods put it in the sky rather than let it be lost. In the starseed material Lyra is the eldest of all the lineages, the source the others are said to have come out of — the first place, before the scattering.",
    nature:
      "You know how things are supposed to sound. Not how they usually sound — how they are supposed to. You have been able to hear the difference since before you had words for it, and it has made you difficult in ways you have had to learn to manage.",
    longing:
      "You remember an original. Somewhere behind everything you encounter is a first version that was whole, and every actual thing is a copy that has lost something on the way. That is why the low, constant grief sits under even the good days. You are not disappointed by the world. You are comparing it to something.",
    purpose:
      "To carry the note. You are here to keep the original sound in circulation — in your work, in how you raise people, in what you refuse to let slide. Every generation needs a few people who will not agree that this is just how things are done.",
    cost:
      "An ear that fine will find something wrong with everything, and it will not spare you. The hardest room you have ever been hard on is your own.",
  },

  orion: {
    id: "orion",
    displayName: "Orion",
    subStrands: [],
    image: "the hunter, and the war he came from",
    essence: "conflict, endurance, and the ending of what others leave broken",
    history:
      "Egypt looked at this constellation and saw Osiris — the god who is murdered, dismembered and returns — and built for him accordingly: the three great pyramids at Giza are laid out in the pattern of Orion's Belt, and a shaft cut through the heart of the Great Pyramid points at where the Belt stood, so that the dead king's soul could go to it. Greece made him a giant hunter, son of the sea, who could walk on water; blinded, he walked east until the rising sun healed his eyes. He was killed by a scorpion, and the two of them were set at opposite ends of the sky so they can never be up at once. Look for Orion on a summer night and he is not there — he goes down as Scorpius rises. He has been running from the thing that killed him for three thousand years. In the starseed material Orion is the site of a long war, and its people came here carrying the memory of it.",
    nature:
      "You are good in a fight, and you did not choose to be. You can hold your nerve in rooms where other people's voices start shaking, you can see what the other side actually wants rather than the version that would be easier to beat, and you have never fully understood why this is rare.",
    longing:
      "A tiredness that predates your life. You have wanted peace since before you had anything to be at war about — and underneath it something worse, which is the suspicion that you would not know what to do with peace if it came. Something in you has been braced for so long that you cannot remember being otherwise.",
    purpose:
      "To end things other people are content to leave broken. Orion souls are given the arguments nobody else will sit in the room for — the family that has not spoken in eleven years, the team that has quietly split, the thing everyone can see and nobody will name. You do not enjoy it. You are simply the one who does not leave.",
    cost:
      "Someone this practised at conflict will find one. Not from appetite — from fluency, which is much harder to see in yourself and much harder to put down. The war ended. Some part of you is still deployed.",
  },

  sirius: {
    id: "sirius",
    displayName: "Sirius",
    subStrands: ["Sirian"],
    image: "the brightest star, and the one that ran the calendar",
    essence: "the record, the warning, the thing guarded",
    history:
      "For seventy days each year Sirius vanishes from the sky. Egypt held its breath through those days — they were the days Osiris lay dead — and then, on one particular dawn, the star cleared the horizon just ahead of the sun, and within days the Nile rose and the country lived for another year. The Egyptian year began on that morning. They called her Sopdet and they knew her as Isis, and they aligned temples so that her light would fall down the length of the sanctuary on that one dawn. No other star has ever been given a job that large. Rome, further north, only noticed that she rose with the worst heat of the year and called that stretch the dog days, and blamed her for it.",
    nature:
      "You are the one who notices first and says so. You have a nose for what is actually happening under what is being said, and you have never been able to sit on it — the words come out of you before you have finished deciding whether to say them.",
    longing:
      "To be believed the first time. You have spent your life a little ahead of the room, telling people what is coming, and being thanked for it afterwards rather than at the time. What you want is not to be right. It is for someone to simply take your word.",
    purpose:
      "To keep the record and give the warning. You are here to be the one who saw it, wrote it down, and said it out loud while there was still time to act — and to guard whatever has been put in your care, which in your life has usually been more than your share.",
    cost:
      "Being the brightest thing in the room is a position, and positions have to be held. You have started to need the light more than you would like to admit, and you know it.",
  },

  arcturus: {
    id: "arcturus",
    displayName: "Arcturus",
    subStrands: ["Arcturian"],
    image: "the guardian of the bear",
    essence: "repair — bodies, systems, households, arguments",
    history:
      "Arcturus is the bear-watcher: the great bear circles the pole and this star follows behind her, keeping her in sight, all night, every night, for as long as there has been anyone to look up. It is one of the very few stars named in the Book of Job. Hesiod told Greek farmers to watch for its rising and take their ships out of the water, because the storms were coming. And it is a stranger here — Arcturus is not from our part of the galaxy but an older, faster star cutting through on a steep path, passing us and moving on. In the starseed material the Arcturians are the physicians and the engineers: the ones who arrive when something is broken.",
    nature:
      "You cannot leave a broken thing alone. Other people can walk past it. You have tried, and it costs you more to walk past than to stop, so you stop — and you have been doing this so long that most of the people around you have no idea how much of what works in their lives you quietly repaired.",
    longing:
      "To mend the one thing that will not be mended. There is something in your history — a person, usually — that you have been unable to fix, and every other repair you have ever made has been in some measure an attempt at that one. You know exactly what it is. You have known the whole time.",
    purpose:
      "Repair. Not rescue, which is a different job and a worse one. You are here to make things work again — bodies, systems, households, arguments — and to teach the people you fix how to do it themselves, which is the part that separates a healer from a martyr.",
    cost:
      "A repairer needs something broken. Watch for the moment your reaching starts arriving before the asking, because that is where help stops being help.",
  },

  andromeda: {
    id: "andromeda",
    displayName: "Andromeda",
    subStrands: ["Andromedan"],
    image: "the one who was chained, and the galaxy coming toward us",
    essence: "freedom, escape, refusing to pay another's debt",
    history:
      "Andromeda was chained to a rock by her own parents and left for the sea monster, in payment for a boast that was not hers — her mother's vanity, her daughter's body. Perseus came for her. It is one of the oldest stories about being made to pay someone else's debt. And it is not only a story: this is the Andromeda Galaxy, a trillion suns, the furthest thing the human eye can see without help, so far away that the light reaching you tonight left before there were people. It is also coming. Andromeda is falling toward us at a hundred and ten kilometres a second, and in four billion years the two galaxies will pass through one another and become one.",
    nature:
      "You cannot be held. Not by force, not by guilt, not by a good argument. Something in you locks at the first sense of a closing door, and it has cost you relationships and jobs that other people thought were perfectly comfortable.",
    longing:
      "For a freedom you cannot define but recognise instantly by its absence. You have never been able to explain to anyone what you are looking for, only what it isn't, and that has made you sound impossible to please when what you actually are is unwilling to settle for a life you can already see the edges of.",
    purpose:
      "To unchain things, and people. You are here to notice who is paying for someone else's boast and to say so — and to demonstrate, mostly by living it, that a person is allowed to leave.",
    cost:
      "Leaving works. It works so reliably that it long ago stopped being a decision and became the only move you have really practised. Not every closed door is a chain, and you have walked out of rooms you should have stayed in.",
  },

  centaurus: {
    id: "centaurus",
    displayName: "Centaurus",
    subStrands: [],
    image: "the nearest door, and the one who points at it",
    essence: "the near-at-hand, and pointing others toward it",
    history:
      "The centaur here is Chiron: not the wild kind but the teacher, the one who raised Asclepius and Achilles, who knew medicine better than anyone alive and carried a wound of his own that would not close. Alpha Centauri is the closest star system to our own — four light years, near enough that people alive now argue seriously about reaching it — and it turns out not to be a star at all but a household of three. Alongside it Hadar forms the Southern Pointers, the line that finds the Southern Cross, which is how the southern half of the world has navigated for as long as it has sailed. The Aboriginal nations of Australia read the dark dust beside them not as stars but as the shape between them: the Emu.",
    nature:
      "You work with what is in reach. Where other people need the ideal conditions, the right tools and the proper moment, you start with what is on the table — and you finish, which is rarer than starting and much less admired.",
    longing:
      "You have always felt that the door is very close. Not that life is elsewhere, but that it is right here, one step to the left, and that you have somehow not been shown which step. The sense of near-ness has followed you your whole life and it has never resolved.",
    purpose:
      "To point. Most of what you have given people has been direction rather than answers — the sentence that turned someone's head the right way. It is why you keep meeting people who tell you that you changed something, about a conversation you barely remember.",
    cost:
      "Pointing is easier than going, and it can be done indefinitely without ever arriving. And the nearest thing is easy to keep choosing until you have stopped being able to see it clearly.",
  },

  eridanus: {
    id: "eridanus",
    displayName: "Eridanus",
    subStrands: [],
    image: "the river, and the boy who fell into it",
    essence: "the long becoming, and everything not yet set",
    history:
      "Eridanus is the river — a long winding constellation that pours down out of Orion's foot and runs off the bottom of the sky. Phaethon, who could not prove to his friends that the sun-god was his father, demanded to drive the chariot for one day, lost the horses, scorched the earth into deserts, and was struck out of the sky by Zeus to save the world; he fell into this river, and his sisters stood on the bank weeping until they turned into poplars and their tears into amber. Epsilon Eridani, the star in it that carries this lineage, is a sun much like ours and very much younger, still wrapped in the disc of rubble that planets get built out of — a system unmistakably underway and unmistakably not finished.",
    nature:
      "You are still becoming, and you are old enough now that this embarrasses you. Everyone you started with seems to have set into a shape. You have not, and you have privately concluded that this is a defect.",
    longing:
      "To have arrived already. To be introduced as one thing. You have watched people describe themselves in a single sentence your whole life and wondered what is wrong with you that you cannot.",
    purpose:
      "To prove that unfinished is not the same as late. Your life is not a delayed version of anybody else's — it is a longer form, and the things you will do in your fifties and sixties are not consolation for the twenties you spent in motion. They are the point of them.",
    cost:
      "Still forming is an honest description of a young system and a very comfortable place to keep standing. At some point the disc has to condense into something, and only you can say when.",
  },

  polaris: {
    id: "polaris",
    displayName: "Polaris",
    subStrands: [],
    image: "the one that does not move",
    essence: "steadiness others navigate by without saying so",
    history:
      "Every other star in the northern sky wheels through the night. This one does not — it sits over the pole and the whole sky turns around it, which is why it has been the thing people navigate by rather than a thing people wish on. It has been steering ships for as long as there have been ships worth steering. It guided people north out of slavery, and the song that carried the route told them to follow the drinking gourd, which is the Plough, whose two end stars point straight at it. Up close it is not still at all: Polaris is a triple system, and the bright one is a Cepheid variable that swells and shrinks on a four-day pulse. It only looks steady from here. That is the whole job.",
    nature:
      "You are what other people take their bearings from. They do it without mentioning it and often without knowing they do it, and you have been holding that position since you were far too young to have agreed to it.",
    longing:
      "To be the one who gets steered, just once. To arrive somewhere and be met, rather than be the place other people arrive at. You have wanted someone to come and find you for a very long time.",
    purpose:
      "To hold still. In a life full of people reorganising themselves, being reliably in the same place is not a small contribution — it is the thing that makes everyone else's movement possible, and it is almost never counted as work.",
    cost:
      "Nobody asks the fixed point how it is doing. They will not start on their own; you have to say it, and saying it feels to you like breaking the arrangement that makes you useful.",
  },

  draco: {
    id: "draco",
    displayName: "Draco",
    subStrands: ["Draconian"],
    image: "the pole star that used to be",
    essence: "an older order, and what survives its ending",
    history:
      "Thuban was the north star when the pyramids were built. The long descending passage of the Great Pyramid is bored at exactly the angle that would have pointed at it, so that anyone standing at the bottom four and a half thousand years ago would have seen this one star, unmoving, at the end of the shaft. It is not the pole star now. The earth's axis wobbles on a twenty-six-thousand-year circle, and it moved on. Thuban did not dim, fail or do anything wrong; the centre simply went somewhere else. The dragon it sits in is Ladon, who guarded the golden apples and never slept, and who was killed doing it.",
    nature:
      "You carry an older authority. You know how something was done properly, in a system that no longer exists in the form that gave you your standing, and you have watched people rebuild badly what you already knew how to build.",
    longing:
      "For a world that no longer runs. Not nostalgia — you are not sentimental about it — but the specific grief of having been fluent in something the room has stopped speaking. You were at the centre of something once. You are not now.",
    purpose:
      "To carry what the old arrangement knew across the gap, so it is not lost with you. Every displaced order has a few people who make sure the good parts survive the transition. That is the work.",
    cost:
      "The hardest version of this is not being beaten by someone better. It is that nobody did anything wrong, there is no one to be angry with, and the loss is real anyway.",
  },

  reticulum: {
    id: "reticulum",
    displayName: "Reticulum",
    subStrands: [],
    image: "the crosshair in the eyepiece",
    essence: "precision, resolution, the difference nobody else sees",
    history:
      "Almost every constellation is a god, a hero or an animal. This one is a tool. Reticulum is named for the reticle — the fine grid of crosshairs an astronomer fixes inside an eyepiece so that a position can be measured exactly rather than estimated — and it was put in the sky in the eighteenth century by a man mapping the southern stars, who named it after the instrument he was doing it with. The two stars that carry this lineage, Zeta1 and Zeta2, are a matched pair of suns very like our own, so alike they are difficult to tell apart, which have travelled together through the galaxy for billions of years without separating. Of all the places in the sky, this is the one modern lore has made most famous.",
    nature:
      "You see the difference between two things everyone else calls the same. It is a real faculty and it is not pedantry, whatever you were told about it at school — you are simply resolving detail at a scale most people do not have access to.",
    longing:
      "To be certain before you move. You want, more than almost anything, to know — and the world keeps demanding decisions from you at a level of information you consider frankly insulting.",
    purpose:
      "To measure truly. You are here to be the one who checked, who noticed the discrepancy, who would not sign it off because the numbers did not sit right. Almost everything that holds weight was signed off by somebody like you.",
    cost:
      "A thing can be measured indefinitely. Precision is the most respectable reason there has ever been for not yet having decided, and you have used it.",
  },

  galactic_centre: {
    id: "galactic_centre",
    displayName: "The Galactic Centre",
    subStrands: [],
    image: "the middle of everything we are inside",
    essence: "scale, transmission, belonging to something enormous",
    history:
      "Look toward Sagittarius on a dark night and you are looking down the length of your own galaxy at its middle. You cannot see it — there is too much dust in the way — but behind that dust is Sagittarius A*, a black hole of four million suns, and every star you have ever looked at is going around it, including this one. Our sun takes two hundred and twenty-five million years to complete a single circuit; the last time it was here, there were no flowers on earth. The Maya looked at the dark rift beside this point and called it the road to the underworld, and built a calendar that runs to the moment the solstice sun lines up with it.",
    nature:
      "You have been tuned to something much larger than your own life since childhood, and you have spent years learning how to mention it without sounding grandiose. Most people with this never find a way and simply stop bringing it up.",
    longing:
      "To belong to something the size of the thing you can feel. Ordinary life keeps offering you memberships that are too small — the job, the town, the group — and you keep accepting them and keep feeling the gap. The scale of what you sense has never had anywhere to go.",
    purpose:
      "Transmission. Things come through you: ideas, music, a way of putting something that lands harder than you intended. Your work is to stay open enough to receive it and disciplined enough to actually finish it, which is the part most people with this never manage.",
    cost:
      "Perspective and evasion produce the same sentence. 'In the scheme of things' can be genuine wisdom or a way of never being accountable for anything small, and only you know which one you just used.",
  },
};

/** Every ranked lineage must have a meaning before a lineage report can ship. */
export function missingLineageMeanings(lineageIds: readonly string[]): string[] {
  return lineageIds.filter((id) => !(id in LINEAGE_MEANINGS));
}

/**
 * How the section opens when no lineage stands clear.
 *
 * It is a finding, not a null, and it must not read as an apology. Nothing
 * comparative, no hint that this is the lesser version of something.
 */
export const SPREAD_OPENING =
  "Your chart does not point to one origin. It points to several places at once, and that is its own answer — some people come from a single line and some are gathered from many, and the sky says plainly which of those you are. What follows is what you were gathered from.";

export const RESULT_VOICES = {
  single: {
    opening: "One line runs clear through your chart.",
    showCost: true,
  },
  paired: {
    // Carries the framing for both blocks beneath it, so neither repeats it.
    opening:
      "Two lines run through your chart and neither gives way to the other. This is not indecision on the sky's part — some people are the meeting of two inheritances, and forcing one of them into second place would tell you something untrue about yourself. Both are below, at full weight.",
    showCost: false,
  },
} as const;

/**
 * How the contact that named the lineage is described.
 *
 * The fact is precise and the sentence is not clinical - those are compatible.
 * A buyer should be able to check this against the workings table on the last
 * page and find it exact, and should also want to read it out loud.
 */
export const NAMING_LINES: readonly { max: number; phrase: string }[] = [
  { max: 0.5, phrase: "were, to the eye, the same point of sky" },
  { max: 1.0, phrase: "stood within a single degree of one another" },
  { max: 1.5, phrase: "stood close enough to be read as one" },
  { max: 99, phrase: "stood together" },
];

export function namingPhrase(orb: number): string {
  return (NAMING_LINES.find((n) => orb <= n.max) ?? NAMING_LINES[NAMING_LINES.length - 1]).phrase;
}

/**
 * Used only when the baseline actually broke a tie between three or more
 * lineages - the one case where "how strong" is a true account of what
 * happened. Kept plain: no percentages in a customer sentence, per the rule at
 * the top of the spec.
 */
export const STANDING_VOICES: readonly { min: number; phrase: string }[] = [
  { min: 97, phrase: "Among everyone who carries this line at all, few carry it as strongly." },
  { min: 90, phrase: "Among everyone who carries this line at all, you carry it in the top tenth." },
  { min: 85, phrase: "You carry this line well above the ordinary measure of it." },
  { min: 0, phrase: "You carry this line clearly." },
];

export function standingPhrase(standing: number): string {
  return (
    STANDING_VOICES.find((v) => standing >= v.min) ??
    STANDING_VOICES[STANDING_VOICES.length - 1]
  ).phrase;
}
