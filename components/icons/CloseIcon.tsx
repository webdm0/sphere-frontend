import type { StrokeIconProps } from "./types";

export default function CloseIcon({
  size = 18,
  color = "var(--text-secondary)",
  strokeWidth = 1.6,
  className,
}: StrokeIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        d="M14 14L34 34M34 14L14 34"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
