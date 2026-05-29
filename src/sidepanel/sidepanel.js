const DEFAULT_AI_QUESTION =
  "What homework, deadlines, files, and next actions are visible on this Moodle page?";

const courseQueryInput = document.getElementById("courseQueryInput");
const findCourseBtn = document.getElementById("findCourseBtn");
const courseQueryStatus = document.getElementById("courseQueryStatus");
const courseMatchesList = document.getElementById("courseMatchesList");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatModeToggle = document.getElementById("chatModeToggle");
const chatModeStatus = document.getElementById("chatModeStatus");
const suggestedActions = document.querySelector(".suggested-actions");
const composerDock = document.querySelector(".composer-dock");
const evidenceDetails = document.getElementById("evidenceDetails");
const analyzePageBtn = document.getElementById("analyzePageBtn");
const statusMessage = document.getElementById("statusMessage");
const previewPanel = document.getElementById("previewPanel");
const previewMeta = document.getElementById("previewMeta");
const previewTitle = document.getElementById("previewTitle");
const previewUrl = document.getElementById("previewUrl");
const localAnswerPanel = document.getElementById("localAnswerPanel");
const localAnswerText = document.getElementById("localAnswerText");
const localAnswerList = document.getElementById("localAnswerList");
const homeworkCount = document.getElementById("homeworkCount");
const homeworkList = document.getElementById("homeworkList");
const datesCount = document.getElementById("datesCount");
const datesList = document.getElementById("datesList");
const filesCount = document.getElementById("filesCount");
const filesList = document.getElementById("filesList");
const headingsCount = document.getElementById("headingsCount");
const headingsList = document.getElementById("headingsList");
const fileLinksCount = document.getElementById("fileLinksCount");
const fileLinksList = document.getElementById("fileLinksList");
const textPreview = document.getElementById("textPreview");
const downloadControls = document.getElementById("downloadControls");
const downloadSelectedBtn = document.getElementById("downloadSelectedBtn");
const downloadStatusMessage = document.getElementById("downloadStatusMessage");
const aiPanel = document.getElementById("aiPanel");
const aiQuestionInput = document.getElementById("aiQuestionInput");
const askAiBtn = document.getElementById("askAiBtn");
const aiStatusMessage = document.getElementById("aiStatusMessage");
const aiResults = document.getElementById("aiResults");
const aiSummary = document.getElementById("aiSummary");
const aiAssignments = document.getElementById("aiAssignments");
const aiDates = document.getElementById("aiDates");
const aiFiles = document.getElementById("aiFiles");
const aiNextActions = document.getElementById("aiNextActions");
const aiUncertainties = document.getElementById("aiUncertainties");
const savedTasksCount = document.getElementById("savedTasksCount");
const savedTasksList = document.getElementById("savedTasksList");
const savedTasksStatus = document.getElementById("savedTasksStatus");
const assignmentDetailPanel = document.getElementById("assignmentDetailPanel");
const assignmentDetailStatus = document.getElementById("assignmentDetailStatus");
const assignmentDetailContent = document.getElementById("assignmentDetailContent");
const assignmentDetailTitle = document.getElementById("assignmentDetailTitle");
const assignmentDetailUrl = document.getElementById("assignmentDetailUrl");
const assignmentDetailSubmissionStatus = document.getElementById("assignmentDetailSubmissionStatus");
const assignmentDetailDates = document.getElementById("assignmentDetailDates");
const assignmentDetailFiles = document.getElementById("assignmentDetailFiles");
const assignmentDetailDownloadControls = document.getElementById("assignmentDetailDownloadControls");
const downloadDetailSelectedBtn = document.getElementById("downloadDetailSelectedBtn");
const assignmentDetailDownloadStatus = document.getElementById("assignmentDetailDownloadStatus");
const assignmentDetailInstructions = document.getElementById("assignmentDetailInstructions");
const saveDetailTaskBtn = document.getElementById("saveDetailTaskBtn");
const saveDetailTaskStatus = document.getElementById("saveDetailTaskStatus");
const followupInput = document.getElementById("followupInput");
const followupSendBtn = document.getElementById("followupSendBtn");
const followupStatus = document.getElementById("followupStatus");
const followupResults = document.getElementById("followupResults");
const followupSummary = document.getElementById("followupSummary");
const followupFileList = document.getElementById("followupFileList");
const followupDownloadControls = document.getElementById("followupDownloadControls");
const downloadFollowupSelectedBtn = document.getElementById("downloadFollowupSelectedBtn");
const cancelFollowupDownloadBtn = document.getElementById("cancelFollowupDownloadBtn");
const followupDownloadStatus = document.getElementById("followupDownloadStatus");
const fileAnalysisDetails = document.getElementById("fileAnalysisDetails");
const fileAnalysisDropzone = document.getElementById("fileAnalysisDropzone");
const fileAnalysisInput = document.getElementById("fileAnalysisInput");
const fileAnalysisQuestion = document.getElementById("fileAnalysisQuestion");
const fileAnalysisSelected = document.getElementById("fileAnalysisSelected");
const analyzeSelectedFileBtn = document.getElementById("analyzeSelectedFileBtn");
const cancelFileAnalysisBtn = document.getElementById("cancelFileAnalysisBtn");
const fileAnalysisStatus = document.getElementById("fileAnalysisStatus");

const JIMA_FILE_ANALYSIS_URL = "http://localhost:3000/api/jima/analyze-file";
const JIMA_FILE_ANALYSIS_MAX_BYTES = 10 * 1024 * 1024;
const JIMA_FILE_ANALYSIS_TIMEOUT_MS = 60000;
const JIMA_FILE_ANALYSIS_TYPES = new Set(["txt", "md", "pdf", "docx", "doc"]);
const JIMA_NOTICE_DEDUPE_MS = 30000;

let latestPageContext = null;
let latestDetections = null;
let latestFileCandidates = [];
let latestAssignmentDetailFiles = [];
let latestFollowupFiles = [];
let latestHomeworkCandidates = [];
let latestSavedTasks = [];
let latestCourseMatches = [];
let latestAssignmentDetail = null;
let latestAssignmentCandidate = null;
let latestActiveAssignmentTitle = "";
let latestAiAnalysis = null;
let latestCheckedCourseName = "";
let chatMode = "local";
let jimaToolRegistry = null;
let pendingAiConfirmation = false;
let selectedAnalysisFile = null;
const jimaChatHistory = [];
const jimaNoticeCache = new Map();

const jimaSessionMemory = {
  latestAnalyzedCoursePageContext: null,
  latestHomeworkCandidates: [],
  latestCourseFileCandidates: [],
  latestInspectedAssignmentDetail: null,
  latestAssignmentFiles: [],
  latestActiveAssignmentTitle: "",
  lastMatchedFiles: [],
  lastReferencedFile: null,
  lastFileIntent: "",
  lastFileActionOffered: "",
  lastFileSourcePage: "",
  lastFileAnalysisSummary: null,
  latestAiResponse: null
};

