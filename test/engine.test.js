import test from "node:test";
import assert from "node:assert/strict";
import { detectEvent, NexEncounterEngine, normalizeText } from "../src/engine.js";

const settings = { customDefensive: "", customMovement: "", customBurst: "" };

test("normalizes timestamped dialogue", () => {
  assert.equal(normalizeText("[12:34:56] Nex: NO ESCAPE!"), "nex no escape");
});

test("detects Nex mechanic dialogue", () => {
  assert.equal(detectEvent("[12:00:01] Let the virus flow through you!"), "virus");
  assert.equal(detectEvent("Nex: Die now, in a prison of ice!"), "icePrison");
});

test("smoke rotation predicts No Escape after virus", () => {
  const engine = new NexEncounterEngine();
  engine.processEvent("virus");
  assert.equal(engine.state.phase, "smoke");
  assert.equal(engine.state.nextMechanic, "noEscape");
  assert.equal(engine.state.autosUntilNext, 5);
});

test("blood sacrifice predicts siphon", () => {
  const engine = new NexEncounterEngine();
  engine.processEvent("sacrifice");
  assert.equal(engine.state.phase, "blood");
  assert.equal(engine.getViewModel(settings).nextTitle, "Blood Siphon");
});

test("ice opening is inferred from last blood special", () => {
  const engine = new NexEncounterEngine();
  engine.processEvent("sacrifice");
  engine.processEvent("phaseIce");
  assert.equal(engine.state.nextMechanic, "contain");
});

test("minion calls set the target and position", () => {
  const engine = new NexEncounterEngine();
  engine.processEvent("minionCruor");
  assert.equal(engine.state.minionTarget, "Cruor");
  assert.equal(engine.state.minionPosition, "southeast");
});
