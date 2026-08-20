/**
 * star-meanings.ts
 *
 * One meaning per catalogue star, written once.
 *
 * This is the compositional trick from Part 4 of the spec. There are 45 stars
 * and 11 markers a star can land on, which is 495 combinations, and nobody is
 * writing 495 pieces at ten hours a week. So each star is written once, each
 * marker is written once (body-voices.ts), and the report joins them at
 * generation time. 45 + 11 + 3 = 59 pieces instead of 495.
 *
 * Where a star has a real tradition behind it - the four royal watchers, the
 * named figures of the constellations - the meaning is grounded in that
 * tradition rather than invented, and `lore` records where it comes from so a
 * claim can be traced. Where a star has no tradition, because it is a modern
 * catalogue object like Tau Ceti or a galaxy, the meaning is built from what
 * the object actually is. That is stated rather than dressed up as ancient.
 *
 * Voice rules, from the spec:
 *  - A finding, never a prediction. "asks", "invites", never "you will".
 *  - Nothing comparative. No mention that other readings do this differently.
 *  - `shadow` is not a warning about the future. It is the cost the tradition
 *    always names alongside the gift, and it is what keeps a tight contact
 *    from reading as flattery.
 */

export interface StarMeaning {
  /** Matches CatalogStar.id in star-catalog.json. */
  id: string;
  /** Where it sits, for the workings table. */
  constellation: string;
  /** A short noun phrase. Goes straight after the star's name. */
  image: string;
  /** What the star stands for. One sentence, no reference to any chart. */
  theme: string;
  /** What it asks of the person. Joined to the marker's arena. */
  asks: string;
  /** The counterweight. Shown only on the tightest contacts. */
  shadow: string;
  /** Where the meaning comes from, so a reader can check it. */
  lore: "traditional" | "from the object";
}

