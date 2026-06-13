// Tool contract for the Jima agent. SINGLE SOURCE OF TRUTH for tool names and
// argument shapes. Executors live in ../src/shared/jima-tools.js and MUST match
// these names and argument keys. Keep the two files in sync.

export const JIMA_TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "read_page",
      description: "Read the student's current browser tab (BGU Moodle): page title, URL, visible text, headings, links, downloadable file links, and deterministic homework/deadline/file detections. Use this whenever the question is about 'this page', 'this course', what is shown, or to ground any answer in the page. Returns {disabled:true} if the student turned off page access.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  {
    type: "function",
    function: {
      name: "inspect_assignment",
      description: "Open a specific Moodle assignment or quiz detail page and extract its visible due date, instructions, and submission status. Use only with a real assignment/quiz URL found via read_page.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "HTTPS moodle.bgu.ac.il assignment or quiz view URL." },
          title: { type: "string", description: "Human-readable assignment title, if known." }
        },
        required: ["url"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List the downloadable files detected on the current page (names, types, URLs). Does NOT read file contents. Returns {disabled:true} if page access is off.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  {
    type: "function",
    function: {
      name: "download_files",
      description: "Propose downloading one or more files. This does NOT download immediately — it asks the student to confirm with a button. Only the student's click triggers the actual download. Pass the exact file objects from list_files/read_page.",
      parameters: {
        type: "object",
        properties: {
          files: {
            type: "array",
            description: "Files to propose for download.",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                url: { type: "string" }
              },
              required: ["name", "url"],
              additionalProperties: false
            }
          }
        },
        required: ["files"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_task",
      description: "Save a homework/assignment/deadline to the student's local task list. NEVER invent a deadline — only save evidence actually found on the page. Include the supporting evidence text and a confidence level.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          dueDate: { type: "string", description: "Raw due-date text as found, or empty if none." },
          evidence: { type: "string", description: "The exact text from the page that supports this task." },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          sourceUrl: { type: "string", description: "URL where the task was found, if known." }
        },
        required: ["title", "evidence", "confidence"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List the student's saved tasks. Optionally filter by status; defaults to all when omitted.",
      parameters: {
        type: "object",
        properties: { status: { type: "string", enum: ["open", "done", "all"] } },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Mark a saved task done, or delete it.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          action: { type: "string", enum: ["done", "delete"] }
        },
        required: ["taskId", "action"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_saved_courses",
      description: "List the student's saved/known BGU course names and their Moodle links.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  }
];

export const JIMA_TOOL_NAMES = new Set(JIMA_TOOL_SCHEMAS.map((t) => t.function.name));
