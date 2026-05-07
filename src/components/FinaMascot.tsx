import { cn } from "@/lib/utils";

type FinaMascotProps = {
  size?: number;
  className?: string;
  eager?: boolean;
  alt?: string;
};

export default function FinaMascot({
  size = 72,
  className,
  eager = false,
  alt = "Fina",
}: FinaMascotProps) {
  return (
    <img
      src="/fina-mascot.png"
      alt={alt}
      width={size}
      height={size}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("shrink-0 object-contain drop-shadow", className)}
      style={{ width: size, height: "auto" }}
    />
  );
}
