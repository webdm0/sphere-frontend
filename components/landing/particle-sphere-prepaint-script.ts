export const particleSpherePrepaintScript = String.raw`(() => {
  const canvas = document.querySelector("[data-hero-sphere-canvas]");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const TABLET_MEDIA_QUERY = "(min-width: 768px) and (max-width: 1023px)";
  const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
  const CAMERA_DISTANCE = 5;
  const SPHERE_SCALE = 0.255;
  const SHELL_RADIUS = 1.8;
  const CORE_RADIUS = 1.3;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function createSeededRandom(seed) {
    let current = seed >>> 0;

    return () => {
      current = (current + 0x6d2b79f5) | 0;
      let value = Math.imul(current ^ (current >>> 15), current | 1);
      value = (value + Math.imul(value ^ (value >>> 7), value | 61)) | 0;
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createRotationMath(rotation) {
    return {
      cx: Math.cos(rotation.x),
      sx: Math.sin(rotation.x),
      cy: Math.cos(rotation.y),
      sy: Math.sin(rotation.y),
      cz: Math.cos(rotation.z),
      sz: Math.sin(rotation.z),
    };
  }

  function rotatePoint(point, math) {
    const x = point[0];
    const y = point[1];
    const z = point[2];
    const y1 = y * math.cx - z * math.sx;
    const z1 = y * math.sx + z * math.cx;
    const x2 = x * math.cy + z1 * math.sy;
    const z2 = -x * math.sy + z1 * math.cy;

    return [x2 * math.cz - y1 * math.sz, x2 * math.sz + y1 * math.cz, z2];
  }

  function createRandomSpherePoints(radius, count, seed) {
    const random = createSeededRandom(seed);
    const points = [];

    for (let index = 0; index < count; index += 1) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(random() * 2 - 1);

      points.push([
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      ]);
    }

    return points;
  }

  function createLayerConfig(shellCount, coreCount) {
    return [
      {
        color: "#222222",
        opacity: 0.65,
        particleSize: 1.15,
        points: createRandomSpherePoints(SHELL_RADIUS, shellCount, 42),
        radius: SHELL_RADIUS,
        rotationMultiplier: { x: 1, y: 1, z: 1 },
        staticRotation: createRotationMath({ x: 0, y: 0, z: 0 }),
      },
      {
        color: "#444444",
        opacity: 0.35,
        particleSize: 0.85,
        points: createRandomSpherePoints(CORE_RADIUS, coreCount, 7),
        radius: CORE_RADIUS,
        rotationMultiplier: { x: -0.7, y: -0.8, z: -0.5 },
        staticRotation: createRotationMath({ x: 0.4, y: 0.2, z: 0.3 }),
      },
    ];
  }

  function getLayerCounts() {
    if (window.matchMedia(DESKTOP_MEDIA_QUERY).matches) {
      return { shellCount: 2000, coreCount: 800 };
    }

    if (window.matchMedia(TABLET_MEDIA_QUERY).matches) {
      return { shellCount: 1400, coreCount: 520 };
    }

    return { shellCount: 900, coreCount: 320 };
  }

  function paint() {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const sizeRoot = canvas.parentElement || canvas;
    const rect = sizeRoot.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      window.requestAnimationFrame(paint);
      return;
    }

    const isDesktop = window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
    const isTablet = window.matchMedia(TABLET_MEDIA_QUERY).matches;
    const dprCap = isDesktop ? 2 : isTablet ? 1.75 : 1.5;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height) * SPHERE_SCALE;
    const renderQueue = [];

    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const counts = getLayerCounts();
    const layersConfig = createLayerConfig(counts.shellCount, counts.coreCount);

    for (const layer of layersConfig) {
      const dynamicRotation = createRotationMath({ x: 0, y: 0, z: 0 });
      const rotationChain = [dynamicRotation, layer.staticRotation];

      for (const point of layer.points) {
        let rotatedPoint = point;

        for (const math of rotationChain) {
          rotatedPoint = rotatePoint(rotatedPoint, math);
        }

        const perspective = CAMERA_DISTANCE / (rotatedPoint[2] + CAMERA_DISTANCE);
        const depthFactor = clamp(
          (rotatedPoint[2] + layer.radius) / (layer.radius * 2),
          0,
          1
        );

        renderQueue.push({
          alpha: layer.opacity * (0.3 + depthFactor * 0.7),
          color: layer.color,
          depth: rotatedPoint[2],
          size: layer.particleSize * perspective,
          x: rotatedPoint[0] * perspective,
          y: rotatedPoint[1] * perspective,
        });
      }
    }

    renderQueue.sort((a, b) => a.depth - b.depth);

    for (const particle of renderQueue) {
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(
        centerX + particle.x * size,
        centerY - particle.y * size,
        particle.size,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  paint();
})();`
