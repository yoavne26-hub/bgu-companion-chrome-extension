const STORAGE_COURSES_KEY = "courses";
const STORAGE_PROFILE_KEY = "userProfile";
const DEFAULT_PROFILE = Object.freeze({
  usernameShort: "",
  studentId: "",
  autofillEnabled: true
});
const UI_COLORS = Object.freeze({
  text: "#0f172a",
  textMuted: "#64748b",
  textSoft: "#475569",
  border: "#cbd5e1",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  accent: "#f97316",
  accentDark: "#ea580c",
  success: "#15803d",
  successDark: "#166534",
  error: "#b91c1c",
  panelShadow: "rgba(15, 23, 42, 0.18)",
  accentShadow: "rgba(249, 115, 22, 0.28)",
  successShadow: "rgba(21, 128, 61, 0.24)"
});

const JIMA_CONTEXT_LIMITS = Object.freeze({
  textPreview: 7000,
  selectedText: 2000,
  links: 50,
  fileLinks: 30,
  headings: 40
});

const JIMA_DETECTION_LIMITS = Object.freeze({
  homeworkCandidates: 20,
  deadlineCandidates: 20,
  fileCandidates: 30,
  evidence: 250,
  surroundingText: 250
});

const JIMA_FILE_URL_PATTERN = /(\.pdf|\.docx?|\.pptx?|\.xlsx?|\.csv|\.zip|\.rar|\.7z|\.txt|\.rtf|\.jpg|\.jpeg|\.png|\.gif|pluginfile\.php|forcedownload=1|\/mod\/resource\/view\.php)/i;
const JIMA_FILE_RESOURCE_PATTERN = /(\.pdf|\.docx?|\.pptx?|\.xlsx?|\.csv|\.zip|\.rar|\.7z|\.txt|pluginfile\.php|\/mod\/resource\/view\.php|\/mod\/folder\/view\.php|\bresource\b|\bfolder\b)/i;
const JIMA_TASK_KEYWORD_PATTERN = /(assignment|homework|task|quiz|submission|submit|due|deadline|exercise|project|lab|exam|test|\u05de\u05d5\u05e2\u05d3 \u05d4\u05d2\u05e9\u05d4|\u05e9\u05d9\u05e2\u05d5\u05e8\u05d9 \u05d1\u05d9\u05ea|\u05de\u05d8\u05dc\u05d4|\u05ea\u05e8\u05d2\u05d9\u05dc|\u05d1\u05d5\u05d7\u05df|\u05d4\u05d2\u05e9\u05d4|\u05dc\u05d4\u05d2\u05d9\u05e9|\u05d3\u05d3\u05dc\u05d9\u05d9\u05df|\u05e4\u05e8\u05d5\u05d9\u05d9\u05e7\u05d8|\u05e4\u05e8\u05d5\u05d9\u05e7\u05d8|\u05de\u05e2\u05d1\u05d3\u05d4|\u05de\u05d1\u05d7\u05df)/i;
const JIMA_DEADLINE_CONTEXT_PATTERN = /(due|deadline|submission|submit|available until|until|\u05de\u05d5\u05e2\u05d3|\u05d4\u05d2\u05e9\u05d4|\u05dc\u05d4\u05d2\u05d9\u05e9|\u05e2\u05d3|\u05ea\u05d0\u05e8\u05d9\u05da|\u05d3\u05d3\u05dc\u05d9\u05d9\u05df)/i;
const JIMA_DATE_PATTERN = /\b(?:\d{1,2}[/.]\d{1,2}[/.]\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\b/g;
const JIMA_MOODLE_ACTIVITY_PATTERN = /\/mod\/(assign|quiz|workshop|lesson|forum|choice|feedback|resource|folder|url)\/view\.php/i;
const JIMA_HOMEWORK_ACTIVITY_TYPES = new Set(["assign", "quiz", "workshop"]);
const JIMA_ASSIGNMENT_DETAIL_TEXT_LIMIT = 6000;
const JIMA_ASSIGNMENT_INSTRUCTIONS_LIMIT = 1400;
const JIMA_STATUS_SNIPPET_LIMIT = 320;
const JIMA_NOT_SUBMITTED_PATTERN = /(not submitted|no submission|nothing has been submitted|no attempt|submission status\s+not submitted|\u05dc\u05d0 \u05d4\u05d5\u05d2\u05e9|\u05d8\u05e8\u05dd \u05d4\u05d5\u05d2\u05e9|\u05dc\u05dc\u05d0 \u05d4\u05d2\u05e9\u05d4)/i;
const JIMA_SUBMITTED_PATTERN = /(submitted for grading|\bsubmitted\b|submission status\s+submitted|\u05d4\u05d5\u05d2\u05e9|\u05e0\u05e9\u05dc\u05d7 \u05dc\u05d1\u05d3\u05d9\u05e7\u05d4)/i;
const JIMA_DRAFT_PATTERN = /(\bdraft\b|draft submission|\u05d8\u05d9\u05d5\u05d8\u05d4)/i;
const JIMA_STATUS_CONTEXT_PATTERN = /(submission status|grading status|last modified|due date|time remaining|status|\u05de\u05e6\u05d1 \u05d4\u05d2\u05e9\u05d4|\u05de\u05e6\u05d1|\u05e6\u05d9\u05d5\u05df|\u05e0\u05d1\u05d3\u05e7|\u05d6\u05de\u05df \u05e9\u05e0\u05d5\u05ea\u05e8|\u05de\u05d5\u05e2\u05d3 \u05d4\u05d2\u05e9\u05d4|\u05ea\u05d0\u05e8\u05d9\u05da \u05d4\u05d2\u05e9\u05d4)/i;
const JIMA_DATE_LABELS = Object.freeze({
  opensAt: /(opened|opens|open date|allow submissions from|\u05e0\u05e4\u05ea\u05d7|\u05e0\u05e4\u05ea\u05d7\u05d4|\u05de\u05ea\u05d7\u05d9\u05dc|\u05de\u05ea\u05d7\u05d9\u05dc\u05d4|\u05de\u05d5\u05e2\u05d3 \u05e4\u05ea\u05d9\u05d7\u05d4)/i,
  closesAt: /(closing date|close date|closes|ends|end date|\u05de\u05e1\u05ea\u05d9\u05d9\u05dd|\u05de\u05e1\u05ea\u05d9\u05d9\u05de\u05ea|\u05e0\u05e1\u05d2\u05e8|\u05e0\u05e1\u05d2\u05e8\u05ea|\u05de\u05d5\u05e2\u05d3 \u05e1\u05d9\u05d5\u05dd)/i,
  dueAt: /(due date|deadline|submission date|\u05de\u05d5\u05e2\u05d3 \u05d4\u05d2\u05e9\u05d4|\u05ea\u05d0\u05e8\u05d9\u05da \u05d4\u05d2\u05e9\u05d4|\u05d3\u05d3\u05dc\u05d9\u05d9\u05df)/i,
  cutoffAt: /(cut-?off date|final deadline)/i,
  timeRemaining: /(time remaining|\u05d6\u05de\u05df \u05e9\u05e0\u05d5\u05ea\u05e8)/i
});
const JIMA_DATE_LABEL_TEXT = [
  "Opened",
  "Opens",
  "Open date",
  "Allow submissions from",
  "Due date",
  "Closing date",
  "Close date",
  "Cut-?off date",
  "Time remaining",
  "Deadline",
  "\\u05e0\\u05e4\\u05ea\\u05d7",
  "\\u05e0\\u05e4\\u05ea\\u05d7\\u05d4",
  "\\u05de\\u05ea\\u05d7\\u05d9\\u05dc",
  "\\u05de\\u05ea\\u05d7\\u05d9\\u05dc\\u05d4",
  "\\u05de\\u05d5\\u05e2\\u05d3 \\u05e4\\u05ea\\u05d9\\u05d7\\u05d4",
  "\\u05de\\u05e1\\u05ea\\u05d9\\u05d9\\u05dd",
  "\\u05de\\u05e1\\u05ea\\u05d9\\u05d9\\u05de\\u05ea",
  "\\u05e0\\u05e1\\u05d2\\u05e8",
  "\\u05e0\\u05e1\\u05d2\\u05e8\\u05ea",
  "\\u05de\\u05d5\\u05e2\\u05d3 \\u05e1\\u05d9\\u05d5\\u05dd",
  "\\u05de\\u05d5\\u05e2\\u05d3 \\u05d4\\u05d2\\u05e9\\u05d4",
  "\\u05ea\\u05d0\\u05e8\\u05d9\\u05da \\u05d4\\u05d2\\u05e9\\u05d4",
  "\\u05d3\\u05d3\\u05dc\\u05d9\\u05d9\\u05df",
  "\\u05d6\\u05de\\u05df \\u05e9\\u05e0\\u05d5\\u05ea\\u05e8"
].join("|");
const JIMA_DATE_LABEL_LINE_PATTERN = new RegExp(`^\\s*(${JIMA_DATE_LABEL_TEXT})\\s*[:\\uFF1A-]?\\s*(.+)$`, "i");
const JIMA_DATE_LABEL_ONLY_PATTERN = new RegExp(`^\\s*(${JIMA_DATE_LABEL_TEXT})\\s*[:\\uFF1A-]?\\s*$`, "i");
const JIMA_DATE_LABEL_LOOKAHEAD_PATTERN = new RegExp(`\\s+(?=(?:${JIMA_DATE_LABEL_TEXT})\\s*[:\\uFF1A-]?)`, "gi");
const JIMA_HEBREW_MONTH_PATTERN = /(\u05d9\u05e0\u05d5\u05d0\u05e8|\u05e4\u05d1\u05e8\u05d5\u05d0\u05e8|\u05de\u05e8\u05e5|\u05d0\u05e4\u05e8\u05d9\u05dc|\u05de\u05d0\u05d9|\u05d9\u05d5\u05e0\u05d9|\u05d9\u05d5\u05dc\u05d9|\u05d0\u05d5\u05d2\u05d5\u05e1\u05d8|\u05e1\u05e4\u05d8\u05de\u05d1\u05e8|\u05d0\u05d5\u05e7\u05d8\u05d5\u05d1\u05e8|\u05e0\u05d5\u05d1\u05de\u05d1\u05e8|\u05d3\u05e6\u05de\u05d1\u05e8)/i;
const JIMA_TEXTUAL_DATE_PATTERN = new RegExp(`(\\d{1,2}\\s+${JIMA_HEBREW_MONTH_PATTERN.source}\\s+\\d{4}|\\b\\d{1,2}\\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4}\\b|\\b(?:AM|PM)\\s*\\d{1,2}:\\d{2}\\b|\\b\\d{1,2}:\\d{2}\\s*(?:AM|PM)\\b)`, "i");

function compactJimaText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function capJimaText(value, limit) {
  const text = compactJimaText(value);
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function getJimaContextWindow(text, index, length, limit) {
  const half = Math.floor(limit / 2);
  const start = Math.max(0, index - half);
  const end = Math.min(text.length, index + length + half);
  return capJimaText(text.slice(start, end), limit);
}

function addJimaUniqueCandidate(candidates, seen, key, candidate, limit) {
  if (!key || seen.has(key) || candidates.length >= limit) return;
  seen.add(key);
  candidates.push(candidate);
}

function normalizeJimaDetectionTitle(value) {
  return compactJimaText(value).toLowerCase();
}

function getJimaActivityType(url) {
  if (/pluginfile\.php/i.test(url || "")) return "file";
  const match = (url || "").match(JIMA_MOODLE_ACTIVITY_PATTERN);
  return match?.[1] || "";
}

function getJimaActivityLabel(activityType) {
  return {
    assign: "assignment",
    quiz: "quiz",
    forum: "forum",
    resource: "resource",
    folder: "folder",
    url: "external link",
    file: "file"
  }[activityType] || activityType || "activity";
}

function getJimaHomeworkCandidateRank(candidate) {
  const activityType = candidate.activityType || candidate.type || "";
  if (activityType === "assign" || candidate.type === "assignment") return 100;
  if (activityType === "quiz" || candidate.type === "quiz") return 90;
  if (activityType === "workshop") return 80;
  if (JIMA_TASK_KEYWORD_PATTERN.test(`${candidate.title || ""} ${candidate.evidence || ""}`)) return 50;
  return 10;
}

function dedupeJimaHomeworkCandidates(candidates) {
  const byTitle = new Map();

  for (const candidate of candidates) {
    const key = normalizeJimaDetectionTitle(candidate.title || candidate.evidence || candidate.url);
    if (!key) continue;

    const existingList = byTitle.get(key) || [];
    const candidateRank = getJimaHomeworkCandidateRank(candidate);
    const existingRank = Math.max(0, ...existingList.map(getJimaHomeworkCandidateRank));

    if (existingList.length === 0 || candidateRank > existingRank) {
      byTitle.set(key, [candidate]);
      continue;
    }

    if (
      candidateRank === existingRank &&
      !existingList.some((existing) => existing.url === candidate.url)
    ) {
      existingList.push(candidate);
      byTitle.set(key, existingList);
    }
  }

  return Array.from(byTitle.values())
    .flat()
    .sort((a, b) => getJimaHomeworkCandidateRank(b) - getJimaHomeworkCandidateRank(a))
    .slice(0, JIMA_DETECTION_LIMITS.homeworkCandidates);
}

function getJimaFileType(link) {
  const value = `${link?.text || ""} ${link?.url || ""}`;
  const extensionMatch = value.match(/\.([a-z0-9]{2,5})(?:[?#/]|$)/i);
  if (extensionMatch) return extensionMatch[1].toUpperCase();
  if (/pluginfile\.php/i.test(value)) return "Moodle file";
  if (/\/mod\/folder\/view\.php|\bfolder\b/i.test(value)) return "Folder";
  if (/\/mod\/resource\/view\.php|\bresource\b/i.test(value)) return "Resource";
  return "";
}

function detectJimaFileCandidates(links) {
  const seen = new Set();
  const candidates = [];

  for (const link of links) {
    const evidenceText = `${link.text || ""} ${link.url || ""}`;
    if (!JIMA_FILE_RESOURCE_PATTERN.test(evidenceText)) continue;

    const fileType = getJimaFileType(link);
    const highConfidence = /(\.[a-z0-9]{2,5}|pluginfile\.php)/i.test(evidenceText);

    addJimaUniqueCandidate(
      candidates,
      seen,
      link.url || link.text,
      {
        name: capJimaText(link.text || link.url || "Moodle resource", 160),
        url: link.url,
        fileType,
        evidence: capJimaText(evidenceText, JIMA_DETECTION_LIMITS.evidence),
        confidence: highConfidence ? "High" : "Medium"
      },
      JIMA_DETECTION_LIMITS.fileCandidates
    );
  }

  return candidates;
}

function detectJimaHomeworkCandidates(pageContext) {
  const candidates = [];
  const seen = new Set();

  for (const link of pageContext.links || []) {
    const activityType = getJimaActivityType(link.url);
    const evidenceText = `${link.text || ""} ${link.url || ""}`;
    const hasTaskKeyword = JIMA_TASK_KEYWORD_PATTERN.test(evidenceText);
    const isStrongActivity = JIMA_HOMEWORK_ACTIVITY_TYPES.has(activityType);
    if (!isStrongActivity && !hasTaskKeyword) continue;

    const activityLabel = getJimaActivityLabel(activityType);
    const confidence = isStrongActivity ? "High" : activityType ? "Medium" : "Low";

    addJimaUniqueCandidate(
      candidates,
      seen,
      `link:${link.url || link.text}`,
      {
        title: capJimaText(link.text || link.url || "Possible Moodle activity", 160),
        type: activityLabel || "keyword",
        activityType,
        url: link.url,
        evidence: capJimaText(evidenceText, JIMA_DETECTION_LIMITS.evidence),
        confidence,
        uncertainty: isStrongActivity
          ? "Moodle activity link. Open the detail page to confirm the exact requirement and deadline."
          : "Task-like wording was visible, but this may not be an assignment activity."
      },
      JIMA_DETECTION_LIMITS.homeworkCandidates
    );
  }

  for (const heading of pageContext.headings || []) {
    if (!JIMA_TASK_KEYWORD_PATTERN.test(heading.text)) continue;

    addJimaUniqueCandidate(
      candidates,
      seen,
      `heading:${heading.level}:${heading.text}`,
      {
        title: capJimaText(heading.text, 160),
        type: "heading",
        url: pageContext.currentUrl,
        evidence: capJimaText(`${heading.level.toUpperCase()}: ${heading.text}`, JIMA_DETECTION_LIMITS.evidence),
        confidence: "Medium",
        uncertainty: "Detected from a visible heading. It may be a topic, activity, or instruction."
      },
      JIMA_DETECTION_LIMITS.homeworkCandidates
    );
  }

  const preview = pageContext.visibleTextPreview || "";
  const keywordRegex = new RegExp(JIMA_TASK_KEYWORD_PATTERN.source, "gi");
  let match;
  while ((match = keywordRegex.exec(preview)) && candidates.length < JIMA_DETECTION_LIMITS.homeworkCandidates) {
    const evidence = getJimaContextWindow(
      preview,
      match.index,
      match[0].length,
      JIMA_DETECTION_LIMITS.evidence
    );

    addJimaUniqueCandidate(
      candidates,
      seen,
      `text:${evidence}`,
      {
        title: capJimaText(match[0], 80),
        type: "visible text",
        url: pageContext.currentUrl,
        evidence,
        confidence: JIMA_DEADLINE_CONTEXT_PATTERN.test(evidence) ? "Medium" : "Low",
        uncertainty: "Detected from nearby visible text. Jima cannot confirm this is assigned work yet."
      },
      JIMA_DETECTION_LIMITS.homeworkCandidates
    );
  }

  return dedupeJimaHomeworkCandidates(candidates);
}

function detectJimaDeadlineCandidates(pageContext) {
  const text = [
    pageContext.visibleTextPreview,
    ...(pageContext.headings || []).map((heading) => heading.text),
    ...(pageContext.links || []).map((link) => link.text)
  ].filter(Boolean).join(" ");
  const seen = new Set();
  const candidates = [];
  let match;

  JIMA_DATE_PATTERN.lastIndex = 0;
  while ((match = JIMA_DATE_PATTERN.exec(text)) && candidates.length < JIMA_DETECTION_LIMITS.deadlineCandidates) {
    const surroundingText = getJimaContextWindow(
      text,
      match.index,
      match[0].length,
      JIMA_DETECTION_LIMITS.surroundingText
    );
    const hasDeadlineContext = JIMA_DEADLINE_CONTEXT_PATTERN.test(surroundingText);

    addJimaUniqueCandidate(
      candidates,
      seen,
      `${match[0]}:${surroundingText}`,
      {
        rawDate: match[0],
        surroundingText,
        confidence: hasDeadlineContext ? "Medium" : "Low",
        uncertainty: hasDeadlineContext
          ? "Date appears near deadline/submission wording, but confirm the final deadline on Moodle."
          : "Date found, but Jima cannot confirm it is a deadline."
      },
      JIMA_DETECTION_LIMITS.deadlineCandidates
    );
  }
  JIMA_DATE_PATTERN.lastIndex = 0;

  return candidates;
}

function detectJimaCandidates(pageContext) {
  return {
    homeworkCandidates: detectJimaHomeworkCandidates(pageContext),
    deadlineCandidates: detectJimaDeadlineCandidates(pageContext),
    fileCandidates: detectJimaFileCandidates(pageContext.links || [])
  };
}

function getJimaStatusEvidence(text, pattern) {
  const match = text.match(pattern);
  if (!match) return "";

  return getJimaContextWindow(
    text,
    match.index || 0,
    match[0].length,
    JIMA_STATUS_SNIPPET_LIMIT
  );
}

function detectJimaSubmissionStatus(text) {
  const compactText = compactJimaText(text);
  const notSubmittedEvidence = getJimaStatusEvidence(compactText, JIMA_NOT_SUBMITTED_PATTERN);
  if (notSubmittedEvidence) {
    return {
      value: "not_submitted",
      label: "Not submitted",
      evidence: notSubmittedEvidence,
      confidence: JIMA_STATUS_CONTEXT_PATTERN.test(notSubmittedEvidence) ? "High" : "Medium",
      uncertainty: JIMA_STATUS_CONTEXT_PATTERN.test(notSubmittedEvidence)
        ? ""
        : "Submission wording was visible, but not clearly inside a Moodle status block."
    };
  }

  const draftEvidence = getJimaStatusEvidence(compactText, JIMA_DRAFT_PATTERN);
  if (draftEvidence) {
    return {
      value: "draft",
      label: "Draft",
      evidence: draftEvidence,
      confidence: JIMA_STATUS_CONTEXT_PATTERN.test(draftEvidence) ? "High" : "Medium",
      uncertainty: "Draft status can still require opening Moodle to confirm final submission."
    };
  }

  const submittedEvidence = getJimaStatusEvidence(compactText, JIMA_SUBMITTED_PATTERN);
  if (submittedEvidence) {
    return {
      value: "submitted",
      label: "Submitted",
      evidence: submittedEvidence,
      confidence: JIMA_STATUS_CONTEXT_PATTERN.test(submittedEvidence) ? "High" : "Medium",
      uncertainty: JIMA_STATUS_CONTEXT_PATTERN.test(submittedEvidence)
        ? ""
        : "Submission wording was visible, but not clearly inside a Moodle status block."
    };
  }

  return {
    value: "unknown",
    label: "Unknown",
    evidence: "",
    confidence: "Low",
    uncertainty: "I cannot confirm submission status from the visible text on this detail page."
  };
}

function createEmptyJimaStructuredDates() {
  return {
    opensAt: null,
    closesAt: null,
    dueAt: null,
    cutoffAt: null,
    timeRemaining: null
  };
}

function getJimaDateFieldKey(label) {
  const normalizedLabel = compactJimaText(label);
  for (const [key, pattern] of Object.entries(JIMA_DATE_LABELS)) {
    if (pattern.test(normalizedLabel)) return key;
  }
  return "";
}

function addJimaStructuredDate(dates, label, rawValue) {
  const key = getJimaDateFieldKey(label);
  const value = capJimaText(rawValue, 220);
  if (!key || !value || dates[key]) return;

  const cleanLabel = capJimaText(label, 80);
  dates[key] = {
    label: cleanLabel,
    rawValue: value,
    evidence: `${cleanLabel}: ${value}`,
    confidence: "high"
  };
}

function getJimaDirectElementText(element) {
  return capJimaText(element?.textContent || "", 260);
}

function splitJimaDetailTextIntoLines(text) {
  const compactText = compactJimaText(text);
  if (!compactText) return [];

  return compactText
    .replace(JIMA_DATE_LABEL_LOOKAHEAD_PATTERN, "\n")
    .split(/\n+/)
    .map((line) => capJimaText(line, 360))
    .filter(Boolean);
}

function addJimaDetailTextLine(lines, seen, text, limit = 120) {
  if (lines.length >= limit) return;

  for (const line of splitJimaDetailTextIntoLines(text)) {
    const key = normalizeJimaDetectionTitle(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
    if (lines.length >= limit) break;
  }
}

function getJimaAssignmentDetailTextLines() {
  const root = getJimaMainRoot();
  if (!root) return [];

  const lines = [];
  const seen = new Set();
  const detailSelectors = [
    ".activity-information",
    ".activity-dates",
    ".submissionstatustable",
    ".generaltable",
    ".description",
    ".activity-description",
    ".box",
    ".no-overflow",
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "li",
    "dt",
    "dd",
    "tr"
  ].join(", ");

  for (const element of Array.from(root.querySelectorAll(detailSelectors))) {
    if (!isJimaVisibleElement(element) || isJimaSkippedTextParent(element)) continue;
    addJimaDetailTextLine(lines, seen, element.textContent);
  }

  if (lines.length < 4) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode() && lines.length < 120) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || isJimaSkippedTextParent(parent) || !isJimaVisibleElement(parent)) continue;
      addJimaDetailTextLine(lines, seen, node.nodeValue);
    }
  }

  return lines;
}

function hasJimaDateLikeValue(value) {
  JIMA_DATE_PATTERN.lastIndex = 0;
  return (
    JIMA_DATE_PATTERN.test(value) ||
    JIMA_TEXTUAL_DATE_PATTERN.test(value) ||
    /(time remaining|remaining|\u05d6\u05de\u05df \u05e9\u05e0\u05d5\u05ea\u05e8)/i.test(value)
  );
}

function collectJimaStructuredDatesFromDom() {
  const dates = createEmptyJimaStructuredDates();
  const root = getJimaMainRoot();
  if (!root) return dates;

  for (const term of Array.from(root.querySelectorAll("dt"))) {
    if (!isJimaVisibleElement(term)) continue;
    const valueElement = term.nextElementSibling;
    if (!valueElement || !isJimaVisibleElement(valueElement)) continue;
    addJimaStructuredDate(dates, getJimaDirectElementText(term), getJimaDirectElementText(valueElement));
  }

  for (const row of Array.from(root.querySelectorAll("tr"))) {
    if (!isJimaVisibleElement(row)) continue;
    const cells = Array.from(row.children).filter(isJimaVisibleElement);
    if (cells.length < 2) continue;
    addJimaStructuredDate(dates, getJimaDirectElementText(cells[0]), getJimaDirectElementText(cells.slice(1).map((cell) => cell.textContent).join(" ")));
  }

  for (const item of Array.from(root.querySelectorAll(".activity-information li, .activity-dates li, .description .row, .generaltable .cell"))) {
    if (!isJimaVisibleElement(item)) continue;
    const text = getJimaDirectElementText(item);
    const splitMatch = text.match(/^(.{2,80}?)[\s:：-]+(.{3,220})$/);
    if (splitMatch) {
      addJimaStructuredDate(dates, splitMatch[1], splitMatch[2]);
    }
  }

  return dates;
}

function collectJimaStructuredDatesFromLines(lines) {
  const dates = createEmptyJimaStructuredDates();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineMatch = line.match(JIMA_DATE_LABEL_LINE_PATTERN);
    if (lineMatch) {
      addJimaStructuredDate(dates, lineMatch[1], lineMatch[2]);
      continue;
    }

    const labelOnlyMatch = line.match(JIMA_DATE_LABEL_ONLY_PATTERN);
    const nextLine = lines[index + 1] || "";
    if (labelOnlyMatch && nextLine && hasJimaDateLikeValue(nextLine)) {
      addJimaStructuredDate(dates, labelOnlyMatch[1], nextLine);
    }
  }

  return dates;
}

function mergeJimaStructuredDates(primary, fallback) {
  const dates = { ...primary };
  for (const key of Object.keys(dates)) {
    if (!dates[key] && fallback[key]) dates[key] = fallback[key];
  }
  return dates;
}

function collectJimaStructuredDatesFromText(text) {
  const dates = createEmptyJimaStructuredDates();
  const compactText = compactJimaText(text);
  const labelPattern = "(Opened|Opens|Open date|Allow submissions from|Due date|Closing date|Close date|Cut-?off date|Time remaining|Deadline|\\u05e0\\u05e4\\u05ea\\u05d7|\\u05e0\\u05e4\\u05ea\\u05d7\\u05d4|\\u05de\\u05ea\\u05d7\\u05d9\\u05dc|\\u05de\\u05ea\\u05d7\\u05d9\\u05dc\\u05d4|\\u05de\\u05d5\\u05e2\\u05d3 \\u05e4\\u05ea\\u05d9\\u05d7\\u05d4|\\u05de\\u05e1\\u05ea\\u05d9\\u05d9\\u05dd|\\u05de\\u05e1\\u05ea\\u05d9\\u05d9\\u05de\\u05ea|\\u05e0\\u05e1\\u05d2\\u05e8|\\u05e0\\u05e1\\u05d2\\u05e8\\u05ea|\\u05de\\u05d5\\u05e2\\u05d3 \\u05e1\\u05d9\\u05d5\\u05dd|\\u05de\\u05d5\\u05e2\\u05d3 \\u05d4\\u05d2\\u05e9\\u05d4|\\u05ea\\u05d0\\u05e8\\u05d9\\u05da \\u05d4\\u05d2\\u05e9\\u05d4|\\u05d3\\u05d3\\u05dc\\u05d9\\u05d9\\u05df|\\u05d6\\u05de\\u05df \\u05e9\\u05e0\\u05d5\\u05ea\\u05e8)";
  const regex = new RegExp(`${labelPattern}\\s*[:：-]?\\s*(.{3,180}?)(?=\\s+${labelPattern}\\s*[:：-]?|$)`, "gi");
  let match;
  while ((match = regex.exec(compactText))) {
    addJimaStructuredDate(dates, match[1], match[2]);
  }
  return dates;
}

function collectJimaStructuredDatesFromCompactText(text) {
  const dates = createEmptyJimaStructuredDates();
  const compactText = compactJimaText(text);
  const regex = new RegExp(`(${JIMA_DATE_LABEL_TEXT})\\s*[:\\uFF1A-]?\\s*(.{3,220}?)(?=\\s+(?:${JIMA_DATE_LABEL_TEXT})\\s*[:\\uFF1A-]?|$)`, "gi");
  let match;
  while ((match = regex.exec(compactText))) {
    addJimaStructuredDate(dates, match[1], match[2]);
  }
  return dates;
}

function structuredJimaDatesToCandidates(structuredDates) {
  return Object.values(structuredDates || {})
    .filter(Boolean)
    .map((date) => ({
      rawDate: date.rawValue,
      surroundingText: date.evidence,
      confidence: date.confidence || "High",
      uncertainty: ""
    }));
}

function getJimaInstructionPreview(text) {
  const compactText = compactJimaText(text);
  const instructionPattern = /(description|instructions?|submission instructions?|assignment|\u05d4\u05e0\u05d7\u05d9\u05d5\u05ea|\u05d4\u05d5\u05e8\u05d0\u05d5\u05ea|\u05ea\u05d9\u05d0\u05d5\u05e8|\u05de\u05d8\u05dc\u05d4)/i;
  const match = compactText.match(instructionPattern);
  if (match) {
    return getJimaContextWindow(
      compactText,
      match.index || 0,
      match[0].length,
      JIMA_ASSIGNMENT_INSTRUCTIONS_LIMIT
    );
  }

  return capJimaText(compactText, JIMA_ASSIGNMENT_INSTRUCTIONS_LIMIT);
}

function isJimaVisibleElement(element) {
  if (!element || !(element instanceof Element)) return false;
  if (element.closest("[hidden], [aria-hidden='true']")) return false;

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }

  return element === document.body || element.getClientRects().length > 0;
}

