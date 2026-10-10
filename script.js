const clock = document.querySelector("#local-time");
if (clock) clock.textContent = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
