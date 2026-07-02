# Zhirou Interactive Portfolio

Static portfolio build for GitHub + Vercel deployment.

## Deploy Root

Use this folder as the project root:

```bash
outputs/zhirou-interactive-site-vercel
```

## Local Preview

```bash
python3 -m http.server 8767
```

Then open:

```text
http://localhost:8767/
```

## GitHub Upload

```bash
git init
git add .
git commit -m "Initial portfolio deploy build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zhirou-portfolio.git
git push -u origin main
```

## Vercel Settings

- Framework Preset: Other
- Build Command: leave empty
- Output Directory: leave empty or `.`

## Large Media Note

This deploy build excludes very large videos. See `DEPLOYMENT_NOTES.md`.