function isJimaSkippedTextParent(element) {
  return !!element?.closest(
    "script, style, noscript, template, input, textarea, select, option, button"
  );
}

function getJimaMainRoot() {
  return (
    document.querySelector("#region-main") ||
    document.querySelector("main") ||
    document.querySelector("[role='main']") ||
    document.querySelector("#page-content") ||
    document.body
  );
}

function getJimaVisibleTextPreview() {
  const root = getJimaMainRoot();
  if (!root) return "";

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const chunks = [];
  let currentLength = 0;

  while (walker.nextNode() && currentLength < JIMA_CONTEXT_LIMITS.textPreview) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || isJimaSkippedTextParent(parent) || !isJimaVisibleElement(parent)) continue;

    const text = compactJimaText(node.nodeValue);
    if (!text) continue;

    chunks.push(text);
    currentLength += text.length + 1;
  }

  return capJimaText(chunks.join(" "), JIMA_CONTEXT_LIMITS.textPreview);
}

function getJimaHeadings() {
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .filter(isJimaVisibleElement)
    .map((heading) => ({
      level: heading.tagName.toLowerCase(),
      text: compactJimaText(heading.textContent)
    }))
    .filter((heading) => heading.text);

  return headings.slice(0, JIMA_CONTEXT_LIMITS.headings);
}

