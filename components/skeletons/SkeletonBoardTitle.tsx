import styles from "@/components/skeletons/SkeletonBoardTitle.module.css";

export default function SkeletonBoardTitle() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.title} />
    </div>
  );
}
