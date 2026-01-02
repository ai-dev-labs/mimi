import path from "path";
import os from "os";
import fs from "fs-extra";

export const MIMI_DIR = path.join(os.homedir(), ".mimi");
export const CONFIG_FILE = path.join(MIMI_DIR, "settings.json");
export const DATA_DIR = path.join(MIMI_DIR, "data");

export function getMimiDir(): string {
  return MIMI_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getDataDir(): string {
  return DATA_DIR;
}

export function findProjectConfig(
  startDir: string = process.cwd(),
): string | null {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    const configPath = path.join(currentDir, "mimi.toml");
    if (fs.pathExistsSync(configPath)) {
      return configPath;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  return null;
}

export function getProjectMetadata(): { project?: string } {
  const configPath = findProjectConfig();
  if (!configPath) return {};

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const projectMatch = content.match(/project\s*=\s*"([^"]+)"/);
    if (projectMatch) {
      return { project: projectMatch[1] };
    }
  } catch {
    // Ignore errors reading config
  }
  return {};
}
