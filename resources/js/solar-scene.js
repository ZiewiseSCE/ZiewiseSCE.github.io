import * as THREE from '../vendor/three.module.min.js';

const mountedScenes = new WeakMap();

/** A self-contained, locally rendered solar campus. All controls remain in the page. */
export function initSolarScene() {
  const host = document.getElementById('solar-scene');
  if (!host) return null;
  if (mountedScenes.has(host)) return mountedScenes.get(host);

  const toggle = document.getElementById('scene-toggle');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const compactScreen = window.matchMedia('(max-width: 767px)');
  let renderer;
  let disposed = false;
  let contextLost = false;
  let inView = true;
  let paused = motionPreference.matches;
  let userChangedMotion = false;
  let frame = 0;
  let previousTime = 0;
  let previousSceneTime = 0;
  let elapsed = 0;
  let ready = false;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'solar-scene-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;position:absolute;inset:0;pointer-events:none;';

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true,
    });
  } catch {
    host.dataset.sceneState = 'unavailable';
    if (toggle) toggle.hidden = true;
    return null;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 90);
  camera.position.set(12, 11.5, 15);
  camera.lookAt(0, 0.85, 0);

  const campus = new THREE.Group();
  campus.rotation.y = -0.11;
  scene.add(campus);

  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra });
  const materials = {
    foundation: material(0xd9d9ce),
    grass: material(0x6c8659),
    grassEdge: material(0x9bb692),
    concrete: material(0xcdcec4),
    plaster: material(0xf1f0e8),
    roof: material(0xacb5ad),
    window: material(0x7b939b, { roughness: 0.14, metalness: 0.32, envMapIntensity: 0.7 }),
    darkWindow: material(0x1c353e, { roughness: 0.2, metalness: 0.22 }),
    silver: material(0xafbec0, { roughness: 0.4, metalness: 0.65 }),
    panelFrame: material(0x314753, { roughness: 0.35, metalness: 0.5 }),
    wood: material(0x96795b),
    leaf: material(0x3a5e38),
    leafLight: material(0x667c3e),
    leafDark: material(0x2b4730),
    path: material(0xcfc8b5),
    warm: material(0xc5a66c, { metalness: 0.4, roughness: 0.5 }),
  };

  // A local daylight environment adds believable sky reflections to glass and cells.
  const generatedTextures = [];
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 256;
  const skyContext = skyCanvas.getContext('2d');
  if (skyContext) {
    const sky = skyContext.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#b6d0de');
    sky.addColorStop(0.43, '#e9f0ef');
    sky.addColorStop(0.5, '#fcf8ec');
    sky.addColorStop(0.54, '#aab7a3');
    sky.addColorStop(1, '#748574');
    skyContext.fillStyle = sky;
    skyContext.fillRect(0, 0, 512, 256);
    const daylight = skyContext.createRadialGradient(100, 68, 1, 100, 68, 64);
    daylight.addColorStop(0, 'rgba(255,252,235,1)');
    daylight.addColorStop(0.1, 'rgba(255,252,235,.8)');
    daylight.addColorStop(1, 'rgba(255,252,235,0)');
    skyContext.fillStyle = daylight;
    skyContext.fillRect(0, 0, 512, 256);
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.mapping = THREE.EquirectangularReflectionMapping;
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = skyTexture;
    scene.environmentIntensity = 0.28;
    generatedTextures.push(skyTexture);
  }
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256;
  grassCanvas.height = 256;
  const grassContext = grassCanvas.getContext('2d');
  if (grassContext) {
    const pixels = grassContext.createImageData(256, 256);
    let noiseSeed = 37;
    for (let index = 0; index < pixels.data.length; index += 4) {
      noiseSeed = (noiseSeed * 16807) % 2147483647;
      const variation = (noiseSeed / 2147483647 - 0.5) * 34;
      pixels.data[index] = 102 + variation;
      pixels.data[index + 1] = 125 + variation;
      pixels.data[index + 2] = 78 + variation;
      pixels.data[index + 3] = 255;
    }
    grassContext.putImageData(pixels, 0, 0);
    const grassTexture = new THREE.CanvasTexture(grassCanvas);
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    materials.grass.map = grassTexture;
    materials.grass.color.set(0xffffff);
    generatedTextures.push(grassTexture);
  }

  const windowCanvas = document.createElement('canvas');
  windowCanvas.width = 512;
  windowCanvas.height = 256;
  const windowContext = windowCanvas.getContext('2d');
  if (windowContext) {
    const reflection = windowContext.createLinearGradient(0, 0, 0, 256);
    reflection.addColorStop(0, '#304b58');
    reflection.addColorStop(0.4, '#4b6672');
    reflection.addColorStop(0.61, '#759196');
    reflection.addColorStop(0.64, '#506562');
    reflection.addColorStop(1, '#213638');
    windowContext.fillStyle = reflection;
    windowContext.fillRect(0, 0, 512, 256);
    for (let index = 0; index < 17; index += 1) {
      windowContext.fillStyle = `rgba(15,34,36,${0.025 + (index % 3) * 0.022})`;
      windowContext.fillRect(index * 33 - 12, 160 + (index % 4) * 7, 18, 100);
    }
    const highlight = windowContext.createLinearGradient(0, 0, 512, 160);
    highlight.addColorStop(0, 'rgba(214,230,231,0)');
    highlight.addColorStop(0.32, 'rgba(214,230,231,.12)');
    highlight.addColorStop(0.44, 'rgba(214,230,231,.04)');
    highlight.addColorStop(1, 'rgba(214,230,231,0)');
    windowContext.fillStyle = highlight;
    windowContext.fillRect(0, 0, 512, 256);
    const windowTexture = new THREE.CanvasTexture(windowCanvas);
    windowTexture.colorSpace = THREE.SRGBColorSpace;
    materials.window.map = windowTexture;
    materials.window.color.set(0xffffff);
    generatedTextures.push(windowTexture);
  }

  const hemisphere = new THREE.HemisphereLight(0xeaf4f8, 0x78896c, 1.4);
  scene.add(hemisphere);
  const sunLight = new THREE.DirectionalLight(0xfff3db, 3.15);
  sunLight.position.set(-5, 12, 7);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(compactScreen.matches ? 1024 : 2048, compactScreen.matches ? 1024 : 2048);
  Object.assign(sunLight.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 35 });
  sunLight.shadow.normalBias = 0.04;
  sunLight.shadow.bias = -0.00015;
  sunLight.shadow.radius = 4;
  scene.add(sunLight);
  const fillLight = new THREE.DirectionalLight(0xd2e8ff, 0.55);
  fillLight.position.set(5, 4, -8);
  scene.add(fillLight);

  function box(width, height, depth, mat, x, y, z, parent = campus) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function roundedSlab(width, depth, thickness, radius, mat, y) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const z = -depth / 2;
    shape.moveTo(x + radius, z);
    shape.lineTo(x + width - radius, z);
    shape.quadraticCurveTo(x + width, z, x + width, z + radius);
    shape.lineTo(x + width, z + depth - radius);
    shape.quadraticCurveTo(x + width, z + depth, x + width - radius, z + depth);
    shape.lineTo(x + radius, z + depth);
    shape.quadraticCurveTo(x, z + depth, x, z + depth - radius);
    shape.lineTo(x, z + radius);
    shape.quadraticCurveTo(x, z, x + radius, z);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.06,
      bevelThickness: 0.05,
      curveSegments: 7,
    });
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    campus.add(mesh);
    return mesh;
  }

  roundedSlab(10.8, 7.7, 0.09, 0.21, materials.foundation, -0.16);
  roundedSlab(10.55, 7.45, 0.035, 0.33, materials.grass, -0.035);
  box(7.1, 0.035, 3.48, materials.concrete, 0.6, 0.04, -1.48);
  box(9.76, 0.04, 0.47, materials.path, 0, 0.045, 0.58);
  box(0.58, 0.045, 6.7, materials.path, -4.34, 0.05, 0.05);
  box(0.54, 0.045, 3.0, materials.path, 4.3, 0.05, 1.85);

  // A clean industrial building with glass elevations and a recessed roof deck.
  box(6.4, 1.42, 2.92, materials.plaster, 0.65, 0.77, -1.48);
  box(6.1, 0.8, 0.035, materials.window, 0.65, 0.83, 0.001);
  box(0.035, 0.8, 2.5, materials.window, 3.87, 0.83, -1.48);
  box(6.45, 0.12, 3.0, materials.plaster, 0.65, 1.5, -1.48);
  box(6.07, 0.055, 2.56, materials.roof, 0.65, 1.578, -1.48);
  box(6.47, 0.2, 0.11, materials.plaster, 0.65, 1.61, -2.99);
  box(6.47, 0.16, 0.11, materials.plaster, 0.65, 1.59, 0.025);
  box(0.11, 0.18, 2.97, materials.plaster, -2.59, 1.6, -1.48);
  box(0.11, 0.18, 2.97, materials.plaster, 3.89, 1.6, -1.48);
  for (let index = 0; index < 13; index += 1) {
    box(0.042, 0.92, 0.074, materials.plaster, -2.32 + index * 0.493, 0.82, 0.025);
  }
  for (let index = 0; index < 6; index += 1) {
    box(0.074, 0.91, 0.045, materials.plaster, 3.895, 0.82, -2.64 + index * 0.47);
  }
  box(0.96, 1.12, 0.06, materials.darkWindow, 0.62, 0.64, 0.065);
  box(0.034, 1.12, 0.085, materials.silver, 0.62, 0.64, 0.105);
  box(1.6, 0.09, 0.62, materials.plaster, 0.62, 1.21, 0.3);
  box(1.44, 0.09, 0.38, materials.concrete, 0.62, 0.115, 0.24);
  box(0.15, 0.2, 0.13, materials.warm, 0.89, 0.71, 0.12);

  // One reusable procedural texture provides real photovoltaic cell detail.
  const cellCanvas = document.createElement('canvas');
  cellCanvas.width = 512;
  cellCanvas.height = 768;
  const ctx = cellCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#3d5662';
    ctx.fillRect(0, 0, 512, 768);
    const columns = 6;
    const rows = 10;
    const gap = 2;
    const cw = (512 - gap * (columns + 1)) / columns;
    const ch = (768 - gap * (rows + 1)) / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const left = gap + column * (cw + gap);
        const top = gap + row * (ch + gap);
        ctx.fillStyle = ['#0d2239', '#0d2135', '#0f263e', '#10263a'][(row + column * 3) % 4];
        ctx.beginPath();
        ctx.moveTo(left + 4, top);
        ctx.lineTo(left + cw - 4, top);
        ctx.lineTo(left + cw, top + 4);
        ctx.lineTo(left + cw, top + ch - 4);
        ctx.lineTo(left + cw - 4, top + ch);
        ctx.lineTo(left + 4, top + ch);
        ctx.lineTo(left, top + ch - 4);
        ctx.lineTo(left, top + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(137,160,177,.19)';
        for (let finger = 1; finger < 8; finger += 1) {
          ctx.fillRect(left, top + ch * finger / 8, cw, 0.75);
        }
        ctx.fillStyle = 'rgba(151,176,191,.35)';
        ctx.fillRect(left + cw / 3, top, 0.8, ch);
        ctx.fillRect(left + cw * 2 / 3, top, 0.8, ch);
      }
    }
    const reflection = ctx.createLinearGradient(0, 768, 512, 0);
    reflection.addColorStop(0, 'rgba(138,185,203,0)');
    reflection.addColorStop(0.48, 'rgba(138,185,203,.04)');
    reflection.addColorStop(0.68, 'rgba(188,215,227,.1)');
    reflection.addColorStop(1, 'rgba(138,185,203,.05)');
    ctx.fillStyle = reflection;
    ctx.fillRect(0, 0, 512, 768);
  }
  const cellTexture = new THREE.CanvasTexture(cellCanvas);
  cellTexture.colorSpace = THREE.SRGBColorSpace;
  cellTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
  const cellMaterial = new THREE.MeshPhysicalMaterial({
    color: ctx ? 0xffffff : 0x21465f,
    map: ctx ? cellTexture : null,
    roughness: 0.36,
    metalness: 0.13,
    clearcoat: 0.38,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.35,
  });

  function solarModule(width, length, x, y, z, tilt) {
    const module = new THREE.Group();
    module.position.set(x, y, z);
    module.rotation.x = tilt;
    campus.add(module);
    box(width, 0.045, length, materials.panelFrame, 0, 0, 0, module);
    const cells = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.035, length - 0.035), cellMaterial);
    cells.rotation.x = -Math.PI / 2;
    cells.position.y = 0.0235;
    cells.receiveShadow = true;
    module.add(cells);
    return module;
  }

  for (let row = 0; row < 2; row += 1) {
    const z = -2.12 + row * 1.21;
    for (let column = 0; column < 8; column += 1) {
      solarModule(0.69, 1.04, -2.05 + column * 0.772, 1.8, z, 0.19);
    }
    box(6.11, 0.044, 0.042, materials.silver, 0.65, 1.71, z + 0.31);
    box(6.11, 0.044, 0.042, materials.silver, 0.65, 1.79, z - 0.31);
  }

  for (let row = 0; row < 2; row += 1) {
    const z = 1.42 + row * 1.46;
    for (let column = 0; column < 6; column += 1) {
      solarModule(1.05, 1.19, -3.38 + column * 1.15, 0.61, z, 0.31);
    }
    box(6.8, 0.065, 0.065, materials.silver, -0.505, 0.46, z + 0.34);
    box(6.8, 0.065, 0.065, materials.silver, -0.505, 0.67, z - 0.34);
    for (let support = 0; support < 4; support += 1) {
      const x = -3.26 + support * 1.84;
      box(0.055, 0.39, 0.055, materials.silver, x, 0.25, z + 0.34);
      box(0.055, 0.6, 0.055, materials.silver, x, 0.355, z - 0.34);
      box(0.18, 0.08, 0.21, materials.concrete, x, 0.08, z + 0.34);
      box(0.18, 0.08, 0.21, materials.concrete, x, 0.08, z - 0.34);
    }
  }

  // Cutout leaf sprays break up the canopy edge and cast finely patterned shadows.
  const leafCanvas = document.createElement('canvas');
  leafCanvas.width = 128;
  leafCanvas.height = 128;
  const leafContext = leafCanvas.getContext('2d');
  if (leafContext) {
    leafContext.strokeStyle = '#53643b';
    leafContext.lineWidth = 1.8;
    leafContext.beginPath();
    leafContext.moveTo(58, 124);
    leafContext.lineTo(68, 13);
    leafContext.stroke();
    const leaflets = [[54, 91, -0.72], [79, 79, 0.66], [47, 64, -0.92], [86, 51, 0.75], [56, 37, -0.55], [70, 17, 0.2], [91, 102, 0.85]];
    leaflets.forEach(([x, y, angle], index) => {
      leafContext.save();
      leafContext.translate(x, y);
      leafContext.rotate(angle);
      leafContext.beginPath();
      leafContext.moveTo(0, -19);
      leafContext.bezierCurveTo(18, -8, 13, 13, 0, 20);
      leafContext.bezierCurveTo(-12, 11, -15, -8, 0, -19);
      const tint = leafContext.createLinearGradient(-12, 0, 14, 0);
      tint.addColorStop(0, index % 2 ? '#677647' : '#536c3d');
      tint.addColorStop(0.49, '#71884c');
      tint.addColorStop(0.53, '#506738');
      tint.addColorStop(1, '#3c582f');
      leafContext.fillStyle = tint;
      leafContext.fill();
      leafContext.strokeStyle = 'rgba(150,163,92,.45)';
      leafContext.lineWidth = 0.75;
      leafContext.beginPath();
      leafContext.moveTo(0, -15);
      leafContext.lineTo(0, 18);
      leafContext.stroke();
      leafContext.restore();
    });
  }
  const leafTexture = new THREE.CanvasTexture(leafCanvas);
  leafTexture.colorSpace = THREE.SRGBColorSpace;
  generatedTextures.push(leafTexture);
  const leafGeometry = new THREE.PlaneGeometry(1, 1);
  const leafMaterials = [0xffffff, 0xc3d0ae, 0xa0b195].map((tint) => material(tint, {
    map: leafTexture,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.96,
    envMapIntensity: 0.2,
  }));
  const foliageMatrices = [[], [], []];
  let randomSeed = 173;
  function random() {
    randomSeed = (randomSeed * 16807) % 2147483647;
    return (randomSeed - 1) / 2147483646;
  }
  const leafTransform = new THREE.Object3D();
  function tree(x, z, scale = 1, variation = 0) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.045 * scale, 1.23 * scale, 9), materials.wood);
    trunk.position.set(x, 0.63 * scale, z);
    trunk.castShadow = true;
    campus.add(trunk);
    for (let branchIndex = 0; branchIndex < 5; branchIndex += 1) {
      const angle = branchIndex * 2.4 + variation;
      const start = new THREE.Vector3(x, (0.63 + branchIndex * 0.065) * scale, z);
      const end = new THREE.Vector3(x + Math.cos(angle) * 0.3 * scale, (1.05 + branchIndex * 0.09) * scale, z + Math.sin(angle) * 0.3 * scale);
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * scale, 0.019 * scale, start.distanceTo(end), 6), materials.wood);
      branch.position.copy(start).lerp(end, 0.5);
      branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
      branch.castShadow = true;
      campus.add(branch);
    }
    for (let cluster = 0; cluster < 440; cluster += 1) {
      const angle = cluster * 2.39996 + variation;
      const level = random();
      const spread = Math.sqrt(random()) * 0.47 * Math.sqrt(1 - Math.pow((level - 0.45) * 1.6, 2));
      const size = 0.22 + random() * 0.115;
      const edge = 1 + Math.sin(angle * 3 + level * 6) * 0.11;
      leafTransform.position.set(x + Math.cos(angle) * spread * edge * scale, (0.87 + level * 1.03) * scale, z + Math.sin(angle) * spread * edge * scale);
      leafTransform.rotation.set(random() * Math.PI, random() * Math.PI * 2, random() * Math.PI);
      leafTransform.scale.set(size * scale, size * scale, size * scale);
      leafTransform.updateMatrix();
      foliageMatrices[(variation + cluster) % 3].push(leafTransform.matrix.clone());
    }
  }
  tree(-3.48, -2.68, 1.2, 0);
  tree(-3.52, -1.21, 0.98, 1);
  tree(-4.86, -2.87, 0.82, 1);
  tree(4.65, -2.71, 1.0, 0);
  tree(4.65, -1.24, 0.86, 2);
  tree(4.71, 2.85, 0.76, 1);

  for (let index = 0; index < 9; index += 1) {
    for (let cluster = 0; cluster < 42; cluster += 1) {
      leafTransform.position.set(-3.87 + index * 0.95 + (random() - 0.5) * 0.65, 0.17 + random() * 0.18, -3.44 + (random() - 0.5) * 0.28);
      leafTransform.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      leafTransform.scale.setScalar(0.19 + random() * 0.1);
      leafTransform.updateMatrix();
      foliageMatrices[(cluster + index) % 3].push(leafTransform.matrix.clone());
    }
  }
  leafMaterials.forEach((leafMaterial, index) => {
    const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, foliageMatrices[index].length);
    foliageMatrices[index].forEach((matrix, leafIndex) => leaves.setMatrixAt(leafIndex, matrix));
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    campus.add(leaves);
  });
  for (let index = 0; index < 4; index += 1) {
    box(0.54, 0.025, 0.28, materials.concrete, 3.63, 0.071, 1.15 + index * 0.59);
  }

  // Compact power-conversion cabinets finish the story without labels or branding.
  for (let index = 0; index < 2; index += 1) {
    const x = 4.49 + index * 0.02;
    const z = 0.03 + index * 0.73;
    box(0.6, 0.08, 0.59, materials.concrete, x, 0.09, z);
    box(0.49, 0.91, 0.45, materials.plaster, x, 0.58, z);
    box(0.51, 0.045, 0.49, materials.silver, x, 1.058, z);
    box(0.32, 0.18, 0.011, materials.darkWindow, x, 0.8, z + 0.232);
    for (let vent = 0; vent < 4; vent += 1) {
      box(0.32, 0.018, 0.011, materials.silver, x, 0.3 + vent * 0.058, z + 0.232);
    }
  }

  // A compact survey aircraft follows the installation while the site stays grounded.
  const drone = new THREE.Group();
  drone.scale.setScalar(0.72);
  campus.add(drone);
  const droneShell = material(0xd6d8d4, { roughness: 0.35, metalness: 0.45 });
  const droneCarbon = material(0x222d30, { roughness: 0.48, metalness: 0.18 });
  const droneLens = new THREE.MeshPhysicalMaterial({ color: 0x142b37, roughness: 0.1, metalness: 0.35, clearcoat: 1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), droneShell);
  body.scale.set(0.125, 0.063, 0.19);
  body.castShadow = true;
  drone.add(body);
  box(0.16, 0.055, 0.24, droneCarbon, 0, -0.035, 0.015, drone);
  box(0.085, 0.012, 0.12, droneShell, 0, 0.061, 0.023, drone);
  for (let vent = 0; vent < 3; vent += 1) {
    box(0.038, 0.005, 0.005, droneCarbon, 0, 0.069, 0.036 + vent * 0.013, drone);
  }

  function strut(start, end, radius, mat, parent) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius, direction.length(), 8), mat);
    mesh.position.copy(start).lerp(end, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const propellers = [];
  const propellerBlur = new THREE.MeshBasicMaterial({ color: 0x344044, transparent: true, opacity: 0.095, side: THREE.DoubleSide, depthWrite: false });
  const propellerBlade = material(0x2c3539, { roughness: 0.5, transparent: true, opacity: 0.62, depthWrite: false });
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.014, 0.003);
  bladeShape.bezierCurveTo(-0.078, 0.021, -0.133, 0.015, -0.15, 0.004);
  bladeShape.quadraticCurveTo(-0.085, -0.008, -0.014, -0.006);
  bladeShape.lineTo(0.014, -0.003);
  bladeShape.bezierCurveTo(0.078, -0.021, 0.133, -0.015, 0.15, -0.004);
  bladeShape.quadraticCurveTo(0.085, 0.008, 0.014, 0.006);
  bladeShape.closePath();
  const bladeGeometry = new THREE.ShapeGeometry(bladeShape, 6);
  bladeGeometry.rotateX(-Math.PI / 2);
  for (let index = 0; index < 4; index += 1) {
    const x = (index % 2 ? 1 : -1) * 0.265;
    const z = (index < 2 ? -1 : 1) * 0.235;
    strut(new THREE.Vector3(x * 0.22, -0.005, z * 0.35), new THREE.Vector3(x, 0.004, z), 0.019, droneCarbon, drone);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.057, 12), droneShell);
    motor.position.set(x, 0.015, z);
    motor.castShadow = true;
    drone.add(motor);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.025, 10), droneCarbon);
    hub.position.set(x, 0.054, z);
    drone.add(hub);
    const propeller = new THREE.Mesh(bladeGeometry, propellerBlade);
    propeller.position.set(x, 0.058, z);
    drone.add(propeller);
    propellers.push(propeller);
    const blur = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28), propellerBlur);
    blur.rotation.x = -Math.PI / 2;
    blur.position.set(x, 0.059, z);
    drone.add(blur);
    strut(new THREE.Vector3(x * 0.37, -0.047, z * 0.49), new THREE.Vector3(x * 0.46, -0.145, z * 0.58), 0.011, droneCarbon, drone);
    box(0.034, 0.015, 0.064, droneCarbon, x * 0.46, -0.146, z * 0.58, drone);
  }
  const gimbal = new THREE.Group();
  gimbal.position.set(0, -0.096, -0.14);
  gimbal.rotation.x = -0.28;
  drone.add(gimbal);
  const mount = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), droneCarbon);
  gimbal.add(mount);
  box(0.077, 0.064, 0.057, droneShell, 0, -0.029, -0.042, gimbal);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.018, 16), droneLens);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, -0.029, -0.076);
  gimbal.add(lens);
  const statusLamp = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd9b269 }));
  statusLamp.position.set(0, 0.013, 0.193);
  drone.add(statusLamp);

  const surveyPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.1, 3.35, 1.62),
    new THREE.Vector3(0.3, 3.28, 1.68),
    new THREE.Vector3(2.25, 3.42, 0.95),
    new THREE.Vector3(2.35, 3.55, -0.92),
    new THREE.Vector3(0.35, 3.34, -1.73),
    new THREE.Vector3(-1.95, 3.37, -1.23),
    new THREE.Vector3(-2.55, 3.48, 0.1),
  ], true, 'centripetal');
  const flightPosition = new THREE.Vector3();
  const flightTangent = new THREE.Vector3();

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(35, 35), new THREE.ShadowMaterial({ opacity: 0.2 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.215;
  shadow.receiveShadow = true;
  scene.add(shadow);

  const pointer = new THREE.Vector2();
  const easedPointer = new THREE.Vector2();
  const lookTarget = new THREE.Vector3(0, 0.85, 0);
  const daylightWhite = new THREE.Color(0xfff3df);
  const daylightWarm = new THREE.Color(0xffe7c3);

  function updateCinematicFrame(time) {
    const orbitPhase = time * Math.PI * 2 / 26;
    const orbitAngle = Math.atan2(12, 15) + Math.sin(orbitPhase) * 0.165 + easedPointer.x * 0.09;
    const radius = 19.2;
    camera.position.set(Math.sin(orbitAngle) * radius, 11.5 + Math.sin(orbitPhase + 0.55) * 0.58 - easedPointer.y * 0.32, Math.cos(orbitAngle) * radius);
    lookTarget.y = 0.89 + Math.sin(orbitPhase - 0.4) * 0.045;
    camera.lookAt(lookTarget);
    camera.zoom = 1 + Math.sin(orbitPhase - 0.55) * 0.022;
    camera.updateProjectionMatrix();

    const daylightPhase = time * Math.PI * 2 / 38;
    sunLight.position.set(-5 + Math.sin(daylightPhase) * 2.1, 12 + Math.sin(daylightPhase * 0.7) * 0.5, 7 + (Math.cos(daylightPhase) - 1) * 1.25);
    sunLight.color.copy(daylightWhite).lerp(daylightWarm, (Math.sin(daylightPhase - 0.55) + 1) * 0.22);
    sunLight.intensity = 3.15 + Math.sin(daylightPhase) * 0.14;
    scene.environmentRotation.y = Math.sin(daylightPhase) * 0.115;
    scene.environmentIntensity = 0.28 + Math.sin(daylightPhase) * 0.025;

    const progress = (time / 32) % 1;
    surveyPath.getPointAt(progress, flightPosition);
    surveyPath.getTangentAt(progress, flightTangent);
    drone.position.copy(flightPosition);
    drone.rotation.set(-0.025 + Math.sin(progress * Math.PI * 4) * 0.018, Math.atan2(-flightTangent.x, -flightTangent.z), Math.sin(progress * Math.PI * 2) * 0.04);
    propellers.forEach((propeller, index) => {
      propeller.rotation.y = time * 210 * (index % 2 ? 1 : -1) + index * 1.57;
    });
    gimbal.rotation.x = -0.38 + Math.sin(progress * Math.PI * 2) * 0.09;
  }

  function updateControl() {
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.dataset.paused = String(paused);
  }

  function render() {
    if (disposed || contextLost) return;
    try {
      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        host.classList.add('scene-ready');
        host.dataset.sceneState = 'ready';
        if (toggle) {
          toggle.disabled = false;
          toggle.removeAttribute('aria-disabled');
        }
      }
    } catch {
      contextLost = true;
      host.classList.remove('scene-ready');
      host.dataset.sceneState = 'unavailable';
      if (toggle) {
        toggle.disabled = true;
        toggle.hidden = true;
      }
      stop();
    }
  }

  function canAnimate() {
    return !disposed && !contextLost && !paused && inView && !document.hidden;
  }

  function tick(time) {
    frame = 0;
    if (!canAnimate()) return;
    const interval = compactScreen.matches ? 1000 / 30 : 1000 / 45;
    if (!previousTime) previousTime = time;
    const delta = time - previousTime;
    if (delta >= interval) {
      elapsed += previousSceneTime ? Math.min(time - previousSceneTime, 100) / 1000 : interval / 1000;
      previousSceneTime = time;
      previousTime = time - (delta % interval);
      easedPointer.lerp(pointer, 0.055);
      updateCinematicFrame(elapsed);
      render();
    }
    if (canAnimate()) frame = requestAnimationFrame(tick);
  }

  function start() {
    if (!frame && canAnimate()) {
      previousTime = 0;
      previousSceneTime = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    previousSceneTime = 0;
  }

  function resize() {
    if (disposed || contextLost) return;
    const bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const aspect = bounds.width / bounds.height;
    const height = Math.max(9.6, 14.4 / aspect);
    camera.left = -height * aspect / 2;
    camera.right = height * aspect / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compactScreen.matches ? 1.2 : 1.5));
    renderer.setSize(bounds.width, bounds.height, false);
    render();
  }

  function onPointerMove(event) {
    if (paused || !finePointer.matches || event.pointerType === 'touch') return;
    const bounds = host.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width - 0.5, (event.clientY - bounds.top) / bounds.height - 0.5);
  }
  function onPointerLeave() { pointer.set(0, 0); }
  function onVisibilityChange() { document.hidden ? stop() : start(); }
  function setPaused(value, fromUser = false) {
    paused = value;
    if (fromUser) userChangedMotion = true;
    updateControl();
    if (paused) stop();
    else start();
  }
  function onToggle() { setPaused(!paused, true); }
  function onMotionChange(event) {
    if (!userChangedMotion) setPaused(event.matches);
  }
  function onContextLost(event) {
    event.preventDefault();
    contextLost = true;
    ready = false;
    stop();
    host.classList.remove('scene-ready');
    host.dataset.sceneState = 'unavailable';
    if (toggle) toggle.disabled = true;
  }
  function onContextRestored() {
    contextLost = false;
    if (toggle) toggle.hidden = false;
    resize();
    start();
  }

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(host);
  const intersectionObserver = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) start();
      else stop();
    }, { rootMargin: '80px' })
    : null;
  intersectionObserver?.observe(host);
  window.addEventListener('resize', resize, { passive: true });
  host.addEventListener('pointermove', onPointerMove, { passive: true });
  host.addEventListener('pointerleave', onPointerLeave, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  motionPreference.addEventListener('change', onMotionChange);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  toggle?.addEventListener('click', onToggle);

  const api = {
    pause: () => setPaused(true, true),
    resume: () => setPaused(false, true),
    render,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', resize);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionPreference.removeEventListener('change', onMotionChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      toggle?.removeEventListener('click', onToggle);
      const geometries = new Set();
      const allMaterials = new Set(Object.values(materials));
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
          objectMaterials.forEach((item) => allMaterials.add(item));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      allMaterials.forEach((item) => item.dispose());
      cellTexture.dispose();
      generatedTextures.forEach((texture) => texture.dispose());
      sunLight.shadow.dispose();
      renderer.dispose();
      canvas.remove();
      host.classList.remove('scene-ready');
      delete host.dataset.sceneState;
      mountedScenes.delete(host);
    },
  };

  updateControl();
  updateCinematicFrame(0);
  resize();
  start();
  mountedScenes.set(host, api);
  return api;
}
