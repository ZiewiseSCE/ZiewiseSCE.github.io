import * as THREE from '../vendor/three.module.min.js';
import { createSectionModel } from './section-models.js?v=20260912-4';

let mounted;

/** Local views share one WebGL renderer, including the selected service detail. */
export function initSectionScenes() {
  if (mounted) return mounted;
  const hosts = [...document.querySelectorAll('[data-scene]')];
  if (!hosts.length) return null;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 760px)');
  const kinds = new Set(['overview', 'modules', 'rooftop', 'pvsyst', 'drone', 'cctv', 'pathfinder', 'contact']);
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let renderer;
  let available = true;
  let disposed = false;
  let frame = 0;
  let lastTime = 0;
  let lastRenderedAt = 0;
  let bufferWidth = 0;
  let bufferHeight = 0;

  const focusIndex = value => {
    const index = Number(value);
    return Number.isInteger(index) && index >= -1 && index <= 3 ? index : -1;
  };
  const views = hosts.map(host => ({
    host,
    sceneFrame: host.closest('[data-scene-frame]'),
    kind: host.dataset.scene,
    button: host.closest('[data-scene-frame]').querySelector('.scene-motion'),
    focus: focusIndex(host.dataset.sceneFocus ?? host.closest('[data-scene-frame]').dataset.sceneFocus ?? -1),
    near: false,
    paused: host.closest('[data-scene-frame]').dataset.scenePaused === undefined ? motion.matches : host.closest('[data-scene-frame]').dataset.scenePaused === 'true',
    userOverride: false,
    model: null,
    canvas: null,
    context: null,
    dirty: true,
    ready: false,
    failed: false,
    time: 0,
    pointer: new THREE.Vector2(),
    easedPointer: new THREE.Vector2(),
    width: 0,
    height: 0,
    drawCount: 0,
    lastUsed: 0,
  }));
  const byHost = new Map(views.map(view => [view.host, view]));
  const bySceneId = new Map();
  for (const view of views) {
    if (view.host.id) bySceneId.set(view.host.id, view);
    if (view.sceneFrame.id) bySceneId.set(view.sceneFrame.id, view);
  }
  function control(view) {
    view.button.setAttribute('aria-pressed', String(view.paused));
    view.button.disabled = !view.ready || !available;
  }
  function showFallback(view) {
    view.ready = false;
    view.host.classList.remove('scene-ready');
    view.host.dataset.sceneState = 'unavailable';
    if (view.canvas) view.canvas.style.visibility = 'hidden';
    view.button.disabled = true;
    control(view);
  }
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true,
    });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setScissorTest(true);
  } catch {
    available = false;
    views.forEach(view => { showFallback(view); view.button.hidden = true; });
    return null;
  }

  function initialize(view) {
    if (view.model || view.failed) return;
    try {
      view.model = createSectionModel(view.kind);
      // A service may be selected before its lazily created model is visible.
      view.model.setFocus?.(view.focus, { immediate: true });
      view.canvas = document.createElement('canvas');
      view.canvas.className = 'scene-view-canvas';
      view.canvas.setAttribute('aria-hidden', 'true');
      view.context = view.canvas.getContext('2d', { alpha: true });
      if (!view.context) throw new Error('Canvas unavailable');
      view.host.append(view.canvas);
      view.dirty = true;
    } catch {
      view.failed = true;
      showFallback(view);
      view.button.hidden = true;
    }
  }
  function release(view) {
    view.model?.dispose();
    view.model = null;
    view.canvas?.remove();
    view.canvas = null;
    view.context = null;
    view.width = 0;
    view.height = 0;
    view.ready = false;
    view.dirty = true;
    view.host.classList.remove('scene-ready');
    view.host.dataset.sceneState = 'parked';
    control(view);
  }
  function sizeView(view, bounds) {
    const dpr = Math.min(devicePixelRatio || 1, compact.matches ? 1.15 : 1.5);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    if (width === view.width && height === view.height) return;
    view.width = width;
    view.height = height;
    view.canvas.width = width;
    view.canvas.height = height;
    const model = view.model;
    if (model.resize) model.resize(bounds.width, bounds.height);
    else if (model.camera.isOrthographicCamera) {
      const aspect = bounds.width / bounds.height;
      const span = Math.max(model.span || 8, (model.minWidth || model.span || 8) / aspect);
      Object.assign(model.camera, { left: -span * aspect / 2, right: span * aspect / 2, top: span / 2, bottom: -span / 2 });
      model.camera.updateProjectionMatrix();
    } else {
      model.camera.aspect = bounds.width / bounds.height;
      model.camera.updateProjectionMatrix();
    }
    view.dirty = true;
  }
  function draw(view, delta, animated) {
    if (!view.model || view.failed) return;
    if (animated && !view.paused) view.time += delta;
    view.easedPointer.lerp(view.pointer, .08);
    view.model.update(view.time, view.easedPointer);
    renderer.setViewport(0, 0, view.width, view.height);
    renderer.setScissor(0, 0, view.width, view.height);
    renderer.clear();
    renderer.render(view.model.scene, view.model.camera);
    // Copy immediately, before the next scene replaces the shared drawing buffer.
    view.context.clearRect(0, 0, view.width, view.height);
    view.context.drawImage(renderer.domElement, 0, bufferHeight - view.height, view.width, view.height, 0, 0, view.width, view.height);
    view.canvas.style.visibility = 'visible';
    view.host.classList.add('scene-ready');
    view.host.dataset.sceneState = 'ready';
    view.ready = true;
    view.dirty = false;
    view.drawCount += 1;
    control(view);
  }
  function renderViews(delta = 0) {
    if (!available || disposed || document.hidden) return false;
    const candidates = [];
    for (const view of views) {
      // Explicitly exclude inactive routes, even if an observer entry is stale.
      if (view.host.closest('[hidden]')) {
        if (view.model) release(view);
        continue;
      }
      if (!view.near || view.failed) continue;
      const bounds = view.host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) continue;
      initialize(view);
      if (view.failed) continue;
      sizeView(view, bounds);
      view.lastUsed = performance.now();
      const intersection = Math.max(0, Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, 0));
      candidates.push({ view, visible: intersection > 12, score: intersection / bounds.height });
    }
    // Long service chapters should not retain every visited model on the GPU.
    const candidateViews = new Set(candidates.map(item => item.view));
    const resident = views.filter(view => view.model);
    let excess = resident.length - (compact.matches ? 4 : 6);
    for (const view of resident.filter(view => !candidateViews.has(view)).sort((a, b) => a.lastUsed - b.lastUsed)) {
      if (excess-- <= 0) break;
      release(view);
    }
    candidates.sort((a, b) => b.score - a.score);
    const maxMoving = compact.matches || (navigator.hardwareConcurrency || 8) < 5 ? 2 : 3;
    const moving = candidates.filter(item => item.visible && !item.view.paused).slice(0, maxMoving);
    const active = new Set(moving.map(item => item.view));
    const toDraw = candidates.filter(item => item.view.dirty || active.has(item.view));
    if (toDraw.length) {
      const width = Math.max(...toDraw.map(item => item.view.width));
      const height = Math.max(...toDraw.map(item => item.view.height));
      if (width !== bufferWidth || height !== bufferHeight) {
        renderer.setSize(width, height, false);
        bufferWidth = width;
        bufferHeight = height;
      }
      for (const { view } of toDraw) {
        try { draw(view, delta, active.has(view)); }
        catch { view.failed = true; showFallback(view); view.button.hidden = true; }
      }
    }
    return moving.length > 0;
  }
  function tick(time) {
    frame = 0;
    if (!available || disposed || document.hidden) return;
    const interval = 1000 / (compact.matches ? 24 : 30);
    if (!lastTime) lastTime = time - interval;
    const delta = time - lastTime;
    if (delta < interval) { frame = requestAnimationFrame(tick); return; }
    lastTime = time - delta % interval;
    const simulationDelta = lastRenderedAt ? Math.min((time - lastRenderedAt) / 1000, .09) : 0;
    lastRenderedAt = time;
    const moving = renderViews(simulationDelta);
    if (moving) frame = requestAnimationFrame(tick);
    else { lastTime = 0; lastRenderedAt = 0; }
  }
  function wake() {
    if (!frame && available && !disposed && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    lastRenderedAt = 0;
  }
  function resize() { views.forEach(view => { view.dirty = true; }); wake(); }
  function visibility() { if (document.hidden) stop(); else { lastTime = 0; lastRenderedAt = 0; wake(); } }
  function sceneFocus(event) {
    const { sceneId, index, kind } = event.detail || {};
    if (!Number.isInteger(index) || index < -1 || index > 3) return;
    const view = bySceneId.get(sceneId);
    if (!view) return;
    if (kind !== undefined && !kinds.has(kind)) return;
    if (kind && kind !== view.kind) {
      release(view);
      view.kind = kind;
      view.host.dataset.scene = kind;
      view.failed = false;
    }
    view.focus = index;
    view.sceneFrame.dataset.sceneFocus = String(index);
    view.model?.setFocus?.(index, { immediate: motion.matches || view.paused });
    view.dirty = true;
    // A route can become visible and receive its focus before IntersectionObserver
    // catches up. Read its actual bounds so paused views update on the same click.
    const bounds = view.host.getBoundingClientRect();
    view.near = !view.host.closest('[hidden]') && bounds.width > 0 && bounds.height > 0
      && bounds.bottom > -180 && bounds.top < innerHeight + 180;
    if (view.near) renderViews(0);
    // Preserve pause/reduced-motion settings: wake only schedules the dirty frame,
    // and the normal visibility filter decides whether animation should continue.
    wake();
  }
  function scenePause(event) {
    const { sceneId, paused } = event.detail || {};
    const view = bySceneId.get(sceneId);
    if (!view || typeof paused !== 'boolean') return;
    view.paused = paused;
    view.userOverride = true;
    view.dirty = true;
    if (paused) view.model?.setFocus?.(view.focus, { immediate: true });
    control(view);
    wake();
  }
  function motionChange(event) {
    views.forEach(view => {
      if (!view.userOverride) {
        view.paused = event.matches;
        if (view.paused) view.model?.setFocus?.(view.focus, { immediate: true });
        view.dirty = true;
        control(view);
      }
    });
    wake();
  }
  const observers = [];
  const listeners = [];
  for (const view of views) {
    const onToggle = () => {
      view.paused = !view.paused;
      view.userOverride = true;
      view.dirty = true;
      control(view);
      wake();
    };
    const onPointer = event => {
      if (!finePointer.matches || event.pointerType === 'touch' || view.paused) return;
      const bounds = view.host.getBoundingClientRect();
      view.pointer.set((event.clientX - bounds.left) / bounds.width - .5, (event.clientY - bounds.top) / bounds.height - .5);
    };
    const onLeave = () => view.pointer.set(0, 0);
    view.button.addEventListener('click', onToggle);
    view.host.addEventListener('pointermove', onPointer, { passive: true });
    view.host.addEventListener('pointerleave', onLeave, { passive: true });
    listeners.push(() => {
      view.button.removeEventListener('click', onToggle);
      view.host.removeEventListener('pointermove', onPointer);
      view.host.removeEventListener('pointerleave', onLeave);
    });
    control(view);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) byHost.get(entry.target).near = entry.isIntersecting;
      wake();
    }, { rootMargin: '180px' });
    hosts.forEach(host => observer.observe(host));
    observers.push(observer);
  } else views.forEach(view => { view.near = true; });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(resize);
    hosts.forEach(host => observer.observe(host));
    observers.push(observer);
  }
  function lost(event) {
    event.preventDefault();
    available = false;
    stop();
    views.forEach(showFallback);
  }
  function restored() {
    available = true;
    views.forEach(view => { view.dirty = true; view.failed = false; });
    wake();
  }
  renderer.domElement.addEventListener('webglcontextlost', lost);
  renderer.domElement.addEventListener('webglcontextrestored', restored);
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('sce:scenefocus', sceneFocus);
  window.addEventListener('sce:scenepause', scenePause);
  motion.addEventListener('change', motionChange);
  mounted = {
    pauseAll() { views.forEach(view => { view.paused = true; view.userOverride = true; control(view); }); stop(); },
    resumeAll() { views.forEach(view => { view.paused = false; view.userOverride = true; control(view); }); wake(); },
    render() { views.forEach(view => { view.dirty = true; }); renderViews(0); },
    dispose() {
      stop();
      disposed = true;
      observers.forEach(observer => observer.disconnect());
      listeners.forEach(remove => remove());
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('sce:scenefocus', sceneFocus);
      window.removeEventListener('sce:scenepause', scenePause);
      motion.removeEventListener('change', motionChange);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.domElement.removeEventListener('webglcontextrestored', restored);
      views.forEach(view => { view.model?.dispose(); view.canvas?.remove(); showFallback(view); });
      renderer.dispose();
      mounted = null;
    },
  };
  wake();
  return mounted;
}