const JIMA_FOLLOWUP_DOWNLOAD_PATTERN = /(download|save|get)\b.*\b(file|files|pdf|homework|assignment)|\b(file|files|pdf|homework|assignment)\b.*\b(download|save|get)|\u05d4\u05d5\u05e8\u05d3\s+\u05e7\u05d5\u05d1\u05e5|\u05ea\u05d5\u05e8\u05d9\u05d3\s+\u05e7\u05d5\u05d1\u05e5|\u05dc\u05d4\u05d5\u05e8\u05d9\u05d3\s+\u05d0\u05ea\s+\u05d4\u05e7\u05d5\u05d1\u05e5|\u05e7\u05d5\u05d1\u05e5\s+\u05d4\u05de\u05d8\u05dc\u05d4|\u05e7\u05d5\u05d1\u05e5\s+\u05e9\u05d9\u05e2\u05d5\u05e8\u05d9\s+\u05d4\u05d1\u05d9\u05ea/i;
const JIMA_FOLLOWUP_SHOW_FILES_PATTERN = /(show|list|what|which).*\b(file|files|pdf|resources?)\b|\b(file|files|resources?)\b.*(found|available|show|list)|\u05de\u05d4\s+\u05d4\u05e7\u05d1\u05e6\u05d9\u05dd|\u05d0\u05d9\u05dc\u05d5\s+\u05e7\u05d1\u05e6\u05d9\u05dd|\u05d4\u05e6\u05d2\s+\u05e7\u05d1\u05e6\u05d9\u05dd|\u05ea\u05e8\u05d0\u05d4\s+\u05e7\u05d1\u05e6\u05d9\u05dd/i;
const JIMA_CHAT_ANALYZE_PATTERN = /(analy[sz]e|check|scan).*(current|this|page|moodle)|\bcurrent moodle page\b/i;
const JIMA_CHAT_AI_PATTERN = /\b(ai|openai|gpt)\b|ask jima with ai|explain with ai/i;
const JIMA_CHAT_HOMEWORK_PATTERN = /(homework|assignment|assignments|task|tasks|due|deadline|submit|submission|quiz|exercise|\u05e9\u05d9\u05e2\u05d5\u05e8\u05d9\s+\u05d1\u05d9\u05ea|\u05de\u05d8\u05dc\u05d4|\u05de\u05d8\u05dc\u05d5\u05ea|\u05ea\u05e8\u05d2\u05d9\u05dc|\u05d4\u05d2\u05e9\u05d4|\u05dc\u05d4\u05d2\u05d9\u05e9|\u05d3\u05d3\u05dc\u05d9\u05d9\u05df|\u05d1\u05d5\u05d7\u05df)/i;
const JIMA_ASSIGNMENT_DETAIL_FOLLOWUP_PATTERN = /(enter|open|check|inspect).*\b(homework|assignment|task|quiz)\b|\b(homework|assignment|task|quiz)\b.*\b(deadline|due date|date|close|closes|closing|due)\b|\b(what|when).*\b(deadline|due date|due|close|closes|closing)\b|\b(deadline date|homework date)\b|\u05ea\u05d9\u05db\u05e0\u05e1\s+\u05dc\u05de\u05d8\u05dc\u05d4|\u05db\u05e0\u05e1\s+\u05dc\u05de\u05d8\u05dc\u05d4|\u05ea\u05d1\u05d3\u05d5\u05e7\s+\u05d0\u05ea\s+\u05d4\u05de\u05d8\u05dc\u05d4|\u05de\u05d4\s+\u05d4\u05d3\u05d3\u05dc\u05d9\u05d9\u05df|\u05de\u05d4\s+\u05d4\u05de\u05d5\u05e2\u05d3\s+\u05d4\u05d2\u05e9\u05d4|\u05de\u05d4\s+\u05ea\u05d0\u05e8\u05d9\u05da\s+\u05d4\u05d4\u05d2\u05e9\u05d4|\u05de\u05ea\u05d9\s+\u05d4\u05d4\u05d2\u05e9\u05d4|\u05de\u05ea\u05d9\s+\u05d6\u05d4\s+\u05e0\u05e1\u05d2\u05e8|\u05de\u05ea\u05d9\s+\u05de\u05e1\u05ea\u05d9\u05d9\u05dd|\u05ea\u05d0\u05e8\u05d9\u05da\s+\u05dc\u05de\u05d8\u05dc\u05d4|\u05d3\u05d3\u05dc\u05d9\u05d9\u05df\s+\u05dc\u05de\u05d8\u05dc\u05d4/i;
const JIMA_STRICT_TASK_PATTERN = /(homework|assignment|task|submit|submission|due|deadline|exercise|project|quiz|lab|\/mod\/(?:assign|quiz|workshop)\/view\.php|\u05de\u05d8\u05dc\u05d4|\u05e9\u05d9\u05e2\u05d5\u05e8\u05d9\s+\u05d1\u05d9\u05ea|\u05ea\u05e8\u05d2\u05d9\u05dc|\u05d4\u05d2\u05e9\u05d4|\u05dc\u05d4\u05d2\u05d9\u05e9|\u05de\u05d5\u05e2\u05d3\s+\u05d4\u05d2\u05e9\u05d4|\u05d3\u05d3\u05dc\u05d9\u05d9\u05df|\u05d1\u05d5\u05d7\u05df|\u05e4\u05e8\u05d5\u05d9\u05d9\u05e7\u05d8|\u05e4\u05e8\u05d5\u05d9\u05e7\u05d8|\u05de\u05e2\u05d1\u05d3\u05d4)/i;
const JIMA_RESOURCE_ONLY_PATTERN = /(lecture|resource|file|folder|slides?|presentation|\u05d4\u05e8\u05e6\u05d0\u05d4|\u05d9\u05d7\u05d9\u05d3\u05ea\s+\u05d4\u05d5\u05e8\u05d0\u05d4|\u05e7\u05d5\u05d1\u05e5|\u05d7\u05d5\u05de\u05e8|\u05de\u05e6\u05d2\u05ea)/i;
const JIMA_OPEN_FILE_PATTERN = /\b(open|view|show|check)\b.*\b(file|lecture|resource|pdf|slides?)\b|\b(what is|what's)\b.*\b(about|lecture|file|resource)\b|\u05de\u05d4.*\u05d4\u05e8\u05e6\u05d0\u05d4|\u05e4\u05ea\u05d7.*\u05e7\u05d5\u05d1\u05e5|\u05d4\u05e6\u05d2.*\u05e7\u05d5\u05d1\u05e5/i;
const JIMA_FILE_REFERENCE_PATTERN = /\b(?:lecture|lec|lesson)\s*(?:number\s*)?\d+\b|\b\d+\s*(?:lecture|lec|lesson)\b|\u05d4\u05e8\u05e6\u05d0\u05d4\s*(?:\u05de\u05e1\u05e4\u05e8\s*)?\d+|\d+\s*\u05d4\u05e8\u05e6\u05d0\u05d4|\u05d9\u05d7\u05d9\u05d3\u05ea\s+\u05d4\u05d5\u05e8\u05d0\u05d4\s*\d+|\d+\s*\u05d9\u05d7\u05d9\u05d3\u05ea\s+\u05d4\u05d5\u05e8\u05d0\u05d4|\u05e7\u05d5\u05d1\u05e5\s*(?:\u05de\u05e1\u05e4\u05e8\s*)?\d+|\d+\s*\u05e7\u05d5\u05d1\u05e5/i;
function setStatus(text, type = "") {
  if (!statusMessage) return;
  statusMessage.textContent = text;
  statusMessage.className = `status-message${type ? ` is-${type}` : ""}`;
}

function setCourseQueryStatus(text, type = "") {
  if (!courseQueryStatus) return;
  courseQueryStatus.textContent = text;
  courseQueryStatus.className = `status-message compact${type ? ` is-${type}` : ""}`;
}

function setAiStatus(text, type = "") {
  if (!aiStatusMessage) return;
  aiStatusMessage.textContent = text;
  aiStatusMessage.className = `status-message${type ? ` is-${type}` : ""}`;
}

function setDownloadStatus(text, type = "") {
  if (!downloadStatusMessage) return;
  downloadStatusMessage.textContent = text;
  downloadStatusMessage.className = `status-message compact${type ? ` is-${type}` : ""}`;
}

function setSavedTasksStatus(text, type = "") {
  if (!savedTasksStatus) return;
  savedTasksStatus.textContent = text;
  savedTasksStatus.className = `status-message compact${type ? ` is-${type}` : ""}`;
}

function setAssignmentDetailStatus(text, type = "") {
  if (!assignmentDetailStatus) return;
  assignmentDetailStatus.textContent = text;
  assignmentDetailStatus.className = `status-message compact${type ? ` is-${type}` : ""}`;
}

function setAssignmentDetailDownloadStatus(text, type = "") {
  if (!assignmentDetailDownloadStatus) return;
  assignmentDetailDownloadStatus.textContent = text;
  assignmentDetailDownloadStatus.className = `status-message compact${type ? ` is-${type}` : ""}`;
}

function setSaveDetailTaskStatus(text, type = "") {
  if (!saveDetailTaskStatus) return;
  saveDetailTaskStatus.textContent = text;
  saveDetailTaskStatus.className = `status-message compact${type ? ` is-${type}` : ""}`;
}

function setFollowupStatus(text, type = "") {
  if (!followupStatus) return;
  followupStatus.textContent = text;
  followupStatus.className = `status-message compact${type ? ` is-${type}` : ""}`;
}

function setFollowupDownloadStatus(text, type = "") {
  if (!followupDownloadStatus) return;
  followupDownloadStatus.textContent = text;
  followupDownloadStatus.className = `status-message compact${type ? ` is-${type}` : ""}`;
}

function setFileAnalysisStatus(text, type = "") {
  if (!fileAnalysisStatus) return;
  fileAnalysisStatus.textContent = text;
  fileAnalysisStatus.className = `status-message compact${type ? ` is-${type}` : ""}`;
}

function setLoading(isLoading) {
  if (!analyzePageBtn) return;
  analyzePageBtn.disabled = isLoading;
  analyzePageBtn.textContent = isLoading ? "Analyzing locally..." : "Analyze current Moodle page";
}

function setCourseQueryLoading(isLoading) {
  if (!findCourseBtn) return;
  findCourseBtn.disabled = isLoading;
  findCourseBtn.textContent = isLoading ? "Searching..." : "Find course";
}

function setAiLoading(isLoading) {
  if (!askAiBtn) return;
  askAiBtn.disabled = isLoading;
  askAiBtn.textContent = isLoading ? "Asking local backend..." : "Ask Jima with AI";
}

function setDownloadLoading(isLoading) {
  if (!downloadSelectedBtn) return;
  downloadSelectedBtn.disabled = isLoading || getSelectedFileCandidates("page").length === 0;
  downloadSelectedBtn.textContent = isLoading ? "Starting downloads..." : "Download selected files";
}

function setAssignmentDetailDownloadLoading(isLoading) {
  if (!downloadDetailSelectedBtn) return;
  downloadDetailSelectedBtn.disabled = isLoading || getSelectedFileCandidates("detail").length === 0;
  downloadDetailSelectedBtn.textContent = isLoading ? "Starting downloads..." : "Download selected detail files";
}

function setFollowupDownloadLoading(isLoading) {
  if (!downloadFollowupSelectedBtn) return;
  downloadFollowupSelectedBtn.disabled = isLoading || getSelectedFileCandidates("followup").length === 0;
  downloadFollowupSelectedBtn.textContent = isLoading ? "Starting downloads..." : getDownloadButtonBaseText("followup");
}

function setFileAnalysisLoading(isLoading) {
  if (!analyzeSelectedFileBtn) return;
  analyzeSelectedFileBtn.disabled = isLoading || !getSelectedAnalysisFile();
  analyzeSelectedFileBtn.textContent = isLoading ? "Analyzing file..." : "Analyze file";
}

function clearList(listEl) {
  if (listEl) listEl.textContent = "";
}

function appendEmptyRow(listEl, text) {
  const item = document.createElement("li");
  item.className = "empty-row";
  item.textContent = text;
  listEl.appendChild(item);
}

function appendPlainRow(listEl, text) {
  const item = document.createElement("li");
  item.textContent = text;
  listEl.appendChild(item);
}

function appendLinkRow(listEl, link) {
  const item = document.createElement("li");
  const anchor = document.createElement("a");
  anchor.href = link.url;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  anchor.textContent = link.text || link.url;
  item.appendChild(anchor);
  listEl.appendChild(item);
}

function addChatMessage(role, text, actions = [], type = "text") {
  if (!chatMessages || !text) return null;
  const noticeKey = getChatNoticeKey(role, text, type);
  if (noticeKey) {
    const cached = jimaNoticeCache.get(noticeKey);
    if (cached?.element?.isConnected && Date.now() - cached.updatedAt < JIMA_NOTICE_DEDUPE_MS) {
      cached.updatedAt = Date.now();
      cached.element.classList.add("is-refreshed");
      scrollChatToLatest(cached.element);
      return cached.element;
    }
  }

  const messageModel = globalThis.JimaChatV2?.createMessage
    ? globalThis.JimaChatV2.createMessage({
      role: role === "assistant" ? "jima" : role,
      type,
      text,
      actions
    })
    : {
      id: `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: role === "assistant" ? "jima" : role,
      type,
      text,
      createdAt: new Date().toISOString(),
      actions
    };
  jimaChatHistory.push(messageModel);

  const message = document.createElement("div");
  const roleClass = role === "user" ? "user" : role === "system" ? "system" : "assistant";
  message.className = `chat-message ${roleClass} ${messageModel.type}`;
  message.dataset.messageId = messageModel.id;
  if (noticeKey) message.dataset.noticeKey = noticeKey;
  if (roleClass === "assistant") {
    const avatar = document.createElement("img");
    avatar.className = "message-avatar";
    avatar.src = "../../assets/icons/jima-avatar.png";
    avatar.alt = "";
    avatar.setAttribute("aria-hidden", "true");
    message.appendChild(avatar);
  }

  const body = document.createElement("div");
  body.className = "chat-message-body";
  body.textContent = messageModel.text;
  message.appendChild(body);

  const visibleActions = messageModel.actions.filter(Boolean);
  if (visibleActions.length > 0) {
    const actionRow = document.createElement("div");
    actionRow.className = "chat-message-actions";

    for (const action of visibleActions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chat-action-btn";
      button.textContent = action.label;
      for (const [key, value] of Object.entries(action.dataset || {})) {
        button.dataset[key] = String(value);
      }
      actionRow.appendChild(button);
    }

    body.appendChild(actionRow);
  }

  chatMessages.appendChild(message);
  if (noticeKey) {
    jimaNoticeCache.set(noticeKey, {
      element: message,
      updatedAt: Date.now()
    });
  }
  scrollChatToLatest(message);
  return message;
}

function getChatNoticeKey(role, text, type) {
  if (role !== "assistant") return "";
  const normalized = normalizeChatText(text);
  const isNotice = (
    type === "error" ||
    type === "confirmation" ||
    /backend|openai_api_key|api key|moodle page|open a bgu moodle page|choose .*file|choose .*downloaded|unsupported file|file type is not supported|too large|already waiting|no file|could not reach|not running|quota|billing|invalid response/.test(normalized)
  );
  return isNotice ? `${type}:${normalized.slice(0, 180)}` : "";
}

function scrollChatToLatest(target = null) {
  if (!chatMessages) return;
  const activeElement = document.activeElement;
  const userIsSelectingFile = Boolean(fileAnalysisDetails && activeElement && fileAnalysisDetails.contains(activeElement));
  if (userIsSelectingFile) return;

  window.requestAnimationFrame(() => {
    if (target?.scrollIntoView) {
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function normalizeChatText(value) {
  const normalizer = globalThis.JimaCourseResolver?.normalizeText;
  return normalizer
    ? normalizer(value)
    : String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function updateChatMode(mode) {
  chatMode = mode === "ai" ? "ai" : "local";

  for (const button of Array.from(chatModeToggle?.querySelectorAll("[data-mode]") || [])) {
    const isActive = button.dataset.mode === chatMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  if (chatModeStatus) {
    chatModeStatus.textContent = chatMode === "ai"
      ? "AI mode still asks before sending extracted context to the local backend."
      : "Local mode uses only visible page evidence and extension rules.";
  }
}

function runJimaTool(name, payload) {
  if (!jimaToolRegistry?.has(name)) {
    addChatMessage("assistant", `That tool is not available yet: ${name}.`, [], "error");
    return Promise.resolve(null);
  }

  return jimaToolRegistry.run(name, payload);
}

function buildCurrentAiContextBundle(userQuestion = "") {
  const strictDetections = getStrictDetectionsForAssistant(latestDetections || {});
  const exactQuestion = String(userQuestion || "").trim();
  const localSummary = [
    localAnswerText?.textContent || "",
    ...Array.from(localAnswerList?.querySelectorAll("li") || []).map((item) => item.textContent || "")
  ].filter(Boolean).join(" ");
  const course = latestCheckedCourseName || latestPageContext?.pageTitle
    ? {
      name: latestCheckedCourseName || latestPageContext?.pageTitle || "",
      url: latestPageContext?.url || latestPageContext?.currentUrl || ""
    }
    : null;

  return globalThis.JimaChatV2?.buildAiContextBundle
    ? globalThis.JimaChatV2.buildAiContextBundle({
      pageContext: latestPageContext,
      detections: strictDetections,
      userQuestion: exactQuestion,
      originalUserMessage: exactQuestion,
      recentChatMessages: jimaChatHistory,
      localSummary,
      course,
      assignmentDetail: latestAssignmentDetail,
      lastReferencedFile: jimaSessionMemory.lastReferencedFile,
      lastFileAnalysisSummary: jimaSessionMemory.lastFileAnalysisSummary
    })
    : {
      pageContext: latestPageContext,
      detections: strictDetections,
      userQuestion: exactQuestion
    };
}

function getCandidateEvidenceText(candidate = {}) {
  return [
    candidate.title,
    candidate.name,
    candidate.type,
    candidate.evidence,
    candidate.fileType,
    candidate.url
  ].filter(Boolean).join(" ");
}

function isStrictHomeworkCandidate(candidate) {
  if (globalThis.JimaTasks?.isTaskLikeCandidate) {
    return globalThis.JimaTasks.isTaskLikeCandidate(candidate);
  }

  const evidenceText = getCandidateEvidenceText(candidate);
  return JIMA_STRICT_TASK_PATTERN.test(evidenceText);
}

function getStrictHomeworkCandidates(candidates = []) {
  return (candidates || []).filter(isStrictHomeworkCandidate);
}

function getStrictDetectionsForAssistant(detections = {}) {
  return {
    ...detections,
    homeworkCandidates: getStrictHomeworkCandidates(detections.homeworkCandidates || [])
  };
}

function getMoodleActivityTypeFromUrl(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/mod\/([^/]+)\/view\.php$/i);
    return match?.[1] || "";
  } catch {
    return "";
  }
}

function isInspectableAssignmentCandidate(candidate = {}) {
  const activityType = candidate.activityType || getMoodleActivityTypeFromUrl(candidate.url);
  return /^(assign|quiz)$/i.test(activityType);
}

function getAssignmentCandidateRank(candidate = {}) {
  const activityType = candidate.activityType || getMoodleActivityTypeFromUrl(candidate.url);
  if (activityType === "assign") return 100;
  if (activityType === "quiz") return 90;
  if (isStrictHomeworkCandidate(candidate)) return 50;
  return 0;
}

function getInspectableHomeworkCandidates() {
  return [...(latestHomeworkCandidates || [])]
    .filter((candidate) => candidate?.url && isInspectableAssignmentCandidate(candidate))
    .sort((a, b) => getAssignmentCandidateRank(b) - getAssignmentCandidateRank(a));
}

function describeFileMix(files = []) {
  const counts = {
    homework: 0,
    lecture: 0,
    resource: 0,
    unknown: 0
  };

  for (const file of files) {
    const text = getCandidateEvidenceText(file);
    if (JIMA_STRICT_TASK_PATTERN.test(text)) {
      counts.homework += 1;
    } else if (/lecture|\u05d4\u05e8\u05e6\u05d0\u05d4/i.test(text)) {
      counts.lecture += 1;
    } else if (JIMA_RESOURCE_ONLY_PATTERN.test(text)) {
      counts.resource += 1;
    } else {
      counts.unknown += 1;
    }
  }

  const parts = [];
  if (counts.homework) parts.push(countLabel(counts.homework, "homework-related file"));
  if (counts.lecture) parts.push(countLabel(counts.lecture, "lecture file"));
  if (counts.resource) parts.push(countLabel(counts.resource, "resource file"));
  if (counts.unknown) parts.push(countLabel(counts.unknown, "file"));
  return parts.join(", ") || "no file resources";
}

function getLatestFileCandidatesForChat() {
  if (jimaSessionMemory.latestAssignmentFiles.length > 0) {
    return {
      source: "assignment",
      label: latestActiveAssignmentTitle
        ? `the latest inspected assignment (${latestActiveAssignmentTitle})`
        : "the latest inspected assignment",
      files: jimaSessionMemory.latestAssignmentFiles
    };
  }

  return {
    source: "course",
    label: "the latest checked page",
    files: jimaSessionMemory.latestCourseFileCandidates || []
  };
}

function normalizeFileLookupText(value) {
  return normalizeChatText(value)
    .replace(/\blec\b/g, "lecture")
    .replace(/\blesson\b/g, "lecture")
    .replace(/\bnumber\b/g, "")
    .replace(/\bslides?\b/g, "presentation")
    .replace(/\u05d9\u05d7\u05d9\u05d3\u05ea\s+\u05d4\u05d5\u05e8\u05d0\u05d4/g, "\u05d4\u05e8\u05e6\u05d0\u05d4")
    .replace(/\u05de\u05e1\u05e4\u05e8/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFileSearchHints(query) {
  const normalized = normalizeFileLookupText(query);
  const numbers = normalized.match(/\d+/g) || [];
  const wantsLecture = /\b(lecture|presentation)\b|\u05d4\u05e8\u05e6\u05d0\u05d4/.test(normalized);
  const wantsFile = /\b(file|pdf|resource|presentation)\b|\u05e7\u05d5\u05d1\u05e5|\u05d7\u05d5\u05de\u05e8|\u05de\u05e6\u05d2\u05ea/.test(normalized);
  const isPronounReference = /\b(it|this|that|same one)\b|\u05d6\u05d4|\u05d6\u05d0\u05ea|\u05d0\u05d5\u05ea\u05d5|\u05d0\u05d5\u05ea\u05d4|\u05d4\u05e7\u05d5\u05d1\u05e5/.test(normalized);

  return {
    normalized,
    numbers,
    wantsLecture,
    wantsFile,
    isPronounReference,
    hasSpecificTarget: wantsLecture || wantsFile || numbers.length > 0
  };
}

function getSearchTokens(query) {
  const ignored = new Set([
    "download",
    "get",
    "read",
    "summarize",
    "summarise",
    "analyze",
    "analyse",
    "open",
    "show",
    "check",
    "what",
    "about",
    "file",
    "files",
    "resource",
    "resources",
    "lecture",
    "lesson",
    "pdf",
    "the",
    "this",
    "is",
    "it",
    "that",
    "can",
    "you",
    "me",
    "\u05d4\u05d5\u05e8\u05d3",
    "\u05d4\u05d5\u05e8\u05d9\u05d3\u05d9",
    "\u05ea\u05d5\u05e8\u05d9\u05d3",
    "\u05ea\u05d5\u05e8\u05d9\u05d3\u05d9",
    "\u05dc\u05d4\u05d5\u05e8\u05d9\u05d3",
    "\u05ea\u05e7\u05e8\u05d0",
    "\u05ea\u05e7\u05e8\u05d0\u05d9",
    "\u05ea\u05e1\u05db\u05dd",
    "\u05ea\u05e1\u05db\u05de\u05d9",
    "\u05de\u05d4",
    "\u05e2\u05dc",
    "\u05d4\u05e8\u05e6\u05d0\u05d4",
    "\u05e7\u05d5\u05d1\u05e5",
    "\u05d4\u05e7\u05d5\u05d1\u05e5"
  ]);
  return normalizeFileLookupText(query)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !ignored.has(token));
}

function getFileDisplayName(file) {
  return String(file?.name || file?.title || file?.text || "Moodle file").trim();
}

function getPrimaryFileMatchText(file) {
  return [
    file?.name,
    file?.title,
    file?.text,
    file?.fileType
  ]
    .filter(Boolean)
    .join(" ");
}

function getFallbackFileMatchText(file) {
  return file?.name || file?.title || file?.text
    ? ""
    : String(file?.evidence || "");
}

function hasExactNumberToken(text, number) {
  return new RegExp(`(^|\\D)${number}(\\D|$)`).test(text);
}

function hasResourceWord(text) {
  return /\b(lecture|presentation|resource|file|pdf)\b|\u05d4\u05e8\u05e6\u05d0\u05d4|\u05e7\u05d5\u05d1\u05e5|\u05d7\u05d5\u05de\u05e8|\u05de\u05e6\u05d2\u05ea/.test(text);
}

function hasLectureWord(text) {
  return /\b(lecture|presentation)\b|\u05d4\u05e8\u05e6\u05d0\u05d4/.test(text);
}

function hasNumberNearResource(text, number) {
  const escapedNumber = number.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lectureWord = "(?:lecture|presentation|\\u05d4\\u05e8\\u05e6\\u05d0\\u05d4)";
  return new RegExp(`${lectureWord}.{0,24}(^|\\D)${escapedNumber}(\\D|$)|(^|\\D)${escapedNumber}(\\D|$).{0,24}${lectureWord}`).test(text);
}

function scoreFileForQuery(file, query) {
  const hints = getFileSearchHints(query);
  const tokens = getSearchTokens(query);
  const primaryText = normalizeFileLookupText(getPrimaryFileMatchText(file));
  const fallbackText = normalizeFileLookupText(getFallbackFileMatchText(file));
  const text = primaryText || fallbackText;
  let score = 0;

  if (!hints.hasSpecificTarget && tokens.length === 0) return 1;
  if (!text) return 0;

  if (hints.numbers.length > 0 && !hints.numbers.some((number) => hasExactNumberToken(primaryText, number))) {
    return 0;
  }

  if (hints.normalized && primaryText === hints.normalized) score += 20;
  if (hints.normalized && primaryText.includes(hints.normalized)) score += 12;

  for (const number of hints.numbers) {
    if (hasExactNumberToken(primaryText, number)) score += 8;
    if (hasNumberNearResource(primaryText, number)) score += 6;
  }

  if (hints.wantsLecture && hasLectureWord(primaryText)) {
    score += 6;
  }

  if (hints.wantsFile && hasResourceWord(primaryText)) {
    score += 3;
  }

  for (const token of tokens) {
    if (/\d+/.test(token)) continue;
    if (primaryText.includes(token)) score += 2;
    else if (!primaryText && fallbackText.includes(token)) score += 1;
  }

  return score;
}

function filterFilesForQuery(files, query, options = {}) {
  const tokens = getSearchTokens(query);
  const hints = getFileSearchHints(query);
  if (hints.isPronounReference && jimaSessionMemory.lastReferencedFile?.url) {
    return [jimaSessionMemory.lastReferencedFile];
  }

  if (hints.wantsFile && !hints.wantsLecture && hints.numbers.length === 0 && tokens.length === 0) {
    return files;
  }

  if (!hints.hasSpecificTarget && tokens.length === 0) {
    return options.fallbackToAll === false ? [] : files;
  }

  const scoredMatches = files
    .map((file) => ({ file, score: scoreFileForQuery(file, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  const bestScore = scoredMatches[0]?.score || 0;
  const threshold = hints.numbers.length > 0 ? 8 : hints.hasSpecificTarget ? 4 : 1;
  const matches = scoredMatches
    .filter((entry) => entry.score >= Math.max(threshold, bestScore > 0 ? bestScore - 2 : threshold))
    .map((entry) => entry.file);

  if (matches.length > 0) return matches;
  return options.fallbackToAll === false ? [] : files;
}

function rememberFileReference(files, intent, sourceLabel) {
  const safeFiles = Array.isArray(files) ? files.filter((file) => file?.url) : [];
  jimaSessionMemory.lastMatchedFiles = safeFiles.slice(0, 10);
  jimaSessionMemory.lastReferencedFile = safeFiles.length === 1 ? safeFiles[0] : jimaSessionMemory.lastReferencedFile;
  jimaSessionMemory.lastFileIntent = intent || "";
  jimaSessionMemory.lastFileActionOffered = intent || "";
  jimaSessionMemory.lastFileSourcePage = sourceLabel || "";
}

function getTitleOnlyHint(file) {
  const name = getFileDisplayName(file);
  const parts = name.split(/\s[-–—:]\s/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    return `From the title only, it appears related to ${parts.slice(1).join(" - ")}.`;
  }
  return `From the title only, I can identify it as "${name}".`;
}

function getRequestedFileLabel(query) {
  const hints = getFileSearchHints(query);
  const number = hints.numbers[0] || "";
  if (!number) return "";
  if (hints.wantsLecture) return `lecture ${number}`;
  if (hints.wantsFile) return `file ${number}`;
  return `item ${number}`;
}

function openEvidenceDetails() {
  if (evidenceDetails) {
    evidenceDetails.hidden = false;
  }
}

function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function countOrNone(count, singular, plural = `${singular}s`) {
  return count === 0 ? `no ${plural}` : countLabel(count, singular, plural);
}

function getPageTitleForSummary(pageContext, fallback = "") {
  return (
    String(fallback || "").trim() ||
    pageContext?.pageTitle ||
    pageContext?.documentTitle ||
    "this Moodle page"
  );
}

function renderLocalAnswer(summary, bullets = []) {
  if (!localAnswerPanel || !localAnswerText || !localAnswerList) return;

  localAnswerText.textContent = summary || "";
  clearList(localAnswerList);

  for (const bullet of bullets.filter(Boolean)) {
    const item = document.createElement("li");
    item.textContent = bullet;
    localAnswerList.appendChild(item);
  }

  localAnswerPanel.hidden = !summary && bullets.length === 0;
}

function clearLocalAnswer() {
  if (!localAnswerPanel) return;
  localAnswerPanel.hidden = true;
  if (localAnswerText) localAnswerText.textContent = "";
  if (localAnswerList) clearList(localAnswerList);
}

function buildCourseLocalSummary(pageContext, detections = {}, courseName = "") {
  const strictHomework = getStrictHomeworkCandidates(detections.homeworkCandidates || []);
  const homeworkCountValue = strictHomework.length;
  const dateCountValue = (detections.deadlineCandidates || []).length;
  const fileCountValue = (detections.fileCandidates || []).length;
  const pageLabel = getPageTitleForSummary(pageContext, courseName);
  const fileMix = describeFileMix(detections.fileCandidates || []);

  const homeworkSentence = homeworkCountValue > 0
    ? `I found ${countLabel(homeworkCountValue, "possible homework item")} with homework/task-like evidence`
    : "I did not find clear homework candidates in the visible page text";
  const summary = `I checked the visible Moodle page for ${pageLabel}. ${homeworkSentence}. I also found ${countOrNone(dateCountValue, "date clue")} and ${fileMix}. I cannot confirm whether homework was submitted from the course page alone.`;
  const bullets = [];

  if (homeworkCountValue > 0) {
    bullets.push("Use Check details for a specific assignment to look for visible submission status.");
  } else {
    bullets.push("No clear homework candidate appears in the visible page text.");
  }

  if (dateCountValue > 0) {
    bullets.push("Date clues are shown as evidence, not confirmed final deadlines.");
  }

  if (fileCountValue > 0) {
    bullets.push("Files are visible resources only. Jima has not read file contents.");
    if (homeworkCountValue === 0) {
      bullets.push("I did not offer task saving for lecture/resource files without homework or submission evidence.");
    }
  }

  return { summary, bullets };
}

function getAssignmentDetailDates(detail = {}) {
  return detail.dates || {};
}

function getLikelyDeadline(detail = {}) {
  const dates = getAssignmentDetailDates(detail);
  if (dates.dueAt) {
    return {
      ...dates.dueAt,
      kind: "dueAt",
      interpretation: "This is the visible due date."
    };
  }

  if (dates.cutoffAt) {
    return {
      ...dates.cutoffAt,
      kind: "cutoffAt",
      interpretation: "This is the visible cut-off date."
    };
  }

  if (dates.closesAt) {
    return {
      ...dates.closesAt,
      kind: "closesAt",
      interpretation: "The page shows a closing/end date. This appears to be the relevant submission deadline."
    };
  }

  return null;
}

function formatDetailDateLine(label, value) {
  return value ? `${label}: ${value.rawValue || value.evidence || ""}` : "";
}

function buildAssignmentDetailChatAnswer(detail = {}) {
  const title = detail.title || latestActiveAssignmentTitle || "this assignment";
  const dates = getAssignmentDetailDates(detail);
  const dateLines = [
    formatDetailDateLine("Opens", dates.opensAt),
    formatDetailDateLine("Due", dates.dueAt),
    formatDetailDateLine("Closes", dates.closesAt),
    formatDetailDateLine("Cut-off", dates.cutoffAt),
    formatDetailDateLine("Time remaining", dates.timeRemaining)
  ].filter(Boolean);
  const likelyDeadline = getLikelyDeadline(detail);
  const status = detail.status || {};
  const instructions = detail.instructionsPreview
    ? "I also found visible instruction text on the detail page."
    : "I did not find a separate instruction preview.";
  const statusLine = status.value && status.value !== "unknown"
    ? `Visible submission status evidence suggests: ${status.label || status.value}.`
    : "I could not confirm submission status from the visible text.";

  const lines = [`I checked ${title}.`];

  if (dateLines.length > 0) {
    lines.push(`The visible Moodle page shows:\n- ${dateLines.join("\n- ")}`);
  } else {
    lines.push("I did not find a clear visible deadline/date field on the detail page.");
  }

  if (likelyDeadline) {
    lines.push(likelyDeadline.interpretation);
  } else if (dates.opensAt) {
    lines.push("I found an opening date, but I did not find a clear deadline.");
  }

  lines.push(instructions);
  lines.push(statusLine);
  return lines.join("\n\n");
}

function buildAssignmentDetailLocalSummary(detail = {}, extraBullet = "") {
  const title = detail.title || latestActiveAssignmentTitle || "this assignment";
  const statusValue = detail.status?.value || "unknown";
  const structuredDateCount = Object.values(getAssignmentDetailDates(detail)).filter(Boolean).length;
  const dateCountValue = structuredDateCount || (detail.dueDates || []).length;
  const fileCountValue = (detail.files || []).length;
  const hasInstructions = Boolean(detail.instructionsPreview || detail.textPreview);
  const statusText = {
    not_submitted: "Visible Moodle text suggests this assignment may be not submitted.",
    submitted: "Visible Moodle text suggests this assignment may be submitted.",
    draft: "Visible Moodle text suggests this assignment may be in draft status."
  }[statusValue] || "I could not confirm submission status from the visible text.";

  const summary = `I checked the assignment detail page for ${title}. ${statusText}`;
  const bullets = [];

  if (dateCountValue > 0) {
    bullets.push(`I found ${countLabel(dateCountValue, "date clue")}, but I cannot confirm each one is the final deadline.`);
  } else {
    bullets.push("No clear due date evidence was visible on this detail page.");
  }

  if (fileCountValue > 0) {
    bullets.push(`I found ${countLabel(fileCountValue, "file resource")}. I have not read the file contents.`);
  }

  if (hasInstructions) {
    bullets.push("There is a visible instruction preview from the detail page.");
  }

  if (detail.status?.uncertainty) {
    bullets.push(`Uncertainty: ${detail.status.uncertainty}`);
  }

  if (extraBullet) bullets.push(extraBullet);

  return { summary, bullets };
}

function renderCourseLocalAnswer(pageContext, detections, courseName = "") {
  const answer = buildCourseLocalSummary(pageContext, detections, courseName);
  renderLocalAnswer(answer.summary, answer.bullets);
  return answer;
}

function renderAssignmentDetailLocalAnswer(detail, extraBullet = "") {
  const answer = buildAssignmentDetailLocalSummary(detail, extraBullet);
  renderLocalAnswer(answer.summary, answer.bullets);
  return answer;
}

function confidenceClass(confidence) {
  return String(confidence || "Low").toLowerCase();
}

function createConfidenceBadge(confidence) {
  const badge = document.createElement("span");
  badge.className = `confidence ${confidenceClass(confidence)}`;
  badge.textContent = confidence || "Low";
  return badge;
}

function createCandidateCard(titleText, confidence, url) {
  const item = document.createElement("li");
  item.className = "candidate-card";

  const title = document.createElement("div");
  title.className = "candidate-title";

  if (url) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = titleText;
    title.appendChild(anchor);
  } else {
    const text = document.createElement("span");
    text.textContent = titleText;
    title.appendChild(text);
  }

  title.appendChild(createConfidenceBadge(confidence));
  item.appendChild(title);
  return item;
}

function appendCandidateText(item, className, text) {
  if (!text) return;
  const line = document.createElement("div");
  line.className = className;
  line.textContent = text;
  item.appendChild(line);
}

function isSafeMoodleDetailUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "moodle.bgu.ac.il" &&
      /\/mod\/(assign|quiz)\/view\.php/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function isSafeMoodleFileUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "moodle.bgu.ac.il";
  } catch {
    return false;
  }
}

function openFileCandidate(file) {
  if (!file?.url || !isSafeMoodleFileUrl(file.url)) {
    addChatMessage("assistant", "I can only open HTTPS BGU Moodle file/resource links from the latest checked page.", [], "error");
    return;
  }

  rememberFileReference([file], "open", jimaSessionMemory.lastFileSourcePage || "the latest file result");
  chrome.tabs.create({ url: file.url, active: true }, () => {
    if (chrome.runtime.lastError) {
      addChatMessage("assistant", chrome.runtime.lastError.message || "I could not open this file link.", [], "error");
      return;
    }

    addChatMessage(
      "assistant",
      `Opening ${file.name || "the selected file"} in Chrome. I have not read or analyzed its contents.`,
      [],
      "result"
    );
  });
}

function downloadSingleFollowupFile(index = 0) {
  const file = latestFollowupFiles[Number(index)] || jimaSessionMemory.lastReferencedFile;
  if (!file?.url) {
    addChatMessage("assistant", "I am not sure which file to download. Ask for a specific file or show files first.", [], "error");
    return;
  }

  rememberFileReference([file], "download", jimaSessionMemory.lastFileSourcePage || "the latest file result");
  renderFollowupFiles(
    {
      source: "memory",
      label: jimaSessionMemory.lastFileSourcePage || "the last referenced file",
      files: [file]
    },
    "download"
  );
  downloadSelectedFiles("followup");
}

function renderCourseMatches(matches, query) {
  clearList(courseMatchesList);
  latestCourseMatches = matches;

  if (matches.length === 0) {
    setCourseQueryStatus(`I could not find a saved course/page matching "${query}". Try saving the course first or search with a different name.`, "error");
    return;
  }

  setCourseQueryStatus(
    matches.length === 1
      ? `I found this saved course/page: ${matches[0].name}. Confirm before Jima opens and checks it.`
      : `I found ${matches.length} possible matches. Choose one course to check.`,
    "success"
  );

  for (const [index, match] of matches.entries()) {
    const item = document.createElement("li");
    item.className = "course-match-card";

    const title = document.createElement("div");
    title.className = "course-match-title";

    const name = document.createElement("span");
    name.textContent = match.name;
    title.appendChild(name);

    const source = document.createElement("span");
    source.className = "course-match-source";
    source.textContent = match.source === "saved" ? "Saved" : "Default";
    title.appendChild(source);
    item.appendChild(title);

    const link = document.createElement("a");
    link.className = "course-match-url";
    link.href = match.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = match.url;
    item.appendChild(link);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-action check-course-btn";
    button.dataset.matchIndex = String(index);
    button.disabled = !match.isMoodle;
    button.textContent = match.isMoodle ? (matches.length === 1 ? "Open and check this course" : "Check this course") : "Not a Moodle page";
    item.appendChild(button);

    courseMatchesList.appendChild(item);
  }
}

async function findCourseFromQuery() {
  const query = courseQueryInput?.value.trim() || "";
  clearList(courseMatchesList);

  if (!query) {
    setCourseQueryStatus("Type a course question or course name first.", "error");
    return;
  }

  if (!globalThis.JimaCourseResolver) {
    setCourseQueryStatus("Course matching is not available in this page.", "error");
    return;
  }

  setCourseQueryLoading(true);
  setCourseQueryStatus("Searching saved courses and default course data locally...", "active");

  try {
    const result = await resolveCourseMatches(query);
    renderCourseMatches(result.matches || [], query);
  } catch {
    setCourseQueryStatus("Jima could not search saved courses right now.", "error");
  } finally {
    setCourseQueryLoading(false);
  }
}

async function resolveCourseMatches(query) {
  if (!globalThis.JimaCourseResolver) {
    throw new Error("Course matching is not available.");
  }

  return globalThis.JimaCourseResolver.resolveCourses(query);
}

function setCourseCheckButtonsDisabled(isDisabled) {
  for (const button of Array.from(courseMatchesList?.querySelectorAll(".check-course-btn") || [])) {
    button.disabled = isDisabled || !latestCourseMatches[Number(button.dataset.matchIndex)]?.isMoodle;
  }
}

async function openAndAnalyzeCourseMatch(matchIndex) {
  const match = latestCourseMatches[Number(matchIndex)];
  if (!match) {
    setCourseQueryStatus("Choose a course match first.", "error");
    return;
  }

  if (!match.isMoodle) {
    setCourseQueryStatus("Jima can only check BGU Moodle pages in this phase.", "error");
    return;
  }

  setCourseCheckButtonsDisabled(true);
  latestCheckedCourseName = match.name || "";
  previewPanel.hidden = true;
  if (evidenceDetails) evidenceDetails.hidden = true;
  clearAssignmentDetail();
  clearFollowupResults();
  clearLocalAnswer();
  aiPanel.hidden = true;
  aiResults.hidden = true;
  setCourseQueryStatus(`Opening ${match.name} and checking the visible Moodle page locally...`, "active");
  setStatus("Jima is opening one confirmed course page and running local analysis.", "active");
  addChatMessage("assistant", `Opening ${match.name} and checking the visible Moodle page locally. I will not scan other courses.`);

  chrome.runtime.sendMessage(
    {
      type: "JIMA_OPEN_AND_ANALYZE_COURSE",
      course: {
        name: match.name,
        url: match.url
      }
    },
    (response) => {
      setCourseCheckButtonsDisabled(false);

      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError.message || "Jima could not check this course.";
        setCourseQueryStatus(error, "error");
        setStatus(error, "error");
        addChatMessage("assistant", error);
        return;
      }

      if (!response?.ok) {
        const error = response?.error || "Jima could not check this course.";
        setCourseQueryStatus(error, "error");
        setStatus(error, "error");
        addChatMessage("assistant", error);
        return;
      }

      renderContext(response.pageContext || response.context || {}, response.detections || {});
      const homeworkCountValue = getStrictHomeworkCandidates(response.detections?.homeworkCandidates || []).length;
      setCourseQueryStatus(`I checked the saved Moodle page for ${match.name}.`, "success");
      setStatus(
        `I found ${homeworkCountValue} possible homework candidate${homeworkCountValue === 1 ? "" : "s"} from the visible course page. I cannot confirm submission status from this course page alone; use Check details for one assignment when needed.`,
        "success"
      );
    }
  );
}

function appendTaskAction(item, candidate, index) {
  const actions = document.createElement("div");
  actions.className = "candidate-actions";

  const detailButton = document.createElement("button");
  detailButton.type = "button";
  detailButton.className = "task-action-btn check-detail-btn";
  detailButton.dataset.candidateIndex = String(index);

  if (isSafeMoodleDetailUrl(candidate?.url)) {
    detailButton.textContent = "Check details";
  } else {
    detailButton.textContent = "No detail link detected";
    detailButton.disabled = true;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "task-action-btn save-task-btn";
  button.dataset.candidateIndex = String(index);
  const draft = globalThis.JimaTasks?.createTaskFromCandidate(candidate, latestPageContext || {});
  const canSaveAsTask = isStrictHomeworkCandidate(candidate);
  const isSaved = draft
    ? latestSavedTasks.some((task) => globalThis.JimaTasks.isDuplicateTask(task, draft))
    : false;

  actions.appendChild(detailButton);
  if (canSaveAsTask) {
    button.textContent = isSaved ? "Saved" : "Save task";
    button.disabled = isSaved || !globalThis.JimaTasks;
    actions.appendChild(button);
  }
  item.appendChild(actions);
}

function getFileListElement(scope = "page") {
  if (scope === "detail") return assignmentDetailFiles;
  if (scope === "followup") return followupFileList;
  return filesList;
}

function getFileCandidateSource(scope = "page") {
  if (scope === "detail") return latestAssignmentDetailFiles;
  if (scope === "followup") return latestFollowupFiles;
  return latestFileCandidates;
}

function getDownloadButton(scope = "page") {
  if (scope === "detail") return downloadDetailSelectedBtn;
  if (scope === "followup") return downloadFollowupSelectedBtn;
  return downloadSelectedBtn;
}

function getDownloadButtonBaseText(scope = "page") {
  if (scope === "detail") return "Download selected detail files";
  if (scope === "followup") {
    return latestFollowupFiles.length === 1 ? "Download" : "Download selected files";
  }
  return "Download selected files";
}

function getSelectedFileCandidates(scope = "page") {
  const listEl = getFileListElement(scope);
  const source = getFileCandidateSource(scope);
  if (!listEl) return [];

  return Array.from(listEl.querySelectorAll(".file-select-input:checked"))
    .map((input) => source[Number(input.dataset.fileIndex)])
    .filter((candidate) => candidate?.url);
}

function updateDownloadButtonState(scope = "page") {
  const button = getDownloadButton(scope);
  if (!button) return;

  const selectedCount = getSelectedFileCandidates(scope).length;
  const baseText = getDownloadButtonBaseText(scope);
  button.disabled = selectedCount === 0;
  button.textContent = selectedCount > 0 && !(scope === "followup" && latestFollowupFiles.length === 1)
    ? `${baseText} (${selectedCount})`
    : baseText;
}

function createFileCandidateCard(candidate, index, scope = "page") {
  const item = document.createElement("li");
  item.className = "candidate-card file-candidate-card";

  const selectWrapper = document.createElement("label");
  selectWrapper.className = "file-select";
  selectWrapper.setAttribute("aria-label", `Select ${candidate.name || "Moodle file"} for download`);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "file-select-input";
  checkbox.dataset.fileIndex = String(index);
  checkbox.dataset.fileScope = scope;
  checkbox.disabled = !candidate.url;
  selectWrapper.appendChild(checkbox);

  const body = document.createElement("div");
  const title = document.createElement("div");
  title.className = "candidate-title";

  if (candidate.url) {
    const anchor = document.createElement("a");
    anchor.href = candidate.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = candidate.name || "Moodle file";
    title.appendChild(anchor);
  } else {
    const text = document.createElement("span");
    text.textContent = candidate.name || "Moodle file";
    title.appendChild(text);
  }

  title.appendChild(createConfidenceBadge(candidate.confidence));
  body.appendChild(title);
  appendCandidateText(body, "candidate-meta", candidate.fileType ? `File type: ${candidate.fileType}` : "");
  appendCandidateText(body, "candidate-evidence", candidate.evidence ? `Evidence: ${candidate.evidence}` : "");

  item.appendChild(selectWrapper);
  item.appendChild(body);
  return item;
}

function createReadOnlyFileCandidateCard(candidate) {
  const title = candidate.fileType
    ? `${candidate.name || "Moodle file"} (${candidate.fileType})`
    : candidate.name || "Moodle file";
  const item = createCandidateCard(title, candidate.confidence, candidate.url);
  appendCandidateText(item, "candidate-evidence", candidate.evidence ? `Evidence: ${candidate.evidence}` : "");
  appendCandidateText(item, "candidate-uncertainty", "File candidate only. Jima has not read the file contents.");
  return item;
}

function clearFollowupResults() {
  latestFollowupFiles = [];
  if (followupResults) followupResults.hidden = true;
  if (followupDownloadControls) followupDownloadControls.hidden = true;
  if (followupSummary) followupSummary.textContent = "";
  if (followupFileList) clearList(followupFileList);
  setFollowupDownloadStatus("", "");
}

function getLatestFollowupFileSource() {
  if (jimaSessionMemory.latestAssignmentFiles.length > 0) {
    return {
      source: "assignment",
      label: latestActiveAssignmentTitle
        ? `the latest inspected assignment (${latestActiveAssignmentTitle})`
        : "the latest inspected assignment",
      files: jimaSessionMemory.latestAssignmentFiles
    };
  }

  if (jimaSessionMemory.latestCourseFileCandidates.length > 0) {
    return {
      source: "course",
      label: "the latest checked course page",
      files: jimaSessionMemory.latestCourseFileCandidates
    };
  }

  return {
    source: "",
    label: "",
    files: []
  };
}

function renderFollowupFiles(fileSource, mode) {
  const files = (fileSource.files || []).filter((file) => file?.url);
  latestFollowupFiles = files;
  clearList(followupFileList);
  if (followupResults) followupResults.hidden = false;
  setFollowupDownloadStatus("", "");

  if (files.length === 0) {
    if (followupResults) followupResults.hidden = true;
    if (followupDownloadControls) followupDownloadControls.hidden = true;
    setFollowupStatus(
      "I do not have a file candidate from the latest checked page yet. Check assignment details first.",
      "error"
    );
    return;
  }

  const sourceLabel = fileSource.label || "the latest checked page";
  const contentNote = "These are file candidates, not file contents. I have not read the file contents.";
  if (mode === "download") {
    followupSummary.textContent = files.length === 1
      ? `I found one likely file from ${sourceLabel}: ${files[0].name || "Moodle file"}. Download it? ${contentNote}`
      : `I found ${files.length} file candidates from ${sourceLabel}. Select what to download. ${contentNote}`;

    for (const [index, file] of files.entries()) {
      const item = createFileCandidateCard(file, index, "followup");
      const checkbox = item.querySelector(".file-select-input");
      if (files.length === 1 && checkbox) checkbox.checked = true;
      followupFileList.appendChild(item);
    }

    if (followupDownloadControls) followupDownloadControls.hidden = false;
    updateDownloadButtonState("followup");
    setFollowupStatus("Confirm before downloading. Nothing starts until you click Download.", "active");
    return;
  }

  followupSummary.textContent = `From ${sourceLabel}, I found these file candidates. ${contentNote}`;
  for (const file of files) {
    followupFileList.appendChild(createReadOnlyFileCandidateCard(file));
  }
  if (followupDownloadControls) followupDownloadControls.hidden = true;
  setFollowupStatus("Showing latest local file candidates.", "success");
}

function getFollowupIntent(query) {
  const text = String(query || "").replace(/\s+/g, " ").trim();
  if (!text) return "empty";
  if (JIMA_FOLLOWUP_DOWNLOAD_PATTERN.test(text)) return "download_files";
  if (JIMA_FOLLOWUP_SHOW_FILES_PATTERN.test(text)) return "show_files";
  return "unsupported";
}

function handleFollowupMessage() {
  const query = followupInput?.value.trim() || "";
  const intent = getFollowupIntent(query);

  if (intent === "empty") {
    setFollowupStatus("Type a local follow-up first.", "error");
    return;
  }

  if (intent === "download_files" || intent === "show_files") {
    const fileSource = getLatestFollowupFileSource();
    renderFollowupFiles(fileSource, intent === "download_files" ? "download" : "show");
    return;
  }

  clearFollowupResults();
  setFollowupStatus(
    "I can currently help with showing or downloading files from the latest checked page. AI follow-up chat will come later.",
    "error"
  );
}

function cancelFollowupDownload() {
  if (followupDownloadControls) followupDownloadControls.hidden = true;
  for (const checkbox of Array.from(followupFileList?.querySelectorAll(".file-select-input") || [])) {
    checkbox.checked = false;
  }
  updateDownloadButtonState("followup");
  setFollowupDownloadStatus("", "");
  setFollowupStatus("Download canceled. No files were downloaded.", "success");
}

function showAiConfirmationInChat(question = "") {
  if (!latestPageContext) {
    addChatMessage("assistant", "Run a local Moodle analysis first. After that, I can ask AI only if you confirm sending the extracted context to your local backend.");
    return;
  }

  if (pendingAiConfirmation) {
    addChatMessage("assistant", "AI confirmation is already waiting above. Click Continue with AI only if you want to send the extracted context to your local backend.");
    return;
  }

  pendingAiConfirmation = true;
  const exactQuestion = String(question || aiQuestionInput?.value || "").trim();
  addChatMessage(
    "assistant",
    exactQuestion
      ? `I can answer this with AI using the latest extracted Moodle context.\n\nQuestion: "${exactQuestion}"\n\nAI analysis will send the latest extracted Moodle context, recent chat context, and local evidence to your local Jima backend. File contents are not included unless you separately attach a file and click Analyze file. Continue?`
      : "AI analysis will send the latest extracted Moodle context, recent chat context, and local evidence to your local Jima backend. File contents are not included unless you separately attach a file and click Analyze file. No API key is stored in the extension. Continue?",
    [
      { label: "Continue with AI", dataset: { chatAction: "confirmAi" } },
      { label: "Cancel", dataset: { chatAction: "cancel" } }
    ],
    "confirmation"
  );
}

function showFilesFromChat(query, mode = "show") {
  const latestSource = getLatestFileCandidatesForChat();
  const availableFiles = (latestSource.files || []).filter((file) => file?.url);
  const files = filterFilesForQuery(availableFiles, query, { fallbackToAll: false });

  if (availableFiles.length === 0) {
    clearFollowupResults();
    addChatMessage("assistant", "I do not have file candidates from the latest checked page yet. Analyze a Moodle page or check assignment details first.");
    return;
  }

  if (files.length === 0) {
    renderFollowupFiles({ ...latestSource, files: availableFiles }, "show");
    addChatMessage(
      "assistant",
      `I found files from ${latestSource.label}, but I could not confidently match your requested file. Choose one from the files list. I have not read file contents.`,
      [{ label: "Show all files", dataset: { chatAction: "showAllFiles" } }]
    );
    return;
  }

  const fileSource = {
    ...latestSource,
    files
  };

  rememberFileReference(files, mode, fileSource.label);
  renderFollowupFiles(fileSource, mode);
  if (mode === "download") {
    const requestedLabel = getRequestedFileLabel(query);
    addChatMessage(
      "assistant",
      files.length === 1
        ? `I found ${requestedLabel ? `${requestedLabel}: ` : ""}"${getFileDisplayName(files[0])}". I can download it after you confirm. I have not read the file contents.`
        : `I found ${files.length} matching file candidates. Select what to download. I have not read the file contents.`,
      [
        files.length === 1 ? { label: "Confirm download", dataset: { chatAction: "downloadSingle", fileIndex: 0 } } : null,
        { label: "Cancel", dataset: { chatAction: "cancel" } }
      ]
    );
    return;
  }

  addChatMessage(
    "assistant",
    files.length === 1
      ? `I found "${getFileDisplayName(files[0])}" from ${fileSource.label}. I have not read the file contents. I can open it or download it after confirmation.`
      : `I found ${describeFileMix(files)} from ${fileSource.label}. I have not read the file contents. Choose one to open or download.`,
    [
      files.length === 1
        ? { label: "Open file", dataset: { chatAction: "openFile", fileIndex: 0 } }
        : null,
      files.length === 1
        ? { label: "Download file", dataset: { chatAction: "downloadFiles", query } }
        : { label: "Prepare download", dataset: { chatAction: "downloadFiles", query } },
      { label: "Attach file for analysis", dataset: { chatAction: "showFileAnalysis", question: query } }
    ]
  );
}

function showFileReadLimitation(query) {
  const latestSource = getLatestFileCandidatesForChat();
  const fallbackFiles = latestFollowupFiles.length > 0 ? latestFollowupFiles : [];
  const sourceFiles = (latestSource.files || []).filter((file) => file?.url);
  const hints = getFileSearchHints(query);
  const memoryFile = hints.isPronounReference && jimaSessionMemory.lastReferencedFile?.url
    ? [jimaSessionMemory.lastReferencedFile]
    : [];
  const availableFiles = memoryFile.length > 0 ? memoryFile : fallbackFiles.length > 0 ? fallbackFiles : sourceFiles;

  if (availableFiles.length === 0) {
    if (chatMode === "ai" && latestPageContext) {
      if (aiQuestionInput) aiQuestionInput.value = query;
      addChatMessage(
        "assistant",
        "I do not have a matching file candidate or selected local file. I can ask AI using the latest extracted Moodle context and your exact question, but file contents will not be included."
      );
      runJimaTool("confirmAi", { question: query });
      return;
    }

    openFileAnalysisPanel(query);
    addChatMessage(
      "assistant",
      "I am not sure which Moodle file you mean yet. If you already downloaded a file, attach it here and click Analyze file. I will only read the local file after that explicit action."
    );
    return;
  }

  const matches = filterFilesForQuery(availableFiles, query, { fallbackToAll: false });
  const files = matches.length > 0 ? matches : memoryFile.length > 0 ? memoryFile : [];
  if (files.length === 0) {
    renderFollowupFiles({ ...latestSource, files: availableFiles }, "show");
    addChatMessage(
      "assistant",
      "I found files, but I could not confidently match the one you asked about. I have not read file contents. Choose one from the files list, or analyze the page again if the file is missing.",
      [{ label: "Attach file for analysis", dataset: { chatAction: "showFileAnalysis", question: query } }]
    );
    return;
  }

  const fileSource = {
    ...latestSource,
    label: memoryFile.length > 0 ? "the last referenced file" : fallbackFiles.length > 0 ? "the latest file result" : latestSource.label,
    files
  };
  rememberFileReference(files, "read", fileSource.label);
  renderFollowupFiles(fileSource, "show");

  if (files.length === 1) {
    const file = files[0];
    addChatMessage(
      "assistant",
      `I found "${getFileDisplayName(file)}". ${getTitleOnlyHint(file)} I have not read its contents yet. I can download/open it, or you can analyze the downloaded file.`,
      [
        { label: "Download file", dataset: { chatAction: "downloadFiles", query } },
        { label: "Open file", dataset: { chatAction: "openFile", fileIndex: 0 } },
        { label: "Attach file for analysis", dataset: { chatAction: "showFileAnalysis", question: query } }
      ]
    );
    return;
  }

  addChatMessage(
    "assistant",
    `I found ${files.length} matching file/resource candidates, but I have not read their contents. Choose one to open/download, or choose the downloaded local file for explicit file analysis.`,
    [
      { label: "Prepare download", dataset: { chatAction: "downloadFiles", query } },
      { label: "Attach file for analysis", dataset: { chatAction: "showFileAnalysis", question: query } }
    ]
  );
}

function openFileAnalysisPanel(question = "") {
  if (fileAnalysisDetails) {
    fileAnalysisDetails.hidden = false;
    if ("open" in fileAnalysisDetails) fileAnalysisDetails.open = true;
    fileAnalysisDetails.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  if (fileAnalysisQuestion && !fileAnalysisQuestion.value.trim()) {
    fileAnalysisQuestion.value = question || "Summarize this file.";
  }

  updateFileAnalysisButtonState();
  setFileAnalysisStatus(
    "Choose or drop the downloaded local file first. Nothing is uploaded until you click Analyze file.",
    "active"
  );

  window.setTimeout(() => {
    fileAnalysisDropzone?.focus();
  }, 80);
}

function getSelectedAnalysisFile() {
  return selectedAnalysisFile || fileAnalysisInput?.files?.[0] || null;
}

function formatFileSize(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "size unknown";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function renderSelectedAnalysisFile(file) {
  if (!fileAnalysisSelected) return;
  if (!file) {
    fileAnalysisSelected.hidden = true;
    fileAnalysisSelected.textContent = "";
    return;
  }

  fileAnalysisSelected.hidden = false;
  fileAnalysisSelected.textContent = `${file.name} - ${formatFileSize(file.size)}`;
}

function setSelectedAnalysisFile(file, announce = false) {
  selectedAnalysisFile = file || null;
  renderSelectedAnalysisFile(selectedAnalysisFile);
  updateFileAnalysisButtonState();

  if (!file) {
    setFileAnalysisStatus("Choose a TXT, MD, PDF, DOCX, or DOC file.", "");
    return;
  }

  const validationError = validateSelectedAnalysisFile(file);
  setFileAnalysisStatus(
    validationError || `File selected: ${file.name}. Click Analyze file and I will summarize it using the local backend.`,
    validationError ? "error" : "success"
  );

  if (!validationError && announce) {
    addChatMessage(
      "assistant",
      `File selected: ${file.name}. Click Analyze file and I will summarize it using the local backend.`
    );
  }
}

function closeFileAnalysisPanel() {
  selectedAnalysisFile = null;
  if (fileAnalysisInput) fileAnalysisInput.value = "";
  if (fileAnalysisQuestion) fileAnalysisQuestion.value = "";
  renderSelectedAnalysisFile(null);
  setFileAnalysisStatus("", "");
  updateFileAnalysisButtonState();
  if (fileAnalysisDetails) {
    fileAnalysisDetails.hidden = true;
    if ("open" in fileAnalysisDetails) fileAnalysisDetails.open = false;
  }
}

function getFileExtension(fileName = "") {
  const match = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

function validateSelectedAnalysisFile(file) {
  if (!file) {
    return "Choose the downloaded file first, then I can analyze its contents.";
  }

  const extension = getFileExtension(file.name);
  if (!JIMA_FILE_ANALYSIS_TYPES.has(extension)) {
    return "This file type is not supported yet. Try TXT, MD, PDF, DOCX, or DOC.";
  }

  if (file.size > JIMA_FILE_ANALYSIS_MAX_BYTES) {
    return "This file is too large. Jima supports selected files up to 10MB.";
  }

  return "";
}

function formatJimaBackendError(message, fallback = "Jima could not complete that request.") {
  const text = String(message || "").trim();
  const normalized = text.toLowerCase();

  if (!text || /failed to fetch|offline|unreachable|networkerror|load failed|could not connect/.test(normalized)) {
    return "The local Jima backend is not running. Start it with cd backend && npm start.";
  }

  if (/openai_api_key|api key|not configured|not set/.test(normalized)) {
    return "The backend is running, but OPENAI_API_KEY is not configured.";
  }

  if (/quota|billing|insufficient_quota|rate limit|429/.test(normalized)) {
    return "OpenAI returned a quota or billing error. Check the backend OpenAI account, then try again.";
  }

  if (/invalid response|malformed|structured|json/.test(normalized)) {
    return "The local Jima backend returned an invalid response. Restart it and try again.";
  }

  if (/unsupported file/.test(normalized)) {
    return "This file type is not supported yet. Try TXT, MD, PDF, DOCX, or DOC.";
  }

  if (/too large|10mb/.test(normalized)) {
    return "This file is too large. Jima supports selected files up to 10MB.";
  }

  if (/extract enough readable text|empty extraction|no readable/.test(normalized)) {
    return "I could not extract enough readable text from this file. It may be scanned or image-based.";
  }

  return text || fallback;
}

function updateFileAnalysisButtonState() {
  if (!analyzeSelectedFileBtn) return;
  const error = validateSelectedAnalysisFile(getSelectedAnalysisFile());
  analyzeSelectedFileBtn.disabled = Boolean(error);
}

function formatFileAnalysisList(title, items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return `${title}\n${items.map((item) => `- ${typeof item === "string" ? item : item.title || item.evidence || ""}`).join("\n")}`;
}

function renderFileAnalysisInChat(analysis = {}, extraction = {}) {
  const source = analysis.source || {};
  jimaSessionMemory.lastFileAnalysisSummary = {
    fileName: source.fileName || extraction.fileName || "",
    fileType: source.fileType || extraction.fileType || "",
    extractedCharacters: source.extractedCharacters || extraction.extractedCharacters || 0,
    summary: analysis.summary || "",
    keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints.slice(0, 5) : [],
    uncertainties: Array.isArray(analysis.uncertainties) ? analysis.uncertainties.slice(0, 5) : []
  };

  const homework = Array.isArray(analysis.possibleHomework)
    ? analysis.possibleHomework.map((item) => `${item.title}${item.evidence ? ` - Evidence: ${item.evidence}` : ""}${item.uncertainty ? ` (${item.uncertainty})` : ""}`)
    : [];
  const sections = [
    "This answer is based on extracted file text.",
    analysis.summary || "Jima returned no file summary.",
    formatFileAnalysisList("Key points", analysis.keyPoints),
    formatFileAnalysisList("Possible homework", homework),
    formatFileAnalysisList("Action items", analysis.actionItems),
    formatFileAnalysisList("Uncertainties", analysis.uncertainties),
    `Source: ${source.fileName || extraction.fileName || "selected file"} (${source.fileType || extraction.fileType || "file"}), ${source.extractedCharacters || extraction.extractedCharacters || 0} extracted characters.`
  ].filter(Boolean);

  addChatMessage("assistant", sections.join("\n\n"), [], "result");
}

async function analyzeSelectedLocalFile() {
  const file = getSelectedAnalysisFile();
  const validationError = validateSelectedAnalysisFile(file);
  if (validationError) {
    openFileAnalysisPanel();
    setFileAnalysisStatus(validationError, "error");
    addChatMessage("assistant", validationError, [], "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "userQuestion",
    fileAnalysisQuestion?.value.trim() || "Summarize this academic file and identify key points, possible homework, and action items."
  );

  setFileAnalysisLoading(true);
  setFileAnalysisStatus(`Analyzing ${file.name} through the local backend...`, "active");
  addChatMessage("assistant", `Analyzing ${file.name} through the local backend...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JIMA_FILE_ANALYSIS_TIMEOUT_MS);

  try {
    const response = await fetch(JIMA_FILE_ANALYSIS_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);

    if (!body || typeof body !== "object") {
      const errorMessage = formatJimaBackendError("invalid response");
      setFileAnalysisStatus(errorMessage, "error");
      addChatMessage("assistant", errorMessage, [], "error");
      return;
    }

    if (!response.ok || body?.ok === false) {
      const errorMessage = formatJimaBackendError(body?.error, "Jima could not analyze this selected file.");
      setFileAnalysisStatus(errorMessage, "error");
      addChatMessage("assistant", errorMessage, [], "error");
      return;
    }

    if (!body.analysis) {
      const errorMessage = formatJimaBackendError("malformed backend response");
      setFileAnalysisStatus(errorMessage, "error");
      addChatMessage("assistant", errorMessage, [], "error");
      return;
    }

    setFileAnalysisStatus("File analysis returned from your local backend.", "success");
    renderFileAnalysisInChat(body.analysis || {}, body.extraction || {});
  } catch (error) {
    const errorMessage = error?.name === "AbortError"
      ? "Jima file analysis timed out. Try a smaller file or restart the local backend."
      : formatJimaBackendError(error?.message);
    setFileAnalysisStatus(errorMessage, "error");
    addChatMessage("assistant", errorMessage, [], "error");
  } finally {
    clearTimeout(timeoutId);
    setFileAnalysisLoading(false);
  }
}

async function handleCourseQueryFromChat(query) {
  addChatMessage("assistant", "I am searching saved courses and default course data locally.");

  try {
    const result = await resolveCourseMatches(query);
    const matches = result.matches || [];
    latestCourseMatches = matches;
    renderCourseMatches(matches, query);

    if (matches.length === 0) {
      addChatMessage("assistant", `I could not find a saved course/page matching "${query}". Try saving the course first or search with a different name.`);
      return;
    }

    addChatMessage(
      "assistant",
      matches.length === 1
        ? `I found this saved course/page: ${matches[0].name}. I will only open and check it after you confirm.`
        : `I found ${matches.length} possible saved course/page matches. Choose one to check.`,
      matches.map((match, index) => ({
        label: match.isMoodle ? `Check ${match.name}` : `${match.name} is not Moodle`,
        dataset: { chatAction: "checkCourse", matchIndex: index }
      }))
    );
  } catch {
    addChatMessage("assistant", "I could not search saved courses right now.");
  }
}

function handleAssignmentDetailFollowup() {
  const candidates = getInspectableHomeworkCandidates();

  if (candidates.length === 0) {
    const hasAnyHomework = (latestHomeworkCandidates || []).length > 0;
    addChatMessage(
      "assistant",
      hasAnyHomework
        ? "I found homework-like evidence, but I do not have an assignment or quiz detail link to inspect for a deadline."
        : "I do not have a recent homework candidate yet. Ask me to check the course page first."
    );
    return;
  }

  if (candidates.length === 1) {
    inspectAssignmentCandidate(candidates[0]);
    return;
  }

  addChatMessage(
    "assistant",
    "I found multiple assignment/quiz candidates. Choose which one I should open and check for deadline evidence.",
    candidates.slice(0, 6).map((candidate) => ({
      label: candidate.title || "Assignment",
      dataset: { chatAction: "inspectAssignment", candidateUrl: candidate.url }
    }))
  );
}

function getChatIntent(query) {
  const text = String(query || "").trim();
  if (globalThis.JimaChatV2?.classifyIntent) {
    return globalThis.JimaChatV2.classifyIntent({ query: text, mode: chatMode });
  }

  if (!text) return "empty";
  if (JIMA_FOLLOWUP_DOWNLOAD_PATTERN.test(text)) return "download_files";
  if (JIMA_OPEN_FILE_PATTERN.test(text) || JIMA_FOLLOWUP_SHOW_FILES_PATTERN.test(text)) return "show_files";
  if (JIMA_FILE_REFERENCE_PATTERN.test(text)) return "file_reference";
  if (JIMA_ASSIGNMENT_DETAIL_FOLLOWUP_PATTERN.test(text)) return "assignment_detail";
  if (JIMA_CHAT_ANALYZE_PATTERN.test(text)) return "analyze_page";
  if (JIMA_CHAT_HOMEWORK_PATTERN.test(text) && /\b(this|current)\b.*\b(course|page)\b/i.test(text)) return "analyze_page";
  if (JIMA_CHAT_HOMEWORK_PATTERN.test(text)) return "homework_or_course";
  if (JIMA_CHAT_AI_PATTERN.test(text)) return "ai";
  return "unsupported";
}

async function routeChatQuery(query, mirrorUser = true) {
  const trimmed = String(query || "").trim();
  if (mirrorUser && trimmed) addChatMessage("user", trimmed);

  const intent = getChatIntent(trimmed);
  if (intent === "empty") {
    addChatMessage("assistant", "Ask me about the current Moodle page, a saved course, or files I found.");
    return;
  }

  const genericFileAnalysisRequest = /\b(analy[sz]e|read|summari[sz]e|explain)\b\s+(?:a\s+|the\s+|selected\s+|local\s+)?file\b|\bfile analysis\b|\u05e0\u05ea\u05d7\u05d9?\s+\u05e7\u05d5\u05d1\u05e5|\u05ea\u05e7\u05e8\u05d0\u05d9?\s+\u05e7\u05d5\u05d1\u05e5|\u05ea\u05e1\u05db\u05de\u05d9?\s+\u05e7\u05d5\u05d1\u05e5/i.test(trimmed);
  if (genericFileAnalysisRequest && !JIMA_FILE_REFERENCE_PATTERN.test(trimmed)) {
    const file = getSelectedAnalysisFile();
    const validationError = validateSelectedAnalysisFile(file);
    if (file && !validationError) {
      if (fileAnalysisQuestion) fileAnalysisQuestion.value = trimmed;
      await runJimaTool("analyzeSelectedFile");
      return;
    }

    openFileAnalysisPanel(trimmed);
    addChatMessage("assistant", "Attach a TXT, MD, PDF, DOCX, or DOC file here, then click Analyze file. I will only upload the file after that explicit click.");
    return;
  }

  if (intent === "ai") {
    if (aiQuestionInput) aiQuestionInput.value = trimmed || DEFAULT_AI_QUESTION;
    await runJimaTool("confirmAi", { question: trimmed });
    return;
  }

  if (intent === "assignment_detail") {
    await runJimaTool("inspectLatestAssignment", { query: trimmed });
    return;
  }

  if (intent === "download_files") {
    await runJimaTool("prepareDownload", { query: trimmed });
    return;
  }

  if (intent === "read_file") {
    const file = getSelectedAnalysisFile();
    const validationError = validateSelectedAnalysisFile(file);
    if (file && !validationError) {
      if (fileAnalysisQuestion) fileAnalysisQuestion.value = trimmed;
      await runJimaTool("analyzeSelectedFile");
      return;
    }

    await runJimaTool("explainFileBoundary", { query: trimmed });
    return;
  }

  if (intent === "show_files") {
    await runJimaTool("listLatestFiles", { query: trimmed });
    return;
  }

  if (intent === "file_reference") {
    await runJimaTool("listLatestFiles", { query: trimmed });
    return;
  }

  if (intent === "analyze_page") {
    addChatMessage("assistant", "I will check the visible Moodle page locally. Nothing is sent to AI or the backend.");
    await runJimaTool("analyzeCurrentPageLocal");
    return;
  }

  if (intent === "homework_or_course") {
    await runJimaTool("findSavedCourse", { query: trimmed });
    return;
  }

  if (chatMode === "ai") {
    if (aiQuestionInput) aiQuestionInput.value = trimmed;
    await runJimaTool("confirmAi", { question: trimmed });
    return;
  }

  addChatMessage(
    "assistant",
    "I can help with page scans, homework, files, downloads, deadlines, saved courses, or selected-file analysis. Switch to AI mode or choose Ask with AI if you want a broader answer."
  );
}

function handleChatSubmit() {
  const query = chatInput?.value.trim() || "";
  if (chatInput) chatInput.value = "";
  routeChatQuery(query).catch(() => {
    addChatMessage("assistant", "I could not handle that request locally.");
  });
}

function renderHeadings(headings) {
  clearList(headingsList);
  headingsCount.textContent = `(${headings.length})`;

  if (headings.length === 0) {
    appendEmptyRow(headingsList, "No visible headings found.");
    return;
  }

  for (const heading of headings.slice(0, 12)) {
    const item = document.createElement("li");
    item.textContent = `${heading.level.toUpperCase()}: ${heading.text}`;
    headingsList.appendChild(item);
  }
}

function renderFileLinks(fileLinks) {
  clearList(fileLinksList);
  fileLinksCount.textContent = `(${fileLinks.length})`;

  if (fileLinks.length === 0) {
    appendEmptyRow(fileLinksList, "No likely file links found in the visible page links.");
    return;
  }

  for (const link of fileLinks.slice(0, 10)) {
    appendLinkRow(fileLinksList, link);
  }
}

function renderHomeworkCandidates(candidates) {
  clearList(homeworkList);
  const strictCandidates = getStrictHomeworkCandidates(candidates);
  latestHomeworkCandidates = strictCandidates;
  homeworkCount.textContent = `(${strictCandidates.length})`;

  if (strictCandidates.length === 0) {
    appendEmptyRow(homeworkList, "I did not find clear homework/task evidence in the visible page text.");
    if ((candidates || []).length > 0) {
      appendEmptyRow(homeworkList, "Resource-like items were left out because they do not show homework or submission evidence.");
    }
    return;
  }

  for (const [index, candidate] of strictCandidates.entries()) {
    const item = createCandidateCard(candidate.title || "Possible homework", candidate.confidence, candidate.url);
    appendCandidateText(item, "candidate-meta", candidate.type ? `Type: ${candidate.type}` : "");
    appendCandidateText(item, "candidate-evidence", candidate.evidence ? `Evidence: ${candidate.evidence}` : "");
    appendCandidateText(item, "candidate-uncertainty", candidate.uncertainty);
    appendTaskAction(item, candidate, index);
    homeworkList.appendChild(item);
  }
}

function renderDeadlineCandidates(candidates) {
  clearList(datesList);
  datesCount.textContent = `(${candidates.length})`;

  if (candidates.length === 0) {
    appendEmptyRow(datesList, "I found no clear date candidates in the visible page text.");
    return;
  }

  for (const candidate of candidates) {
    const item = createCandidateCard(candidate.rawDate || "Possible date", candidate.confidence, "");
    appendCandidateText(item, "candidate-evidence", candidate.surroundingText ? `Context: ${candidate.surroundingText}` : "");
    appendCandidateText(item, "candidate-uncertainty", candidate.uncertainty);
    datesList.appendChild(item);
  }
}

function renderFileCandidates(candidates) {
  clearList(filesList);
  latestFileCandidates = candidates.filter((candidate) => candidate?.url);
  filesCount.textContent = `(${candidates.length})`;
  downloadControls.hidden = candidates.length === 0;
  setDownloadStatus("", "");
  updateDownloadButtonState("page");

  if (candidates.length === 0) {
    appendEmptyRow(filesList, "No Moodle file links were detected on this page.");
    latestFileCandidates = [];
    downloadControls.hidden = true;
    return;
  }

  for (const [index, candidate] of latestFileCandidates.entries()) {
    filesList.appendChild(createFileCandidateCard(candidate, index, "page"));
  }

  if (latestFileCandidates.length === 0) {
    appendEmptyRow(filesList, "File-like items were found, but none had downloadable Moodle URLs.");
    downloadControls.hidden = true;
    return;
  }

  updateDownloadButtonState("page");
}

function clearAssignmentDetail() {
  latestAssignmentDetailFiles = [];
  latestAssignmentDetail = null;
  latestAssignmentCandidate = null;
  latestActiveAssignmentTitle = "";
  jimaSessionMemory.latestInspectedAssignmentDetail = null;
  jimaSessionMemory.latestAssignmentFiles = [];
  jimaSessionMemory.latestActiveAssignmentTitle = "";
  if (assignmentDetailPanel) assignmentDetailPanel.hidden = true;
  if (assignmentDetailContent) assignmentDetailContent.hidden = true;
  setAssignmentDetailStatus("", "");
  setAssignmentDetailDownloadStatus("", "");
  setSaveDetailTaskStatus("", "");
  if (assignmentDetailDates) clearList(assignmentDetailDates);
  if (assignmentDetailFiles) clearList(assignmentDetailFiles);
}

function renderAssignmentDetailDates(dates, structuredDates = {}, diagnostics = {}) {
  clearList(assignmentDetailDates);
  const structuredEntries = Object.values(structuredDates || {}).filter(Boolean);

  if (!dates.length && structuredEntries.length === 0) {
    appendEmptyRow(assignmentDetailDates, "No clear due date evidence was visible on this detail page.");
    const previewLines = diagnostics.detailLinesPreview || [];
    if (previewLines.length > 0) {
      appendEmptyRow(
        assignmentDetailDates,
        `No date labels matched. First extracted detail lines: ${previewLines.slice(0, 5).join(" | ")}`
      );
    }
    return;
  }

  for (const date of structuredEntries) {
    const item = createCandidateCard(date.label || "Date field", date.confidence || "High", "");
    appendCandidateText(item, "candidate-evidence", date.evidence ? `Evidence: ${date.evidence}` : "");
    assignmentDetailDates.appendChild(item);
  }

  for (const date of dates.slice(0, 8)) {
    if (structuredEntries.some((entry) => entry.evidence === date.surroundingText || entry.rawValue === date.rawDate)) continue;
    const item = createCandidateCard(date.rawDate || "Date clue", date.confidence, "");
    appendCandidateText(item, "candidate-evidence", date.surroundingText ? `Context: ${date.surroundingText}` : "");
    appendCandidateText(item, "candidate-uncertainty", date.uncertainty);
    assignmentDetailDates.appendChild(item);
  }
}

function renderAssignmentDetailFiles(files) {
  clearList(assignmentDetailFiles);
  latestAssignmentDetailFiles = (files || []).filter((candidate) => candidate?.url);
  assignmentDetailDownloadControls.hidden = latestAssignmentDetailFiles.length === 0;
  setAssignmentDetailDownloadStatus("", "");

  if (!files.length) {
    appendEmptyRow(assignmentDetailFiles, "No file/resource links were detected on this detail page.");
    updateDownloadButtonState("detail");
    return;
  }

  if (latestAssignmentDetailFiles.length === 0) {
    appendEmptyRow(assignmentDetailFiles, "File-like items were found, but none had downloadable Moodle URLs.");
    assignmentDetailDownloadControls.hidden = true;
    updateDownloadButtonState("detail");
    return;
  }

  for (const [index, file] of latestAssignmentDetailFiles.entries()) {
    assignmentDetailFiles.appendChild(createFileCandidateCard(file, index, "detail"));
  }

  updateDownloadButtonState("detail");
}

function renderAssignmentDetailStatus(status) {
  const statusValue = status?.label || "Unknown";
  const confidence = status?.confidence || "Low";
  const parts = [`Status: ${statusValue}`, `Confidence: ${confidence}`];
  if (status?.evidence) parts.push(`Evidence: ${status.evidence}`);
  if (status?.uncertainty) parts.push(`Uncertainty: ${status.uncertainty}`);
  assignmentDetailSubmissionStatus.textContent = parts.join(" | ");
}

function renderAssignmentDetail(detail) {
  if (!assignmentDetailPanel || !assignmentDetailContent) return;

  latestAssignmentDetail = detail;
  latestAssignmentCandidate = latestAssignmentCandidate || {};
  latestActiveAssignmentTitle = detail.title || latestActiveAssignmentTitle || "";
  jimaSessionMemory.latestInspectedAssignmentDetail = detail;
  jimaSessionMemory.latestAssignmentFiles = (detail.files || []).filter((file) => file?.url);
  jimaSessionMemory.latestActiveAssignmentTitle = latestActiveAssignmentTitle;

  assignmentDetailPanel.hidden = false;
  assignmentDetailContent.hidden = false;
  assignmentDetailTitle.textContent = detail.title || "Assignment detail page";
  assignmentDetailUrl.href = detail.url || "#";
  assignmentDetailUrl.textContent = detail.url || "No URL available";
  assignmentDetailInstructions.textContent = detail.instructionsPreview || detail.textPreview || "No instruction preview was visible.";

  renderAssignmentDetailStatus(detail.status || {});
  renderAssignmentDetailDates(detail.dueDates || [], detail.dates || {}, detail.dateDiagnostics || {});
  renderAssignmentDetailFiles(detail.files || []);
  setSaveDetailTaskStatus("", "");
  renderAssignmentDetailLocalAnswer(detail);

  const statusValue = detail.status?.value;
  const statusNote = statusValue === "not_submitted"
    ? "I found visible evidence that this may be not submitted. Confirm in Moodle before acting."
    : statusValue === "submitted"
      ? "I found visible evidence that this may be submitted."
      : "I cannot confirm submission status from the visible text.";

  setAssignmentDetailStatus(`${statusNote} Detail-page inspection stayed local.`, "success");
  if (evidenceDetails) evidenceDetails.hidden = false;
  addChatMessage("assistant", buildAssignmentDetailChatAnswer(detail));
}

function renderDetections(detections = {}) {
  renderHomeworkCandidates(detections.homeworkCandidates || []);
  renderDeadlineCandidates(detections.deadlineCandidates || []);
  renderFileCandidates(detections.fileCandidates || []);
}

function renderContext(pageContext, detections) {
  const headings = pageContext.headings || [];
  const fileLinks = pageContext.fileLinks || [];
  const links = pageContext.links || [];

  latestPageContext = pageContext;
  latestDetections = detections || {};

  previewTitle.textContent = pageContext.pageTitle || pageContext.documentTitle || "Untitled Moodle page";
  previewUrl.href = pageContext.currentUrl || "#";
  previewUrl.textContent = pageContext.currentUrl || "No URL available";
  previewMeta.textContent = `${links.length} links`;
  textPreview.textContent = pageContext.visibleTextPreview || "No visible text preview was returned.";

  renderDetections(latestDetections);
  renderHeadings(headings);
  renderFileLinks(fileLinks);
  clearAssignmentDetail();
  clearFollowupResults();
  jimaSessionMemory.latestAnalyzedCoursePageContext = pageContext;
  jimaSessionMemory.latestHomeworkCandidates = latestHomeworkCandidates;
  jimaSessionMemory.latestCourseFileCandidates = latestFileCandidates;
  const answer = renderCourseLocalAnswer(pageContext, latestDetections, latestCheckedCourseName);

  if (evidenceDetails) evidenceDetails.hidden = false;
  previewPanel.hidden = false;
  aiPanel.hidden = false;
  aiResults.hidden = true;
  setAiStatus("", "");
  setStatus("This detection is rule-based and stays local. Use the AI button only if you want to send this extracted context to your local backend.", "success");
  addChatMessage("assistant", answer.summary);

  if (chatMode === "ai" && !pendingAiConfirmation) {
    pendingAiConfirmation = true;
    addChatMessage(
      "assistant",
      "Local scan is ready. Do you want to send this extracted context to AI?",
      [
        { label: "Continue with AI", dataset: { chatAction: "confirmAi" } },
        { label: "Cancel", dataset: { chatAction: "cancel" } }
      ],
      "confirmation"
    );
  }

  if (latestFileCandidates.length > 0) {
    addChatMessage(
      "assistant",
      `I found ${describeFileMix(latestFileCandidates)}. Tell me which one you want, or ask me to download one. I have not read the file contents.`
    );
  }
}

function renderAiAssignments(assignments) {
  clearList(aiAssignments);
  if (!assignments.length) {
    appendEmptyRow(aiAssignments, "Jima did not find clear assignments in the provided context.");
    return;
  }

  for (const assignment of assignments) {
    const title = assignment.dueDate ? `${assignment.title} - due ${assignment.dueDate}` : assignment.title;
    const item = createCandidateCard(title || "Assignment", assignment.confidence, "");
    appendCandidateText(item, "candidate-evidence", assignment.evidence ? `Evidence: ${assignment.evidence}` : "");
    appendCandidateText(item, "candidate-uncertainty", assignment.uncertainty);
    aiAssignments.appendChild(item);
  }
}

function renderAiDates(dates) {
  clearList(aiDates);
  if (!dates.length) {
    appendEmptyRow(aiDates, "No clear dates or deadlines were returned.");
    return;
  }

  for (const date of dates) {
    const item = createCandidateCard(date.rawDate || "Date clue", date.confidence, "");
    appendCandidateText(item, "candidate-meta", date.meaning ? `Meaning: ${date.meaning}` : "");
    appendCandidateText(item, "candidate-evidence", date.evidence ? `Evidence: ${date.evidence}` : "");
    appendCandidateText(item, "candidate-uncertainty", date.uncertainty);
    aiDates.appendChild(item);
  }
}

function renderAiFiles(files) {
  clearList(aiFiles);
  if (!files.length) {
    appendEmptyRow(aiFiles, "No files were returned from the provided context.");
    return;
  }

  for (const file of files) {
    const title = file.fileType ? `${file.name} (${file.fileType})` : file.name;
    const item = createCandidateCard(title || "Visible file", file.confidence, "");
    appendCandidateText(item, "candidate-evidence", file.evidence ? `Evidence: ${file.evidence}` : "");
    aiFiles.appendChild(item);
  }
}

function renderPlainList(listEl, items, emptyText) {
  clearList(listEl);
  if (!items.length) {
    appendEmptyRow(listEl, emptyText);
    return;
  }

  for (const item of items) {
    appendPlainRow(listEl, item);
  }
}

function renderAiAnalysis(analysis) {
  latestAiAnalysis = analysis;
  jimaSessionMemory.latestAiResponse = analysis;
  aiSummary.textContent = analysis.summary || "Jima returned no summary.";
  renderAiAssignments(analysis.assignments || []);
  renderAiDates(analysis.dates || []);
  renderAiFiles(analysis.files || []);
  renderPlainList(aiNextActions, analysis.nextActions || [], "No next actions were returned.");
  renderPlainList(aiUncertainties, analysis.uncertainties || [], "No extra uncertainties were returned.");
  aiResults.hidden = false;
}

function formatJimaTaskDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function appendSavedTaskDetail(item, label, value) {
  if (!value) return;
  const detail = document.createElement("div");
  detail.className = "saved-task-detail";
  detail.textContent = `${label}: ${value}`;
  item.appendChild(detail);
}

function createSavedTaskCard(task) {
  const item = document.createElement("li");
  item.className = `saved-task-card${task.status === "done" ? " is-done" : ""}`;

  const titleRow = document.createElement("div");
  titleRow.className = "saved-task-title-row";

  const title = document.createElement("strong");
  title.textContent = task.title || "Saved possible task";
  titleRow.appendChild(title);

  const status = document.createElement("span");
  status.className = `task-status ${task.status === "done" ? "done" : "open"}`;
  status.textContent = task.status === "done" ? "Done" : "Open";
  titleRow.appendChild(status);
  item.appendChild(titleRow);

  const meta = document.createElement("div");
  meta.className = "saved-task-meta";
  const parts = [
    task.courseOrPage,
    task.dueDateRaw ? `Date clue: ${task.dueDateRaw}` : "",
    task.confidence ? `Confidence: ${task.confidence}` : ""
  ].filter(Boolean);
  meta.textContent = parts.join(" | ");
  item.appendChild(meta);

  if (task.evidence) {
    const evidence = document.createElement("div");
    evidence.className = "candidate-evidence";
    evidence.textContent = `Evidence: ${task.evidence}`;
    item.appendChild(evidence);
  }

  appendSavedTaskDetail(
    item,
    "Visible submission evidence",
    task.submissionStatusLabel
      ? `${task.submissionStatusLabel}${task.submissionConfidence ? ` (${task.submissionConfidence})` : ""}`
      : ""
  );
  appendSavedTaskDetail(item, "Submission evidence", task.submissionEvidence);
  appendSavedTaskDetail(item, "Instruction preview", task.instructionPreview);
  appendSavedTaskDetail(
    item,
    "Detail page date clue",
    task.detailDueDateRaw
      ? `${task.detailDueDateRaw}${task.detailDueDateEvidence ? ` - ${task.detailDueDateEvidence}` : ""}`
      : task.detailDueDateEvidence
  );
  appendSavedTaskDetail(item, "Last inspected", formatJimaTaskDateTime(task.lastInspectedAt));

  if (Array.isArray(task.detailFiles) && task.detailFiles.length > 0) {
    const files = document.createElement("div");
    files.className = "saved-task-detail";
    const visibleFiles = task.detailFiles
      .slice(0, 3)
      .map((file) => file.fileType ? `${file.name} (${file.fileType})` : file.name)
      .join(", ");
    files.textContent = `Files listed on detail page: ${task.detailFiles.length} metadata item${task.detailFiles.length === 1 ? "" : "s"}${visibleFiles ? ` - ${visibleFiles}` : ""}. Jima has not read file contents.`;
    item.appendChild(files);
  }

  const actions = document.createElement("div");
  actions.className = "saved-task-actions";

  const openUrl = task.detailUrl || task.candidateUrl || task.sourceUrl;
  if (openUrl) {
    const openLink = document.createElement("a");
    openLink.href = openUrl;
    openLink.target = "_blank";
    openLink.rel = "noreferrer";
    openLink.textContent = "Open source";
    actions.appendChild(openLink);
  }

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.dataset.taskAction = task.status === "done" ? "reopen" : "done";
  toggle.dataset.taskId = task.id;
  toggle.textContent = task.status === "done" ? "Reopen" : "Mark done";
  actions.appendChild(toggle);

  const del = document.createElement("button");
  del.type = "button";
  del.dataset.taskAction = "delete";
  del.dataset.taskId = task.id;
  del.textContent = "Delete";
  actions.appendChild(del);

  item.appendChild(actions);
  return item;
}

function renderSavedTasks(tasks) {
  clearList(savedTasksList);
  const openCount = globalThis.JimaTasks?.getOpenTaskCount(tasks) || 0;
  savedTasksCount.textContent = `(${openCount} open / ${tasks.length} total)`;

  if (tasks.length === 0) {
    appendEmptyRow(savedTasksList, "No saved Jima tasks yet.");
    return;
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });

  for (const task of sortedTasks) {
    savedTasksList.appendChild(createSavedTaskCard(task));
  }
}

