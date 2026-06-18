const CHATBOX_MODULE_URL = "https://cdn.jsdelivr.net/npm/@alt1/chatbox@1.0.0-alpha.7/+esm";
const BASE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@alt1/base@1.0.0-alpha.7/+esm";

export class NexChatReader extends EventTarget {
  constructor() {
    super();
    this.reader = null;
    this.interval = null;
    this.seen = new Map();
    this.found = false;
  }

  async initialize() {
    const [chatboxModule, baseModule] = await Promise.all([
      import(CHATBOX_MODULE_URL),
      import(BASE_MODULE_URL)
    ]);

    const Reader = chatboxModule.default || chatboxModule.ChatboxReader;
    if (!Reader) throw new Error("Alt1 chatbox module did not expose ChatboxReader.");

    this.reader = new Reader();
    if (baseModule.mixColor) {
      this.reader.readargs = {
        colors: [
          baseModule.mixColor(255, 255, 255),
          baseModule.mixColor(255, 0, 0),
          baseModule.mixColor(255, 255, 0),
          baseModule.mixColor(127, 169, 255),
          baseModule.mixColor(202, 51, 152),
          baseModule.mixColor(235, 47, 47),
          baseModule.mixColor(45, 186, 20)
        ]
      };
    }
    return this;
  }

  async find() {
    if (!this.reader) await this.initialize();
    this.dispatchEvent(new CustomEvent("status", { detail: { state: "searching", message: "Finding chatbox" } }));
    const result = this.reader.find();
    this.found = Boolean(result || this.reader.pos || this.reader.mainbox);
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
