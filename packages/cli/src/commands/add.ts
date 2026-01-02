import { Command } from "commander";
import fs from "fs-extra";
import ora from "ora";
import chalk from "chalk";
import path from "path";
import { spawn } from "child_process";
import { loadConfig, getDataDir } from "../config";
import { getProjectMetadata } from "../lib/utils/paths";
import { PipelineEngine, Repository, setDataDir } from "@ai-dev-labs/mimi-sdk";

export const addCommand = new Command("add")
  .description("Add a new memory")
  .argument("[text]", "Raw text content to add (optional if --file is used)")
  .option("-f, --file <path>", "Path to a text file")
  .option("-p, --project <project>", "Project identifier")
  .option("-u, --userid <userid>", "User identifier")
  .option("--sync", "Run processing synchronously")
  .action(async (text, options) => {
    const spinner = ora("Initializing...").start();
    try {
      // 1. Load Config
      const config = await loadConfig();
      setDataDir(getDataDir());

      // 2. Resolve Input
      let inputContent = text || "";
      if (options.file) {
        if (await fs.pathExists(options.file)) {
          inputContent = await fs.readFile(options.file, "utf-8");
        } else {
          throw new Error(`File not found: ${options.file}`);
        }
      }

      if (!inputContent) {
        throw new Error("No content provided. Use arguments or --file.");
      }

      // 3. Prepare Metadata
      const projectMeta = getProjectMetadata();
      const metadata: any = {};
      if (options.project || projectMeta.project) {
        metadata.project = options.project || projectMeta.project;
      }
      if (options.userid) metadata.userId = options.userid;

      const engine = new PipelineEngine(config);
      const repo = new Repository();

      if (options.sync) {
        spinner.text = "Processing memory pipeline (sync)...";
        const result = await engine.process(inputContent, metadata);

        spinner.text = "Saving to storage...";
        await repo.saveBatch(result.memories, result.entities);

        spinner.succeed(
          chalk.green("Memory added and processed successfully!"),
        );
        console.log(
          chalk.dim(
            `Created ${result.memories.length} memory entries and ${result.entities.length} entities.`,
          ),
        );
      } else {
        spinner.text = "Saving raw memory...";

        // 4. Create and Save Raw Memory only
        const rawMemory = await engine.createRawMemory(inputContent, metadata);
        await repo.saveBatch([rawMemory], []);

        spinner.text = "Triggering background pipeline...";

        // 5. Spawn background process
        // We use process.argv[0] (node) and process.argv[1] (the script entry point)
        // to call the 'pipeline' command we just added.
        const logFile = path.join(process.cwd(), "logs", "pipeline.log");
        await fs.ensureDir(path.dirname(logFile));
        const out = fs.openSync(logFile, "a");
        const err = fs.openSync(logFile, "a");

        const child = spawn(
          process.argv[0],
          [process.argv[1], "pipeline", rawMemory.id],
          {
            detached: true,
            stdio: ["ignore", out, err],
          },
        );
        child.unref();

        spinner.succeed(chalk.green("Memory accepted!"));
        console.log(chalk.dim("Processing continues in the background."));
      }
    } catch (error: any) {
      spinner.fail(chalk.red("Failed to add memory"));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });
