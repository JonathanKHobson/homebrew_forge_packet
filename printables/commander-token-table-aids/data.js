const token = "token";
const tracker = "tracker";
const helper = "helper";

const definitions = {
  squirrel: {
    kind: token,
    title: "Squirrel",
    subtitle: "1/1 green Creature - Squirrel",
    pt: "1/1",
    text: "Small creature token. Use for Hazel, squirrel makers, and copied squirrel boards.",
    tags: ["Squirreled Away", "Scrappy Survivors"],
    accent: "green"
  },
  pest: {
    kind: token,
    title: "Pest",
    subtitle: "1/1 black-green Creature - Pest",
    pt: "1/1",
    text: "When this creature dies, you gain 1 life.",
    tags: ["Witherbloom"],
    accent: "blackgreen"
  },
  saproling: {
    kind: token,
    title: "Saproling",
    subtitle: "1/1 green Creature - Saproling",
    pt: "1/1",
    text: "Plant-like creature token. Good for repeat upkeep token makers.",
    tags: ["Witherbloom"],
    accent: "green"
  },
  eldraziSpawn: {
    kind: token,
    title: "Eldrazi Spawn",
    subtitle: "0/1 colorless Creature - Eldrazi Spawn",
    pt: "0/1",
    text: "Sacrifice this creature: add one colorless mana.",
    tags: ["Witherbloom"],
    accent: "gray"
  },
  eldrazi: {
    kind: token,
    title: "Eldrazi",
    subtitle: "10/10 colorless Creature - Eldrazi",
    pt: "10/10",
    text: "Large colorless creature token. Copying this is a real board event.",
    tags: ["Squirreled Away"],
    accent: "gray"
  },
  treasure: {
    kind: token,
    title: "Treasure",
    subtitle: "Artifact - Treasure",
    text: "Tap, sacrifice: add one mana of any color.",
    tags: ["Shared resource"],
    accent: "gold"
  },
  food: {
    kind: token,
    title: "Food",
    subtitle: "Artifact - Food",
    text: "2, tap, sacrifice: you gain 3 life.",
    tags: ["Shared resource"],
    accent: "green"
  },
  clue: {
    kind: token,
    title: "Clue",
    subtitle: "Artifact - Clue",
    text: "2, sacrifice: draw a card.",
    tags: ["Squirreled Away"],
    accent: "blue"
  },
  copy: {
    kind: token,
    title: "Copy",
    subtitle: "Token copy marker",
    text: "Represents a copy. Write source here:",
    writeLine: "Source",
    tags: ["Shared"],
    accent: "purple"
  },
  rat: {
    kind: token,
    title: "Rat",
    subtitle: "1/1 black Creature - Rat",
    pt: "1/1",
    text: "Creature token. Useful when aristocrats or sacrifice loops build a wide board.",
    tags: ["Squirreled Away"],
    accent: "black"
  },
  shapeshifter: {
    kind: token,
    title: "Shapeshifter",
    subtitle: "2/2 colorless Creature - Shapeshifter",
    pt: "2/2",
    text: "Changeling. This token is every creature type.",
    tags: ["Squirreled Away"],
    accent: "purple"
  },
  wolf: {
    kind: token,
    title: "Wolf",
    subtitle: "2/2 green Creature - Wolf",
    pt: "2/2",
    text: "Creature token. Keep separate from squirrel piles.",
    tags: ["Squirreled Away"],
    accent: "green"
  },
  zombieDecayed: {
    kind: token,
    title: "Zombie",
    subtitle: "2/2 black Creature - Zombie",
    pt: "2/2",
    text: "Decayed: cannot block. When it attacks, sacrifice it at end of combat.",
    tags: ["Witherbloom"],
    accent: "black"
  },
  snake: {
    kind: token,
    title: "Snake",
    subtitle: "1/1 black Creature - Snake",
    pt: "1/1",
    text: "Deathtouch. Good for Ophiomancer-style repeated upkeep tokens.",
    tags: ["Witherbloom"],
    accent: "blackgreen"
  },
  junk: {
    kind: token,
    title: "Junk",
    subtitle: "Artifact - Junk",
    text: "Tap, sacrifice: exile the top card of your library. You may play it this turn. Sorcery speed.",
    tags: ["Scrappy Survivors"],
    accent: "rust"
  },
  settlement: {
    kind: token,
    title: "Settlement",
    subtitle: "green Enchantment - Aura",
    text: "Enchant land. Enchanted land has tap: add one mana of any color.",
    tags: ["Scrappy Survivors"],
    accent: "green"
  },
  humanSoldier: {
    kind: token,
    title: "Human Soldier",
    subtitle: "1/1 white Creature - Human Soldier",
    pt: "1/1",
    text: "Creature token. Use for Preston and settlement package turns.",
    tags: ["Scrappy Survivors"],
    accent: "white"
  },
  radiation: {
    kind: helper,
    title: "Radiation",
    subtitle: "Rad counter helper",
    text: "At upkeep, mill cards equal to your rad counters. Lose 1 life for each nonland milled this way. Remove that many rad counters.",
    tags: ["Fallout"],
    accent: "lime"
  },
  wastelandGuide: {
    kind: helper,
    title: "Wasteland Survival Guide",
    subtitle: "persistent reminder",
    text: "Use as a deck-specific named helper. Keep it visible when the source card creates it.",
    tags: ["Scrappy Survivors"],
    accent: "rust"
  },
  moogle: {
    kind: token,
    title: "Moogle",
    subtitle: "1/2 white Creature - Moogle",
    pt: "1/2",
    text: "Lifelink.",
    tags: ["Revival Trance"],
    accent: "white"
  },
  blackjack: {
    kind: token,
    title: "The Blackjack",
    subtitle: "legendary Artifact - Vehicle",
    pt: "3/3",
    text: "Flying, crew 2.",
    tags: ["Revival Trance"],
    accent: "red"
  },
  monarch: {
    kind: helper,
    title: "The Monarch",
    subtitle: "table-state helper",
    text: "End step: draw a card. If a creature deals combat damage to you, its controller becomes the monarch.",
    tags: ["Shared"],
    accent: "gold"
  },
  citysBlessing: {
    kind: helper,
    title: "City's Blessing",
    subtitle: "Ascend helper",
    text: "You have the city's blessing for the rest of the game once you control ten or more permanents.",
    tags: ["Witherbloom"],
    accent: "gold"
  },
  deathTrigger: {
    kind: tracker,
    title: "Death Trigger",
    subtitle: "watch the stack",
    text: "A creature died. Check Blood Artist, Zulaport Cutthroat, Moldervine Reclamation, Mazirek, and similar cards.",
    tags: ["Witherbloom"],
    accent: "blackgreen"
  },
  lifeGained: {
    kind: tracker,
    title: "Life Gained This Turn",
    subtitle: "lifegain tracker",
    text: "Mark this when Pest, Food, lifelink, or drain effects gain life.",
    tags: ["Witherbloom", "Revival Trance"],
    accent: "green"
  },
  creatureDied: {
    kind: tracker,
    title: "Creature Died",
    subtitle: "this turn",
    text: "Use near effects that care whether your creature died this turn.",
    tags: ["Witherbloom"],
    accent: "black"
  },
  beastmaster: {
    kind: tracker,
    title: "Beastmaster Ascension",
    subtitle: "active reminder",
    text: "When active, creatures you control get +5/+5. Keep this card visible once the threshold is met.",
    tags: ["Squirreled Away"],
    accent: "green"
  },
  garruk: {
    kind: tracker,
    title: "Garruk Emblem",
    subtitle: "persistent effect",
    text: "Creatures you control get +3/+3 and have trample. Keep visible if the emblem exists.",
    tags: ["Squirreled Away"],
    accent: "green"
  },
  attached: {
    kind: tracker,
    title: "Aura/Equipment Attached",
    subtitle: "Dogmeat check",
    text: "When an enchanted/equipped creature attacks, check Dogmeat and related attack triggers.",
    tags: ["Scrappy Survivors"],
    accent: "rust"
  },
  junkPlayable: {
    kind: tracker,
    title: "Junk Card Playable",
    subtitle: "this turn only",
    text: "Put exiled Junk cards near this marker so they do not get forgotten before the turn ends.",
    tags: ["Scrappy Survivors"],
    accent: "rust"
  },
  reanimateTarget: {
    kind: tracker,
    title: "Reanimation Target",
    subtitle: "power 3 or less",
    text: "Mark legal graveyard targets for Terra-style reanimation lines.",
    tags: ["Revival Trance"],
    accent: "red"
  },
  returnedTapped: {
    kind: tracker,
    title: "Returned Tapped",
    subtitle: "this turn",
    text: "Put on creatures returned from graveyard so they do not blend into normal board state.",
    tags: ["Revival Trance"],
    accent: "red"
  },
  milledThisTurn: {
    kind: tracker,
    title: "Milled This Turn",
    subtitle: "graveyard setup",
    text: "Use while resolving self-mill, discard, or setup turns.",
    tags: ["Revival Trance"],
    accent: "purple"
  },
  commanderDamage: {
    kind: tracker,
    title: "Commander Damage",
    subtitle: "write player totals",
    text: "P1: ____  P2: ____  P3: ____  P4: ____",
    tags: ["Scrappy Survivors"],
    accent: "rust"
  },
  abilityGranted: {
    kind: tracker,
    title: "Ability Granted",
    subtitle: "write keyword/source",
    text: "Ability: __________________  Source: __________________  Until: ______",
    tags: ["Equipment", "Aura"],
    accent: "blue"
  },
  basePowerToughness: {
    kind: tracker,
    title: "Base P/T Changed",
    subtitle: "write new base stats",
    text: "Base: ____ / ____  Source: __________________  Until: ______",
    tags: ["Fallout", "Shared"],
    accent: "purple"
  },
  statModifier: {
    kind: tracker,
    title: "Stat Modifier",
    subtitle: "non-counter boost",
    text: "Modifier: +____ / +____  Source: __________________  Until: ______",
    tags: ["Shared"],
    accent: "gold"
  },
  blank: {
    kind: tracker,
    title: "Blank Reminder",
    subtitle: "write your own",
    text: "Card: ____________________  Trigger: ____________________  Count: ______",
    tags: ["Shared"],
    accent: "gray"
  }
};

