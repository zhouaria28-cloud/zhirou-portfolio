import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "assets");
const optimizedDir = path.join(root, "assets-optimized");
const imageExts = new Set([".jpg", ".jpeg", ".png"]);

function walk(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function optimizedFor(file) {
  const rel = path.relative(assetsDir, file);
  const parsed = path.parse(rel);
  return path.join(optimizedDir, parsed.dir, `${parsed.name}.webp`);
}

let removed = 0;
let bytes = 0;
for (const file of walk(assetsDir)) {
  const ext = path.extname(file).toLowerCase();
  if (!imageExts.has(ext)) continue;
  const optimized = optimizedFor(file);
  if (!fs.existsSync(optimized)) continue;
  const stat = fs.statSync(file);
  fs.unlinkSync(file);
  removed += 1;
  bytes += stat.size;
}

console.log(`Removed original image copies: ${removed}`);
console.log(`Removed bytes: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
