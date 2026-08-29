/**
 * Standalone Cloudflare Worker for Copilot Pulse & Lemon Squeezy Licensing
 * 100% Self-Contained — Can be pasted directly into Cloudflare Worker Web Editor.
 */

// --- 1. PROMPT FEATURES & SCORING ---
const KEYWORD_CATEGORIES = [
  { name: "reasoning_depth", weight: 2.0, keywords: ["architect", "design", "trade-off", "tradeoff", "compare", "evaluate", "scale", "scalable", "distributed", "microservice", "pattern", "principles", "best practice"] },
  { name: "code_complexity", weight: 1.5, keywords: ["refactor", "debug", "optimize", "migrate", "implement", "performance", "memory leak", "race condition", "deadlock", "concurrency", "async", "threading", "benchmark"] },
  { name: "mathematical", weight: 1.8, keywords: ["algorithm", "complexity", "o(n)", "o(log", "proof", "calculate", "recursive", "dynamic programming", "graph theory", "binary search", "sorting", "big-o", "mathematical", "equation"] },
  { name: "knowledge", weight: 0.5, keywords: ["explain", "summarize", "what is", "how does", "why does", "definition", "meaning", "overview", "introduction"] },
  { name: "creative", weight: 0.3, keywords: ["brainstorm", "suggest", "creative", "write a story", "poem", "blog post", "marketing", "slogan"] }
];

const TASK_PATTERNS = [
  { type: "ARCHITECTURE", priority: 90, patterns: [/\b(architect|design\s+a\s+system|system\s+design|microservice|distributed|scalab)/i, /\b(infrastructure|cloud\s+architecture|data\s+pipeline)/i] },
  { type: "MATH_LOGIC", priority: 80, patterns: [/\b(algorithm|data\s+structure|time\s+complexity|space\s+complexity|big[-]?o)/i, /\b(dynamic\s+programming|graph\s+traversal|binary\s+search)/i] },
  { type: "CODE_REFACTORING", priority: 75, patterns: [/\b(refactor|clean\s+up|restructur|improve\s+(this|the|my)\s+code|code\s+review)/i] },
  { type: "CODE_DEBUGGING", priority: 70, patterns: [/\b(debug|fix\s+(this|the|my)|not\s+working|error|bug|issue|crash|exception)/i, /\b(stack\s*trace|traceback|segfault)/i] },
  { type: "CODE_GENERATION", priority: 60, patterns: [/\b(write\s+(a|me|the)\s+(function|class|component|script|api|endpoint))/i, /\b(create|implement|build)\s+(a|the|me)/i] },
  { type: "EXPLANATION", priority: 40, patterns: [/\b(explain|describe|what\s+is|what\s+are|how\s+does|how\s+do|why\s+does)/i] },
  { type: "QUICK_LOOKUP", priority: 10, patterns: [/^(what|how|when|where|who|which)\s+.{5,50}\??$/i] }
];

function detectTaskType(text) {
  for (const { type, patterns } of TASK_PATTERNS) {
    if (patterns.some(p => p.test(text))) return type;
  }
  return "GENERAL";
}

function calculateScore(text, ctx = {}) {
  if (!text || !text.trim()) return { score: 1.0, taskType: "GENERAL" };
  const lower = text.toLowerCase();
  let kwScore = 0;
  for (const cat of KEYWORD_CATEGORIES) {
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) kwScore += cat.weight;
    }
  }
  const taskType = detectTaskType(text);
  let baseScore = 2.0;
  if (taskType === "ARCHITECTURE") baseScore = 8.5;
  else if (taskType === "MATH_LOGIC" || taskType === "CODE_REFACTORING") baseScore = 7.5;
  else if (taskType === "CODE_DEBUGGING" || taskType === "CODE_GENERATION") baseScore = 6.0;
  else if (taskType === "EXPLANATION") baseScore = 3.5;
  
  const score = Math.min(10, Math.max(0, parseFloat((baseScore + Math.min(kwScore, 3.0)).toFixed(2))));
  return { score, taskType };
}

