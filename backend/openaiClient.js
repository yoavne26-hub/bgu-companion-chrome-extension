import OpenAI from "openai";
import { JIMA_SYSTEM_PROMPT } from "./jimaSystemPrompt.js";

const DEFAULT_MODEL = "gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = 800;
const MAX_FILE_OUTPUT_TOKENS = 1000;

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

const jimaFileAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    keyPoints: {
      type: "array",
      items: { type: "string" }
    },
    possibleHomework: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          uncertainty: { type: "string" }
        },
        required: ["title", "evidence", "confidence", "uncertainty"]
      }
    },
    actionItems: {
      type: "array",
      items: { type: "string" }
    },
    uncertainties: {
      type: "array",
      items: { type: "string" }
    },
    source: {
      type: "object",
      additionalProperties: false,
      properties: {
        fileName: { type: "string" },
        fileType: { type: "string" },
        extractedCharacters: { type: "number" }
      },
      required: ["fileName", "fileType", "extractedCharacters"]
    }
  },
  required: ["summary", "keyPoints", "possibleHomework", "actionItems", "uncertainties", "source"]
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
  const userQuestion = String(payload.userQuestion || payload.originalUserMessage || "").trim();

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
          instruction: "Answer the user's exact question first. Use recent chat only to resolve references. Do not give a generic page summary unless the user asked for one.",
          source: payload.source || "bgu-companion-extension",
          mode: payload.mode || "explicit_user_ai_request",
          userQuestion,
          originalUserMessage: payload.originalUserMessage || userQuestion,
          recentChatMessages: payload.recentChatMessages || [],
          localSummary: payload.localSummary || "",
          course: payload.course || null,
          pageContext: payload.pageContext,
          detections: payload.detections || {},
          assignmentDetail: payload.assignmentDetail || null,
          lastReferencedFile: payload.lastReferencedFile || null,
          lastFileAnalysisSummary: payload.lastFileAnalysisSummary || null,
          privacyNote: payload.privacyNote || "User explicitly confirmed AI analysis. File contents are not included unless selected-file analysis supplied extracted text."
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

export async function analyzeJimaFileText(payload) {
  const openai = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const response = await openai.responses.create({
    model,
    temperature: 0.2,
    max_output_tokens: MAX_FILE_OUTPUT_TOKENS,
    input: [
      {
        role: "system",
        content: `${JIMA_SYSTEM_PROMPT}

File-analysis mode:
- You may summarize file contents only because extracted file text is provided in this request.
- Base every claim only on extractedFileText.
- Say the answer is based on extracted file text.
- Do not claim to see images, diagrams, handwriting, scanned pages, charts, or formatting unless the extracted text explicitly describes them.
- If extraction looks incomplete or short, make the limitation clear.
- If the student asks about homework, identify only homework/action evidence present in extractedFileText.`
      },
      {
        role: "user",
        content: JSON.stringify({
          fileName: payload.fileName,
          fileType: payload.fileType,
          extractedCharacters: payload.extractedCharacters,
          userQuestion: payload.userQuestion || "Summarize this academic file.",
          extractionWarnings: payload.warnings || [],
          extractedFileText: payload.extractedText || ""
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "jima_file_analysis",
        strict: true,
        schema: jimaFileAnalysisSchema
      }
    }
  });

  return parseStructuredOutput(response);
}
