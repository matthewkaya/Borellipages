import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve("src/content/defaultSiteConfig.json");
const targetPath = resolve("public/site-config.json");

async function run() {
  const raw = await readFile(sourcePath, "utf-8");
  const parsed = JSON.parse(raw);
  await writeFile(targetPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
  process.stdout.write(`Generated ${targetPath}\n`);
}

run().catch((error) => {
  process.stderr.write(`Failed to generate site config: ${error.message}\n`);
  process.exit(1);
});
