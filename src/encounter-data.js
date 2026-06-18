export const PHASES = {
  idle: {
    label: "Waiting",
    prayer: "None",
    prayerIcon: "—",
    prayerNote: "Start the encounter to receive a recommendation.",
    position: "general",
    positionTitle: "Outer edge, clear of the centre lanes",
    positionBody: "Stay near the outer wall and avoid standing in the north/south/east/west lanes through the centre."
  },
  smoke: {
    label: "Smoke",
    prayer: "Deflect Magic",
    prayerIcon: "M",
    prayerNote: "Smoke attacks use magic. Re-enable prayer quickly if drag or No Escape disables it.",
    position: "northwest",
    positionTitle: "North-west outer quadrant",
    positionBody: "Lure Nex away from the central cross. Stay near Fumus without standing in a corridor that Nex can charge through."
  },
  shadow: {
    label: "Shadow",
    prayer: "Deflect Ranged",
    prayerIcon: "R",
    prayerNote: "Shadow-phase attacks are classified as ranged.",
    position: "northeast",
    positionTitle: "North-east outer quadrant",
    positionBody: "Move toward Umbra while keeping distance from Nex. Step off every shadow immediately and avoid prolonged melee distance."
  },
  blood: {
    label: "Blood",
    prayer: "Deflect Magic",
    prayerIcon: "M",
    prayerNote: "Blood attacks use magic and can heal Nex when they land.",
    position: "southeast",
    positionTitle: "South-east, ready for Cruor",
    positionBody: "Keep Nex positioned so you can reach Cruor quickly. Do not cluster in duo because blood attacks can affect nearby players."
  },
  ice: {
    label: "Ice",
    prayer: "Deflect Magic",
    prayerIcon: "M",
    prayerNote: "Keep magic protection active to reduce freezes and prayer-draining ice attacks.",
    position: "southwest",
    positionTitle: "South-west, ready for Glacies",
    positionBody: "Stay ready to move away from Nex on Contain This. In duo, the free player should be positioned to break an ice prison."
  },
  zaros: {
    label: "Zaros",
    prayer: "Deflect Magic",
    prayerIcon: "M",
    prayerNote: "Magic is the safe default. Keep distance from the primary target to avoid cleaving melee in duo.",
    position: "outer",
    positionTitle: "Outer ring with clear separation",
    positionBody: "Keep Nex controlled near the outside. Do not stand beside the primary target, and move away before Wrath after the kill."
  },
  complete: {
    label: "Complete",
    prayer: "Move away",
    prayerIcon: "!",
    prayerNote: "Nex uses Wrath on death. Leave the immediate area before looting.",
    position: "outer",
    positionTitle: "Move away from Nex",
    positionBody: "Create distance until Wrath resolves, then return for the drop."
  }
};

