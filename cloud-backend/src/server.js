"use strict";

const http = require("http");
const ComplexityScorer = require("./services/ComplexityScorer");
const ModelRouter = require("./services/ModelRouter");
const EscalationService = require("./services/EscalationService");
const LicenseService = require("./services/LicenseService");

function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res, statusCode, payload) {
  const jsonStr = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(jsonStr),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(jsonStr);
}

async function requestListener(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    return res.end();
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // 1. Health Check
  if (pathname === "/health" && req.method === "GET") {
    return sendJson(res, 200, {
      status: "healthy",
      service: "copilot-pulse-cloud-routing",
      timestamp: new Date().toISOString()
    });
  }

  // 2. Secret Route Decision Endpoint
  if (pathname === "/api/v1/route" && req.method === "POST") {
    try {
      const authHeader = req.headers["authorization"] || "";
      const licenseKey = authHeader.replace(/^Bearer\s+/i, "").trim();
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "client";

      const license = LicenseService.verifyLicense(licenseKey, clientIp);
      if (!license.valid) {
        return sendJson(res, 401, { error: "Unauthorized: Invalid license key." });
      }

      if (license.isLimitReached) {
        return sendJson(res, 429, {
          error: "Daily free quota exceeded. Upgrade to Copilot Pulse Pro for unlimited routing.",
          upgradeUrl: "https://copilotpulse.com/pricing"
        });
      }

      const body = await parseBody(req);
      const { prompt, context = {}, config = {} } = body;
      if (!prompt) {
        return sendJson(res, 400, { error: "Prompt is required." });
      }

      const scoreData = ComplexityScorer.calculateScore(prompt, context);
      const decision = ModelRouter.selectModel(scoreData, config);

      LicenseService.recordUsage(licenseKey, clientIp);

      return sendJson(res, 200, {
        success: true,
        decision: {
          selectedModel: decision.selectedModel,
          tier: decision.tier,
          score: decision.score,
          taskType: decision.taskType,
          rationale: decision.rationale,
          estimatedSavingsPct: decision.estimatedSavingsPct
        },
        license: {
          plan: license.plan,
          isPro: license.isPro,
          quotaRemaining: license.isPro ? "unlimited" : license.quotaRemaining - 1
        }
      });
    } catch (err) {
      console.error("Routing error:", err);
      return sendJson(res, 500, { error: "Internal routing engine error." });
    }
  }

  // 3. Auto-Escalation Decision Endpoint
  if (pathname === "/api/v1/escalate" && req.method === "POST") {
    try {
      const authHeader = req.headers["authorization"] || "";
      const licenseKey = authHeader.replace(/^Bearer\s+/i, "").trim();
      const license = LicenseService.verifyLicense(licenseKey);

      if (!license.valid) {
        return sendJson(res, 401, { error: "Unauthorized" });
      }

      const body = await parseBody(req);
      const escalationResult = EscalationService.evaluateEscalation(body);
      return sendJson(res, 200, {
        success: true,
        escalation: escalationResult
      });
    } catch (err) {
      console.error("Escalation error:", err);
      return sendJson(res, 500, { error: "Internal escalation error." });
    }
  }

  // 4. License Verification Endpoint
  if (pathname === "/api/v1/license/verify" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "client";
      const result = LicenseService.verifyLicense(body.licenseKey, clientIp);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { error: "License verification failed." });
    }
  }

  // 5. Lemon Squeezy Webhook Endpoint (Auto Subscription Management)
  if (pathname === "/api/v1/webhooks/lemonsqueezy" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const LemonSqueezyService = require("./services/LemonSqueezyService");
      const result = LemonSqueezyService.handleWebhookEvent(body);
      return sendJson(res, 200, { received: true, result });
    } catch (err) {
      console.error("Lemon Squeezy Webhook Error:", err);
      return sendJson(res, 500, { error: "Webhook processing error" });
    }
  }

  return sendJson(res, 404, { error: "Endpoint not found" });
}

const server = http.createServer(requestListener);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`⚡ Copilot Pulse Cloud Engine running on http://127.0.0.1:${PORT}`);
  });
}

module.exports = { server, requestListener };
