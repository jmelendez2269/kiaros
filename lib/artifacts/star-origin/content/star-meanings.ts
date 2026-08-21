/**
 * star-meanings.ts
 *
 * One meaning per catalogue star. Forty-five pieces.
 *
 * ---------------------------------------------------------------------------
 * THE VOICE. The full statement of it is at the top of lineage-meanings.ts and
 * it governs this file too. In short:
 *
 *   - The buyer is not a sceptic. They are usually carrying the sense of not
 *     being from here, and the writing has to meet that.
 *   - Write with conviction. Never hedge a meaning. The rigour lives in the
 *     engine and the workings table, not in the prose.
 *   - Lead with real history. These stars have thousands of years of human
 *     attention on them and almost nobody selling this does the reading. Egypt
 *     tracked Algol's eclipses three thousand years before Europe noticed
 *     them; Hipparchus found the precession of the equinoxes by measuring
 *     Spica; spacecraft still navigate by Canopus. That material is true, it
 *     is astonishing, and it is what separates a report that feels ancient
 *     from one that feels generated.
 * ---------------------------------------------------------------------------
 *
 * `lore` records where the meaning comes from so a claim can be traced.
 * "traditional" means there is a real body of attention behind it. "from the
 * object" means the star is a modern catalogue entry with no mythology, and
 * the meaning is built from what it actually is - which is said plainly rather
 * than dressed up as ancient.
 *
 * The compositional trick from Part 4 of the spec: 45 stars x 11 markers x 3
 * closeness bands is 1,485 things a buyer might read. Each star is written
 * once, each marker once (body-voices.ts), and the report joins them.
 */

export interface StarMeaning {
  /** Matches CatalogStar.id in star-catalog.json. */
  id: string;
  /** Where it sits, for the workings table. */
  constellation: string;
  /** A short noun phrase. Goes straight after the star's name. */
  image: string;
  /**
   * How the name reads inside a sentence, when the catalogue name does not.
   * Clusters and regions take an article: the workings table says "Hyades",
   * the prose says "the Hyades".
   */
  proseName?: string;
  /** What this star is in human memory. Two or three sentences. */
  history: string;
  /** What it marks in a life. Stated, not suggested. */
  marks: string;
  /** What it gives. Follows the marker's lead-in, so it starts mid-sentence. */
  gift: string;
  /** What it costs. Printed only on the tightest contacts. */
  cost: string;
  lore: "traditional" | "from the object";
}