const repeat = (id, count) => Array.from({ length: count }, () => id);
const repeatLabel = (label, count) => Array.from({ length: count }, () => label);

const statAndCounterLabels = [
  ...repeatLabel("+1/+1", 10),
  ...repeatLabel("-1/-1", 6),
  ...repeatLabel("+0/+1", 4),
  ...repeatLabel("+0/+2", 4),
  ...repeatLabel("+1/+0", 4),
  ...repeatLabel("+2/+0", 4),
  ...repeatLabel("+1/+2", 3),
  ...repeatLabel("+2/+1", 3),
  ...repeatLabel("+2/+2", 3),
  ...repeatLabel("+3/+3", 3),
  ...repeatLabel("+5/+5", 2),
  ...repeatLabel("base 0/1", 3),
  ...repeatLabel("base 1/1", 3),
  ...repeatLabel("base 2/2", 3),
  ...repeatLabel("base 3/3", 2),
  ...repeatLabel("base 4/4", 2),
  ...repeatLabel("base 5/5", 2),
  ...repeatLabel("base 9/10", 4),
  ...repeatLabel("charge", 2),
  ...repeatLabel("quest", 2),
  ...repeatLabel("acorn", 2),
  ...repeatLabel("loyalty", 2),
  ...repeatLabel("rad", 2),
  ...repeatLabel("blank", 5)
];

