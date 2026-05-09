"use client"

import { useLayoutEffect, useRef, useState } from "react"
import {
  SPHERE_SCALE,
  getSphereBreakpoint,
  getSphereLayersConfig,
  populateSphereRenderQueue,
  type SphereRenderParticle,
} from "@/components/landing/particle-sphere-shared"

const TABLET_MEDIA_QUERY = "(min-width: 768px) and (max-width: 1023px)"
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)"
const FINE_POINTER_MEDIA_QUERY = "(hover: hover) and (pointer: fine)"
const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)"
type MediaState = {
  hasFinePointer: boolean
  isDesktop: boolean
  isTablet: boolean
  prefersReducedMotion: boolean
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export function ParticleSphereScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mediaState, setMediaState] = useState<MediaState | null>(null)

  useLayoutEffect(() => {
    const tabletQuery = window.matchMedia(TABLET_MEDIA_QUERY)
    const desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const finePointerQuery = window.matchMedia(FINE_POINTER_MEDIA_QUERY)
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_MEDIA_QUERY)

    const syncMediaState = () => {
      setMediaState({
        hasFinePointer: finePointerQuery.matches,
        isDesktop: desktopQuery.matches,
        isTablet: tabletQuery.matches,
        prefersReducedMotion: reducedMotionQuery.matches,
      })
    }

    syncMediaState()
    tabletQuery.addEventListener("change", syncMediaState)
    desktopQuery.addEventListener("change", syncMediaState)
    finePointerQuery.addEventListener("change", syncMediaState)
    reducedMotionQuery.addEventListener("change", syncMediaState)

    return () => {
      tabletQuery.removeEventListener("change", syncMediaState)
      desktopQuery.removeEventListener("change", syncMediaState)
      finePointerQuery.removeEventListener("change", syncMediaState)
      reducedMotionQuery.removeEventListener("change", syncMediaState)
    }
  }, [])

  useLayoutEffect(() => {
    if (!mediaState) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { alpha: true })
    if (!canvas || !ctx) return

    const interactionRoot =
      (canvas.closest("[data-hero-parallax-root]") as HTMLElement | null) ??
      canvas.parentElement
    const sizeRoot = canvas.parentElement ?? canvas
    const { hasFinePointer, isDesktop, isTablet, prefersReducedMotion } =
      mediaState

    let animationId = 0
    let width = 0
    let height = 0
    let centerX = 0
    let centerY = 0
    let size = 0
    let rotationX = 0
    let rotationY = 0
    let rotationZ = 0
    let targetRotationX = 0
    let targetRotationZ = 0
    let isDocumentVisible = document.visibilityState === "visible"
    let isInViewport = true

    const renderQueue: SphereRenderParticle[] = []
    const layersConfig = getSphereLayersConfig(
      getSphereBreakpoint({ isDesktop, isTablet })
    )
    const dprCap = isDesktop ? 2 : isTablet ? 1.75 : 1.5
    const speedY = prefersReducedMotion
      ? isDesktop
        ? 0.0006
        : isTablet
          ? 0.00052
        : 0.00045
      : isDesktop
        ? 0.0012
        : isTablet
          ? 0.001
        : 0.0008
    const speedX = prefersReducedMotion
      ? isDesktop
        ? 0.0001
        : isTablet
          ? 0.00009
        : 0.00008
      : isDesktop
        ? 0.0003
        : isTablet
          ? 0.00022
        : 0.00014
    const enableParallax =
      isDesktop && hasFinePointer && !prefersReducedMotion
    const parallaxStrengthX = enableParallax ? 0.25 : 0
    const parallaxStrengthZ = enableParallax ? -0.15 : 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      const rect = sizeRoot.getBoundingClientRect()

      width = rect.width
      height = rect.height
      centerX = width / 2
      centerY = height / 2
      size = Math.min(width, height) * SPHERE_SCALE

      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!interactionRoot) return

      const rect = interactionRoot.getBoundingClientRect()
      targetRotationX =
        clamp(-(((event.clientY - rect.top) / rect.height) * 2 - 1), -1, 1) *
        parallaxStrengthX
      targetRotationZ =
        clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1) *
        parallaxStrengthZ
    }

    const shouldAnimate = () =>
      isDocumentVisible && isInViewport && width > 0 && height > 0

    const stopAnimation = () => {
      if (animationId) {
        window.cancelAnimationFrame(animationId)
        animationId = 0
      }
    }

    const draw = () => {
      animationId = 0

      if (!shouldAnimate()) {
        return
      }

      ctx.clearRect(0, 0, width, height)
      populateSphereRenderQueue(renderQueue, layersConfig, {
        x: rotationX,
        y: rotationY,
        z: rotationZ,
      })

      for (const particle of renderQueue) {
        ctx.globalAlpha = particle.alpha
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(
          centerX + particle.x * size,
          centerY - particle.y * size,
          particle.size,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }

      ctx.globalAlpha = 1

      rotationY += speedY
      rotationX += speedX
      rotationX += (targetRotationX - rotationX) * 0.03
      rotationZ += (targetRotationZ - rotationZ) * 0.03

      animationId = window.requestAnimationFrame(draw)
    }

    const scheduleNextFrame = () => {
      if (!animationId && shouldAnimate()) {
        animationId = window.requestAnimationFrame(draw)
      }
    }

    const syncAnimationState = () => {
      if (shouldAnimate()) {
        scheduleNextFrame()
      } else {
        stopAnimation()
      }
    }

    const handleVisibilityChange = () => {
      isDocumentVisible = document.visibilityState === "visible"
      syncAnimationState()
    }

    resize()
    let resizeObserver: ResizeObserver | null = null

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        resize()
        syncAnimationState()
      })
      resizeObserver.observe(sizeRoot)
    } else {
      window.addEventListener("resize", resize)
    }

    let intersectionObserver: IntersectionObserver | null = null

    if (interactionRoot && typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          isInViewport = entry?.isIntersecting ?? true
          syncAnimationState()
        },
        { threshold: 0.01 }
      )
      intersectionObserver.observe(interactionRoot)
    }

    if (enableParallax) {
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      })
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    syncAnimationState()

    return () => {
      stopAnimation()
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (!resizeObserver) {
        window.removeEventListener("resize", resize)
      }
      window.removeEventListener("pointermove", handlePointerMove)
    }
  }, [mediaState])

  return (
    <canvas
      ref={canvasRef}
      data-hero-sphere-canvas
      suppressHydrationWarning
      className="absolute inset-0 h-full w-full pointer-events-none"
    />
  )
}
