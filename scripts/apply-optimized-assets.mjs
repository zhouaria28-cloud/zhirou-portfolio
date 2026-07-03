import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imagePattern = /assets\/[^"')\s]+?\.(?:jpg|jpeg|png)/gi;

function optimizedPathFor(src) {
  const parsed = path.parse(src);
  return path.posix.join("assets-optimized", path.posix.relative("assets", path.posix.join(parsed.dir, `${parsed.name}.webp`)));
}

function hasOptimized(src) {
  return fs.existsSync(path.join(root, optimizedPathFor(src)));
}

function rewriteText(text) {
  let replaced = 0;
  const out = text.replace(imagePattern, src => {
    const optimized = optimizedPathFor(src);
    if (!hasOptimized(src)) return src;
    replaced += 1;
    return optimized;
  });
  return { out, replaced };
}

function rewriteFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return 0;
  const current = fs.readFileSync(file, "utf8");
  const { out, replaced } = rewriteText(current);
  if (replaced) fs.writeFileSync(file, out);
  return replaced;
}

const targets = [
  "index.html",
  "assets/journeys-index.json",
  "assets/journeys-index.js",
  "assets/portraits-index.json",
  "assets/portraits-index.js"
];

let total = 0;
for (const target of targets) {
  const count = rewriteFile(target);
  total += count;
  console.log(`${target}: ${count} optimized image references`);
}
console.log(`Total optimized references: ${total}`);
