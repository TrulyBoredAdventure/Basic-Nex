import { NexEncounterEngine } from "./engine.js?v=0.1.2";
import { SIMULATOR_EVENTS } from "./encounter-data.js?v=0.1.2";
import { NexChatReader } from "./chat-reader.js?v=0.1.2";
import { clearSettings, loadSettings, saveSettings } from "./settings.js?v=0.1.2";
import { PrayerOverlay } from "./prayer-overlay.js?v=0.1.2";

const $ = (id) => document.getElementById(id);
const engine = new NexEncounterEngine();
const chatReader = new NexChatReader();
const prayerOverlay = new PrayerOverlay();
let settings = loadSettings();
let resetDataArmed = false;
let resetFightArmed = false;
let logLines = [];
let lastSpokenEvent = null;
let chatFindRetryTimer = null;
let chatFindAttempts = 0;
let chatFindInProgress = false;

const elements = {
  app: $("app"), readerStatus: $("readerStatus"), phaseLabel: $("phaseLabel"), modeLabel: $("modeLabel"),
  callout: $("callout"), instructionTitle: $("instructionTitle"), instructionBody: $("instructionBody"),
  nextMechanic: $("nextMechanic"), nextTiming: $("nextTiming"), prayerIcon: $("prayerIcon"),
  prayerName: $("prayerName"), prayerNote: $("prayerNote"), abilityTitle: $("abilityTitle"),
  abilityBody: $("abilityBody"), targetName: $("targetName"), targetNote: $("targetNote"),
  positionTitle: $("positionTitle"), positionBody: $("positionBody"), positionBadge: $("positionBadge"),
  duoAdvice: $("duoAdvice"), arenaMap: $("arenaMap"), diagAlt1: $("diagAlt1"),
  diagChatFound: $("diagChatFound"), diagRsLinked: $("diagRsLinked"),
  diagPixelPermission: $("diagPixelPermission"), diagChatLibrary: $("diagChatLibrary"),
  diagPrayerOverlay: $("diagPrayerOverlay"), diagLastEvent: $("diagLastEvent"), diagLastLine: $("diagLastLine"),
  prayerOverlayStatus: $("prayerOverlayStatus"), movePrayerOverlayButton: $("movePrayerOverlayButton"),
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
  prayerOverlay.configure({
    enabled: settings.showPrayerOverlay,
    x: settings.prayerOverlayX,
    y: settings.prayerOverlayY
  });
  updateOverlayControls();
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
    showPrayerOverlay: $("showPrayerOverlay").checked,
    customDefensive: $("customDefensive").value.trim(),
    customMovement: $("customMovement").value.trim(),
    customBurst: $("customBurst").value.trim()
  };
  saveSettings(settings);
  $("duoRoleRow").classList.toggle("hidden", settings.teamSize !== "duo");
  prayerOverlay.configure({
    enabled: settings.showPrayerOverlay,
    x: settings.prayerOverlayX,
    y: settings.prayerOverlayY
  });
  updateOverlayControls();
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
  prayerOverlay.update(vm.phase.prayer, vm.phase.prayerIcon);
  updateDiagnostics();
}

function updateDiagnostics() {
  if (elements.diagRsLinked) elements.diagRsLinked.textContent = hasAlt1() && window.alt1.rsLinked ? "Yes" : "No";
  if (elements.diagPixelPermission) elements.diagPixelPermission.textContent = hasAlt1() && window.alt1.permissionPixel ? "Yes" : "No";
  if (elements.diagChatLibrary) {
    const available = Boolean(window.Chatbox?.default || window.Chatbox?.ChatBoxReader || typeof window.Chatbox === "function");
    elements.diagChatLibrary.textContent = available ? "Loaded" : "Missing";
  }
  if (elements.diagPrayerOverlay) {
    elements.diagPrayerOverlay.textContent = settings.showPrayerOverlay
      ? (prayerOverlay.isAvailable() ? "Enabled" : "Permission unavailable")
      : "Disabled";
  }
}

