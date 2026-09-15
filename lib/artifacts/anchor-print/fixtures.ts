import type {
  AnchorNarrative,
  AnchorNarrativeSection,
  AnchorPlanetPlacement,
  AnchorPrintInput,
  AnchorReportSectionId,
} from "./contract.ts";

const KNOWN_PLACEMENTS: readonly AnchorPlanetPlacement[] = [
  { planet: "Sun", longitude: 14.2, sign: "Aries", degree: 14.2, house: 1, retrograde: false },
  { planet: "Mercury", longitude: 352.8, sign: "Pisces", degree: 22.8, house: 12, retrograde: false },
  { planet: "Venus", longitude: 44, sign: "Taurus", degree: 14, house: 2, retrograde: false },
  { planet: "Mars", longitude: 134.9, sign: "Leo", degree: 14.9, house: 5, retrograde: false },
  { planet: "Jupiter", longitude: 232.4, sign: "Scorpio", degree: 22.4, house: 8, retrograde: true },
  { planet: "Saturn", longitude: 278.3, sign: "Capricorn", degree: 8.3, house: 10, retrograde: false },
  { planet: "Uranus", longitude: 300.7, sign: "Aquarius", degree: 0.7, house: 11, retrograde: false },
  { planet: "Neptune", longitude: 282.1, sign: "Capricorn", degree: 12.1, house: 10, retrograde: false },
  { planet: "Pluto", longitude: 210.1, sign: "Scorpio", degree: 0.1, house: 8, retrograde: true },
] as const;

function reportSection(
  id: AnchorReportSectionId,
  eyebrow: string,
  title: string,
  summary: string,
  firstParagraph: string,
  secondParagraph: string,
  keyPoints: readonly [string, string, string],
  sourceFactIds: readonly string[],
): AnchorNarrativeSection {
  return {
    id,
    eyebrow,
    title,
    summary,
    paragraphs: [firstParagraph, secondParagraph],
    keyPoints,
    sourceFactIds,
  };
}

