import { cn } from "@/lib/utils";

interface CreditCardMiniProps {
  nome?: string | null;
  bandeira?: string | null;
  className?: string;
}

function normalize(value?: string | null) {
  return (value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function CreditCardMini({ nome, bandeira, className }: CreditCardMiniProps) {
  const ref = `${normalize(nome)} ${normalize(bandeira)}`;
  const isMaster = ref.includes("master") || ref.includes("mastercard");
  const isVisa = ref.includes("visa");
  const label = isMaster ? "MASTER" : isVisa ? "VISA" : (nome || "CARTAO").toUpperCase();

  return (
    <div className={cn("relative w-[92px] h-[58px] rounded-2xl p-3 shadow-sm overflow-hidden border border-white/25", className)}>
      {isMaster ? (
        <div className="absolute inset-0 bg-gradient-to-br from-[#21113F] via-[#4C2D7F] to-[#8B5CF6]" />
      ) : isVisa ? (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1D4ED8] to-[#60A5FA]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#5B4BC4] via-[#7C5BBF] to-[#B497F5]" />
      )}

      <div className="absolute -right-5 -top-6 w-16 h-16 rounded-full bg-white/10" />
      <div className="absolute -left-6 -bottom-8 w-20 h-20 rounded-full bg-white/10" />

      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="w-6 h-4 rounded-md bg-white/75 shadow-inner" />
        <div className="flex items-end justify-between gap-2">
          <span className="text-[8px] font-extrabold tracking-wide text-white/95 truncate max-w-[48px]">
            {label}
          </span>

          {isMaster ? (
            <div className="relative w-7 h-4 shrink-0">
              <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-[#F97316]/95" />
              <div className="absolute right-0 top-0 w-4 h-4 rounded-full bg-[#FACC15]/95 mix-blend-screen" />
            </div>
          ) : isVisa ? (
            <div className="text-[8px] font-extrabold italic text-white/95 shrink-0">VISA</div>
          ) : (
            <div className="w-5 h-3 rounded-full bg-white/25 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
