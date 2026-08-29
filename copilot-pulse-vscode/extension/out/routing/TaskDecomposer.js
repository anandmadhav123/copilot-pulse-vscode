"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDecomposer = exports.SPECIALIST_TYPES = void 0;

const ModelTiering_1 = require("../proxy/ModelTiering");

exports.SPECIALIST_TYPES = {
    ARCHITECTURE: "architecture",
    CODING: "coding",
    TESTING: "testing",
    DOCUMENTATION: "documentation",
    SECURITY: "security",
    GENERAL: "general"
};

class TaskDecomposer {
    /**
     * Inspects a prompt to determine if it contains multiple distinct actionable tasks.
     */
    static isMultiTaskPrompt(prompt) {
        if (!prompt || prompt.trim().length < 25) {
            return false;
        }
        const text = prompt.toLowerCase();
        
        // Count distinct intent domains present in the prompt
        let intentCount = 0;
        const hasArch = /(architecture|system design|infra|diagram|data flow|database schema|db design)/i.test(text);
        const hasCode = /(implement|create|build|write (code|function|class|service|api|backend|endpoint)|refactor|develop)/i.test(text);
        const hasTest = /(unit test|test case|testing|write tests|jest|pytest|mock|integration test|coverage)/i.test(text);
        const hasDoc = /(document|readme|api doc|swagger|openapi|documentation|explain)/i.test(text);
        const hasSec = /(security|sanitize|vulnerability|audit|performance|benchmark|optimize)/i.test(text);

        if (hasArch) intentCount++;
        if (hasCode) intentCount++;
        if (hasTest) intentCount++;
        if (hasDoc) intentCount++;
        if (hasSec) intentCount++;

        // Also check for explicit multi-task conjunctive connectors
        const hasConjunction = /(and also|along with|furthermore|additionally|as well as|then write|then create|plus tests|with tests|and tests)/i.test(text);
        const hasNumberedList = /\b(1\.|2\.|firstly|secondly|step 1|step 2)\b/i.test(text);

        return (intentCount >= 2) || (intentCount >= 1 && (hasConjunction || hasNumberedList));
    }

    /**
     * Decomposes the user prompt into specialized sub-tasks.
     */
    static decompose(prompt, availableModels = []) {
        if (!this.isMultiTaskPrompt(prompt)) {
            return [{
                id: "task_1",
                type: exports.SPECIALIST_TYPES.GENERAL,
                title: "Primary Task",
                prompt: prompt,
                specialistModel: this.selectSpecialistModel(exports.SPECIALIST_TYPES.GENERAL, availableModels)
            }];
        }

        const text = prompt.trim();
        const subTasks = [];
        let counter = 1;

        // 1. Architecture / System Design Check
        if (/(architecture|system design|infra|diagram|data flow|database schema|db design)/i.test(text)) {
            subTasks.push({
                id: `task_${counter++}`,
                type: exports.SPECIALIST_TYPES.ARCHITECTURE,
                title: "🏗️ System Architecture & Design",
                prompt: `You are a Principal Systems Architect. Based on the user's objective: "${text}", provide a clear, robust architectural design, component flow, and system schema. Focus purely on high-level architecture, design decisions, and data flows.`,
                specialistModel: this.selectSpecialistModel(exports.SPECIALIST_TYPES.ARCHITECTURE, availableModels)
            });
        }

        // 2. Core Implementation / Coding Check
        if (/(implement|create|build|write (code|function|class|service|api|backend|endpoint)|refactor|develop)/i.test(text) || subTasks.length === 0) {
            subTasks.push({
                id: `task_${counter++}`,
                type: exports.SPECIALIST_TYPES.CODING,
                title: "💻 Core Implementation & Code",
                prompt: `You are an expert Senior Software Engineer. Implement clean, robust, production-ready code with complete types and error handling for: "${text}". Focus purely on the working code implementation without redundant architectural fluff.`,
                specialistModel: this.selectSpecialistModel(exports.SPECIALIST_TYPES.CODING, availableModels)
            });
        }

        // 3. Unit Testing & Test Cases Check
        if (/(unit test|test case|testing|write tests|jest|pytest|mock|integration test|coverage|with tests|and tests|plus tests)/i.test(text)) {
            subTasks.push({
                id: `task_${counter++}`,
                type: exports.SPECIALIST_TYPES.TESTING,
                title: "🧪 Unit Tests & Edge Cases",
                prompt: `You are a QA & Test Automation Specialist. Write comprehensive, rigorous unit test suites with mocks and boundary edge cases for: "${text}". Use idiomatic testing frameworks (e.g. Jest/PyTest) and assert all happy paths and error branches.`,
                specialistModel: this.selectSpecialistModel(exports.SPECIALIST_TYPES.TESTING, availableModels)
            });
        }

        // 4. Documentation & API Spec Check
        if (/(document|readme|api doc|swagger|openapi|documentation)/i.test(text)) {
            subTasks.push({
                id: `task_${counter++}`,
                type: exports.SPECIALIST_TYPES.DOCUMENTATION,
                title: "📝 API Specs & Documentation",
                prompt: `You are a Technical Writer. Produce clear, concise API documentation, usage examples, and configuration specs for: "${text}".`,
                specialistModel: this.selectSpecialistModel(exports.SPECIALIST_TYPES.DOCUMENTATION, availableModels)
            });
        }

        // 5. Security & Optimization Check
        if (/(security|sanitize|vulnerability|audit|performance|benchmark|optimize)/i.test(text)) {
            subTasks.push({
                id: `task_${counter++}`,
                type: exports.SPECIALIST_TYPES.SECURITY,
                title: "🛡️ Security & Performance Audit",
                prompt: `You are a Security & Performance Engineer. Review and provide hardening recommendations, sanitization rules, and performance optimization notes for: "${text}".`,
                specialistModel: this.selectSpecialistModel(exports.SPECIALIST_TYPES.SECURITY, availableModels)
            });
        }

        return subTasks;
    }

