#!/usr/bin/env bash
set -euo pipefail

site_root="$(pwd)"
history_root="$site_root/.history"
last_version="$(find "$history_root" -maxdepth 1 -type d -name 'v[0-9][0-9][0-9][0-9][0-9][0-9]' -print | sort | tail -n 1)"
last_commit=""
if [[ -n "$last_version" ]]; then
  last_commit="$(node -e 'const fs=require("node:fs"); const data=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(data.sourceCommit)' "$last_version/version.json")"
  git cat-file -e "${last_commit}^{commit}"
  git merge-base --is-ancestor "$last_commit" origin/main
fi

working="$(mktemp -d)"
trap 'rm -rf "$working"' EXIT
if [[ -n "$last_commit" ]]; then
  commits="$(git rev-list --reverse "$last_commit"..origin/main)"
else
  commits="$(git rev-list --reverse origin/main)"
fi

for commit in $commits; do
  if ! git diff-tree --no-commit-id --name-only -r --root "$commit" | grep -Eq '^(index\.html|styles\.css|script\.js|assets/[a-z0-9][a-z0-9-]{0,47}\.(css|js))$'; then
    continue
  fi
  rm -rf "$working/assets"
  for file in index.html styles.css script.js; do
    git show "$commit:$file" > "$working/$file"
  done
  while IFS= read -r file; do
    if [[ ! "$file" =~ ^assets/[a-z0-9][a-z0-9-]{0,47}\.(css|js)$ ]]; then
      echo "Invalid site asset: $file" >&2
      exit 1
    fi
    mkdir -p "$working/assets"
    git show "$commit:$file" > "$working/$file"
  done < <(git ls-tree -r --name-only "$commit" -- assets)
  (cd "$working" && node "$site_root/.github/scripts/create-history-snapshot.mjs" "$history_root" "$commit")
done
