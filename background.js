const JIMA_MESSAGES = Object.freeze({
  OPEN_SIDE_PANEL: "OPEN_JIMA_SIDE_PANEL",
  ANALYZE_CURRENT_PAGE: "JIMA_ANALYZE_CURRENT_PAGE",
  GET_MOODLE_CONTEXT: "JIMA_GET_MOODLE_CONTEXT",
  ANALYZE_WITH_AI: "JIMA_ANALYZE_WITH_AI",
  DOWNLOAD_SELECTED_FILES: "JIMA_DOWNLOAD_SELECTED_FILES"
});

const JIMA_BACKEND_ANALYZE_URL = "http://localhost:3000/api/jima/analyze-context";
const JIMA_BACKEND_TIMEOUT_MS = 20000;

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
          error: "Jima could not reach this page. Refresh the Moodle page and try again."
        });
        return;
      }

      resolve(response || { ok: false, error: "No page response received." });
    });
  });
}

async function askJimaBackend(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JIMA_BACKEND_TIMEOUT_MS);

  try {
    const response = await fetch(JIMA_BACKEND_ANALYZE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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
        error: "Jima backend timed out. Make sure the local backend is running and try again."
      };
    }

    return {
      ok: false,
      error: "Jima backend is offline or unreachable. Start the local backend and try again."
    };
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
      pageContext: message.pageContext,
      detections: message.detections || {},
      userQuestion: message.userQuestion || ""
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

  return false;
});
