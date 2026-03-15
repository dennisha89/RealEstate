// lib/brand.ts
// Centralized brand constants for Xuan (玄)
// Import from here — never hardcode brand strings in components

export const BRAND = {
  name: "Xuan",
  character: "玄",
  fullName: "玄 Xuan",
  tagline: "Read the forces that shape where wealth gathers.",
  philosophy: "天地人合一 — When Heaven, Earth, and Man align, wealth follows.",

  // The three realms
  realms: {
    heaven: { name: "天 Heaven", description: "Forces above — rates, cycles, timing" },
    earth: { name: "地 Earth", description: "Ground truth — markets, locations, deals" },
    human: { name: "人 Human", description: "Behavior — investors, tenants, capital flow" },
    guardian: { name: "守護 Guardian", description: "Protection — risk, stress testing, exit" },
  },

  // The 12 forces (confluence engines)
  forces: {
    dragonLair: { code: "龍穴", name: "Dragon's Lair", realm: "earth", description: "Where wealth gathers" },
    jadeTest: { code: "玉石", name: "Jade Test", realm: "earth", description: "Separating precious from worthless" },
    earthVeins: { code: "地脈", name: "Earth Veins", realm: "earth", description: "Supply channels" },
    brightHall: { code: "明堂", name: "Bright Hall", realm: "earth", description: "The precise location" },
    celestialRiver: { code: "天河", name: "Celestial River", realm: "heaven", description: "Capital flow from policy to property" },
    heavensTiming: { code: "天時", name: "Heaven's Timing", realm: "heaven", description: "The cosmic moment to act" },
    fortuneMomentum: { code: "運勢", name: "Fortune's Momentum", realm: "heaven", description: "The rising and falling of fate" },
    humanEnergy: { code: "人氣", name: "Human Energy", realm: "human", description: "Demand life force" },
    humanHeart: { code: "人心", name: "Human Heart", realm: "human", description: "Buyer behavior patterns" },
    collectiveVision: { code: "眾望", name: "Collective Vision", realm: "human", description: "Crowd intelligence" },
    familyEmpire: { code: "家業", name: "Family Empire", realm: "human", description: "Your wealth dynasty" },
    guardian: { code: "護法", name: "Guardian", realm: "guardian", description: "Wealth protector" },
  },

  // Scoring names
  scores: {
    destiny: { code: "命數", name: "Destiny Score" },
    heavensWill: { code: "天意", name: "Heaven's Will" },
    harmony: { code: "合一", name: "Unity" },
    fiveElements: { code: "五行", name: "Five Elements" },
    yinYang: { code: "陰陽", name: "Yin-Yang" },
    mandate: { code: "天命", name: "Mandate of Heaven" },
  },

  // System names
  systems: {
    master: { code: "天機", name: "The Reading" },
    pathway: { code: "天機", name: "Investment Pathway" },
    oracle: { code: "天命", name: "Mandate of Heaven" },
    stressTest: { code: "劫難", name: "Trial of Tribulation" },
    exitStrategy: { code: "歸途", name: "Return Path" },
    buyBox: { code: "尋寶", name: "Treasure Hunt" },
    dealPipeline: { code: "聚寶盆", name: "Treasure Basin" },
    decisionJournal: { code: "悟道", name: "Enlightenment Path" },
    memo: { code: "聖旨", name: "Imperial Decree" },
  },

  // Verdict labels
  verdicts: {
    STRONG_BUY: "Heaven's Will is clear",
    BUY: "Forces aligned",
    LEAN_BUY: "Favorable reading",
    NEUTRAL: "Forces in tension",
    LEAN_PASS: "Guardian advises patience",
    PASS: "Forces scattered",
    HARD_PASS: "Heaven says: not this path",
  } as Record<string, string>,
} as const;
