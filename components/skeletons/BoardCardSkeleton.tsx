import styles from "@/components/skeletons/BoardSkeleton.module.css";

export default function BoardCardSkeleton() {
  return (
    <div className={styles.skeletonBoard}>
      <div className={styles.title} />
      <div className={styles.badge} />
    </div>
  );
}
