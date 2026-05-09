import { particleSpherePrepaintScript } from "@/components/landing/particle-sphere-prepaint-script"
import { ParticleSphereScene } from "@/components/landing/particle-sphere-scene"
import styles from "./landing.module.css"

export function Hero() {
  return (
    <section
      id="overview"
      data-hero-parallax-root
      className={`relative overflow-hidden noise-bg scroll-mt-24 ${styles.heroSection}`}
    >
      <div className={`absolute pointer-events-none ${styles.heroLineLeft}`} />
      <div className={`absolute pointer-events-none ${styles.heroLineRight}`} />

      <div className={styles.heroContent}>
        <div className={styles.heroTitleWrap}>
          <h1 className={`leading-[1.1] select-none ${styles.heroTitle}`}>
            SYSTEM.SPHERE_
          </h1>
        </div>

        <div className={styles.heroCopyBlock}>
          <p className={styles.heroCopy}>
            {"Sphere is a focused kanban workspace with fast card and column reordering and keyboard-friendly drag and drop. It features archive and restore for work that should leave the active board without losing context. Moving work around the board feels immediate and stays clear and readable at a glance, even as changes arrive across the board in real time."}
          </p>
        </div>

        <div className={styles.heroSphere}>
          <div className={styles.heroSphereInner}>
            <ParticleSphereScene />
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: particleSpherePrepaintScript }} />

        <div className="flex-1" />

        <div className={`w-full overflow-hidden py-4 ${styles.heroMarquee}`}>
          <div className="flex animate-marquee whitespace-nowrap">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className={`uppercase mx-8 ${styles.heroMarqueeText}`}>
                PLAN WORK // ORGANIZE TASKS // KEEP CONTEXT //
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
