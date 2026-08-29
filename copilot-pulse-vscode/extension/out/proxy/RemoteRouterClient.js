"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteRouterClient = void 0;

const https = require("https");
const http = require("http");

class RemoteRouterClient {
  static getEndpoint(config) {
    if (config?.cloudEndpoint && config.cloudEndpoint.trim().length > 0) {
      return config.cloudEndpoint.trim().replace(/\/+$/, "");
    }
    return "https://bold-tooth-3b12.anand-madhav.workers.dev"; // Default cloud endpoint
  }

  static async makeRequest(urlStr, method, headers = {}, payload = null, timeoutMs = 2500) {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(urlStr);
        const isHttps = url.protocol === "https:";
        const client = isHttps ? https : http;
        const postData = payload ? JSON.stringify(payload) : "";

        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + (url.search || ""),
          method: method,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
            ...headers
          },
          timeout: timeoutMs
        };

        const req = client.request(options, (res) => {
          let body = "";
          res.on("data", (chunk) => { body += chunk; });
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(body);
                resolve(parsed);
              } catch (e) {
                reject(new Error("Invalid JSON response from Cloud Router API"));
              }
            } else {
              reject(new Error(`Cloud Router returned status ${res.statusCode}: ${body}`));
            }
          });
        });

        req.on("error", (err) => reject(err));
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Cloud Router request timed out"));
        });

        if (postData) {
          req.write(postData);
        }
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Route decision executed via the proprietary Cloud Routing Engine.
   */
  static async routeDecisionAsync(prompt, config, hasTools = false, ctx = {}) {
    const endpoint = this.getEndpoint(config);
    const licenseKey = config?.licenseKey || "";

    const payload = {
      prompt,
      context: {
        hasTools,
        toolCount: ctx?.toolCount ?? (hasTools ? 1 : 0),
        attachmentCount: ctx?.attachmentCount ?? 0,
        conversationId: ctx?.conversationId
      },
      config: {
        cheapModel: config?.cheapModel || "openai/gpt-4o-mini",
        strongModel: config?.strongModel || "openai/gpt-4o",
        threshold: config?.threshold ?? 6.5,
        lowThreshold: config?.lowThreshold ?? 4.0
      }
    };

    try {
      const response = await this.makeRequest(
        `${endpoint}/api/v1/route`,
        "POST",
        { "Authorization": licenseKey ? `Bearer ${licenseKey}` : "" },
        payload
      );

      if (response && response.success && response.decision) {
        const d = response.decision;
        return {
          model: d.selectedModel,
          score: d.score,
          tier: `${d.tier.charAt(0).toUpperCase() + d.tier.slice(1)} tier (Cloud Protected)`,
          savings: d.tier !== "heavy",
          breakdown: d.breakdown,
          band: d.tier,
          rationale: d.rationale,
          licenseInfo: response.license,
          fromCloud: true
        };
      }
    } catch (err) {
      console.warn("[Copilot Pulse] Cloud router unreachable or offline, using safe fallback:", err.message);
    }

    // Safe offline fallback (Low-cost model default)
    const defaultModel = config?.cheapModel || "openai/gpt-4o-mini";
    return {
      model: defaultModel,
      score: 3.0,
      tier: "Light tier (Fallback)",
      savings: true,
      band: "light",
      rationale: "Cloud router offline; used safe lightweight default.",
      fromCloud: false
    };
  }

  /**
   * Auto-escalation decision evaluated via the Cloud Engine.
   */
  static async escalateDecisionAsync(payload, config) {
    const endpoint = this.getEndpoint(config);
    const licenseKey = config?.licenseKey || "";

    try {
      const response = await this.makeRequest(
        `${endpoint}/api/v1/escalate`,
        "POST",
        { "Authorization": licenseKey ? `Bearer ${licenseKey}` : "" },
        payload
      );

      if (response && response.success && response.escalation) {
        return response.escalation;
      }
    } catch (err) {
      console.warn("[Copilot Pulse] Remote escalation check failed, falling back locally:", err.message);
    }

    return {
      shouldEscalate: true,
      nextModel: payload.strongModel || "openai/gpt-4o",
      nextTier: "heavy",
      reason: "Fallback escalation."
    };
  }

  /**
   * License verification helper.
   */
  static async verifyLicenseAsync(licenseKey, endpoint = "https://bold-tooth-3b12.anand-madhav.workers.dev") {
    try {
      const response = await this.makeRequest(
        `${endpoint}/api/v1/license/verify`,
        "POST",
        {},
        { licenseKey }
      );
      return response;
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}

exports.RemoteRouterClient = RemoteRouterClient;
