export class NexChatReader extends EventTarget {
  constructor() {
    super();
    this.reader = null;
    this.interval = null;
    this.seen = new Map();
    this.found = false;
  }

  initialize() {
    const Chatbox = window.Chatbox;
    const A1lib = window.A1lib;

    if (!Chatbox || typeof Chatbox.default !== "function") {
      throw new Error("Alt1 chatbox library failed to load. Reopen Basic Nex and try again.");
    }
    if (!A1lib || typeof A1lib.mixColor !== "function") {
      throw new Error("Alt1 base library failed to load. Reopen Basic Nex and try again.");
    }

    this.reader = new Chatbox.default();
    this.reader.readargs = {
      colors: [
        A1lib.mixColor(255, 255, 255),
        A1lib.mixColor(255, 0, 0),
        A1lib.mixColor(255, 255, 0),
        A1lib.mixColor(127, 169, 255),
        A1lib.mixColor(202, 51, 152),
        A1lib.mixColor(235, 47, 47),
        A1lib.mixColor(45, 186, 20)
      ],
      backwards: true
    };
    return this;
  }

  find() {
    if (!this.reader) this.initialize();
    this.dispatchEvent(new CustomEvent("status", { detail: { state: "searching", message: "Finding chatbox" } }));

    this.reader.find();
    this.found = Boolean(this.reader.pos && (this.reader.pos.mainbox || this.reader.pos.boxes?.length));

    if (this.found && this.reader.pos?.boxes?.length && !this.reader.pos.mainbox) {
      this.reader.pos.mainbox = this.reader.pos.boxes[0];
    }

    this.dispatchEvent(new CustomEvent("status", {
      detail: {
        state: this.found ? "online" : "offline",
        message: this.found ? "Chatbox found" : "Chatbox not found"
      }
    }));

    if (this.found) this.start();
    return this.found;
  }

  start() {
    this.stop();
    this.interval = window.setInterval(() => this.poll(), 600);
  }

  stop() {
    if (this.interval) window.clearInterval(this.interval);
    this.interval = null;
  }

  poll() {
    if (!this.reader || !this.found) return;
    try {
      const lines = this.reader.read() || [];
      const now = Date.now();
      for (const line of lines) {
        const text = String(line.text || "").trim();
        if (!text) continue;
        const key = `${text}|${line.timestamp || ""}`;
        const lastSeen = this.seen.get(key) || 0;
        if (now - lastSeen < 3500) continue;
        this.seen.set(key, now);
        this.dispatchEvent(new CustomEvent("line", { detail: { text, raw: line } }));
      }
      for (const [key, timestamp] of this.seen) {
        if (now - timestamp > 60000) this.seen.delete(key);
      }
    } catch (error) {
      this.dispatchEvent(new CustomEvent("error", { detail: error }));
    }
  }
}
