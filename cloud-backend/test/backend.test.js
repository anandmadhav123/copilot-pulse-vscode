"use strict";

const assert = require("assert");
const ComplexityScorer = require("../src/services/ComplexityScorer");
const ModelRouter = require("../src/services/ModelRouter");
const EscalationService = require("../src/services/EscalationService");
const LicenseService = require("../src/services/LicenseService");

console.log("🧪 Running Cloud Backend Test Suite...");

// 1. Complexity Scorer Tests
console.log("1. Testing ComplexityScorer...");
const quickLookup = ComplexityScorer.calculateScore("shortcut for saving file in vscode");
assert(quickLookup.score < 4.0, `Expected low score for shortcut lookup, got ${quickLookup.score}`);
assert.strictEqual(quickLookup.taskType, "QUICK_LOOKUP");

const architectureTask = ComplexityScorer.calculateScore(
  "Architect a distributed microservice system with event-driven message queue, load balancing, and handle concurrency, race conditions, and deadlocks in a scalable cloud architecture."
);
assert(architectureTask.score >= 6.5, `Expected high score for architecture, got ${architectureTask.score}`);
assert.strictEqual(architectureTask.taskType, "ARCHITECTURE");

// 2. Model Router Tests
console.log("2. Testing ModelRouter...");
const lightDecision = ModelRouter.selectModel(quickLookup, { cheapModel: "gpt-4o-mini", strongModel: "gpt-4o" });
assert.strictEqual(lightDecision.tier, "light");
assert.strictEqual(lightDecision.selectedModel, "gpt-4o-mini");

const heavyDecision = ModelRouter.selectModel(architectureTask, { cheapModel: "gpt-4o-mini", strongModel: "gpt-4o" });
assert.strictEqual(heavyDecision.tier, "heavy");
assert.strictEqual(heavyDecision.selectedModel, "gpt-4o");

// 3. Escalation Tests
console.log("3. Testing EscalationService...");
const loopEscalation = EscalationService.evaluateEscalation({
  currentModel: "gpt-4o-mini",
  trigger: "stuck_tool_loop",
  identicalToolCount: 2,
  strongModel: "gpt-4o"
});
assert.strictEqual(loopEscalation.shouldEscalate, true);
assert.strictEqual(loopEscalation.nextModel, "gpt-4o");

// 4. License Service Tests
console.log("4. Testing LicenseService...");
const freeUser = LicenseService.verifyLicense(null, "user_123");
assert.strictEqual(freeUser.isPro, false);
assert.strictEqual(freeUser.plan, "free");

const proUser = LicenseService.verifyLicense("PRO-PULSE-DEMO-2026", "user_456");
assert.strictEqual(proUser.isPro, true);
assert.strictEqual(proUser.plan, "pro");

console.log("✅ All Cloud Backend Unit Tests Passed Successfully!");
