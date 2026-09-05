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
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
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
  projectedShadowGeometry: PlaneGeometry
  softShadowGeometry: PlaneGeometry
  lightRayDirection: Vector3
  sourceTexture: CanvasTexture
  targetTexture: CanvasTexture
  frontMaterial: MeshStandardMaterial
  backMaterial: MeshStandardMaterial
  targetMaterial: MeshStandardMaterial
  projectedShadowMaterial: MeshBasicMaterial
  softShadowMaterial: MeshBasicMaterial
  targetGeometry: PlaneGeometry
  pageLocalZ: number
  targetPageZ: number
  dispose: () => void
}

type RendererPrecision = 'highp' | 'mediump' | 'lowp'

const PAGE_WIDTH_SEGMENTS = 80
const PAGE_HEIGHT_SEGMENTS = 32
const PAGE_SOFTNESS = 0.82
const CAMERA_FOV = 28
const DEFAULT_DURATION_MS = 1500
const CAPTURE_SCALE_LIMIT = 1.6

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

function readShaderPrecision(
  context: WebGL2RenderingContext,
  shaderType: number,
  precisionType: number
): number | null {
  try {
    return context.getShaderPrecisionFormat(shaderType, precisionType)?.precision ?? null
  } catch {
    return null
  }
}

function resolveRendererPrecision(context: WebGL2RenderingContext): RendererPrecision {
  const vertexHigh = readShaderPrecision(context, context.VERTEX_SHADER, context.HIGH_FLOAT)
  const fragmentHigh = readShaderPrecision(context, context.FRAGMENT_SHADER, context.HIGH_FLOAT)

  if (vertexHigh !== null && fragmentHigh !== null && vertexHigh > 0 && fragmentHigh > 0) {
    return 'highp'
  }

  const vertexMedium = readShaderPrecision(context, context.VERTEX_SHADER, context.MEDIUM_FLOAT)
  const fragmentMedium = readShaderPrecision(context, context.FRAGMENT_SHADER, context.MEDIUM_FLOAT)

  if (vertexMedium !== null && fragmentMedium !== null && vertexMedium > 0 && fragmentMedium > 0) {
    return 'mediump'
  }

  // Some Chromium/Electron GPU paths expose a usable WebGL2 context while
  // getShaderPrecisionFormat() returns null. Three.js r185 dereferences that
  // result for highp/mediump. lowp bypasses that capability probe entirely.
  return 'lowp'
}

function createPageCurlRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const contextAttributes: WebGLContextAttributes = {
    alpha: true,
    antialias: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false,
    powerPreference: 'default'
  }
  const context = canvas.getContext('webgl2', contextAttributes)

  if (!context || context.isContextLost()) {
    throw new Error('WebGL2 недоступен. Перелистывание будет выполнено без 3D-анимации.')
  }

  const version = context.getParameter(context.VERSION)
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('WebGL2-контекст инициализирован некорректно.')
  }

  const renderer = new WebGLRenderer({
    canvas,
    context,
    precision: resolveRendererPrecision(context),
    alpha: true,
    antialias: true,
    powerPreference: 'default'
  })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap
  return renderer
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
  const minDimension = Math.min(width, height)
  const pageLocalZ = minDimension * 0.00015
  const targetPageZ = -minDimension * 0.00035

  const targetGeometry = new PlaneGeometry(width, height, 1, 1)
  const targetMaterial = new MeshStandardMaterial({
    map: targetTexture,
    roughness: 0.84,
    metalness: 0,
    side: FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  })
  const targetMesh = new Mesh(targetGeometry, targetMaterial)
  targetMesh.position.z = targetPageZ
  targetMesh.receiveShadow = true
  targetMesh.renderOrder = 1
  targetMesh.frustumCulled = false
  scene.add(targetMesh)

  const pageGeometry = new PlaneGeometry(width, height, PAGE_WIDTH_SEGMENTS, PAGE_HEIGHT_SEGMENTS)
  const pagePositions = pageGeometry.getAttribute('position') as BufferAttribute
  pagePositions.setUsage(DynamicDrawUsage)
  const originalPositions = new Float32Array(pagePositions.array as ArrayLike<number>)

  const frontMaterial = new MeshStandardMaterial({
    map: sourceTexture,
    color: 0xfffbf2,
    roughness: 0.77,
    metalness: 0,
    side: FrontSide,
    depthTest: true,
    depthWrite: true
  })
  const backMaterial = new MeshStandardMaterial({
    color: 0xf6edde,
    roughness: 0.9,
    metalness: 0,
    side: BackSide,
    depthTest: true,
    depthWrite: true
  })

  const frontPage = new Mesh(pageGeometry, frontMaterial)
  const backPage = new Mesh(pageGeometry, backMaterial)
  for (const page of [frontPage, backPage]) {
    page.position.z = pageLocalZ
    page.castShadow = true
    page.receiveShadow = true
    page.renderOrder = 20
    page.frustumCulled = false
    scene.add(page)
  }

  const projectedShadowGeometry = pageGeometry.clone()
  const projectedShadowPositions = projectedShadowGeometry.getAttribute(
    'position'
  ) as BufferAttribute
  projectedShadowPositions.setUsage(DynamicDrawUsage)
  const projectedShadowMaterial = new MeshBasicMaterial({
    color: 0x120b07,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide
  })
  const projectedShadow = new Mesh(projectedShadowGeometry, projectedShadowMaterial)
  projectedShadow.renderOrder = 6
  projectedShadow.frustumCulled = false
  scene.add(projectedShadow)

  const softShadowGeometry = pageGeometry.clone()
  const softShadowPositions = softShadowGeometry.getAttribute('position') as BufferAttribute
  softShadowPositions.setUsage(DynamicDrawUsage)
  const softShadowMaterial = new MeshBasicMaterial({
    color: 0x2a1a10,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide
  })
  const softShadow = new Mesh(softShadowGeometry, softShadowMaterial)
  softShadow.renderOrder = 5
  softShadow.frustumCulled = false
  scene.add(softShadow)

  const hemisphereLight = new HemisphereLight(0xfff8ea, 0x4b382a, 2.0)
  const directionalLight = new DirectionalLight(0xfff3dc, 4.6)
  directionalLight.position.set(-width * 0.92, height * 1.11, cameraDistance * 0.83)
  directionalLight.target.position.set(0, 0, 0)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.set(2048, 2048)
  directionalLight.shadow.camera.left = -width
  directionalLight.shadow.camera.right = width
  directionalLight.shadow.camera.top = height
  directionalLight.shadow.camera.bottom = -height
  directionalLight.shadow.camera.near = 0.1
  directionalLight.shadow.camera.far = cameraDistance * 2.5
  directionalLight.shadow.bias = -0.00015
  directionalLight.shadow.normalBias = minDimension * 0.00018
  directionalLight.shadow.radius = 3

  const fillLight = new DirectionalLight(0xb7c8ff, 0.55)
  fillLight.position.set(width * 1.64, height * 0.25, cameraDistance * 0.47)
  scene.add(hemisphereLight, directionalLight, directionalLight.target, fillLight)

  const lightRayDirection = new Vector3()
    .subVectors(directionalLight.target.position, directionalLight.position)
    .normalize()

  return {
    scene,
    camera,
    pageGeometry,
    originalPositions,
    projectedShadowGeometry,
    softShadowGeometry,
    lightRayDirection,
    sourceTexture,
    targetTexture,
    frontMaterial,
    backMaterial,
    targetMaterial,
    projectedShadowMaterial,
    softShadowMaterial,
    targetGeometry,
    pageLocalZ,
    targetPageZ,
    dispose: () => {
      sourceTexture.dispose()
      targetTexture.dispose()
      pageGeometry.dispose()
      projectedShadowGeometry.dispose()
      softShadowGeometry.dispose()
      targetGeometry.dispose()
      frontMaterial.dispose()
      backMaterial.dispose()
      targetMaterial.dispose()
      projectedShadowMaterial.dispose()
      softShadowMaterial.dispose()
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
  const p = clamp01(progress)
  const eased = smootherStep(p)
  const directionSign = direction === 'next' ? 1 : -1
  const baseAngle = -Math.PI * eased * directionSign
  const phase = Math.sin(Math.PI * p)
  const curl = PAGE_SOFTNESS * 1.18 * phase
  const halfWidth = width * 0.5
  const halfHeight = height * 0.5
  const minDimension = Math.min(width, height)

  const pagePositions = resources.pageGeometry.getAttribute('position') as BufferAttribute
  const projectedShadowPositions = resources.projectedShadowGeometry.getAttribute(
    'position'
  ) as BufferAttribute
  const softShadowPositions = resources.softShadowGeometry.getAttribute(
    'position'
  ) as BufferAttribute

  const planeZ = resources.targetPageZ + minDimension * 0.000018
  const softPlaneZ = resources.targetPageZ + minDimension * 0.000012
  const lightRay = resources.lightRayDirection

  for (let index = 0; index < pagePositions.count; index += 1) {
    const offset = index * 3
    const originalX = resources.originalPositions[offset]
    const originalY = resources.originalPositions[offset + 1]
    const rawU = clamp01((originalX + halfWidth) / width)
    const u = directionSign === 1 ? rawU : 1 - rawU
    const v = clamp01((originalY + halfHeight) / height)
    const lead = Math.pow(u, 1.55)
    const vertical = v - 0.5
    const twist = vertical * curl * 0.24 * Math.pow(u, 1.8)
    const theta = baseAngle - curl * lead * directionSign + twist * directionSign

    let x: number
    let z: number

    if (directionSign === 1) {
      const distanceFromSpine = originalX + halfWidth
      x = -halfWidth + Math.cos(theta) * distanceFromSpine
      z = Math.abs(Math.sin(theta) * distanceFromSpine)
    } else {
      const distanceFromSpine = halfWidth - originalX
      x = halfWidth - Math.cos(theta) * distanceFromSpine
      z = Math.abs(Math.sin(theta) * distanceFromSpine)
    }

    const belly =
      Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * phase * PAGE_SOFTNESS * minDimension * 0.03115
    z += belly

    const yCompression = 1 - phase * PAGE_SOFTNESS * 0.008 * Math.sin(Math.PI * u)
    let y = originalY * yCompression

    const corner = Math.pow(u, 2.1) * Math.pow(Math.abs(vertical) * 2, 1.8) * phase * PAGE_SOFTNESS
    z += corner * minDimension * 0.0246
    y += vertical * corner * height * 0.00864

    pagePositions.setXYZ(index, x, y, z)

    const worldZ = z + resources.pageLocalZ
    const projectionDistance = Math.abs(lightRay.z) > 0.000001 ? (planeZ - worldZ) / lightRay.z : 0
    const shadowX = x + lightRay.x * projectionDistance
    const shadowY = y + lightRay.y * projectionDistance
    projectedShadowPositions.setXYZ(index, shadowX, shadowY, planeZ)

    const softProjectionDistance =
      Math.abs(lightRay.z) > 0.000001 ? (softPlaneZ - worldZ) / lightRay.z : 0
    const softX = x + lightRay.x * softProjectionDistance
    const softY = y + lightRay.y * softProjectionDistance
    softShadowPositions.setXYZ(index, softX * 1.012, softY * 1.006, softPlaneZ)
  }

  pagePositions.needsUpdate = true
  projectedShadowPositions.needsUpdate = true
  softShadowPositions.needsUpdate = true
  resources.pageGeometry.computeVertexNormals()
  const normalAttribute = resources.pageGeometry.getAttribute('normal') as BufferAttribute
  normalAttribute.needsUpdate = true

  const visible = Math.sin(Math.PI * p)
  const early = Math.sin(Math.min(1, p / 0.035) * Math.PI * 0.5)
  resources.projectedShadowMaterial.opacity = early * (0.07 + visible * 0.13)
  resources.softShadowMaterial.opacity = early * (0.018 + visible * 0.05)

  if (p <= 0.0001 || p >= 0.9999) {
    resources.projectedShadowMaterial.opacity = 0
    resources.softShadowMaterial.opacity = 0
  }
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
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
      resourcesRef.current?.dispose()
      resourcesRef.current = null
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!turn) return

    const runId = ++runIdRef.current
    let cancelled = false

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    resourcesRef.current?.dispose()
    resourcesRef.current = null

    const start = async (): Promise<void> => {
      try {
        await nextPaint()
        if (cancelled || runId !== runIdRef.current) return

        const canvas = canvasRef.current
        const sourceElement = sourcePageRef.current
        const targetElement = targetPageRef.current
        if (!canvas || !sourceElement || !targetElement) {
          throw new Error('Не удалось подготовить DOM-страницы для перелистывания.')
        }

        let renderer = rendererRef.current
        if (!renderer) {
          renderer = createPageCurlRenderer(canvas)
          rendererRef.current = renderer
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

          const timelineProgress = clamp01((now - startedAt) / durationMs)
          const progress = 0.5 - Math.cos(Math.PI * timelineProgress) / 2
          updateCurlGeometry(resources, progress, turn.direction, turn.width, turn.height)
          renderer.render(resources.scene, resources.camera)

          if (timelineProgress < 1) {
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