function getJimaLinks() {
  const seen = new Set();
  const links = [];

  for (const link of Array.from(document.querySelectorAll("a[href]"))) {
    if (!(link instanceof HTMLAnchorElement) || !isJimaVisibleElement(link)) continue;
    if (/^(javascript:|mailto:|tel:)/i.test(link.href)) continue;

    const text = compactJimaText(link.textContent) || link.href;
    const entry = {
      text: capJimaText(text, 160),
      url: link.href
    };
    const key = `${entry.text}|${entry.url}`;
    if (seen.has(key)) continue;

    seen.add(key);
    links.push(entry);
    if (links.length >= JIMA_CONTEXT_LIMITS.links) break;
  }

  return links;
}

function getJimaSelectedText() {
  try {
    return capJimaText(window.getSelection()?.toString() || "", JIMA_CONTEXT_LIMITS.selectedText);
  } catch {
    return "";
  }
}

function extractJimaMoodleContext() {
  if (location.hostname !== "moodle.bgu.ac.il") {
    return {
      ok: false,
      error: "Open a BGU Moodle page first, then ask Jima to analyze it."
    };
  }

  const links = getJimaLinks();
  const fileLinks = links
    .filter((link) => JIMA_FILE_URL_PATTERN.test(`${link.text} ${link.url}`))
    .slice(0, JIMA_CONTEXT_LIMITS.fileLinks);
  const headings = getJimaHeadings();
  const primaryHeading = headings.find((heading) => heading.level === "h1") || headings[0];
  const visibleTextPreview = getJimaVisibleTextPreview();

  if (!visibleTextPreview) {
    return {
      ok: false,
      error: "Jima could not find visible Moodle text on this page."
    };
  }

  const pageContext = {
    pageTitle: primaryHeading?.text || document.title,
    currentUrl: location.href,
    documentTitle: document.title,
    visibleTextPreview,
    selectedText: getJimaSelectedText(),
    headings,
    links,
    fileLinks,
    limits: JIMA_CONTEXT_LIMITS
  };

  return {
    ok: true,
    context: pageContext,
    pageContext,
    detections: detectJimaCandidates(pageContext)
  };
}

