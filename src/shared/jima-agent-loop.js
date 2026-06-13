// Pure, dependency-injected agent loop. No chrome/DOM access here so it can be
// unit-tested. The browser wires real deps in sidepanel.js; node tests inject fakes.
//
// sendTurn(thread)            -> Promise<assistantMessage>  (raw OpenAI message)
// executeTool(name, args)     -> Promise<any>               (JSON-serializable result)
// onAssistantText(text)       -> void                       (render a Jima bubble)
// onToolActivity(name, args)  -> void                       (render a tool chip)
//
// assistantMessage shape: { role:"assistant", content:string, tool_calls?:[{id,function:{name,arguments}}] }

async function runJimaAgentLoop({
  thread,
  sendTurn,
  executeTool,
  onAssistantText = () => {},
  onToolActivity = () => {},
  maxRounds = 6
}) {
  let rounds = 0;

  while (rounds < maxRounds) {
    rounds += 1;
    const message = await sendTurn(thread);
    const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];

    thread.push({
      role: "assistant",
      content: message?.content || "",
      ...(toolCalls.length ? { tool_calls: toolCalls } : {})
    });

    if (message?.content) onAssistantText(message.content);

    if (toolCalls.length === 0) {
      return { thread, stopped: false };
    }

    for (const call of toolCalls) {
      const name = call?.function?.name || "unknown_tool";
      let args = {};
      try {
        args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }

      onToolActivity(name, args);

      let result;
      try {
        result = await executeTool(name, args);
      } catch (error) {
        result = { error: String(error?.message || error) };
      }

      thread.push({
        role: "tool",
        tool_call_id: call?.id || name,
        content: JSON.stringify(result ?? null)
      });
    }
  }

  onAssistantText("I went through several steps but stopped to avoid looping. Here's what I have so far — tell me to continue if you'd like.");
  return { thread, stopped: true };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { runJimaAgentLoop };
}
if (typeof globalThis !== "undefined") {
  globalThis.JimaAgentLoop = Object.freeze({ runJimaAgentLoop });
}