    /**
     * Chooses the optimal specialist model for a specific task category.
     */
    static selectSpecialistModel(type, availableModels = []) {
        const cleanList = Array.from(new Set(availableModels.map(m => (typeof m === "string" ? m : m.id || m.name || m.family || "")).filter(Boolean)));
        
        if (cleanList.length === 0) {
            // Default fallbacks based on domain specialization
            switch (type) {
                case exports.SPECIALIST_TYPES.ARCHITECTURE:
                    return "google/gemini-1.5-pro";
                case exports.SPECIALIST_TYPES.CODING:
                    return "anthropic/claude-3.5-sonnet";
                case exports.SPECIALIST_TYPES.TESTING:
                    return "openai/gpt-4o-mini";
                case exports.SPECIALIST_TYPES.DOCUMENTATION:
                    return "google/gemini-1.5-flash";
                default:
                    return "openai/gpt-4o";
            }
        }

        if (type === exports.SPECIALIST_TYPES.ARCHITECTURE) {
            // Prefer Gemini Pro or high-reasoning models (o1, opus, gemini-1.5-pro, r1)
            const archPick = cleanList.find(m => /gemini.*pro|opus|o1|o3|r1|deepseek-reasoner/i.test(m)) ||
                             ModelTiering_1.ModelTiering.strongestInBandOrClosest(ModelTiering_1.Band.HEAVY, cleanList);
            return archPick || cleanList[0];
        }

        if (type === exports.SPECIALIST_TYPES.CODING) {
            // Prefer Claude 3.5 Sonnet, GPT-4o, or Heavy coding models
            const codePick = cleanList.find(m => /claude.*sonnet|gpt-4o(?!\-mini)|codestral|deepseek-coder/i.test(m)) ||
                             ModelTiering_1.ModelTiering.strongestInBandOrClosest(ModelTiering_1.Band.HEAVY, cleanList);
            return codePick || cleanList[0];
        }

        if (type === exports.SPECIALIST_TYPES.TESTING) {
            // Prefer fast, cost-efficient models with good syntax generation (gpt-4o-mini, haiku, flash)
            const testPick = cleanList.find(m => /mini|haiku|flash|lite/i.test(m)) ||
                             ModelTiering_1.ModelTiering.strongestInBandOrClosest(ModelTiering_1.Band.LIGHT, cleanList);
            return testPick || cleanList[0];
        }

        if (type === exports.SPECIALIST_TYPES.DOCUMENTATION) {
            // Documentation is cheap and fast in Light band
            const docPick = ModelTiering_1.ModelTiering.strongestInBandOrClosest(ModelTiering_1.Band.LIGHT, cleanList);
            return docPick || cleanList[0];
        }

        // General
        return ModelTiering_1.ModelTiering.strongestInBandOrClosest(ModelTiering_1.Band.MEDIUM, cleanList) || cleanList[0];
    }
}

exports.TaskDecomposer = TaskDecomposer;