export const MECHANICS = {
  virus: {
    phase: "smoke",
    title: "Virus",
    callout: "Spread out and keep overloads active",
    body: "Do not stand next to your partner. The virus can spread between nearby players.",
    ability: "Use Anticipation early; save Freedom for a drag if possible.",
    next: "noEscape",
    autos: 5,
    urgent: true
  },
  noEscape: {
    phase: "smoke",
    title: "No Escape",
    callout: "Leave the centre lanes now",
    body: "Nex is charging through a corridor toward the centre. Move perpendicular to the lane and re-enable prayer afterward.",
    ability: "Use your movement ability if the lane is unsafe.",
    next: "virus",
    autos: 5,
    urgent: true
  },
  darkness: {
    phase: "shadow",
    title: "Embrace Darkness",
    callout: "Create distance from Nex",
    body: "The closer you remain to Nex, the more dangerous the darkness becomes.",
    ability: "Use movement to create a straight-line gap; do not remain in melee distance.",
    next: "shadowTrap",
    autos: 0,
    urgent: false
  },
  shadowTrap: {
    phase: "shadow",
    title: "Shadow Trap",
    callout: "Step off your current tile",
    body: "A shadow has formed under players in range. Move at least one tile immediately.",
    ability: "Move first, then resume damage. Save a defensive for mistakes rather than tanking the trap.",
    next: "darkness",
    autos: 4,
    urgent: true
  },
  siphon: {
    phase: "blood",
    title: "Blood Siphon",
    callout: "Stop damaging Nex",
    body: "Damage dealt during the siphon animation heals Nex. Prepare to resume as the animation ends.",
    ability: "Cease attacks, build safely, then use your non-bleed burst as the siphon finishes.",
    next: "sacrifice",
    autos: 3,
    urgent: true
  },
  sacrifice: {
    phase: "blood",
    title: "Blood Sacrifice",
    callout: "Targeted player: move at least seven tiles away",
    body: "Use a movement ability and create distance before the sacrifice resolves.",
    ability: "Surge, Escape, or Dive away. Continue avoiding bleeds and damage-over-time effects in Blood phase.",
    next: "siphon",
    autos: 3,
    urgent: true
  },
  icePrison: {
    phase: "ice",
    title: "Ice Prison",
    callout: "Prepare Freedom and a defensive",
    body: "The trapped player will lose overhead protection. In duo, the other player should break an icicle immediately.",
    ability: "Freedom the bleed/stun, restore prayer, and use Resonance or Reflect if Nex follows with a heavy hit.",
    next: "contain",
    autos: 3,
    urgent: true
  },
  contain: {
    phase: "ice",
    title: "Contain This",
    callout: "Move away from Nex",
    body: "Icicles will form near Nex after the slam. Leave the nearby area before they appear.",
    ability: "Use movement if Nex chases or if you are still close to the centre of the icicle area.",
    next: "icePrison",
    autos: 3,
    urgent: true
  },
  wrath: {
    phase: "complete",
    title: "Wrath",
    callout: "Move away before looting",
    body: "Nex is dead but Wrath can still damage nearby players.",
    ability: "Use movement to clear the area, then return for the drop.",
    next: null,
    autos: null,
    urgent: true
  }
};

export const EVENT_PATTERNS = [
  { id: "phaseSmoke", phrases: ["fill my soul with smoke"] },
  { id: "phaseShadow", phrases: ["darken my shadow"] },
  { id: "phaseBlood", phrases: ["flood my lungs with blood"] },
  { id: "phaseIce", phrases: ["infuse me with the power of ice"] },
  { id: "phaseZaros", phrases: ["now the power of zaros"] },
  { id: "virus", phrases: ["let the virus flow through you"] },
  { id: "noEscape", phrases: ["no escape"] },
  { id: "darkness", phrases: ["embrace darkness"] },
  { id: "shadowTrap", phrases: ["fear the shadow"] },
  { id: "siphon", phrases: ["a siphon will solve this"] },
  { id: "sacrifice", phrases: ["i demand a blood sacrifice"] },
  { id: "icePrison", phrases: ["die now in a prison of ice"] },
  { id: "contain", phrases: ["contain this"] },
  { id: "minionFumus", phrases: ["fumus dont fail me", "fumus don't fail me"] },
  { id: "minionUmbra", phrases: ["umbra dont fail me", "umbra don't fail me"] },
  { id: "minionCruor", phrases: ["cruor dont fail me", "cruor don't fail me"] },
  { id: "minionGlacies", phrases: ["glacies dont fail me", "glacies don't fail me"] },
  { id: "wrath", phrases: ["taste my wrath"] },
  { id: "killComplete", phrases: ["completion time", "you have killed nex", "nex kill time"] }
];

export const SIMULATOR_EVENTS = [
  ["phaseSmoke", "Smoke start"], ["virus", "Virus"], ["noEscape", "No Escape"],
  ["minionFumus", "Fumus"], ["phaseShadow", "Shadow start"], ["shadowTrap", "Shadow trap"],
  ["darkness", "Darkness"], ["minionUmbra", "Umbra"], ["phaseBlood", "Blood start"],
  ["siphon", "Siphon"], ["sacrifice", "Sacrifice"], ["minionCruor", "Cruor"],
  ["phaseIce", "Ice start"], ["icePrison", "Ice prison"], ["contain", "Contain"],
  ["minionGlacies", "Glacies"], ["phaseZaros", "Zaros"], ["wrath", "Wrath"]
];
