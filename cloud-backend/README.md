# Copilot Pulse Cloud Routing Engine & Licensing API

Proprietary, zero-leakage cloud backend service for **Copilot Pulse**.

## Features
- 🔒 **100% IP Protection**: All complexity algorithms, heuristic scoring, model tiering, and escalation decisions stay hidden in the cloud.
- 💳 **Freemium & Licensing**: Supports Lemon Squeezy / Stripe license verification with daily free quota (50 reqs/day) and unlimited Pro tier.
- ⚡ **High Performance**: Lightweight Node.js microservice (~5ms execution time).

## Endpoints

### 1. Route Decision
* **POST** `/api/v1/route`
* **Headers**: `Authorization: Bearer <LICENSE_KEY>`
* **Body**:
  ```json
  {
    "prompt": "Refactor this function for better performance",
    "context": { "hasTools": false, "attachmentCount": 1 },
    "config": { "cheapModel": "openai/gpt-4o-mini", "strongModel": "openai/gpt-4o" }
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "decision": {
      "selectedModel": "openai/gpt-4o",
      "tier": "heavy",
      "score": 7.2,
      "taskType": "CODE_REFACTORING",
      "rationale": "High complexity task...",
      "estimatedSavingsPct": 0
    },
    "license": {
      "plan": "pro",
      "isPro": true,
      "quotaRemaining": "unlimited"
    }
  }
  ```

### 2. Auto-Escalation Decision
* **POST** `/api/v1/escalate`
* **Body**:
  ```json
  {
    "currentModel": "openai/gpt-4o-mini",
    "trigger": "stuck_tool_loop",
    "identicalToolCount": 2,
    "strongModel": "openai/gpt-4o"
  }
  ```

### 3. License Verification
* **POST** `/api/v1/license/verify`
* **Body**: `{ "licenseKey": "PRO-PULSE-DEMO-2026" }`

## Deployment

### Deploy on Render / Railway / Fly.io:
1. Connect your GitHub repository.
2. Root directory: `cloud-backend`.
3. Start command: `npm start`.

### Deploy with Docker:
```bash
docker build -t copilot-pulse-cloud .
docker run -p 3000:3000 copilot-pulse-cloud
```