const abilityAndStateLabels = [
  ...repeatLabel("flying", 4),
  ...repeatLabel("double strike", 4),
  ...repeatLabel("first strike", 3),
  ...repeatLabel("trample", 4),
  ...repeatLabel("deathtouch", 3),
  ...repeatLabel("lifelink", 3),
  ...repeatLabel("vigilance", 3),
  ...repeatLabel("haste", 3),
  ...repeatLabel("reach", 2),
  ...repeatLabel("menace", 2),
  ...repeatLabel("ward", 2),
  ...repeatLabel("hexproof", 2),
  ...repeatLabel("indestructible", 2),
  ...repeatLabel("cannot block", 3),
  ...repeatLabel("cannot attack", 2),
  ...repeatLabel("tapped", 4),
  ...repeatLabel("stunned", 2),
  ...repeatLabel("shield", 2),
  ...repeatLabel("goaded", 2),
  ...repeatLabel("equipped", 3),
  ...repeatLabel("enchanted", 3),
  ...repeatLabel("copy", 3),
  ...repeatLabel("exile playable", 3),
  ...repeatLabel("grave target", 4),
  ...repeatLabel("returned tapped", 3),
  ...repeatLabel("death trigger", 3),
  ...repeatLabel("life gained", 2),
  ...repeatLabel("sac trigger", 2),
  ...repeatLabel("blank", 2)
];

