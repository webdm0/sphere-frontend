import type { ColorIconProps } from "./types";

export default function DeclineIcon({
  size = 20,
  color = "var(--text-secondary)",
  className,
}: ColorIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
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
      <path d="M36.33 10.29L29.03 17.6M28.27 24.01L39.16 13.12C40.33 11.95 40.33 10.05 39.16 8.88C37.99 7.71 36.08 7.71 34.91 8.88L27.61 16.18M24.03 19.77L13.15 8.9C11.98 7.72 10.08 7.72 8.91 8.9C7.74 10.07 7.74 11.97 8.91 13.14L19.78 24.01L8.93 34.87C8.8 34.99 8.63 35.19 8.47 35.46C7.77 36.59 7.77 37.93 8.92 39.08C10.1 40.23 11.42 40.23 12.55 39.57C12.83 39.41 13.03 39.24 13.16 39.12L21.94 30.34M25.44 24.01L23.49 25.95C23.36 26.09 23.28 26.24 23.23 26.41C23.01 26.79 23.06 27.29 23.39 27.62L34.91 39.14C36.08 40.31 37.98 40.31 39.15 39.14C40.32 37.96 40.32 36.06 39.15 34.89L28.27 24.01Z" />
    </svg>
  );
}
