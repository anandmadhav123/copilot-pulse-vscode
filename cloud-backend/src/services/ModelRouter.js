"use strict";

class ModelRouter {
  static selectModel(scoreData, config = {}) {
    const { score, taskType } = scoreData;
    const cheapModel = config.cheapModel || "openai/gpt-4o-mini";
    const strongModel = config.strongModel || "openai/gpt-4o";
    const mediumModel = config.mediumModel || "anthropic/claude-3.5-haiku";
    const threshold = config.threshold !== undefined ? config.threshold : 6.5;
    const lowThreshold = config.lowThreshold !== undefined ? config.lowThreshold : 4.0;

    let tier = "light";
    let selectedModel = cheapModel;
    let rationale = "";

    if (score >= threshold) {
      tier = "heavy";
      selectedModel = strongModel;
      rationale = `High complexity task (${taskType}) with score ${score} >= ${threshold}. Routing to frontier/heavy model.`;
    } else if (score >= lowThreshold) {
      tier = "medium";
      selectedModel = mediumModel || cheapModel;
      rationale = `Moderate complexity task (${taskType}) with score ${score}. Routing to balanced model.`;
    } else {
      tier = "light";
      selectedModel = cheapModel;
      rationale = `Low complexity query (${taskType}) with score ${score} < ${lowThreshold}. Routing to fast, high-savings light model.`;
    }

    return {
      selectedModel,
      tier,
      score,
      taskType,
      rationale,
      estimatedSavingsPct: tier === "light" ? 85 : tier === "medium" ? 50 : 0
    };
  }
}

module.exports = ModelRouter;
