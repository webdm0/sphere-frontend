import styles from "@/components/skeletons/ArchiveModalSkeleton.module.css";

export default function ArchiveModalSkeleton() {
  return (
    <div className={styles.wrapper}>
      {[1, 2, 3].map((item) => (
        <div key={item} className={styles.row}>

          <div className={styles.card}>
            <div className={`${styles.bar} ${styles.title} ${styles.shimmer}`} />
            <div className={`${styles.bar} ${styles.subtitle} ${styles.shimmer}`} />
          </div>

          <div className={styles.actions}>
            <div className={`${styles.icon} ${styles.shimmer}`} />
            <div className={`${styles.icon} ${styles.shimmer}`} />
          </div>

        </div>
      ))}
    </div>
  );
}
