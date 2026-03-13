import { useState, useRef, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

const SwipeableItem = ({ children, onEdit, onDelete }: Props) => {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff < 0) {
      setOffsetX(Math.max(diff, -140));
    } else {
      setOffsetX(0);
    }
  };

  const onTouchEnd = () => {
    dragging.current = false;
    if (offsetX < -70) {
      setOffsetX(-140);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action buttons behind */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch z-0">
        <button
          onClick={onEdit}
          className="w-[70px] flex items-center justify-center text-xs font-semibold"
          style={{ backgroundColor: "rgba(245,158,11,0.9)", color: "#fff" }}
        >
          Editar
        </button>
        <button
          onClick={onDelete}
          className="w-[70px] flex items-center justify-center text-xs font-semibold bg-destructive text-destructive-foreground"
        >
          Excluir
        </button>
      </div>

      {/* Content */}
      <div
        className="relative z-10 bg-white transition-transform"
        style={{ transform: `translateX(${offsetX}px)`, transitionDuration: dragging.current ? "0ms" : "200ms" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableItem;
