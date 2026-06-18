import { EVENT_PATTERNS, MECHANICS, PHASES } from "./encounter-data.js";

const PHASE_EVENT_MAP = {
  phaseSmoke: "smoke",
  phaseShadow: "shadow",
  phaseBlood: "blood",
  phaseIce: "ice",
  phaseZaros: "zaros"
};

const MINION_EVENT_MAP = {
  minionFumus: { name: "Fumus", phase: "smoke", position: "northwest" },
  minionUmbra: { name: "Umbra", phase: "shadow", position: "northeast" },
  minionCruor: { name: "Cruor", phase: "blood", position: "southeast" },
  minionGlacies: { name: "Glacies", phase: "ice", position: "southwest" }
};

export function normalizeText(value = "") {
  return value
    .toLowerCase()
    .replace(/^\s*\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*/, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectEvent(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  for (const event of EVENT_PATTERNS) {
    if (event.phrases.some((phrase) => normalized.includes(normalizeText(phrase)))) {
      return event.id;
    }
  }
  return null;
}

export class NexEncounterEngine extends EventTarget {
  constructor() {
    super();
    this.reset(false);
  }

  reset(emit = true) {
    this.state = {
      phase: "idle",
      mechanic: null,
      nextMechanic: null,
      autosUntilNext: null,
      minionTarget: null,
      minionPosition: null,
      lastEvent: null,
      lastRawLine: "",
      lastEventAt: null,
      startedAt: null,
      source: "none"
    };
    this.lastBloodMechanic = null;
    this.lastSmokeMechanic = null;
    if (emit) this.emitChange();
  }

  processLine(line, source = "chat") {
    const eventId = detectEvent(line);
    this.state.lastRawLine = line;
    if (!eventId) {
      this.emitChange();
      return null;
    }
    this.processEvent(eventId, source, line);
    return eventId;
  }

  processEvent(eventId, source = "simulator", rawLine = "") {
    const now = Date.now();
    this.state.lastEvent = eventId;
    this.state.lastEventAt = now;
    this.state.source = source;
    if (rawLine) this.state.lastRawLine = rawLine;

    if (PHASE_EVENT_MAP[eventId]) {
      this.setPhase(PHASE_EVENT_MAP[eventId]);
    } else if (MINION_EVENT_MAP[eventId]) {
      const minion = MINION_EVENT_MAP[eventId];
      this.state.phase = minion.phase;
      this.state.minionTarget = minion.name;
      this.state.minionPosition = minion.position;
      this.state.mechanic = null;
      this.state.nextMechanic = "phaseTransition";
      this.state.autosUntilNext = null;
    } else if (MECHANICS[eventId]) {
      const mechanic = MECHANICS[eventId];
      this.state.phase = mechanic.phase;
      this.state.mechanic = eventId;
      this.state.nextMechanic = mechanic.next;
      this.state.autosUntilNext = mechanic.autos;
      this.state.minionTarget = null;
      this.state.minionPosition = null;
      if (eventId === "virus" || eventId === "noEscape") this.lastSmokeMechanic = eventId;
      if (eventId === "siphon" || eventId === "sacrifice") this.lastBloodMechanic = eventId;
      if (!this.state.startedAt && mechanic.phase !== "complete") this.state.startedAt = now;
    } else if (eventId === "killComplete") {
      this.state.phase = "complete";
    }

    this.emitChange();
  }

  setPhase(phase) {
    this.state.phase = phase;
    this.state.mechanic = null;
    this.state.minionTarget = null;
    this.state.minionPosition = null;
    if (!this.state.startedAt && phase !== "idle") this.state.startedAt = Date.now();

    if (phase === "smoke") {
      this.state.nextMechanic = "virus";
      this.state.autosUntilNext = 0;
    } else if (phase === "shadow") {
      this.state.nextMechanic = this.lastSmokeMechanic === "noEscape" ? "shadowTrap" : "darkness";
      this.state.autosUntilNext = 0;
    } else if (phase === "blood") {
      this.state.nextMechanic = "siphon";
      this.state.autosUntilNext = 0;
    } else if (phase === "ice") {
      this.state.nextMechanic = this.lastBloodMechanic === "sacrifice" ? "contain" : "icePrison";
      this.state.autosUntilNext = 0;
    } else if (phase === "zaros") {
      this.state.nextMechanic = null;
      this.state.autosUntilNext = null;
    }
  }

  getViewModel(settings) {
    const phase = PHASES[this.state.phase] || PHASES.idle;
    const current = this.state.mechanic ? MECHANICS[this.state.mechanic] : null;
    const next = this.state.nextMechanic && MECHANICS[this.state.nextMechanic]
      ? MECHANICS[this.state.nextMechanic]
      : null;

    let title = "Open Nex and keep game messages visible";
    let body = "The helper will detect Nex's dialogue, track the phase, and update the next mechanic automatically.";
    let abilityTitle = "Ready defensives and movement";
    let abilityBody = "Recommendations are mechanic-based and do not activate abilities for you.";

    if (current) {
      title = current.callout;
      body = current.body;
      abilityTitle = current.title;
      abilityBody = this.applyAbilityOverrides(current, settings);
    } else if (this.state.minionTarget) {
      title = `Attack ${this.state.minionTarget}`;
      body = `Nex is immune until ${this.state.minionTarget} is defeated and Nex is hit again.`;
      abilityTitle = "Minion transition";
      abilityBody = "Use controlled damage and prepare to move into the next quadrant as the mage dies.";
    } else if (this.state.phase === "zaros") {
      title = "Finish Nex and stay separated";
      body = "Nex uses stronger magic, cleaving melee, Soul Split, and Deflect Melee during the final phase.";
      abilityTitle = "Consistent damage";
      abilityBody = "Use frequent reliable hits, maintain protection, and keep movement ready for the final Wrath exit.";
    } else if (this.state.phase === "complete") {
      title = "Move away before looting";
      body = "Wrath can still damage players near Nex after the kill.";
      abilityTitle = "Exit the Wrath area";
      abilityBody = settings.customMovement || "Use movement to clear the area, then return for the drop.";
    } else if (this.state.phase !== "idle") {
      title = `${phase.label} phase`;
      body = "Rotation synced. Watch the next-mechanic panel for the upcoming special.";
    }

    const nextTitle = this.state.minionTarget
      ? `Phase transition after ${this.state.minionTarget}`
      : next?.title || (this.state.phase === "zaros" ? "No unique special" : "Waiting for encounter");

    let nextTiming = "No rotation synced";
    if (this.state.minionTarget) {
      nextTiming = "Kill the mage, then hit Nex to continue";
    } else if (next) {
      if (this.state.autosUntilNext === 0) nextTiming = "Expected immediately or at phase start";
      else {
        const seconds = Math.round(this.state.autosUntilNext * 2.4);
        nextTiming = `After ${this.state.autosUntilNext} auto-attacks · roughly ${seconds}s if uninterrupted`;
      }
    } else if (this.state.phase === "zaros") {
      nextTiming = "Track overhead changes and prepare for Wrath on death";
    }

    return {
      phase,
      current,
      title,
      body,
      abilityTitle,
      abilityBody,
      nextTitle,
      nextTiming,
      targetName: this.state.minionTarget || "Nex",
      targetNote: this.state.minionTarget
        ? `Move toward the ${this.state.minionPosition.replace("north", "north-").replace("south", "south-")} mage position.`
        : "Continue attacking Nex until she calls the next mage.",
      position: this.state.minionPosition || phase.position,
      urgent: Boolean(current?.urgent)
    };
  }

  applyAbilityOverrides(mechanic, settings) {
    let advice = mechanic.ability;
    if (["noEscape", "sacrifice", "contain", "wrath"].includes(this.state.mechanic) && settings.customMovement) {
      advice = advice.replace(/Surge, Escape, or Dive|movement ability|Use movement/gi, settings.customMovement);
    }
    if (this.state.mechanic === "icePrison" && settings.customDefensive) {
      advice = `${advice} Preferred defensive: ${settings.customDefensive}.`;
    }
    if (this.state.mechanic === "siphon" && settings.customBurst) {
      advice = `${advice} Saved burst: ${settings.customBurst}.`;
    }
    return advice;
  }

  emitChange() {
    this.dispatchEvent(new CustomEvent("change", { detail: { ...this.state } }));
  }
}