async function refreshSavedTasks(rerenderCandidates = false) {
  if (!globalThis.JimaTasks) {
    setSavedTasksStatus("Local task storage is not available.", "error");
    return;
  }

  latestSavedTasks = await globalThis.JimaTasks.getTasks();
  renderSavedTasks(latestSavedTasks);

  if (rerenderCandidates && latestDetections) {
    renderHomeworkCandidates(latestDetections.homeworkCandidates || []);
  }
}

async function saveHomeworkCandidate(candidateIndex) {
  const candidate = latestHomeworkCandidates[Number(candidateIndex)];
  if (!candidate || !globalThis.JimaTasks) {
    setSavedTasksStatus("Could not save this possible task.", "error");
    return;
  }

  if (!isStrictHomeworkCandidate(candidate)) {
    setSavedTasksStatus("Jima only saves tasks when there is homework, submission, or deadline-like evidence.", "error");
    addChatMessage("assistant", "I did not save this as a task because it looks like a lecture/resource item, not homework.");
    return;
  }

  const task = globalThis.JimaTasks.createTaskFromCandidate(candidate, latestPageContext || {});
  const result = await globalThis.JimaTasks.saveTask(task);
  latestSavedTasks = result.tasks;
  renderSavedTasks(latestSavedTasks);
  renderHomeworkCandidates(latestHomeworkCandidates);
  setSavedTasksStatus(result.duplicate ? "This possible task was already saved." : "Saved possible task locally.", "success");
}

