"use strict";
/**
 * Copilot Pulse — auto-escalation policy.
 *
 * Detects that the currently-selected (cheaper) model cannot finish the task
 * and decides whether to retry the turn on a stronger tier.
 *
 * Escalation is what makes aggressive down-tiering *safe*: we can route
 * optimistically to Light/Medium for savings, because a failure is caught and
 * automatically re-run one band up instead of dead-ending on the user.
 *
 * No `vscode` import — unit-testable in plain Node.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ESCALATION_SETTINGS = exports.REASON_TEXT = exports.EscalationReason = void 0;
exports.isPromptSizeError = isPromptSizeError;
exports.isEscalatableError = isEscalatableError;
exports.declaresIncapacity = declaresIncapacity;
exports.nextBandUp = nextBandUp;
exports.evaluateTurn = evaluateTurn;
exports.pickEscalationModel = pickEscalationModel;
const ModelTiering_1 = require("../proxy/ModelTiering");
var EscalationReason;
(function (EscalationReason) {
    EscalationReason["HARD_ERROR"] = "hard_error";
    EscalationReason["STUCK_TOOL_LOOP"] = "stuck_tool_loop";
    EscalationReason["REPEATED_TOOL_ERRORS"] = "repeated_tool_errors";
    EscalationReason["EMPTY_RESPONSE"] = "empty_response";
    EscalationReason["MALFORMED_TOOL_CALL"] = "malformed_tool_call";
    EscalationReason["SELF_DECLARED_INCAPACITY"] = "self_declared_incapacity";
    EscalationReason["USER_DISSATISFACTION"] = "user_dissatisfaction";
})(EscalationReason || (exports.EscalationReason = EscalationReason = {}));
/** Human-readable text shown inline in chat when we escalate. */
exports.REASON_TEXT = {
    [EscalationReason.HARD_ERROR]: "the model returned an error",
    [EscalationReason.STUCK_TOOL_LOOP]: "the model repeated the same tool call without progressing",
    [EscalationReason.REPEATED_TOOL_ERRORS]: "several tool calls failed in a row",
    [EscalationReason.EMPTY_RESPONSE]: "the model returned an empty response",
    [EscalationReason.MALFORMED_TOOL_CALL]: "the model produced a malformed tool call",
    [EscalationReason.SELF_DECLARED_INCAPACITY]: "the model said it could not complete the task",
    [EscalationReason.USER_DISSATISFACTION]: "the previous attempt did not work"
};
exports.DEFAULT_ESCALATION_SETTINGS = {
    enabled: true,
    maxEscalations: 2,
    triggers: [
        EscalationReason.HARD_ERROR,
        EscalationReason.STUCK_TOOL_LOOP,
        EscalationReason.REPEATED_TOOL_ERRORS,
        EscalationReason.EMPTY_RESPONSE,
        EscalationReason.MALFORMED_TOOL_CALL,
        EscalationReason.SELF_DECLARED_INCAPACITY,
        EscalationReason.USER_DISSATISFACTION
    ],
    stuckLoopThreshold: 2,
    toolErrorThreshold: 3
};
/**
 * Error messages that mean "this model can't do it" (worth escalating) as
 * opposed to "the network hiccuped" (worth a plain retry on the same model).
 */
const ESCALATABLE_ERROR_PATTERNS = [
    /context[\s_-]?length|too\s+many\s+tokens|maximum\s+context|token\s+limit/i,
    /model[\s_-]?not[\s_-]?(found|available)|unsupported\s+model|no\s+such\s+model/i,
    /content[\s_-]?filter|responsible\s+ai|safety\s+policy/i,
    /does\s+not\s+support\s+tool|tool[\s_-]?calling\s+not\s+supported|function\s+calling.*not\s+supported/i,
    /model\s+is\s+overloaded|capacity/i,
    /invalid\s+tool|malformed/i,
    // prompt-tsx pruning failure — see isPromptSizeError below.
    /no\s+lowest\s+priority\s+node/i
];
/**
 * Errors meaning "the prompt does not fit and could not be pruned".
 *
 * `No lowest priority node found (path: …)` is Copilot Chat's prompt-tsx
 * renderer giving up: the message tree exceeds the target model's context
 * window and it cannot find anything left to drop. Critically, this surfaces
 * while *iterating the response stream* (sendRequest is lazy), so it bypasses
 * any try/catch around sendRequest itself.
 *
 * The cure is to shrink the request — fewer history turns, fewer tools — or
 * move to a model with a larger context window.
 */
