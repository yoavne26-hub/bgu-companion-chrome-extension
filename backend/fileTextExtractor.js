import path from "node:path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import WordExtractor from "word-extractor";

const MAX_EXTRACTED_CHARACTERS = 20000;
const MIN_READABLE_CHARACTERS = 20;

const SUPPORTED_EXTENSIONS = new Set([".txt", ".md", ".pdf", ".docx", ".doc"]);

function normalizeExtractedText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getFileExtension(fileName = "") {
  return path.extname(String(fileName || "").toLowerCase());
}

function getFileTypeFromExtension(extension) {
  return {
    ".txt": "txt",
    ".md": "md",
    ".pdf": "pdf",
    ".docx": "docx",
    ".doc": "doc"
  }[extension] || "";
}

function assertSupportedFile(file) {
  const fileName = String(file?.originalname || "");
  const extension = getFileExtension(fileName);

  if (!file?.buffer?.length) {
    const error = new Error("No readable file buffer was received.");
    error.statusCode = 400;
    throw error;
  }

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    const error = new Error("Unsupported file type. Try TXT, MD, PDF, DOCX, or DOC.");
    error.statusCode = 400;
    throw error;
  }

  return {
    fileName,
    extension,
    fileType: getFileTypeFromExtension(extension)
  };
}

async function extractTxt(buffer) {
  return buffer.toString("utf8");
}

async function extractMarkdown(buffer) {
  return buffer.toString("utf8");
}

async function extractPdf(buffer) {
  const result = await pdfParse(buffer);
  return result.text || "";
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value || "",
    warnings: (result.messages || [])
      .map((message) => message.message || message)
      .filter(Boolean)
  };
}

async function extractDoc(buffer) {
  try {
    const extractor = new WordExtractor();
    const document = await extractor.extract(buffer);
    return document.getBody() || "";
  } catch {
    const error = new Error("I could not extract readable text from this DOC file. It may be encrypted, corrupted, image-based, or unsupported.");
    error.statusCode = 400;
    throw error;
  }
}

export async function extractFileText(file) {
  const metadata = assertSupportedFile(file);
  const warnings = [];
  let extractedText = "";

  if (metadata.extension === ".txt") {
    extractedText = await extractTxt(file.buffer);
  } else if (metadata.extension === ".md") {
    extractedText = await extractMarkdown(file.buffer);
  } else if (metadata.extension === ".pdf") {
    extractedText = await extractPdf(file.buffer);
  } else if (metadata.extension === ".docx") {
    const docxResult = await extractDocx(file.buffer);
    extractedText = docxResult.text;
    warnings.push(...docxResult.warnings);
  } else if (metadata.extension === ".doc") {
    extractedText = await extractDoc(file.buffer);
  }

  const normalizedText = normalizeExtractedText(extractedText);
  if (normalizedText.length < MIN_READABLE_CHARACTERS) {
    const error = new Error("I could not extract enough readable text from this file.");
    error.statusCode = 400;
    throw error;
  }

  const cappedText = normalizedText.slice(0, MAX_EXTRACTED_CHARACTERS);
  if (normalizedText.length > MAX_EXTRACTED_CHARACTERS) {
    warnings.push(`Extracted text was capped at ${MAX_EXTRACTED_CHARACTERS} characters before AI analysis.`);
  }

  return {
    fileName: metadata.fileName,
    fileType: metadata.fileType,
    extractedText: cappedText,
    extractedCharacters: cappedText.length,
    warnings
  };
}

export const FILE_ANALYSIS_LIMITS = Object.freeze({
  maxExtractedCharacters: MAX_EXTRACTED_CHARACTERS,
  supportedExtensions: Array.from(SUPPORTED_EXTENSIONS)
});