async function saveOrUpdateDetailTask() {
  if (!latestAssignmentDetail || !globalThis.JimaTasks?.saveOrUpdateTaskFromDetail) {
    setSaveDetailTaskStatus("Inspect an assignment detail page first.", "error");
    return;
  }

  if (saveDetailTaskBtn) saveDetailTaskBtn.disabled = true;
  setSaveDetailTaskStatus("Saving detail-page evidence locally...", "active");

  try {
    const result = await globalThis.JimaTasks.saveOrUpdateTaskFromDetail(
      latestAssignmentDetail,
      latestPageContext || {},
      latestAssignmentCandidate || {}
    );

    latestSavedTasks = result.tasks;
    renderSavedTasks(latestSavedTasks);
    if (latestDetections) {
      renderHomeworkCandidates(latestDetections.homeworkCandidates || []);
    }

    setSaveDetailTaskStatus(
      result.created
        ? "Created a saved possible task from this detail page."
        : "Updated the related saved task with detail-page evidence.",
      "success"
    );
    setSavedTasksStatus(
      result.created
        ? "Saved new task locally from assignment details."
        : "Updated saved task locally with assignment details.",
      "success"
    );
    renderAssignmentDetailLocalAnswer(
      latestAssignmentDetail,
      result.created
        ? "Saved this detail-page evidence as a new local task."
        : "Updated the related local task with this detail-page evidence."
    );
  } catch {
    setSaveDetailTaskStatus("Could not save these assignment details.", "error");
  } finally {
    if (saveDetailTaskBtn) saveDetailTaskBtn.disabled = false;
  }
}

