type LogoSize = "sm" | "lg";

// Brand lockup lives in public/ so it has a stable URL and doubles as favicon.
const LOGO_SRC = "/WSLogo.png";

const SIZE_CLASS: Record<LogoSize, string> = {
  sm: "h-11", // header / compact
  lg: "h-28", // login / hero
};

export function Logo({ size = "sm", className = "" }: { size?: LogoSize; className?: string }) {
  return (
    <img
      src={LOGO_SRC}
      alt="WorkSync"
      className={`${SIZE_CLASS[size]} w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