function sections(timeUnknown: boolean): readonly AnchorNarrativeSection[] {
  return [
    reportSection(
      "chart_signature",
      "The whole pattern",
      "A spark that needs something real to build",
      "Aries initiative, Taurus steadiness, and concentrated Scorpio–Capricorn depth make this a chart of decisive beginnings that become meaningful through patient embodiment.",
      "The first impression is direct: the Sun in Aries and Mars in Leo both belong to fire, so vitality rises when there is something honest to begin, make, or champion. Yet this is not a chart made only of ignition. Venus in Taurus, the Moon’s " + (timeUnknown ? "possible emotional signatures" : "Taurus placement") + ", and the strong Capricorn–Scorpio field ask that enthusiasm acquire weight, continuity, and consequence. You may recognize a repeated sequence: an instinct says move, a deeper layer asks whether the choice is durable, and only then does commitment become complete.",
      "This combination can feel contradictory when speed and certainty compete. Its more mature expression is rhythmic rather than conflicted: begin experimentally, listen for what settles in the body, then build structure around what continues to matter. The chart does not require you to become uniformly fast or slow. It describes a person who can initiate bravely and sustain selectively, provided that neither urgency nor caution is allowed to make every decision alone.",
      [
        "Let first movement be a test of aliveness, not an irreversible promise.",
        "Use bodily ease and sustained interest as evidence when choosing what deserves commitment.",
        "Build containers after the spark appears so structure protects energy instead of replacing it.",
      ],
      ["placement.Sun", "placement.Venus", "placement.Saturn", "pattern.elements", "pattern.modalities"],
    ),
    reportSection(
      "identity_and_vitality",
      "Sun · identity",
      "The courage to meet life directly",
      "Your Aries Sun describes identity as an active encounter: you learn who you are by beginning, responding, and discovering what becomes possible through movement.",
      "The Sun at 14.2° Aries favors direct contact with experience. This is less about constant confidence than about a constitutional need to find out by doing. In the " + (timeUnknown ? "absence of reliable houses, the sign remains the stable foundation of interpretation" : "first house, that solar quality is especially visible in self-presentation, initiative, and the right to occupy your own life") + ". Waiting for complete certainty can drain vitality because certainty often arrives after the first honest step rather than before it.",
      "The close trine from the Sun to Mars in Leo gives this solar principle a creative engine. Will and action can cooperate quickly when a choice feels personally meaningful. The shadow is mistaking intensity for alignment or treating every hesitation as weakness. Sustainable confidence grows when you distinguish the heat of immediate reaction from the warmer, steadier conviction that remains after you have slept, listened, and returned.",
      [
        "Name the smallest brave beginning available before demanding a complete plan.",
        "Notice which actions leave you more coherent afterward rather than merely more stimulated.",
        "Practice directness that reveals your position without requiring another person to surrender theirs.",
      ],
      ["placement.Sun", "placement.Mars", "aspect.Sun.Mars.trine"],
    ),
    reportSection(
      "emotional_world",
      "Moon · belonging",
      timeUnknown ? "Holding emotional uncertainty honestly" : "A body-led language of safety",
      timeUnknown
        ? "Because the birth time is unknown and the Moon changes sign that day, emotional interpretation must remain conditional rather than disguising Cancer-or-Leo possibilities as certainty."
        : "Your Taurus Moon seeks enough steadiness, sensory clarity, and material continuity for feeling to become understandable rather than overwhelming.",
      timeUnknown
        ? "The Moon may be in Cancer or Leo. A Cancer Moon would often regulate through privacy, familiarity, caretaking, and a protected sense of home; a Leo Moon would more often need warmth, creative recognition, and room for feeling to be expressed visibly. Both possibilities value loyalty, but they organize safety differently. The report therefore offers these as hypotheses to compare with lived experience, not as interchangeable labels or a forced choice."
        : "The Moon at 18.5° Taurus in the second house describes an emotional system that notices texture, pace, reliability, and the practical conditions of safety. Feelings may clarify gradually through the body: appetite, tension, fatigue, comfort, and the quality of the surrounding environment can speak before language does. This is not emotional simplicity; it is an invitation to let sensation become information instead of dismissing it as background.",
      timeUnknown
        ? "Without a timed chart, houses, angles, and Moon aspects are also unavailable, so the emotional picture should be tested through memory and present observation. Notice what reliably restores you after stress: retreat into familiar care, or renewed confidence through creative warmth. The aim is not to solve the Moon intellectually. It is to preserve a truthful edge around what the available data can and cannot establish."
        : "The Moon’s conjunction with Venus intensifies the connection between attachment, values, and sensory experience. Beauty and comfort can genuinely regulate you, while relational strain may register physically before it becomes conscious. The growth edge is not to reject comfort but to ask whether a comfort is restorative or merely familiar. Emotional security strengthens when pleasure, money, possessions, and affection are allowed to carry distinct meanings.",
      timeUnknown
        ? [
            "Compare Cancer and Leo Moon descriptions against repeated lived patterns, not a single mood.",
            "Track what restores emotional capacity after stress without forcing an astrological conclusion.",
            "Leave houses, angles, and Moon aspects blank unless a reliable birth time is later found.",
          ]
        : [
            "Give feelings time to become bodily specific before demanding an explanation.",
            "Separate restorative comfort from habits that only postpone a necessary conversation.",
            "Treat beauty and material steadiness as legitimate needs without making them tests of love.",
          ],
      timeUnknown
        ? ["placement.Moon", "moon.uncertainty", "time.unknown"]
        : ["placement.Moon", "placement.Venus", "aspect.Moon.Venus.conjunction"],
    ),
    reportSection(
      "rising_and_chart_ruler",
      timeUnknown ? "Birth-time boundary" : "Ascendant · approach",
      timeUnknown ? "What this report refuses to invent" : "Meeting the world through Aries",
      timeUnknown
        ? "No Ascendant, Midheaven, chart ruler by house, or house interpretation is presented because those features change with clock time."
        : "An Aries Ascendant makes immediacy part of your interface with life, while Mars in Leo places the chart ruler in a creative, visible, heart-led register.",
      timeUnknown
        ? "A natal chart can still hold substantial date-stable information without a birth time, but it is not the same chart with a generic noon substituted. The Ascendant moves quickly, the house cusps depend on it, and even the Moon may cross a sign boundary. Omitting those features is not a deficiency to hide; it is the method that keeps the remaining interpretation trustworthy. Sign placements for the non-lunar planets and time-stable aspects remain available."
        : "With the Ascendant at 8.2° Aries, your first response to unfamiliar situations may be to orient through action: test the environment, establish a position, or create forward motion. Others may encounter candor and momentum before they see the slower Taurus and Scorpio layers that govern trust. The task is not to soften this edge into vagueness, but to let directness become an opening rather than a verdict.",
      timeUnknown
        ? "If a reliable recorded time becomes available later, the report can be recalculated as a new personalization. Until then, life topics should not be assigned to houses, and vocational meaning should not be attributed to a Midheaven. Your own biography can still organize reflection, but biography and astronomical calculation should remain clearly distinguished so the narrative never borrows false authority from missing data."
        : "Mars, ruler of the Aries Ascendant, sits in Leo and the fifth house, linking your way of entering life with creativity, authorship, play, risk, and visible self-expression. Because Mars trines the Sun, initiative often restores identity when it is connected to something you can care about openly. The caution is performative urgency: action loses integrity when it exists primarily to secure applause or prove that you are unafraid.",
      timeUnknown
        ? [
            "Use only recorded or reliably documented birth-time evidence for a future recalculation.",
            "Keep sign and stable-aspect insights distinct from house-based life-topic claims.",
            "Let biography guide reflection without presenting it as astronomical proof.",
          ]
        : [
            "Use directness to make contact, then leave room for information to change your approach.",
            "Choose creative risks that express conviction rather than merely displaying courage.",
            "Watch for moments when speed protects you from the vulnerability of being influenced.",
          ],
      timeUnknown
        ? ["time.unknown", "moon.uncertainty"]
        : ["angle.Ascendant", "placement.Mars", "aspect.Sun.Mars.trine"],
    ),
    reportSection(
      "mind_and_communication",
      "Mercury · perception",
      "Imagination that needs a faithful container",
      "Mercury in Pisces receives information through atmosphere, association, image, and felt meaning; its trine to Jupiter can turn those impressions into an unusually spacious frame.",
      "Mercury at 22.8° Pisces suggests a mind that may notice tone before argument and relationship before category. Ideas can arrive as clusters of images, memories, or intuitions whose logic becomes visible only after they are given room. " + (timeUnknown ? "Without houses, the sign and stable Mercury–Jupiter aspect carry the interpretation." : "In the twelfth house, solitude and incubation may be especially important: language often improves after experience has spent time below the level of immediate explanation.") + " Literal or hurried environments can make this intelligence look less precise than it actually is.",
      "The trine to Jupiter in Scorpio supports research, symbolic depth, and the ability to follow an impression toward a larger pattern. Its risk is compelling coherence: a beautiful interpretation can feel true before it has been checked. Your strongest communication process therefore has two movements—receive without premature censorship, then verify without contempt for imagination. Written notes, source tracking, and a deliberate second pass can become bridges between intuition and accountability.",
      [
        "Capture images and associations first; evaluate their claims in a separate pass.",
        "Ask what evidence would strengthen, narrow, or disconfirm an interpretation.",
        "Protect enough quiet for meaning to gather before translating it for an audience.",
      ],
      ["placement.Mercury", "placement.Jupiter", "aspect.Mercury.Jupiter.trine"],
    ),
    reportSection(
      "love_and_values",
      "Venus · reciprocity",
      "Choosing what can be tended",
      "Venus in Taurus values continuity, embodied affection, craft, and relationships whose promises can be felt in repeated behavior rather than dramatic declarations.",
      "Venus at 14° Taurus is in its domicile, giving the Venus principle unusual clarity. You may recognize value through quality, pace, touch, food, sound, reliability, or the care with which something is made. " + (timeUnknown ? "The house cannot be known, so this describes a stable style of valuing rather than a fixed life domain." : "In the second house, relationships and aesthetics are intertwined with resources, self-worth, and the practical right to build a sustainable life.") + " A bond becomes believable when care has texture and recurrence.",
      timeUnknown
        ? "The unknown-time chart includes a close Venus–Mars square among the stable aspects, introducing creative friction between the wish for steadiness and the need for expressive action. Attraction may sharpen around difference, but durable relating requires negotiation after chemistry speaks. The aim is not to choose comfort over vitality; it is to build forms of connection spacious enough for pleasure, honesty, and independent desire."
        : "The conjunction between Venus and the Taurus Moon joins affection with emotional regulation. This can make tenderness deeply nourishing and inconsistency especially disruptive. It can also blur the difference between being loved and being made comfortable. Relational maturity comes through naming needs plainly, allowing change to occur without treating it as betrayal, and noticing when loyalty supports growth versus when it protects an arrangement that no longer feels alive.",
      [
        "Evaluate care through patterns of behavior instead of intensity alone.",
        "Name material, sensory, and pacing needs before they harden into silent tests.",
        "Let stability be a living practice that can adapt, not a demand that nothing change.",
      ],
      timeUnknown
        ? ["placement.Venus", "placement.Mars", "aspect.Venus.Mars.square"]
        : ["placement.Venus", "placement.Moon", "aspect.Moon.Venus.conjunction"],
    ),
    reportSection(
      "desire_and_action",
      "Mars · agency",
      "Action with a visible heart",
      "Mars in Leo acts best when effort carries authorship, generosity, and an honest stake in the result; the Sun trine helps purpose and motion reinforce each other.",
      "Mars at 14.9° Leo describes desire that wants to create, protect, perform, or lead from a recognizable center. You may mobilize quickly when a task feels personally meaningful and lose energy when your contribution must remain entirely anonymous or emotionally detached. " + (timeUnknown ? "The house is unknown, so the interpretation stays with Leo’s expressive style." : "In the fifth house, creative work, play, romance, and chosen risks become especially direct laboratories for courage.") + " Pride here is not inherently a flaw; it is information about where wholehearted participation matters.",
      "The exact trine from the Aries Sun makes decisive action one of your most available resources. Yet ease between planets can become automatic, and automatic confidence can skip consultation, preparation, or the quieter signals of fatigue. Agency becomes more durable when you can act boldly without turning every project into a referendum on your worth. Leadership is strongest when it warms the field for others rather than requiring the field to orbit you.",
      [
        "Choose work in which you can care visibly about the quality of the outcome.",
        "Before acting, distinguish the desire to contribute from the desire to be confirmed.",
        "Use confidence to create room for participation rather than concentrating all authorship.",
      ],
      ["placement.Mars", "placement.Sun", "aspect.Sun.Mars.trine"],
    ),
    reportSection(
      "growth_and_opportunity",
      "Jupiter · expansion",
      "Growth through depth rather than breadth",
      "Jupiter in Scorpio expands through sustained inquiry, emotional honesty, and the willingness to remain with material that cannot be understood at a glance.",
      "Jupiter at 22.4° Scorpio is less interested in collecting reassuring answers than in discovering what changes when a question is followed beneath its social surface. Curiosity may draw you toward psychology, hidden systems, intimacy, crisis, taboo, or the mechanics of trust. " + (timeUnknown ? "Its house is unavailable, so the report does not assign that search to a particular life arena." : "In the eighth house, shared resources, vulnerability, inheritance, and transformation make these themes especially concrete.") + " Growth often begins where superficial certainty stops working.",
      "Because Jupiter is retrograde, convictions may need to be tested inwardly before they can become public principles. The trine to Mercury helps translate depth into language, but it also increases the persuasive force of your interpretations. Opportunity appears when inquiry remains reciprocal—when you allow evidence, other people, and experience to alter the story. Expansion is not measured only by how much you can see, but by how honestly your seeing can be revised.",
      [
        "Follow consequential questions long enough for the first explanation to become more precise.",
        "Treat confidence as permission to investigate, not proof that an interpretation is complete.",
        "Share insight in ways that preserve another person’s right to name their own experience.",
      ],
      ["placement.Jupiter", "placement.Mercury", "aspect.Mercury.Jupiter.trine"],
    ),
    reportSection(
      "responsibility_and_maturity",
      "Saturn · structure",
      "Making imagination accountable to form",
      "Saturn in Capricorn knows how to build standards, roles, and durable structures; its conjunction with Neptune asks those structures to serve meaning rather than harden against it.",
      "Saturn at 8.3° Capricorn is in its domicile, emphasizing competence, consequence, and a sober relationship to time. You may be highly alert to what a commitment actually requires and impatient with promises that have no structure beneath them. " + (timeUnknown ? "Without houses, this is read as a stable approach to responsibility." : "In the tenth house, public work, vocation, authority, and reputation become major sites where responsibility is tested and refined.") + " The gift is endurance; the shadow is carrying standards so relentlessly that no completed effort can feel sufficient.",
      "Neptune’s conjunction with Saturn complicates any purely pragmatic identity. Imagination, longing, compassion, or uncertainty keeps entering the architecture. At times you may alternate between idealizing a calling and distrusting anything that cannot be measured. Integration asks for porous structure: timelines that include recovery, ideals translated into observable practices, and boundaries that protect sensitivity without treating sensitivity as incompetence.",
      [
        "Translate ideals into a next practice, owner, boundary, and review date.",
        "Define enough before beginning while leaving space for reality to revise the structure.",
        "Measure responsibility partly by sustainability, not only by output or endurance.",
      ],
      ["placement.Saturn", "placement.Neptune", "aspect.Saturn.Neptune.conjunction"],
    ),
    reportSection(
      "generational_currents",
      "Outer planets · context",
      "Reforming the structures that shape belonging",
      "Uranus in Aquarius, Neptune in Capricorn, and Pluto in Scorpio describe a generational field concerned with systems, power, community, and the hidden costs of inherited structures.",
      "Uranus at 0.7° Aquarius brings disruption into networks, ideals, and collective intelligence. Neptune at 12.1° Capricorn sensitizes the promises and illusions embedded in institutions, while Pluto at 0.1° Scorpio intensifies encounters with power, secrecy, and irreversible change. These slow planets are not private personality traits in isolation. They become personal where your choices, houses " + (timeUnknown ? "when reliably known" : "and aspects") + ", and biography give their era-specific questions a lived form.",
      "The close Uranus–Pluto square supplies friction between systemic liberation and concentrated power. You may be alert to systems that describe themselves as progressive while reproducing control, or to transformations that destroy form without creating trustworthy alternatives. The work is neither obedience nor disruption for its own sake. It is to participate in change with enough historical memory, relational accountability, and practical design that freedom can become inhabitable.",
      [
        "Ask who gains agency and who absorbs risk when a system is called innovative.",
        "Pair critique with a concrete experiment in governance, access, or shared responsibility.",
        "Distinguish your personal task from a generational atmosphere you were never meant to solve alone.",
      ],
      ["placement.Uranus", "placement.Neptune", "placement.Pluto", "aspect.Uranus.Pluto.square"],
    ),
    reportSection(
      "major_aspects",
      "Aspect web · dynamics",
      "Where the chart’s voices cooperate and contend",
      "Your strongest recorded aspects link fire with action, intuition with depth, structure with imagination, and collective change with concentrated power.",
      timeUnknown
        ? "The Sun–Mars and Mercury–Jupiter trines describe two channels of relative fluency: identity can mobilize action, and associative thought can widen into meaningful inquiry. The Venus–Mars square adds productive friction between steadiness and display, while Saturn conjunct Neptune asks practical form to hold vision. Uranus square Pluto keeps systemic change from becoming an abstract interest. Moon aspects are omitted because the Moon’s position is not stable across the day."
        : "The Sun–Mars and Mercury–Jupiter trines describe two channels of relative fluency: identity can mobilize action, and associative thought can widen into meaningful inquiry. Moon conjunct Venus joins emotional regulation with affection and material value. Saturn conjunct Neptune asks practical form to hold vision, while Uranus square Pluto keeps systemic change from becoming an abstract interest. The chart’s ease aspects provide resources; its harder outer-planet contact supplies pressure and context.",
      "Aspects are relationships, not isolated verdicts. A trine can become underused because it feels natural, while a conjunction can fuse two functions so completely that they are difficult to distinguish. The most useful reading therefore asks what each connection does in actual situations. When action outruns reflection, recruit Taurus and Saturn. When caution becomes immobility, recruit the Aries Sun and Leo Mars. Integration is the deliberate movement of attention across the whole network.",
      [
        "Treat easy aspects as capacities that still require conscious direction and practice.",
        "When one planetary voice dominates, deliberately consult the needs represented by another.",
        "Use recurring real-life situations to test how an aspect behaves under support and under stress.",
      ],
      timeUnknown
        ? [
            "aspect.Sun.Mars.trine",
            "aspect.Mercury.Jupiter.trine",
            "aspect.Venus.Mars.square",
            "aspect.Saturn.Neptune.conjunction",
            "aspect.Uranus.Pluto.square",
          ]
        : [
            "aspect.Sun.Mars.trine",
            "aspect.Moon.Venus.conjunction",
            "aspect.Mercury.Jupiter.trine",
            "aspect.Saturn.Neptune.conjunction",
            "aspect.Uranus.Pluto.square",
          ],
    ),
    reportSection(
      "relationship_patterns",
      "Connection · boundaries",
      "Durability without possession, honesty without force",
      "Your relational pattern asks for dependable care and embodied presence while preserving enough creative fire for each person to remain recognizably alive.",
      "Venus in Taurus establishes a strong preference for what can be trusted through repetition. The Aries Sun and Leo Mars, however, need candor, authorship, and room to act. Relationship therefore cannot be reduced either to uninterrupted harmony or unrestricted independence. You may feel most secure when promises are consistent, yet most attracted to exchanges with warmth and vitality. The task is to build agreements that support both steadiness and distinct personhood.",
      timeUnknown
        ? "The stable Venus–Mars square makes this negotiation explicit: comfort and desire may use different tempos. Friction can be creative when differences are named before they become tests or performances. Because lunar needs remain uncertain, this report does not pretend to define a complete attachment pattern. It invites observation of what your nervous system actually does around closeness, conflict, visibility, and repair."
        : "The Moon–Venus conjunction makes relational atmosphere physically consequential. Care can settle the body, and inconsistency can register as threat before conscious appraisal catches up. This sensitivity deserves communication rather than shame. Repair becomes more possible when you state what happened, what meaning you made, and what concrete recurrence would rebuild trust—without requiring comfort to erase every legitimate difference.",
      [
        "Turn unspoken loyalty tests into specific, negotiable requests.",
        "Protect continuity with repair practices rather than demanding that conflict never occur.",
        "Make room for separate desire and authorship inside dependable commitment.",
      ],
      timeUnknown
        ? ["placement.Venus", "placement.Mars", "aspect.Venus.Mars.square", "time.unknown"]
        : ["placement.Venus", "placement.Moon", "aspect.Moon.Venus.conjunction", "placement.Mars"],
    ),
    reportSection(
      "work_and_calling",
      "Contribution · vocation",
      "Building a form strong enough to carry vision",
      timeUnknown
        ? "The untimed chart supports a vocational reflection through planetary style, but it cannot honestly assign career meaning to a Midheaven or tenth house."
        : "A Capricorn Midheaven with Saturn and Neptune in the tenth house points toward work that joins rigorous stewardship with imagination, service, or symbolic vision.",
      timeUnknown
        ? "Saturn and Neptune in Capricorn describe a stable tension between practical accountability and an ideal that is difficult to reduce to metrics. You may be drawn to building systems, making ambiguous work usable, or protecting meaning from careless execution. Yet no reliable Midheaven or house placement can be calculated. Career conclusions should therefore be grounded in demonstrated skill, circumstance, and desire, with astrology serving as a reflective vocabulary rather than a placement-based verdict."
        : "The Midheaven at 9.1° Capricorn makes public contribution a field of construction, mastery, and long-range responsibility. Saturn nearby strengthens the demand for competence, while Neptune insists that achievement without meaning will eventually feel hollow. You may be suited to roles that translate vision into systems, but the title matters less than the integrity of the container: expectations, resources, authority, and purpose must be able to coexist.",
      "The Aries–Leo fire in the chart adds entrepreneurial and creative force to the Capricorn structure. You are unlikely to thrive indefinitely as a caretaker of processes you cannot influence. At the same time, inspiration alone will not satisfy the part of you that respects durable work. A compelling vocation may alternate between initiating and institutionalizing: seeing what should exist, making a first living version, and then designing the stewardship that allows it to outlast the initial blaze.",
      [
        "Evaluate opportunities by authority, purpose, resources, and sustainability—not title alone.",
        "Choose structures that let you influence the work instead of only carrying its consequences.",
        "Plan for stewardship and maintenance while the founding energy is still available.",
      ],
      timeUnknown
        ? ["placement.Saturn", "placement.Neptune", "aspect.Saturn.Neptune.conjunction", "time.unknown"]
        : ["angle.Midheaven", "placement.Saturn", "placement.Neptune", "aspect.Saturn.Neptune.conjunction"],
    ),
    reportSection(
      "integration_and_practice",
      "Living the chart",
      "A rhythm of spark, sensing, depth, and structure",
      "The chart becomes most useful as a repeatable sequence: begin honestly, listen through the body, investigate what matters, and build a form that can sustain the discovery.",
      "No single placement has to carry your entire identity. Aries and Leo supply ignition and visible courage; Taurus tests whether an impulse can be inhabited; Scorpio asks what is true beneath convenience; Capricorn gives the choice consequence and duration. Problems arise when one stage attempts to replace the others—when fire declares a commitment before values are clear, when earth protects stability after vitality has gone, or when depth becomes analysis without a lived next step.",
      "A practical integration ritual can be simple. First, name the desire without editing it into respectability. Second, notice the body’s response and the values at stake. Third, identify the fear, power dynamic, or unspoken cost beneath the surface. Finally, choose a structure: one action, one boundary, one resource, and one time to review. Astrology earns its place here by helping attention move, not by making the decision on your behalf.",
      [
        "Move decisions through desire, sensation, depth, and structure before calling them complete.",
        "When stuck, identify which stage of the sequence has been skipped or allowed to dominate.",
        "Review choices after lived experience and revise without treating revision as failure.",
      ],
      ["pattern.elements", "pattern.modalities", "placement.Sun", "placement.Venus", "placement.Jupiter", "placement.Saturn"],
    ),
  ];
}