function setDetailButtonsDisabled(isDisabled) {
  for (const button of Array.from(homeworkList?.querySelectorAll(".check-detail-btn") || [])) {
    button.disabled = isDisabled || !isSafeMoodleDetailUrl(latestHomeworkCandidates[Number(button.dataset.candidateIndex)]?.url);
  }
}

function inspectAssignmentDetail(candidateIndex) {
  const candidate = latestHomeworkCandidates[Number(candidateIndex)];
  inspectAssignmentCandidate(candidate);
}

function inspectAssignmentCandidate(candidate) {
  if (!candidate) {
    setAssignmentDetailStatus("Choose a homework candidate first.", "error");
    return;
  }

  if (!isSafeMoodleDetailUrl(candidate.url)) {
    setAssignmentDetailStatus("Jima can only inspect HTTPS BGU Moodle detail links in this phase.", "error");
    return;
  }

  if (assignmentDetailPanel) assignmentDetailPanel.hidden = false;
  if (assignmentDetailContent) assignmentDetailContent.hidden = true;
  latestAssignmentDetailFiles = [];
  latestAssignmentDetail = null;
  latestAssignmentCandidate = candidate;
  latestActiveAssignmentTitle = candidate.title || "Selected assignment";
  jimaSessionMemory.latestActiveAssignmentTitle = latestActiveAssignmentTitle;
  setAssignmentDetailDownloadStatus("", "");
  setSaveDetailTaskStatus("", "");
  clearFollowupResults();
  setDetailButtonsDisabled(true);
  setAssignmentDetailStatus("Opening the selected assignment detail page and checking visible evidence locally...", "active");
  addChatMessage("assistant", `Checking details for ${latestActiveAssignmentTitle}. I will inspect only this selected Moodle page.`);

  chrome.runtime.sendMessage(
    {
      type: "JIMA_OPEN_AND_INSPECT_ASSIGNMENT",
      assignment: {
        title: candidate.title || "Possible homework",
        url: candidate.url
      }
    },
    (response) => {
      setDetailButtonsDisabled(false);

      if (chrome.runtime.lastError) {
        setAssignmentDetailStatus(chrome.runtime.lastError.message || "Jima could not inspect this detail page.", "error");
        addChatMessage("assistant", chrome.runtime.lastError.message || "Jima could not inspect this detail page.");
        return;
      }

      if (!response?.ok) {
        setAssignmentDetailStatus(response?.error || "Jima could not inspect this detail page.", "error");
        addChatMessage("assistant", response?.error || "Jima could not inspect this detail page.");
        return;
      }

      renderAssignmentDetail(response.assignmentDetail || {});
    }
  );
}

