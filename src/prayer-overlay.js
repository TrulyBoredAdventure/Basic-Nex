const GROUP_NAME = "basic-nex-prayer";

function mixColor(r, g, b, a = 255) {
  return (b << 0) + (g << 8) + (r << 16) + (a << 24);
}

function decodeMousePosition(value) {
  if (!Number.isInteger(value) || value === -1) return null;
  return { x: value >>> 16, y: value & 0xffff };
}

export class PrayerOverlay extends EventTarget {
  constructor() {
    super();
    this.enabled = false;
    this.placing = false;
    this.x = 240;
    this.y = 120;
    this.prayer = "None";
    this.icon = "—";
    this.drawTimer = null;
    this.placeTimer = null;
  }

  isAvailable() {
    return Boolean(window.alt1?.permissionOverlay);
  }

  configure({ enabled, x, y }) {
    this.enabled = Boolean(enabled);
    if (Number.isFinite(Number(x))) this.x = Math.round(Number(x));
    if (Number.isFinite(Number(y))) this.y = Math.round(Number(y));
    this.clampPosition();
    this.enabled ? this.startDrawing() : this.stopDrawing();
  }

  update(prayer, icon) {
    this.prayer = String(prayer || "None");
    this.icon = String(icon || "—");
    if (this.enabled) this.draw();
  }

  clampPosition() {
    const width = Number(window.alt1?.rsWidth) || 1920;
    const height = Number(window.alt1?.rsHeight) || 1080;
    this.x = Math.max(0, Math.min(this.x, Math.max(0, width - 260)));
    this.y = Math.max(0, Math.min(this.y, Math.max(0, height - 48)));
  }

  startDrawing() {
    if (!this.isAvailable()) return;
    if (!this.drawTimer) this.drawTimer = window.setInterval(() => this.draw(), 400);
    this.draw();
  }

  stopDrawing() {
    if (this.drawTimer) window.clearInterval(this.drawTimer);
    this.drawTimer = null;
    this.stopPlacement();
    this.clear();
  }

  clear() {
    try {
      window.alt1?.overLayClearGroup?.(GROUP_NAME);
    } catch {
      // Alt1 may be closing or changing permissions.
    }
  }

  draw() {
    if (!this.enabled || !this.isAvailable()) return;
    const alt1 = window.alt1;
    const label = this.prayer === "Move away" ? "MOVE AWAY" : `PRAYER: ${this.prayer}`;
    const width = Math.max(190, Math.min(390, 32 + label.length * 12));
    const textColor = this.prayer.includes("Ranged")
      ? mixColor(120, 255, 145)
      : this.prayer.includes("Magic")
        ? mixColor(126, 207, 255)
        : this.prayer === "Move away"
          ? mixColor(255, 103, 111)
          : mixColor(235, 230, 240);

    alt1.overLaySetGroup(GROUP_NAME);
    alt1.overLayClearGroup(GROUP_NAME);
    alt1.overLaySetGroupZIndex?.(GROUP_NAME, 100);
    alt1.overLayRect(mixColor(8, 7, 12, 235), this.x, this.y, width, 42, 1000, 6);
    alt1.overLayRect(textColor, this.x, this.y, width, 42, 1000, 2);
    alt1.overLayTextEx(label, textColor, 22, this.x + 12, this.y + 21, 1000, "", false, true);
  }

  togglePlacement() {
    if (this.placing) {
      this.stopPlacement();
      return false;
    }
    this.startPlacement();
    return true;
  }

  startPlacement() {
    if (!this.enabled || !this.isAvailable()) return false;
    this.placing = true;
    this.dispatchEvent(new CustomEvent("placement", { detail: { active: true, x: this.x, y: this.y } }));
    this.placeTimer = window.setInterval(() => {
      const point = decodeMousePosition(window.alt1?.mousePosition);
      if (!point) return;
      this.x = point.x + 16;
      this.y = point.y + 16;
      this.clampPosition();
      this.draw();
      this.dispatchEvent(new CustomEvent("move", { detail: { x: this.x, y: this.y } }));
    }, 80);
    return true;
  }

  stopPlacement() {
    if (this.placeTimer) window.clearInterval(this.placeTimer);
    this.placeTimer = null;
    if (!this.placing) return;
    this.placing = false;
    this.dispatchEvent(new CustomEvent("placement", { detail: { active: false, x: this.x, y: this.y } }));
  }

  resetPosition() {
    this.x = 240;
    this.y = 120;
    this.clampPosition();
    this.draw();
    this.dispatchEvent(new CustomEvent("move", { detail: { x: this.x, y: this.y } }));
  }
}

export { decodeMousePosition };
