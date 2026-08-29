const assert = require("assert");
const { TaskDecomposer, SPECIALIST_TYPES } = require("./copilot-pulse-vscode/extension/out/routing/TaskDecomposer");
const { MultiAgentOrchestrator } = require("./copilot-pulse-vscode/extension/out/routing/MultiAgentOrchestrator");

console.log("================================================================================");
console.log("   🧪 COPILOT PULSE: MULTI-AGENT ORCHESTRATION & DECOMPOSITION SUITE");
console.log("================================================================================");

const availableModels = [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "google/gemini-1.5-pro",
    "google/gemini-1.5-flash"
];

let testsPassed = 0;

// Test 1: Single Task vs Multi-Task Detection
console.log("\n[Test 1] Single Task vs Multi-Task Detection");
const singlePrompt = "How do I reverse a binary tree in JavaScript?";
const multiPrompt = "Build an authentication service API in TypeScript, write comprehensive unit tests with Jest, and design the AWS infrastructure architecture diagram.";

assert.strictEqual(TaskDecomposer.isMultiTaskPrompt(singlePrompt), false, "Single prompt should not trigger multi-task");
assert.strictEqual(TaskDecomposer.isMultiTaskPrompt(multiPrompt), true, "Complex prompt with code, tests, and architecture should trigger multi-task");
console.log("  ✅ Correctly distinguished single-intent vs multi-intent prompts.");
testsPassed++;

// Test 2: Sub-Task Decomposition
console.log("\n[Test 2] Sub-Task Decomposition Breakdown");
const subTasks = TaskDecomposer.decompose(multiPrompt, availableModels);
console.log(`  Identified ${subTasks.length} sub-tasks:`);
subTasks.forEach(st => {
    console.log(`    - [${st.type.toUpperCase()}] ${st.title} → Specialist: ${st.specialistModel}`);
});

assert.strictEqual(subTasks.length >= 3, true, "Should decompose into at least 3 sub-tasks");

const hasArch = subTasks.some(st => st.type === SPECIALIST_TYPES.ARCHITECTURE);
const hasCode = subTasks.some(st => st.type === SPECIALIST_TYPES.CODING);
const hasTest = subTasks.some(st => st.type === SPECIALIST_TYPES.TESTING);

assert.strictEqual(hasArch, true, "Must include Architecture sub-task");
assert.strictEqual(hasCode, true, "Must include Coding sub-task");
assert.strictEqual(hasTest, true, "Must include Testing sub-task");

console.log("  ✅ Successfully decomposed prompt into Architecture, Coding, and Testing sub-tasks.");
testsPassed++;

// Test 3: Domain Specialist Model Selection
console.log("\n[Test 3] Specialist Model Assignment Validation");
const archModel = TaskDecomposer.selectSpecialistModel(SPECIALIST_TYPES.ARCHITECTURE, availableModels);
const codeModel = TaskDecomposer.selectSpecialistModel(SPECIALIST_TYPES.CODING, availableModels);
const testModel = TaskDecomposer.selectSpecialistModel(SPECIALIST_TYPES.TESTING, availableModels);

console.log(`  • Architecture Specialist: ${archModel}`);
console.log(`  • Coding Specialist:       ${codeModel}`);
console.log(`  • Testing Specialist:      ${testModel}`);

assert.strictEqual(archModel.includes("gemini"), true, "Architecture should map to Gemini Pro / reasoning");
assert.strictEqual(codeModel.includes("claude") || codeModel.includes("gpt-4o"), true, "Coding should map to Claude 3.5 / GPT-4o");
assert.strictEqual(testModel.includes("mini") || testModel.includes("flash"), true, "Testing should map to cost-efficient Light model (GPT-4o-mini / Flash)");
console.log("  ✅ Specialist models accurately assigned according to domain strengths and token efficiency.");
testsPassed++;

// Test 4: End-to-End Orchestrator Fan-Out & Fan-In Simulation
console.log("\n[Test 4] Parallel Execution & Output Synthesis Simulation");

async function runOrchestrationSimulation() {
    const streamOutput = [];
    const mockStream = {
        markdown: (text) => streamOutput.push(text)
    };

    const mockRequest = {
        prompt: multiPrompt,
        model: { id: "openai/gpt-4o" }
    };

    const mockToken = { isCancellationRequested: false };

    const mockOptions = {
        pickCopilotModel: (id) => ({
            id,
            name: id,
            sendRequest: async (msgs, opt, tok) => {
                // Simulate asynchronous LLM generation latency
                await new Promise(res => setTimeout(res, 50));
                return {
                    text: (async function* () {
                        yield `[Mock Output from ${id}] Generated response for sub-task successfully.`;
                    })()
                };
            }
        }),
        discoverCopilotModels: async () => {},
        proxyServer: { recordChatMetric: () => {} },
        getRouterConfig: () => ({}),
        availableModels
    };

    const startTime = Date.now();
    const handled = await MultiAgentOrchestrator.executeIfMultiTask(
        mockRequest,
        {},
        mockStream,
        mockToken,
        mockOptions
    );
    const duration = Date.now() - startTime;

    assert.strictEqual(handled, true, "Orchestrator must handle multi-task prompt");
    const fullText = streamOutput.join("");
    
    assert.strictEqual(fullText.includes("Copilot Pulse Multi-Agent Orchestrator"), true);
    assert.strictEqual(fullText.includes("Orchestrated Output"), true);
    assert.strictEqual(fullText.includes("Multi-Agent Summary"), true);

    console.log(`  ⏱️ Parallel execution completed in ${duration}ms.`);
    console.log("  ✅ Output streaming and Fan-In aggregation completed with full markdown structure.");
    testsPassed++;
}

runOrchestrationSimulation().then(() => {
    console.log("\n================================================================================");
    console.log(`🎉 ALL ${testsPassed}/4 TESTS PASSED! Multi-Agent Orchestration is fully validated.`);
    console.log("================================================================================");
}).catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
