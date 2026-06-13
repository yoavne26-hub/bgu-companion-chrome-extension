const JIMA_MESSAGES = Object.freeze({
  OPEN_SIDE_PANEL: "OPEN_JIMA_SIDE_PANEL",
  ANALYZE_CURRENT_PAGE: "JIMA_ANALYZE_CURRENT_PAGE",
  GET_MOODLE_CONTEXT: "JIMA_GET_MOODLE_CONTEXT",
  ANALYZE_WITH_AI: "JIMA_ANALYZE_WITH_AI",
  DOWNLOAD_SELECTED_FILES: "JIMA_DOWNLOAD_SELECTED_FILES",
  OPEN_AND_ANALYZE_COURSE: "JIMA_OPEN_AND_ANALYZE_COURSE",
  INSPECT_ASSIGNMENT_DETAIL: "JIMA_INSPECT_ASSIGNMENT_DETAIL",
  OPEN_AND_INSPECT_ASSIGNMENT: "JIMA_OPEN_AND_INSPECT_ASSIGNMENT",
  JIMA_CHAT: "JIMA_CHAT"
});

const JIMA_DEFAULT_BACKEND_URL = "http://localhost:3000";
const JIMA_BACKEND_URL_KEY = "jimaBackendUrl";
const JIMA_BACKEND_ACCESS_TOKEN_KEY = "jimaBackendAccessToken";
const JIMA_BACKEND_TIMEOUT_MS = 20000;
const JIMA_COURSE_ANALYSIS_TIMEOUT_MS = 15000;

function normalizeJimaBackendUrl(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return { ok: true, url: JIMA_DEFAULT_BACKEND_URL };

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:") {
      const isLocalDefault = parsed.hostname === "localhost" &&
        parsed.port === "3000" &&
        (parsed.pathname === "" || parsed.pathname === "/") &&
        !parsed.search &&
        !parsed.hash;
      return isLocalDefault
        ? { ok: true, url: JIMA_DEFAULT_BACKEND_URL }
        : { ok: false, error: "Configure the Jima backend URL in Options." };
    }

    if (parsed.protocol !== "https:" || parsed.search || parsed.hash) {
      return { ok: false, error: "Configure the Jima backend URL in Options." };
    }

    const normalizedPath = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
    return { ok: true, url: `${parsed.origin}${normalizedPath}` };
  } catch {
    return { ok: false, error: "Configure the Jima backend URL in Options." };
  }
}

async function getJimaBackendConfig() {
  const data = await chrome.storage.local.get([
    JIMA_BACKEND_URL_KEY,
    JIMA_BACKEND_ACCESS_TOKEN_KEY
  ]);
  const urlResult = normalizeJimaBackendUrl(data[JIMA_BACKEND_URL_KEY] || JIMA_DEFAULT_BACKEND_URL);
  if (!urlResult.ok) return urlResult;

  return {
    ok: true,
    backendUrl: urlResult.url,
    accessToken: String(data[JIMA_BACKEND_ACCESS_TOKEN_KEY] || "").trim()
  };
}

