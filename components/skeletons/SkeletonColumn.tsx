import styles from "@/components/skeletons/SkeletonColumn.module.css";

export default function SkeletonColumn() {
  return (
    <div className={styles.skeletonColumn}>

      <div className={styles.header} />

      <div className={styles.body}>
        <div className={styles.inner} />
        <div className={styles.topShadow} />
        <div className={styles.bottomShadow} />
      </div>

      <div className={styles.inputPlaceholder} />
    </div>
  );
}
