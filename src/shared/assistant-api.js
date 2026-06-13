// src/shared/assistant-api.js
// Thin transport: send one conversational turn to the background relay, which
// forwards it to the backend POST /api/jima/chat. Returns the raw assistant
// message {role,content,tool_calls?} or throws with a user-facing message.

function sendChatTurn(messages, pageSnapshot = "") {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, value) => { if (!settled) { settled = true; fn(value); } };

    try {
      chrome.runtime.sendMessage(
        { type: "JIMA_CHAT", messages, pageSnapshot },
        (response) => {
          if (chrome.runtime.lastError) {
            done(reject, new Error("Jima could not reach the extension background."));
            return;
          }
          if (!response || response.ok === false || !response.message) {
            done(reject, new Error(response?.error || "Jima backend did not return a message."));
            return;
          }
          done(resolve, response.message);
        }
      );
    } catch (error) {
      done(reject, new Error(error?.message || "Jima chat transport failed."));
    }
  });
}

globalThis.JimaAssistantApi = Object.freeze({ sendChatTurn });