async function handleSavedTaskAction(action, taskId) {
  if (!globalThis.JimaTasks || !taskId) return;

  if (action === "delete") {
    latestSavedTasks = await globalThis.JimaTasks.deleteTask(taskId);
    setSavedTasksStatus("Deleted saved task.", "success");
  } else {
    latestSavedTasks = await globalThis.JimaTasks.updateTaskStatus(taskId, action === "done" ? "done" : "open");
    setSavedTasksStatus(action === "done" ? "Marked task done." : "Reopened task.", "success");
  }

  renderSavedTasks(latestSavedTasks);
  if (latestDetections) {
    renderHomeworkCandidates(latestDetections.homeworkCandidates || []);
  }
}

function analyzeCurrentPage() {
  if (!chrome.runtime?.sendMessage) {
    setStatus("Jima messaging is not available in this browser context.", "error");
    return;
  }

  latestPageContext = null;
  latestDetections = null;
  latestFileCandidates = [];
  latestAssignmentDetailFiles = [];
  latestFollowupFiles = [];
  latestHomeworkCandidates = [];
  latestAssignmentDetail = null;
  latestAssignmentCandidate = null;
  latestActiveAssignmentTitle = "";
  latestAiAnalysis = null;
  latestCheckedCourseName = "";
  Object.assign(jimaSessionMemory, {
    latestAnalyzedCoursePageContext: null,
    latestHomeworkCandidates: [],
    latestCourseFileCandidates: [],
    latestInspectedAssignmentDetail: null,
    latestAssignmentFiles: [],
    latestActiveAssignmentTitle: "",
    lastMatchedFiles: [],
    lastReferencedFile: null,
    lastFileIntent: "",
    lastFileActionOffered: "",
    lastFileSourcePage: "",
    latestAiResponse: null
  });
  setLoading(true);
  previewPanel.hidden = true;
  if (evidenceDetails) evidenceDetails.hidden = true;
  clearAssignmentDetail();
  clearFollowupResults();
  clearLocalAnswer();
  downloadControls.hidden = true;
  aiPanel.hidden = true;
  aiResults.hidden = true;
  setDownloadStatus("", "");
  setStatus("Reading visible Moodle context locally...", "active");

  chrome.runtime.sendMessage({ type: "JIMA_ANALYZE_CURRENT_PAGE" }, (response) => {
    setLoading(false);

    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message || "Jima could not analyze this page.", "error");
      addChatMessage("assistant", chrome.runtime.lastError.message || "Jima could not analyze this page.");
      return;
    }

    if (!response?.ok) {
      setStatus(response?.error || "Jima could not analyze this page.", "error");
      addChatMessage("assistant", response?.error || "Jima could not analyze this page.");
      return;
    }

    renderContext(response.pageContext || response.context || {}, response.detections || {});
  });
}