function narrative(timeUnknown: boolean): AnchorNarrative {
  return {
    generationMethod: timeUnknown ? "human" : "ai_assisted_human_reviewed",
    model: timeUnknown ? null : "fixture-model-not-for-production",
    promptVersion: "natal-report.fixture.v2",
    tokenUsage: timeUnknown
      ? null
      : { inputTokens: 4_800, outputTokens: 4_950, totalTokens: 9_750 },
    openingLetter: [
      "A natal chart is not a verdict about who you must become. It is a symbolic map of recurring orientations: how different parts of life may seek expression, what kinds of tension ask for participation, and which capacities can become more available through attention. This report begins with the astronomical placements, keeps uncertainty visible, and then develops interpretations that you can test against experience rather than accept on authority.",
      timeUnknown
        ? "Because the birth time is unknown, this edition deliberately omits the Ascendant, Midheaven, houses, and time-sensitive lunar claims. That boundary leaves a meaningful report: the non-lunar sign placements and stable aspects still describe a layered pattern. Read slowly, mark what feels precise, question what does not, and let your biography remain the final context in which any astrological language earns meaning."
        : "Your chart combines immediate fire, embodied earth, and a strong current of emotional and structural depth. The pages ahead move from calculation to synthesis: first the chart and pattern counts, then fourteen interpretive chapters, and finally reflection prompts and method notes. Read slowly, mark what feels precise, question what does not, and allow contradictory passages to remain in conversation rather than forcing them into a single trait.",
    ],
    sections: sections(timeUnknown),
    reflectionPrompts: [
      "Where does a first honest step create information that extended preparation cannot provide?",
      "Which sensations reliably distinguish restorative steadiness from familiar avoidance?",
      "When does directness create contact, and when does it protect me from being influenced?",
      "What do my repeated choices reveal about the difference between comfort and value?",
      "Where could imagination become more trustworthy through a boundary, schedule, or material practice?",
      "Which relationships support both dependable care and the right to remain distinct?",
      "What kind of contribution would let creative authorship and responsible stewardship cooperate?",
      "Which part of the sequence—desire, sensation, depth, or structure—needs my attention now?",
    ],
  };
}