function buildJimaBackendUrl(config, path) {
  return `${config.backendUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function getJimaBackendHeaders(config, extraHeaders = {}) {
  return {
    ...extraHeaders,
    ...(config.accessToken ? { "X-Jima-Access-Token": config.accessToken } : {})
  };
}

function isMoodleTab(tab) {
  try {
    return new URL(tab?.url || "").hostname === "moodle.bgu.ac.il";
  } catch {
    return false;
  }
}

function getActiveTab() {
  return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs[0] || null);
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          ok: false,
          error: "Jima could not reach the active tab. Make sure the active tab is a BGU Moodle page, reload it, then try again."
        });
        return;
      }

      resolve(response || { ok: false, error: "No page response received." });
    });
  });
}

function isSafeMoodleCourseUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "moodle.bgu.ac.il";
  } catch {
    return false;
  }
}

function validateJimaAssignmentDetailUrl(url) {
  const rawUrl = String(url || "").trim();
  if (!rawUrl) {
    return {
      ok: false,
      error: "No assignment detail URL was provided."
    };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      ok: false,
      error: "This assignment detail link is not a valid URL."
    };
  }

  if (/^(javascript|data|blob):$/i.test(parsed.protocol)) {
    return {
      ok: false,
      error: "Jima will not open unsafe assignment detail links."
    };
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "moodle.bgu.ac.il") {
    return {
      ok: false,
      error: "Jima can only inspect HTTPS BGU Moodle detail pages in this phase."
    };
  }

  if (!/\/moodle\/mod\/(assign|quiz)\/view\.php$/i.test(parsed.pathname)) {
    return {
      ok: false,
      error: "Jima can inspect assignment or quiz detail pages for deadlines in this phase."
    };
  }

  return {
    ok: true,
    url: parsed.href
  };
}

function waitForTabComplete(tabId, timeoutMs = JIMA_COURSE_ANALYSIS_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    function cleanup() {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    }

    function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      cleanup();
      resolve(true);
    }

    chrome.tabs.get(tabId, (tab) => {
      if (!chrome.runtime.lastError && tab?.status === "complete") {
        cleanup();
        resolve(true);
        return;
      }

      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

async function sendTabMessageWithRetry(tabId, message, timeoutMs = JIMA_COURSE_ANALYSIS_TIMEOUT_MS) {
  const startedAt = Date.now();
  let lastResponse = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastResponse = await sendTabMessage(tabId, message);
    if (lastResponse?.ok || !/could not reach/i.test(lastResponse?.error || "")) {
      return lastResponse;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return lastResponse || {
    ok: false,
    error: "Jima could not reach the course page after it loaded."
  };
}

function normalizeTabUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url || "";
  }
}

async function findExistingCourseTab(courseUrl) {
  const targetUrl = normalizeTabUrl(courseUrl);
  const tabs = await chrome.tabs.query({ url: "https://moodle.bgu.ac.il/*" });
  return tabs.find((tab) => normalizeTabUrl(tab.url) === targetUrl) || null;
}

async function openOrFocusCourseTab(courseUrl) {
  const existingTab = await findExistingCourseTab(courseUrl);
  if (existingTab?.id) {
    if (existingTab.windowId) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
    return chrome.tabs.update(existingTab.id, { active: true });
  }

  return chrome.tabs.create({ url: courseUrl, active: true });
}

async function openAndAnalyzeCourse(course) {
  const url = String(course?.url || "").trim();
  const name = String(course?.name || "this course").trim();

  if (!isSafeMoodleCourseUrl(url)) {
    return {
      ok: false,
      error: "Jima can only check HTTPS BGU Moodle pages in this phase."
    };
  }

  const tab = await openOrFocusCourseTab(url);
  if (!tab?.id) {
    return {
      ok: false,
      error: "Jima could not open this Moodle course page."
    };
  }

  await waitForTabComplete(tab.id);
  const response = await sendTabMessageWithRetry(tab.id, { type: JIMA_MESSAGES.GET_MOODLE_CONTEXT });

  if (!response?.ok) {
    return response || {
      ok: false,
      error: "Jima could not analyze this course page."
    };
  }

  return {
    ...response,
    course: {
      name,
      url,
      tabId: tab.id
    }
  };
}

async function openAndInspectAssignmentDetail(assignment) {
  const validation = validateJimaAssignmentDetailUrl(assignment?.url);
  if (!validation.ok) {
    return validation;
  }

  const tab = await openOrFocusCourseTab(validation.url);
  if (!tab?.id) {
    return {
      ok: false,
      error: "Jima could not open this assignment detail page."
    };
  }

  await waitForTabComplete(tab.id);
  const response = await sendTabMessageWithRetry(tab.id, {
    type: JIMA_MESSAGES.INSPECT_ASSIGNMENT_DETAIL
  });

  if (!response?.ok) {
    return response || {
      ok: false,
      error: "Jima could not inspect this assignment detail page."
    };
  }

  return {
    ...response,
    assignment: {
      title: String(assignment?.title || "Possible assignment").trim(),
      url: validation.url,
      tabId: tab.id
    }
  };
}

async function askJimaBackend(payload) {
  const config = await getJimaBackendConfig();
  if (!config.ok) {
    return {
      ok: false,
      error: config.error || "Configure the Jima backend URL in Options."
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JIMA_BACKEND_TIMEOUT_MS);

  try {
    const response = await fetch(buildJimaBackendUrl(config, "/api/jima/analyze-context"), {
      method: "POST",
      headers: getJimaBackendHeaders(config, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      return {
        ok: false,
        error: "Jima backend returned an invalid response."
      };
    }

    if (!response.ok || body?.ok === false) {
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          error: "Jima backend rejected the request. Check the backend access token in Options."
        };
      }

      return {
        ok: false,
        error: body?.error || "Jima backend could not complete the analysis."
      };
    }

    if (!body?.analysis) {
      return {
        ok: false,
        error: "Jima backend response did not include analysis results."
      };
    }

    return {
      ok: true,
      analysis: body.analysis
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return {
        ok: false,
        error: "Jima backend timed out. Check the backend URL or whether the service is running."
      };
    }

    return {
      ok: false,
      error: "Jima backend is unreachable. Check the backend URL or whether the service is running."
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function askJimaChatBackend(messages, pageSnapshot) {
  const config = await getJimaBackendConfig();
  if (!config.ok) {
    return { ok: false, error: config.error || "Configure the Jima backend URL in Options." };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JIMA_BACKEND_TIMEOUT_MS);

  try {
    const response = await fetch(buildJimaBackendUrl(config, "/api/jima/chat"), {
      method: "POST",
      headers: getJimaBackendHeaders(config, { "Content-Type": "application/json" }),
      body: JSON.stringify({ messages, pageSnapshot: pageSnapshot || "" }),
      signal: controller.signal
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      return { ok: false, error: "Jima backend returned an invalid response." };
    }

    if (!response.ok || body?.ok === false) {
      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: "Jima backend rejected the request. Check the backend access token in Options." };
      }
      return { ok: false, error: body?.error || "Jima backend could not answer." };
    }

    if (!body?.message) {
      return { ok: false, error: "Jima backend response did not include a message." };
    }

    return { ok: true, message: body.message };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { ok: false, error: "Jima backend timed out. Check the backend URL or whether the service is running." };
    }
    return { ok: false, error: "Jima backend is unreachable. Check the backend URL or whether the service is running." };
  } finally {
    clearTimeout(timeoutId);
  }
}

function validateJimaDownloadFile(file) {
  const name = String(file?.name || "Moodle file").slice(0, 160);
  const rawUrl = String(file?.url || "").trim();

  if (!rawUrl) {
    return {
      ok: false,
      result: { name, status: "skipped", error: "Missing file URL." }
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return {
      ok: false,
      result: { name, url: rawUrl, status: "skipped", error: "Invalid file URL." }
    };
  }

  if (/^(javascript|data|blob):$/i.test(parsedUrl.protocol)) {
    return {
      ok: false,
      result: { name, url: parsedUrl.href, status: "skipped", error: "Unsafe URL type." }
    };
  }

  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "moodle.bgu.ac.il") {
    return {
      ok: false,
      result: {
        name,
        url: parsedUrl.href,
        status: "skipped",
        error: "Only HTTPS BGU Moodle file links can be downloaded here."
      }
    };
  }

  return {
    ok: true,
    file: {
      name,
      url: parsedUrl.href
    }
  };
}

function startJimaDownload(file) {
  return new Promise((resolve) => {
    chrome.downloads.download({ url: file.url }, (downloadId) => {
      if (chrome.runtime.lastError || !downloadId) {
        resolve({
          name: file.name,
          url: file.url,
          status: "failed",
          error: chrome.runtime.lastError?.message || "Chrome could not start this download."
        });
        return;
      }

      resolve({
        name: file.name,
        url: file.url,
        status: "started",
        downloadId
      });
    });
  });
}

async function downloadSelectedJimaFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return {
      ok: false,
      error: "Select at least one file before downloading.",
      results: []
    };
  }

  const seenUrls = new Set();
  const results = [];
  const downloadsToStart = [];

  for (const file of files.slice(0, 30)) {
    const validation = validateJimaDownloadFile(file);
    if (!validation.ok) {
      results.push(validation.result);
      continue;
    }

    if (seenUrls.has(validation.file.url)) {
      results.push({
        name: validation.file.name,
        url: validation.file.url,
        status: "skipped",
        error: "Duplicate selected file."
      });
      continue;
    }

    seenUrls.add(validation.file.url);
    downloadsToStart.push(validation.file);
  }

  for (const file of downloadsToStart) {
    results.push(await startJimaDownload(file));
  }

  const started = results.filter((result) => result.status === "started").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const skipped = results.filter((result) => result.status === "skipped").length;

  return {
    ok: failed === 0 && started > 0,
    summary: { started, failed, skipped },
    results,
    error: started > 0 ? "" : "No downloads were started."
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === JIMA_MESSAGES.OPEN_SIDE_PANEL) {
    const windowId = Number.isInteger(message.windowId)
      ? message.windowId
      : sender.tab?.windowId;

    if (!windowId || !chrome.sidePanel?.open) {
      sendResponse({ ok: false, error: "Side panel is not available." });
      return false;
    }

    chrome.sidePanel
      .open({ windowId })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error?.message || "Could not open the Jima side panel."
        });
      });

    return true;
  }

  if (message?.type === JIMA_MESSAGES.ANALYZE_CURRENT_PAGE) {
    getActiveTab()
      .then((tab) => {
        if (!tab?.id) {
          return { ok: false, error: "No active tab was found." };
        }

        if (!isMoodleTab(tab)) {
          return {
            ok: false,
            error: "Open a BGU Moodle page first, then ask Jima to analyze it."
          };
        }

        return sendTabMessage(tab.id, { type: JIMA_MESSAGES.GET_MOODLE_CONTEXT });
      })
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error?.message || "Jima could not analyze this page."
        });
      });

    return true;
  }

  if (message?.type === JIMA_MESSAGES.ANALYZE_WITH_AI) {
    askJimaBackend({
      source: message.source,
      mode: message.mode,
      originalUserMessage: message.originalUserMessage,
      recentChatMessages: message.recentChatMessages || [],
      localSummary: message.localSummary || "",
      course: message.course || null,
      pageContext: message.pageContext,
      detections: message.detections || {},
      assignmentDetail: message.assignmentDetail || null,
      lastReferencedFile: message.lastReferencedFile || null,
      lastFileAnalysisSummary: message.lastFileAnalysisSummary || null,
      privacyNote: message.privacyNote || "",
      userQuestion: message.userQuestion || message.originalUserMessage || ""
    })
      .then(sendResponse)
      .catch(() => {
        sendResponse({
          ok: false,
          error: "Jima backend request failed."
        });
      });

    return true;
  }

  if (message?.type === JIMA_MESSAGES.DOWNLOAD_SELECTED_FILES) {
    downloadSelectedJimaFiles(message.files)
      .then(sendResponse)
      .catch(() => {
        sendResponse({
          ok: false,
          error: "Jima could not start the selected downloads.",
          results: []
        });
      });

    return true;
  }

  if (message?.type === JIMA_MESSAGES.OPEN_AND_ANALYZE_COURSE) {
    openAndAnalyzeCourse(message.course)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error?.message || "Jima could not open and check this course."
        });
      });

    return true;
  }

  if (message?.type === JIMA_MESSAGES.OPEN_AND_INSPECT_ASSIGNMENT) {
    openAndInspectAssignmentDetail(message.assignment)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error?.message || "Jima could not inspect this assignment detail page."
        });
      });

    return true;
  }

  if (message?.type === JIMA_MESSAGES.JIMA_CHAT) {
    askJimaChatBackend(message.messages || [], message.pageSnapshot || "")
      .then(sendResponse)
      .catch(() => {
        sendResponse({ ok: false, error: "Jima chat request failed." });
      });

    return true;
  }

  return false;
});

// Clear a tab's persisted Jima conversation when the tab closes.
// NOTE: the `jima_thread_` prefix MUST match JIMA_THREAD_PREFIX in
// src/shared/jima-conversation.js. The service worker cannot import that
// module, so the prefix is duplicated here intentionally — keep them in sync.
chrome.tabs.onRemoved.addListener((tabId) => {
  if (!chrome.storage?.session) return;
  Promise.resolve(chrome.storage.session.remove(`jima_thread_${tabId}`)).catch(() => {});
});
