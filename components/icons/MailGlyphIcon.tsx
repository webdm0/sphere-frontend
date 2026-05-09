import type { IconProps } from "./types";

export default function MailGlyphIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M1.5 3.5A1.5 1.5 0 013 2h10a1.5 1.5 0 011.5 1.5v.17l-6.5 4.33-6.5-4.33V3.5zm0 1.84v7.16A1.5 1.5 0 003 14h10a1.5 1.5 0 001.5-1.5V5.34L8.31 9.59a.5.5 0 01-.62 0L1.5 5.34z" />
    </svg>
  );
}
