const JIMA_CHAT_MESSAGE_TYPES = Object.freeze([
  "text",
  "action",
  "confirmation",
  "result",
  "error"
]);

function createJimaChatId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `jima-message-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createJimaChatMessage(input = {}) {
  const role = input.role === "user" || input.role === "system" ? input.role : "jima";
  const type = JIMA_CHAT_MESSAGE_TYPES.includes(input.type) ? input.type : "text";

  return {
    id: input.id || createJimaChatId(),
    role,
    type,
    text: String(input.text || ""),
    createdAt: input.createdAt || new Date().toISOString(),
    actions: Array.isArray(input.actions) ? input.actions : []
  };
}

function createJimaToolRegistry(toolMap = {}) {
  const tools = new Map();

  for (const [name, definition] of Object.entries(toolMap)) {
    if (!definition || typeof definition.run !== "function") continue;
    tools.set(name, Object.freeze({
      name,
      description: definition.description || "",
      sensitive: Boolean(definition.sensitive),
      mode: definition.mode || "local",
      run: definition.run
    }));
  }

  return Object.freeze({
    has(name) {
      return tools.has(name);
    },
    get(name) {
      return tools.get(name) || null;
    },
    list() {
      return Array.from(tools.values());
    },
    async run(name, payload) {
      const tool = tools.get(name);
      if (!tool) throw new Error(`Unknown Jima tool: ${name}`);
      return tool.run(payload);
    }
  });
}

function capJimaBundleText(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function buildJimaAiContextBundle(input = {}) {
  const pageContext = input.pageContext || {};
  const detections = input.detections || {};

  return {
    pageContext: {
      pageTitle: pageContext.pageTitle || pageContext.documentTitle || "",
      url: pageContext.currentUrl || pageContext.url || "",
      documentTitle: pageContext.documentTitle || "",
      visibleTextPreview: capJimaBundleText(pageContext.visibleTextPreview || "", 6500),
      headings: Array.isArray(pageContext.headings) ? pageContext.headings.slice(0, 30) : [],
      fileLinks: Array.isArray(pageContext.fileLinks) ? pageContext.fileLinks.slice(0, 30) : [],
      selectedText: capJimaBundleText(pageContext.selectedText || "", 1500)
    },
    detections: {
      homeworkCandidates: Array.isArray(detections.homeworkCandidates)
        ? detections.homeworkCandidates.slice(0, 20)
        : [],
      deadlineCandidates: Array.isArray(detections.deadlineCandidates)
        ? detections.deadlineCandidates.slice(0, 20)
        : [],
      fileCandidates: Array.isArray(detections.fileCandidates)
        ? detections.fileCandidates.slice(0, 30)
        : []
    },
    userQuestion: capJimaBundleText(input.userQuestion || "", 600)
  };
}

function normalizeJimaChatQuery(value) {
  return String(value || "")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[׳'`"״]/g, "")
    .replace(/[()[\]{}.,!?;:|/\\<>_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const JIMA_INTENT_PATTERNS = Object.freeze({
  fileDownload: /\b(download|get)\b|\bdownload\b.*\b(file|files|pdf|lecture|resource|slides?)\b|\b(file|files|pdf|lecture|resource|slides?)\b.*\bdownload\b|הורד|הורידי|תוריד|תורידי|להוריד/,
  fileShow: /\b(show|list|open|view)\b.*\b(file|files|pdf|lecture|resource|slides?)\b|\b(show|list|open|view)\b.*הרצאה|\b(file|files|resources?)\b.*\b(show|list|open|view|found|available)\b|מה הקבצים|אילו קבצים|הצג קבצים|תראה קבצים|פתח.*(?:קובץ|הרצאה)|תפתח.*(?:קובץ|הרצאה)/,
  fileRead: /\b(read|summari[sz]e|analy[sz]e|explain)\b.*\b(file|pdf|lecture|resource|slides?)\b|\bwhat\s+(?:is|are|s)\b.*\b(about|lecture|file|resource)\b|can you read it|read it|what is.*about|תקרא|תקראי|תסכם|תסכמי|סכם.*קובץ|סכמי.*קובץ|נתח.*קובץ|נתחי.*קובץ|על מה.*הרצאה|מה.*הרצאה/,
  assignmentFollowup: /(enter|open|check|inspect).*\b(homework|assignment|task|quiz)\b|\b(homework|assignment|task|quiz)\b.*\b(deadline|due date|date|close|closes|closing|due)\b|\b(what|when).*\b(deadline|due date|due|close|closes|closing)\b|\b(deadline date|homework date)\b|תיכנס\s+למטלה|כנס\s+למטלה|תבדוק\s+את\s+המטלה|מה\s+הדדליין|מה\s+המועד\s+הגשה|מה\s+תאריך\s+ההגשה|מתי\s+ההגשה|מתי\s+זה\s+נסגר|מתי\s+מסתיים|תאריך\s+למטלה|דדליין\s+למטלה/,
  currentScan: /\b(analy[sz]e|check|scan)\b.*\b(current|this|page|course|moodle)\b|\bcurrent moodle page\b|\bthis course\b.*\b(homework|assignment|task|due|deadline)\b|נתח.*קורס|נתחי.*קורס|בדוק.*קורס|בדקי.*קורס|תבדוק.*קורס|תבדקי.*קורס|נתח.*עמוד|בדוק.*עמוד/,
  homework: /(homework|assignment|assignments|task|tasks|due|deadline|submit|submission|quiz|exercise|שיעורי\s+בית|מטלה|מטלות|תרגיל|הגשה|להגיש|דדליין|בוחן)/,
  explicitAi: /\b(ai|openai|gpt)\b|with ai|using ai|use ai|ask jima with ai|explain with ai|summari[sz]e.*with ai|analy[sz]e.*with ai|בינה מלאכותית/
});

const JIMA_FILE_DOWNLOAD_CLEAN_PATTERN = /\b(download|get)\b.*\b(file|files|pdf|lecture|lec|lesson|resource|slides?)\b|\b(file|files|pdf|lecture|lec|lesson|resource|slides?)\b.*\b(download|get)\b|\u05d4\u05d5\u05e8\u05d3|\u05d4\u05d5\u05e8\u05d9\u05d3\u05d9|\u05ea\u05d5\u05e8\u05d9\u05d3|\u05ea\u05d5\u05e8\u05d9\u05d3\u05d9|\u05dc\u05d4\u05d5\u05e8\u05d9\u05d3/;
const JIMA_FILE_SHOW_CLEAN_PATTERN = /\b(show|list|open|view)\b.*\b(file|files|pdf|lecture|lec|lesson|resource|slides?)\b|\b(file|files|resources?)\b.*\b(show|list|open|view|found|available)\b|\u05de\u05d4\s+\u05d4\u05e7\u05d1\u05e6\u05d9\u05dd|\u05d0\u05d9\u05dc\u05d5\s+\u05e7\u05d1\u05e6\u05d9\u05dd|\u05d4\u05e6\u05d2\s+\u05e7\u05d1\u05e6\u05d9\u05dd|\u05ea\u05e8\u05d0\u05d4\s+\u05e7\u05d1\u05e6\u05d9\u05dd|\u05e4\u05ea\u05d7.*(?:\u05e7\u05d5\u05d1\u05e5|\u05d4\u05e8\u05e6\u05d0\u05d4)|\u05ea\u05e4\u05ea\u05d7.*(?:\u05e7\u05d5\u05d1\u05e5|\u05d4\u05e8\u05e6\u05d0\u05d4)/;
const JIMA_FILE_READ_CLEAN_PATTERN = /\b(read|summari[sz]e|analy[sz]e|explain)\b.*\b(file|pdf|lecture|lec|lesson|resource|slides?)\b|\bwhat\s+(?:is|are|s)\b.*\b(about|lecture|lec|lesson|file|resource)\b|can you read it|read it|summari[sz]e it|analy[sz]e it|explain it|what is.*about|\u05ea\u05e7\u05e8\u05d0|\u05ea\u05e7\u05e8\u05d0\u05d9|\u05ea\u05e1\u05db\u05dd|\u05ea\u05e1\u05db\u05de\u05d9|\u05e1\u05db\u05dd.*\u05e7\u05d5\u05d1\u05e5|\u05e1\u05db\u05de\u05d9.*\u05e7\u05d5\u05d1\u05e5|\u05e0\u05ea\u05d7.*\u05e7\u05d5\u05d1\u05e5|\u05e0\u05ea\u05d7\u05d9.*\u05e7\u05d5\u05d1\u05e5|\u05e2\u05dc\s+\u05de\u05d4.*\u05d4\u05e8\u05e6\u05d0\u05d4|\u05de\u05d4.*\u05d4\u05e8\u05e6\u05d0\u05d4|\u05e2\u05dc\s+\u05de\u05d4.*\u05e7\u05d5\u05d1\u05e5/;
const JIMA_FILE_REFERENCE_CLEAN_PATTERN = /\b(?:lecture|lec|lesson)\s*(?:number\s*)?\d+\b|\b\d+\s*(?:lecture|lec|lesson)\b|\u05d4\u05e8\u05e6\u05d0\u05d4\s*(?:\u05de\u05e1\u05e4\u05e8\s*)?\d+|\d+\s*\u05d4\u05e8\u05e6\u05d0\u05d4|\u05d9\u05d7\u05d9\u05d3\u05ea\s+\u05d4\u05d5\u05e8\u05d0\u05d4\s*\d+|\d+\s*\u05d9\u05d7\u05d9\u05d3\u05ea\s+\u05d4\u05d5\u05e8\u05d0\u05d4|\u05e7\u05d5\u05d1\u05e5\s*(?:\u05de\u05e1\u05e4\u05e8\s*)?\d+|\d+\s*\u05e7\u05d5\u05d1\u05e5/;

function classifyJimaChatIntent(input = {}) {
  const query = normalizeJimaChatQuery(input.query);
  if (!query) return "empty";

  if (JIMA_FILE_DOWNLOAD_CLEAN_PATTERN.test(query) || JIMA_INTENT_PATTERNS.fileDownload.test(query)) return "download_files";
  if (JIMA_FILE_READ_CLEAN_PATTERN.test(query) || JIMA_INTENT_PATTERNS.fileRead.test(query)) return "read_file";
  if (JIMA_FILE_SHOW_CLEAN_PATTERN.test(query) || JIMA_INTENT_PATTERNS.fileShow.test(query)) return "show_files";
  if (JIMA_FILE_REFERENCE_CLEAN_PATTERN.test(query)) return "file_reference";
  if (JIMA_INTENT_PATTERNS.assignmentFollowup.test(query)) return "assignment_detail";
  if (JIMA_INTENT_PATTERNS.currentScan.test(query)) return "analyze_page";
  if (JIMA_INTENT_PATTERNS.homework.test(query)) return "homework_or_course";
  if (JIMA_INTENT_PATTERNS.explicitAi.test(query)) return "ai";

  if (
    input.mode === "ai" &&
    /\b(summari[sz]e|explain|analy[sz]e)\b.*\b(page|course|context|moodle)\b|סכם.*קורס|סכמי.*קורס|הסבר.*קורס|הסבירי.*קורס/.test(query)
  ) {
    return "ai";
  }

  return "unsupported";
}

globalThis.JimaChatV2 = Object.freeze({
  buildAiContextBundle: buildJimaAiContextBundle,
  classifyIntent: classifyJimaChatIntent,
  createMessage: createJimaChatMessage,
  createToolRegistry: createJimaToolRegistry,
  intentPriority: Object.freeze([
    "confirmation",
    "download_files",
    "show_files",
    "read_file",
    "file_reference",
    "assignment_detail",
    "analyze_page",
    "homework_or_course",
    "ai",
    "fallback"
  ])
});
