const STORAGE_KEY = "basic-nex-settings-v1";

export const DEFAULT_SETTINGS = {
  teamSize: "solo",
  duoRole: "aggro",
  combatStyle: "ranged",
  guidanceLevel: "basic",
  showPrayer: true,
  showAbilities: true,
  showPosition: true,
  voiceAlerts: false,
  autoFindChat: true,
  customDefensive: "",
  customMovement: "",
  customBurst: "",
  compact: false
};

export function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearSettings() {
  localStorage.removeItem(STORAGE_KEY);
}
