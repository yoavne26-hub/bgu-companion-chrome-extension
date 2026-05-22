const DEFAULT_AI_QUESTION =
  "What homework, deadlines, files, and next actions are visible on this Moodle page?";

const courseQueryInput = document.getElementById("courseQueryInput");
const findCourseBtn = document.getElementById("findCourseBtn");
const courseQueryStatus = document.getElementById("courseQueryStatus");
const courseMatchesList = document.getElementById("courseMatchesList");
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

const jimaSessionMemory = {
  latestAnalyzedCoursePageContext: null,
  latestHomeworkCandidates: [],
  latestCourseFileCandidates: [],
  latestInspectedAssignmentDetail: null,
  latestAssignmentFiles: [],
  latestActiveAssignmentTitle: "",
  latestAiResponse: null
};

const JIMA_FOLLOWUP_DOWNLOAD_PATTERN = /(download|save|get)\b.*\b(file|files|pdf|homework|assignment)|\b(file|files|pdf|homework|assignment)\b.*\b(download|save|get)|\u05d4\u05d5\u05e8\u05d3\s+\u05e7\u05d5\u05d1\u05e5|\u05ea\u05d5\u05e8\u05d9\u05d3\s+\u05e7\u05d5\u05d1\u05e5|\u05dc\u05d4\u05d5\u05e8\u05d9\u05d3\s+\u05d0\u05ea\s+\u05d4\u05e7\u05d5\u05d1\u05e5|\u05e7\u05d5\u05d1\u05e5\s+\u05d4\u05de\u05d8\u05dc\u05d4|\u05e7\u05d5\u05d1\u05e5\s+\u05e9\u05d9\u05e2\u05d5\u05e8\u05d9\s+\u05d4\u05d1\u05d9\u05ea/i;
const JIMA_FOLLOWUP_SHOW_FILES_PATTERN = /(show|list|what|which).*\b(file|files|pdf|resources?)\b|\b(file|files|resources?)\b.*(found|available|show|list)|\u05de\u05d4\s+\u05d4\u05e7\u05d1\u05e6\u05d9\u05dd|\u05d0\u05d9\u05dc\u05d5\s+\u05e7\u05d1\u05e6\u05d9\u05dd|\u05d4\u05e6\u05d2\s+\u05e7\u05d1\u05e6\u05d9\u05dd|\u05ea\u05e8\u05d0\u05d4\s+\u05e7\u05d1\u05e6\u05d9\u05dd/i;

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
  const homeworkCountValue = (detections.homeworkCandidates || []).length;
  const dateCountValue = (detections.deadlineCandidates || []).length;
  const fileCountValue = (detections.fileCandidates || []).length;
  const pageLabel = getPageTitleForSummary(pageContext, courseName);

  const homeworkSentence = homeworkCountValue > 0
    ? `I found ${countLabel(homeworkCountValue, "possible homework item")}`
    : "I did not find clear homework candidates in the visible page text";
  const summary = `I checked the visible Moodle page for ${pageLabel}. ${homeworkSentence}. I also found ${countOrNone(dateCountValue, "date clue")} and ${countOrNone(fileCountValue, "file resource")}. I cannot confirm whether homework was submitted from the course page alone.`;
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
  }

  return { summary, bullets };
}

function buildAssignmentDetailLocalSummary(detail = {}, extraBullet = "") {
  const title = detail.title || latestActiveAssignmentTitle || "this assignment";
  const statusValue = detail.status?.value || "unknown";
  const dateCountValue = (detail.dueDates || []).length;
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
}

function renderAssignmentDetailLocalAnswer(detail, extraBullet = "") {
  const answer = buildAssignmentDetailLocalSummary(detail, extraBullet);
  renderLocalAnswer(answer.summary, answer.bullets);
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
      /\/mod\/(assign|quiz|workshop|lesson|forum)\/view\.php/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
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
    const result = await globalThis.JimaCourseResolver.resolveCourses(query);
    renderCourseMatches(result.matches || [], query);
  } catch {
    setCourseQueryStatus("Jima could not search saved courses right now.", "error");
  } finally {
    setCourseQueryLoading(false);
  }
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
  clearAssignmentDetail();
  clearFollowupResults();
  clearLocalAnswer();
  aiPanel.hidden = true;
  aiResults.hidden = true;
  setCourseQueryStatus(`Opening ${match.name} and checking the visible Moodle page locally...`, "active");
  setStatus("Jima is opening one confirmed course page and running local analysis.", "active");

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
        return;
      }

      if (!response?.ok) {
        const error = response?.error || "Jima could not check this course.";
        setCourseQueryStatus(error, "error");
        setStatus(error, "error");
        return;
      }

      renderContext(response.pageContext || response.context || {}, response.detections || {});
      const homeworkCountValue = (response.detections?.homeworkCandidates || []).length;
      setCourseQueryStatus(`I checked the saved Moodle page for ${match.name}.`, "success");
      setStatus(
        `I found ${homeworkCountValue} possible homework candidate${homeworkCountValue === 1 ? "" : "s"} from the visible course page. I cannot confirm submission status from this course page; a later phase can inspect assignment detail pages after explicit action.`,
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
  const isSaved = draft
    ? latestSavedTasks.some((task) => globalThis.JimaTasks.isDuplicateTask(task, draft))
    : false;

  button.textContent = isSaved ? "Saved" : "Save task";
  button.disabled = isSaved || !globalThis.JimaTasks;
  actions.appendChild(detailButton);
  actions.appendChild(button);
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

function renderAssignmentDetailDates(dates) {
  clearList(assignmentDetailDates);

  if (!dates.length) {
    appendEmptyRow(assignmentDetailDates, "No clear due date evidence was visible on this detail page.");
    return;
  }

  for (const date of dates.slice(0, 8)) {
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
  renderAssignmentDetailDates(detail.dueDates || []);
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
  jimaSessionMemory.latestHomeworkCandidates = latestDetections.homeworkCandidates || [];
  jimaSessionMemory.latestCourseFileCandidates = latestFileCandidates;
  renderCourseLocalAnswer(pageContext, latestDetections, latestCheckedCourseName);

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
        return;
      }

      if (!response?.ok) {
        setAssignmentDetailStatus(response?.error || "Jima could not inspect this detail page.", "error");
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
    latestAiResponse: null
  });
  setLoading(true);
  previewPanel.hidden = true;
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

if (analyzePageBtn) {
  analyzePageBtn.addEventListener("click", analyzeCurrentPage);
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
  askAiBtn.addEventListener("click", askJimaWithAi);
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
  downloadSelectedBtn.addEventListener("click", () => downloadSelectedFiles("page"));
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
  downloadDetailSelectedBtn.addEventListener("click", () => downloadSelectedFiles("detail"));
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
  downloadFollowupSelectedBtn.addEventListener("click", () => downloadSelectedFiles("followup"));
}

if (cancelFollowupDownloadBtn) {
  cancelFollowupDownloadBtn.addEventListener("click", cancelFollowupDownload);
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
