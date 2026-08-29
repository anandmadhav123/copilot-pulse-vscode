"use strict";

const PromptFeatures = require("./PromptFeatures");
const ComplexityModel = require("./ComplexityModel");
const ConversationState = require("./ConversationState");

class ComplexityScorer {
  static detectTaskType(text) {
    if (!text) return "GENERAL";
    return PromptFeatures.detectTaskType(text).type;
  }

  static calculateScore(text, ctx = {}) {
    if (!text || text.trim().length === 0) {
      return { 
        score: 0.0, 
        taskType: "GENERAL", 
        breakdown: { keyword: 0, intent: 0, code: 0 },
        notes: []
      };
    }

    const features = PromptFeatures.extractFeatures(text, ctx);
    const scoreResult = ComplexityModel.scoreFeatures(features);
    const taskType = features.taskType || this.detectTaskType(text);

    return {
      score: parseFloat(scoreResult.total.toFixed(2)),
      taskType: taskType,
      breakdown: scoreResult.signals,
      signals: scoreResult.signals,
      notes: scoreResult.notes,
      features: features
    };
  }
}

module.exports = ComplexityScorer;
