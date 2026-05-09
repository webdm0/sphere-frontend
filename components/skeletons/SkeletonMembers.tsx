import styles from "@/components/skeletons/SkeletonMembers.module.css";

export default function SkeletonMembers() {
  return (
    <div className={styles.wrapper}>
      <div className={`${styles.title} ${styles.shimmer}`}></div>

      <div className={styles.list}>
        {[1, 2, 3, 4].map((i) => (
          <div className={styles.memberItem} key={i}>
            <div className={`${styles.username} ${styles.shimmer}`}></div>
            <div className={`${styles.tag} ${styles.shimmer}`}></div>
          </div>
        ))}
      </div>
    </div>
  );
}
