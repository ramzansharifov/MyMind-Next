import { domToCanvas } from 'modern-screenshot'
import { useEffect, useRef, useState } from 'react'
import {
  BackSide,
  BufferAttribute,
  CanvasTexture,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  FrontSide,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three'

export type DiaryPageCurlDirection = 'next' | 'previous'

export interface DiaryPageCurlTurn {
  id: string
  direction: DiaryPageCurlDirection
  width: number
  height: number
}

interface DiaryPageCurlOverlayProps {
  turn: DiaryPageCurlTurn | null
  sourcePageRef: React.RefObject<HTMLElement | null>
  targetPageRef: React.RefObject<HTMLElement | null>
  durationMs?: number
  onComplete: () => void
  onError: (reason: unknown) => void
}

interface CurlSceneResources {
  scene: Scene
  camera: PerspectiveCamera
  pageGeometry: PlaneGeometry
  originalPositions: Float32Array
  shadowGeometry: PlaneGeometry
  shadowAlpha: BufferAttribute
  lightRayDirection: Vector3
  sourceTexture: CanvasTexture
  targetTexture: CanvasTexture
  frontMaterial: MeshStandardMaterial
  backMaterial: MeshStandardMaterial
  targetMaterial: MeshBasicMaterial
  shadowMaterial: ShaderMaterial
  targetGeometry: PlaneGeometry
  dispose: () => void
}

const PAGE_WIDTH_SEGMENTS = 80
const PAGE_HEIGHT_SEGMENTS = 32
const PAGE_SOFTNESS = 0.78
const PAGE_LIFT_SCALE = 0.34
const NEXT_PAGE_Z = -0.6
const SHADOW_PLANE_Z = -0.28
const CAMERA_FOV = 28
const DEFAULT_DURATION_MS = 1120
const CAPTURE_SCALE_LIMIT = 1.6

const SHADOW_VERTEX_SHADER = `
  attribute float shadowAlpha;
  varying float vShadowAlpha;

  void main() {
    vShadowAlpha = shadowAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SHADOW_FRAGMENT_SHADER = `
  varying float vShadowAlpha;

  void main() {
    if (vShadowAlpha <= 0.002) discard;
    gl_FragColor = vec4(0.13, 0.085, 0.045, vShadowAlpha);
  }
`

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smootherStep(value: number): number {
  const t = clamp01(value)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

async function nextPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

async function capturePage(
  element: HTMLElement,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  if ('fonts' in document) {
    await document.fonts.ready
  }

  return domToCanvas(element, {
    width,
    height,
    scale: Math.min(window.devicePixelRatio || 1, CAPTURE_SCALE_LIMIT),
    backgroundColor: '#f8f2e6',
    maximumCanvasSize: 16_777_216,
    style: {
      position: 'relative',
      inset: 'auto',
      top: 'auto',
      right: 'auto',
      bottom: 'auto',
      left: 'auto',
      width: `${width}px`,
      height: `${height}px`,
      transform: 'none'
    }
  })
}

function createTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

function createCurlScene(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  width: number,
  height: number
): CurlSceneResources {
  const scene = new Scene()
  const aspect = width / height
  const cameraDistance = (height * 0.5) / Math.tan((CAMERA_FOV * Math.PI) / 360)
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 1, cameraDistance * 5)
  camera.position.set(0, 0, cameraDistance)
  camera.lookAt(0, 0, 0)

  const sourceTexture = createTexture(sourceCanvas)
  const targetTexture = createTexture(targetCanvas)

  const targetGeometry = new PlaneGeometry(width + 1.5, height + 1.5, 1, 1)
  const targetMaterial = new MeshBasicMaterial({ map: targetTexture })
  const targetMesh = new Mesh(targetGeometry, targetMaterial)
  targetMesh.position.z = NEXT_PAGE_Z
  targetMesh.frustumCulled = false
  scene.add(targetMesh)

  const pageGeometry = new PlaneGeometry(width, height, PAGE_WIDTH_SEGMENTS, PAGE_HEIGHT_SEGMENTS)
  const pagePositions = pageGeometry.getAttribute('position') as BufferAttribute
  pagePositions.setUsage(DynamicDrawUsage)
  const originalPositions = new Float32Array(pagePositions.array as ArrayLike<number>)

  const frontMaterial = new MeshStandardMaterial({
    map: sourceTexture,
    roughness: 0.86,
    metalness: 0,
    side: FrontSide
  })
  const backMaterial = new MeshStandardMaterial({
    color: 0xf3eadb,
    roughness: 0.92,
    metalness: 0,
    side: BackSide
  })

  const frontPage = new Mesh(pageGeometry, frontMaterial)
  const backPage = new Mesh(pageGeometry, backMaterial)
  frontPage.frustumCulled = false
  backPage.frustumCulled = false
  scene.add(frontPage, backPage)

  const shadowGeometry = pageGeometry.clone()
  const shadowPositions = shadowGeometry.getAttribute('position') as BufferAttribute
  shadowPositions.setUsage(DynamicDrawUsage)
  const shadowAlpha = new BufferAttribute(new Float32Array(shadowPositions.count), 1)
  shadowAlpha.setUsage(DynamicDrawUsage)
  shadowGeometry.setAttribute('shadowAlpha', shadowAlpha)

  const shadowMaterial = new ShaderMaterial({
    vertexShader: SHADOW_VERTEX_SHADER,
    fragmentShader: SHADOW_FRAGMENT_SHADER,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: DoubleSide
  })
  const shadowMesh = new Mesh(shadowGeometry, shadowMaterial)
  shadowMesh.frustumCulled = false
  scene.add(shadowMesh)

  const hemisphereLight = new HemisphereLight(0xffffff, 0x80684f, 1.85)
  const directionalLight = new DirectionalLight(0xffffff, 2.35)
  directionalLight.position.set(-width * 0.34, height * 0.42, cameraDistance * 0.72)
  directionalLight.target.position.set(0, 0, 0)
  scene.add(hemisphereLight, directionalLight, directionalLight.target)

  const lightRayDirection = new Vector3()
    .subVectors(directionalLight.target.position, directionalLight.position)
    .normalize()

  return {
    scene,
    camera,
    pageGeometry,
    originalPositions,
    shadowGeometry,
    shadowAlpha,
    lightRayDirection,
    sourceTexture,
    targetTexture,
    frontMaterial,
    backMaterial,
    targetMaterial,
    shadowMaterial,
    targetGeometry,
    dispose: () => {
      sourceTexture.dispose()
      targetTexture.dispose()
      pageGeometry.dispose()
      shadowGeometry.dispose()
      targetGeometry.dispose()
      frontMaterial.dispose()
      backMaterial.dispose()
      targetMaterial.dispose()
      shadowMaterial.dispose()
      scene.clear()
    }
  }
}

function updateCurlGeometry(
  resources: CurlSceneResources,
  progress: number,
  direction: DiaryPageCurlDirection,
  width: number,
  height: number
): void {
  const eased = smootherStep(progress)
  const phase = Math.sin(Math.PI * eased)
  const directionSign = direction === 'next' ? 1 : -1
  const hingeX = directionSign === 1 ? -width * 0.5 : width * 0.5
  const halfWidth = width * 0.5
  const halfHeight = height * 0.5
  const pagePositions = resources.pageGeometry.getAttribute('position') as BufferAttribute
  const shadowPositions = resources.shadowGeometry.getAttribute('position') as BufferAttribute
  const minDimension = Math.min(width, height)

  for (let index = 0; index < pagePositions.count; index += 1) {
    const offset = index * 3
    const originalX = resources.originalPositions[offset]
    const originalY = resources.originalPositions[offset + 1]
    const rawU = clamp01((originalX + halfWidth) / width)
    const u = directionSign === 1 ? rawU : 1 - rawU
    const v = clamp01((originalY + halfHeight) / height)
    const distanceFromHinge = u * width

    // The free edge starts slightly earlier than the spine. The term disappears
    // at both ends of the animation so the sheet begins and ends perfectly flat.
    const edgeLead = phase * PAGE_SOFTNESS * 0.19 * (u - 0.22)
    const localProgress = clamp01(eased + edgeLead)
    const sweepAngle = Math.PI * localProgress

    const belly =
      Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * phase * PAGE_SOFTNESS * minDimension * 0.042
    const verticalTwist = (v - 0.5) * Math.sin(Math.PI * u) * phase * PAGE_SOFTNESS * height * 0.022

    const x = hingeX + directionSign * distanceFromHinge * Math.cos(sweepAngle)
    const y = originalY + directionSign * verticalTwist
    const z = Math.max(0, distanceFromHinge * Math.sin(sweepAngle) * PAGE_LIFT_SCALE + belly)

    pagePositions.setXYZ(index, x, y, z)

    // Project each deformed vertex along the actual directional-light ray onto
    // the next-page plane. The shadow therefore cannot drift out of sync.
    const rayZ = resources.lightRayDirection.z
    const projectionDistance = Math.abs(rayZ) > 0.0001 ? (SHADOW_PLANE_Z - z) / rayZ : 0
    const shadowX = x + resources.lightRayDirection.x * projectionDistance
    const shadowY = y + resources.lightRayDirection.y * projectionDistance
    shadowPositions.setXYZ(index, shadowX, shadowY, SHADOW_PLANE_Z)

    const liftRatio = clamp01(z / (minDimension * 0.23))
    resources.shadowAlpha.setX(index, liftRatio * Math.pow(phase, 0.7) * 0.27)
  }

  pagePositions.needsUpdate = true
  shadowPositions.needsUpdate = true
  resources.shadowAlpha.needsUpdate = true
  resources.pageGeometry.computeVertexNormals()
}

export function DiaryPageCurlOverlay({
  turn,
  sourcePageRef,
  targetPageRef,
  durationMs = DEFAULT_DURATION_MS,
  onComplete,
  onError
}: DiaryPageCurlOverlayProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const resourcesRef = useRef<CurlSceneResources | null>(null)
  const runIdRef = useRef(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    rendererRef.current = renderer

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
      resourcesRef.current?.dispose()
      resourcesRef.current = null
      renderer.dispose()
      renderer.forceContextLoss()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!turn || !renderer) {
      setIsVisible(false)
      return
    }

    const runId = ++runIdRef.current
    let cancelled = false

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    resourcesRef.current?.dispose()
    resourcesRef.current = null
    setIsVisible(false)

    const start = async (): Promise<void> => {
      try {
        await nextPaint()
        if (cancelled || runId !== runIdRef.current) return

        const sourceElement = sourcePageRef.current
        const targetElement = targetPageRef.current
        if (!sourceElement || !targetElement) {
          throw new Error('Не удалось подготовить DOM-страницы для перелистывания.')
        }

        const [sourceCanvas, targetCanvas] = await Promise.all([
          capturePage(sourceElement, turn.width, turn.height),
          capturePage(targetElement, turn.width, turn.height)
        ])
        if (cancelled || runId !== runIdRef.current) return

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.setSize(turn.width, turn.height, false)

        const resources = createCurlScene(sourceCanvas, targetCanvas, turn.width, turn.height)
        resourcesRef.current = resources
        updateCurlGeometry(resources, 0, turn.direction, turn.width, turn.height)
        renderer.render(resources.scene, resources.camera)
        setIsVisible(true)

        const startedAt = performance.now()
        const renderFrame = (now: number): void => {
          if (cancelled || runId !== runIdRef.current) return

          const progress = clamp01((now - startedAt) / durationMs)
          updateCurlGeometry(resources, progress, turn.direction, turn.width, turn.height)
          renderer.render(resources.scene, resources.camera)

          if (progress < 1) {
            animationFrameRef.current = window.requestAnimationFrame(renderFrame)
            return
          }

          animationFrameRef.current = null
          onComplete()
        }

        animationFrameRef.current = window.requestAnimationFrame(renderFrame)
      } catch (reason) {
        if (!cancelled && runId === runIdRef.current) {
          onError(reason)
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      resourcesRef.current?.dispose()
      resourcesRef.current = null
      setIsVisible(false)
    }
  }, [durationMs, onComplete, onError, sourcePageRef, targetPageRef, turn])

  return (
    <div
      className="diary-page-curl-overlay"
      data-visible={isVisible ? 'true' : undefined}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