function placements(timeUnknown: boolean): readonly AnchorPlanetPlacement[] {
  return KNOWN_PLACEMENTS.map((placement) => ({
    ...placement,
    house: timeUnknown ? null : placement.house,
  }));
}

export function knownTimeAnchorFixture(): AnchorPrintInput {
  return {
    artifactId: "art_fixture_known_001",
    displayName: "Avery",
    normalizedBirth: {
      date: "1990-04-04",
      time: "08:30",
      timeUnknown: false,
      city: "Portland",
      country: "United States",
      timezone: "America/Los_Angeles",
      latitude: 45.5152,
      longitude: -122.6784,
    },
    calculation: {
      placements: placements(false),
      moon: {
        kind: "exact",
        longitude: 48.5,
        sign: "Taurus",
        degree: 18.5,
        house: 2,
      },
      angles: {
        ascendantLongitude: 8.2,
        ascendantSign: "Aries",
        midheavenLongitude: 279.1,
        midheavenSign: "Capricorn",
      },
      aspects: [
        { first: "Sun", second: "Mars", type: "trine", orb: 0.7 },
        { first: "Moon", second: "Venus", type: "conjunction", orb: 4.5 },
        { first: "Mercury", second: "Jupiter", type: "trine", orb: 0.4 },
        { first: "Saturn", second: "Neptune", type: "conjunction", orb: 3.8 },
        { first: "Uranus", second: "Pluto", type: "square", orb: 0.6 },
      ],
      provenance: {
        zodiac: "tropical",
        houseSystem: "whole_sign",
        calculationVersion: "anchor-calculation.fixture.v1",
        ephemerisProvider: "astronomia",
        ephemerisVersion: "4.2.0",
        timezoneProvenance: "IANA:America/Los_Angeles",
        chartFingerprint: "sha256:" + "a".repeat(64),
      },
    },
    narrative: narrative(false),
  };
}

