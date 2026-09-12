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
  const focusMotions = [];
  const focusViews = [];
  const focusWeights = [0, 0, 0, 0];
  let selectedFocus = -1;
  let focusImmediate = false;
  let previousTime = 0;
  let transitionPending = false;
  const focusTopics = {
    modules: ['module-layers', 'mounting-interface', 'electrical-integration', 'complete-system'],
    rooftop: ['roof-layout', 'roof-interface', 'maintenance-access', 'operating-system'],
    pvsyst: ['sun-and-obstacles', 'tilt-and-spacing', 'electrical-loss-factors', 'scenario-comparison'],
    drone: ['flight-coverage', 'dual-camera', 'inspection-location', 'maintenance-follow-up'],
    cctv: ['stable-deployment', 'solar-and-battery', 'camera-coverage', 'remote-connection'],
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
  const unitSphere = new THREE.SphereGeometry(1, 20, 12);
  const formedGeometries = new Map();
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
    copper: standard(0xb88654, { metalness: 0.85, roughness: 0.28 }),
    safety: standard(0xb8a461, { roughness: 0.79 }),
    paleBlue: standard(0x668295, { metalness: 0.46, roughness: 0.34 }),
    enamel: new THREE.MeshPhysicalMaterial({ color: 0xd3d9d4, metalness: 0.16, roughness: 0.39, clearcoat: 0.25, clearcoatRoughness: 0.38 }),
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
  mat.arrayCells.clearcoatRoughness = 0.21;
  mat.arrayCells.envMapIntensity = 0.41;
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
    mat.concrete.bumpMap = concreteGrain;
    mat.concrete.bumpScale = 0.018;
  }
  const metalGrain = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#bbc4c8';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 1) {
      const shade = 140 + Math.round(random() * 70);
      ctx.strokeStyle = `rgba(${shade},${shade},${shade},.16)`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  });
  if (metalGrain) {
    metalGrain.colorSpace = THREE.NoColorSpace;
    metalGrain.wrapS = metalGrain.wrapT = THREE.RepeatWrapping;
    metalGrain.repeat.set(2, 6);
    mat.aluminium.roughnessMap = metalGrain;
    mat.satin.roughnessMap = metalGrain;
  }
  const powderCoat = canvasTexture(128, 128, (ctx, w, h) => {
    const pixels = ctx.createImageData(w, h);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = 188 + Math.round(random() * 36);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  });
  if (powderCoat) {
    powderCoat.colorSpace = THREE.NoColorSpace;
    powderCoat.wrapS = powderCoat.wrapT = THREE.RepeatWrapping;
    powderCoat.repeat.set(3, 4);
    mat.enamel.roughnessMap = powderCoat;
    mat.enamel.bumpMap = powderCoat;
    mat.enamel.bumpScale = 0.0025;
  }
  const contactOcclusion = canvasTexture(128, 128, (ctx, w, h) => {
    const falloff = ctx.createRadialGradient(w / 2, h / 2, 12, w / 2, h / 2, 62);
    falloff.addColorStop(0, 'rgba(30,44,39,.36)');
    falloff.addColorStop(0.45, 'rgba(30,44,39,.23)');
    falloff.addColorStop(1, 'rgba(30,44,39,0)');
    ctx.fillStyle = falloff; ctx.fillRect(0, 0, w, h);
  });
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contactOcclusion, transparent: true, opacity: 0.62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  mat.contactOcclusion = contactMaterial;

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
  // Formed sheet metal and cast housings catch a thin highlight along real radiused edges.
  function formedBox(width, height, depth, radius, material, x = 0, y = 0, z = 0, parent = root) {
    const r = Math.min(radius, width / 5, height / 5, depth / 3);
    const key = `${width}/${height}/${depth}/${r}`;
    let geometry = formedGeometries.get(key);
    if (!geometry) {
      const bevel = r * 0.6;
      const hw = width / 2 - bevel;
      const hh = height / 2 - bevel;
      const corner = r * 0.7;
      const shape = new THREE.Shape();
      shape.moveTo(-hw + corner, -hh);
      shape.lineTo(hw - corner, -hh); shape.quadraticCurveTo(hw, -hh, hw, -hh + corner);
      shape.lineTo(hw, hh - corner); shape.quadraticCurveTo(hw, hh, hw - corner, hh);
      shape.lineTo(-hw + corner, hh); shape.quadraticCurveTo(-hw, hh, -hw, hh - corner);
      shape.lineTo(-hw, -hh + corner); shape.quadraticCurveTo(-hw, -hh, -hw + corner, -hh);
      geometry = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, steps: 1, bevelEnabled: true, bevelSegments: 2, bevelSize: bevel, bevelThickness: bevel, curveSegments: 3 });
      geometry.translate(0, 0, -depth / 2 + bevel);
      formedGeometries.set(key, geometry);
    }
    const object = mesh(geometry, material, parent); object.position.set(x, y, z);
    return object;
  }
  function contactPatch(width, depth, x, y, z, parent = root) {
    const patch = mesh(horizontalPlane, contactMaterial, parent);
    patch.scale.set(width, 1, depth); patch.position.set(x, y, z);
    patch.castShadow = false; patch.receiveShadow = false;
    return patch;
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

  function outline(points, { color = 0xb9975e, dashed = false, opacity = 0.65 } = {}, parent = root) {
    const material = dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 0.16, gapSize: 0.12, transparent: true, opacity, depthWrite: false })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))), material);
    if (dashed) line.computeLineDistances();
    parent.add(line);
    return line;
  }

  function focusView(index, center, width, height, direction) {
    focusViews[index] = { center: new THREE.Vector3(...center), width, height, direction: new THREE.Vector3(...direction).normalize() };
  }

  function fasteners(parent, positions, radius = 0.012) {
    const geometry = new THREE.CylinderGeometry(radius, radius, radius * 0.9, 6);
    const bolts = new THREE.InstancedMesh(geometry, mat.satin, positions.length);
    const transform = new THREE.Object3D();
    positions.forEach((position, index) => {
      transform.position.set(...position); transform.updateMatrix(); bolts.setMatrixAt(index, transform.matrix);
    });
    bolts.castShadow = true; bolts.receiveShadow = true; parent.add(bolts);
    return bolts;
  }

  function enclosure(x, y, z, parent = root) {
    const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group);
    formedBox(0.78, 1.25, 0.44, 0.019, mat.enamel, 0, 0, 0, group);
    formedBox(0.731, 1.187, 0.016, 0.013, mat.rubber, 0, 0, 0.224, group);
    formedBox(0.72, 1.17, 0.035, 0.012, mat.enamel, 0, 0, 0.238, group);
    formedBox(0.035, 0.2, 0.055, 0.008, mat.blackMetal, 0.25, 0, 0.273, group);
    for (let i = 0; i < 5; i += 1) {
      box(0.39, 0.02, 0.02, mat.blackMetal, -0.05, -0.27 - i * 0.05, 0.263, group);
      box(0.4, 0.014, 0.035, mat.enamel, -0.05, -0.255 - i * 0.05, 0.271, group).rotation.x = -0.2;
    }
    for (const yy of [-0.41, 0.41]) formedBox(0.033, 0.12, 0.025, 0.005, mat.satin, -0.367, yy, 0.255, group);
    for (const xx of [-0.25, 0.25]) cylinder(0.035, 0.08, mat.rubber, xx, -0.67, 0, group);
    return group;
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
    formedBox(0.72, 1.1, 0.32, 0.045, mat.enamel, 0, 0, 0, group);
    formedBox(0.672, 1.052, 0.009, 0.003, mat.rubber, 0, 0, 0.157, group);
    formedBox(0.66, 1.04, 0.031, 0.011, mat.enamel, 0, 0, 0.17, group);
    formedBox(0.23, 0.12, 0.013, 0.004, mat.blackMetal, 0, 0.21, 0.191, group);
    box(0.055, 0.01, 0.018, standard(0x7da977, { emissive: 0x355d32, emissiveIntensity: 0.25 }), 0, 0.19, 0.204, group);
    for (const xx of [-0.291, 0.291]) {
      for (const yy of [-0.468, 0.468]) {
        const screw = cylinder(0.01, 0.008, mat.satin, xx, yy, 0.189, group); screw.rotation.x = Math.PI / 2;
      }
    }
    for (const xx of [-0.351, 0.351]) {
      for (let i = 0; i < 5; i += 1) box(0.018, 0.018, 0.12, mat.rubber, xx, -0.16 - i * 0.045, 0, group);
    }
    for (let i = 0; i < 10; i += 1) box(0.02, 0.78, 0.42, mat.aluminium, -0.31 + i * 0.069, -0.05, -0.2, group);
    for (const xx of [-0.2, -0.07, 0.08, 0.21]) {
      cylinder(0.028, 0.07, mat.blackMetal, xx, -0.59, 0, group);
      cable([[xx, -0.62, 0], [xx, -0.84, 0], [xx * 0.25, -0.95, -0.1]], 0.013, mat.rubber, group);
    }
    return group;
  }

  const hemi = new THREE.HemisphereLight(0xe1edf5, 0x7c8269, 1.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d3, 2.7);
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
    showcase.position.set(-0.78, 1.23, 0);
    showcase.rotation.x = 0.68;
    root.add(showcase);
    // Independently modelled layers expose the function of each real assembly.
    const frame = new THREE.Group(); showcase.add(frame);
    for (const x of [-0.55, 0.55]) box(0.032, 0.039, 2.18, mat.aluminium, x, 0, 0, frame);
    for (const z of [-1.074, 1.074]) box(1.1, 0.039, 0.032, mat.aluminium, 0, 0, z, frame);
    const backsheet = box(1.075, 0.007, 2.125, mat.white, 0, -0.012, 0, showcase);
    const activeCells = mesh(horizontalPlane, mat.cells, showcase);
    activeCells.scale.set(1.07, 1, 2.12); activeCells.position.y = 0.008;
    const cover = mesh(horizontalPlane, new THREE.MeshPhysicalMaterial({ color: 0xc8e0eb, metalness: 0.05, roughness: 0.1, transparent: true, opacity: 0.14, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }), showcase);
    cover.scale.set(1.075, 1, 2.125); cover.position.y = 0.015; cover.castShadow = false;
    const glassEdge = outline([[-0.537, 0, -1.062], [0.537, 0, -1.062], [0.537, 0, 1.062], [-0.537, 0, 1.062], [-0.537, 0, -1.062]], { color: 0x6e8c94, opacity: 0 }, showcase);
    box(0.19, 0.044, 0.12, mat.blackMetal, 0, -0.05, -0.7, showcase);
    fasteners(frame, [[-0.55, 0.025, -1.04], [0.55, 0.025, -1.04], [-0.55, 0.025, 1.04], [0.55, 0.025, 1.04]], 0.008);
    const mounting = new THREE.Group(); mounting.position.x = -0.78; root.add(mounting);
    for (const x of [-0.4, 0.4]) {
      bar([x, 0.16, 0.42], [x, 1.48, -0.29], 0.027, mat.aluminium, mounting);
      bar([x, 0.16, -0.87], [x, 1.48, -0.29], 0.027, mat.aluminium, mounting);
      box(0.09, 0.045, 1.43, mat.satin, x, 0.13, -0.21, mounting);
      for (const z of [-0.76, 0.37]) {
        box(0.23, 0.055, 0.2, mat.aluminium, x, 0.095, z, mounting);
        fasteners(mounting, [[x - 0.075, 0.13, z], [x + 0.075, 0.13, z]], 0.017);
      }
    }
    for (const z of [-0.65, 0.65]) {
      box(1.3, 0.042, 0.052, mat.aluminium, 0, -0.058, z, showcase);
      for (const x of [-0.55, 0.55]) box(0.07, 0.028, 0.09, mat.satin, x, 0.025, z, showcase);
    }
    box(0.95, 2.03, 0.075, mat.satin, 1.08, 1.11, -0.55);
    inverter(1.08, 1.39, -0.28, 0.97);
    enclosure(2.07, 0.76, -0.25);
    for (const x of [0.72, 1.44, 1.81, 2.33]) box(0.045, 0.32, 0.045, mat.aluminium, x, 0.19, -0.5);
    box(1.93, 0.055, 0.17, mat.satin, 1.29, 0.28, -0.61);
    cable([[-0.78, 1.31, -0.52], [-0.46, 0.85, -0.55], [-0.38, 0.31, -0.57], [0.81, 0.32, -0.57], [0.92, 0.73, -0.27]], 0.016, mat.rubber);
    cable([[1.23, 0.77, -0.28], [1.3, 0.3, -0.61], [1.95, 0.3, -0.61], [2.0, 0.09, -0.26]], 0.02, mat.rubber);
    box(4.62, 0.1, 2.94, mat.concrete, 0.37, 0.02, -0.04);
    contactPatch(1.24, 1.03, 2.07, 0.073, -0.25);
    contactPatch(1.12, 0.91, 1.07, 0.073, -0.36);
    for (const x of [-1.18, -0.38]) contactPatch(0.55, 1.47, x, 0.073, -0.2);
    const energyPath = outline([[-0.68, 0.23, 0.32], [-0.03, 0.23, 0.32], [0.54, 0.23, 0.32], [1.08, 0.23, 0.32], [2.06, 0.23, 0.32]], { opacity: 0.22 });
    focusMotions.push(weights => {
      cover.position.y = 0.015 + weights[0] * 0.31;
      glassEdge.position.y = cover.position.y;
      glassEdge.material.opacity = weights[0] * 0.75;
      activeCells.position.y = 0.008 + weights[0] * 0.13;
      backsheet.position.y = -0.012 - weights[0] * 0.065;
      showcase.position.y = 1.23 + weights[1] * 0.15;
      energyPath.material.opacity = 0.18 + weights[2] * 0.65 + weights[3] * 0.35;
    });
    focusView(0, [-0.73, 1.35, 0], 2.45, 2.4, [3.1, 3.6, 8.5]);
    focusView(1, [-0.78, 0.85, 0], 2.4, 2.1, [6, 3.6, 8.5]);
    focusView(2, [1.29, 1.05, -0.15], 2.38, 2.35, [3.5, 2.7, 9]);
    focusView(3, [0.39, 1.06, 0], 4.9, 2.7, [5.5, 4.8, 10]);
    cameraDirection.set(5.5, 4.8, 10).normalize(); orbit = 0.07;
    motions.push(t => { sun.position.set(-4 + Math.sin(t * 0.22) * 2, 7, 5 + Math.cos(t * 0.19)); });
  }

  function makeRooftop() {
    building({ width: 8.1, depth: 6.1, height: 2.65 });
    const array = panelArray({ columns: 5, rows: 2, x: -0.75, y: 3.12, z: -0.15, ground: 2.72, spacing: 2.7, tilt: 0.15 });
    // A separate service corridor keeps ventilation, inspection and drainage accessible.
    const aisle = new THREE.Group(); root.add(aisle);
    box(0.56, 0.035, 5.6, mat.satin, 2.82, 2.752, -0.1, aisle);
    for (let i = 0; i < 53; i += 1) box(0.51, 0.012, 0.021, mat.aluminium, 2.82, 2.776, -2.85 + i * 0.105, aisle);
    for (const x of [2.54, 3.1]) box(0.018, 0.009, 5.6, mat.safety, x, 2.781, -0.1, aisle);
    for (const x of [-3.12, -1.95, -0.78, 0.39, 1.56]) {
      for (const z of [-2.11, -0.8, 0.6, 1.9]) {
        box(0.23, 0.026, 0.26, mat.rubber, x, 2.742, z);
        box(0.13, 0.072, 0.14, mat.aluminium, x, 2.79, z);
        fasteners(root, [[x - 0.035, 2.831, z], [x + 0.035, 2.831, z]], 0.011);
      }
    }
    box(0.07, 2.66, 0.07, mat.aluminium, 4.05, 1.36, 2.95);
    box(8.24, 0.1, 0.11, mat.satin, 0, 2.65, 3.12);
    for (const z of [-1.85, 0, 1.85]) {
      cylinder(0.19, 0.28, mat.aluminium, 3.75, 2.91, z);
      sphere(0.24, mat.satin, 3.75, 3.1, z, root, [1, 0.5, 1]);
    }
    // Fixed ladder, top handholds and anchored cable trays are actual installation details.
    for (const x of [2.57, 3.08]) {
      bar([x, 0.05, 3.3], [x, 3.3, 3.3], 0.027, mat.aluminium);
      bar([x, 3.3, 3.3], [x, 3.3, 2.87], 0.027, mat.aluminium);
    }
    for (let i = 0; i < 11; i += 1) bar([2.57, 0.15 + i * 0.265, 3.3], [3.08, 0.15 + i * 0.265, 3.3], 0.024, mat.satin);
    box(6.45, 0.065, 0.14, mat.satin, -0.45, 2.81, 2.83);
    cable([[1.38, 3.07, 1.17], [1.58, 2.9, 2.72], [-2.66, 2.9, 2.77], [-2.66, 1.08, 3.19]], 0.03, mat.rubber);
    inverter(-2.66, 1.52, 3.15, 0.84);
    enclosure(-1.7, 0.89, 3.15);
    const layoutLine = outline([[-3.73, 2.82, -2.87], [2.28, 2.82, -2.87], [2.28, 2.82, 2.5], [-3.73, 2.82, 2.5], [-3.73, 2.82, -2.87]], { dashed: true, opacity: 0.3 });
    focusMotions.push(weights => {
      array.position.y = 3.12 + weights[1] * 0.36;
      layoutLine.material.opacity = 0.2 + weights[0] * 0.6;
      aisle.position.y = weights[2] * 0.035;
    });
    focusView(0, [0, 2.65, 0], 9, 6.65, [9, 13, 11]);
    focusView(1, [-0.65, 3.0, 1.5], 5.65, 3.5, [8, 3.7, 10]);
    focusView(2, [2.6, 2.32, 0.6], 5.3, 4.65, [9, 10, 11]);
    focusView(3, [-1.4, 1.93, 2.3], 5.9, 4.2, [5.5, 4.5, 12]);
    cameraDirection.set(9, 8.2, 11).normalize(); orbit = 0.04;
    motions.push(t => { sun.position.set(-6 + Math.sin(t * 0.16) * 3, 10, 6); });
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
    return { line, marker };
  }

  function makePvsyst() {
    box(8.8, 0.22, 6.5, mat.concrete, 0.15, 0.11, 0);
    const rows = [-1.25, 1.33].map(z => panelArray({ columns: 4, rows: 1, x: -0.8, y: 0.82, z, ground: 0.23, tilt: 0.28 }));
    box(1.25, 1.9, 1.65, mat.plaster, 2.5, 1.17, -0.7);
    box(1.4, 0.14, 1.8, mat.satin, 2.5, 2.18, -0.7);
    for (let i = 0; i < 5; i += 1) box(0.5, 0.055, 0.03, mat.blackMetal, 2.5, 1.4 + i * 0.12, 0.139);
    inverter(3.34, 0.98, 1.42, 0.74);
    box(0.7, 1.65, 0.07, mat.satin, 3.34, 1.07, 1.18);
    cable([[1.0, 0.73, 1.28], [1.35, 0.27, 1.64], [3.3, 0.27, 1.64], [3.34, 0.55, 1.43]], 0.024, mat.rubber);
    const path = sunPath([0, 0.1, -2.5], 4.15);
    const rays = [];
    for (const x of [-2.55, -0.8, 0.95]) rays.push(outline([[2.5, 4.3, -2.5], [x, 0.86, 1.23]], { dashed: true, opacity: 0.2 }));
    const spacing = outline([[-3.54, 0.27, -1.25], [-3.54, 0.27, 1.33]], { color: 0x547c73, opacity: 0.25 });
    for (const z of [-1.25, 1.33]) outline([[-3.72, 0.27, z], [-3.36, 0.27, z]], { color: 0x547c73, opacity: 0.65 });
    focusMotions.push(weights => {
      rows[0].position.z = -1.25 - weights[1] * 0.28;
      rows[1].position.z = 1.33 + weights[1] * 0.28;
      for (const row of rows) {
        for (const child of row.children) if (child.isGroup) child.rotation.x = 0.28 + weights[1] * 0.08;
      }
      rays.forEach(ray => { ray.material.opacity = weights[0] * 0.44 + weights[3] * 0.17; });
      spacing.material.opacity = 0.16 + weights[1] * 0.74;
      path.line.material.opacity = 0.45 + weights[0] * 0.4;
    });
    motions.push(() => {
      for (const ray of rays) {
        const position = ray.geometry.attributes.position;
        position.setXYZ(0, path.marker.position.x, path.marker.position.y, path.marker.position.z);
        position.needsUpdate = true; ray.computeLineDistances();
      }
    });
    focusView(0, [0.3, 2.06, -0.35], 9.6, 6.3, [9, 10, 11]);
    focusView(1, [-0.96, 0.88, 0.08], 7.2, 4.4, [9, 7.3, 11]);
    focusView(2, [1.5, 1.05, 0.9], 5.0, 3.6, [8, 6, 11]);
    focusView(3, [0.2, 1.65, -0.2], 10, 6.8, [9, 12, 11]);
    cameraDirection.set(9, 9.8, 11).normalize();
    orbit = 0.03;
  }

  function makeDrone() {
    box(6.5, 0.21, 4.9, mat.concrete, 0, 0.105, 0);
    panelArray({ columns: 5, rows: 2, y: 0.6, ground: 0.22, spacing: 2.3, tilt: 0.16 });
    const flightPath = outline([[-2.0, 2.78, -1.24], [2.0, 2.78, -1.24], [2.0, 2.78, 1.18], [-2.0, 2.78, 1.18]], { dashed: true, opacity: 0.25 });
    const inspectionPoint = new THREE.Group(); inspectionPoint.position.set(-1.17, 0.61, 1.15); inspectionPoint.rotation.x = 0.16; root.add(inspectionPoint);
    const thermalTexture = canvasTexture(128, 256, (ctx, w, h) => {
      ctx.fillStyle = '#152f5a'; ctx.fillRect(0, 0, w, h);
      const bloom = ctx.createRadialGradient(w * 0.42, h * 0.47, 1, w * 0.42, h * 0.47, 47);
      bloom.addColorStop(0, '#fff1a5'); bloom.addColorStop(0.2, '#f9c150'); bloom.addColorStop(0.43, '#d26437'); bloom.addColorStop(0.68, '#87435d'); bloom.addColorStop(1, 'rgba(21,47,90,0)');
      ctx.fillStyle = bloom; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(180,200,210,.25)'; ctx.lineWidth = 1;
      for (let col = 1; col < 6; col += 1) { ctx.beginPath(); ctx.moveTo(col * w / 6, 0); ctx.lineTo(col * w / 6, h); ctx.stroke(); }
      for (let row = 1; row < 12; row += 1) { ctx.beginPath(); ctx.moveTo(0, row * h / 12); ctx.lineTo(w, row * h / 12); ctx.stroke(); }
    });
    const thermal = mesh(horizontalPlane, new THREE.MeshBasicMaterial({ map: thermalTexture, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }), inspectionPoint);
    thermal.position.y = 0.039; thermal.scale.set(1.075, 1, 2.125); thermal.castShadow = false;
    const inspectionBoundary = outline([[-0.57, 0.041, -1.1], [0.57, 0.041, -1.1], [0.57, 0.041, 1.1], [-0.57, 0.041, 1.1], [-0.57, 0.041, -1.1]], { opacity: 0.2 }, inspectionPoint);
    const drone = new THREE.Group();
    root.add(drone);
    const body = sphere(0.33, mat.polymer, 0, 0, 0, drone, [1, 0.58, 1.55]);
    body.rotation.x = -0.035;
    box(0.33, 0.15, 0.32, mat.blackMetal, 0, 0.09, -0.22, drone);
    box(0.19, 0.018, 0.24, mat.satin, 0, 0.174, -0.22, drone);
    for (const x of [-0.17, 0.17]) box(0.023, 0.05, 0.17, mat.satin, x, 0.16, -0.22, drone);
    for (let i = 0; i < 5; i += 1) box(0.015, 0.011, 0.1, mat.blackMetal, -0.075 + i * 0.038, 0.19, -0.27, drone);
    fasteners(drone, [[-0.18, 0.13, -0.29], [0.18, 0.13, -0.29], [-0.17, 0.16, 0.17], [0.17, 0.16, 0.17]], 0.013);
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
    box(0.31, 0.19, 0.21, mat.blackMetal, 0, -0.045, 0.025, gimbal);
    const lens = cylinder(0.062, 0.052, mat.lens, -0.071, -0.045, 0.15, gimbal);
    lens.rotation.x = Math.PI / 2;
    const thermalLens = cylinder(0.049, 0.05, mat.copper, 0.085, -0.045, 0.15, gimbal); thermalLens.rotation.x = Math.PI / 2;
    const thermalGlass = cylinder(0.038, 0.054, mat.lens, 0.085, -0.045, 0.16, gimbal); thermalGlass.rotation.x = Math.PI / 2;
    sphere(0.018, mat.amber, -0.24, 0.01, 0.25, drone);
    focusMotions.push(weights => {
      flightPath.material.opacity = 0.12 + weights[0] * 0.58;
      // Illustrative thermal overlay carries no readings or diagnostic claims.
      thermal.material.opacity = weights[2] * 0.74;
      inspectionBoundary.material.opacity = 0.15 + weights[2] * 0.75 + weights[3] * 0.55;
    });
    motions.push((t) => {
      const revisit = focusWeights[2] + focusWeights[3];
      const x = Math.sin(t * 0.3) * 1.65;
      const z = Math.cos(t * 0.22) * 0.75;
      drone.position.set(THREE.MathUtils.lerp(x, -1.17, revisit * 0.84), 2.75 + Math.sin(t * 0.71) * 0.07, THREE.MathUtils.lerp(z, 1.15, revisit * 0.84));
      drone.rotation.set(Math.sin(t * 0.3) * 0.022, Math.sin(t * 0.22) * 0.22, -Math.cos(t * 0.3) * 0.034);
      gimbal.rotation.x = 0.35 + Math.sin(t * 0.31) * 0.2;
      for (const { rotor, sign } of rotors) rotor.rotation.y = t * 58 * sign;
      if (focusViews[1]) focusViews[1].center.copy(drone.position).add(new THREE.Vector3(0, -0.06, 0.2));
    });
    focusView(0, [0, 1.48, 0], 7.7, 5.2, [8, 9, 11]);
    focusView(1, [0, 2.68, 0.2], 3.15, 2.45, [6, 2.7, 11]);
    focusView(2, [-1.0, 1.25, 0.9], 4.1, 3.8, [7, 10, 11]);
    focusView(3, [-0.65, 1.7, 0.52], 6.5, 4.5, [8, 7, 11]);
    cameraDirection.set(8, 7, 11).normalize();
    orbit = 0.04;
  }

  function makeCctv() {
    const trailer = new THREE.Group();
    root.add(trailer);
    box(1.38, 0.16, 1.98, mat.satin, 0, 0.42, 0, trailer);
    formedBox(1.29, 0.065, 1.72, 0.018, mat.enamel, 0, 0.53, 0.06, trailer);
    for (const x of [-0.622, 0.622]) {
      formedBox(0.047, 0.82, 1.72, 0.014, mat.enamel, x, 0.92, 0.06, trailer);
      for (let i = 0; i < 4; i += 1) box(0.052, 0.024, 0.31, mat.rubber, x, 0.98 + i * 0.058, -0.43, trailer);
      for (const z of [-0.67, 0.81]) box(0.053, 0.025, 0.045, mat.satin, x, 1.24, z, trailer);
    }
    formedBox(1.29, 0.82, 0.047, 0.014, mat.enamel, 0, 0.92, -0.776, trailer);
    for (const x of [-0.54, 0.54]) formedBox(0.21, 0.82, 0.045, 0.014, mat.enamel, x, 0.92, 0.9, trailer);
    box(1.3, 0.011, 1.73, mat.rubber, 0, 1.332, 0.06, trailer);
    formedBox(1.34, 0.055, 1.8, 0.018, mat.enamel, 0, 1.36, 0.06, trailer);
    const door = new THREE.Group(); door.position.set(-0.4, 0.92, 0.936); trailer.add(door);
    formedBox(0.812, 0.742, 0.013, 0.004, mat.rubber, 0.4, 0, -0.015, door);
    formedBox(0.776, 0.706, 0.011, 0.003, mat.enamel, 0.4, 0, -0.027, door);
    formedBox(0.8, 0.73, 0.035, 0.011, mat.enamel, 0.4, 0, 0, door);
    box(0.025, 0.12, 0.035, mat.blackMetal, 0.7, 0.02, 0.025, door);
    for (let i = 0; i < 5; i += 1) box(0.36, 0.022, 0.034, mat.satin, 0.3, -0.2 + i * 0.065, 0.02, door);
    for (const y of [-0.24, 0.24]) box(0.034, 0.085, 0.035, mat.satin, 0, y, 0.025, door);
    for (const x of [-0.3, 0, 0.3]) {
      box(0.245, 0.44, 0.51, mat.blackMetal, x, 0.82, 0.24, trailer);
      box(0.25, 0.035, 0.52, mat.satin, x, 1.055, 0.24, trailer);
      for (const z of [0.12, 0.37]) cylinder(0.018, 0.035, mat.copper, x, 1.089, z, trailer);
    }
    cable([[-0.3, 1.09, 0.12], [0, 1.105, 0.12], [0.3, 1.09, 0.12], [0.44, 1.1, -0.24]], 0.018, mat.rubber, trailer);
    box(0.28, 0.29, 0.14, mat.paleBlue, 0.37, 1.15, -0.53, trailer);
    for (const x of [-0.78, 0.78]) {
      const wheel = cylinder(0.32, 0.18, mat.rubber, x, 0.34, 0.18, trailer);
      wheel.rotation.z = Math.PI / 2;
      const rim = cylinder(0.175, 0.188, mat.aluminium, x, 0.34, 0.18, trailer);
      rim.rotation.z = Math.PI / 2;
      const hub = cylinder(0.064, 0.21, mat.satin, x, 0.34, 0.18, trailer);
      hub.rotation.z = Math.PI / 2;
      formedBox(0.28, 0.055, 0.85, 0.018, mat.aluminium, x, 0.7, 0.18, trailer);
      for (const z of [-0.72, 0.72]) {
        box(0.65, 0.075, 0.075, mat.satin, x * 1.14, 0.38, z, trailer);
        cylinder(0.033, 0.36, mat.aluminium, x * 1.5, 0.23, z, trailer);
        box(0.27, 0.055, 0.27, mat.satin, x * 1.5, 0.04, z, trailer);
        contactPatch(0.52, 0.52, x * 1.5, -0.025, z, trailer);
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
    const communication = new THREE.Group(); communication.position.set(0.2, 3.82, mastZ); trailer.add(communication);
    formedBox(0.19, 0.3, 0.12, 0.012, mat.enamel, 0, 0, 0, communication);
    for (const x of [-0.055, 0.055]) cylinder(0.011, 0.32, mat.blackMetal, x, 0.3, 0, communication);
    box(0.024, 0.1, 0.14, mat.satin, -0.16, -0.03, 0, communication);
    const coverage = outline([[-2.05, 0.037, 1.75], [-1.34, 0.037, 2.65], [0, 0.037, 3.1], [1.34, 0.037, 2.65], [2.05, 0.037, 1.75]], { dashed: true, opacity: 0 });
    const coverageEdges = [outline([[0, 4.28, mastZ], [-2.05, 0.04, 1.75]], { opacity: 0 }), outline([[0, 4.28, mastZ], [2.05, 0.04, 1.75]], { opacity: 0 })];
    focusMotions.push(weights => {
      door.rotation.y = -weights[1] * 1.7;
      roofPanel.rotation.x = 0.24 + weights[1] * 0.12;
      coverage.material.opacity = weights[2] * 0.75;
      coverageEdges.forEach(edge => { edge.material.opacity = weights[2] * 0.23; });
    });
    focusView(0, [0, 1.27, 0.35], 3.9, 3.35, [7, 5, 11]);
    focusView(1, [0, 1.24, 0.25], 3.05, 2.6, [5, 3.2, 11]);
    focusView(2, [0, 2.03, 0.74], 5.8, 5.15, [7, 5.5, 11]);
    focusView(3, [0.08, 3.97, -0.74], 2.6, 2.3, [8, 3.5, 11]);
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
  let viewportAspect = 600 / 360;
  const viewTarget = target.clone();
  const viewDirection = cameraDirection.clone();
  const blendedTarget = new THREE.Vector3();
  const blendedDirection = new THREE.Vector3();
  let focusSpan = span;

  function resize(width, height) {
    viewportAspect = Math.max(0.5, width / Math.max(1, height));
    fitCamera();
  }
  function fitCamera() {
    const weightSum = focusWeights.reduce((sum, weight) => sum + weight, 0);
    let fittedSpan = Math.max(projectedHeight, projectedWidth / viewportAspect) * padding * (1 - weightSum);
    for (let i = 0; i < focusViews.length; i += 1) {
      const view = focusViews[i];
      if (view) fittedSpan += Math.max(view.height, view.width / viewportAspect) * focusWeights[i] * 1.08;
    }
    focusSpan = fittedSpan;
    camera.left = -fittedSpan * viewportAspect / 2;
    camera.right = fittedSpan * viewportAspect / 2;
    camera.top = fittedSpan / 2;
    camera.bottom = -fittedSpan / 2;
    camera.updateProjectionMatrix();
  }
  resize(600, 360);

  function setFocus(index = -1, { immediate = false } = {}) {
    if (disposed) return;
    const next = Number.isInteger(index) && focusViews[index] ? index : -1;
    selectedFocus = next;
    focusImmediate = immediate;
    transitionPending = true;
    if (immediate) {
      for (let i = 0; i < focusWeights.length; i += 1) focusWeights[i] = i === selectedFocus ? 1 : 0;
    }
  }

  function update(timeSeconds = 0, pointer = { x: 0, y: 0 }) {
    if (disposed) return;
    const t = Number.isFinite(timeSeconds) ? timeSeconds : 0;
    const delta = Math.max(0.001, Math.min(0.1, t - previousTime || 1 / 30));
    previousTime = t;
    const blend = focusImmediate ? 1 : 1 - Math.exp(-delta * 7);
    let weightSum = 0;
    transitionPending = false;
    for (let i = 0; i < focusWeights.length; i += 1) {
      const destination = i === selectedFocus ? 1 : 0;
      focusWeights[i] += (destination - focusWeights[i]) * blend;
      if (Math.abs(destination - focusWeights[i]) < 0.0005) focusWeights[i] = destination;
      else transitionPending = true;
      weightSum += focusWeights[i];
    }
    for (const updateFocus of focusMotions) updateFocus(focusWeights);
    for (const motion of motions) motion(t);
    blendedTarget.copy(target).multiplyScalar(1 - weightSum);
    blendedDirection.copy(cameraDirection).multiplyScalar(1 - weightSum);
    for (let i = 0; i < focusViews.length; i += 1) {
      if (!focusViews[i]) continue;
      blendedTarget.addScaledVector(focusViews[i].center, focusWeights[i]);
      blendedDirection.addScaledVector(focusViews[i].direction, focusWeights[i]);
    }
    viewTarget.copy(blendedTarget);
    viewDirection.copy(blendedDirection).normalize();
    const angle = Math.sin(t * 0.18) * orbit * (1 - weightSum * 0.66) + THREE.MathUtils.clamp(pointer.x || 0, -1, 1) * 0.025;
    viewDirection.applyAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
    viewDirection.y += THREE.MathUtils.clamp(pointer.y || 0, -1, 1) * 0.014;
    camera.position.copy(viewDirection.normalize()).multiplyScalar(orbitRadius).add(viewTarget);
    camera.lookAt(viewTarget);
    if (transitionPending || focusImmediate) fitCamera();
    focusImmediate = false;
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
  return {
    scene, camera, span, target, resize, update, dispose, setFocus,
    focusTopics: focusTopics[kind] || [],
    getFocus: () => selectedFocus,
    isTransitioning: () => transitionPending,
    getView: () => ({ target: viewTarget.toArray(), position: camera.position.toArray(), span: focusSpan }),
  };
}
