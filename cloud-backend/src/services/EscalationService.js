"use strict";

class EscalationService {
  static evaluateEscalation(reqBody) {
    const { 
      currentModel, 
      currentTier = "light", 
      trigger = "hard_error", 
      consecutiveErrors = 1,
      identicalToolCount = 0,
      strongModel = "openai/gpt-4o"
    } = reqBody;

    let shouldEscalate = false;
    let nextTier = currentTier;
    let nextModel = currentModel;
    let reason = "";

    if (trigger === "stuck_tool_loop" && identicalToolCount >= 2) {
      shouldEscalate = true;
      nextTier = "heavy";
      nextModel = strongModel;
      reason = `Detected stuck tool loop (${identicalToolCount} identical calls). Upgrading to ${strongModel}.`;
    } else if (trigger === "repeated_tool_errors" && consecutiveErrors >= 2) {
      shouldEscalate = true;
      nextTier = "heavy";
      nextModel = strongModel;
      reason = `Repeated tool execution errors (${consecutiveErrors} failures). Escalating to stronger reasoning model.`;
    } else if (trigger === "hard_error" || trigger === "malformed_tool_call") {
      shouldEscalate = true;
      nextTier = "heavy";
      nextModel = strongModel;
      reason = `Model failure trigger '${trigger}'. Escalating to frontier tier.`;
    } else {
      reason = "Escalation criteria not met.";
    }

    return {
      shouldEscalate,
      previousModel: currentModel,
      nextModel: shouldEscalate ? nextModel : currentModel,
      nextTier,
      reason
    };
  }
}

module.exports = EscalationService;
