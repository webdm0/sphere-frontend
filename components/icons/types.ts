export interface IconProps {
  size?: number;
  className?: string;
}

export interface ColorIconProps extends IconProps {
  color?: string;
}

export interface StrokeIconProps extends ColorIconProps {
  strokeWidth?: number;
}
