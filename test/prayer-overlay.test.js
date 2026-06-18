import test from "node:test";
import assert from "node:assert/strict";
import { decodeMousePosition, getAlt1PressedPoint } from "../src/prayer-overlay.js";

test("decodes Alt1 packed RuneScape mouse coordinates", () => {
  const packed = (640 << 16) | 360;
  assert.deepEqual(decodeMousePosition(packed), { x: 640, y: 360 });
});

test("rejects an unavailable Alt1 mouse position", () => {
  assert.equal(decodeMousePosition(-1), null);
  assert.equal(decodeMousePosition(undefined), null);
});

test("uses RuneScape-relative coordinates from an Alt+1 event", () => {
  assert.deepEqual(
    getAlt1PressedPoint({ mouseRs: { x: 712, y: 448 }, x: 999, y: 999 }),
    { x: 712, y: 448 }
  );
});

test("falls back to legacy Alt+1 x and y coordinates", () => {
  assert.deepEqual(getAlt1PressedPoint({ x: 320, y: 240 }), { x: 320, y: 240 });
});

test("rejects invalid Alt+1 coordinates", () => {
  assert.equal(getAlt1PressedPoint({ mouseRs: { x: -1, y: -1 } }), null);
  assert.equal(getAlt1PressedPoint(null), null);
});
