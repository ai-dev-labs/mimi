export const AGENT_INSTRUCTION = [
  "# **CRITICAL** Required Agent Memory Protocol",
  "",
  "Mimi is the short and long-term memory system for this environment. You **MUST** use the `mimi` CLI to retrieve and store memories for every task.",
  "",
  "## 1. Required: Pre-Task Retrieval",
  "Before beginning any task, you must query Mimi to retrieve relevant context, past decisions, and user preferences. This step is mandatory to avoid redundant questions and conflicting actions.",
  "",
  "**Command:**",
  '`mimi query "<search keywords>"`',
  "",
  "## 2. Required: Post-Task Persistence",
  "Upon task completion, you must store significant outcomes, rationales, and new project knowledge. Information not stored in Mimi is considered lost context for future tasks.",
  "",
  "**Command:**",
  '`mimi add "Significant fact or decision"`',
  "",
  "## 3. Critical: CLI Integration",
  "It is critical that all memory operations are performed using the `mimi` CLI. Do not rely on internal state or chat history for long-term persistence.",
  "",
  "**Key Guidelines:**",
  "- **Rationales:** Always document *why* a decision was made.",
  "- **Organization:** Use `--project <id>` and `--userid <id>` for proper categorization.",
  "- **Context:** Use `--entity <name>` during queries to focus on specific architectural components.",
  "",
  "## 4. Operational Workflow",
  '1. **Retrieve:** `mimi query "topic"` (Mandatory before starting)',
  "2. **Execute:** (Perform the task based on retrieved context)",
  '3. **Store:** `mimi add "result and rationale"` (Mandatory after finishing)',
].join("\n");

export type InstructionOptions = {
  gemini?: boolean;
};

export function formatInstruction(options: InstructionOptions): string {
  if (options.gemini) {
    return JSON.stringify(
      {
        hookSpecificOutput: {
          additionalContext: AGENT_INSTRUCTION,
        },
      },
      null,
      2,
    );
  }
  return AGENT_INSTRUCTION;
}
