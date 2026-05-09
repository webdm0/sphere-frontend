import styles from "@/components/skeletons/SkeletonCardModal.module.css";

export default function SkeletonCardModal() {
  return (
    <>
      <div className={`${styles.skeletonTitle} ${styles.shimmer}`} />
      <div className={`${styles.textArea} ${styles.shimmer}`} />
      <div className={styles.fieldsGrid}>

        <div className={styles.field}>
          <div className={styles.label}></div>
          <div className={`${styles.select} ${styles.shimmer}`}></div>
        </div>

        <div className={styles.field}>
          <div className={styles.label}></div>
          <div className={`${styles.select} ${styles.shimmer}`}></div>
        </div>

        <div className={styles.field}>
          <div className={styles.label}></div>
          <div className={`${styles.select} ${styles.shimmer}`}></div>
        </div>

        <div className={styles.field}>
          <div className={styles.label}></div>
          <div className={`${styles.select} ${styles.shimmer}`}></div>
        </div>

        <div className={styles.archiveRow}>
          <div className={styles.label}></div>
          <div className={styles.switchPlaceholder}></div>
        </div>
      </div>
    </>
  );
}
