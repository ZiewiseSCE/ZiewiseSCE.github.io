# Green Vision film pipeline

The website plays a precomposited film while retaining the existing interactive solar campus. Tree growth, ESS equipment and EV charging models are rendered with Three.js over licensed real mountain footage. Pre-rendering keeps the forest off the visitor's WebGL workload.

## Reproduce

Requirements: Node.js, Playwright with Chromium or Microsoft Edge, Sharp, Python with `opencv-python`, `numpy`, and `imageio-ffmpeg`. Install JavaScript dependencies where Node can resolve `playwright` and `sharp`; do not commit installed dependencies.

1. Obtain the 1080p download of Mixkit item 43130 after reviewing the current item license. Save it beside these scripts as `mountain-hd.mp4`. Source and license links are in `resources/media/green-vision/ATTRIBUTION.md`.
2. Run `python tools/green-vision/prepare.py` from the repository root. This computes the terrain attachment tracks.
3. Start `node tools/green-vision/serve.cjs` in the repository root. The supplied server supports the HTTP byte ranges needed to seek the source video accurately.
4. Run `node tools/green-vision/encode.cjs`. This writes the desktop/mobile films and posters to `resources/media/green-vision/`. The script uses the Microsoft Edge Playwright channel by default; set `SCE_BROWSER_CHANNEL=chromium` for bundled Chromium.
5. Preview the homepage with motion enabled and reduced motion. Check all chapter buttons, the introduction-to-loop transition, offscreen pause, and mobile framing before publishing.

`render.js` defines the geometry and animation. `prepare.py` defines planting density, timing, and source tracking. The film is a concept visualization, not documentation of an actual installation or a quantified ESG benefit.
