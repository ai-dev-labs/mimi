import { describe, it, expect, vi } from "vitest";
import { instructionAction } from "./instruction";
import { logger } from "../lib/logger";

describe("instructionAction", () => {
  it("should output instructions via logger.success when no options are provided", () => {
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {});
    instructionAction({});
    expect(successSpy).toHaveBeenCalledWith(
      expect.stringContaining("Required Agent Memory Protocol"),
    );
  });

  it("should output JSON format via console.log when gemini option is true", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    instructionAction({ gemini: true });
    expect(logSpy).toHaveBeenCalled();
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output).toHaveProperty("hookSpecificOutput");
    expect(output.hookSpecificOutput).toHaveProperty("additionalContext");
    expect(output.hookSpecificOutput.additionalContext).toContain(
      "Required Agent Memory Protocol",
    );
  });
});
