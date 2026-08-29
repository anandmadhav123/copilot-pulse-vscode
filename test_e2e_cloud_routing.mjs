"use strict";

const http = require("http");
const assert = require("assert");
const app = require("./cloud-backend/src/server");
const { RemoteRouterClient } = require("./copilot-pulse-vscode/extension/out/proxy/RemoteRouterClient");

async function runE2ETests() {
  console.log("🚀 Starting End-to-End Cloud Routing & Freemium Verification...");

  const TEST_PORT = 3199;
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`✅ Test Cloud Backend listening on http://127.0.0.1:${TEST_PORT}`);

  const config = {
    cloudEndpoint: `http://127.0.0.1:${TEST_PORT}`,
    licenseKey: "PRO-PULSE-DEMO-2026",
    cheapModel: "openai/gpt-4o-mini",
    strongModel: "openai/gpt-4o",
    threshold: 6.5,
    lowThreshold: 4.0
  };

  try {
    // 1. Test Light Routing via Cloud
    console.log("1. Testing Remote Light Query Routing...");
    const lightResult = await RemoteRouterClient.routeDecisionAsync("what is the shortcut for finding files?", config);
    console.log("   Result:", lightResult);
    assert.strictEqual(lightResult.fromCloud, true);
    assert.strictEqual(lightResult.model, "openai/gpt-4o-mini");
    assert.strictEqual(lightResult.savings, true);

    // 2. Test Heavy Architectural Prompt via Cloud
    console.log("2. Testing Remote Heavy Architectural Task Routing...");
    const heavyPrompt = "Architect a distributed microservice cluster with Kubernetes, load balancer, Kafka event bus, and refactor the database to avoid deadlocks.";
    const heavyResult = await RemoteRouterClient.routeDecisionAsync(heavyPrompt, config);
    console.log("   Result:", heavyResult);
    assert.strictEqual(heavyResult.fromCloud, true);
    assert.strictEqual(heavyResult.model, "openai/gpt-4o");
    assert.strictEqual(heavyResult.savings, false);

    // 3. Test License Verification Endpoint
    console.log("3. Testing License Verification...");
    const proCheck = await RemoteRouterClient.verifyLicenseAsync("PRO-PULSE-DEMO-2026", `http://127.0.0.1:${TEST_PORT}`);
    assert.strictEqual(proCheck.isPro, true);
    assert.strictEqual(proCheck.plan, "pro");

    const freeCheck = await RemoteRouterClient.verifyLicenseAsync("", `http://127.0.0.1:${TEST_PORT}`);
    assert.strictEqual(freeCheck.isPro, false);
    assert.strictEqual(freeCheck.plan, "free");

    // 4. Test Offline Fallback
    console.log("4. Testing Offline Safe Fallback...");
    const offlineConfig = {
      ...config,
      cloudEndpoint: "http://127.0.0.1:9999" // Unreachable port
    };
    const fallbackResult = await RemoteRouterClient.routeDecisionAsync("test prompt", offlineConfig);
    console.log("   Fallback Result:", fallbackResult);
    assert.strictEqual(fallbackResult.fromCloud, false);
    assert.strictEqual(fallbackResult.model, "openai/gpt-4o-mini");

    console.log("\n🎉 ALL E2E INTEGRATION TESTS PASSED WITH 100% SUCCESS!");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log("🛑 Test Cloud Server closed.");
  }
}

runE2ETests().catch((err) => {
  console.error("❌ E2E Test Failed:", err);
  process.exit(1);
});