export function unknownTimeAnchorFixture(): AnchorPrintInput {
  return {
    artifactId: "art_fixture_unknown_001",
    displayName: null,
    normalizedBirth: {
      date: "1990-04-04",
      time: null,
      timeUnknown: true,
      city: "Portland",
      country: "United States",
      timezone: "America/Los_Angeles",
      latitude: 45.5152,
      longitude: -122.6784,
    },
    calculation: {
      placements: placements(true),
      moon: {
        kind: "sign_uncertain",
        possibleSigns: ["Cancer", "Leo"],
      },
      angles: {
        ascendantLongitude: null,
        ascendantSign: null,
        midheavenLongitude: null,
        midheavenSign: null,
      },
      aspects: [
        { first: "Sun", second: "Mars", type: "trine", orb: 0.7 },
        { first: "Mercury", second: "Jupiter", type: "trine", orb: 0.4 },
        { first: "Venus", second: "Mars", type: "square", orb: 0.9 },
        { first: "Saturn", second: "Neptune", type: "conjunction", orb: 3.8 },
        { first: "Uranus", second: "Pluto", type: "square", orb: 0.6 },
      ],
      provenance: {
        zodiac: "tropical",
        houseSystem: "whole_sign",
        calculationVersion: "anchor-calculation.fixture.v1",
        ephemerisProvider: "astronomia",
        ephemerisVersion: "4.2.0",
        timezoneProvenance: "IANA:America/Los_Angeles",
        chartFingerprint: "sha256:" + "b".repeat(64),
      },
    },
    narrative: narrative(true),
  };
}
