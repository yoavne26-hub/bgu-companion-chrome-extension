const JIMA_SAVED_TASKS_KEY = "jimaSavedTasks";

function normalizeJimaTaskText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeJimaTaskTitle(value) {
  return normalizeJimaTaskText(value).toLowerCase();
}

function normalizeJimaTaskUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    return url.toString();
  } catch {
    return normalizeJimaTaskText(value);
  }
}

function createJimaLocalId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `jima-task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function capJimaTaskText(value, limit) {
  const text = normalizeJimaTaskText(value);
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function sanitizeJimaTaskFile(file) {
  return {
    name: capJimaTaskText(file?.name || "Moodle file", 160),
    url: normalizeJimaTaskUrl(file?.url || ""),
    fileType: capJimaTaskText(file?.fileType || "", 40),
    evidence: capJimaTaskText(file?.evidence || "", 250),
    confidence: normalizeJimaTaskText(file?.confidence || "low").toLowerCase()
  };
}

function sanitizeJimaTaskFiles(files) {
  return Array.isArray(files)
    ? files.filter((file) => file?.url).slice(0, 30).map(sanitizeJimaTaskFile)
    : [];
}

function extractJimaTaskDueDate(value) {
  const match = String(value || "").match(/\b(?:\d{1,2}[/.]\d{1,2}[/.]\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\b/);
  return match?.[0] || "";
}

function sanitizeJimaTask(task) {
  const now = new Date().toISOString();
  return {
    id: normalizeJimaTaskText(task.id) || createJimaLocalId(),
    title: capJimaTaskText(task.title || "Possible task", 160),
    type: capJimaTaskText(task.type || "possible task", 60),
    courseOrPage: capJimaTaskText(task.courseOrPage || "", 160),
    sourceUrl: normalizeJimaTaskUrl(task.sourceUrl || ""),
    candidateUrl: normalizeJimaTaskUrl(task.candidateUrl || ""),
    dueDateRaw: capJimaTaskText(task.dueDateRaw || "", 40),
    evidence: capJimaTaskText(task.evidence || "", 250),
    confidence: normalizeJimaTaskText(task.confidence || "low").toLowerCase(),
    detailUrl: normalizeJimaTaskUrl(task.detailUrl || ""),
    submissionStatus: capJimaTaskText(task.submissionStatus || "", 40),
    submissionStatusLabel: capJimaTaskText(task.submissionStatusLabel || "", 80),
    submissionEvidence: capJimaTaskText(task.submissionEvidence || "", 320),
    submissionConfidence: normalizeJimaTaskText(task.submissionConfidence || "").toLowerCase(),
    detailDueDateRaw: capJimaTaskText(task.detailDueDateRaw || "", 40),
    detailDueDateEvidence: capJimaTaskText(task.detailDueDateEvidence || "", 320),
    instructionPreview: capJimaTaskText(task.instructionPreview || "", 700),
    detailFiles: sanitizeJimaTaskFiles(task.detailFiles),
    lastInspectedAt: normalizeJimaTaskText(task.lastInspectedAt || ""),
    status: task.status === "done" ? "done" : "open",
    createdAt: normalizeJimaTaskText(task.createdAt) || now,
    updatedAt: normalizeJimaTaskText(task.updatedAt) || now
  };
}

function createJimaTaskFromCandidate(candidate, pageContext = {}) {
  const evidence = candidate?.evidence || "";
  return sanitizeJimaTask({
    title: candidate?.title || "Possible task",
    type: candidate?.type || "possible task",
    courseOrPage: pageContext.pageTitle || pageContext.documentTitle || "",
    sourceUrl: pageContext.currentUrl || pageContext.url || "",
    candidateUrl: candidate?.url || "",
    dueDateRaw: extractJimaTaskDueDate(`${candidate?.title || ""} ${evidence}`),
    evidence,
    confidence: candidate?.confidence || "low",
    status: "open"
  });
}

function createJimaTaskFromDetail(detail, pageContext = {}, candidate = {}) {
  const dueDate = Array.isArray(detail?.dueDates) ? detail.dueDates[0] : null;
  const status = detail?.status || {};
  const hasKnownStatus = status?.value && status.value !== "unknown";
  const now = new Date().toISOString();

  return sanitizeJimaTask({
    title: detail?.title || candidate?.title || "Possible task",
    type: candidate?.type || "assignment detail",
    courseOrPage: pageContext.pageTitle || pageContext.documentTitle || "",
    sourceUrl: pageContext.currentUrl || pageContext.url || "",
    candidateUrl: candidate?.url || detail?.url || "",
    dueDateRaw: dueDate?.rawDate || extractJimaTaskDueDate(`${detail?.title || ""} ${detail?.textPreview || ""}`),
    evidence: candidate?.evidence || status?.evidence || detail?.instructionsPreview || "",
    confidence: candidate?.confidence || status?.confidence || "medium",
    detailUrl: detail?.url || candidate?.url || "",
    submissionStatus: hasKnownStatus ? status.value : "",
    submissionStatusLabel: hasKnownStatus ? status.label : "",
    submissionEvidence: hasKnownStatus ? status.evidence : "",
    submissionConfidence: hasKnownStatus ? status.confidence : "",
    detailDueDateRaw: dueDate?.rawDate || "",
    detailDueDateEvidence: dueDate?.surroundingText || "",
    instructionPreview: detail?.instructionsPreview || "",
    detailFiles: detail?.files || [],
    lastInspectedAt: now,
    status: "open",
    createdAt: now,
    updatedAt: now
  });
}

function isDuplicateJimaTask(existingTask, newTask) {
  const existingTitle = normalizeJimaTaskTitle(existingTask.title);
  const newTitle = normalizeJimaTaskTitle(newTask.title);
  if (!existingTitle || existingTitle !== newTitle) return false;

  const existingSource = normalizeJimaTaskUrl(existingTask.sourceUrl);
  const newSource = normalizeJimaTaskUrl(newTask.sourceUrl);
  const existingCandidate = normalizeJimaTaskUrl(existingTask.candidateUrl);
  const newCandidate = normalizeJimaTaskUrl(newTask.candidateUrl);

  return (
    (!!existingCandidate && !!newCandidate && existingCandidate === newCandidate) ||
    (!!existingSource && !!newSource && existingSource === newSource)
  );
}

function isRelatedJimaTask(existingTask, detailTask) {
  const existing = sanitizeJimaTask(existingTask);
  const detail = sanitizeJimaTask(detailTask);
  const detailUrl = normalizeJimaTaskUrl(detail.detailUrl || detail.candidateUrl);
  const existingUrls = [
    existing.detailUrl,
    existing.candidateUrl,
    existing.sourceUrl
  ].map(normalizeJimaTaskUrl).filter(Boolean);

  if (detailUrl && existingUrls.includes(detailUrl)) return true;
  if (isDuplicateJimaTask(existing, detail)) return true;

  const existingTitle = normalizeJimaTaskTitle(existing.title);
  const detailTitle = normalizeJimaTaskTitle(detail.title);
  const titleMatches = (
    existingTitle &&
    detailTitle &&
    (existingTitle === detailTitle || existingTitle.includes(detailTitle) || detailTitle.includes(existingTitle))
  );
  const sameSource = (
    (!!existing.sourceUrl && !!detail.sourceUrl && normalizeJimaTaskUrl(existing.sourceUrl) === normalizeJimaTaskUrl(detail.sourceUrl)) ||
    (!!existing.courseOrPage && !!detail.courseOrPage && normalizeJimaTaskTitle(existing.courseOrPage) === normalizeJimaTaskTitle(detail.courseOrPage))
  );

  return titleMatches && sameSource;
}

async function getJimaSavedTasks() {
  const data = await chrome.storage.local.get(JIMA_SAVED_TASKS_KEY);
  return Array.isArray(data[JIMA_SAVED_TASKS_KEY])
    ? data[JIMA_SAVED_TASKS_KEY].map(sanitizeJimaTask)
    : [];
}

async function setJimaSavedTasks(tasks) {
  const sanitized = Array.isArray(tasks) ? tasks.map(sanitizeJimaTask) : [];
  await chrome.storage.local.set({ [JIMA_SAVED_TASKS_KEY]: sanitized });
  return sanitized;
}

async function saveJimaTask(taskInput) {
  const task = sanitizeJimaTask(taskInput);
  const tasks = await getJimaSavedTasks();
  const duplicate = tasks.find((existingTask) => isDuplicateJimaTask(existingTask, task));

  if (duplicate) {
    return {
      saved: false,
      duplicate: true,
      task: duplicate,
      tasks
    };
  }

  const updatedTasks = await setJimaSavedTasks([task, ...tasks]);
  return {
    saved: true,
    duplicate: false,
    task,
    tasks: updatedTasks
  };
}

async function saveOrUpdateJimaTaskFromDetail(detail, pageContext = {}, candidate = {}) {
  const detailTask = createJimaTaskFromDetail(detail, pageContext, candidate);
  const tasks = await getJimaSavedTasks();
  const existingIndex = tasks.findIndex((task) => isRelatedJimaTask(task, detailTask));
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const existing = tasks[existingIndex];
    const updatedTask = sanitizeJimaTask({
      ...existing,
      title: existing.title || detailTask.title,
      type: existing.type || detailTask.type,
      courseOrPage: existing.courseOrPage || detailTask.courseOrPage,
      sourceUrl: existing.sourceUrl || detailTask.sourceUrl,
      candidateUrl: existing.candidateUrl || detailTask.candidateUrl,
      dueDateRaw: existing.dueDateRaw || detailTask.dueDateRaw,
      evidence: detailTask.evidence || existing.evidence,
      confidence: detailTask.confidence || existing.confidence,
      detailUrl: detailTask.detailUrl,
      submissionStatus: detailTask.submissionStatus,
      submissionStatusLabel: detailTask.submissionStatusLabel,
      submissionEvidence: detailTask.submissionEvidence,
      submissionConfidence: detailTask.submissionConfidence,
      detailDueDateRaw: detailTask.detailDueDateRaw,
      detailDueDateEvidence: detailTask.detailDueDateEvidence,
      instructionPreview: detailTask.instructionPreview,
      detailFiles: detailTask.detailFiles,
      lastInspectedAt: now,
      status: existing.status,
      createdAt: existing.createdAt,
      updatedAt: now
    });
    const updatedTasks = [...tasks];
    updatedTasks[existingIndex] = updatedTask;

    return {
      created: false,
      updated: true,
      task: updatedTask,
      tasks: await setJimaSavedTasks(updatedTasks)
    };
  }

  const createdTask = sanitizeJimaTask({
    ...detailTask,
    lastInspectedAt: now,
    createdAt: now,
    updatedAt: now
  });

  return {
    created: true,
    updated: false,
    task: createdTask,
    tasks: await setJimaSavedTasks([createdTask, ...tasks])
  };
}

async function updateJimaTaskStatus(taskId, status) {
  const tasks = await getJimaSavedTasks();
  const updatedAt = new Date().toISOString();
  const updatedTasks = tasks.map((task) => (
    task.id === taskId
      ? sanitizeJimaTask({ ...task, status: status === "done" ? "done" : "open", updatedAt })
      : task
  ));
  return setJimaSavedTasks(updatedTasks);
}

async function deleteJimaTask(taskId) {
  const tasks = await getJimaSavedTasks();
  return setJimaSavedTasks(tasks.filter((task) => task.id !== taskId));
}

function getJimaOpenTaskCount(tasks) {
  return (tasks || []).filter((task) => task.status !== "done").length;
}

globalThis.JimaTasks = Object.freeze({
  storageKey: JIMA_SAVED_TASKS_KEY,
  createTaskFromCandidate: createJimaTaskFromCandidate,
  createTaskFromDetail: createJimaTaskFromDetail,
  deleteTask: deleteJimaTask,
  getOpenTaskCount: getJimaOpenTaskCount,
  getTasks: getJimaSavedTasks,
  isDuplicateTask: isDuplicateJimaTask,
  isRelatedTask: isRelatedJimaTask,
  saveTask: saveJimaTask,
  saveOrUpdateTaskFromDetail: saveOrUpdateJimaTaskFromDetail,
  updateTaskStatus: updateJimaTaskStatus
});
