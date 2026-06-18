import test from "node:test";
import assert from "node:assert/strict";
import { NexChatReader } from "../src/chat-reader.js";

class MockReader {
  constructor() {
    this.pos = null;
    this.readargs = null;
  }

  find() {
    this.pos = {
      mainbox: { type: "main" },
      boxes: [{ type: "main" }]
    };
    return this.pos;
  }

  read() {
    return [];
  }
}

test("accepts the maintained Chatbox default export and detects a chatbox", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    Chatbox: { default: MockReader },
    A1lib: { mixColor: (r, g, b) => (r << 16) | (g << 8) | b },
    setInterval,
    clearInterval
  };

  try {
    const reader = new NexChatReader();
    assert.equal(reader.find(), true);
    assert.equal(reader.found, true);
    assert.equal(reader.reader.pos.mainbox.type, "main");
    reader.stop();
  } finally {
    globalThis.window = previousWindow;
  }
});

test("falls back to the first detected box when no main box is assigned", () => {
  class NoMainReader extends MockReader {
    find() {
      this.pos = { mainbox: null, boxes: [{ type: "fc" }] };
      return this.pos;
    }
  }

  const previousWindow = globalThis.window;
  globalThis.window = {
    Chatbox: { ChatBoxReader: NoMainReader },
    A1lib: { mixColor: () => 0 },
    setInterval,
    clearInterval
  };

  try {
    const reader = new NexChatReader();
    assert.equal(reader.find(), true);
    assert.equal(reader.reader.pos.mainbox.type, "fc");
    reader.stop();
  } finally {
    globalThis.window = previousWindow;
  }
});
