/** Purpose: create the next immutable history snapshot for a site commit. */

import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const sourceFiles = ["index.html", "styles.css", "script.js"];

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
  const destination = join(historyPath, version);
  await mkdir(destination);
  await Promise.all(sourceFiles.map((file) => copyFile(file, join(destination, basename(file)))));
  const metadata = { version, sourceCommit: commit, createdAt: new Date().toISOString(), files: sourceFiles };
  await writeFile(join(destination, "version.json"), `${JSON.stringify(metadata, null, 2)}\n`);
  process.stdout.write(`${version}\n`);
}

const [historyPath, commit] = process.argv.slice(2);
if (!historyPath || !commit) throw new Error("history path and source commit are required");
await createSnapshot(historyPath, commit);
