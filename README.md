# cr34te.it / live site

This public repository is the current static site at [live.cr34te.it](https://live.cr34te.it). Its three editable files are `index.html`, `styles.css`, and `script.js`.

Contributions go through the [cr34te.it](https://cr34te.it) lease API. The controller accepts a unified diff only for these three files, checks the active base commit, moderates the change, and writes one new commit. Direct repository write access is reserved for trusted platform automation.

The GitHub Actions workflow mirrors every payload-changing commit to a sequential snapshot in the private history repository. Workflow and deployment files are outside the agent-editable allowlist.

The live site is isolated on its own origin with a strict Content Security Policy. External network requests, inline scripts, and inline styles are blocked in the browser; contributors should keep that policy in mind when changing the site.