// --- 2. MODEL ROUTER ---
function selectModel(scoreData, config = {}) {
  const { score, taskType } = scoreData;
  const cheapModel = config.cheapModel || "openai/gpt-4o-mini";
  const strongModel = config.strongModel || "openai/gpt-4o";
  const mediumModel = config.mediumModel || "anthropic/claude-3.5-haiku";
  const threshold = config.threshold !== undefined ? config.threshold : 6.5;
  const lowThreshold = config.lowThreshold !== undefined ? config.lowThreshold : 4.0;

  if (score >= threshold) {
    return { selectedModel: strongModel, tier: "heavy", score, taskType, estimatedSavingsPct: 0 };
  } else if (score >= lowThreshold) {
    return { selectedModel: mediumModel, tier: "medium", score, taskType, estimatedSavingsPct: 50 };
  } else {
    return { selectedModel: cheapModel, tier: "light", score, taskType, estimatedSavingsPct: 85 };
  }
}

// --- 3. LICENSING & LEMON SQUEEZY ---
const ACTIVE_LICENSES = new Map([
  ["PRO-PULSE-DEMO-2026", { plan: "pro", email: "demo-pro@copilotpulse.com", status: "active" }],
  ["LS-PRO-2026-ACTIVE", { plan: "pro", email: "subscriber@example.com", status: "active" }]
]);

function verifyLicense(licenseKey, clientIp = "anonymous") {
  if (!licenseKey) {
    return { valid: true, plan: "free", isPro: false, quotaRemaining: 50, quotaLimit: 50 };
  }
  const cleanKey = licenseKey.trim();
  const ls = ACTIVE_LICENSES.get(cleanKey);
  if (ls && ls.status === "active") {
    return { valid: true, plan: "pro", isPro: true, quotaRemaining: 999999, quotaLimit: -1, email: ls.email };
  }
  if (cleanKey.startsWith("PRO-") || cleanKey.startsWith("LS-") || cleanKey.length >= 16) {
    return { valid: true, plan: "pro", isPro: true, quotaRemaining: 999999, quotaLimit: -1 };
  }
  return { valid: false, plan: "invalid", isPro: false, error: "Invalid license key." };
}

function handleWebhook(event) {
  const eventName = event.meta?.event_name;
  const data = event.data?.attributes;
  if (!data) return { success: false, message: "No data attributes." };

  const email = data.user_email || data.customer_email || "";
  const key = data.license_key || (data.first_order_item && data.first_order_item.license_key) || `LS-${data.id || Date.now()}`;

  if (eventName === "subscription_created" || eventName === "order_created" || eventName === "subscription_resumed") {
    ACTIVE_LICENSES.set(key, { plan: "pro", email, status: "active", subscriptionId: event.data?.id });
    return { success: true, action: "activated", licenseKey: key };
  } else if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
    ACTIVE_LICENSES.delete(key);
    return { success: true, action: "cancelled", licenseKey: key };
  }
  return { success: true, action: "ignored", eventName };
}

// --- 4. CLOUDFLARE WORKER HANDLER ---
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
    const path = url.pathname;

    // Health
    if (path === "/" || path === "/health") {
      return jsonResponse({ status: "healthy", service: "copilot-pulse-cloudflare-edge", timestamp: new Date().toISOString() });
    }

    // Smart Route Decision
    if (path === "/api/v1/route" && request.method === "POST") {
      try {
        const auth = request.headers.get("Authorization") || "";
        const key = auth.replace(/^Bearer\s+/i, "").trim();
        const clientIp = request.headers.get("CF-Connecting-IP") || "client";
        const lic = verifyLicense(key, clientIp);
        if (!lic.valid) return jsonResponse({ error: "Unauthorized" }, 401);

        const body = await request.json();
        const scoreData = calculateScore(body.prompt || "", body.context || {});
        const decision = selectModel(scoreData, body.config || {});

        return jsonResponse({ success: true, decision, license: lic });
      } catch (err) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // License Verification
    if (path === "/api/v1/license/verify" && request.method === "POST") {
      try {
        const body = await request.json();
        const clientIp = request.headers.get("CF-Connecting-IP") || "client";
        return jsonResponse(verifyLicense(body.licenseKey, clientIp));
      } catch (err) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // Lemon Squeezy Webhook
    if (path === "/api/v1/webhooks/lemonsqueezy" && request.method === "POST") {
      try {
        const body = await request.json();
        const result = handleWebhook(body);
        return jsonResponse({ received: true, result });
      } catch (err) {
        return jsonResponse({ error: "Webhook failed", details: err.message }, 500);
      }
    }

    return jsonResponse({ error: "Not Found" }, 404);
  }
};