function extractJimaAssignmentDetail() {
  if (location.hostname !== "moodle.bgu.ac.il") {
    return {
      ok: false,
      error: "Open a BGU Moodle assignment page first, then ask Jima to inspect it."
    };
  }

  const headings = getJimaHeadings();
  const links = getJimaLinks();
  const fileCandidates = detectJimaFileCandidates(links);
  const primaryHeading = headings.find((heading) => heading.level === "h1") || headings[0];
  const detailLines = getJimaAssignmentDetailTextLines();
  const visibleText = detailLines.length > 0
    ? detailLines.join("\n")
    : getJimaVisibleTextPreview();
  const textPreview = capJimaText(visibleText, JIMA_ASSIGNMENT_DETAIL_TEXT_LIMIT);
  const structuredDates = mergeJimaStructuredDates(
    mergeJimaStructuredDates(
      collectJimaStructuredDatesFromLines(detailLines),
      collectJimaStructuredDatesFromDom()
    ),
    collectJimaStructuredDatesFromCompactText(textPreview)
  );

  if (!textPreview) {
    return {
      ok: false,
      error: "Jima could not find visible assignment detail text on this page."
    };
  }

  const detailContext = {
    pageTitle: primaryHeading?.text || document.title,
    currentUrl: location.href,
    documentTitle: document.title,
    visibleTextPreview: textPreview,
    selectedText: getJimaSelectedText(),
    headings,
    links,
    fileLinks: links
      .filter((link) => JIMA_FILE_URL_PATTERN.test(`${link.text} ${link.url}`))
      .slice(0, JIMA_CONTEXT_LIMITS.fileLinks)
  };

  return {
    ok: true,
    assignmentDetail: {
      title: detailContext.pageTitle,
      url: detailContext.currentUrl,
      status: detectJimaSubmissionStatus(textPreview),
      dates: structuredDates,
      dateDiagnostics: {
        matchedDateLabels: Object.values(structuredDates).filter(Boolean).length,
        detailLinesPreview: detailLines.slice(0, 12)
      },
      dueDates: [
        ...structuredJimaDatesToCandidates(structuredDates),
        ...detectJimaDeadlineCandidates(detailContext)
      ].slice(0, JIMA_DETECTION_LIMITS.deadlineCandidates),
      files: fileCandidates,
      instructionsPreview: getJimaInstructionPreview(textPreview),
      textPreview,
      headings
    }
  };
}

