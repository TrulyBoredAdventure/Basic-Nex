import test from "node:test";
import assert from "node:assert/strict";
import { decodeMousePosition } from "../src/prayer-overlay.js";

test("decodes Alt1 packed RuneScape mouse coordinates", () => {
  const packed = (640 << 16) | 360;
  assert.deepEqual(decodeMousePosition(packed), { x: 640, y: 360 });
});

test("rejects an unavailable Alt1 mouse position", () => {
  assert.equal(decodeMousePosition(-1), null);
  assert.equal(decodeMousePosition(undefined), null);
});
