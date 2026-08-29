"use strict";

const crypto = require("crypto");
const https = require("https");

/**
 * LEMON SQUEEZY INTEGRATION SERVICE
 * Handles real-time license verification and webhooks for subscriptions & payments.
 */

// Active license database (In-memory cache; connects to Redis/Postgres/SQLite in production)
const ACTIVE_LICENSES = new Map([
  ["PRO-PULSE-DEMO-2026", { plan: "pro", email: "demo-pro@copilotpulse.com", status: "active", expiresAt: "2027-12-31T23:59:59Z" }],
  ["LS-PRO-2026-ACTIVE", { plan: "pro", email: "subscriber@example.com", status: "active", expiresAt: "2027-12-31T23:59:59Z" }]
]);

class LemonSqueezyService {
  static getApiKey() {
    return process.env.LEMON_SQUEEZY_API_KEY || "";
  }

  static getWebhookSecret() {
    return process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "copilot_pulse_secret_key_2026";
  }

  /**
   * Verify Lemon Squeezy Webhook HMAC-SHA256 Signature
   */
  static verifyWebhookSignature(rawBody, signature) {
    const secret = this.getWebhookSecret();
    if (!secret || !signature) return false;

    try {
      const hmac = crypto.createHmac("sha256", secret);
      const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
      const signatureBuffer = Buffer.from(signature, "utf8");
      return crypto.timingSafeEqual(digest, signatureBuffer);
    } catch (e) {
      return false;
    }
  }

  /**
   * Validates a license key with Lemon Squeezy License API
   */
  static async validateWithLemonSqueezyApi(licenseKey, instanceName = "VSCode-CopilotPulse") {
    return new Promise((resolve) => {
      const postData = JSON.stringify({
        license_key: licenseKey.trim(),
        instance_name: instanceName
      });

      const options = {
        hostname: "api.lemonsqueezy.com",
        port: 443,
        path: "/v1/licenses/validate",
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        },
        timeout: 4000
      };

      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            if (data && data.valid === true) {
              resolve({
                valid: true,
                status: data.license_key?.status || "active",
                customerEmail: data.meta?.customer_email || "",
                productName: data.meta?.product_name || "Copilot Pulse Pro",
                expiresAt: data.license_key?.expires_at || null
              });
            } else {
              resolve({ valid: false, error: data.error || "Invalid license key on Lemon Squeezy." });
            }
          } catch (err) {
            resolve({ valid: false, error: "Failed to parse Lemon Squeezy response." });
          }
        });
      });

      req.on("error", () => resolve({ valid: false, error: "Lemon Squeezy API unreachable." }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ valid: false, error: "Lemon Squeezy API request timed out." });
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Process incoming Lemon Squeezy Webhook Events
   */
  static handleWebhookEvent(event) {
    const eventName = event.meta?.event_name;
    const data = event.data?.attributes;

    console.log(`[Lemon Squeezy Webhook] Received event: ${eventName}`);

    if (!data) return { success: false, message: "No attributes in payload." };

    const userEmail = data.user_email || data.customer_email || "";
    const licenseKey = data.license_key || (data.first_order_item && data.first_order_item.license_key) || "";

    switch (eventName) {
      case "subscription_created":
      case "subscription_resumed":
      case "order_created": {
        const key = licenseKey || `LS-${data.order_number || data.id || Date.now()}`;
        ACTIVE_LICENSES.set(key, {
          plan: "pro",
          email: userEmail,
          status: "active",
          createdAt: new Date().toISOString(),
          subscriptionId: event.data?.id
        });
        console.log(`[Lemon Squeezy] Pro subscription activated for: ${userEmail} (Key: ${key})`);
        return { success: true, action: "activated", licenseKey: key };
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        for (const [key, val] of ACTIVE_LICENSES.entries()) {
          if (val.subscriptionId === event.data?.id || (userEmail && val.email === userEmail)) {
            val.status = "expired";
            console.log(`[Lemon Squeezy] Subscription cancelled for: ${userEmail}`);
            return { success: true, action: "cancelled", key };
          }
        }
        return { success: true, action: "not_found" };
      }

      case "subscription_updated": {
        const status = data.status; // 'active', 'past_due', 'paused', 'unpaid'
        for (const [key, val] of ACTIVE_LICENSES.entries()) {
          if (val.subscriptionId === event.data?.id || (userEmail && val.email === userEmail)) {
            val.status = status;
            return { success: true, action: "updated", status };
          }
        }
        return { success: true, action: "updated" };
      }

      default:
        return { success: true, action: "ignored", eventName };
    }
  }

  /**
   * Internal lookup in active licenses map
   */
  static getLicense(licenseKey) {
    if (!licenseKey) return null;
    return ACTIVE_LICENSES.get(licenseKey.trim()) || null;
  }
}

module.exports = LemonSqueezyService;