if (chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "JIMA_GET_MOODLE_CONTEXT" && message?.type !== "JIMA_INSPECT_ASSIGNMENT_DETAIL") {
      return false;
    }

    try {
      sendResponse(
        message.type === "JIMA_INSPECT_ASSIGNMENT_DETAIL"
          ? extractJimaAssignmentDetail()
          : extractJimaMoodleContext()
      );
    } catch (error) {
      sendResponse({
        ok: false,
        error: error?.message || "Jima could not extract page context."
      });
    }

    return false;
  });
}


async function getCourses() {
  if (globalThis.CoursesStore) return globalThis.CoursesStore.getLocalCourses();
  const data = await chrome.storage.local.get(STORAGE_COURSES_KEY);
  return data[STORAGE_COURSES_KEY] || {};
}

async function setCourses(courses) {
  if (globalThis.CoursesStore) return globalThis.CoursesStore.setLocalCourses(courses);
  await chrome.storage.local.set({ [STORAGE_COURSES_KEY]: courses });
}

async function getCoursesWithSeed() {
  if (globalThis.CoursesStore) return globalThis.CoursesStore.getCoursesWithSeed();

  // Fallback if the shared store script is unavailable.
  let courses = await getCourses();
  if (Object.keys(courses).length === 0) {
    courses = { ...globalThis.DEFAULT_COURSES };
    await setCourses(courses);
    return courses;
  }
  if (typeof globalThis.upgradeStoredCourses === "function") {
    const { courses: upgraded, changed } = globalThis.upgradeStoredCourses(courses);
    if (changed) await setCourses(upgraded);
    return upgraded;
  }
  return courses;
}

