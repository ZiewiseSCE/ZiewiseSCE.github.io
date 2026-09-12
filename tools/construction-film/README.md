# SCEnergy construction film

The homepage uses one 38-second architectural construction film, rendered in Blender 4.5.4 with Cycles, AgX and OptiX denoising. It is original concept geometry in a photographically lit mountain environment, not footage of an actual SCE installation. A single H.264 video repeats the whole construction sequence. The website does not load the Blender scene or run this geometry on the visitor's GPU.

## Reproduce

Requirements: Blender 4.5, an OptiX-capable GPU (or adapt Cycles to CPU), Python with Pillow and FFmpeg or `imageio-ffmpeg`.

1. Download the CC0 resources in `assets.json` beside `build_scene.py` using their recorded URLs. Review the asset license at https://polyhaven.com/license.
2. Run `blender -b -t 8 -P tools/construction-film/build_scene.py -- build`. This writes `sce-construction.blend` beside the script. Use `preview` instead of `build` to also render a small preview.
3. Run `blender -b tools/construction-film/sce-construction.blend -t 6 -P tools/construction-film/render_frames.py -- 1 912`. Frame numbers are inclusive. Separate nonoverlapping ranges can run concurrently if GPU memory permits. The script resumes by skipping existing files; remove incomplete PNG files before resuming after interruption.
4. Run `python tools/construction-film/encode.py`. Use `--frames <directory>` if renders are elsewhere. The encoder verifies every PNG and produces desktop/mobile MP4s and start/complete WebP posters under `resources/media/green-vision/`.
5. Preview through an HTTP server with byte-range support, such as `node tools/green-vision/serve.cjs`. Check automatic muted playback, the end-to-start transition, service-route pause/resume, reduced motion, three languages and 320–1920 px widths.

The final 47 frames dissolve back to the first landscape frame. This makes the full-process loop continuous, without a reverse demolition sequence or a visible playback bar. There is no audio. Desktop is 1920×1080 and mobile is 960×540, both 24 fps; MP4 metadata is moved to the beginning for progressive playback.

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
| 36–38 s | Soft transition back to the starting landscape |

The scene contains modeled structural flanges/webs/stiffeners, fasteners, standing roof seams, 72-cell PV modules, glazed mullions, ESS vents/fans, charging cables and individual leaf geometry. The crane moves during early construction and is removed before the PV stage.

## Environmental comparison scenario

The website's inputs are in `resources/js/impact-model.js`; translations and time-linked counters are in `impact-vision.js`. See `IMPACT-BASIS.md` for evidence, units and limitations. The forest is a symbolic visual comparison, not one modeled tree per equivalent tree. Counters rise once with the first film sequence and retain the final scenario values on later loops. They are not a live generation feed.

The earlier v6 Mixkit/Three.js film and its tools remain available for cached older pages. The current homepage does not request those media files.
