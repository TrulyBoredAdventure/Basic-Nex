import { NexEncounterEngine } from "./engine.js";
import { SIMULATOR_EVENTS } from "./encounter-data.js";
import { NexChatReader } from "./chat-reader.js";
import { clearSettings, loadSettings, saveSettings } from "./settings.js";

const $ = (id) => document.getElementById(id);
const engine = new NexEncounterEngine();
const chatReader = new NexChatReader();
let settings = loadSettings();
let resetDataArmed = false;
let resetFightArmed = false;
let logLines = [];
let lastSpokenEvent = null;

const elements = {
  app: $("app"), readerStatus: $("readerStatus"), phaseLabel: $("phaseLabel"), modeLabel: $("modeLabel"),
  callout: $("callout"), instructionTitle: $("instructionTitle"), instructionBody: $("instructionBody"),
  nextMechanic: $("nextMechanic"), nextTiming: $("nextTiming"), prayerIcon: $("prayerIcon"),
  prayerName: $("prayerName"), prayerNote: $("prayerNote"), abilityTitle: $("abilityTitle"),
  abilityBody: $("abilityBody"), targetName: $("targetName"), targetNote: $("targetNote"),
  positionTitle: $("positionTitle"), positionBody: $("positionBody"), positionBadge: $("positionBadge"),
  duoAdvice: $("duoAdvice"), arenaMap: $("arenaMap"), diagAlt1: $("diagAlt1"),
  diagChatFound: $("diagChatFound"), diagLastEvent: $("diagLastEvent"), diagLastLine: $("diagLastLine"),
  eventLog: $("eventLog")
};

function hasAlt1() {
  return typeof window.alt1 !== "undefined";
}

function applySettingsToForm() {
  for (const [key, value] of Object.entries(settings)) {
    const control = $(key);
    if (!control) continue;
    if (control.type === "checkbox") control.checked = Boolean(value);
    else control.value = value;
  }
  $("duoRoleRow").classList.toggle("hidden", settings.teamSize !== "duo");
  elements.app.classList.toggle("compact", settings.compact);
}

function readSettingsFromForm() {
  settings = {
    ...settings,
    teamSize: $("teamSize").value,
    duoRole: $("duoRole").value,
    combatStyle: $("combatStyle").value,
    guidanceLevel: $("guidanceLevel").value,
    showPrayer: $("showPrayer").checked,
    showAbilities: $("showAbilities").checked,
    showPosition: $("showPosition").checked,
    voiceAlerts: $("voiceAlerts").checked,
    autoFindChat: $("autoFindChat").checked,
    customDefensive: $("customDefensive").value.trim(),
    customMovement: $("customMovement").value.trim(),
    customBurst: $("customBurst").value.trim()
  };
  saveSettings(settings);
  $("duoRoleRow").classList.toggle("hidden", settings.teamSize !== "duo");
  render();
}

function log(message) {
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logLines.unshift(`[${stamp}] ${message}`);
  logLines = logLines.slice(0, 80);
  elements.eventLog.textContent = logLines.join("\n");
}

function setReaderStatus(state, message) {
  elements.readerStatus.textContent = message;
  elements.readerStatus.className = `status-pill status-${state}`;
  elements.diagChatFound.textContent = state === "online" ? "Yes" : "No";
}

function render() {
  const vm = engine.getViewModel(settings);
  const phaseName = engine.state.phase;
  elements.phaseLabel.textContent = vm.phase.label.toUpperCase();
  elements.modeLabel.textContent = `${settings.teamSize.toUpperCase()}${settings.teamSize === "duo" ? ` · ${settings.duoRole.toUpperCase()}` : ""} · ${settings.combatStyle.toUpperCase()}`;
  elements.callout.className = `callout callout-${phaseName}`;
  elements.instructionTitle.textContent = vm.title;
  elements.instructionBody.textContent = vm.body;
  elements.nextMechanic.textContent = vm.nextTitle;
  elements.nextTiming.textContent = vm.nextTiming;

  elements.prayerName.textContent = settings.showPrayer ? vm.phase.prayer : "Hidden";
  elements.prayerIcon.textContent = settings.showPrayer ? vm.phase.prayerIcon : "—";
  elements.prayerNote.textContent = settings.showPrayer ? vm.phase.prayerNote : "Prayer recommendations are disabled in Settings.";
  elements.abilityTitle.textContent = settings.showAbilities ? vm.abilityTitle : "Hidden";
  elements.abilityBody.textContent = settings.showAbilities ? vm.abilityBody : "Ability recommendations are disabled in Settings.";
  elements.targetName.textContent = vm.targetName;
  elements.targetNote.textContent = vm.targetNote;
  elements.positionTitle.textContent = settings.showPosition ? vm.phase.positionTitle : "Position guide hidden";
  elements.positionBody.textContent = settings.showPosition ? vm.phase.positionBody : "Standing and lure recommendations are disabled in Settings.";
  elements.positionBadge.textContent = String(vm.position || "general").toUpperCase();

  document.querySelectorAll(".quadrant").forEach((node) => {
    node.classList.toggle("active", settings.showPosition && node.dataset.position === vm.position);
    node.classList.toggle("target", settings.showPosition && node.dataset.position === engine.state.minionPosition);
  });

  const duoText = getDuoAdvice(engine.state.phase, engine.state.mechanic, settings.duoRole);
  elements.duoAdvice.textContent = duoText;
  elements.duoAdvice.classList.toggle("hidden", settings.teamSize !== "duo" || !duoText);

  elements.diagLastEvent.textContent = engine.state.lastEvent || "None";
  elements.diagLastLine.textContent = engine.state.lastRawLine || "None";
}