function updateOverlayControls() {
  if (!elements.movePrayerOverlayButton || !elements.prayerOverlayStatus) return;
  const enabled = Boolean(settings.showPrayerOverlay);
  elements.movePrayerOverlayButton.disabled = !enabled || !prayerOverlay.isAvailable();
  elements.movePrayerOverlayButton.textContent = prayerOverlay.placing ? "Lock prayer overlay" : "Move prayer overlay";
  if (!enabled) {
    elements.prayerOverlayStatus.textContent = "Enable the overlay to place it on the RuneScape screen.";
  } else if (!prayerOverlay.isAvailable()) {
    elements.prayerOverlayStatus.textContent = "Alt1 overlay permission is unavailable.";
  } else if (prayerOverlay.placing) {
    elements.prayerOverlayStatus.textContent = "Move the mouse over RuneScape, then return here and click Lock prayer overlay.";
  } else {
    elements.prayerOverlayStatus.textContent = `Position: ${prayerOverlay.x}, ${prayerOverlay.y}`;
  }
}

function savePrayerOverlayPosition() {
  settings.prayerOverlayX = prayerOverlay.x;
  settings.prayerOverlayY = prayerOverlay.y;
  saveSettings(settings);
  updateOverlayControls();
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

function stopChatFindRetries() {
  if (chatFindRetryTimer) window.clearTimeout(chatFindRetryTimer);
  chatFindRetryTimer = null;
  chatFindAttempts = 0;
}

async function findChatbox({ retry = true } = {}) {
  if (chatFindInProgress) return;
  if (!hasAlt1()) {
    setReaderStatus("offline", "Open inside Alt1");
    log("Alt1 API was not detected. The simulator remains available in Diagnostics.");
    return;
  }
  updateDiagnostics();
  if (!window.alt1.permissionPixel) {
    setReaderStatus("offline", "Pixel permission required");
    log("Pixel permission is not available. Reinstall the app or approve pixel access in Alt1.");
    return;
  }
  if (!window.alt1.rsLinked) {
    setReaderStatus("offline", "RuneScape not linked");
    log("Alt1 is open, but it is not linked to the RuneScape client.");
    return;
  }

  chatFindInProgress = true;
  try {
    setReaderStatus("searching", chatFindAttempts ? `Finding chatbox (${chatFindAttempts + 1}/8)` : "Loading chat reader");
    const found = chatReader.find();
    if (found) {
      stopChatFindRetries();
      log("Chat reader is online and scanning visible chat messages.");
      return;
    }

    chatFindAttempts += 1;
    if (retry && chatFindAttempts < 8) {
      setReaderStatus("searching", `Waiting for visible chatbox (${chatFindAttempts}/8)`);
      if (chatFindAttempts === 1) {
        log("No supported chatbox anchor was visible. Basic Nex will retry automatically.");
      }
      chatFindRetryTimer = window.setTimeout(() => findChatbox({ retry: true }), 1500);
    } else {
      setReaderStatus("offline", "Chatbox not found");
      log("Chatbox search ended. Keep the Game Messages chat visible, unobstructed, and at normal interface scaling, then press Find chatbox.");
      stopChatFindRetries();
    }
  } catch (error) {
    setReaderStatus("offline", "Chat reader failed");
    log(`Chat reader error: ${error?.message || error}`);
    stopChatFindRetries();
  } finally {
    chatFindInProgress = false;
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
  $("findChatButton").addEventListener("click", () => {
    stopChatFindRetries();
    findChatbox({ retry: true });
  });
  $("movePrayerOverlayButton").addEventListener("click", () => {
    if (!settings.showPrayerOverlay) return;
    prayerOverlay.togglePlacement();
    updateOverlayControls();
  });
  $("resetPrayerOverlayButton").addEventListener("click", () => {
    prayerOverlay.resetPosition();
    savePrayerOverlayPosition();
  });
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

  prayerOverlay.addEventListener("move", () => {
    settings.prayerOverlayX = prayerOverlay.x;
    settings.prayerOverlayY = prayerOverlay.y;
    updateOverlayControls();
  });
  prayerOverlay.addEventListener("placement", (event) => {
    if (!event.detail.active) savePrayerOverlayPosition();
    updateOverlayControls();
  });
  window.addEventListener("beforeunload", () => {
    stopChatFindRetries();
    prayerOverlay.stopDrawing();
  });

  if (settings.autoFindChat && hasAlt1()) findChatbox({ retry: true });
  else setReaderStatus("offline", hasAlt1() ? "Chat reader idle" : "Open inside Alt1");
});
