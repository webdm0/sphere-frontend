import type { ColorIconProps } from "./types";

export default function PlayIcon({
  size = 20,
  color = "var(--text-secondary)",
  className,
}: ColorIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
    >
      <path
        d="M12 24.963V36.9928C12 39.4082 14.7006 40.8353 16.6934 39.4726L34.7152 26.4718C36.4394 25.2903 36.4393 22.7165 34.6955 21.5212L16.714 8.54872C14.7006 7.17153 12 8.59862 12 11.0141V11.9566C12 12.5089 12.4477 12.9566 13 12.9566C13.5523 12.9566 14 12.5089 14 11.9566V11.0141C14 10.206 14.8997 9.73057 15.5644 10.1852L33.5451 23.157C34.1496 23.5718 34.1496 24.4351 33.5648 24.836L15.5438 37.8362C14.8997 38.2763 14 37.8009 14 36.9928V24.963C14 24.4107 13.5523 23.963 13 23.963C12.4477 23.963 12 24.4107 12 24.963Z"
        fill={color}
      />
    </svg>
  );
}
