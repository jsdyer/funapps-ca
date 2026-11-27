import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("site", { recursive: true });

await build({
  entryPoints: ["src/game/standalone.ts"],
  bundle: true,
  format: "iife",
  outfile: "site/game.js",
  minify: true,
  target: "es2022",
  legalComments: "none",
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Pepperoni Rain</title>
  <meta name="description" content="Catch maple-smoked Halifax pepperoni as it tumbles out of the smokehouse." />
  <meta name="theme-color" content="#1a0e0a" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Outfit:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    html, body { margin: 0; height: 100%; background: #1a0e0a; color: #fff4e8; overflow: hidden; }
    #app { position: fixed; inset: 0; touch-action: none; }
    #mute {
      position: absolute; top: 12px; left: 12px; z-index: 2;
      width: 44px; height: 44px; border-radius: 999px;
      border: 1px solid rgba(231, 211, 168, 0.4);
      background: rgba(26, 14, 10, 0.8); color: #fff4e8;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
  </style>
</head>
<body>
  <h1 class="sr">Pepperoni Rain</h1>
  <div id="app"></div>
  <button id="mute" type="button" aria-label="Mute" aria-pressed="false">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z"/>
      <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
      <path d="M18.5 5.5a9 9 0 0 1 0 13"/>
    </svg>
  </button>
  <script src="/game.js"></script>
</body>
</html>
`;

await writeFile("site/index.html", html);
try {
  await copyFile("public/favicon.svg", "site/favicon.svg");
} catch {
  /* favicon is optional for the static bundle */
}
console.log("static game written to site/");