export const STAR_MEANINGS: Readonly<Record<string, StarMeaning>> = {
  // --- The Pleiades ---------------------------------------------------------
  alcyone: {
    id: "alcyone",
    constellation: "Taurus, in the Pleiades",
    image: "the brightest of the seven",
    history:
      "Alcyone's name is the kingfisher's. The bird nested on the open winter sea, and the gods held the water flat for her while she did — seven days of impossible calm in the middle of the worst season, which is where we still get the halcyon days. She is the brightest of the seven sisters and the one the whole cluster is named for.",
    marks:
      "the stillness you can produce in the middle of a bad season, which other people rely on and rarely name",
    gift: "the calm that arrives in you when everything is going wrong, and the strange fact that it is your worst weeks other people remember you being good in",
    cost: "The sea does not stay flat because you are calm. Some part of you believes it does, and has never been let off duty.",
    lore: "traditional",
  },
  celaeno: {
    id: "celaeno",
    constellation: "Taurus, in the Pleiades",
    image: "the sister who is hard to see",
    history:
      "Celaeno is one of the Lost Pleiades — faint enough that almost nobody counting the cluster by eye ever finds her, which is why so many traditions say there were seven and only six can be seen. Her name means the dark one. The myths explain her absence as a withdrawal: a sister who chose not to be looked at.",
    marks: "the enormous amount of real work you have done that nobody counted",
    gift: "the freedom of not being watched, which you have used better than most people ever get the chance to",
    cost: "Working unseen is a strength until it hardens into a habit that quietly resents being kept.",
    lore: "traditional",
  },
  electra: {
    id: "electra",
    constellation: "Taurus, in the Pleiades",
    image: "the one who covered her face",
    history:
      "Electra is the other Lost Pleiad. Her descendants founded Troy, and when Troy burned she is said to have veiled herself and left the sky rather than watch it — some tellings have her wandering as a comet with her hair loose in grief. It is a story about the moment when looking away is the only mercy available.",
    marks: "the thing you turned away from, and the veil you have kept up ever since",
    gift: "the mercy of not looking, which you have extended to others when they most needed it and rarely to yourself",
    cost: "A veil raised for a good reason will outlast the reason unless someone lifts it deliberately.",
    lore: "traditional",
  },
  taygeta: {
    id: "taygeta",
    constellation: "Taurus, in the Pleiades",
    image: "the long ridge",
    history:
      "Taygeta shares her name with the mountain wall that shuts in Sparta — a hard, high, unglamorous range that decided the shape of everything that happened behind it. What she carries is not brilliance. It is the thing still standing after the weather has finished.",
    marks: "the slow continuing you have already done and have never counted as an achievement",
    gift: "endurance of a kind that cannot be faked and is not visible until long after everyone else has stopped",
    cost: "Endurance can become the only proof of worth you will accept from yourself.",
    lore: "traditional",
  },
  maia: {
    id: "maia",
    constellation: "Taurus, in the Pleiades",
    image: "the eldest sister",
    history:
      "Maia is the eldest of the seven and the mother of Hermes, who she bore in a cave and who was inventing things before he was a day old. Her name is the Greek word for a midwife. The month of May is named after her. Everything about her is the bringing on of something that is not herself.",
    marks: "what has grown because you tended it, including the things that never carried your name",
    gift: "the midwife's instinct — knowing when to push and when to simply stay in the room",
    cost: "Living through what you have raised can be a way of never having to be looked at directly.",
    lore: "traditional",
  },
  sterope: {
    id: "sterope",
    constellation: "Taurus, in the Pleiades",
    image: "the flash",
    history:
      "Sterope is the faintest of the sisters, right at the edge of what an eye can do, and her name means lightning-face. A brightness that is entirely real and does not stay on.",
    marks: "the things you are genuinely brilliant at in bursts, and have dismissed for not being steady",
    gift: "the flash itself — you have solved in ten minutes things other people worked at for a month",
    cost: "Waiting for the flash is a way of excusing yourself from the ordinary hours in between, and the ordinary hours are most of a life.",
    lore: "traditional",
  },
  merope: {
    id: "merope",
    constellation: "Taurus, in the Pleiades",
    image: "the sister who married a mortal",
    history:
      "Six of the sisters married gods. Merope married Sisyphus, a man, and the tradition says she dims herself out of embarrassment — she is the faintest of the visible six. It is a very old story about an ordinary choice that was probably the right one and has never stopped being questioned.",
    marks: "the plain decision you made and have been quietly defending ever since",
    gift: "the willingness to choose the real thing over the impressive one, which is rarer than it sounds and costs more",
    cost: "Second-guessing a good decision for long enough will eventually spoil it.",
    lore: "traditional",
  },
  atlas: {
    id: "atlas",
    constellation: "Taurus, in the Pleiades",
    image: "the one holding the sky up",
    history:
      "Atlas is the father of the seven, sentenced after the war of the gods to stand at the western edge of the world and hold the heavens apart from the earth for ever. Not a punishment of pain — a punishment of load. Everything else stays where it is because he does not move.",
    marks: "what stays upright because you are underneath it",
    gift: "a load-bearing capacity that people have built their lives on top of without ever asking whether you wanted them to",
    cost: "Carry something long enough and you lose the ability to tell whether you are still needed or merely still there.",
    lore: "traditional",
  },
  pleione: {
    id: "pleione",
    constellation: "Taurus, in the Pleiades",
    image: "the sailing queen",
    history:
      "Pleione is the mother of the cluster, and her name is read as the sailing one: the rising of the Pleiades opened the sailing season across the Mediterranean, and their setting closed it. She is the figure who holds a group together while it is in motion, which is much harder than holding one together at rest.",
    marks: "how you keep a set of people together through a change none of them chose",
    gift: "the ability to hold a crossing — to be the reason a family or a team arrives on the far side still intact",
    cost: "Keeping everyone together can quietly become more important to you than where you were all going.",
    lore: "traditional",
  },

  // --- Orion ----------------------------------------------------------------
  betelgeuse: {
    id: "betelgeuse",
    constellation: "Orion, the right shoulder",
    image: "the red shoulder",
    history:
      "Betelgeuse is a red supergiant so large that if you put it where our sun is, it would swallow Mercury, Venus, Earth and Mars. It is also dying — it has burned through its fuel and will go supernova, and when it does it will be bright enough to read by at night. The Arabic name means the hand of the central one.",
    marks: "a presence that enters the room ahead of you and settles it",
    gift: "the weight people feel when you walk in, which has ended arguments you never even had to join",
    cost: "A presence that large can save you from ever having to explain yourself, and explaining yourself is how people get close to you.",
    lore: "traditional",
  },
  rigel: {
    id: "rigel",
    constellation: "Orion, the left foot",
    image: "the blue star at the hunter's foot",
    history:
      "Rigel is the brightest star in Orion and one of the most luminous in this whole region of the galaxy — a blue supergiant putting out something like a hundred and twenty thousand times the light of our sun, from eight hundred and sixty light years away. Its name is simply the left foot. Of all the parts of the hunter that could have been given the brightest star, the sky gave it to the part that touches the ground.",
    marks: "standing that comes from knowing how a thing is actually done, rather than from talking about it",
    gift: "craft — the real, specific, teachable kind, and the quiet authority that only ever comes from having done the work with your hands",
    cost: "Being the one who knows how it is done can turn into a refusal to watch it done any other way.",
    lore: "traditional",
  },
  bellatrix: {
    id: "bellatrix",
    constellation: "Orion, the left shoulder",
    image: "the female warrior",
    history:
      "Bellatrix is the Amazon star, the warrior at Orion's left shoulder, and the tradition around her is unusually split — the same star is credited with rapid success and with ruin brought on by haste, which is to say the tradition could never decide whether her speed was the gift or the problem. It is both.",
    marks: "the readiness to move before the room has finished deciding",
    gift: "speed that has repeatedly put you where the opportunity was, months before anyone else got there",
    cost: "Being first is not the same as being right, and from the inside the two feel identical.",
    lore: "traditional",
  },
  mintaka: {
    id: "mintaka",
    constellation: "Orion's Belt",
    image: "the belt itself",
    history:
      "Mintaka sits almost exactly on the celestial equator, which means it is the one star in the Belt that rises due east and sets due west for every single person on earth, wherever they are standing. Its name means simply the belt. A thing whose whole purpose is to hold a shape together.",
    marks: "what you keep in order for other people without ever being asked to",
    gift: "the structural instinct — you are the reason a thing has held its shape, and nobody has noticed because it held",
    cost: "Holding a shape can become indistinguishable from refusing a new one.",
    lore: "traditional",
  },
  alnilam: {
    id: "alnilam",
    constellation: "Orion's Belt",
    image: "the string of pearls",
    history:
      "Alnilam is the middle star of the Belt and its name means the string of pearls. It is roughly two thousand light years away — far beyond its two neighbours, which only look like its companions from here — and one of the most luminous stars we can see at all. The middle of the sequence, and the brightest thing in it.",
    marks: "the need to have things in their right order before you will let yourself begin",
    gift: "a sense of sequence — you can see the order a thing has to happen in, and you are usually right",
    cost: "Getting the sequence right is the most respectable way ever invented of not starting.",
    lore: "traditional",
  },
  alnitak: {
    id: "alnitak",
    constellation: "Orion's Belt",
    image: "the girdle",
    history:
      "Alnitak is the easternmost star of the Belt, which makes it the first of the three to rise. Its name means the girdle — the thing that is fastened before the work begins. Behind it, invisible to the eye, sits the Flame Nebula and the dark pillar of the Horsehead.",
    marks: "the preparation nobody sees and everybody depends on",
    gift: "readiness — you arrive with the work already done, which is why things go smoothly around you in a way people credit to luck",
    cost: "Preparation is real work right up until it becomes the whole of the work.",
    lore: "traditional",
  },

  // --- Single stars ---------------------------------------------------------
  sirius: {
    id: "sirius",
    constellation: "Canis Major",
    image: "the brightest star in the sky",
    history:
      "Each year Sirius disappears for seventy days, and Egypt counted them — they were the days Osiris lay dead. Then one dawn she cleared the horizon just ahead of the sun, and within days the Nile rose and the country lived another year. The Egyptian year began on that morning, and temples were aligned so her light ran the length of the sanctuary as she came up. No other star has ever been given a job that size.",
    marks: "being the one who sees it first and says so",
    gift: "the herald's eye — you read what is actually happening under what is being said, and you say it while there is still time to act",
    cost: "The one who tells people what is coming is thanked afterwards, never at the time, and you have started to need the thanks.",
    lore: "traditional",
  },
  arcturus: {
    id: "arcturus",
    constellation: "Boötes",
    image: "the guardian of the bear",
    history:
      "Arcturus is the bear-watcher: the great bear circles the pole all night and this star follows behind, keeping her in sight, and has done for as long as anyone has looked up. It is one of the few stars named in the Book of Job. Hesiod told farmers to watch for its rising and pull their ships out of the water, because the storms were coming.",
    marks: "the long guardianship you have been keeping and have never counted as work",
    gift: "watchfulness — you have been quietly shepherding something for years, and it is still whole because of you",
    cost: "Watching over something for long enough can become a way of holding it still.",
    lore: "traditional",
  },
  vega: {
    id: "vega",
    constellation: "Lyra",
    image: "the strings of the lyre",
    history:
      "Vega was the pole star twelve thousand years ago and will be again in twelve thousand more. It was the first star other than the sun ever photographed. And in the Chinese story it is Zhinü, the weaver girl, kept apart from her cowherd across the river of the Milky Way and allowed to cross to him one night a year, on a bridge the magpies make with their bodies.",
    marks: "the ear for when a thing is in tune and when it is very slightly not",
    gift: "pitch — you can hear that something is off long before you can say what, and you are almost never wrong about it",
    cost: "An ear that fine applied without mercy finds something wrong with everything, and it does not spare you.",
    lore: "traditional",
  },
  aldebaran: {
    id: "aldebaran",
    constellation: "Taurus, the Bull's eye",
    image: "the watcher of the east",
    history:
      "Aldebaran is the red eye of the bull and one of the four royal stars, the watcher of the eastern quarter. Its name means the follower, because it comes up behind the Pleiades and chases them across the sky every night without gaining. Its gift is famously conditional: the tradition holds that what this star gives, it gives only while you keep your word, and takes back the moment you do not.",
    marks: "an integrity that is load-bearing — the thing you have that would not survive being compromised",
    gift: "honour of the old kind, the sort that is worth something precisely because it can be lost",
    cost: "A conditional gift is lost in a single move, and the move always looks small at the time.",
    lore: "traditional",
  },
  antares: {
    id: "antares",
    constellation: "Scorpius, the heart",
    image: "the heart of the scorpion",
    history:
      "Antares means the rival of Mars — a red supergiant so like the planet in colour that the two have been mistaken for one another for as long as people have watched. It is the royal star of the west and the heart of the scorpion: the one that killed Orion, which is why the two of them were placed at opposite ends of the sky and can never be up at the same time.",
    marks: "the one thing you have never been able to be moderate about",
    gift: "an intensity that makes you worth listening to, and that has carried you through things a calmer person would not have survived",
    cost: "The fire that makes you worth listening to is the same fire, and it does not come with a dial.",
    lore: "traditional",
  },
  altair: {
    id: "altair",
    constellation: "Aquila",
    image: "the flying eagle",
    history:
      "Altair is the flying eagle, and it spins so fast — a full rotation in about nine hours — that it has flattened itself measurably out of round. In China it is Niulang the cowherd, separated from the weaver girl by the Milky Way, permitted to cross once a year on the seventh night of the seventh month, when the magpies build a bridge. Whole countries still keep that night.",
    marks: "the decision made from height, quickly, with the whole ground in view",
    gift: "altitude — the ability to see the shape of a situation from above while everyone else is still inside it",
    cost: "The view from height is accurate about shape and poor about detail, and people are detail.",
    lore: "traditional",
  },
  capella: {
    id: "capella",
    constellation: "Auriga",
    image: "the she-goat",
    history:
      "Capella is Amalthea, the goat who nursed the infant Zeus in hiding while his father hunted him. When he came into his power he took one of her horns and made it the cornucopia — the horn that pours out endlessly and is never empty. She fed a god before he was anything, and got made into abundance itself.",
    marks: "an appetite for knowing that has never once been satisfied by knowing",
    gift: "hunger — the kind that has taught you six things properly because you could not leave any of them alone",
    cost: "An appetite for knowing is very easy to mistake for the knowing itself.",
    lore: "traditional",
  },
  deneb: {
    id: "deneb",
    constellation: "Cygnus",
    image: "the swan's tail",
    history:
      "Deneb is the tail of the swan and one of the most luminous stars we can see — so distant that the light arriving tonight left before Rome. In the Chinese story it is the bridge itself, the crossing the magpies make so the two separated lovers can meet. It spends its existence being the thing other things get across on.",
    marks: "work that lands a long way from where you will be standing",
    gift: "the long throw — you set things going that arrive years later, in places you never see, for people you never meet",
    cost: "Working at that range makes it very hard ever to feel that anything has arrived.",
    lore: "traditional",
  },
  procyon: {
    id: "procyon",
    constellation: "Canis Minor",
    image: "the one that rises first",
    history:
      "Procyon means before the dog: it comes up ahead of Sirius, every night, announcing a star brighter than itself. Its old reading is a quick rise and an equally quick decline, with impatience named as the cause of both.",
    marks: "what you got to early, and what you did with the time it bought you",
    gift: "the early arrival — you have been ahead of things your whole life, often by years",
    cost: "Getting there first and staying are two entirely different skills, and only one of them comes naturally to you.",
    lore: "traditional",
  },
  regulus: {
    id: "regulus",
    constellation: "Leo, the Lion's heart",
    image: "the heart of the lion",
    history:
      "Regulus sits almost exactly on the ecliptic, which means the sun passes directly over it every August and the moon and planets keep meeting it — no other first-magnitude star is placed like that. It is the royal star of the north, the heart of the lion, and Copernicus gave it the name it still has: the little king. Its tradition is unusually specific about terms. It gives standing, and it takes that standing back from anyone who uses it for revenge.",
    marks: "what you do with power at the moment you have been wronged while holding it",
    gift: "natural authority — people hand you the room without being asked to, and always have",
    cost: "Getting even is the one move this star's entire tradition says will cost you the throne.",
    lore: "traditional",
  },
  canopus: {
    id: "canopus",
    constellation: "Carina",
    image: "the pilot",
    history:
      "Canopus was the helmsman of the ship that carried Menelaus home from Troy, and it is the second brightest star in the sky. It has been steering people for three thousand years and it has not stopped: because it sits far from the plane of the ecliptic and is unmistakably bright, spacecraft still use it. There are star trackers flying right now that hold their attitude by locking onto Canopus.",
    marks: "the distant fixed thing you steer your life by",
    gift: "the navigator's discipline — the ability to hold a course toward something you cannot yet see",
    cost: "A fixed point makes the journey possible and makes it very easy to stop noticing the journey.",
    lore: "traditional",
  },
  fomalhaut: {
    id: "fomalhaut",
    constellation: "Piscis Austrinus",
    image: "the mouth of the southern fish",
    history:
      "Fomalhaut is the royal star of the south, and it sits where the water poured out by Aquarius is drunk — the whole arrangement of that part of the sky is about receiving. It is ringed by a vast disc of debris, and in 2008 it became one of the first stars anywhere to have a planet directly photographed. Its tradition holds its gift on one condition: that whoever receives stays uncorrupted.",
    marks: "what arrives in you without effort, and what you do to keep the channel clean",
    gift: "reception — things come to you, and they always have, in a way that other people find slightly unfair",
    cost: "What arrives without effort is the hardest kind of thing in the world to stay honest about.",
    lore: "traditional",
  },
  spica: {
    id: "spica",
    constellation: "Virgo",
    image: "the ear of wheat",
    history:
      "Spica is the sheaf of wheat held in the Virgin's hand, and it has the least complicated reputation of any star in the tradition — plainly and simply a gift. It also changed astronomy: Hipparchus compared his measurement of Spica against records made a hundred and fifty years earlier, found it had moved, and discovered the precession of the equinoxes. The drift this whole report corrects for was found on this star.",
    marks: "the ability you have always had and have therefore never respected",
    gift: "a talent that arrived unearned and has been quietly carrying you for years",
    cost: "A gift that cost nothing is very easy to spend and very hard to value.",
    lore: "traditional",
  },
  pollux: {
    id: "pollux",
    constellation: "Gemini",
    image: "the immortal twin",
    history:
      "Castor and Pollux had different fathers: one mortal, one divine. When Castor was killed, Pollux — who could not die — asked to give away half of his immortality rather than be parted from his brother, and they were placed together in the sky, sharing one existence between them for ever. It is the oldest story we have about paying for a bond out of your own share.",
    marks: "the loyalty you have paid for out of your own life",
    gift: "a capacity for the kind of bond most people only claim to have — you have actually spent yourself on someone",
    cost: "A bond kept at that price can turn into a debt neither of you ever agreed to name.",
    lore: "traditional",
  },
  alnair: {
    id: "alnair",
    constellation: "Grus",
    image: "the bright one in the crane",
    history:
      "Alnair sits in Grus, the crane, one of the southern constellations invented by Dutch navigators in the sixteenth century — so it carries no ancient mythology at all. What it has instead is the bird itself: the crane crosses continents on a schedule it did not set and cannot explain, and arrives.",
    marks: "the pull toward moving on, and the season it runs on",
    gift: "the migratory instinct, which has taken you to the right places at roughly the right times without you ever being able to justify the decision",
    cost: "A migratory instinct will manufacture a reason to leave whether or not there is one.",
    lore: "from the object",
  },
  polaris: {
    id: "polaris",
    constellation: "Ursa Minor",
    image: "the star that does not move",
    history:
      "The whole northern sky turns and this one does not, which is why it is a thing people navigate by rather than a thing people wish on. It guided people north out of slavery — the song said to follow the drinking gourd, and the two end stars of that gourd point straight at it. Up close it is not steady at all: Polaris is three stars, and the bright one swells and shrinks on a four-day pulse. It only looks fixed from here. That is the entire job.",
    marks: "being the thing other people take their bearings from",
    gift: "constancy — the kind people organise their lives around without ever mentioning that they have",
    cost: "Nobody asks the fixed point how it is doing. You have to say it, and saying it feels like breaking the arrangement.",
    lore: "traditional",
  },
  thuban: {
    id: "thuban",
    constellation: "Draco",
    image: "the pole star that used to be",
    history:
      "Thuban was the north star when the pyramids were built, and the long descending passage of the Great Pyramid is cut at exactly the angle that pointed at it — stand at the bottom of that shaft four and a half thousand years ago and this one unmoving star is what you saw. It is not the pole star now. The earth's axis wobbles on a twenty-six-thousand-year circle and the centre moved. Thuban did not dim or fail. It simply stopped being the middle of things.",
    marks: "having been the centre of something that has since moved on",
    gift: "the authority of an older order, and everything you know about how a thing was properly done",
    cost: "The hardest version of this is not being beaten. It is that nobody did anything wrong and the loss is real anyway.",
    lore: "traditional",
  },
  alpha_cen: {
    id: "alpha_cen",
    constellation: "Centaurus",
    image: "the nearest neighbour",
    history:
      "Alpha Centauri is the closest star system to our own — four light years, near enough that people alive today argue seriously about how to reach it. And it turns out not to be a star at all. It is two suns orbiting each other with a third, Proxima, circling them both at a distance. The nearest thing to us is a household.",
    marks: "how much of what you take to be yourself is really the shape of who you are next to",
    gift: "the ability to be genuinely close to someone, which is far less common than being fond of them",
    cost: "Proximity that complete makes it very hard to say where you end.",
    lore: "from the object",
  },
  hadar: {
    id: "hadar",
    constellation: "Centaurus",
    image: "one of the two pointers",
    history:
      "Hadar's job in the southern sky is to point. It and Alpha Centauri form the line that finds the Southern Cross, and therefore the south celestial pole, and therefore the way home — that is how the southern half of the world has navigated for as long as it has sailed. Beside them the Aboriginal nations of Australia read not the stars but the darkness between them: the Emu in the Sky.",
    marks: "how often your usefulness has been in showing people where to look",
    gift: "direction — you have turned people's heads the right way in conversations you have completely forgotten and they never have",
    cost: "Pointing is easier than going, and it can be done indefinitely without ever arriving.",
    lore: "from the object",
  },
  eps_eridani: {
    id: "eps_eridani",
    constellation: "Eridanus",
    image: "the young sun in the river",
    history:
      "Epsilon Eridani is a sun much like ours and very much younger, still wrapped in the belt of rubble that planets get made out of. In 1960 it became one of the first two stars in history that anybody deliberately listened to — Project Ozma pointed a radio telescope at it and waited. We have been asking this particular star a question for over sixty years.",
    marks: "a life that has taken longer to find its shape than other people's appear to have taken",
    gift: "the openness of something not yet set, which is why you can still change your mind at an age when most people have stopped",
    cost: "Still forming is an honest description and a very comfortable place to keep standing.",
    lore: "from the object",
  },
  tau_ceti: {
    id: "tau_ceti",
    constellation: "Cetus",
    image: "the other ordinary sun",
    history:
      "Tau Ceti is the nearest single star genuinely similar to our own, and that is the entire reason it is famous: there is nothing remarkable about it. It was the other star Project Ozma listened to in 1960, and it has been in more science fiction than almost any real place, purely because it is so unexceptional that it might be home.",
    marks: "what is valuable about you that is completely ordinary, and overlooked for exactly that reason",
    gift: "ordinariness of a kind that other people find restful, and come to you for without knowing why",
    cost: "Ordinary is a fact, not a verdict, and you have spent years hearing it as one.",
    lore: "from the object",
  },
  schedar: {
    id: "schedar",
    constellation: "Cassiopeia",
    image: "the seated queen",
    history:
      "Cassiopeia boasted that she was more beautiful than the sea nymphs, and the price was her daughter chained to a rock. She was bound to a chair and set turning around the pole, and because that part of the sky never sets she is up there every night of the year — including the half of every night she spends upside down. Schedar is her breast, the star at the heart of her.",
    marks: "the claim you once made about yourself that you have had to keep living next to",
    gift: "a refusal to be smaller than you are, which has cost you and which you have never actually regretted",
    cost: "Pride and self-knowledge use exactly the same words, and you cannot always hear which one just spoke.",
    lore: "traditional",
  },
  rasalhague: {
    id: "rasalhague",
    constellation: "Ophiuchus",
    image: "the head of the serpent-bearer",
    history:
      "Rasalhague crowns Ophiuchus, the figure holding a living snake — Asclepius, the physician who became so skilled that he began raising the dead, at which point Zeus killed him with a thunderbolt for breaking the order of things, and then, regretting it, set him in the sky. His staff with its single coiled serpent is still on the side of every ambulance.",
    marks: "the dangerous material you have learned to hold without dropping",
    gift: "the physician's steadiness — people bring you the thing they cannot say anywhere else, and you do not flinch",
    cost: "Whoever can hold the dangerous thing gets handed all of them.",
    lore: "traditional",
  },
  algol: {
    id: "algol",
    constellation: "Perseus",
    image: "the head of the Gorgon",
    history:
      "Every two days and twenty-one hours Algol visibly dims, for about ten hours, and then comes back. Europe did not work out why until 1783 — but a papyrus in Cairo, three thousand years older, tracks a lucky-and-unlucky cycle that matches Algol's period almost exactly, which means Egypt was watching this star blink and writing it down. Its name is the head of the ogre. Perseus holds it: the Gorgon's severed head, still able to turn men to stone.",
    marks: "the rage that belongs to a real injury, which is not the same thing as a flaw",
    gift: "an anger that is accurate — it has always known exactly what was done to you, even when you would not look at it",
    cost: "The tradition's warning was never about having it. It is about what it costs to keep it out of sight.",
    lore: "traditional",
  },
  zeta_ret_a: {
    id: "zeta_ret_a",
    constellation: "Reticulum",
    image: "the measuring grid",
    history:
      "Almost every constellation is a god or a beast. This one is a tool: the reticle, the fine crosshair grid an astronomer fixes in an eyepiece so a position can be measured exactly instead of guessed. Zeta1 is the brighter of a matched pair of sun-like stars that have travelled the galaxy side by side for billions of years without separating.",
    marks: "the need to fix a thing precisely before you will commit to it",
    gift: "resolution — you see differences at a scale most people simply do not have access to",
    cost: "Measuring something carefully enough is a way of not deciding about it, and you know that.",
    lore: "from the object",
  },
  zeta_ret_b: {
    id: "zeta_ret_b",
    constellation: "Reticulum",
    image: "the second of the pair",
    history:
      "Zeta2 is the fainter twin of two stars so alike that telling them apart takes instruments. They formed together and have moved together ever since. The difference between them is not brightness or age — it is that this one carries a disc of debris around it, and its twin does not. Same beginning; different accumulation.",
    marks: "the comparison you keep making, and what you carry that the other side of it does not",
    gift: "the clarity of knowing precisely how you differ from the person you are always measured against",
    cost: "A close comparison can run a whole lifetime without ever resolving.",
    lore: "from the object",
  },
  hyades: {
    id: "hyades",
    constellation: "Taurus, the Bull's face",
    image: "the rain sisters",
    proseName: "the Hyades",
    history:
      "The Hyades are the half-sisters of the Pleiades, and they wept. Their brother Hyas was killed hunting, and they grieved so completely that they died of it and were put in the sky as the face of the bull — and their rising brought the rainy season, so that the whole Mediterranean read them as the tears that fall on everyone. They are the nearest star cluster to us. The grief is close.",
    marks: "the way your hard seasons arrive in groups rather than singly",
    gift: "an unembarrassed relationship with grief — you can sit with people in the worst of it without needing them to be finished",
    cost: "Weather that arrives all at once feels like a verdict rather than a season, and it is a season.",
    lore: "traditional",
  },
  andromeda: {
    id: "andromeda",
    constellation: "Andromeda",
    image: "the chained princess",
    proseName: "the Andromeda Galaxy",
    history:
      "Andromeda was chained to a rock and left for the sea monster in payment for her mother's boast — her mother's vanity, her body. Perseus came for her. This is also the Andromeda Galaxy: a trillion suns, the furthest thing a human eye can see unaided, its light older than our species. And it is coming. Andromeda is falling toward us at a hundred and ten kilometres a second, and one day the two galaxies will pass through each other and be one.",
    marks: "what you have been carrying that was never yours to answer for",
    gift: "an absolute refusal to be held, which has cost you and has also saved you",
    cost: "Being rescued from something does not settle the question of who put you there.",
    lore: "traditional",
  },
  galactic_center: {
    id: "galactic_center",
    constellation: "Sagittarius",
    image: "the centre everything turns around",
    proseName: "the Galactic Centre",
    history:
      "Look toward Sagittarius and you are looking down the length of your own galaxy at its middle. You cannot see it — the dust is too thick — but behind that dust is a black hole of four million suns, and every star you have ever seen is going around it, ours included, on a circuit that takes two hundred and twenty-five million years. The Maya looked at the dark rift beside this point and called it the road to the underworld.",
    marks: "how much of what you take personally is you being carried by something enormous",
    gift: "scale — a sense of the size of things that arrived in childhood and has never left",
    cost: "Perspective and evasion produce the same sentence, and only you know which one you just used.",
    lore: "from the object",
  },
  super_galactic_center: {
    id: "super_galactic_center",
    constellation: "Virgo",
    image: "the centre of the larger structure",
    proseName: "the Supergalactic Centre",
    history:
      "Our entire galaxy is a single member of a cluster, and this is the middle of it — a structure so large that nobody knew it was there until the last century. At its heart is the galaxy M87, whose black hole became, in 2019, the first ever photographed: the orange ring everyone saw that year is this place. You are looking at the centre of the thing your galaxy belongs to.",
    marks: "the pattern you belong to that you have never been able to see the edges of",
    gift: "a sense of membership in something you cannot name, which has kept you going through periods when nothing local made sense",
    cost: "Belonging to something you cannot see the shape of is hard to tell apart from belonging to nothing.",
    lore: "from the object",
  },
};

/** Every catalogue star must have a meaning before the report can ship. */
export function missingMeanings(starIds: readonly string[]): string[] {
  return starIds.filter((id) => !(id in STAR_MEANINGS));
}
