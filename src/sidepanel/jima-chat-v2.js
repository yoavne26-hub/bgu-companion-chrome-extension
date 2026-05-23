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

globalThis.JimaChatV2 = Object.freeze({
  buildAiContextBundle: buildJimaAiContextBundle,
  createMessage: createJimaChatMessage,
  createToolRegistry: createJimaToolRegistry,
  intentPriority: Object.freeze([
    "confirmation",
    "assignment_detail",
    "download_files",
    "show_files",
    "analyze_page",
    "homework_or_course",
    "ai",
    "fallback"
  ])
});