const PROMPT_SIZE_ERROR_PATTERNS = [
    /no\s+lowest\s+priority\s+node/i,
    /context[\s_-]?length|maximum\s+context|token\s+limit|too\s+many\s+tokens/i,
    /prompt\s+is\s+too\s+long|exceeds?\s+the\s+context/i,
    /failed\s+to\s+render\s+prompt/i
];
/** True when the failure is "the prompt is too big for this model". */
function isPromptSizeError(err) {
    if (!err)
        return false;
    const msg = typeof err === "string" ? err : err.message || String(err);
    return PROMPT_SIZE_ERROR_PATTERNS.some((re) => re.test(msg));
}
/** Phrases where the model admits defeat. */
const INCAPACITY_PATTERNS = [
    /\bI\s+(can'?t|cannot|am\s+unable\s+to)\s+(help|do|complete|solve|fix|assist)/i,
    /\b(this|that)\s+is\s+(too\s+complex|beyond\s+my)/i,
    /\bI\s+don'?t\s+have\s+(enough|the)\s+(information|context|capability)/i,
    /\bI'?m\s+not\s+able\s+to\s+(complete|solve|do)/i,
    /\bbeyond\s+my\s+(current\s+)?(capabilities|abilities)/i
];
/** True when an error indicates the *model* is the problem. */
function isEscalatableError(err) {
    if (!err)
        return false;
    const msg = typeof err === "string" ? err : err.message || String(err);
    return ESCALATABLE_ERROR_PATTERNS.some((re) => re.test(msg));
}
/** True when the assistant text admits it cannot finish. */
function declaresIncapacity(text) {
    if (!text || text.trim().length === 0)
        return false;
    return INCAPACITY_PATTERNS.some((re) => re.test(text));
}
/** Next band up the ladder, or null if already at the top. */
function nextBandUp(current) {
    const order = current ? ModelTiering_1.BAND_ORDER[current] : -1;
    if (order >= ModelTiering_1.BAND_ORDER[ModelTiering_1.Band.HEAVY])
        return null;
    if (order < ModelTiering_1.BAND_ORDER[ModelTiering_1.Band.LIGHT])
        return ModelTiering_1.Band.LIGHT;
    return order === ModelTiering_1.BAND_ORDER[ModelTiering_1.Band.LIGHT] ? ModelTiering_1.Band.MEDIUM : ModelTiering_1.Band.HEAVY;
}
/**
 * Core decision function: given what happened during a turn, should we retry
 * on a stronger model?
 */
function evaluateTurn(obs, record, currentBand, settings = exports.DEFAULT_ESCALATION_SETTINGS) {
    if (!settings.enabled)
        return { shouldEscalate: false };
    // Cost guard — never exceed the per-conversation budget.
    if (record.escalations >= settings.maxEscalations) {
        return { shouldEscalate: false };
    }
    const target = nextBandUp(currentBand);
    if (!target) {
        // Already on the strongest tier; nothing stronger to try.
        return { shouldEscalate: false };
    }
    const allowed = (reason) => settings.triggers.includes(reason);
    let reason = null;
    if (obs.error && isEscalatableError(obs.error) && allowed(EscalationReason.HARD_ERROR)) {
        reason = EscalationReason.HARD_ERROR;
    }
    else if ((obs.maxToolRepeat ?? 0) >= settings.stuckLoopThreshold &&
        allowed(EscalationReason.STUCK_TOOL_LOOP)) {
        reason = EscalationReason.STUCK_TOOL_LOOP;
    }
    else if ((obs.toolErrors ?? 0) >= settings.toolErrorThreshold &&
        allowed(EscalationReason.REPEATED_TOOL_ERRORS)) {
        reason = EscalationReason.REPEATED_TOOL_ERRORS;
    }
    else if (obs.malformedToolCall && allowed(EscalationReason.MALFORMED_TOOL_CALL)) {
        reason = EscalationReason.MALFORMED_TOOL_CALL;
    }
    else if (!obs.error &&
        (!obs.text || obs.text.trim().length === 0) &&
        (obs.toolCalls?.length ?? 0) === 0 &&
        allowed(EscalationReason.EMPTY_RESPONSE)) {
        reason = EscalationReason.EMPTY_RESPONSE;
    }
    else if (declaresIncapacity(obs.text) && allowed(EscalationReason.SELF_DECLARED_INCAPACITY)) {
        reason = EscalationReason.SELF_DECLARED_INCAPACITY;
    }
    else if (obs.userDissatisfied && allowed(EscalationReason.USER_DISSATISFACTION)) {
        reason = EscalationReason.USER_DISSATISFACTION;
    }
    if (!reason)
        return { shouldEscalate: false };
    return {
        shouldEscalate: true,
        reason,
        nextBand: target,
        message: exports.REASON_TEXT[reason]
    };
}
/**
 * Picks the concrete model to escalate to within a band, preferring the
 * strongest option available so the retry has the best chance of succeeding.
 */
function pickEscalationModel(band, availableModels) {
    const tiers = ModelTiering_1.ModelTiering.buildTiers(availableModels);
    const tier = tiers.find((t) => t.band === band);
    if (tier && tier.models.length > 0) {
        return tier.models[tier.models.length - 1];
    }
    // Requested band has no models — fall back to the strongest model overall.
    const all = availableModels
        .filter((m) => m && m.trim().length > 0)
        .sort((a, b) => ModelTiering_1.ModelTiering.strengthOf(a) - ModelTiering_1.ModelTiering.strengthOf(b));
    return all.length > 0 ? all[all.length - 1] : null;
}
//# sourceMappingURL=EscalationPolicy.js.map