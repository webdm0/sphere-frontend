import { ShowcasePanel } from "./showcase-panel"
import styles from "./landing.module.css"

export function Showcase() {
  return (
    <section
      className={`relative py-32 overflow-hidden noise-bg ${styles.showcaseSection}`}
    >
      <div className={`absolute pointer-events-none ${styles.showcaseLineLeft}`} />
      <div className={`absolute pointer-events-none ${styles.showcaseLineRight}`} />

      <div
        id="showcase"
        className="relative z-10 px-4 md:px-8 lg:px-12 scroll-mt-24"
      >
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-8 items-start">

          <div className="w-full lg:w-[35%] lg:sticky lg:top-32">
            <div className={`uppercase mb-4 ${styles.showcaseEyebrow}`}>
              {'// PERFORMANCE_REPORT'}
            </div>
            <h2
              className={`leading-[1.05] mb-6 ${styles.sectionTitle}`}
            >
              BLAZINGLY<br />
              <span className={styles.showcaseTitleMuted}>FAST_</span>
            </h2>

            <div className="space-y-6">
              <p className={styles.showcaseCopy}>
                {'Our kanban platform delivers exceptional performance across modern workflows. Fast where it counts, stable where it matters.'}
              </p>

              <p className={styles.showcaseCopy}>
                {'Optimized for modern teams and fast-moving workflows, with a smoother path from planning to execution.'}
              </p>

              <p className={styles.showcaseStrongCopy}>
                {'Production-ready by design.*'}
              </p>

              <p className={styles.showcaseFootnote}>
                {'*Performance metrics reflect a controlled testing environment.'}
              </p>

              <p
                className={`inline-flex items-center gap-2 uppercase ${styles.showcaseLink}`}
              >
                <span>Run speed test</span>
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={styles.showcaseArrow}
                >
                  <path
                    d="M3 12H9.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 12H21M21 12L17 8M21 12L17 16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.showcaseArrowTip}
                  />
                </svg>
              </p>
            </div>
          </div>
          <ShowcasePanel />
        </div>
      </div>
    </section>
  )
}
