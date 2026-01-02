#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { addCommand } from "./commands/add";
import { queryCommand } from "./commands/query";
import { listCommand } from "./commands/list";
import { getCommand } from "./commands/get";
import { deleteCommand } from "./commands/delete";
import { instructionCommand } from "./commands/instruction";
import { verifyCommand } from "./commands/verify";
import { pipelineCommand } from "./commands/pipeline";

const program = new Command();

program.name("mimi").description("AI Memory CLI").version("0.1.0");

program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(queryCommand);
program.addCommand(listCommand);
program.addCommand(getCommand);
program.addCommand(deleteCommand);
program.addCommand(instructionCommand);
program.addCommand(verifyCommand);
program.addCommand(pipelineCommand);

program.parse(process.argv);
