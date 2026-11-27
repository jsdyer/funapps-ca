#!/usr/bin/env node
// Serve the prerendered game and give the server and client a common CSS URL.
import { access, copyFile, readdir, writeFile } from "node:fs/promises";

const dir = "dist/client";
await access(`${dir}/index.html`);
const styles = (await readdir(`${dir}/assets`)).filter(name => name.endsWith(".css"));
if (styles.length !== 1) throw new Error("Expected one compiled Last Spot stylesheet");
await copyFile(`${dir}/assets/${styles[0]}`, `${dir}/game.css`);
await writeFile(`${dir}/_redirects`, "/*    /index.html   200\n");
