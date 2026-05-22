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

let latestPageContext = null;
let latestDetections = null;
let latestFileCandidates = [];
let latestHomeworkCandidates = [];
let latestSavedTasks = [];

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

function setDownloadLoading(isLoading) {
  if (!downloadSelectedBtn) return;
  downloadSelectedBtn.disabled = isLoading || getSelectedFileCandidates().length === 0;
  downloadSelectedBtn.textContent = isLoading ? "Starting downloads..." : "Download selected files";
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

function appendTaskAction(item, candidate, index) {
  const actions = document.createElement("div");
  actions.className = "candidate-actions";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "task-action-btn save-task-btn";
  button.dataset.candidateIndex = String(index);

  const draft = globalThis.JimaTasks?.createTaskFromCandidate(candidate, latestPageContext || {});
  const isSaved = draft
    ? latestSavedTasks.some((task) => globalThis.JimaTasks.isDuplicateTask(task, draft))
    : false;

  button.textContent = isSaved ? "Saved" : "Save task";
  button.disabled = isSaved || !globalThis.JimaTasks;
  actions.appendChild(button);
  item.appendChild(actions);
}

function getSelectedFileCandidates() {
  if (!filesList) return [];

  return Array.from(filesList.querySelectorAll(".file-select-input:checked"))
    .map((input) => latestFileCandidates[Number(input.dataset.fileIndex)])
    .filter((candidate) => candidate?.url);
}

function updateDownloadButtonState() {
  if (!downloadSelectedBtn) return;

  const selectedCount = getSelectedFileCandidates().length;
  downloadSelectedBtn.disabled = selectedCount === 0;
  downloadSelectedBtn.textContent = selectedCount > 0
    ? `Download selected files (${selectedCount})`
    : "Download selected files";
}

function createFileCandidateCard(candidate, index) {
  const item = document.createElement("li");
  item.className = "candidate-card file-candidate-card";

  const selectWrapper = document.createElement("label");
  selectWrapper.className = "file-select";
  selectWrapper.setAttribute("aria-label", `Select ${candidate.name || "Moodle file"} for download`);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "file-select-input";
  checkbox.dataset.fileIndex = String(index);
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
  latestHomeworkCandidates = candidates;
  homeworkCount.textContent = `(${candidates.length})`;

  if (candidates.length === 0) {
    appendEmptyRow(homeworkList, "I did not find clear homework candidates in the visible page text.");
    return;
  }

  for (const [index, candidate] of candidates.entries()) {
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
  updateDownloadButtonState();

  if (candidates.length === 0) {
    appendEmptyRow(filesList, "No Moodle file links were detected on this page.");
    latestFileCandidates = [];
    downloadControls.hidden = true;
    return;
  }

  for (const [index, candidate] of latestFileCandidates.entries()) {
    filesList.appendChild(createFileCandidateCard(candidate, index));
  }

  if (latestFileCandidates.length === 0) {
    appendEmptyRow(filesList, "File-like items were found, but none had downloadable Moodle URLs.");
    downloadControls.hidden = true;
    return;
  }

  updateDownloadButtonState();
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

  const actions = document.createElement("div");
  actions.className = "saved-task-actions";

  const openUrl = task.candidateUrl || task.sourceUrl;
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

  const task = globalThis.JimaTasks.createTaskFromCandidate(candidate, latestPageContext || {});
  const result = await globalThis.JimaTasks.saveTask(task);
  latestSavedTasks = result.tasks;
  renderSavedTasks(latestSavedTasks);
  renderHomeworkCandidates(latestHomeworkCandidates);
  setSavedTasksStatus(result.duplicate ? "This possible task was already saved." : "Saved possible task locally.", "success");
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
  latestHomeworkCandidates = [];
  setLoading(true);
  previewPanel.hidden = true;
  downloadControls.hidden = true;
  aiPanel.hidden = true;
  aiResults.hidden = true;
  setDownloadStatus("", "");
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

function renderDownloadResult(response) {
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

  setDownloadStatus(message, started > 0 && failed === 0 ? "success" : "error");
}

function downloadSelectedFiles() {
  const selectedFiles = getSelectedFileCandidates();
  if (selectedFiles.length === 0) {
    setDownloadStatus("Select at least one file before downloading.", "error");
    updateDownloadButtonState();
    return;
  }

  setDownloadLoading(true);
  setDownloadStatus("Starting selected downloads in Chrome...", "active");

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
      setDownloadLoading(false);
      updateDownloadButtonState();

      if (chrome.runtime.lastError) {
        setDownloadStatus(chrome.runtime.lastError.message || "Jima could not start downloads.", "error");
        return;
      }

      renderDownloadResult(response || {});
    }
  );
}

if (analyzePageBtn) {
  analyzePageBtn.addEventListener("click", analyzeCurrentPage);
}

if (homeworkList) {
  homeworkList.addEventListener("click", (event) => {
    const button = event.target?.closest?.(".save-task-btn");
    if (button) {
      saveHomeworkCandidate(button.dataset.candidateIndex).catch(() => {
        setSavedTasksStatus("Could not save this possible task.", "error");
      });
    }
  });
}

if (askAiBtn) {
  askAiBtn.addEventListener("click", askJimaWithAi);
}

if (filesList) {
  filesList.addEventListener("change", (event) => {
    if (event.target?.classList?.contains("file-select-input")) {
      updateDownloadButtonState();
      setDownloadStatus("", "");
    }
  });
}

if (downloadSelectedBtn) {
  downloadSelectedBtn.addEventListener("click", downloadSelectedFiles);
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

refreshSavedTasks().catch(() => {
  setSavedTasksStatus("Could not load saved tasks.", "error");
});
