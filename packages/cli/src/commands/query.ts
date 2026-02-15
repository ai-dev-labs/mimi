import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, getDataDir } from "../config";
import { getProjectMetadata } from "../lib/utils/paths";
import { SearchEngine, setDataDir } from "@ai-dev-labs/mimi-sdk";
import { logger } from "../lib/logger";

export const queryCommand = new Command("query")
  .description("Search memories")
  .argument("<phrase>", "Search query")
  .option(
    "-e, --entity <name>",
    "Boost results related to this entity (can be repeated)",
    (val, memo: string[]) => memo.concat(val),
    [],
  )
  .option("-p, --project <project>", "Filter by project")
  .option("-u, --userid <userid>", "Filter by user")
  .option("--json", "Output results as JSON")
  .action(async (phrase, options) => {
    const spinner = logger.spinner("Searching...").start();
    try {
      const config = await loadConfig();
      setDataDir(getDataDir());
      const engine = new SearchEngine(config);

      const projectMeta = getProjectMetadata();
      const filters: any = {};
      if (options.project || projectMeta.project) {
        filters.project = options.project || projectMeta.project;
      }
      if (options.userid) filters.userId = options.userid;

      const results = await engine.search(phrase, filters, options.entity);

      spinner.stop();

      if (options.json) {
        logger.success(JSON.stringify(results, null, 2));
      } else {
        if (results.length === 0) {
          logger.success(chalk.yellow("No matching memories found."));
        } else {
          logger.success(chalk.bold(`Found ${results.length} results:`));
          results.forEach((r, i) => {
            logger.success(
              chalk.cyan(
                `\n${i + 1}. [${r.type}] (Score: ${r.score.toFixed(3)})`,
              ),
            );
            logger.success(
              chalk.white(
                r.content.slice(0, 200) + (r.content.length > 200 ? "..." : ""),
              ),
            );
            if (Object.keys(r.metadata).length > 0) {
              logger.success(
                chalk.dim(`   Metadata: ${JSON.stringify(r.metadata)}`),
              );
            }
          });
        }
      }
    } catch (error: any) {
      spinner.fail(chalk.red("Search failed"));
      logger.error(chalk.red(error.message));
      process.exit(1);
    }
  });
