"use strict";

const { ModelTiering, Band } = require("../proxy/ModelTiering");

const SPECIALIST_TYPES = {
    ARCHITECTURE: "architecture",
    CODING: "coding",
    TESTING: "testing",
    DOCUMENTATION: "documentation",
    SECURITY: "security",
    GENERAL: "general"
};

class TaskDecomposer {
    static isMultiTaskPrompt(prompt) {
        if (!prompt || prompt.trim().length < 25) return false;
        const text = prompt.toLowerCase();
        
        let intentCount = 0;
        if (/(architecture|system design|infra|diagram|data flow|database schema|db design)/i.test(text)) intentCount++;
        if (/(implement|create|build|write (code|function|class|service|api|backend|endpoint)|refactor|develop)/i.test(text)) intentCount++;
        if (/(unit test|test case|testing|write tests|jest|pytest|mock|integration test|coverage)/i.test(text)) intentCount++;
        if (/(document|readme|api doc|swagger|openapi|documentation|explain)/i.test(text)) intentCount++;
        if (/(security|sanitize|vulnerability|audit|performance|benchmark|optimize)/i.test(text)) intentCount++;

        const hasConjunction = /(and also|along with|furthermore|additionally|as well as|then write|then create|plus tests|with tests|and tests)/i.test(text);
        const hasNumberedList = /\b(1\.|2\.|firstly|secondly|step 1|step 2)\b/i.test(text);

        return (intentCount >= 2) || (intentCount >= 1 && (hasConjunction || hasNumberedList));
    }

    static decompose(prompt, availableModels = []) {
        if (!this.isMultiTaskPrompt(prompt)) {
            return [{
                id: "task_1",
                type: SPECIALIST_TYPES.GENERAL,
                title: "Primary Task",
                prompt: prompt,
                specialistModel: this.selectSpecialistModel(SPECIALIST_TYPES.GENERAL, availableModels)
            }];
        }

        const text = prompt.trim();
        const subTasks = [];
        let counter = 1;

        if (/(architecture|system design|infra|diagram|data flow|database schema|db design)/i.test(text)) {
            subTasks.push({
                id: `task_${counter++}`,
                type: SPECIALIST_TYPES.ARCHITECTURE,
                title: "🏗️ System Architecture & Design",
                prompt: `You are a Principal Systems Architect. Based on the user's objective: "${text}", provide a clear architectural design, component flow, and system schema.`,
                specialistModel: this.selectSpecialistModel(SPECIALIST_TYPES.ARCHITECTURE, availableModels)
            });
        }

        if (/(implement|create|build|write (code|function|class|service|api|backend|endpoint)|refactor|develop)/i.test(text) || subTasks.length === 0) {
            subTasks.push({
                id: `task_${counter++}`,
                type: SPECIALIST_TYPES.CODING,
                title: "💻 Core Implementation & Code",
                prompt: `You are an expert Senior Software Engineer. Implement clean, robust, production-ready code with complete types and error handling for: "${text}".`,
                specialistModel: this.selectSpecialistModel(SPECIALIST_TYPES.CODING, availableModels)
            });
        }

        if (/(unit test|test case|testing|write tests|jest|pytest|mock|integration test|coverage|with tests|and tests|plus tests)/i.test(text)) {
            subTasks.push({
                id: `task_${counter++}`,
                type: SPECIALIST_TYPES.TESTING,
                title: "🧪 Unit Tests & Edge Cases",
                prompt: `You are a QA & Test Automation Specialist. Write comprehensive, rigorous unit test suites with mocks and boundary edge cases for: "${text}".`,
                specialistModel: this.selectSpecialistModel(SPECIALIST_TYPES.TESTING, availableModels)
            });
        }

        if (/(document|readme|api doc|swagger|openapi|documentation)/i.test(text)) {
            subTasks.push({
                id: `task_${counter++}`,
                type: SPECIALIST_TYPES.DOCUMENTATION,
                title: "📝 API Specs & Documentation",
                prompt: `You are a Technical Writer. Produce clear, concise API documentation and usage examples for: "${text}".`,
                specialistModel: this.selectSpecialistModel(SPECIALIST_TYPES.DOCUMENTATION, availableModels)
            });
        }

        if (/(security|sanitize|vulnerability|audit|performance|benchmark|optimize)/i.test(text)) {
            subTasks.push({
                id: `task_${counter++}`,
                type: SPECIALIST_TYPES.SECURITY,
                title: "🛡️ Security & Performance Audit",
                prompt: `You are a Security & Performance Engineer. Review and provide hardening recommendations and performance optimization notes for: "${text}".`,
                specialistModel: this.selectSpecialistModel(SPECIALIST_TYPES.SECURITY, availableModels)
            });
        }

        return subTasks;
    }

    static selectSpecialistModel(type, availableModels = []) {
        const cleanList = Array.from(new Set(availableModels.map(m => (typeof m === "string" ? m : m.id || m.name || m.family || "")).filter(Boolean)));
        
        if (cleanList.length === 0) {
            switch (type) {
                case SPECIALIST_TYPES.ARCHITECTURE: return "google/gemini-1.5-pro";
                case SPECIALIST_TYPES.CODING: return "anthropic/claude-3.5-sonnet";
                case SPECIALIST_TYPES.TESTING: return "openai/gpt-4o-mini";
                case SPECIALIST_TYPES.DOCUMENTATION: return "google/gemini-1.5-flash";
                default: return "openai/gpt-4o";
            }
        }

        if (type === SPECIALIST_TYPES.ARCHITECTURE) {
            const archPick = cleanList.find(m => /gemini.*pro|opus|o1|o3|r1|deepseek-reasoner/i.test(m)) ||
                             ModelTiering.strongestInBandOrClosest(Band.HEAVY, cleanList);
            return archPick || cleanList[0];
        }

        if (type === SPECIALIST_TYPES.CODING) {
            const codePick = cleanList.find(m => /claude.*sonnet|gpt-4o(?!\-mini)|codestral|deepseek-coder/i.test(m)) ||
                             ModelTiering.strongestInBandOrClosest(Band.HEAVY, cleanList);
            return codePick || cleanList[0];
        }

        if (type === SPECIALIST_TYPES.TESTING || type === SPECIALIST_TYPES.DOCUMENTATION) {
            const lightPick = cleanList.find(m => /mini|haiku|flash|lite/i.test(m)) ||
                              ModelTiering.strongestInBandOrClosest(Band.LIGHT, cleanList);
            return lightPick || cleanList[0];
        }

        return ModelTiering.strongestInBandOrClosest(Band.MEDIUM, cleanList) || cleanList[0];
    }
}

module.exports = {
    TaskDecomposer,
    SPECIALIST_TYPES
};
