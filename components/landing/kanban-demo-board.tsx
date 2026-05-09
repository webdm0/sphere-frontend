"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, LayoutGroup } from "framer-motion"
import styles from "./landing.module.css"

type Task = {
  id: string
  label: string
  compactLabel: string
  column: number
}

const initialTasks: Task[] = [
  { id: "t1", label: "Refactor auth module", compactLabel: "Auth", column: 0 },
  { id: "t2", label: "Setup CI pipeline", compactLabel: "Build", column: 0 },
  { id: "t3", label: "Fix memory leak", compactLabel: "Leak", column: 1 },
  { id: "t4", label: "Review PR #42", compactLabel: "PR42", column: 1 },
  { id: "t5", label: "Deploy staging", compactLabel: "Ship", column: 2 },
  { id: "t6", label: "Write unit tests", compactLabel: "Tests", column: 0 },
  { id: "t7", label: "Update docs", compactLabel: "Docs", column: 2 },
]

const columns = ["QUEUE", "ACTIVE", "DONE"]

export function KanbanDemoBoard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isInViewport, setIsInViewport] = useState(false)
  const [isDocumentVisible, setIsDocumentVisible] = useState(true)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setIsInViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry?.isIntersecting ?? false)
      },
      { threshold: 0.15 }
    )

    if (boardRef.current) observer.observe(boardRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return

    const syncVisibility = () => {
      setIsDocumentVisible(!document.hidden)
    }

    syncVisibility()
    document.addEventListener("visibilitychange", syncVisibility)

    return () => document.removeEventListener("visibilitychange", syncVisibility)
  }, [])

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

  const shouldAnimate = isInViewport && isDocumentVisible && !prefersReducedMotion

  useEffect(() => {
    if (!shouldAnimate) return

    const moveRandomTask = () => {
      setTasks((prev) => {
        const newTasks = [...prev]
        const taskIndex = Math.floor(Math.random() * newTasks.length)
        const task = newTasks[taskIndex]

        const possibleMoves: number[] = []
        if (task.column > 0) possibleMoves.push(task.column - 1)
        if (task.column < 2) possibleMoves.push(task.column + 1)

        if (possibleMoves.length > 0) {
          const newColumn =
            possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
          newTasks[taskIndex] = { ...task, column: newColumn }
        }

        return newTasks
      })
    }

    const initialTimeout = window.setTimeout(moveRandomTask, 700)
    const interval = window.setInterval(moveRandomTask, 3000)

    return () => {
      window.clearTimeout(initialTimeout)
      window.clearInterval(interval)
    }
  }, [shouldAnimate])

  const tasksByColumn = useMemo(
    () => columns.map((_, columnIndex) => tasks.filter((task) => task.column === columnIndex)),
    [tasks]
  )

  return (
    <div
      ref={boardRef}
      className={`grid gap-6 ${styles.boardGrid}`}
    >
      <LayoutGroup>
        {columns.map((columnName, columnIndex) => (
          <div key={columnName} className="flex flex-col">
            <div className={`uppercase pb-2 mb-3 ${styles.boardColumnHeader}`}>
              {columnName}
            </div>

            <div className="flex flex-col gap-2 min-h-[410px]">
              {tasksByColumn[columnIndex].map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  layoutId={task.id}
                  transition={{
                    layout: {
                      type: "spring",
                      stiffness: 100,
                      damping: 20,
                    },
                  }}
                  className={styles.boardTaskCard}
                  aria-label={task.label}
                >
                  <span className="md:hidden" aria-hidden="true">
                    {task.compactLabel}
                  </span>
                  <span className="hidden md:inline">{task.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </LayoutGroup>
    </div>
  )
}
