const analyzePageBtn = document.getElementById("analyzePageBtn");
const statusMessage = document.getElementById("statusMessage");
const previewPanel = document.getElementById("previewPanel");
const previewMeta = document.getElementById("previewMeta");
const previewTitle = document.getElementById("previewTitle");
const previewUrl = document.getElementById("previewUrl");
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

function renderContext(context) {
  const headings = context.headings || [];
  const fileLinks = context.fileLinks || [];
  const links = context.links || [];

  previewTitle.textContent = context.pageTitle || context.documentTitle || "Untitled Moodle page";
  previewUrl.href = context.currentUrl || "#";
  previewUrl.textContent = context.currentUrl || "No URL available";
  previewMeta.textContent = `${links.length} links`;
  textPreview.textContent = context.visibleTextPreview || "No visible text preview was returned.";

  renderHeadings(headings);
  renderFileLinks(fileLinks);

  previewPanel.hidden = false;
  setStatus("This preview stays local. AI analysis will be added in a later phase.", "success");
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

    renderContext(response.context || {});
  });
}

if (analyzePageBtn) {
  analyzePageBtn.addEventListener("click", analyzeCurrentPage);
}
