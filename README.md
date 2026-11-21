# Parkour Park

A simple HTML/JS starter project.

## Run locally

Open `index.html` directly in a browser, or start a small local server from the project folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Check JavaScript

A local Node.js executable is installed in `.tools/node/bin/node`. From the project folder, run:

```bash
.tools/node/bin/node --check script.js
```

No output means the syntax check passed. The `.tools/` directory is excluded from Git; on another computer with Node.js installed, use `node --check script.js`.