async function getProfile() {
  const data = await chrome.storage.local.get(STORAGE_PROFILE_KEY);
  return { ...DEFAULT_PROFILE, ...(data[STORAGE_PROFILE_KEY] || {}) };
}

function fireInputEvents(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function setIfEmpty(el, value) {
  if (!el) return false;
  const current = (el.value || "").trim();
  if (current.length > 0) return false;
  el.value = value;
  fireInputEvents(el);
  return true;
}

function findUsernameField(root = document) {
  const exactMatch = root.querySelector('#login_username, input[name="username"], input[autocomplete="username"]');
  if (exactMatch) return exactMatch;

  const candidates = [
    'input#username',
    'input[type="email"]',
    'input[name="user"]',
    'input[name*="user" i]',
    'input[id*="user" i]'
  ];
  for (const sel of candidates) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function normText(s) {
  return (s || "")
    .replace(/\s+/g, " ")
    .replace(/[\u05F4"""]/g, '"')
    .trim()
    .toLowerCase();
}

function labelTextForInput(input) {
  const id = input.getAttribute("id");
  if (id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (lbl) return normText(lbl.textContent);
  }

  const parentLabel = input.closest("label");
  if (parentLabel) return normText(parentLabel.textContent);

  const ariaLabel = input.getAttribute("aria-label");
  if (ariaLabel) return normText(ariaLabel);

  const ariaLabelledBy = input.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const el = document.getElementById(ariaLabelledBy);
    if (el) return normText(el.textContent);
  }

  return "";
}

function inputHintText(input) {
  const placeholder = input.getAttribute("placeholder");
  const name = input.getAttribute("name");
  const id = input.getAttribute("id");

  return normText(
    [placeholder, name, id, input.getAttribute("autocomplete"), input.getAttribute("inputmode")]
      .filter(Boolean)
      .join(" ")
  );
}

function looksLikeIdLabel(text) {
  return (
    text.includes("\u05EA.\u05D6") ||
    text.includes("\u05EA\u05F4\u05D6") ||
    text.includes("\u05EA\u05D6") ||
    text.includes("\u05EA\u05E2\u05D5\u05D3\u05EA \u05D6\u05D4\u05D5\u05EA") ||
    text.includes("\u05D3\u05E8\u05DB\u05D5\u05DF") ||
    text.includes("\u05EA.\u05D6/\u05D3\u05E8\u05DB\u05D5\u05DF") ||
    text.includes("\u05EA\u05D6/\u05D3\u05E8\u05DB\u05D5\u05DF") ||
    text.includes("passport") ||
    text.includes("id number") ||
    text.includes("identity")
  );
}

function isFillableInput(input) {
  if (!input) return false;
  if (input.disabled || input.readOnly) return false;
  const type = (input.getAttribute("type") || "").toLowerCase();
  if (type === "password") return false;
  return type === "" || type === "text" || type === "tel" || type === "number" || type === "email";
}

function findIdField() {
  const inputs = Array.from(document.querySelectorAll("input")).filter(isFillableInput);

  for (const input of inputs) {
    const lblText = labelTextForInput(input);
    if (looksLikeIdLabel(lblText)) return input;
  }

  for (const input of inputs) {
    const hint = inputHintText(input);
    if (looksLikeIdLabel(hint)) return input;
  }

  const byMaxLen = inputs.find((i) => {
    const ml = i.maxLength || Number(i.getAttribute("maxlength")) || 0;
    const pattern = normText(i.getAttribute("pattern"));
    return ml === 9 || pattern.includes("\\d{9}") || pattern.includes("[0-9]{9}");
  });
  if (byMaxLen) return byMaxLen;

  return null;
}

async function tryAutofill() {
  const profile = await getProfile();
  if (profile.autofillEnabled === false) return;

  const username = (profile.usernameShort || "").trim();
  const studentId = (profile.studentId || "").trim();
  if (!username && !studentId) return;

  const userEl = findUsernameField();
  const idEl = findIdField();

  if (username) setIfEmpty(userEl, username);
  if (studentId) setIfEmpty(idEl, studentId);
}

function scheduleAutofill() {
  tryAutofill();
  setTimeout(tryAutofill, 600);
  setTimeout(tryAutofill, 1500);
}

async function findCourse(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const courses = await getCoursesWithSeed();
  const entries = Object.entries(courses);

  const exact = entries.find(([name]) => name.toLowerCase() === normalized);
  if (exact) return exact;

  return entries.find(([name]) => name.toLowerCase().includes(normalized)) || null;
}

function sanitizeCourseName(name) {
  return (name || "")
    .replace(/\s+/g, " ")
    .replace(/\s*[|>-]\s*$/g, "")
    .trim();
}

function isWeakSuggestedName(name) {
  const normalized = normText(name);
  if (!normalized || normalized.length < 2) return true;

  return (
    normalized === "\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA" ||
    normalized === "\u05D4\u05EA\u05E8\u05D0\u05D4" ||
    normalized === "home" ||
    normalized === "alert" ||
    normalized === "moodle"
  );
}

function getCourseIdFromUrl(url) {
  try {
    const parsed = new URL(url, location.origin);
    if (parsed.pathname.endsWith("/course/view.php")) {
      return parsed.searchParams.get("id");
    }
  } catch {}

  return null;
}

function getCourseIdFromPage() {
  try {
    const configuredId = Number(globalThis.M?.cfg?.courseId);
    if (configuredId > 1) return String(configuredId);
  } catch {}

  const bodyMatch = document.body?.className.match(/\bcourse-(\d+)\b/);
  if (bodyMatch && bodyMatch[1] !== "1") return bodyMatch[1];

  return null;
}

function normalizeSaveUrl(url) {
  try {
    const parsed = new URL(url, location.origin);
    parsed.hash = "";

    const courseId = getCourseIdFromUrl(parsed.toString());
    if (courseId) {
      return `${parsed.origin}${parsed.pathname}?id=${encodeURIComponent(courseId)}`;
    }

    return parsed.toString();
  } catch {
    return location.href.split("#")[0];
  }
}

function getCandidateCourseLinks() {
  return Array.from(
    document.querySelectorAll(
      [
        "#page-navbar a[href*='/course/view.php?id=']",
        ".breadcrumb a[href*='/course/view.php?id=']",
        "#page-header a[href*='/course/view.php?id=']",
        "a[href*='/course/view.php?id=']"
      ].join(", ")
    )
  ).filter((link) => link instanceof HTMLAnchorElement && !!link.href);
}

function getBestCourseLink() {
  const pageCourseId = getCourseIdFromPage();
  const links = getCandidateCourseLinks();

  if (pageCourseId) {
    const matchingLink = links.find((link) => getCourseIdFromUrl(link.href) === pageCourseId);
    if (matchingLink) return matchingLink;
  }

  return links[0] || null;
}

function getCurrentRelevantUrl() {
  const isMoodleHost = location.hostname === "moodle.bgu.ac.il";
  if (!isMoodleHost) {
    return normalizeSaveUrl(location.href);
  }

  const currentCourseId = getCourseIdFromUrl(location.href);
  if (currentCourseId) {
    return normalizeSaveUrl(location.href);
  }

  const courseLink = getBestCourseLink();
  if (courseLink) {
    return normalizeSaveUrl(courseLink.href);
  }

  const pageCourseId = getCourseIdFromPage();
  if (pageCourseId) {
    return `${location.origin}/moodle/course/view.php?id=${encodeURIComponent(pageCourseId)}`;
  }

  return normalizeSaveUrl(location.href);
}

function getSuggestedCourseName() {
  const courseLink = getBestCourseLink();
  const candidates = [
    courseLink?.textContent,
    document.querySelector(".page-context-header h1")?.textContent,
    document.querySelector("#page-header h1")?.textContent,
    document.querySelector("h1")?.textContent,
    document.querySelector(".breadcrumb li:last-child")?.textContent,
    document.title.split("|")[0]
  ];

  for (const candidate of candidates) {
    const sanitized = sanitizeCourseName(candidate);
    if (!isWeakSuggestedName(sanitized)) {
      return sanitized;
    }
  }

  const pageCourseId = getCourseIdFromPage();
  if (pageCourseId) {
    return `Course ${pageCourseId}`;
  }

  return sanitizeCourseName(document.title) || "";
}

function findSavedCourseByUrl(courses, url) {
  return Object.entries(courses).find(([, savedUrl]) => normalizeSaveUrl(savedUrl) === url) || null;
}

function isCurrentUrlSaved(courses, url) {
  return !!findSavedCourseByUrl(courses, url);
}

async function saveCurrentPage(name, url) {
  const courseName = sanitizeCourseName(name);
  if (!courseName) {
    return { type: "error", text: "Please enter a name." };
  }

  const courses = await getCoursesWithSeed();
  const existingByUrl = findSavedCourseByUrl(courses, url);
  if (existingByUrl) {
    const [savedName] = existingByUrl;
    return { type: "error", text: `This page is already saved as "${savedName}".`, savedName };
  }

  const existingUrlByName = courses[courseName];
  if (existingUrlByName && normalizeSaveUrl(existingUrlByName) !== url) {
    return {
      type: "error",
      text: `The name "${courseName}" is already used. Please choose another name.`
    };
  }

  courses[courseName] = url;
  await setCourses(courses);

  return {
    type: "success",
    text: `Saved "${courseName}".`,
    savedName: courseName,
    savedUrl: url
  };
}

function setInlineMessage(el, text, type = "") {
  if (!el) return;

  const colors = {
    success: UI_COLORS.success,
    error: UI_COLORS.error,
    muted: UI_COLORS.textSoft
  };

  el.textContent = text;
  el.style.color = colors[type] || UI_COLORS.text;
}

function updateSaveWidgetState(button, isSaved) {
  button.disabled = isSaved;
  button.textContent = isSaved ? "Saved" : "Save";
  button.style.background = isSaved ? UI_COLORS.success : UI_COLORS.accent;
  button.style.boxShadow = isSaved
    ? `0 10px 28px ${UI_COLORS.successShadow}`
    : `0 10px 28px ${UI_COLORS.accentShadow}`;
  button.style.cursor = isSaved ? "not-allowed" : "pointer";
  button.style.opacity = isSaved ? "0.92" : "1";
  button.setAttribute("aria-disabled", isSaved ? "true" : "false");
}

async function refreshSaveWidgetState(button, input, messageEl) {
  const courses = await getCoursesWithSeed();
  const currentUrl = getCurrentRelevantUrl();
  const existingEntry = isCurrentUrlSaved(courses, currentUrl)
    ? findSavedCourseByUrl(courses, currentUrl)
    : null;

  if (existingEntry) {
    const [savedName] = existingEntry;
    updateSaveWidgetState(button, true);
    button.dataset.savedName = savedName;
    if (messageEl) {
      setInlineMessage(messageEl, `Already saved as "${savedName}".`, "muted");
    }
    if (input && !input.value.trim()) {
      input.value = savedName;
    }
    return existingEntry;
  }

  updateSaveWidgetState(button, false);
  delete button.dataset.savedName;
  if (messageEl && !messageEl.textContent) {
    setInlineMessage(messageEl, "", "");
  }
  return null;
}

function attachSaveWidget() {
  if (document.getElementById("bgu-companion-save-widget")) return;

  const root = document.createElement("div");
  root.id = "bgu-companion-save-widget";
  root.dir = "rtl";
  root.style.position = "fixed";
  root.style.left = "20px";
  root.style.bottom = "20px";
  root.style.zIndex = "9999";
  root.style.fontFamily = "system-ui, sans-serif";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Save";
  button.style.border = "none";
  button.style.borderRadius = "999px";
  button.style.padding = "10px 14px";
  button.style.background = UI_COLORS.accent;
  button.style.color = "#ffffff";
  button.style.boxShadow = `0 10px 28px ${UI_COLORS.accentShadow}`;
  button.style.cursor = "pointer";
  button.style.fontSize = "14px";
  button.style.fontWeight = "600";

  const panel = document.createElement("div");
  panel.hidden = true;
  panel.style.position = "absolute";
  panel.style.left = "0";
  panel.style.bottom = "52px";
  panel.style.width = "280px";
  panel.style.padding = "14px";
  panel.style.borderRadius = "14px";
  panel.style.background = "#ffffff";
  panel.style.boxShadow = `0 18px 40px ${UI_COLORS.panelShadow}`;
  panel.style.border = `1px solid ${UI_COLORS.border}`;

  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.alignItems = "center";
  titleRow.style.justifyContent = "space-between";
  titleRow.style.gap = "8px";
  titleRow.style.marginBottom = "10px";

  const title = document.createElement("div");
  title.textContent = "Save to BGU Companion";
  title.style.fontSize = "14px";
  title.style.fontWeight = "700";
  title.style.color = UI_COLORS.text;

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "x";
  closeBtn.style.border = "none";
  closeBtn.style.background = "transparent";
  closeBtn.style.color = UI_COLORS.textMuted;
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "18px";
  closeBtn.style.lineHeight = "1";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Course name";
  input.style.width = "100%";
  input.style.boxSizing = "border-box";
  input.style.padding = "10px 12px";
  input.style.borderRadius = "10px";
  input.style.border = `1px solid ${UI_COLORS.border}`;
  input.style.marginBottom = "10px";
  input.style.fontSize = "14px";
  input.style.outline = "none";

  const urlHint = document.createElement("div");
  urlHint.style.fontSize = "12px";
  urlHint.style.color = UI_COLORS.textMuted;
  urlHint.style.marginBottom = "10px";
  urlHint.style.lineHeight = "1.4";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-start";
  actions.style.gap = "8px";
  actions.style.marginBottom = "8px";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save";
  saveBtn.style.border = "none";
  saveBtn.style.borderRadius = "10px";
  saveBtn.style.padding = "9px 12px";
  saveBtn.style.background = UI_COLORS.accent;
  saveBtn.style.color = "#ffffff";
  saveBtn.style.cursor = "pointer";
  saveBtn.style.fontWeight = "600";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.border = `1px solid ${UI_COLORS.border}`;
  cancelBtn.style.borderRadius = "10px";
  cancelBtn.style.padding = "9px 12px";
  cancelBtn.style.background = "#ffffff";
  cancelBtn.style.color = UI_COLORS.text;
  cancelBtn.style.cursor = "pointer";

  const messageEl = document.createElement("div");
  messageEl.style.minHeight = "18px";
  messageEl.style.fontSize = "12px";
  messageEl.style.lineHeight = "1.4";
  let closeTimer = 0;

  input.addEventListener("focus", () => {
    input.style.borderColor = UI_COLORS.accent;
    input.style.boxShadow = "0 0 0 3px rgba(249, 115, 22, 0.14)";
  });

  input.addEventListener("blur", () => {
    input.style.borderColor = UI_COLORS.border;
    input.style.boxShadow = "none";
  });

  function closePanel() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = 0;
    }
    panel.hidden = true;
  }

  async function openSaveDialog() {
    panel.hidden = false;
    const savedEntry = await refreshSaveWidgetState(button, input, messageEl);
    if (!savedEntry) {
      input.value = getSuggestedCourseName();
      setInlineMessage(messageEl, "", "");
    }
    urlHint.textContent = getCurrentRelevantUrl();
    input.focus();
    input.select();
  }

  async function handleSave() {
    const currentUrl = getCurrentRelevantUrl();
    const result = await saveCurrentPage(input.value, currentUrl);
    setInlineMessage(messageEl, result.text, result.type);

    if (result.savedName) {
      input.value = result.savedName;
    }

    const savedEntry = await refreshSaveWidgetState(button, input, messageEl);
    if (savedEntry && result.type === "success") {
      closeTimer = setTimeout(() => {
        closePanel();
      }, 1200);
    }
  }

  button.addEventListener("click", async () => {
    if (button.disabled) return;

    if (panel.hidden) {
      await openSaveDialog();
      return;
    }

    closePanel();
  });

  closeBtn.addEventListener("click", closePanel);
  cancelBtn.addEventListener("click", closePanel);
  saveBtn.addEventListener("click", () => handleSave());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSave();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
    }
  });

  document.addEventListener("click", (event) => {
    if (!panel.hidden && !root.contains(event.target)) {
      closePanel();
    }
  });

  titleRow.appendChild(title);
  titleRow.appendChild(closeBtn);
  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  panel.appendChild(titleRow);
  panel.appendChild(input);
  panel.appendChild(urlHint);
  panel.appendChild(actions);
  panel.appendChild(messageEl);
  root.appendChild(panel);
  root.appendChild(button);
  document.body.appendChild(root);

  refreshSaveWidgetState(button, input, messageEl);

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[STORAGE_COURSES_KEY]) return;
      refreshSaveWidgetState(button, input, messageEl);
    });
  }
}

const PENDING_COURSE_KEY = "pendingCourseTarget";
const PENDING_COURSE_MAX_AGE_MS = 5 * 60 * 1000;
const PENDING_COURSE_MAX_ATTEMPTS = 3;
const MOODLE_LOGIN_PATH = "/moodle/login/index.php";

function isLoggedInMoodle() {
  const body = document.body;
  if (body?.classList.contains("notloggedin")) return false;
  if (body?.classList.contains("userloggedin")) return true;
  const uid = Number(globalThis.M?.cfg?.userId || 0);
  if (uid > 1) return true; // guest is typically 0 or 1
  return !!document.querySelector('a[href*="/login/logout.php"]');
}

function isMoodleLandingOrLogin() {
  const path = location.pathname;
  return (
    path.endsWith("/login/index.php") ||
    path.includes("/local/mydashboard") ||
    path === "/moodle/" ||
    path === "/moodle"
  );
}

// When Moodle bounces a course click to the login / landing page (e.g. an
// expired session), resume to the originally requested course once the user
// has authenticated. Guarded by an attempt counter to avoid redirect loops.
async function maybeResumePendingCourse() {
  if (location.hostname !== "moodle.bgu.ac.il" || !chrome.storage?.local) return;

  let data;
  try {
    data = await chrome.storage.local.get(PENDING_COURSE_KEY);
  } catch {
    return;
  }

  const pending = data[PENDING_COURSE_KEY];
  if (!pending || !pending.url) return;

  if (Date.now() - Number(pending.ts || 0) > PENDING_COURSE_MAX_AGE_MS) {
    chrome.storage.local.remove(PENDING_COURSE_KEY);
    return;
  }

  const targetUrl =
    typeof globalThis.migrateCourseUrl === "function"
      ? globalThis.migrateCourseUrl(pending.url)
      : pending.url;
  const targetId = getCourseIdFromUrl(targetUrl);
  const hereId = getCourseIdFromUrl(location.href) || getCourseIdFromPage();
  const loggedIn = isLoggedInMoodle();
  const onLoginPage = location.pathname.endsWith(MOODLE_LOGIN_PATH);

  // Arrived at the intended course while authenticated → done.
  if (loggedIn && targetId && String(hereId) === String(targetId)) {
    chrome.storage.local.remove(PENDING_COURSE_KEY);
    return;
  }

  // Loop guard: give up after a few hops rather than bouncing forever.
  if (Number(pending.attempts || 0) >= PENDING_COURSE_MAX_ATTEMPTS) {
    chrome.storage.local.remove(PENDING_COURSE_KEY);
    return;
  }

  async function bumpAttemptsAndGo(destUrl) {
    pending.attempts = Number(pending.attempts || 0) + 1;
    try {
      await chrome.storage.local.set({ [PENDING_COURSE_KEY]: pending });
    } catch {}
    location.replace(destUrl);
  }

  if (!loggedIn) {
    // A logged-out course click lands on BGU's dead landing / "course not
    // available" notice page. Skip it entirely and send the user straight to
    // the login form (the username field is autofilled). pendingCourseTarget
    // is preserved so we forward into the course right after they sign in.
    if (!onLoginPage) {
      await bumpAttemptsAndGo(`${location.origin}${MOODLE_LOGIN_PATH}`);
    }
    return;
  }

  // Authenticated but stranded on the landing / dashboard / login page →
  // forward to the originally requested course.
  if (isMoodleLandingOrLogin()) {
    await bumpAttemptsAndGo(targetUrl);
  }
}

function run() {
  scheduleAutofill();
  maybeResumePendingCourse();

  if (
    location.hostname === "moodle.bgu.ac.il" ||
    location.hostname === "gezer1.bgu.ac.il" ||
    location.hostname === "bgu4u22.bgu.ac.il" ||
    location.hostname === "bgu4u.bgu.ac.il"
  ) {
    attachSaveWidget();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
