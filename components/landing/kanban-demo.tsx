import { KanbanDemoBoard } from "./kanban-demo-board"
import styles from "./landing.module.css"

export function KanbanDemo() {
  return (
    <section
      className={`relative pt-32 pb-0 overflow-hidden noise-bg ${styles.demoSection}`}
    >
      <div className={`absolute pointer-events-none ${styles.demoLine}`} />

      <div
        id="demo"
        className="relative z-10 px-4 md:px-8 lg:px-12 pb-3 scroll-mt-24"
      >
        <div className="mb-16">
          <div className={`uppercase mb-4 ${styles.demoEyebrow}`}>
            {'// LIVE_WORKFLOW'}
          </div>
          <h2
            className={`leading-[1.05] mb-6 ${styles.sectionTitle}`}
          >
            MOVE.FAST_
          </h2>
          <p className={`max-w-md ${styles.demoCopy}`}>
            {'Move cards across the board, then open any task to update assignee, priority, dates, and notes without losing the shape of the workflow.'}
          </p>
        </div>

        <KanbanDemoBoard />
      </div>

      <div className={`w-full h-px ${styles.sectionDivider}`} />
    </section>
  )
}
