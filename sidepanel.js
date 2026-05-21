const DEFAULT_AI_QUESTION =
  "What homework, deadlines, files, and next actions are visible on this Moodle page?";

const analyzePageBtn = document.getElementById("analyzePageBtn");
const statusMessage = document.getElementById("statusMessage");
const previewPanel = document.getElementById("previewPanel");
const previewMeta = document.getElementById("previewMeta");
const previewTitle = document.getElementById("previewTitle");
const previewUrl = document.getElementById("previewUrl");
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

let latestPageContext = null;
let latestDetections = null;

function setStatus(text, type = "") {
  if (!statusMessage) return;
  statusMessage.textContent = text;
  statusMessage.className = `status-message${type ? ` is-${type}` : ""}`;
}

function setAiStatus(text, type = "") {
  if (!aiStatusMessage) return;
  aiStatusMessage.textContent = text;
  aiStatusMessage.className = `status-message${type ? ` is-${type}` : ""}`;
}

function setLoading(isLoading) {
  if (!analyzePageBtn) return;
  analyzePageBtn.disabled = isLoading;
  analyzePageBtn.textContent = isLoading ? "Analyzing locally..." : "Analyze current Moodle page";
}

function setAiLoading(isLoading) {
  if (!askAiBtn) return;
  askAiBtn.disabled = isLoading;
  askAiBtn.textContent = isLoading ? "Asking local backend..." : "Ask Jima with AI";
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
  homeworkCount.textContent = `(${candidates.length})`;

  if (candidates.length === 0) {
    appendEmptyRow(homeworkList, "I did not find clear homework candidates in the visible page text.");
    return;
  }

  for (const candidate of candidates) {
    const item = createCandidateCard(candidate.title || "Possible homework", candidate.confidence, candidate.url);
    appendCandidateText(item, "candidate-meta", candidate.type ? `Type: ${candidate.type}` : "");
    appendCandidateText(item, "candidate-evidence", candidate.evidence ? `Evidence: ${candidate.evidence}` : "");
    appendCandidateText(item, "candidate-uncertainty", candidate.uncertainty);
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
  filesCount.textContent = `(${candidates.length})`;

  if (candidates.length === 0) {
    appendEmptyRow(filesList, "No Moodle file links were detected on this page.");
    return;
  }

  for (const candidate of candidates) {
    const item = createCandidateCard(candidate.name || "Moodle file", candidate.confidence, candidate.url);
    appendCandidateText(item, "candidate-meta", candidate.fileType ? `File type: ${candidate.fileType}` : "");
    appendCandidateText(item, "candidate-evidence", candidate.evidence ? `Evidence: ${candidate.evidence}` : "");
    filesList.appendChild(item);
  }
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

  previewPanel.hidden = false;
  aiPanel.hidden = false;
  aiResults.hidden = true;
  setAiStatus("", "");
  setStatus("This detection is rule-based and stays local. Use the AI button only if you want to send this extracted context to your local backend.", "success");
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
  aiSummary.textContent = analysis.summary || "Jima returned no summary.";
  renderAiAssignments(analysis.assignments || []);
  renderAiDates(analysis.dates || []);
  renderAiFiles(analysis.files || []);
  renderPlainList(aiNextActions, analysis.nextActions || [], "No next actions were returned.");
  renderPlainList(aiUncertainties, analysis.uncertainties || [], "No extra uncertainties were returned.");
  aiResults.hidden = false;
}

function analyzeCurrentPage() {
  if (!chrome.runtime?.sendMessage) {
    setStatus("Jima messaging is not available in this browser context.", "error");
    return;
  }

  latestPageContext = null;
  latestDetections = null;
  setLoading(true);
  previewPanel.hidden = true;
  aiPanel.hidden = true;
  aiResults.hidden = true;
  setStatus("Reading visible Moodle context locally...", "active");

  chrome.runtime.sendMessage({ type: "JIMA_ANALYZE_CURRENT_PAGE" }, (response) => {
    setLoading(false);

    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message || "Jima could not analyze this page.", "error");
      return;
    }

    if (!response?.ok) {
      setStatus(response?.error || "Jima could not analyze this page.", "error");
      return;
    }

    renderContext(response.pageContext || response.context || {}, response.detections || {});
  });
}

function askJimaWithAi() {
  if (!latestPageContext) {
    setAiStatus("Run local analysis first, then ask Jima with AI.", "error");
    return;
  }

  const userQuestion = aiQuestionInput?.value.trim() || DEFAULT_AI_QUESTION;
  setAiLoading(true);
  aiResults.hidden = true;
  setAiStatus("Sending extracted context to your local Jima backend...", "active");

  chrome.runtime.sendMessage(
    {
      type: "JIMA_ANALYZE_WITH_AI",
      pageContext: latestPageContext,
      detections: latestDetections || {},
      userQuestion
    },
    (response) => {
      setAiLoading(false);

      if (chrome.runtime.lastError) {
        setAiStatus(chrome.runtime.lastError.message || "Jima AI request failed.", "error");
        return;
      }

      if (!response?.ok) {
        setAiStatus(response?.error || "Jima AI request failed.", "error");
        return;
      }

      renderAiAnalysis(response.analysis || {});
      setAiStatus("AI analysis returned from your local backend.", "success");
    }
  );
}

if (analyzePageBtn) {
  analyzePageBtn.addEventListener("click", analyzeCurrentPage);
}

if (askAiBtn) {
  askAiBtn.addEventListener("click", askJimaWithAi);
}
