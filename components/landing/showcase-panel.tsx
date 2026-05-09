"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import PlayIcon from "@/components/icons/PlayIcon"
import styles from "./showcase-panel.module.css"

const INITIAL_METRICS = {
  score: 72,
  fcp: 2.3,
  memory: 67,
  warnings: 12,
}

const INITIAL_GRAPH = [
  45, 52, 48, 55, 42, 58, 51, 47, 53, 49, 56, 44,
  50, 54, 46, 52, 48, 55, 43, 57, 50, 46, 53, 49,
]

const COMPLIANCE_BADGES = ["SOC 2", "ISO 27001", "GDPR"]

export function ShowcasePanel() {
  const [clickCount, setClickCount] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [terminalLines, setTerminalLines] = useState<string[]>([])
  const [typingText, setTypingText] = useState("")
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [metrics, setMetrics] = useState(INITIAL_METRICS)
  const [graph, setGraph] = useState(INITIAL_GRAPH)
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  const clearTrackedTimeout = useCallback((timeoutId: ReturnType<typeof setTimeout> | null) => {
    if (!timeoutId) return
    clearTimeout(timeoutId)
    pendingTimeoutsRef.current.delete(timeoutId)
  }, [])

  const clearAllTimeouts = useCallback(() => {
    if (typingRef.current) {
      clearTrackedTimeout(typingRef.current)
      typingRef.current = null
    }

    pendingTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    pendingTimeoutsRef.current.clear()
  }, [clearTrackedTimeout])

  const setTrackedTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      pendingTimeoutsRef.current.delete(timeoutId)
      callback()
    }, delay)

    pendingTimeoutsRef.current.add(timeoutId)
    return timeoutId
  }, [])

  const typeText = useCallback((text: string, onComplete?: () => void) => {
    setTypingText("")
    let index = 0

    if (typingRef.current) {
      clearTrackedTimeout(typingRef.current)
      typingRef.current = null
    }

    const type = () => {
      if (index < text.length) {
        setTypingText(text.slice(0, index + 1))
        index++
        const delay = text[index - 1] === "." ? 80 : text[index - 1] === " " ? 30 : 25
        typingRef.current = setTrackedTimeout(type, delay)
      } else {
        typingRef.current = null
        onComplete?.()
      }
    }

    type()
  }, [clearTrackedTimeout, setTrackedTimeout])

  useEffect(() => {
    return () => {
      clearAllTimeouts()
    }
  }, [clearAllTimeouts])

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const syncReducedMotion = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    syncReducedMotion()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncReducedMotion)
      return () => mediaQuery.removeEventListener("change", syncReducedMotion)
    }

    mediaQuery.addListener(syncReducedMotion)
    return () => mediaQuery.removeListener(syncReducedMotion)
  }, [])

  useEffect(() => {
    if (!prefersReducedMotion || !isRunning) return

    clearAllTimeouts()
    setTypingText("")
    setIsRunning(false)
  }, [clearAllTimeouts, isRunning, prefersReducedMotion])

  const calculateMetrics = useCallback((newScore: number) => {
    const baseFcp = 4.0 - (newScore / 100) * 2.5
    const fcp = Math.max(1.8, Math.min(3.5, baseFcp + (Math.random() * 0.3 - 0.15)))

    const baseMemory = 120 - (newScore / 100) * 70
    const memory = Math.max(45, Math.min(95, baseMemory + (Math.random() * 10 - 5)))

    const baseWarnings = 35 - (newScore / 100) * 30
    const warnings = Math.max(3, Math.min(24, Math.round(baseWarnings + (Math.random() * 4 - 2))))

    return {
      score: newScore,
      fcp: +fcp.toFixed(1),
      memory: Math.round(memory),
      warnings,
    }
  }, [])

  const generateNewGraph = useCallback(() => {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 40) + 30)
  }, [])

  const applyDiagnosticsResult = useCallback((nextClickCount: number) => {
    const baseChange = Math.floor(Math.random() * 7) - 3
    const trendPenalty = nextClickCount > 3 ? -2 : 0
    const nextScore = Math.max(64, Math.min(78, metrics.score + baseChange + trendPenalty))

    setClickCount(nextClickCount)
    setMetrics(calculateMetrics(nextScore))
    setGraph(generateNewGraph())
  }, [calculateMetrics, generateNewGraph, metrics.score])

  const runTest = useCallback(() => {
    if (isRunning) return

    clearAllTimeouts()
    setTerminalLines([])
    setTypingText("")

    const nextClickCount = clickCount + 1

    if (prefersReducedMotion) {
      applyDiagnosticsResult(nextClickCount)
      setTerminalLines([
        "> Initializing diagnostics...",
        "> Running performance scan...",
        "> Diagnostics complete. System optimal.",
      ])
      return
    }

    setIsRunning(true)

    typeText("> Initializing diagnostics...", () => {
      setTerminalLines((prev) => [...prev, "> Initializing diagnostics..."])
      setTypingText("")

      setTrackedTimeout(() => {
        typeText("> Running performance scan...", () => {
          setTerminalLines((prev) => [...prev, "> Running performance scan..."])
          setTypingText("")

          setTrackedTimeout(() => {
            applyDiagnosticsResult(nextClickCount)

            typeText("> Diagnostics complete. System optimal.", () => {
              setTerminalLines((prev) => [...prev, "> Diagnostics complete. System optimal."])
              setTypingText("")
              setIsRunning(false)
            })
          }, 300)
        })
      }, 400)
    })
  }, [applyDiagnosticsResult, clearAllTimeouts, clickCount, isRunning, prefersReducedMotion, setTrackedTimeout, typeText])

  return (
    <div className="w-full lg:w-[65%] flex flex-col gap-6">
      <div className={styles.badgeRow}>
        {COMPLIANCE_BADGES.map((badge) => (
          <div
            key={badge}
            className={`uppercase ${styles.badge}`}
          >
            {badge}
          </div>
        ))}
      </div>

      <div className={`relative ${styles.mainPanelTilt}`}>
        <div
          className={`${styles.mainPanelPadding} ${styles.mainPanelShell}`}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-2.5 h-2.5 rounded-full ${styles.windowDotPrimary}`} />
            <div className={`w-2.5 h-2.5 rounded-full ${styles.windowDotMuted}`} />
            <div className={`w-2.5 h-2.5 rounded-full ${styles.windowDotMuted}`} />
            <div
              className={`ml-4 uppercase ${styles.windowLabel}`}
            >
              Performance Insights
            </div>
          </div>

          <div className={styles.panelTopRow}>
            <div className={styles.scoreWrap}>
              <svg className="absolute inset-0" viewBox="0 0 120 120">
                <circle className={styles.scoreRingTrack} cx="60" cy="60" r="54" />
                <circle
                  className={styles.scoreRingValue}
                  cx="60"
                  cy="60"
                  r="54"
                  strokeDasharray={`${metrics.score * 3.39} 339`}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="text-center">
                <div className={styles.scoreValue}>
                  {metrics.score}
                </div>
                <div className={`uppercase ${styles.scoreLabel}`}>
                  score
                </div>
              </div>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={`uppercase mb-1 ${styles.metricLabel}`}>
                  FCP
                </div>
                <div className={styles.metricValue}>
                  {metrics.fcp}s
                </div>
                <div className={styles.metricHint}>
                  First Paint
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={`uppercase mb-1 ${styles.metricLabel}`}>
                  MEMORY
                </div>
                <div className={styles.metricValue}>
                  {metrics.memory}MB
                </div>
                <div className={styles.metricHint}>
                  Heap Size
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={`uppercase mb-1 ${styles.metricLabel}`}>
                  WARNINGS
                </div>
                <div className={styles.metricValue}>
                  {metrics.warnings}
                </div>
                <div className={styles.metricHint}>
                  Console
                </div>
              </div>
            </div>
          </div>

          <div className={styles.graphShell}>
            {graph.map((value, index) => (
              <div
                key={index}
                className={`flex-1 ${prefersReducedMotion ? "" : "transition-[height] duration-500"} ${styles.graphBar} ${index % 2 === 0 ? styles.graphBarEven : styles.graphBarOdd}`}
                style={{
                  height: `${value}%`,
                }}
              />
            ))}
          </div>

          <button
            onClick={runTest}
            disabled={isRunning}
            className={`w-full uppercase ${prefersReducedMotion ? "" : "transition-opacity"} ${styles.runButton} ${isRunning ? styles.runButtonRunning : styles.runButtonIdle}`}
          >
            <span className="flex items-center justify-center gap-3">
              <PlayIcon size={16} color={"var(--text-placeholder)"} />
              <span>{isRunning ? "Running diagnostics..." : "Run Speed Test"}</span>
            </span>
          </button>
        </div>
      </div>

      <div className={`relative ${styles.terminalTilt}`}>
        <div
          className={`${styles.terminalPadding} ${styles.terminalShell}`}
        >
          <div className={`uppercase mb-3 ${styles.terminalLabel}`}>
            system_output
          </div>
          <div className={`text-[12px] leading-[1.45] space-y-1 ${styles.terminalContent}`}>
            {terminalLines.length === 0 && !typingText ? (
              <div className={styles.terminalIdle}>
                {"> Awaiting diagnostics..."}
                {!prefersReducedMotion && (
                  <span
                    aria-hidden="true"
                    className={`terminal-cursor ml-1 ${styles.terminalCursorIdle}`}
                  />
                )}
              </div>
            ) : (
              <>
                {terminalLines.map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
                {typingText && (
                  <div>
                    {typingText}
                    {!prefersReducedMotion && (
                      <span
                        aria-hidden="true"
                        className={`terminal-cursor ml-0.5 ${styles.terminalCursorActive}`}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
