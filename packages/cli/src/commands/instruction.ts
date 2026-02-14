import { Command } from "commander";
import { logger } from "../lib/logger";
import { formatInstruction, InstructionOptions } from "./instruction/formatter";

export const instructionAction = (options: InstructionOptions) => {
  const formatted = formatInstruction(options);
  if (options.gemini) {
    // When outputting JSON for hooks, we use console.log to avoid any logger prefix/formatting
    console.log(formatted);
  } else {
    logger.success(formatted);
  }
};

export const instructionCommand = new Command("instruction")
  .description("Print the operational protocol for AI Agents using Mimi")
  .option("-g, --gemini", "Output in Gemini CLI hook format (JSON)")
  .action(instructionAction);
