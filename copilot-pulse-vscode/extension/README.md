# ⚡ Copilot Pulse — Intelligent Model Router & Auto-Escalation Engine for VS Code

[![Visual Studio Marketplace](https://img.shields.io/badge/VS_Code_Marketplace-v1.0.0-blue.svg?logo=visual-studio-code)](https://marketplace.visualstudio.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Edge Routing](https://img.shields.io/badge/Edge_Routing-Global_Cloudflare-orange.svg)](https://bold-tooth-3b12.anand-madhav.workers.dev)

**Copilot Pulse** is an autonomous AI router and auto-escalation engine for Visual Studio Code. It analyzes every prompt in real-time, calculates a multidimensional complexity score (0–10), and routes the request to the most cost-effective and capable AI model tier. If a lighter model gets stuck or encounters errors, Pulse automatically escalates to a stronger frontier model.

> **One Chat Agent. Every Tier. Zero Manual Model-Switching. Up to 85% Token & Credit Savings.**

---

## 🚀 Key Features

* 🎯 **Dynamic 3-Tier Smart Routing**
  * **Light Tier (Fast & Cheap):** GPT-4o-mini, Claude 3.5 Haiku, Gemini Flash — for syntax lookups, docstrings, boilerplate, and basic edits.
  * **Medium Tier (Balanced):** Claude 3.5 Sonnet, GPT-4o — for refactoring, test generation, and multi-file debugging.
  * **Heavy Tier (Frontier Reasoning):** Claude 3.7 Sonnet (Thinking), o1 / o3-mini, GPT-4.5 — for full architecture design, algorithms, race conditions, and complex system planning.

* ⬆️ **Autonomous Auto-Escalation**
  * Automatically detects repeated tool loops, context window pressure, or execution errors on cheaper models.
  * Retries on a stronger frontier model without interrupting your workflow or losing conversation context.

* 📊 **Real-Time Interactive Savings Dashboard**
  * Live breakdown of tokens saved, cost efficiency (50%–85% savings), model distribution, and prompt complexity score breakdowns.

* 🌐 **Cloud Intelligence & Pro Subscription (Lemon Squeezy)**
  * **Free Tier:** 50 smart-routed queries per day.
  * **Pro Tier:** Unlimited real-time cloud routing, instant Lemon Squeezy license validation, and premium multi-model escalation.

---

## 🛠️ How to Use Copilot Pulse

### Method 1: Chat Participant `@copilotpulse` (Recommended)

1. Open the **GitHub Copilot Chat** panel in VS Code (`Ctrl + Alt + I` on Windows/Linux or `Cmd + Shift + I` on Mac).
2. Type `@copilotpulse` at the start of your message:
   ```text
   @copilotpulse refactor this function to handle async errors and write unit tests
   ```
3. **Sticky Session:** Once you invoke `@copilotpulse`, all follow-up prompts in the same thread automatically route through Pulse without retyping the tag.

---

### Method 2: Open the Interactive Dashboard

1. Click the **Zap (⚡)** icon on the VS Code Activity Bar (left sidebar) **OR** press `Cmd + Shift + P` / `Ctrl + Shift + P` and search:
   ```text
   Copilot Pulse: Open Dashboard
   ```
2. In the dashboard, you can:
   - Monitor real-time routing decisions and complexity scores.
   - View your estimated cost and token savings.
   - Activate your **Copilot Pulse Pro** license key.
   - Click **Upgrade to Pro** to unlock unlimited queries via Lemon Squeezy.

---

### Method 3: Bring Your Own Keys (BYOK Mode)

If you prefer using your own OpenAI or OpenRouter API keys directly:
1. Open VS Code Settings (`Cmd + ,` or `Ctrl + ,`).
2. Search for `Copilot Pulse` and set:
   - `copilotPulse.apiKey`: Your OpenRouter or OpenAI API key (`sk-or-...` or `sk-...`).
   - `copilotPulse.baseUrl`: `https://openrouter.ai/api/v1` (or your custom OpenAI-compatible endpoint).

---

## ⚙️ Configuration Reference (`settings.json`)

You can customize Copilot Pulse via the VS Code Settings UI or directly in `.vscode/settings.json`:

```json
{
  // Cloud Routing & Licensing Endpoint
  "copilotPulse.cloudEndpoint": "https://bold-tooth-3b12.anand-madhav.workers.dev",
  "copilotPulse.useCloudRouting": true,
  
  // Pro Subscription License Key (from Lemon Squeezy)
  "copilotPulse.licenseKey": "LS-xxxx-xxxx-xxxx",
  
  // Model Tier Customization
  "copilotPulse.cheapModel": "openai/gpt-4o-mini",
  "copilotPulse.strongModel": "openai/gpt-4o",
  
  // Routing Thresholds (0.0 to 10.0 scale)
  "copilotPulse.threshold": 6.5,
  "copilotPulse.lowThreshold": 4.0,
  
  // Auto-Escalation Controls
  "copilotPulse.escalation.enabled": true,
  "copilotPulse.escalation.maxEscalationsPerConversation": 2,
  "copilotPulse.maxAgentTurns": 25,
  
  // Upgrade Checkout URL
  "copilotPulse.upgradeUrl": "https://copilotpulse.lemonsqueezy.com/checkout/buy/8a364ccb-07cf-4f76-ad74-c0e6613bb913"
}
```

---

## ⌨️ Command Palette Shortcuts

| Command | Shortcut | Description |
| :--- | :--- | :--- |
| `Copilot Pulse: Open Dashboard` | `Cmd+Shift+P` → Dashboard | Opens live savings & analytics view |
| `Copilot Pulse: Show Supported Models` | `Cmd+Shift+P` → Models | Displays detected models grouped into tiers |
| `Copilot Pulse: Test Connection` | `Cmd+Shift+P` → Test | Validates connection to the routing engine |

---

## 🔒 Privacy & Security

* **Zero Prompt Leakage:** Your prompts are evaluated for complexity metadata and sent securely to your configured AI model provider.
* **No Telemetry Logging:** No proprietary source code is logged or stored.

---

## 📄 License & Publisher

* **Publisher:** Copilot Pulse
* **License:** [MIT License](./LICENSE)
* **Support & Issues:** [GitHub Issues](https://github.com/manand26_uhg/copilot-pulse-vscode/issues)
