import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "website");
const outputDir = path.join(root, "dist");
const excludedNames = new Set([".DS_Store", "Thumbs.db"]);
const excludedRelativeDirs = new Set([path.join("assets", "videos")]);

async function assertDirectory(directory, label) {
  try {
    const directoryStat = await stat(directory);

    if (!directoryStat.isDirectory()) {
      throw new Error(`${label} exists but is not a directory: ${directory}`);
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`${label} directory does not exist: ${directory}`);
    }

    throw error;
  }
}

await assertDirectory(sourceDir, "Source");
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, {
  recursive: true,
  filter: (source) => {
    const relativeSource = path.relative(sourceDir, source);

    if (excludedNames.has(path.basename(source))) return false;

    return ![...excludedRelativeDirs].some((excludedDir) => {
      return relativeSource === excludedDir || relativeSource.startsWith(`${excludedDir}${path.sep}`);
    });
  },
});

console.log(`Built static site: ${path.relative(root, sourceDir)} -> ${path.relative(root, outputDir)}`);
