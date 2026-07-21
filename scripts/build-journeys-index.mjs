import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const sourceRoot = "/Users/zhirou/Desktop/作品集";
const outDir = path.join(projectRoot, "assets", "journeys-media");
const indexJsonPath = path.join(projectRoot, "assets", "journeys-index.json");
const indexJsPath = path.join(projectRoot, "assets", "journeys-index.js");

const locations = [
  { id: "changbai", name: "Changbai Mountain", cn: "长白山", folder: "长白山" },
  { id: "qingdao", name: "Qingdao", cn: "青岛", folder: "青岛" },
  { id: "malaysia", name: "Malaysia", cn: "马来西亚", folder: "马来西亚" },
  { id: "singapore", name: "Singapore", cn: "新加坡", folder: "新加坡" },
  { id: "whitsundays", name: "Whitsundays", cn: "圣灵群岛", folder: "圣灵群岛" },
  { id: "melbourne", name: "Melbourne", cn: "墨尔本", folder: "墨尔本" },
  { id: "new-zealand", name: "New Zealand", cn: "新西兰", folder: "新西兰" },
  { id: "pingtan", name: "PINGTAN", cn: "平潭", folder: "平潭" },
  { id: "huangshan", name: "HUANGSHAN", cn: "黄山", folder: "黄山" },
  { id: "sydney", name: "Sydney", cn: "悉尼", folder: "悉尼" },
  { id: "hobart", name: "Hobart", cn: "霍巴特", folder: "霍巴特" }
];

const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"]);
const videoExts = new Set([".mp4", ".mov", ".webm", ".m4v"]);

function naturalSort(a, b) {
  return a.localeCompare(b, "zh-Hans-CN", { numeric: true, sensitivity: "base" });
}

function slugFileName(name, index) {
  const parsed = path.parse(name);
  const ext = parsed.ext.toLowerCase();
  const base = parsed.name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `media-${index + 1}`;
  return `${String(index + 1).padStart(3, "0")}-${base}${ext}`;
}

function readMediaFiles(folderPath) {
  if (!fs.existsSync(folderPath)) return [];
  return fs.readdirSync(folderPath, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(name => !name.startsWith("."))
    .filter(name => {
      const ext = path.extname(name).toLowerCase();
      return imageExts.has(ext) || videoExts.has(ext);
    })
    .sort(naturalSort);
}

fs.mkdirSync(outDir, { recursive: true });

const journeys = locations.map(location => {
  const folderPath = path.join(sourceRoot, location.folder);
  const locationOutDir = path.join(outDir, location.id);
  fs.mkdirSync(locationOutDir, { recursive: true });
  const media = readMediaFiles(folderPath).map((name, index) => {
    const ext = path.extname(name).toLowerCase();
    const type = videoExts.has(ext) ? "video" : "image";
    const destName = slugFileName(name, index);
    const source = path.join(folderPath, name);
    const dest = path.join(locationOutDir, destName);
    fs.copyFileSync(source, dest);
    return {
      type,
      src: `assets/journeys-media/${location.id}/${destName}`,
      title: path.parse(name).name,
      originalName: name
    };
  });
  return {
    ...location,
    media,
    cover: media.find(item => item.type === "image")?.src || media[0]?.src || ""
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  journeys
};

fs.writeFileSync(indexJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(indexJsPath, `window.JOURNEYS_INDEX = ${JSON.stringify(payload, null, 2)};\n`);
console.log(`Generated ${journeys.length} journeys and ${journeys.reduce((sum, item) => sum + item.media.length, 0)} media files.`);
