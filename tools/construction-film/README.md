# SCEnergy construction film

The homepage uses one 62-second architectural film, rendered in Blender 4.5.4 with Cycles, AgX and OptiX denoising. It is original concept geometry in a photographically lit mountain environment, not footage of an actual SCE installation. The building is constructed, a forest grows, and a day-to-night cycle explains solar generation and ESS storage. A single H.264 video repeats the whole sequence. The website does not load the Blender scene or run this geometry on the visitor's GPU.

## Reproduce

Requirements: Blender 4.5, an OptiX-capable GPU (or adapt Cycles to CPU), Python with Pillow and FFmpeg or `imageio-ffmpeg`.

1. Download the CC0 resources in `assets.json` beside `build_scene.py` using their recorded URLs. Review the asset license at https://polyhaven.com/license.
2. Run `blender -b -t 8 -P tools/construction-film/build_scene.py -- build`. This writes `sce-construction.blend` beside the script. Use `preview` instead of `build` to also render a small preview.
3. Run `blender -b tools/construction-film/sce-construction.blend -t 6 -P tools/construction-film/render_frames.py -- 1 912`. Frame numbers are inclusive. Separate nonoverlapping ranges can run concurrently if GPU memory permits. The script resumes by skipping existing files; remove incomplete PNG files before resuming after interruption.
4. Run `python tools/construction-film/encode.py`. Use `--frames <directory>` if renders are elsewhere. The encoder verifies every PNG and produces desktop/mobile MP4s and start/complete WebP posters under `resources/media/green-vision/`.
5. Run `blender -b tools/construction-film/sce-construction.blend -t 6 -P tools/construction-film/day_cycle.py -- <render-directory> render`. This freezes the completed campus and writes `energy-day-cycle.blend` plus 312 frames in `day-frames/`. The 26-second cycle is rendered at 12 fps; gradual lighting/camera motion is interpolated to 24 fps at encoding. Use `preview` to render five lighting checks first.
6. Run `python tools/construction-film/encode_day_cycle.py --construction <original-frames> --day <render-directory>/day-frames --out resources/media/green-vision`. This preserves the first 36 seconds, appends the new cycle and creates the 62-second desktop/mobile films. `encode.py` remains available to reproduce the earlier construction-only film and its posters.
7. Preview through an HTTP server with byte-range support, such as `node tools/green-vision/serve.cjs`. Check muted looping, sun visibility, moving shadows, ESS flow direction, signage, service-route pause/resume, reduced motion, three languages and 320–2560 px widths. Run `qa.cjs`, `qa_energy.cjs` and `qa_motion.cjs` with `NODE_PATH` resolving Playwright.

The final two seconds dissolve back to the starting landscape and briefly hold that image before looping. This makes the full-process loop continuous, without a reverse demolition sequence or a visible playback bar. There is no audio. Desktop is 1920×1080 and mobile is 960×540, both 24 fps; MP4 metadata is moved to the beginning for progressive playback.

## Sequence

| Time | Construction |
| --- | --- |
| 0.7–3.6 s | Foundation pads, anchors and slab |
| 3.3–8.5 s | Steel columns, trusses, beams and purlins |
| 8.8–13.5 s | Cladding, facade glazing, roof and canopy |
| 13.4–19.5 s | Racks and 100 roof PV modules |
| 18–22 s | Yard and ESS enclosures with cooling equipment |
| 22–27.7 s | Solar carport, three DC chargers and arriving EVs |
| 26–35.5 s | Energy flow and 183 individually animated trees |
| 36–39 s | Camera settles into the completed campus; sunrise |
| 39–44 s | Morning: solar starts supplying the building and EV charging; surplus charges ESS |
| 44–52 s | Day: moving sun and shadows; on-site use plus ESS charging |
| 52–56 s | Evening: solar fades, storage takes over, facade/EV lighting and SC ENERGY neon turn on |
| 56–60 s | Night: ESS supplies building and EV loads; battery example decreases |
| 60–62 s | Soft transition back to the starting landscape |

The scene contains modeled structural flanges/webs/stiffeners, fasteners, standing roof seams, 72-cell PV modules, glazed mullions, ESS vents/fans, charging cables and individual leaf geometry. The crane moves during early construction and is removed before the PV stage.

## Solar and storage explanation

`day_cycle.py` animates a real sun lamp, visible solar disk, HDR illumination, warm interior glazing, local luminaires and dimensional SC ENERGY neon. Green world-space paths show solar supplying loads and charging storage; blue paths show ESS discharge after sunset. `resources/js/energy-cycle.js` follows the same video clock for Korean, English and Japanese captions and a 22–92–28% state-of-charge example. The clock and charge are illustrative, not telemetry or a sized system calculation. Mobile/tablet captions sit below the film so they do not cover the sun or equipment. Reduced-motion, save-data and video-failure modes provide a static day/night explanation without downloading the movie.

Framing during the cycle entrance and final reset is synchronized with displayed video frames through `requestVideoFrameCallback`, with a `requestAnimationFrame` fallback. `timeupdate` is used only for text and battery state; its coarse cadence previously caused visible quarter-second jumps in the last two seconds. Media styling is scoped to the video/poster, unchanged text is not rewritten, and completed environmental counters are updated only when the language changes. Motion callbacks stop when the film pauses or the page is hidden. `qa_motion.cjs` checks the reset on desktop/mobile and without video-frame callback support.

The operating principle follows the [US Department of Energy's solar-plus-storage explanation](https://www.energy.gov/cmei/systems/articles/solar-plus-storage-101): surplus solar can be stored for use after dark. The page does not promise complete grid independence or uninterrupted operation. Actual coverage depends on sunlight, storage sizing and load; it is identified as an operating example in every language.

## Environmental comparison scenario

The website's inputs are in `resources/js/impact-model.js`; translations and time-linked counters are in `impact-vision.js`. See `IMPACT-BASIS.md` for evidence, units and limitations. The forest is a symbolic visual comparison, not one modeled tree per equivalent tree. Counters rise once with the first film sequence and retain the final scenario values on later loops. They are not a live generation feed.

The earlier v6 Mixkit/Three.js film and its tools remain available for cached older pages. The current homepage does not request those media files.
