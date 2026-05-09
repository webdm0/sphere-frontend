import type { ColorIconProps } from "./types";

export default function AcceptIcon({
  size = 20,
  color = "var(--text-secondary)",
  className,
}: ColorIconProps) {
  return (
    <svg
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke={color}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
    >
      <path
        d="M10.5 25L19.2 33.8C19.3 33.9 19.6 34.1 19.8 34.1C20.1 34.1 20.4 34 20.6 33.8L37.5 14.3C38.7 12.9 38.6 10.9 37.1 9.6C35.6 8.3 33.3 8.6 32.1 10L20.1 24.7L15.3 19.9C14.1 18.7 12 18.8 10.9 20C9.8 21.2 9.9 23.3 11.1 24.5L10.5 25Z"
        strokeDasharray="15 15 999"
      />
    </svg>
  );
}
