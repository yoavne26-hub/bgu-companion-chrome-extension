import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import { extractFileText } from "./fileTextExtractor.js";
import { analyzeJimaContext, analyzeJimaFileText } from "./openaiClient.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_VISIBLE_TEXT_LENGTH = 8000;
const MAX_ARRAY_ITEMS = 100;
const SUPPORTED_FILE_EXTENSIONS = new Set([".txt", ".md", ".pdf", ".docx", ".doc"]);
const SUPPORTED_FILE_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/pdf",
  "application/msword",
  "application/x-msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream"
]);

function getUploadExtension(fileName = "") {
  return path.extname(String(fileName || "").toLowerCase());
}

function getUploadDebug(file) {
  return {
    extension: getUploadExtension(file?.originalname),
    mimeType: String(file?.mimetype || "").toLowerCase()
  };
}

function validateUploadFile(_req, file, callback) {
  const debug = getUploadDebug(file);
  const extensionAllowed = SUPPORTED_FILE_EXTENSIONS.has(debug.extension);

  if (!extensionAllowed) {
    const error = new Error("Unsupported file type. Try TXT, MD, PDF, DOCX, or DOC.");
    error.statusCode = 400;
    error.debug = debug;
    return callback(error);
  }

  // Browser MIME values for legacy Word files vary widely. Keep the strict
  // extension allowlist above, then let the extractor validate actual content.
  return callback(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 1
  },
  fileFilter: validateUploadFile
});

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

function getOpenAIErrorMessage(error, fallback) {
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (status === 401 || /invalid.*api.*key|authentication/.test(message)) {
    return "OpenAI rejected the backend API key. Check OPENAI_API_KEY in backend/.env.";
  }

  if (status === 429 || code.includes("quota") || /quota|billing|rate limit|insufficient_quota/.test(message)) {
    return "OpenAI quota or billing issue. Check the backend OpenAI account, then try again.";
  }

  if (/json|schema|structured/.test(message)) {
    return "OpenAI returned an invalid structured response. Try again.";
  }

  return fallback;
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
      error: getOpenAIErrorMessage(error, "Jima analysis failed. Please try again later.")
    });
  }
});

app.post("/api/jima/analyze-file", (req, res) => {
  upload.single("file")(req, res, async (uploadError) => {
    if (uploadError) {
      if (uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          ok: false,
          error: "Selected file is too large. Maximum supported size is 10MB."
        });
      }

      return res.status(400).json({
        ok: false,
        error: uploadError.message || "Jima could not read the uploaded file request.",
        debug: uploadError.debug || undefined
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "Choose a TXT, MD, PDF, DOCX, or DOC file before asking Jima to analyze it."
      });
    }

    try {
      const extracted = await extractFileText(req.file);
      const analysis = await analyzeJimaFileText({
        ...extracted,
        userQuestion: typeof req.body?.userQuestion === "string" ? req.body.userQuestion : ""
      });

      return res.json({
        ok: true,
        analysis,
        extraction: {
          fileName: extracted.fileName,
          fileType: extracted.fileType,
          extractedCharacters: extracted.extractedCharacters,
          warnings: extracted.warnings
        }
      });
    } catch (error) {
      if (error?.code === "MISSING_OPENAI_API_KEY") {
        return res.status(500).json({
          ok: false,
          error: "Backend configuration error: OPENAI_API_KEY is not set."
        });
      }

      if (error?.statusCode) {
        return res.status(error.statusCode).json({
          ok: false,
          error: error.message || "Jima could not extract text from this file."
        });
      }

      console.error("Jima file analysis failed:", error?.message || error);
      return res.status(502).json({
        ok: false,
        error: getOpenAIErrorMessage(error, "Jima file analysis failed. Please try again later.")
      });
    }
  });
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
