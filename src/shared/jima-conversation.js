// src/shared/jima-conversation.js
// Per-tab conversation persistence in chrome.storage.session. Threads hold
// OpenAI-format messages ({role, content, tool_calls?, tool_call_id?}).

const JIMA_THREAD_PREFIX = "jima_thread_";
const JIMA_THREAD_MAX_MESSAGES = 40;

function threadStorageKey(tabId) {
  return `${JIMA_THREAD_PREFIX}${tabId}`;
}

function trimThread(messages, max = JIMA_THREAD_MAX_MESSAGES) {
  if (!Array.isArray(messages) || messages.length <= max) return messages;
  return messages.slice(messages.length - max);
}

async function loadThread(tabId) {
  if (tabId == null || !globalThis.chrome?.storage?.session) return [];
  const key = threadStorageKey(tabId);
  const data = await chrome.storage.session.get(key);
  const stored = data[key];
  return Array.isArray(stored) ? stored : [];
}

async function saveThread(tabId, messages) {
  if (tabId == null || !globalThis.chrome?.storage?.session) return;
  const key = threadStorageKey(tabId);
  await chrome.storage.session.set({ [key]: trimThread(messages) });
}

async function clearThread(tabId) {
  if (tabId == null || !globalThis.chrome?.storage?.session) return;
  await chrome.storage.session.remove(threadStorageKey(tabId));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { threadStorageKey, trimThread, loadThread, saveThread, clearThread };
}
if (typeof globalThis !== "undefined") {
  globalThis.JimaConversation = Object.freeze({
    threadStorageKey, trimThread, loadThread, saveThread, clearThread
  });
}
