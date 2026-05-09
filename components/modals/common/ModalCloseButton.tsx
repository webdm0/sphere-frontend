import CloseIcon from "@/components/icons/CloseIcon";
import styles from "./ModalCloseButton.module.css";

interface ModalCloseButtonProps {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
  iconSize?: number;
  iconColor?: string;
}

export default function ModalCloseButton({
  onClick,
  ariaLabel = "Close dialog",
  className,
  iconSize = 14,
  iconColor = "#666",
}: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`${styles.button} focus-ring ${className ?? ""}`.trim()}
      onClick={onClick}
      data-interactive="true"
    >
      <CloseIcon size={iconSize} color={iconColor} />
    </button>
  );
}
