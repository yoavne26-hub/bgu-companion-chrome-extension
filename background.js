const JIMA_MESSAGES = Object.freeze({
  OPEN_SIDE_PANEL: "OPEN_JIMA_SIDE_PANEL",
  ANALYZE_CURRENT_PAGE: "JIMA_ANALYZE_CURRENT_PAGE",
  GET_MOODLE_CONTEXT: "JIMA_GET_MOODLE_CONTEXT"
});

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

  return false;
});