const sheets = [
  {
    type: "cover",
    title: "Commander Token Table Aids",
    subtitle: "Print-light duplex PDF for Witherbloom, Squirreled Away, Scrappy Survivors, and Revival Trance"
  },
  {
    title: "Fast Shared Token Sheet",
    note: "Print this first. Reprint it when Squirrel/Pest/Junk piles run short.",
    cards: [
      ...repeat("squirrel", 2),
      ...repeat("pest", 2),
      ...repeat("junk", 2),
      "treasure",
      "food",
      "copy"
    ]
  },
  {
    title: "Shared Resource Sheet",
    note: "Generic resource tokens that show up across games.",
    cards: [
      ...repeat("treasure", 3),
      ...repeat("food", 2),
      ...repeat("clue", 2),
      ...repeat("copy", 2)
    ]
  },
  {
    title: "Squirreled Away Sheet",
    note: "Hazel and token-copy board states.",
    cards: [
      ...repeat("squirrel", 4),
      ...repeat("rat", 2),
      "shapeshifter",
      "wolf",
      "eldrazi"
    ]
  },
  {
    title: "Witherbloom Sheet",
    note: "Sacrifice fodder, lifegain, and graveyard table state.",
    cards: [
      ...repeat("pest", 3),
      ...repeat("saproling", 2),
      ...repeat("eldraziSpawn", 2),
      "zombieDecayed",
      "snake"
    ]
  },
  {
    title: "Scrappy Survivors Sheet",
    note: "Dogmeat, Junk, Settlement, and rad-counter helpers.",
    cards: [
      ...repeat("junk", 5),
      "settlement",
      "humanSoldier",
      "squirrel",
      "radiation"
    ]
  },
  {
    title: "Revival Trance Sheet",
    note: "Moogle, copy, treasure, and Vehicle helpers.",
    cards: [
      ...repeat("moogle", 4),
      ...repeat("copy", 2),
      ...repeat("treasure", 2),
      "blackjack"
    ]
  },
  {
    title: "Deck-State Reminder Sheet",
    note: "Persistent reminders for the messy board-state effects.",
    cards: [
      "deathTrigger",
      "lifeGained",
      "creatureDied",
      "abilityGranted",
      "basePowerToughness",
      "statModifier",
      "beastmaster",
      "garruk",
      "attached"
    ]
  },
  {
    title: "Graveyard and Copy Reminder Sheet",
    note: "Useful for Revival Trance and any copy-heavy turns.",
    cards: [
      ...repeat("reanimateTarget", 2),
      ...repeat("returnedTapped", 2),
      "milledThisTurn",
      ...repeat("copy", 2),
      "commanderDamage",
      "blank"
    ]
  },
  {
    type: "label-sheet",
    title: "Counter and Stat Labels",
    labels: statAndCounterLabels
  },
  {
    type: "label-sheet",
    title: "Ability and State Labels",
    labels: abilityAndStateLabels
  }
];

window.tableAidData = {
  definitions,
  sheets
};
