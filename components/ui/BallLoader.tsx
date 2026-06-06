type BallLoaderSize = "xs" | "sm" | "md" | "lg";
type BallLoaderVariant = "brand" | "light" | "danger";

type Props = {
  size?: BallLoaderSize;
  variant?: BallLoaderVariant;
  className?: string;
  label?: string;
};

export function BallLoader({
  size = "md",
  variant = "brand",
  className = "",
  label = "Loading",
}: Props) {
  return (
    <div
      className={`ball-loader ball-loader--${size} ball-loader--${variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <div className="ball-loader__ball" />
      <div className="ball-loader__ball" />
      <div className="ball-loader__ball" />
    </div>
  );
}
