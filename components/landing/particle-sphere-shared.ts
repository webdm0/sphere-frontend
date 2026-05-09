type Point3D = readonly [number, number, number]
export type Rotation = { x: number; y: number; z: number }
type RotationMath = {
  cx: number
  sx: number
  cy: number
  sy: number
  cz: number
  sz: number
}
export type ParticleLayerId = "shell" | "core"
export type SphereBreakpoint = "mobile" | "tablet" | "desktop"
export type ParticleLayer = {
  color: string
  id: ParticleLayerId
  opacity: number
  particleSize: number
  points: Point3D[]
  radius: number
  rotationMultiplier: Rotation
  staticRotation: RotationMath
}
export type SphereRenderParticle = {
  alpha: number
  color: string
  depth: number
  layerId: ParticleLayerId
  pointIndex: number
  size: number
  x: number
  y: number
}

export const CAMERA_DISTANCE = 5
export const BASE_ROTATION = { x: 0, y: 0, z: 0 }
export const SPHERE_SCALE = 0.255

const SHELL_RADIUS = 1.8
const CORE_RADIUS = 1.3
const LAYER_COUNTS: Record<
  SphereBreakpoint,
  { coreCount: number; shellCount: number }
> = {
  desktop: { shellCount: 2000, coreCount: 800 },
  tablet: { shellCount: 1400, coreCount: 520 },
  mobile: { shellCount: 900, coreCount: 320 },
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function createSeededRandom(seed: number) {
  let current = seed >>> 0

  return () => {
    current = (current + 0x6d2b79f5) | 0
    let value = Math.imul(current ^ (current >>> 15), current | 1)
    value = (value + Math.imul(value ^ (value >>> 7), value | 61)) | 0
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createRotationMath(rotation: Rotation): RotationMath {
  return {
    cx: Math.cos(rotation.x),
    sx: Math.sin(rotation.x),
    cy: Math.cos(rotation.y),
    sy: Math.sin(rotation.y),
    cz: Math.cos(rotation.z),
    sz: Math.sin(rotation.z),
  }
}

function rotatePoint([x, y, z]: Point3D, math: RotationMath): Point3D {
  const y1 = y * math.cx - z * math.sx
  const z1 = y * math.sx + z * math.cx
  const x2 = x * math.cy + z1 * math.sy
  const z2 = -x * math.sy + z1 * math.cy

  return [x2 * math.cz - y1 * math.sz, x2 * math.sz + y1 * math.cz, z2]
}

function createRandomSpherePoints(radius: number, count: number, seed: number) {
  const random = createSeededRandom(seed)
  const points: Point3D[] = []

  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2
    const phi = Math.acos(random() * 2 - 1)

    points.push([
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    ])
  }

  return points
}

const BASE_ROTATION_MATH = createRotationMath(BASE_ROTATION)
const layerConfigCache = new Map<SphereBreakpoint, readonly ParticleLayer[]>()

function createLayerConfig(
  shellCount: number,
  coreCount: number
): ParticleLayer[] {
  return [
    {
      color: "#222222",
      id: "shell",
      opacity: 0.65,
      particleSize: 1.15,
      points: createRandomSpherePoints(SHELL_RADIUS, shellCount, 42),
      radius: SHELL_RADIUS,
      rotationMultiplier: { x: 1, y: 1, z: 1 },
      staticRotation: createRotationMath({ x: 0, y: 0, z: 0 }),
    },
    {
      color: "#444444",
      id: "core",
      opacity: 0.35,
      particleSize: 0.85,
      points: createRandomSpherePoints(CORE_RADIUS, coreCount, 7),
      radius: CORE_RADIUS,
      rotationMultiplier: { x: -0.7, y: -0.8, z: -0.5 },
      staticRotation: createRotationMath({ x: 0.4, y: 0.2, z: 0.3 }),
    },
  ]
}

export function getSphereBreakpoint(flags: {
  isDesktop: boolean
  isTablet: boolean
}): SphereBreakpoint {
  if (flags.isDesktop) return "desktop"
  if (flags.isTablet) return "tablet"
  return "mobile"
}

export function getSphereLayersConfig(
  breakpoint: SphereBreakpoint
): readonly ParticleLayer[] {
  const cached = layerConfigCache.get(breakpoint)
  if (cached) return cached

  const counts = LAYER_COUNTS[breakpoint]
  const config = createLayerConfig(counts.shellCount, counts.coreCount)

  layerConfigCache.set(breakpoint, config)
  return config
}

export function populateSphereRenderQueue(
  target: SphereRenderParticle[],
  layersConfig: readonly ParticleLayer[],
  rotation: Rotation
) {
  target.length = 0

  for (const layer of layersConfig) {
    const dynamicRotation = createRotationMath({
      x: rotation.x * layer.rotationMultiplier.x,
      y: rotation.y * layer.rotationMultiplier.y,
      z: rotation.z * layer.rotationMultiplier.z,
    })
    const rotationChain = [
      dynamicRotation,
      layer.staticRotation,
      BASE_ROTATION_MATH,
    ]

    for (let pointIndex = 0; pointIndex < layer.points.length; pointIndex += 1) {
      let rotatedPoint = layer.points[pointIndex]

      for (const math of rotationChain) {
        rotatedPoint = rotatePoint(rotatedPoint, math)
      }

      const perspective = CAMERA_DISTANCE / (rotatedPoint[2] + CAMERA_DISTANCE)
      const depthFactor = clamp(
        (rotatedPoint[2] + layer.radius) / (layer.radius * 2),
        0,
        1
      )

      target.push({
        alpha: layer.opacity * (0.3 + depthFactor * 0.7),
        color: layer.color,
        depth: rotatedPoint[2],
        layerId: layer.id,
        pointIndex,
        size: layer.particleSize * perspective,
        x: rotatedPoint[0] * perspective,
        y: rotatedPoint[1] * perspective,
      })
    }
  }

  target.sort((a, b) => a.depth - b.depth)
}
