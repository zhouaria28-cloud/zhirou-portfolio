import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const portraitsRoot = "/Users/zhirou/Desktop/作品集/人像";
const python = "/Users/zhirou/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const coversDir = path.join(projectRoot, "assets", "portraits-covers");
const mediaDir = path.join(projectRoot, "assets", "portraits-media");
const indexJson = path.join(projectRoot, "assets", "portraits-index.json");
const indexJs = path.join(projectRoot, "assets", "portraits-index.js");
const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const videoExts = new Set([".mp4", ".mov", ".webm", ".m4v"]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\w\s()-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function titleFromAlbum(name) {
  return name
    .replace(/^\d{4}-\d{2}-\d{2}-?/, "")
    .replace(/[()]/g, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function dateFromAlbum(name, year) {
  const match = name.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : `${year}-01-01`;
}

function fileUrl(file) {
  return `file://${encodeURI(file).replace(/#/g, "%23")}`;
}

function copyImage(src, dest, maxSide = 2200, quality = 82) {
  ensureDir(path.dirname(dest));
  const result = spawnSync(python, ["-", src, dest, String(maxSide), String(quality)], {
    input: `
import os, shutil, sys
from PIL import Image, ImageOps
src, dest, max_side, quality = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
os.makedirs(os.path.dirname(dest), exist_ok=True)
try:
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    if im.mode != "RGB":
        im = im.convert("RGB")
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    im.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
except Exception:
    shutil.copy2(src, dest)
`,
    encoding: "utf8"
  });
  if (result.status !== 0 && !fs.existsSync(dest)) fs.copyFileSync(src, dest);
}

function copyMedia(src, relBase, cover = false) {
  const ext = path.extname(src).toLowerCase();
  if (imageExts.has(ext)) {
    const rel = `${relBase}.jpg`;
    const dest = path.join(projectRoot, rel);
    copyImage(src, dest, cover ? 1200 : 2200, cover ? 80 : 82);
    return rel;
  }
  if (videoExts.has(ext)) {
    const rel = `${relBase}${ext}`;
    const dest = path.join(projectRoot, rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    return rel;
  }
  return "";
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && !entry.name.startsWith("."))
    .map(entry => path.join(dir, entry.name));
}

function buildAlbum(year, albumDir) {
  const name = path.basename(albumDir);
  const id = `${year}-${slugify(name)}`;
  const files = listFiles(albumDir).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExts.has(ext) || videoExts.has(ext);
  }).sort((a, b) => path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true }));
  const coverFile = files.find(file => /^cover\./i.test(path.basename(file))) || "";
  const mediaFiles = coverFile
    ? [coverFile, ...files.filter(file => file !== coverFile)]
    : files;
  const cover = coverFile
    ? copyMedia(coverFile, path.join("assets", "portraits-covers", `${id}-cover`), true)
    : "";
  const media = mediaFiles.map(file => {
    const mediaId = `${id}-${slugify(path.basename(file, path.extname(file)))}`;
    const rel = copyMedia(file, path.join("assets", "portraits-media", mediaId));
    return {
      src: rel,
      originalSrc: fileUrl(file),
      name: path.basename(file),
      type: videoExts.has(path.extname(file).toLowerCase()) ? "video" : "image"
    };
  }).filter(item => item.src);
  return {
    id,
    name,
    title: titleFromAlbum(name),
    year,
    date: dateFromAlbum(name, year),
    isGraduation: /graduation/i.test(name),
    isPets: /pets/i.test(name),
    cover,
    originalCover: coverFile ? fileUrl(coverFile) : "",
    coverName: coverFile ? path.basename(coverFile) : "",
    path: albumDir,
    media
  };
}

function buildIndex() {
  ensureDir(coversDir);
  ensureDir(mediaDir);
  const albums = [];
  for (const year of ["2026", "2025"]) {
    const yearDir = path.join(portraitsRoot, year);
    if (!fs.existsSync(yearDir)) continue;
    for (const entry of fs.readdirSync(yearDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      albums.push(buildAlbum(year, path.join(yearDir, entry.name)));
    }
  }
  const regular2026 = albums.filter(album => album.year === "2026" && !album.isGraduation && !album.isPets);
  const graduations = albums.filter(album => album.isGraduation);
  const regular2025 = albums.filter(album => album.year === "2025" && !album.isGraduation && !album.isPets);
  const pets = albums.filter(album => album.isPets);
  const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date)) || a.title.localeCompare(b.title);
  const sorted = [
    ...regular2026.sort(byDateDesc),
    ...graduations.sort(byDateDesc),
    ...regular2025.sort(byDateDesc),
    ...pets.sort(byDateDesc)
  ];
  const data = { generatedAt: new Date().toISOString(), albums: sorted };
  fs.writeFileSync(indexJson, `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(indexJs, `window.PORTRAITS_INDEX = ${JSON.stringify(data, null, 2)};\n`);
  console.log(`Portrait albums: ${sorted.length}`);
  console.log(`Index: ${indexJson}`);
}

buildIndex();