function askJimaWithAi(questionOverride = "") {
  if (!latestPageContext) {
    setAiStatus("Run local analysis first, then ask Jima with AI.", "error");
    addChatMessage("assistant", "Run local analysis first, then I can ask AI after you confirm.");
    return;
  }

  const userQuestion = String(questionOverride || "").trim() || aiQuestionInput?.value.trim() || DEFAULT_AI_QUESTION;
  const bundle = buildCurrentAiContextBundle(userQuestion);
  pendingAiConfirmation = false;
  setAiLoading(true);
  aiResults.hidden = true;
  setAiStatus("Sending extracted context to your local Jima backend...", "active");
  addChatMessage("assistant", "Confirmed. I am sending the extracted context to your local Jima backend now.");

  chrome.runtime.sendMessage(
    {
      type: "JIMA_ANALYZE_WITH_AI",
      ...bundle
    },
    (response) => {
      setAiLoading(false);

      if (chrome.runtime.lastError) {
        const errorMessage = formatJimaBackendError(chrome.runtime.lastError.message, "Jima AI request failed.");
        setAiStatus(errorMessage, "error");
        addChatMessage("assistant", errorMessage, [], "error");
        return;
      }

      if (!response?.ok) {
        const errorMessage = formatJimaBackendError(response?.error, "Jima AI request failed.");
        setAiStatus(errorMessage, "error");
        addChatMessage("assistant", errorMessage, [], "error");
        return;
      }

      renderAiAnalysis(response.analysis || {});
      setAiStatus("AI analysis returned from your local backend.", "success");
      addChatMessage("assistant", response.analysis?.summary || "AI analysis returned from your local backend.");
    }
  );
}