export const STAR_MEANINGS: Readonly<Record<string, StarMeaning>> = {
  // --- The Pleiades ---------------------------------------------------------
  alcyone: {
    id: "alcyone",
    constellation: "Taurus, in the Pleiades",
    image: "the one the others turn around",
    theme:
      "Alcyone is the brightest of seven sisters and the point the cluster is named for; the tradition attached to her is unusual in pairing clear sight with grief, as though seeing well and being untroubled were not offered together.",
    asks: "notice how early you saw things other people had not got to yet, and what that cost you in company",
    shadow:
      "Seeing first can harden into standing apart, and standing apart can start to feel like the point rather than the price.",
    lore: "traditional",
  },
  celaeno: {
    id: "celaeno",
    constellation: "Taurus, in the Pleiades",
    image: "the sister who is hard to see",
    theme:
      "Celaeno is one of the Lost Pleiades, faint enough that most people counting the cluster by eye never find her, and she was explained in myth as a sister who withdrew.",
    asks: "look at where you have done real work without being counted, and whether that was chosen or simply allowed",
    shadow:
      "Working unseen is a strength until it becomes a habit that quietly resents being kept.",
    lore: "traditional",
  },
  electra: {
    id: "electra",
    constellation: "Taurus, in the Pleiades",
    image: "the one who covered her face",
    theme:
      "Electra is the other Lost Pleiad, said to have veiled herself rather than watch the city she loved burn, which is a story about the moment when looking away is the only thing left to do.",
    asks: "consider what you turned away from, and whether the turning away is still doing its job",
    shadow: "A veil put up for good reason can outlast the reason.",
    lore: "traditional",
  },
  taygeta: {
    id: "taygeta",
    constellation: "Taurus, in the Pleiades",
    image: "the long ridge",
    theme:
      "Taygeta shares her name with the mountain range that walls in Sparta, and what she carries is endurance rather than brilliance: the thing that is still there after the weather.",
    asks: "give weight to the slow, unglamorous continuing you have already done and rarely count as an achievement",
    shadow: "Endurance can become the only proof of worth you will accept.",
    lore: "traditional",
  },
  maia: {
    id: "maia",
    constellation: "Taurus, in the Pleiades",
    image: "the eldest sister",
    theme:
      "Maia is the eldest of the seven and the mother of Hermes; her name is the Greek word for a nurse or a midwife, and what she stands for is bringing something else on rather than being the thing itself.",
    asks: "look at what has grown because you tended it, including things that never carried your name",
    shadow:
      "Living through what you have raised can be a way of never having to be looked at directly.",
    lore: "traditional",
  },
  sterope: {
    id: "sterope",
    constellation: "Taurus, in the Pleiades",
    image: "the flash",
    theme:
      "Sterope is the faintest of the sisters and her name means lightning-face: a brightness that is real and does not stay on.",
    asks: "take seriously the things you are brilliant at in bursts, rather than dismissing them for not being steady",
    shadow:
      "Waiting for the flash is a way of excusing yourself from the ordinary hours in between.",
    lore: "traditional",
  },
  merope: {
    id: "merope",
    constellation: "Taurus, in the Pleiades",
    image: "the sister who married a mortal",
    theme:
      "Merope is the only one of the seven said to have chosen an ordinary husband and to have dimmed herself out of embarrassment at it, which makes her a story about a plain choice that was probably right and never stopped being questioned.",
    asks: "look at the ordinary choice you made and have been quietly defending ever since",
    shadow:
      "Second-guessing a good decision for long enough will eventually spoil it.",
    lore: "traditional",
  },
  atlas: {
    id: "atlas",
    constellation: "Taurus, in the Pleiades",
    image: "the one holding the sky up",
    theme:
      "Atlas is the father of the seven and the figure sentenced to hold the heavens apart from the earth: weight carried so that other things can stay where they are.",
    asks: "name what stays upright because you are under it, and whether anyone has ever offered to take a turn",
    shadow:
      "Carrying something long enough makes it hard to tell whether you are still needed or just still there.",
    lore: "traditional",
  },
  pleione: {
    id: "pleione",
    constellation: "Taurus, in the Pleiades",
    image: "the sailing queen",
    theme:
      "Pleione is the mother of the cluster and her name is read as the sailing one; the Pleiades set the season for putting to sea, and she is the figure who keeps a group together while it is moving.",
    asks: "look at how you hold a set of people together through a change none of them chose",
    shadow:
      "Keeping everyone together can quietly become more important than where you were all going.",
    lore: "traditional",
  },

  // --- Orion ----------------------------------------------------------------
  betelgeuse: {
    id: "betelgeuse",
    constellation: "Orion, the right shoulder",
    image: "the red shoulder",
    theme:
      "Betelgeuse is the hunter's shoulder, a swollen red giant near the end of its life, and it carries a reputation for standing won by presence rather than by argument.",
    asks: "look at the strength people assume you have, and whether it is the one you actually rely on",
    shadow:
      "A presence large enough to settle a room can stop you from ever having to explain yourself.",
    lore: "traditional",
  },
  rigel: {
    id: "rigel",
    constellation: "Orion, the left foot",
    image: "the foot on the ground",
    theme:
      "Rigel is the brightest star in Orion and marks the hunter's foot; the tradition attached to it is instruction and craft, the standing that comes from knowing how a thing is actually done.",
    asks: "give proper weight to the skill you have that could be taught to someone else",
    shadow:
      "Being the one who knows how it is done can turn into a refusal to see it done differently.",
    lore: "traditional",
  },
  bellatrix: {
    id: "bellatrix",
    constellation: "Orion, the left shoulder",
    image: "the female warrior",
    theme:
      "Bellatrix is the Amazon star, and the readings given to it split evenly between quick success and ruin brought on by haste: the same speed, judged twice.",
    asks: "consider where your readiness to move is your best quality and where it is simply your fastest one",
    shadow: "Being first is not the same as being right, and it feels identical.",
    lore: "traditional",
  },
  mintaka: {
    id: "mintaka",
    constellation: "Orion's Belt",
    image: "the belt itself",
    theme:
      "Mintaka sits almost exactly on the celestial equator, the line that halves the sky, and its name simply means the belt: a thing whose whole job is to hold a shape together.",
    asks: "look at what you keep in order for other people without being asked",
    shadow: "Holding a shape can become indistinguishable from refusing a new one.",
    lore: "traditional",
  },
  alnilam: {
    id: "alnilam",
    constellation: "Orion's Belt",
    image: "the string of pearls",
    theme:
      "Alnilam is the middle star of the Belt and its name means the string of pearls; it is the one in the centre, and what it stands for is the ordering of things into a sequence that makes sense.",
    asks: "notice your instinct to put things in their right order before you will let yourself begin",
    shadow:
      "Getting the sequence right is the most respectable way there is to not start.",
    lore: "traditional",
  },
  alnitak: {
    id: "alnitak",
    constellation: "Orion's Belt",
    image: "the girdle",
    theme:
      "Alnitak is the Belt's eastern star, the one that rises first, and its name means the girdle: what gets fastened before the work starts.",
    asks: "look at the preparation you do that nobody sees and everyone depends on",
    shadow:
      "Preparation is real work right up until it becomes the whole of the work.",
    lore: "traditional",
  },

  // --- Single stars ---------------------------------------------------------
  sirius: {
    id: "sirius",
    constellation: "Canis Major",
    image: "the brightest star in the sky",
    theme:
      "Sirius is the brightest star there is, and its rising once told Egypt the Nile was about to flood; the tradition around it is guardianship and fame, and also heat, since it was called the scorcher for the season it announced.",
    asks: "look at what you are relied on to announce or to guard, and what that visibility does to you",
    shadow:
      "Being the brightest thing in the room is a position, and positions have to be held.",
    lore: "traditional",
  },
  arcturus: {
    id: "arcturus",
    constellation: "Bootes",
    image: "the guardian of the bear",
    theme:
      "Arcturus is the bear-watcher, the star of the herdsman, and its old reading is prosperity that arrives through effort rather than luck, along with the storms that come at the season it rises.",
    asks: "look at what you have been quietly shepherding, and whether you have ever counted it as work",
    shadow:
      "Watching over something for long enough can become a way of holding it still.",
    lore: "traditional",
  },
  vega: {
    id: "vega",
    constellation: "Lyra",
    image: "the strings of the lyre",
    theme:
      "Vega is the harp star, once the pole star and due to be again, and what it carries is pitch: the sense of when a thing is in tune and when it is very slightly not.",
    asks: "trust the ear you have for when something is off, even when you cannot yet say what",
    shadow:
      "A fine ear applied without mercy will find something wrong with everything, including you.",
    lore: "traditional",
  },
  aldebaran: {
    id: "aldebaran",
    constellation: "Taurus, the Bull's eye",
    image: "the watcher of the east",
    theme:
      "Aldebaran is one of the four royal stars, the watcher of the eastern quarter, and its gift is famously conditional: the tradition holds that what it gives stays only while the person keeps their word.",
    asks: "look at where your integrity is actually being tested, which is rarely where you were expecting",
    shadow:
      "A conditional gift can be lost in one move, and the move usually looks small at the time.",
    lore: "traditional",
  },
  antares: {
    id: "antares",
    constellation: "Scorpius, the heart",
    image: "the heart of the scorpion",
    theme:
      "Antares is the royal star of the west, a red giant named for its rivalry with Mars, and the readings given to it are courage, intensity, and the specific danger of a person's own fire.",
    asks: "look at the one thing you have never managed to be moderate about",
    shadow:
      "The fire that makes you worth listening to is the same fire, and it does not come with a dial.",
    lore: "traditional",
  },
  altair: {
    id: "altair",
    constellation: "Aquila",
    image: "the flying eagle",
    theme:
      "Altair is the eagle in flight, and its tradition is boldness and altitude: the decision made from high up, quickly, with the whole ground in view.",
    asks: "notice how much of your judgement is made from a distance, and what that distance is worth",
    shadow: "The view from height is accurate about shape and poor about detail.",
    lore: "traditional",
  },
  capella: {
    id: "capella",
    constellation: "Auriga",
    image: "the she-goat",
    theme:
      "Capella is Amalthea, the goat who nursed the infant Zeus, and the quality attached to her is a restless appetite for learning: curiosity that does not settle once it is fed.",
    asks: "look at what you keep wanting to know, and whether you have ever let yourself finish anything",
    shadow: "An appetite for knowing is easy to mistake for the knowing itself.",
    lore: "traditional",
  },
  deneb: {
    id: "deneb",
    constellation: "Cygnus",
    image: "the swan's tail",
    theme:
      "Deneb is the tail of the swan, one of the most luminous stars we can see and one of the most distant, which means light that has been travelling a very long time to arrive at all.",
    asks: "consider that the things you set going may land a long way from where you will be standing",
    shadow:
      "Working at that range makes it hard to ever feel that anything has arrived.",
    lore: "traditional",
  },
  procyon: {
    id: "procyon",
    constellation: "Canis Minor",
    image: "the one that rises first",
    theme:
      "Procyon means before the dog, because it rises ahead of Sirius; its old reading is a quick rise followed by an equally quick decline, with impatience as the thing that causes both.",
    asks: "look at what you got to early, and what you did with the time that bought you",
    shadow: "Arriving first and staying are two different skills.",
    lore: "traditional",
  },
  regulus: {
    id: "regulus",
    constellation: "Leo, the Lion's heart",
    image: "the heart of the lion",
    theme:
      "Regulus is the royal star of the north and the little king; the tradition is unusually specific about its terms, giving standing and authority and taking them back from anyone who uses them for revenge.",
    asks: "look at what you do with authority when you have been wronged while holding it",
    shadow:
      "Getting even is the one move this star's whole tradition says will cost you the position.",
    lore: "traditional",
  },
  canopus: {
    id: "canopus",
    constellation: "Carina",
    image: "the pilot",
    theme:
      "Canopus is the second brightest star in the sky, named for a helmsman, and it is the star ships were steered by in the south; what it stands for is navigation by something far off and fixed.",
    asks: "name the distant thing you are steering by, and check whether you chose it or inherited it",
    shadow:
      "A fixed point makes the journey possible and stops you noticing the journey.",
    lore: "traditional",
  },
  fomalhaut: {
    id: "fomalhaut",
    constellation: "Piscis Austrinus",
    image: "the mouth of the southern fish",
    theme:
      "Fomalhaut is the royal star of the south, positioned where the water poured out by Aquarius is received, and its tradition is fortune and vision held on one condition: that the receiver stays uncorrupted.",
    asks: "look at what comes to you easily, and at what you are doing to keep the channel clean",
    shadow:
      "What arrives without effort is the hardest kind of thing to stay honest about.",
    lore: "traditional",
  },
  spica: {
    id: "spica",
    constellation: "Virgo",
    image: "the ear of wheat",
    theme:
      "Spica is the sheaf held in the Virgin's hand and has the least complicated reputation of any star in the tradition: a gift, plainly given, usually one the person did nothing to earn.",
    asks: "identify the ability you have always had and have therefore never respected",
    shadow:
      "A talent that cost nothing is very easy to spend and very hard to value.",
    lore: "traditional",
  },
  pollux: {
    id: "pollux",
    constellation: "Gemini",
    image: "the immortal twin",
    theme:
      "Pollux was the twin who could not die and gave half his immortality away rather than be parted from his brother; the readings given to the star are martial and unsentimental, which fits a decision made at that price.",
    asks: "look at the loyalty you have paid for out of your own share",
    shadow:
      "A bond kept at cost can turn into a debt that neither of you ever named.",
    lore: "traditional",
  },
  alnair: {
    id: "alnair",
    constellation: "Grus",
    image: "the bright one in the crane",
    theme:
      "Alnair sits in the Crane, a southern constellation with almost no lore attached to it, so what it gives you is the bird itself: the one that navigates enormous distances on a schedule it did not set.",
    asks: "look at the pull you feel toward moving on, and whether it runs on a season you can recognise",
    shadow:
      "A migratory instinct will produce a reason to leave whether or not there is one.",
    lore: "from the object",
  },
  polaris: {
    id: "polaris",
    constellation: "Ursa Minor",
    image: "the star that does not move",
    theme:
      "Polaris sits almost exactly over the north pole, so the entire sky turns around it and it stays put, which is why it has been the thing people navigate by rather than a thing people wish on.",
    asks: "consider what you are for other people: the point they take a bearing from without mentioning it",
    shadow:
      "Being the fixed point is a service, and nobody asks the fixed point how it is doing.",
    lore: "traditional",
  },
  thuban: {
    id: "thuban",
    constellation: "Draco",
    image: "the pole star that used to be",
    theme:
      "Thuban was the north star when the pyramids were built and is not any more, because the axis moved; the star did not change or fail, it simply stopped being the centre.",
    asks: "look at a thing you were once the centre of, and at what is still true about you now that you are not",
    shadow:
      "The hardest version of this is not being replaced. It is nobody having done anything wrong.",
    lore: "from the object",
  },
  alpha_cen: {
    id: "alpha_cen",
    constellation: "Centaurus",
    image: "the nearest neighbour",
    theme:
      "Alpha Centauri is the closest star system to our own and it is not one star but a pair with a third in orbit around them, so the nearest thing to us turns out to be a household rather than an individual.",
    asks: "look at how much of what you take to be yourself is really the shape of who you are next to",
    shadow: "Proximity that close makes it genuinely hard to say where you end.",
    lore: "from the object",
  },
  hadar: {
    id: "hadar",
    constellation: "Centaurus",
    image: "one of the two pointers",
    theme:
      "Hadar's job in the southern sky is to point: it and its neighbour form the line that finds the Southern Cross, which is how the pole gets located down there.",
    asks: "notice how often your usefulness has been in showing people where to look rather than in the looking",
    shadow:
      "Pointing is easier than going, and it can be done indefinitely without arriving.",
    lore: "from the object",
  },
  eps_eridani: {
    id: "eps_eridani",
    constellation: "Eridanus",
    image: "the young sun in the river",
    theme:
      "Epsilon Eridani is a nearby star much like ours but far younger, still surrounded by the debris disc that planets get built out of: a system unmistakably underway and unmistakably not finished.",
    asks: "give the unfinished parts of your life the same standing as the settled ones",
    shadow:
      "Still forming is an honest description and a very comfortable place to stay.",
    lore: "from the object",
  },
  tau_ceti: {
    id: "tau_ceti",
    constellation: "Cetus",
    image: "the other ordinary sun",
    theme:
      "Tau Ceti is the nearest single star genuinely similar to our own, which is exactly why it has been listened to for a century; its whole significance is that there is nothing remarkable about it.",
    asks: "consider what is valuable about you that is entirely ordinary, and has been overlooked for that reason",
    shadow: "Ordinary is a fact, not a verdict, and it is easy to hear as one.",
    lore: "from the object",
  },
  schedar: {
    id: "schedar",
    constellation: "Cassiopeia",
    image: "the seated queen",
    theme:
      "Schedar is the breast of Cassiopeia, the queen whose boast about her own beauty got her fixed to a chair and turned around the pole for good; the constellation never sets, so she is always up there, right way up for half of it.",
    asks: "look at the claim you have made about yourself that you have had to keep living next to",
    shadow: "Pride and self-knowledge use exactly the same words.",
    lore: "traditional",
  },
  rasalhague: {
    id: "rasalhague",
    constellation: "Ophiuchus",
    image: "the head of the serpent-bearer",
    theme:
      "Rasalhague crowns Ophiuchus, the figure holding a live snake, identified with Asclepius the physician; the reading is about handling something genuinely dangerous well enough that it becomes medicine.",
    asks: "look at the difficult material you have learned to hold without dropping, and who benefits from that",
    shadow:
      "Someone able to hold the dangerous thing tends to get handed all of them.",
    lore: "traditional",
  },
  algol: {
    id: "algol",
    constellation: "Perseus",
    image: "the head of the Gorgon",
    theme:
      "Algol is the Demon Star, an eclipsing binary that visibly dims every three days, and it holds the worst reputation in the whole tradition; what it actually marks is the rage that belongs to a real injury, which is not the same thing as a flaw.",
    asks: "look directly at the anger you have decided is not respectable, and at what it is about",
    shadow:
      "The tradition's warning is not about having it. It is about what it costs to keep it out of sight.",
    lore: "traditional",
  },
  zeta_ret_a: {
    id: "zeta_ret_a",
    constellation: "Reticulum",
    image: "the measuring grid",
    theme:
      "Reticulum is named for the reticle, the fine grid in an eyepiece used to fix a position exactly, and Zeta1 is the brighter half of a matched pair of sun-like stars that have travelled together for billions of years.",
    asks: "look at your need to fix things precisely, and at what you are actually trying to hold still",
    shadow:
      "Measuring a thing carefully enough can be a way of not deciding about it.",
    lore: "from the object",
  },
  zeta_ret_b: {
    id: "zeta_ret_b",
    constellation: "Reticulum",
    image: "the second of the pair",
    theme:
      "Zeta2 Reticuli is the fainter twin of a pair so alike they are hard to tell apart, and it is the one carrying a debris disc; the difference between them is not brightness but what each has accumulated.",
    asks: "look at the comparison you keep making, and at what you have that the other side of it does not",
    shadow: "A close comparison can run for a lifetime without ever resolving.",
    lore: "from the object",
  },
  hyades: {
    id: "hyades",
    constellation: "Taurus, the Bull's face",
    image: "the rain sisters",
    theme:
      "The Hyades are the Bull's face and the sisters who wept themselves into the sky; their rising marked the rainy season, and the tradition attached to them is tears and weather that arrives all at once.",
    asks: "look at how your difficult periods tend to come in groups rather than singly",
    shadow:
      "Weather that arrives together can feel like a verdict rather than a season.",
    lore: "traditional",
  },
  andromeda: {
    id: "andromeda",
    constellation: "Andromeda",
    image: "the chained princess",
    theme:
      "Andromeda is both the woman chained to the rock as payment for her mother's boast and the nearest large galaxy to ours, a trillion stars currently approaching us at about a hundred and ten kilometres a second.",
    asks: "look at what you have been carrying that was never actually yours to answer for",
    shadow:
      "Being rescued from something does not automatically settle who put you there.",
    lore: "traditional",
  },
  galactic_center: {
    id: "galactic_center",
    constellation: "Sagittarius",
    image: "the centre everything turns around",
    theme:
      "The Galactic Centre is the axis our whole galaxy rotates about, with a black hole of four million suns at the middle of it, and every star you have ever seen is going around it, including this one.",
    asks: "consider how much of what you take personally is you being carried by something much larger",
    shadow:
      "A sense of the scale of things can be real perspective or a very effective way of not being accountable for anything small.",
    lore: "from the object",
  },
  super_galactic_center: {
    id: "super_galactic_center",
    constellation: "Virgo",
    image: "the centre of the larger structure",
    theme:
      "The Supergalactic Centre is the middle of the cluster our entire galaxy belongs to, a structure so large that our galaxy is a single member of it, and one nobody knew was there until the last century.",
    asks: "look at the pattern you belong to that you have never been able to see the edges of",
    shadow:
      "Belonging to something you cannot see the shape of is hard to tell apart from belonging to nothing.",
    lore: "from the object",
  },
};

/** Every catalogue star must have a meaning before the report can ship. */
export function missingMeanings(starIds: readonly string[]): string[] {
  return starIds.filter((id) => !(id in STAR_MEANINGS));
}
