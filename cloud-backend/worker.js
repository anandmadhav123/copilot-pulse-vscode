/**
 * Cloudflare Worker for Copilot Pulse Cloud Routing & Licensing Engine
 * 100% Free Tier (100,000 requests/day, 0 server cost, global edge latency <10ms)
 */

import ComplexityScorer from "./src/services/ComplexityScorer.js";
import ModelRouter from "./src/services/ModelRouter.js";
import EscalationService from "./src/services/EscalationService.js";
import LicenseService from "./src/services/LicenseService.js";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Health
    if (pathname === "/health" || pathname === "/") {
      return jsonResponse({ status: "healthy", service: "copilot-pulse-cloudflare-edge" });
    }

    // Route
    if (pathname === "/api/v1/route" && request.method === "POST") {
      try {
        const auth = request.headers.get("Authorization") || "";
        const licenseKey = auth.replace(/^Bearer\s+/i, "").trim();
        const clientIp = request.headers.get("CF-Connecting-IP") || "client";

        const license = LicenseService.verifyLicense(licenseKey, clientIp);
        if (!license.valid) {
          return jsonResponse({ error: "Unauthorized: Invalid license key." }, 401);
        }

        const body = await request.json();
        const { prompt, context = {}, config = {} } = body;
        if (!prompt) {
          return jsonResponse({ error: "Prompt is required." }, 400);
        }

        const scoreData = ComplexityScorer.calculateScore(prompt, context);
        const decision = ModelRouter.selectModel(scoreData, config);

        return jsonResponse({
          success: true,
          decision,
          license: {
            plan: license.plan,
            isPro: license.isPro,
            quotaRemaining: license.isPro ? "unlimited" : license.quotaRemaining
          }
        });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    // Escalate
    if (pathname === "/api/v1/escalate" && request.method === "POST") {
      try {
        const body = await request.json();
        const result = EscalationService.evaluateEscalation(body);
        return jsonResponse({ success: true, escalation: result });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    // Verify License
    if (pathname === "/api/v1/license/verify" && request.method === "POST") {
      try {
        const body = await request.json();
        const clientIp = request.headers.get("CF-Connecting-IP") || "client";
        const result = LicenseService.verifyLicense(body.licenseKey, clientIp);
        return jsonResponse(result);
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    return jsonResponse({ error: "Not found" }, 404);
  }
};
