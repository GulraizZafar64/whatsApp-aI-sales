import Image from "next/image";
import Link from "next/link";
import { APP_LOGO_ALT, APP_LOGO_PATH } from "@/lib/brand";

const SIZE_CLASS = {
  xs: "h-8 w-auto",
  sm: "h-9 w-auto sm:h-10",
  md: "h-10 w-auto sm:h-11",
  lg: "h-12 w-auto sm:h-14",
  xl: "h-16 w-auto sm:h-20",
} as const;

type AppLogoProps = {
  size?: keyof typeof SIZE_CLASS;
  href?: string;
  className?: string;
  priority?: boolean;
  onClick?: () => void;
};

export function AppLogo({
  size = "md",
  href,
  className = "",
  priority = false,
  onClick,
}: AppLogoProps) {
  const img = (
    <Image
      src={APP_LOGO_PATH}
      alt={APP_LOGO_ALT}
      width={512}
      height={512}
      priority={priority}
      className={`object-contain shrink-0 ${SIZE_CLASS[size]} ${className}`}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex items-center shrink-0 min-w-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
      >
        {img}
      </Link>
    );
  }

  return <span className="inline-flex items-center shrink-0">{img}</span>;
}