function getDuoAdvice(phase, mechanic, role) {
  if (phase === "smoke") return "Duo: stay outside a 3×3 area around your partner so the virus cannot bounce between you.";
  if (mechanic === "icePrison") return role === "aggro"
    ? "Aggro/lurer: call the prison target clearly. Break your partner's icicle when you are free."
    : "Partner: if the aggro player is imprisoned, break one surrounding icicle immediately.";
  if (phase === "zaros") return "Duo: do not stand beside the primary target because Nex's melee attack cleaves nearby players.";
  if (role === "aggro" && ["shadow", "blood", "ice"].includes(phase)) return "Aggro/lurer: keep Nex controlled on the outer path and point her away from your partner.";
  return "Partner: stay offset from the aggro player and be ready to help with the next mage or ice prison.";
}

function speakIfNeeded() {
  const eventId = engine.state.lastEvent;
  if (!settings.voiceAlerts || !eventId || eventId === lastSpokenEvent) return;
  const vm = engine.getViewModel(settings);
  if (!vm.urgent) return;
  lastSpokenEvent = eventId;
  window.speechSynthesis?.cancel();
  window.speechSynthesis?.speak(new SpeechSynthesisUtterance(vm.title));
}

async function findChatbox() {
  if (!hasAlt1()) {
    setReaderStatus("offline", "Open inside Alt1");
    log("Alt1 API was not detected. The simulator remains available in Diagnostics.");
    return;
  }
  try {
    setReaderStatus("searching", "Loading chat reader");
    const found = await chatReader.find();
    if (!found) log("Chatbox not found. Make sure game messages are visible and the chatbox is not covered.");
  } catch (error) {
    setReaderStatus("offline", "Chat reader failed");
    log(`Chat reader error: ${error?.message || error}`);
  }
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      $(`${button.dataset.tab}Tab`).classList.add("active");
    });
  });
}

function setupSimulator() {
  for (const [eventId, label] of SIMULATOR_EVENTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      engine.processEvent(eventId, "simulator", `[Simulator] ${label}`);
      log(`Simulated ${eventId}`);
    });
    $("simulatorButtons").appendChild(button);
  }
}

engine.addEventListener("change", () => {
  render();
  speakIfNeeded();
});

chatReader.addEventListener("status", (event) => {
  const { state, message } = event.detail;
  setReaderStatus(state, message);
  log(message);
});
chatReader.addEventListener("line", (event) => {
  const { text } = event.detail;
  const matched = engine.processLine(text, "chat");
  if (matched) log(`Matched ${matched}: ${text}`);
});
chatReader.addEventListener("error", (event) => log(`OCR read error: ${event.detail?.message || event.detail}`));

document.addEventListener("DOMContentLoaded", () => {
  elements.diagAlt1.textContent = hasAlt1() ? "Yes" : "No";
  applySettingsToForm();
  setupTabs();
  setupSimulator();
  render();

  $("settingsForm").addEventListener("input", readSettingsFromForm);
  $("teamSize").addEventListener("change", readSettingsFromForm);
  $("findChatButton").addEventListener("click", findChatbox);
  $("compactButton").addEventListener("click", () => {
    settings.compact = !settings.compact;
    saveSettings(settings);
    elements.app.classList.toggle("compact", settings.compact);
  });

  $("resetFightButton").addEventListener("click", (event) => {
    if (!resetFightArmed) {
      resetFightArmed = true;
      event.currentTarget.textContent = "Click again to reset";
      window.setTimeout(() => {
        resetFightArmed = false;
        event.currentTarget.textContent = "Reset fight";
      }, 3500);
      return;
    }
    resetFightArmed = false;
    event.currentTarget.textContent = "Reset fight";
    engine.reset();
    log("Fight state reset");
  });

  $("clearLogButton").addEventListener("click", () => {
    logLines = [];
    elements.eventLog.textContent = "";
  });

  $("resetDataButton").addEventListener("click", (event) => {
    if (!resetDataArmed) {
      resetDataArmed = true;
      event.currentTarget.textContent = "Click again to erase settings";
      window.setTimeout(() => {
        resetDataArmed = false;
        event.currentTarget.textContent = "Reset local data";
      }, 4000);
      return;
    }
    clearSettings();
    localStorage.removeItem("basic-nex-diagnostics-v1");
    window.location.reload();
  });

  if (settings.autoFindChat && hasAlt1()) findChatbox();
  else setReaderStatus("offline", hasAlt1() ? "Chat reader idle" : "Open inside Alt1");
});
