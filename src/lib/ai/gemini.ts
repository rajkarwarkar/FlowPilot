// =============================================================================
// FlowPilot AI — Gemini Service (server-side only)
// =============================================================================
// Uses the official @google/genai SDK with structured JSON output.
// API key is read from process.env.GEMINI_API_KEY — never exposed to the browser.
// =============================================================================

import { GoogleGenAI } from '@google/genai';
import type { ExtractedIntent, WorkflowProposal, BreethMemory } from '@/lib/types';

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to .env.local and restart the server.'
    );
  }
  if (!_client) {
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

// Candidate models for automatic failover when 503 capacity / 429 rate limits occur
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-2.5-flash-lite',
];

async function generateContentWithRetry(prompt: string, responseSchema: any): Promise<string> {
  const client = getClient();
  let lastError: unknown = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn(`Gemini model "${model}" failed (attempting next candidate model):`, err);
      lastError = err;
      // Brief pause before trying next candidate model
      await new Promise((res) => setTimeout(res, 800));
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to return content.');
}

// ---------------------------------------------------------------------------
// JSON schemas for structured output
// ---------------------------------------------------------------------------

const EXTRACTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    intent:                { type: 'string' as const },
    contact:               { type: 'string' as const },
    company:               { type: 'string' as const },
    summary:               { type: 'string' as const },
    priority:              { type: 'string' as const, enum: ['low', 'medium', 'high', 'critical'] },
    deadline:              { type: 'string' as const },
    requestedAction:       { type: 'string' as const },
    conditions:            { type: 'array' as const, items: { type: 'string' as const } },
    entities:              { type: 'array' as const, items: { type: 'string' as const } },
    workflowRequirements:  { type: 'array' as const, items: { type: 'string' as const } },
  },
  required: [
    'intent', 'contact', 'company', 'summary', 'priority',
    'deadline', 'requestedAction', 'conditions', 'entities',
    'workflowRequirements',
  ],
};

const WORKFLOW_SCHEMA = {
  type: 'object' as const,
  properties: {
    workflowTitle:          { type: 'string' as const },
    objective:              { type: 'string' as const },
    priority:               { type: 'string' as const, enum: ['low', 'medium', 'high', 'critical'] },
    deadline:               { type: 'string' as const },
    reasoning:              { type: 'string' as const },
    steps: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          stepNumber:        { type: 'integer' as const },
          action:            { type: 'string' as const },
          description:       { type: 'string' as const },
          stepType:          { type: 'string' as const, enum: ['trigger', 'context', 'action', 'approval', 'wait', 'decision'] },
          assignee:          { type: 'string' as const },
          requiresApproval:  { type: 'boolean' as const },
          status:            { type: 'string' as const, enum: ['pending', 'approved', 'rejected', 'executing', 'completed'] },
        },
        required: ['stepNumber', 'action', 'description', 'stepType', 'assignee', 'requiresApproval', 'status'],
      },
    },
    conditions:              { type: 'array' as const, items: { type: 'string' as const } },
    approvalRequiredActions:  { type: 'array' as const, items: { type: 'string' as const } },
    memoryUsed:              { type: 'array' as const, items: { type: 'string' as const } },
  },
  required: [
    'workflowTitle', 'objective', 'priority', 'deadline', 'reasoning',
    'steps', 'conditions', 'approvalRequiredActions', 'memoryUsed',
  ],
};

// ---------------------------------------------------------------------------
// Step 1 — Extract structured intent from user input
// ---------------------------------------------------------------------------

export async function extractIntent(userMessage: string): Promise<ExtractedIntent> {
  const prompt = `You are a business workflow extraction assistant for FlowPilot AI.

Analyze the following user message and extract structured information.
Be precise. If a value is not explicitly mentioned, infer a reasonable default.
For "deadline", use ISO 8601 format or a relative description like "tomorrow".
For "priority", choose from: low, medium, high, critical.
For "entities", list every named entity (companies, people, products, documents).

User message:
"""
${userMessage}
"""`;

  const text = await generateContentWithRetry(prompt, EXTRACTION_SCHEMA);

  let parsed: ExtractedIntent;
  try {
    parsed = JSON.parse(text) as ExtractedIntent;
  } catch {
    throw new Error(`Gemini returned invalid JSON during extraction: ${text.slice(0, 200)}`);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Step 3 — Generate workflow proposal using extraction + memory context
// ---------------------------------------------------------------------------

export async function generateWorkflow(
  extraction: ExtractedIntent,
  memories: BreethMemory[],
  originalMessage: string,
): Promise<WorkflowProposal> {
  const memoryContext = memories.length > 0
    ? memories.map((m, i) => `[Memory ${i + 1}] (score: ${m.score.toFixed(2)}) ${m.content}`).join('\n')
    : 'No relevant memories found.';

  const prompt = `You are FlowPilot AI, a business workflow generator.

Given the extracted intent and retrieved memory context below, generate a detailed,
actionable workflow proposal. The workflow must require human approval before
any consequential actions are executed.

## Original User Message
"""
${originalMessage}
"""

## Extracted Intent
${JSON.stringify(extraction, null, 2)}

## Retrieved Memory Context
${memoryContext}

## Instructions
- Create a clear workflow title and objective.
- Set priority and deadline based on the extraction.
- Provide structured, ordered steps representing the full lifecycle:
  1. Analyze customer request (stepType: 'trigger', status: 'completed', requiresApproval: false)
  2. Retrieve customer context (stepType: 'context', status: 'completed', requiresApproval: false)
  3. Prepare follow-up proposal (stepType: 'action', status: 'pending', requiresApproval: false)
  4. Human approval required (stepType: 'approval', status: 'pending', requiresApproval: true)
  5. Execute approved action (stepType: 'action', status: 'pending', requiresApproval: false)
  6. Wait for response (stepType: 'wait', status: 'pending', requiresApproval: false)
  7. Escalate if no response (stepType: 'decision', status: 'pending', requiresApproval: false)
  8. Update memory (stepType: 'action', status: 'pending', requiresApproval: false)
- Assign appropriate stepTypes: 'trigger', 'context', 'action', 'approval', 'wait', 'decision'.
- ONLY mark the human sign-off step (stepType: 'approval' or explicit consequential action) with requiresApproval: true.
- Under "reasoning", explain WHY you structured the workflow this way, referencing any memory context.
- Under "memoryUsed", list key facts from memory that influenced the plan.
- Under "conditions", list conditional logic (e.g. "Escalate if no response after 24 hours").
- Under "approvalRequiredActions", list actions requiring human sign-off.

IMPORTANT: Do NOT auto-execute any external actions. This is a PROPOSAL only.`;

  const text = await generateContentWithRetry(prompt, WORKFLOW_SCHEMA);

  let parsed: WorkflowProposal;
  try {
    parsed = JSON.parse(text) as WorkflowProposal;
  } catch {
    throw new Error(`Gemini returned invalid JSON during workflow generation: ${text.slice(0, 200)}`);
  }

  return parsed;
}
