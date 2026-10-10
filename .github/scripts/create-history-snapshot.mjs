/** Purpose: create the next immutable history snapshot for a site commit. */

import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const coreFiles = ["index.html", "styles.css", "script.js"];
const assetNamePattern = /^[a-z0-9][a-z0-9-]{0,47}\.(?:css|js)$/;

/** Return the next zero-padded history directory name. */
async function nextVersion(historyPath, commit) {
  const entries = await readdir(historyPath, { withFileTypes: true });
  const versionNames = entries
    .filter((entry) => entry.isDirectory() && /^v\d{6}$/.test(entry.name))
    .map((entry) => entry.name);
  for (const version of versionNames) {
    const metadata = JSON.parse(await readFile(join(historyPath, version, "version.json"), "utf8"));
    if (metadata.sourceCommit === commit) return null;
  }
  const versions = versionNames.map((name) => Number(name.slice(1)));
  return `v${String(Math.max(0, ...versions) + 1).padStart(6, "0")}`;
}

/** Copy the current static site payload to a new history version. */
async function createSnapshot(historyPath, commit) {
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error("invalid source commit SHA");
  const version = await nextVersion(historyPath, commit);
  if (!version) return;
  let assetNames = [];
  try {
    assetNames = (await readdir("assets", { withFileTypes: true })).map((entry) => {
      if (!entry.isFile() || !assetNamePattern.test(entry.name)) throw new Error("invalid site asset");
      return entry.name;
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const sourceFiles = [...coreFiles, ...assetNames.sort().map((name) => `assets/${name}`)];
  if (sourceFiles.length > 15) throw new Error("too many site files");
  const destination = join(historyPath, version);
  await mkdir(destination);
  if (assetNames.length) await mkdir(join(destination, "assets"));
  await Promise.all(sourceFiles.map((file) => copyFile(file, join(destination, file))));
  const metadata = { version, sourceCommit: commit, createdAt: new Date().toISOString(), files: sourceFiles };
  await writeFile(join(destination, "version.json"), `${JSON.stringify(metadata, null, 2)}\n`);
  process.stdout.write(`${version}\n`);
}

const [historyPath, commit] = process.argv.slice(2);
if (!historyPath || !commit) throw new Error("history path and source commit are required");
await createSnapshot(historyPath, commit);
