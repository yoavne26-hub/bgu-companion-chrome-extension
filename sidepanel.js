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

function setStatus(text, type = "") {
  if (!statusMessage) return;
  statusMessage.textContent = text;
  statusMessage.className = `status-message${type ? ` is-${type}` : ""}`;
}

function setLoading(isLoading) {
  if (!analyzePageBtn) return;
  analyzePageBtn.disabled = isLoading;
  analyzePageBtn.textContent = isLoading ? "Analyzing locally..." : "Analyze current Moodle page";
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

  previewTitle.textContent = pageContext.pageTitle || pageContext.documentTitle || "Untitled Moodle page";
  previewUrl.href = pageContext.currentUrl || "#";
  previewUrl.textContent = pageContext.currentUrl || "No URL available";
  previewMeta.textContent = `${links.length} links`;
  textPreview.textContent = pageContext.visibleTextPreview || "No visible text preview was returned.";

  renderDetections(detections);
  renderHeadings(headings);
  renderFileLinks(fileLinks);

  previewPanel.hidden = false;
  setStatus("This detection is rule-based and stays local. AI analysis will be added in a later phase.", "success");
}

function analyzeCurrentPage() {
  if (!chrome.runtime?.sendMessage) {
    setStatus("Jima messaging is not available in this browser context.", "error");
    return;
  }

  setLoading(true);
  previewPanel.hidden = true;
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

if (analyzePageBtn) {
  analyzePageBtn.addEventListener("click", analyzeCurrentPage);
}
