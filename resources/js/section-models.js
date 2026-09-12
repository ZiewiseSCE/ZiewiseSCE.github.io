import * as THREE from '../vendor/three.module.min.js';

/**
 * Locally generated, architectural/product studies for the service sections.
 * Dimensions are in metres. There are no network assets or simulated readings.
 * The caller owns rendering; every model owns and releases its own GPU assets.
 */
export function createSectionModel(kind = 'overview') {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);
  const textures = new Set();
  const motions = [];
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
  const unitSphere = new THREE.SphereGeometry(1, 20, 12);
  const horizontalPlane = new THREE.PlaneGeometry(1, 1);
  horizontalPlane.rotateX(-Math.PI / 2);
  let seed = 71;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const standard = (color, props = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...props });
  const mat = {
    aluminium: standard(0xb9c2c6, { metalness: 0.88, roughness: 0.27 }),
    satin: standard(0x75818a, { metalness: 0.85, roughness: 0.37 }),
    blackMetal: standard(0x20282d, { metalness: 0.68, roughness: 0.29 }),
    rubber: standard(0x161b1f, { roughness: 0.91 }),
    polymer: standard(0xe1e4df, { roughness: 0.35 }),
    plaster: standard(0xc6cbc1, { roughness: 0.88 }),
    white: standard(0xe8e9e2, { roughness: 0.67 }),
    wall: standard(0x919c95, { metalness: 0.35, roughness: 0.63 }),
    roof: standard(0x919f9d, { metalness: 0.52, roughness: 0.57 }),
    concrete: standard(0xb0b6a9, { roughness: 0.97 }),
    soil: standard(0x626b4e, { roughness: 1 }),
    bark: standard(0x665e4b, { roughness: 1 }),
    leaf: standard(0x4d6651, { roughness: 0.92 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x244957, metalness: 0.35, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.1 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x102f42, metalness: 0.5, roughness: 0.05, clearcoat: 1 }),
    orange: standard(0xc98c3d, { metalness: 0.35, roughness: 0.43 }),
    amber: standard(0xffb343, { emissive: 0xc47710, emissiveIntensity: 0.5, roughness: 0.22 }),
  };

  function canvasTexture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    draw(context, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    textures.add(texture);
    return texture;
  }

  const environment = canvasTexture(512, 256, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#7d9db4');
    sky.addColorStop(0.37, '#c5d5df');
    sky.addColorStop(0.49, '#f4f0dc');
    sky.addColorStop(0.54, '#909889');
    sky.addColorStop(1, '#555f51');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const sun = ctx.createRadialGradient(110, 65, 0, 110, 65, 54);
    sun.addColorStop(0, '#fffdf1');
    sun.addColorStop(0.18, 'rgba(255,251,229,.85)');
    sun.addColorStop(1, 'rgba(255,251,229,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
  });
  if (environment) {
    environment.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = environment;
    scene.environmentIntensity = 0.75;
  }

  const cells = canvasTexture(512, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#333e44';
    ctx.fillRect(0, 0, w, h);
    const gap = 3;
    const cols = 6;
    const rows = 12;
    const cw = (w - 20) / cols;
    const ch = (h - 20) / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = 10 + col * cw + gap / 2;
        const y = 10 + row * ch + gap / 2;
        const shade = 13 + Math.round(random() * 8);
        ctx.fillStyle = `rgb(${shade},${shade + 13},${shade + 24})`;
        const cut = 5;
        ctx.beginPath();
        ctx.moveTo(x + cut, y);
        ctx.lineTo(x + cw - gap - cut, y);
        ctx.lineTo(x + cw - gap, y + cut);
        ctx.lineTo(x + cw - gap, y + ch - gap - cut);
        ctx.lineTo(x + cw - gap - cut, y + ch - gap);
        ctx.lineTo(x + cut, y + ch - gap);
        ctx.lineTo(x, y + ch - gap - cut);
        ctx.lineTo(x, y + cut);
        ctx.closePath();
        ctx.fill();
        // Fine silver fingers and busbars remain visible in product closeups.
        ctx.strokeStyle = 'rgba(164,186,193,.27)';
        ctx.lineWidth = 0.55;
        for (let line = 1; line < 18; line += 1) {
          const yy = y + (ch - gap) * line / 18;
          ctx.beginPath();
          ctx.moveTo(x + 4, yy);
          ctx.lineTo(x + cw - gap - 4, yy);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(174,187,188,.45)';
        for (let line = 1; line < 5; line += 1) ctx.fillRect(x + cw * line / 5, y + 1, 1, ch - gap - 2);
      }
    }
    const reflection = ctx.createLinearGradient(0, 0, w, h);
    reflection.addColorStop(0, 'rgba(160,198,222,.18)');
    reflection.addColorStop(0.45, 'rgba(255,255,255,0)');
    reflection.addColorStop(1, 'rgba(70,112,139,.1)');
    ctx.fillStyle = reflection;
    ctx.fillRect(0, 0, w, h);
  });
  mat.cells = new THREE.MeshPhysicalMaterial({
    color: cells ? 0xffffff : 0x142c40,
    map: cells,
    metalness: 0.32,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.05,
  });
  // Wide architectural views need a less reflective finish than the closeup.
  // This keeps the actual dark cell grid legible at shallow viewing angles.
  mat.arrayCells = mat.cells.clone();
  mat.arrayCells.color.set(0xd4e4f5);
  mat.arrayCells.metalness = 0.08;
  mat.arrayCells.roughness = 0.37;
  mat.arrayCells.clearcoat = 0.35;
  mat.arrayCells.clearcoatRoughness = 0.26;
  mat.arrayCells.envMapIntensity = 0.3;
  const concreteGrain = canvasTexture(128, 128, (ctx, w, h) => {
    const pixels = ctx.createImageData(w, h);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = 172 + random() * 30;
      pixels.data[i] = value;
      pixels.data[i + 1] = value + 3;
      pixels.data[i + 2] = value - 4;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  });
  if (concreteGrain) {
    concreteGrain.wrapS = concreteGrain.wrapT = THREE.RepeatWrapping;
    concreteGrain.repeat.set(5, 5);
    mat.concrete.map = concreteGrain;
  }

  function mesh(geometry, material, parent = root) {
    const object = new THREE.Mesh(geometry, material);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(width, height, depth, material, x = 0, y = 0, z = 0, parent = root) {
    const object = mesh(unitBox, material, parent);
    object.scale.set(width, height, depth);
    object.position.set(x, y, z);
    return object;
  }
  function sphere(radius, material, x = 0, y = 0, z = 0, parent = root, scale = [1, 1, 1]) {
    const object = mesh(unitSphere, material, parent);
    object.scale.set(radius * scale[0], radius * scale[1], radius * scale[2]);
    object.position.set(x, y, z);
    return object;
  }
  function cylinder(radius, height, material, x = 0, y = 0, z = 0, parent = root) {
    const object = mesh(unitCylinder, material, parent);
    object.scale.set(radius, height, radius);
    object.position.set(x, y, z);
    return object;
  }
  function bar(start, end, radius, material, parent = root) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const object = cylinder(radius, a.distanceTo(b), material, 0, 0, 0, parent);
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return object;
  }
  function cable(points, radius, material, parent = root) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 24, radius, 5, false), material, parent);
  }

  /** Module top is local +Y. The dimensions reflect a current full-size PV module. */
  function panel({ width = 1.13, length = 2.18, detailed = false, silver = false } = {}, parent = root) {
    const group = new THREE.Group();
    parent.add(group);
    box(width, 0.035, length, silver ? mat.aluminium : mat.blackMetal, 0, 0, 0, group);
    box(width - 0.034, 0.006, length - 0.034, mat.rubber, 0, 0.019, 0, group);
    const surface = mesh(horizontalPlane, detailed ? mat.cells : mat.arrayCells, group);
    surface.scale.set(width - 0.049, 1, length - 0.049);
    surface.position.y = 0.023;
    if (detailed) {
      box(width - 0.065, 0.004, length - 0.065, mat.white, 0, -0.021, 0, group);
      box(0.19, 0.035, 0.11, mat.blackMetal, 0, -0.041, -length * 0.3, group);
      for (const x of [-width / 2 + 0.025, width / 2 - 0.025]) {
        for (const z of [-length / 2 + 0.04, length / 2 - 0.04]) cylinder(0.007, 0.006, mat.satin, x, 0.023, z, group);
      }
      cable([[0.075, -0.055, -length * 0.3], [0.3, -0.08, -length * 0.22], [0.34, -0.1, 0]], 0.009, mat.rubber, group);
    }
    return group;
  }

  function panelArray({ columns = 4, rows = 2, x = 0, y = 0.6, z = 0, tilt = 0.2, ground = 0, spacing = 2.55, support = true } = {}, parent = root) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    for (let row = 0; row < rows; row += 1) {
      const rowZ = (row - (rows - 1) / 2) * spacing;
      for (let col = 0; col < columns; col += 1) {
        const module = panel({}, group);
        module.position.set((col - (columns - 1) / 2) * 1.17, 0, rowZ);
        module.rotation.x = tilt;
      }
      if (support) {
        for (const localZ of [-0.66, 0.66]) {
          const railY = -localZ * Math.sin(tilt) - 0.055;
          box(columns * 1.17 - 0.1, 0.075, 0.055, mat.aluminium, 0, railY, rowZ + localZ * Math.cos(tilt), group);
          for (const supportX of [-(columns * 1.17 - 0.4) / 2, (columns * 1.17 - 0.4) / 2]) {
            const height = y + railY - ground;
            box(0.055, Math.max(0.06, height), 0.055, mat.satin, supportX, railY - height / 2, rowZ + localZ * Math.cos(tilt), group);
            box(0.19, 0.045, 0.25, mat.satin, supportX, ground - y + 0.02, rowZ + localZ * Math.cos(tilt), group);
          }
        }
      }
    }
    return group;
  }

  function building({ width = 7, depth = 5.5, height = 2.5, x = 0, z = 0, ribs = true, windows = true } = {}, parent = root) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    parent.add(group);
    box(width, 0.14, depth, mat.concrete, 0, 0.07, 0, group);
    box(width - 0.04, height - 0.16, depth - 0.04, mat.wall, 0, height / 2, 0, group);
    box(width + 0.16, 0.12, depth + 0.16, mat.roof, 0, height, 0, group);
    if (ribs) {
      for (let i = 0; i <= Math.floor(width / 0.36); i += 1) {
        const xx = -width / 2 + 0.09 + i * 0.36;
        box(0.025, height - 0.25, 0.04, mat.satin, xx, height / 2, depth / 2, group);
        box(0.025, 0.028, depth, mat.aluminium, xx, height + 0.076, 0, group);
      }
      for (let i = 0; i <= Math.floor(depth / 0.4); i += 1) {
        const zz = -depth / 2 + 0.1 + i * 0.4;
        box(0.04, height - 0.22, 0.026, mat.satin, width / 2, height / 2, zz, group);
      }
    }
    if (windows) {
      const count = Math.max(2, Math.floor(width / 1.4));
      for (let i = 0; i < count; i += 1) {
        const xx = (i - (count - 1) / 2) * 1.35;
        box(1.06, 0.65, 0.06, mat.aluminium, xx, height * 0.61, depth / 2 + 0.027, group);
        box(0.98, 0.58, 0.064, mat.glass, xx, height * 0.61, depth / 2 + 0.033, group);
        box(0.025, 0.58, 0.065, mat.aluminium, xx, height * 0.61, depth / 2 + 0.037, group);
      }
      box(0.9, 1.65, 0.08, mat.blackMetal, width / 2 + 0.025, 0.95, 0, group).rotation.y = Math.PI / 2;
    }
    return group;
  }

  function tree(x, z, height = 3.1, parent = root) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    parent.add(group);
    const trunk = cylinder(0.085, height * 0.66, mat.bark, 0, height * 0.33, 0, group);
    trunk.rotation.z = 0.035;
    for (let branch = 0; branch < 7; branch += 1) {
      const a = branch * 2.399;
      bar([0, height * 0.38, 0], [Math.cos(a) * 0.53, height * (0.68 + (branch % 3) * 0.07), Math.sin(a) * 0.53], 0.022, mat.bark, group);
    }
    const leafGeometry = new THREE.IcosahedronGeometry(1, 1);
    const foliage = new THREE.InstancedMesh(leafGeometry, mat.leaf, 1400);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    const transform = new THREE.Object3D();
    for (let i = 0; i < 1400; i += 1) {
      const angle = random() * Math.PI * 2;
      const r = Math.sqrt(random()) * height * 0.29;
      transform.position.set(Math.cos(angle) * r, height * (0.58 + random() * 0.36) - (r / height) * 0.3, Math.sin(angle) * r);
      transform.scale.set(0.065 + random() * 0.055, 0.013 + random() * 0.014, 0.028 + random() * 0.02);
      transform.rotation.set(random(), random() * 6, random());
      transform.updateMatrix();
      foliage.setMatrixAt(i, transform.matrix);
      foliage.setColorAt(i, new THREE.Color().setHSL(0.24 + random() * 0.055, 0.14 + random() * 0.14, 0.2 + random() * 0.13));
    }
    group.add(foliage);
    return group;
  }

  function inverter(x, y, z, scale = 1, parent = root) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    parent.add(group);
    box(0.72, 1.1, 0.32, mat.polymer, 0, 0, 0, group);
    box(0.66, 1.04, 0.024, mat.white, 0, 0, 0.17, group);
    box(0.23, 0.12, 0.013, mat.blackMetal, 0, 0.21, 0.191, group);
    box(0.055, 0.01, 0.018, standard(0x7da977, { emissive: 0x355d32, emissiveIntensity: 0.25 }), 0, 0.19, 0.204, group);
    for (let i = 0; i < 10; i += 1) box(0.02, 0.78, 0.42, mat.aluminium, -0.31 + i * 0.069, -0.05, -0.2, group);
    for (const xx of [-0.2, -0.07, 0.08, 0.21]) {
      cylinder(0.028, 0.07, mat.blackMetal, xx, -0.59, 0, group);
      cable([[xx, -0.62, 0], [xx, -0.84, 0], [xx * 0.25, -0.95, -0.1]], 0.013, mat.rubber, group);
    }
    return group;
  }

  const hemi = new THREE.HemisphereLight(0xe1edf5, 0x7c8269, 1.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d3, 3.1);
  sun.position.set(-5, 10, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.2, far: 40 });
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xd6e9ff, 0.65);
  fill.position.set(5, 4, -7);
  scene.add(fill);

  const target = new THREE.Vector3(0, 1, 0);
  const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 100);
  const cameraDirection = new THREE.Vector3(9, 7.7, 11).normalize();
  let orbit = 0.055;

  function makeOverview() {
    building({ width: 6.15, depth: 4.9, height: 2.1, x: -1.3, z: -1.3 });
    panelArray({ columns: 5, rows: 2, x: -1.3, y: 2.57, z: -1.3, ground: 2.16, spacing: 2.3, tilt: 0.16 });
    box(10.2, 0.07, 9, mat.concrete, 0, 0.005, 0.25);
    panelArray({ columns: 3, rows: 1, x: 1.3, y: 0.64, z: 3.55, ground: 0.04, tilt: 0.29 });
    inverter(2, 1.1, 1.24, 0.82);
    box(0.07, 1.8, 0.07, mat.satin, 2, 0.9, 1.1);
    tree(3.9, -2.7, 3.25);
    tree(-4.3, 2.8, 2.8);
    motions.push((t) => {
      sun.position.set(-5 + Math.sin(t * 0.18) * 2.8, 9.5, 7 + Math.cos(t * 0.18) * 1.3);
    });
  }

  function makeModules() {
    const showcase = new THREE.Group();
    showcase.position.set(0, 1.22, 0);
    showcase.rotation.x = 0.72;
    showcase.rotation.z = -0.035;
    root.add(showcase);
    panel({ detailed: true, silver: true }, showcase);
    // A second module reveals the depth of the frame and full-scale proportions.
    const second = panel({ detailed: true, silver: true });
    second.position.set(-0.64, 0.77, -0.56);
    second.rotation.set(0.68, -0.05, 0.045);
    for (const x of [-0.4, 0.4]) {
      bar([x, 0.065, 0.38], [x, 1.43, -0.24], 0.027, mat.aluminium);
      bar([x, 0.065, -0.76], [x, 1.43, -0.24], 0.027, mat.aluminium);
      box(0.09, 0.045, 1.28, mat.satin, x, 0.04, -0.19);
    }
    for (const x of [-1.02, -0.26]) {
      box(0.1, 0.055, 0.22, mat.rubber, x, 0.035, 0.27);
      bar([x, 0.04, -1.31], [x, 1.2, -1.1], 0.021, mat.satin);
    }
    cameraDirection.set(5.5, 4.6, 10).normalize();
    orbit = 0.14;
    motions.push((t) => {
      sun.position.set(-4 + Math.sin(t * 0.33) * 3, 7, 5 + Math.cos(t * 0.27) * 2);
    });
  }

  function makeRooftop() {
    building({ width: 8.1, depth: 6.1, height: 2.65 });
    panelArray({ columns: 6, rows: 2, y: 3.12, z: -0.15, ground: 2.72, spacing: 2.7, tilt: 0.15 });
    // Maintenance aisle, drainage and rooftop extraction keep the architecture legible.
    box(0.07, 2.66, 0.07, mat.aluminium, 4.05, 1.36, 2.95);
    box(8.24, 0.1, 0.11, mat.satin, 0, 2.65, 3.12);
    for (const z of [-1.85, 0, 1.85]) {
      cylinder(0.19, 0.28, mat.aluminium, 3.75, 2.91, z);
      const cap = sphere(0.24, mat.satin, 3.75, 3.1, z, root, [1, 0.5, 1]);
      motions.push((t) => { cap.rotation.y = t * 0.85; });
    }
    motions.push((t) => { sun.position.set(-6 + Math.sin(t * 0.19) * 4.5, 10, 6); });
  }

  function sunPath(center, radius, parent = root) {
    const points = [];
    for (let i = 0; i <= 70; i += 1) {
      const angle = Math.PI * (0.08 + (i / 70) * 0.84);
      points.push(new THREE.Vector3(center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius, center[2]));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xb59053, transparent: true, opacity: 0.58 }));
    parent.add(line);
    const marker = sphere(0.075, mat.amber, 0, 0, 0, parent);
    motions.push((t) => {
      const angle = Math.PI * (0.5 + Math.sin(t * 0.22) * 0.34);
      marker.position.set(center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius, center[2]);
      sun.position.copy(marker.position).multiplyScalar(2.6);
      sun.position.y = Math.max(3.8, sun.position.y);
    });
  }

  function makePvsyst() {
    box(7.9, 0.22, 6.2, mat.concrete, 0, 0.11, 0);
    panelArray({ columns: 4, rows: 2, x: -0.8, y: 0.82, z: 0.1, ground: 0.23, tilt: 0.28, spacing: 2.58 });
    box(1.25, 1.9, 1.65, mat.plaster, 2.5, 1.17, -0.7);
    box(1.4, 0.14, 1.8, mat.satin, 2.5, 2.18, -0.7);
    for (let i = 0; i < 5; i += 1) box(0.5, 0.055, 0.03, mat.blackMetal, 2.5, 1.4 + i * 0.12, 0.139);
    sunPath([0, 0.1, -2.5], 4.15);
    cameraDirection.set(9, 9.8, 11).normalize();
    orbit = 0.03;
  }

  function makeDrone() {
    box(6.5, 0.21, 4.9, mat.concrete, 0, 0.105, 0);
    panelArray({ columns: 5, rows: 2, y: 0.6, ground: 0.22, spacing: 2.3, tilt: 0.16 });
    const drone = new THREE.Group();
    root.add(drone);
    const body = sphere(0.33, mat.polymer, 0, 0, 0, drone, [1, 0.58, 1.55]);
    body.rotation.x = -0.035;
    box(0.33, 0.15, 0.32, mat.blackMetal, 0, 0.09, -0.22, drone);
    box(0.19, 0.018, 0.24, mat.satin, 0, 0.174, -0.22, drone);
    const rotors = [];
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        const px = x * 0.67;
        const pz = z * 0.62;
        bar([x * 0.19, -0.02, z * 0.25], [px, 0.06, pz], 0.055, mat.blackMetal, drone);
        cylinder(0.073, 0.13, mat.satin, px, 0.12, pz, drone);
        cylinder(0.039, 0.045, mat.blackMetal, px, 0.207, pz, drone);
        const rotor = new THREE.Group();
        rotor.position.set(px, 0.24, pz);
        drone.add(rotor);
        for (let i = 0; i < 2; i += 1) {
          const blade = sphere(1, mat.blackMetal, (i ? -1 : 1) * 0.18, 0, 0, rotor, [0.215, 0.007, 0.031]);
          blade.rotation.y = -0.14;
        }
        const disc = mesh(new THREE.CircleGeometry(0.4, 40), new THREE.MeshBasicMaterial({ color: 0x526369, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }), drone);
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(px, 0.24, pz);
        disc.castShadow = false;
        rotors.push({ rotor, sign: x * z });
        bar([x * 0.22, -0.04, z * 0.26], [x * 0.32, -0.48, z * 0.37], 0.026, mat.blackMetal, drone);
      }
      bar([x * 0.32, -0.48, -0.53], [x * 0.32, -0.48, 0.54], 0.027, mat.blackMetal, drone);
    }
    const gimbal = new THREE.Group();
    gimbal.position.set(0, -0.3, 0.3);
    drone.add(gimbal);
    bar([-0.14, 0.08, 0], [-0.14, -0.07, 0], 0.023, mat.aluminium, gimbal);
    bar([0.14, 0.08, 0], [0.14, -0.07, 0], 0.023, mat.aluminium, gimbal);
    box(0.25, 0.18, 0.2, mat.blackMetal, 0, -0.045, 0.025, gimbal);
    const lens = cylinder(0.066, 0.052, mat.lens, 0, -0.045, 0.15, gimbal);
    lens.rotation.x = Math.PI / 2;
    sphere(0.018, mat.amber, -0.24, 0.01, 0.25, drone);
    motions.push((t) => {
      drone.position.set(Math.sin(t * 0.41) * 1.15, 2.75 + Math.sin(t * 0.71) * 0.12, Math.cos(t * 0.32) * 0.53);
      drone.rotation.set(Math.sin(t * 0.41) * 0.035, Math.sin(t * 0.25) * 0.25, -Math.cos(t * 0.41) * 0.045);
      gimbal.rotation.x = 0.35 + Math.sin(t * 0.31) * 0.2;
      for (const { rotor, sign } of rotors) rotor.rotation.y = t * 58 * sign;
    });
    cameraDirection.set(8, 7, 11).normalize();
    orbit = 0.04;
  }

  function makeCctv() {
    const trailer = new THREE.Group();
    root.add(trailer);
    box(1.38, 0.16, 1.98, mat.satin, 0, 0.42, 0, trailer);
    box(1.29, 0.82, 1.72, mat.polymer, 0, 0.92, 0.06, trailer);
    box(1.34, 0.055, 1.8, mat.aluminium, 0, 1.36, 0.06, trailer);
    box(0.8, 0.61, 0.025, mat.white, 0, 0.92, 0.936, trailer);
    box(0.025, 0.12, 0.035, mat.blackMetal, 0.29, 0.94, 0.961, trailer);
    for (let i = 0; i < 5; i += 1) box(0.36, 0.022, 0.034, mat.satin, -0.12, 0.72 + i * 0.065, 0.955, trailer);
    for (const x of [-0.78, 0.78]) {
      const wheel = cylinder(0.32, 0.18, mat.rubber, x, 0.34, 0.18, trailer);
      wheel.rotation.z = Math.PI / 2;
      const rim = cylinder(0.175, 0.188, mat.aluminium, x, 0.34, 0.18, trailer);
      rim.rotation.z = Math.PI / 2;
      const hub = cylinder(0.064, 0.21, mat.satin, x, 0.34, 0.18, trailer);
      hub.rotation.z = Math.PI / 2;
      box(0.28, 0.055, 0.85, mat.aluminium, x, 0.7, 0.18, trailer);
      for (const z of [-0.72, 0.72]) {
        box(0.65, 0.075, 0.075, mat.satin, x * 1.14, 0.38, z, trailer);
        cylinder(0.033, 0.36, mat.aluminium, x * 1.5, 0.23, z, trailer);
        box(0.27, 0.055, 0.27, mat.satin, x * 1.5, 0.04, z, trailer);
        bar([x * 1.5 - 0.08, 0.49, z], [x * 1.5 + 0.08, 0.49, z], 0.014, mat.blackMetal, trailer);
      }
    }
    bar([-0.49, 0.39, 0.89], [0, 0.39, 2.03], 0.053, mat.satin, trailer);
    bar([0.49, 0.39, 0.89], [0, 0.39, 2.03], 0.053, mat.satin, trailer);
    box(0.13, 0.09, 0.28, mat.aluminium, 0, 0.39, 2.08, trailer);
    cylinder(0.025, 0.35, mat.satin, 0.12, 0.22, 1.7, trailer);
    const jockey = cylinder(0.075, 0.045, mat.rubber, 0.12, 0.075, 1.7, trailer);
    jockey.rotation.z = Math.PI / 2;
    const roofPanel = panel({ width: 1.14, length: 1.95, silver: true }, trailer);
    roofPanel.position.set(0, 1.7, 0.04);
    roofPanel.rotation.x = 0.24;
    for (const x of [-0.47, 0.47]) {
      bar([x, 1.38, -0.7], [x, 1.87, -0.7], 0.025, mat.satin, trailer);
      bar([x, 1.38, 0.74], [x, 1.54, 0.74], 0.025, mat.satin, trailer);
    }
    // Nested square mast sections, locking collars and exposed cable are functional details.
    const mastZ = -0.79;
    box(0.18, 2.4, 0.18, mat.aluminium, 0, 1.64, mastZ, trailer);
    box(0.13, 1.67, 0.13, mat.satin, 0, 3.29, mastZ, trailer);
    box(0.095, 0.98, 0.095, mat.aluminium, 0, 4.17, mastZ, trailer);
    for (const y of [1.62, 2.78, 3.99]) box(0.22 - y * 0.02, 0.085, 0.22 - y * 0.02, mat.blackMetal, 0, y, mastZ, trailer);
    cable([[0.12, 1.1, mastZ], [0.17, 2.1, mastZ], [0.11, 3.15, mastZ], [0.09, 4.48, mastZ]], 0.012, mat.rubber, trailer);
    const head = new THREE.Group();
    head.position.set(0, 4.55, mastZ);
    trailer.add(head);
    box(1.07, 0.08, 0.1, mat.aluminium, 0, 0, 0, head);
    for (const x of [-0.43, 0.43]) {
      box(0.08, 0.16, 0.09, mat.satin, x, -0.1, 0, head);
      sphere(0.13, mat.polymer, x, -0.2, 0, head, [1, 0.8, 1]);
      const cameraBall = sphere(0.11, mat.blackMetal, x, -0.29, 0.016, head);
      const lens = cylinder(0.045, 0.023, mat.lens, x, -0.31, 0.111, head);
      lens.rotation.x = Math.PI / 2;
      motions.push((t) => { cameraBall.rotation.y = Math.sin(t * 0.42 + x) * 0.48; });
    }
    cylinder(0.046, 0.065, mat.amber, 0, 0.07, 0, head);
    motions.push((t) => { head.rotation.y = Math.sin(t * 0.37) * 0.62; });
    cameraDirection.set(7, 5, 11).normalize();
    orbit = 0.075;
  }

  function makePathfinder() {
    box(9.3, 0.12, 7.9, mat.concrete, 0, 0.06, 0);
    building({ width: 5.25, depth: 4.9, height: 2.25, x: -1.3, z: 0.3, ribs: false });
    panelArray({ columns: 4, rows: 2, x: -1.3, y: 2.72, z: 0.3, ground: 2.32, spacing: 2.3, tilt: 0.16 });
    building({ width: 1.8, depth: 2.7, height: 3.35, x: 2.65, z: -1.68, ribs: false });
    box(1.94, 0.1, 2.84, mat.white, 2.65, 3.44, -1.68);
    tree(3.1, 2.1, 3.1);
    // A restrained architectural boundary is part of the spatial study, not UI telemetry.
    const boundary = [
      [-4.21, 0.136, -3.36], [-4.21, 0.136, 3.31], [4.08, 0.136, 3.31],
      [4.08, 0.136, -3.36], [-4.21, 0.136, -3.36],
    ].map((point) => new THREE.Vector3(...point));
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundary), new THREE.LineDashedMaterial({ color: 0x668378, dashSize: 0.16, gapSize: 0.09, transparent: true, opacity: 0.7 })));
    root.children[root.children.length - 1].computeLineDistances();
    motions.push((t) => { sun.position.set(-5 + Math.sin(t * 0.2) * 5, 8, 5 + Math.cos(t * 0.2) * 2); });
    cameraDirection.set(9, 10, 11).normalize();
    orbit = 0.075;
  }

  function makeContact() {
    const module = panel({ detailed: true, silver: true });
    module.position.set(-0.68, 1.04, 0);
    module.rotation.x = 0.75;
    for (const x of [-1.08, -0.28]) {
      bar([x, 0.04, -0.65], [x, 1.4, -0.39], 0.025, mat.satin);
      bar([x, 0.04, 0.72], [x, 1.4, -0.39], 0.025, mat.satin);
      box(0.08, 0.04, 1.45, mat.aluminium, x, 0.03, 0);
    }
    box(0.83, 1.82, 0.095, mat.satin, 0.74, 0.94, -0.42);
    inverter(0.74, 1.22, -0.21, 0.87);
    box(0.94, 0.08, 0.72, mat.aluminium, 0.74, 0.055, -0.38);
    cable([[-0.31, 0.81, -0.27], [0.06, 0.45, -0.3], [0.24, 0.21, -0.43], [0.67, 0.38, -0.4], [0.72, 0.62, -0.23]], 0.015, mat.rubber);
    cameraDirection.set(7, 5, 12).normalize();
    orbit = 0.11;
    motions.push((t) => { sun.position.set(-4 + Math.sin(t * 0.26) * 2, 8, 6); });
  }

  const builders = { overview: makeOverview, modules: makeModules, rooftop: makeRooftop, pvsyst: makePvsyst, drone: makeDrone, cctv: makeCctv, pathfinder: makePathfinder, contact: makeContact };
  (builders[kind] || builders.overview)();
  for (const motion of motions) motion(0);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  bounds.getCenter(target);
  const dimensions = bounds.getSize(new THREE.Vector3());
  const orbitRadius = Math.max(12, dimensions.length() * 1.9);
  camera.position.copy(cameraDirection).multiplyScalar(orbitRadius).add(target);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);

  const shadowCatcher = mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ color: 0x243c34, opacity: 0.19 }), scene);
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = -0.032;
  shadowCatcher.castShadow = false;
  sun.target.position.copy(target);

  const corners = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
  }
  let projectedWidth = 0;
  let projectedHeight = 0;
  for (const corner of corners) {
    corner.applyMatrix4(camera.matrixWorldInverse);
    projectedWidth = Math.max(projectedWidth, Math.abs(corner.x) * 2);
    projectedHeight = Math.max(projectedHeight, Math.abs(corner.y) * 2);
  }
  const padding = kind === 'drone' ? 1.22 : 1.14;
  const span = Math.max(projectedHeight, projectedWidth / 1.2) * padding;
  let disposed = false;

  function resize(width, height) {
    const aspect = Math.max(0.5, width / Math.max(1, height));
    const fittedSpan = Math.max(projectedHeight, projectedWidth / aspect) * padding;
    camera.left = -fittedSpan * aspect / 2;
    camera.right = fittedSpan * aspect / 2;
    camera.top = fittedSpan / 2;
    camera.bottom = -fittedSpan / 2;
    camera.updateProjectionMatrix();
  }
  resize(600, 360);

  function update(timeSeconds = 0, pointer = { x: 0, y: 0 }) {
    if (disposed) return;
    const t = Number.isFinite(timeSeconds) ? timeSeconds : 0;
    for (const motion of motions) motion(t);
    const angle = Math.sin(t * 0.18) * orbit + THREE.MathUtils.clamp(pointer.x || 0, -1, 1) * 0.035;
    const direction = cameraDirection.clone().applyAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
    direction.y += THREE.MathUtils.clamp(pointer.y || 0, -1, 1) * 0.018;
    camera.position.copy(direction.normalize()).multiplyScalar(orbitRadius).add(target);
    camera.lookAt(target);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    const geometries = new Set([unitBox, unitCylinder, unitSphere, horizontalPlane]);
    const materials = new Set(Object.values(mat));
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of list) materials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    sun.shadow.map?.dispose();
    scene.environment = null;
    scene.clear();
  }

  update(0);
  return { scene, camera, span, target, resize, update, dispose };
}