function renderScopedDownloadResult(response, scope = "page") {
  const summary = response?.summary || {};
  const started = summary.started || 0;
  const skipped = summary.skipped || 0;
  const failed = summary.failed || 0;
  const details = (response?.results || [])
    .filter((result) => result.status !== "started")
    .map((result) => `${result.name || "File"}: ${result.error || result.status}`)
    .slice(0, 3);

  const parts = [];
  if (started) parts.push(`${started} download${started === 1 ? "" : "s"} started`);
  if (skipped) parts.push(`${skipped} skipped`);
  if (failed) parts.push(`${failed} failed`);

  const message = parts.length
    ? `${parts.join(", ")}. Chrome is handling started downloads.${details.length ? ` ${details.join(" ")}` : ""}`
    : response?.error || "No downloads were started.";

  if (started > 0) {
    addChatMessage(
      "assistant",
      "Download started. After it finishes, attach the downloaded file if you want me to summarize its contents.",
      [
        { label: "Attach file for analysis", dataset: { chatAction: "showFileAnalysis" } }
      ],
      "result"
    );
    openFileAnalysisPanel();
  }

  if (scope === "detail") {
    setAssignmentDetailDownloadStatus(message, started > 0 && failed === 0 ? "success" : "error");
    return;
  }

  if (scope === "followup") {
    setFollowupDownloadStatus(message, started > 0 && failed === 0 ? "success" : "error");
    setFollowupStatus(
      started > 0
        ? "Confirmed. Chrome is handling the selected download request."
        : "No downloads were started.",
      started > 0 && failed === 0 ? "success" : "error"
    );
    return;
  }

  setDownloadStatus(message, started > 0 && failed === 0 ? "success" : "error");
}

function downloadSelectedFiles(scope = "page") {
  const selectedFiles = getSelectedFileCandidates(scope);
  if (selectedFiles.length === 0) {
    if (scope === "detail") {
      setAssignmentDetailDownloadStatus("Select at least one detail-page file before downloading.", "error");
    } else if (scope === "followup") {
      setFollowupDownloadStatus("Select at least one file before downloading.", "error");
    } else {
      setDownloadStatus("Select at least one file before downloading.", "error");
    }
    updateDownloadButtonState(scope);
    return;
  }

  if (scope === "detail") {
    setAssignmentDetailDownloadLoading(true);
    setAssignmentDetailDownloadStatus("Starting selected detail-page downloads in Chrome...", "active");
  } else if (scope === "followup") {
    setFollowupDownloadLoading(true);
    setFollowupDownloadStatus("Starting selected downloads in Chrome...", "active");
  } else {
    setDownloadLoading(true);
    setDownloadStatus("Starting selected downloads in Chrome...", "active");
  }

  chrome.runtime.sendMessage(
    {
      type: "JIMA_DOWNLOAD_SELECTED_FILES",
      files: selectedFiles.map((file) => ({
        name: file.name,
        url: file.url,
        fileType: file.fileType,
        evidence: file.evidence,
        confidence: file.confidence
      }))
    },
    (response) => {
      if (scope === "detail") {
        setAssignmentDetailDownloadLoading(false);
      } else if (scope === "followup") {
        setFollowupDownloadLoading(false);
      } else {
        setDownloadLoading(false);
      }
      updateDownloadButtonState(scope);

      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError.message || "Jima could not start downloads.";
        if (scope === "detail") {
          setAssignmentDetailDownloadStatus(error, "error");
        } else if (scope === "followup") {
          setFollowupDownloadStatus(error, "error");
        } else {
          setDownloadStatus(error, "error");
        }
        return;
      }

      renderScopedDownloadResult(response || {}, scope);
    }
  );
}

function initializeJimaToolRegistry() {
  if (!globalThis.JimaChatV2?.createToolRegistry) return;

  jimaToolRegistry = globalThis.JimaChatV2.createToolRegistry({
    analyzeCurrentPageLocal: {
      description: "Extract visible Moodle context from the active tab and detect local homework/date/file evidence.",
      mode: "local",
      run: () => analyzeCurrentPage()
    },
    findSavedCourse: {
      description: "Search saved/default course links locally and ask before opening one course page.",
      mode: "local",
      run: ({ query }) => handleCourseQueryFromChat(query)
    },
    openAndAnalyzeCourse: {
      description: "Open one confirmed Moodle course page and run local analysis.",
      mode: "local",
      sensitive: true,
      run: ({ matchIndex }) => openAndAnalyzeCourseMatch(matchIndex)
    },
    inspectLatestAssignment: {
      description: "Inspect one selected or latest assignment/quiz page for visible deadline/status evidence.",
      mode: "local",
      sensitive: true,
      run: () => handleAssignmentDetailFollowup()
    },
    inspectAssignment: {
      description: "Open one confirmed assignment/quiz detail page and inspect visible evidence locally.",
      mode: "local",
      sensitive: true,
      run: ({ candidate }) => inspectAssignmentCandidate(candidate)
    },
    listLatestFiles: {
      description: "Show latest local file candidates without reading file contents.",
      mode: "local",
      run: ({ query }) => showFilesFromChat(query || "", "show")
    },
    explainFileBoundary: {
      description: "Explain that Jima can see file links/titles but has not read file contents.",
      mode: "local",
      run: ({ query }) => showFileReadLimitation(query || "")
    },
    prepareDownload: {
      description: "Show matching file candidates and require confirmation before Chrome downloads anything.",
      mode: "local",
      sensitive: true,
      run: ({ query }) => showFilesFromChat(query || "", "download")
    },
    openFileCandidate: {
      description: "Open one user-selected Moodle file/resource link without reading its contents.",
      mode: "local",
      sensitive: true,
      run: ({ file }) => openFileCandidate(file)
    },
    showFileAnalysis: {
      description: "Open the explicit local-file picker for user-selected file analysis.",
      mode: "ai",
      sensitive: true,
      run: ({ question } = {}) => openFileAnalysisPanel(question || "")
    },
    analyzeSelectedFile: {
      description: "Upload the manually selected local file to the local backend after explicit click.",
      mode: "ai",
      sensitive: true,
      run: () => analyzeSelectedLocalFile()
    },
    downloadConfirmed: {
      description: "Start Chrome downloads for explicitly selected files.",
      mode: "local",
      sensitive: true,
      run: ({ scope }) => downloadSelectedFiles(scope || "page")
    },
    confirmAi: {
      description: "Ask for explicit confirmation before sending the latest extracted context to the local backend.",
      mode: "ai",
      sensitive: true,
      run: ({ question }) => {
        if (question && aiQuestionInput) aiQuestionInput.value = question;
        showAiConfirmationInChat(question || aiQuestionInput?.value.trim() || "");
      }
    },
    askAiWithContext: {
      description: "Send the latest minimal context bundle to the local Jima backend after explicit confirmation.",
      mode: "ai",
      sensitive: true,
      run: ({ question } = {}) => askJimaWithAi(question)
    }
  });
}

initializeJimaToolRegistry();

if (analyzePageBtn) {
  analyzePageBtn.addEventListener("click", analyzeCurrentPage);
}

if (chatSendBtn) {
  chatSendBtn.addEventListener("click", handleChatSubmit);
}

if (chatInput) {
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleChatSubmit();
    }
  });
}

if (chatModeToggle) {
  chatModeToggle.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-mode]");
    if (!button) return;
    updateChatMode(button.dataset.mode);
    addChatMessage(
      "system",
      chatMode === "ai"
        ? "AI mode selected. I will still ask before sending any extracted Moodle context to the local backend."
        : "Local mode selected. I will answer with extension-side evidence and rules only."
    );
  });
}

if (suggestedActions) {
  suggestedActions.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-chat-action]");
    if (!button) return;

    const action = button.dataset.chatAction;
    const prompts = {
      currentPage: "Analyze current Moodle page",
      savedCourse: "Do I have homework in a saved course?",
      homework: "Do I have homework in this course?",
      files: "Show files on this page",
      analyzeFile: "Analyze file",
      ai: "Ask Jima with AI"
    };
    routeChatQuery(prompts[action] || button.textContent || "").catch(() => {
      addChatMessage("assistant", "I could not handle that request locally.");
    });
  });
}

if (composerDock) {
  composerDock.addEventListener("click", (event) => {
    const button = event.target?.closest?.(".attach-action[data-chat-action]");
    if (!button) return;

    routeChatQuery("Analyze file").catch(() => {
      addChatMessage("assistant", "I could not open file analysis.");
    });
  });
}

if (chatMessages) {
  chatMessages.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-chat-action]");
    if (!button) return;

    const action = button.dataset.chatAction;
    if (action === "confirmAi") {
      runJimaTool("askAiWithContext", { question: aiQuestionInput?.value.trim() || "" });
      return;
    }

    if (action === "ai") {
      runJimaTool("confirmAi", { question: aiQuestionInput?.value.trim() || "" });
      return;
    }

    if (action === "cancel") {
      pendingAiConfirmation = false;
      addChatMessage("assistant", "Canceled. No context was sent and no action was run.");
      return;
    }

    if (action === "checkCourse") {
      runJimaTool("openAndAnalyzeCourse", { matchIndex: button.dataset.matchIndex }).catch(() => {
        addChatMessage("assistant", "I could not check this course.");
        setCourseCheckButtonsDisabled(false);
      });
      return;
    }

    if (action === "inspectAssignment") {
      const candidate = getInspectableHomeworkCandidates()
        .find((item) => item.url === button.dataset.candidateUrl);
      runJimaTool("inspectAssignment", { candidate });
      return;
    }

    if (action === "downloadFiles") {
      runJimaTool("prepareDownload", { query: button.dataset.query || "" });
      return;
    }

    if (action === "downloadSingle") {
      downloadSingleFollowupFile(button.dataset.fileIndex || 0);
      return;
    }

    if (action === "showAllFiles") {
      runJimaTool("listLatestFiles", { query: "" });
      return;
    }

    if (action === "showFileAnalysis" || action === "analyzeFileUnavailable") {
      runJimaTool("showFileAnalysis", { question: button.dataset.question || "" });
      addChatMessage("assistant", "Attach the downloaded file here, then click Analyze file. File contents are sent only to your local backend after that click.");
      return;
    }

    if (action === "openFile") {
      const file = latestFollowupFiles[Number(button.dataset.fileIndex)];
      runJimaTool("openFileCandidate", { file });
    }
  });
}

if (findCourseBtn) {
  findCourseBtn.addEventListener("click", () => {
    findCourseFromQuery();
  });
}

if (courseQueryInput) {
  courseQueryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      findCourseFromQuery();
    }
  });
}

if (courseMatchesList) {
  courseMatchesList.addEventListener("click", (event) => {
    const button = event.target?.closest?.(".check-course-btn");
    if (!button) return;

    openAndAnalyzeCourseMatch(button.dataset.matchIndex).catch(() => {
      setCourseQueryStatus("Jima could not check this course.", "error");
      setCourseCheckButtonsDisabled(false);
    });
  });
}

if (homeworkList) {
  homeworkList.addEventListener("click", (event) => {
    const detailButton = event.target?.closest?.(".check-detail-btn");
    if (detailButton) {
      inspectAssignmentDetail(detailButton.dataset.candidateIndex);
      return;
    }

    const saveButton = event.target?.closest?.(".save-task-btn");
    if (saveButton) {
      saveHomeworkCandidate(saveButton.dataset.candidateIndex).catch(() => {
        setSavedTasksStatus("Could not save this possible task.", "error");
      });
    }
  });
}

if (askAiBtn) {
  askAiBtn.addEventListener("click", () => {
    runJimaTool("confirmAi", { question: aiQuestionInput?.value.trim() || "" });
  });
}

if (filesList) {
  filesList.addEventListener("change", (event) => {
    if (event.target?.classList?.contains("file-select-input")) {
      updateDownloadButtonState("page");
      setDownloadStatus("", "");
    }
  });
}

if (downloadSelectedBtn) {
  downloadSelectedBtn.addEventListener("click", () => runJimaTool("downloadConfirmed", { scope: "page" }));
}

if (assignmentDetailFiles) {
  assignmentDetailFiles.addEventListener("change", (event) => {
    if (event.target?.classList?.contains("file-select-input")) {
      updateDownloadButtonState("detail");
      setAssignmentDetailDownloadStatus("", "");
    }
  });
}

if (downloadDetailSelectedBtn) {
  downloadDetailSelectedBtn.addEventListener("click", () => runJimaTool("downloadConfirmed", { scope: "detail" }));
}

if (saveDetailTaskBtn) {
  saveDetailTaskBtn.addEventListener("click", () => {
    saveOrUpdateDetailTask();
  });
}

if (followupSendBtn) {
  followupSendBtn.addEventListener("click", handleFollowupMessage);
}

if (followupInput) {
  followupInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleFollowupMessage();
    }
  });
}

if (followupFileList) {
  followupFileList.addEventListener("change", (event) => {
    if (event.target?.classList?.contains("file-select-input")) {
      updateDownloadButtonState("followup");
      setFollowupDownloadStatus("", "");
    }
  });
}

if (downloadFollowupSelectedBtn) {
  downloadFollowupSelectedBtn.addEventListener("click", () => runJimaTool("downloadConfirmed", { scope: "followup" }));
}

if (cancelFollowupDownloadBtn) {
  cancelFollowupDownloadBtn.addEventListener("click", cancelFollowupDownload);
}

if (fileAnalysisInput) {
  fileAnalysisInput.addEventListener("change", () => {
    setSelectedAnalysisFile(fileAnalysisInput.files?.[0] || null, true);
  });
}

if (analyzeSelectedFileBtn) {
  analyzeSelectedFileBtn.addEventListener("click", () => {
    runJimaTool("analyzeSelectedFile");
  });
}

if (cancelFileAnalysisBtn) {
  cancelFileAnalysisBtn.addEventListener("click", () => {
    closeFileAnalysisPanel();
    addChatMessage("assistant", "File analysis canceled. No file was sent.");
  });
}

if (fileAnalysisDropzone) {
  fileAnalysisDropzone.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    fileAnalysisInput?.click();
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    fileAnalysisDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      fileAnalysisDropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    fileAnalysisDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (eventName === "dragleave" && fileAnalysisDropzone.contains(event.relatedTarget)) return;
      fileAnalysisDropzone.classList.remove("is-dragover");
    });
  });

  fileAnalysisDropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0] || null;
    if (!file) return;

    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      if (fileAnalysisInput) fileAnalysisInput.files = transfer.files;
    } catch {
      // Some browsers do not allow programmatic assignment to file inputs after drop.
    }

    setSelectedAnalysisFile(file, true);
  });
}

if (savedTasksList) {
  savedTasksList.addEventListener("click", (event) => {
    const control = event.target?.closest?.("[data-task-action]");
    if (!control) return;

    handleSavedTaskAction(control.dataset.taskAction, control.dataset.taskId).catch(() => {
      setSavedTasksStatus("Could not update this saved task.", "error");
    });
  });
}

if (chrome.storage?.onChanged && globalThis.JimaTasks) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[globalThis.JimaTasks.storageKey]) return;
    refreshSavedTasks(true).catch(() => {
      setSavedTasksStatus("Could not refresh saved tasks.", "error");
    });
  });
}

updateChatMode("local");

addChatMessage(
  "assistant",
  "Ready when you are, Boss. Ask me about homework, deadlines, Moodle files, saved courses, or anything you want me to analyze."
);

refreshSavedTasks().catch(() => {
  setSavedTasksStatus("Could not load saved tasks.", "error");
});
