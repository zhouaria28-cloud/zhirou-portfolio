import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch (error) {
  console.error("sharp is not installed. Run `npm install` in this project folder, then run `npm run compress:assets`.");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "assets");
const outputDir = path.join(root, "assets-optimized");
const imageExtensions = new Set([".jpg", ".jpeg", ".png"]);

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

async function main() {
  const files = await walk(sourceDir);
  let originalTotal = 0;
  let optimizedTotal = 0;
  let converted = 0;
  const skipped = [];

  await fs.mkdir(outputDir, { recursive: true });

  for (const file of files) {
    const original = await fs.stat(file);
    originalTotal += original.size;

    const relative = path.relative(sourceDir, file);
    const parsed = path.parse(relative);
    const output = path.join(outputDir, parsed.dir, `${parsed.name}.webp`);
    await fs.mkdir(path.dirname(output), { recursive: true });

    try {
      await sharp(file)
        .rotate()
        .webp({ quality: 80 })
        .toFile(output);

      const optimized = await fs.stat(output);
      optimizedTotal += optimized.size;
      converted += 1;
    } catch (error) {
      skipped.push({ file: relative, reason: error.message.split("\n")[0] });
    }
  }

  const saved = originalTotal - optimizedTotal;
  const ratio = originalTotal ? (saved / originalTotal) * 100 : 0;
  console.log(`Converted images: ${converted}`);
  console.log(`Original total: ${formatBytes(originalTotal)}`);
  console.log(`Optimized total: ${formatBytes(optimizedTotal)}`);
  console.log(`Saved: ${formatBytes(saved)} (${ratio.toFixed(1)}%)`);
  console.log(`Output folder: ${outputDir}`);
  if (skipped.length) {
    console.log("Skipped files:");
    skipped.forEach(item => console.log(`- ${item.file}: ${item.reason}`));
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
