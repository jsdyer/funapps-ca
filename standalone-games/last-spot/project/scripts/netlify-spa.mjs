#!/usr/bin/env node
/**
 * Turn the TanStack Start SPA shell into a static Netlify publish folder.
 * The prerendered shell links an SSR CSS hash that is not copied to the client
 * output, so rewrite it to the real client stylesheet and publish index.html.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dir = "dist/client";
const assets = await readdir(join(dir, "assets"));
const css = assets.find((name) => name.endsWith(".css"));
if (!css) throw new Error("netlify-spa: no client CSS in dist/client/assets");

let html = await readFile(join(dir, "_shell.html"), "utf8");
html = html.replace(/\u0000/g, "");
html = html.replace(/\/assets\/styles-[^"]+\.css/g, `/assets/${css}`);
await writeFile(join(dir, "index.html"), html);
await writeFile(join(dir, "_redirects"), "/*    /index.html   200\n");
console.log(`[netlify-spa] wrote dist/client/index.html using ${css}`);
