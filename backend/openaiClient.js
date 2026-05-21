import OpenAI from "openai";
import { JIMA_SYSTEM_PROMPT } from "./jimaSystemPrompt.js";

const DEFAULT_MODEL = "gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = 1200;

const jimaAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    assignments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          dueDate: { type: ["string", "null"] },
          evidence: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          uncertainty: { type: "string" }
        },
        required: ["title", "dueDate", "evidence", "confidence", "uncertainty"]
      }
    },
    dates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          rawDate: { type: "string" },
          meaning: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          uncertainty: { type: "string" }
        },
        required: ["rawDate", "meaning", "evidence", "confidence", "uncertainty"]
      }
    },
    files: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          fileType: { type: ["string", "null"] },
          evidence: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] }
        },
        required: ["name", "fileType", "evidence", "confidence"]
      }
    },
    nextActions: {
      type: "array",
      items: { type: "string" }
    },
    uncertainties: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["summary", "assignments", "dates", "files", "nextActions", "uncertainties"]
};

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is not configured.");
    error.code = "MISSING_OPENAI_API_KEY";
    throw error;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

function parseStructuredOutput(response) {
  const text = response.output_text;
  if (!text) {
    throw new Error("OpenAI returned no structured text output.");
  }

  return JSON.parse(text);
}

export async function analyzeJimaContext(payload) {
  const openai = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const response = await openai.responses.create({
    model,
    temperature: 0.2,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [
      {
        role: "system",
        content: JIMA_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: JSON.stringify({
          pageContext: payload.pageContext,
          detections: payload.detections || {},
          userQuestion: payload.userQuestion || ""
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "jima_analysis",
        strict: true,
        schema: jimaAnalysisSchema
      }
    }
  });

  return parseStructuredOutput(response);
}
