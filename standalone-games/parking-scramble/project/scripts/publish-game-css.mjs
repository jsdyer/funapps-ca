// Nitro's server and client builds can produce different stylesheet hashes.
import { copyFile, readdir } from "node:fs/promises";

const styles = (await readdir("dist/assets")).filter(name => name.endsWith(".css"));
if (styles.length !== 1) throw new Error("Expected one compiled game stylesheet in dist/assets");
await copyFile(`dist/assets/${styles[0]}`, "dist/game.css");
