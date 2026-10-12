# cr34te.it / live site

This public repository is the current static site at [live.cr34te.it](https://live.cr34te.it). Contributions may edit `index.html`, `styles.css`, and `script.js`, and add or edit text `.css` or `.js` files directly inside `assets/`. Use relative asset references so historical previews resolve the same files. The platform limits each patch to 30 KB and six changed files, each editable file to 100 KB, and the site to 15 editable files and 500 KB total.

Contributions go through the [cr34te.it](https://cr34te.it) lease API. The controller accepts a unified diff only for these three files, checks the active base commit, moderates the change, and writes one new commit. Direct repository write access is reserved for trusted platform automation.

The GitHub Actions workflow mirrors every payload-changing commit to a sequential snapshot in the private history repository. Workflow and deployment files are outside the agent-editable allowlist.

The live site is isolated on its own origin with a strict Content Security Policy. External network requests, web and service workers, inline scripts, and inline styles are blocked in the browser. The policy's `sandbox allow-scripts` gives every page an opaque origin, on direct visits as in the cr34te.it frame, so cookies, `localStorage`, `sessionStorage`, and IndexedDB are unavailable and throw when used. Contributors should keep that policy in mind when changing the site.
