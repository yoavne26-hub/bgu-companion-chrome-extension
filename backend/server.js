import "dotenv/config";
import express from "express";
import { analyzeJimaContext } from "./openaiClient.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_VISIBLE_TEXT_LENGTH = 8000;
const MAX_ARRAY_ITEMS = 100;

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "jima-backend"
  });
});

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateAnalyzePayload(body) {
  if (!isPlainObject(body) || Object.keys(body).length === 0) {
    return "Request body is required.";
  }

  if (!isPlainObject(body.pageContext)) {
    return "pageContext is required.";
  }

  const serializedLength = Buffer.byteLength(JSON.stringify(body), "utf8");
  if (serializedLength > MAX_BODY_BYTES) {
    return "Request payload is too large.";
  }

  if (
    typeof body.pageContext.visibleTextPreview === "string" &&
    body.pageContext.visibleTextPreview.length > MAX_VISIBLE_TEXT_LENGTH
  ) {
    return "pageContext.visibleTextPreview is too large.";
  }

  for (const field of ["headings", "fileLinks"]) {
    if (body.pageContext[field] && !Array.isArray(body.pageContext[field])) {
      return `pageContext.${field} must be an array when provided.`;
    }

    if (Array.isArray(body.pageContext[field]) && body.pageContext[field].length > MAX_ARRAY_ITEMS) {
      return `pageContext.${field} has too many items.`;
    }
  }

  if (body.detections && !isPlainObject(body.detections)) {
    return "detections must be an object when provided.";
  }

  if (body.userQuestion && typeof body.userQuestion !== "string") {
    return "userQuestion must be a string when provided.";
  }

  return "";
}

app.post("/api/jima/analyze-context", async (req, res) => {
  const validationError = validateAnalyzePayload(req.body);
  if (validationError) {
    return res.status(400).json({
      ok: false,
      error: validationError
    });
  }

  try {
    const analysis = await analyzeJimaContext(req.body);
    return res.json({
      ok: true,
      analysis
    });
  } catch (error) {
    if (error?.code === "MISSING_OPENAI_API_KEY") {
      return res.status(500).json({
        ok: false,
        error: "Backend configuration error: OPENAI_API_KEY is not set."
      });
    }

    console.error("Jima OpenAI analysis failed:", error?.message || error);
    return res.status(502).json({
      ok: false,
      error: "Jima analysis failed. Please try again later."
    });
  }
});

app.use((error, _req, res, next) => {
  if (!error) {
    return next();
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      ok: false,
      error: "Request payload is too large."
    });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      ok: false,
      error: "Invalid JSON request body."
    });
  }

  console.error("Unexpected backend error:", error?.message || error);
  return res.status(500).json({
    ok: false,
    error: "Unexpected backend error."
  });
});

app.listen(PORT, () => {
  console.log(`Jima backend listening on http://localhost:${PORT}`);
});
