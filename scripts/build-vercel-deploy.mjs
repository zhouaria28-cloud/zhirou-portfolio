import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const sourceRoot = path.resolve(new URL("..", import.meta.url).pathname);
const deployRoot = path.resolve(sourceRoot, "..", "zhirou-interactive-site-vercel");
const python = "/Users/zhirou/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const maxVideoBytes = 45 * 1024 * 1024;
const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const videoExts = new Set([".mp4", ".mov", ".webm", ".m4v"]);
const copied = new Set();
const skipped = [];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(rel) {
  const src = path.join(sourceRoot, rel);
  const dest = path.join(deployRoot, rel);
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  copied.add(rel);
  return true;
}

function compressImage(rel) {
  const src = path.join(sourceRoot, rel);
  const dest = path.join(deployRoot, rel);
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  const result = spawnSync(python, ["-", src, dest], {
    input: `
import sys, os
from PIL import Image, ImageOps
src, dest = sys.argv[1], sys.argv[2]
os.makedirs(os.path.dirname(dest), exist_ok=True)
try:
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    if im.mode not in ("RGB", "L"):
        bg = Image.new("RGB", im.size, (8, 8, 10))
        if "A" in im.getbands():
            bg.paste(im, mask=im.getchannel("A"))
            im = bg
        else:
            im = im.convert("RGB")
    max_side = 1800
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    ext = os.path.splitext(dest)[1].lower()
    if ext in (".jpg", ".jpeg"):
        im.save(dest, "JPEG", quality=78, optimize=True, progressive=True)
    elif ext == ".webp":
        im.save(dest, "WEBP", quality=78, method=6)
    elif ext == ".png":
        im.save(dest, "PNG", optimize=True)
    else:
        im.save(dest)
except Exception:
    import shutil
    shutil.copy2(src, dest)
`,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    fs.copyFileSync(src, dest);
  }
  copied.add(rel);
  return true;
}

function maybeCopyMedia(rel) {
  const src = path.join(sourceRoot, rel);
  if (!fs.existsSync(src)) return false;
  const ext = path.extname(rel).toLowerCase();
  const stat = fs.statSync(src);
  if (videoExts.has(ext)) {
    if (stat.size > maxVideoBytes) {
      skipped.push({ rel, size: stat.size, reason: "video over 45MB" });
      return false;
    }
    return copyFile(rel);
  }
  if (imageExts.has(ext)) return compressImage(rel);
  return copyFile(rel);
}

function walkFiles(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}

function copyStaticAssetTree(relDir) {
  for (const file of walkFiles(path.join(sourceRoot, relDir))) {
    const rel = path.relative(sourceRoot, file);
    maybeCopyMedia(rel);
  }
}

function filterIndex(indexRel, globalName, collectionKey) {
  const srcPath = path.join(sourceRoot, indexRel);
  if (!fs.existsSync(srcPath)) return;
  const data = JSON.parse(fs.readFileSync(srcPath, "utf8"));
  const list = data[collectionKey] || [];
  for (const item of list) {
    if (item.cover && !maybeCopyMedia(item.cover)) item.cover = "";
    if (Array.isArray(item.media)) {
      item.media = item.media.filter(media => media?.src && maybeCopyMedia(media.src));
    }
  }
  const outJson = path.join(deployRoot, indexRel);
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(outJson.replace(/\.json$/, ".js"), `window.${globalName} = ${JSON.stringify(data, null, 2)};\n`);
}

ensureDir(deployRoot);

let html = fs.readFileSync(path.join(sourceRoot, "index.html"), "utf8");
fs.writeFileSync(path.join(deployRoot, "index.html"), html);

copyFile("package.json");
copyFile("scripts/build-journeys-index.mjs");
copyFile("scripts/build-portraits-index.mjs");
copyFile("scripts/compress-assets.mjs");
copyFile("scripts/apply-optimized-assets.mjs");
copyFile("scripts/prune-optimized-originals.mjs");
copyFile("scripts/build-vercel-deploy.mjs");

const directAssets = [
  "home-click-drop.mov",
  "works-entry-video.mov",
  "zhirou-character.png",
  "lanyard-back.jpg",
  "intro-1.mov",
  "home-character-loop.mov",
  "intro-2.mov",
  "works-earth-natural.png",
  "works-window-earth-poster.png",
  "works-space-bg.mp4",
  "lanyard-front.png",
  "图1.heic.png",
  "zhirou-walking-transparent.gif",
  "home-bg-audio.mov",
  "home-character.gif",
  "zhirou-walking.gif",
  "works-space-bg.mov",
  "portraits-bg.mov",
  "works-underwater.flac",
  "lanyard-front.jpg",
  "about-melbourne-uni-student.jpg",
  "about-application-operations.jpg",
  "about-content-strategist.jpg",
  "about-event-photography-1.jpg",
  "about-event-photography-2.jpg",
  "about-self-media.jpg",
  "about-documentary-photographer.jpg"
];

for (const asset of directAssets) maybeCopyMedia(path.join("assets", asset));
copyStaticAssetTree("assets/portrait-tags");
copyStaticAssetTree("assets/portraits-covers");
filterIndex("assets/journeys-index.json", "JOURNEYS_INDEX", "journeys");
filterIndex("assets/portraits-index.json", "PORTRAITS_INDEX", "albums");

const notes = [
  "# Deployment Notes",
  "",
  "This is the GitHub/Vercel-friendly build of Zhirou's portfolio.",
  "",
  "- Large videos over 45MB were intentionally excluded from this folder.",
  "- `assets/curiosities.mp4` was excluded because the source file is 464MB. The documentary button now opens the configured Cloudinary URL directly.",
  "- Images in `journeys-media` and `portraits-media` were resized/compressed for web deployment.",
  "",
  "Skipped files:",
  ...skipped.map(item => `- ${item.rel} (${(item.size / 1024 / 1024).toFixed(1)}MB): ${item.reason}`),
  ""
].join("\n");
fs.writeFileSync(path.join(deployRoot, "DEPLOYMENT_NOTES.md"), notes);

console.log(`Deploy folder: ${deployRoot}`);
console.log(`Copied/processed files: ${copied.size}`);
console.log(`Skipped files: ${skipped.length}`);
