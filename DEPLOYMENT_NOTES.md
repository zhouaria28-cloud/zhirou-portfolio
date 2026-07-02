# Deployment Notes

This is the GitHub/Vercel-friendly build of Zhirou's portfolio.

- Large videos over 45MB were intentionally excluded from this folder.
- `assets/curiosities.mp4` was excluded because the source file is 464MB. The documentary button now opens the configured Cloudinary URL directly.
- Images in `journeys-media` and `portraits-media` were resized/compressed for web deployment.

Skipped files:
- assets/journeys-media/whitsundays/001-dji_mimo_20250928_182254_272_1759052847771_video.mp4 (68.8MB): video over 45MB
- assets/journeys-media/whitsundays/002-dji_mimo_20250928_182424_275_1759052843853_video.mp4 (58.2MB): video over 45MB
- assets/portraits-media/2026-2026-04-04-botanical-resonance-(video)-copy-0cf8c07b-7cb9-4d88-8e85-65711a75a8e6.mov (87.9MB): video over 45MB
