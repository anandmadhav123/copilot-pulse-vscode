"use strict";

const assert = require("assert");
const LemonSqueezyService = require("./cloud-backend/src/services/LemonSqueezyService");
const LicenseService = require("./cloud-backend/src/services/LicenseService");

console.log("🍋 RUNNING LEMON SQUEEZY SUBSCRIPTION & WEBHOOK TEST SUITE");

// 1. Test Webhook Event: subscription_created
console.log("1. Simulating Lemon Squeezy subscription_created Webhook...");
const createdEvent = {
  meta: { event_name: "subscription_created" },
  data: {
    id: "sub_ls_12345",
    attributes: {
      user_email: "testuser@gmail.com",
      license_key: "LS-SUB-PRO-998877",
      status: "active"
    }
  }
};

const createResult = LemonSqueezyService.handleWebhookEvent(createdEvent);
assert.strictEqual(createResult.success, true);
assert.strictEqual(createResult.action, "activated");
console.log("   ✅ Subscription successfully created and license registered.");

// 2. Test License Verification for the new key
console.log("2. Verifying Activated License in LicenseService...");
const verifyResult = LicenseService.verifyLicense("LS-SUB-PRO-998877");
assert.strictEqual(verifyResult.valid, true);
assert.strictEqual(verifyResult.isPro, true);
assert.strictEqual(verifyResult.provider, "lemonsqueezy");
assert.strictEqual(verifyResult.email, "testuser@gmail.com");
console.log("   ✅ Pro License successfully verified via Lemon Squeezy record.");

// 3. Test Webhook Event: subscription_cancelled
console.log("3. Simulating Lemon Squeezy subscription_cancelled Webhook...");
const cancelEvent = {
  meta: { event_name: "subscription_cancelled" },
  data: {
    id: "sub_ls_12345",
    attributes: {
      user_email: "testuser@gmail.com"
    }
  }
};

const cancelResult = LemonSqueezyService.handleWebhookEvent(cancelEvent);
assert.strictEqual(cancelResult.success, true);
assert.strictEqual(cancelResult.action, "cancelled");

const verifyCancelled = LicenseService.verifyLicense("LS-SUB-PRO-998877");
assert.strictEqual(verifyCancelled.valid, false);
assert.strictEqual(verifyCancelled.isPro, false);
console.log("   ✅ Cancelled subscription correctly downgraded.");

console.log("\n🎉 ALL LEMON SQUEEZY INTEGRATION TESTS PASSED 100%!");
