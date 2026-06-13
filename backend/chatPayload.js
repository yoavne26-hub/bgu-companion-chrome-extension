export const MAX_BODY_BYTES = 1024 * 1024;
const MAX_MESSAGES = 60;
const VALID_ROLES = new Set(["user", "assistant", "tool"]);

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function validateChatPayload(body) {
  if (!isPlainObject(body)) return "Request body is required.";
  if (!Array.isArray(body.messages)) return "messages must be an array.";
  if (body.messages.length === 0) return "messages must contain at least one message.";
  if (body.messages.length > MAX_MESSAGES) return "Conversation is too long.";

  for (const message of body.messages) {
    if (!isPlainObject(message)) return "Each message must be an object.";
    if (!VALID_ROLES.has(message.role)) return `Unsupported message role: ${message.role}.`;
  }

  if (body.pageSnapshot != null && typeof body.pageSnapshot !== "string") {
    return "pageSnapshot must be a string when provided.";
  }

  const serializedLength = Buffer.byteLength(JSON.stringify(body), "utf8");
  if (serializedLength > MAX_BODY_BYTES) return "Request payload is too large.";

  return "";
}
