import Link from "next/link"
import styles from "./landing.module.css"

export function Header() {
  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 lg:px-12 py-5"
    >
      <div className="flex items-center gap-6">
        <div className={styles.headerBrand}>
          SPHERE<span className={styles.headerBrandSuffix}>_</span>
        </div>
        
        <div className={`hidden sm:block ${styles.headerSystem}`}>
          {'// SYSTEM'}
        </div>
      </div>

      <Link
        href="/login"
        className={`uppercase ${styles.headerLink}`}
      >
        <span className={styles.headerLinkLabel}>
          Enter
          <span aria-hidden="true" className={styles.headerLinkUnderline} />
        </span>
      </Link>
    </header>
  )
}
