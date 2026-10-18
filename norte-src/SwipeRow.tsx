import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const OPEN = 132; // largura dos dois botões
const THRESHOLD = 56;

export default function SwipeRow({
  children,
  onEdit,
  onDelete,
  label,
}: {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  label: string;
}) {
  const [offset, setOffset] = useState(0),
    [dragging, setDragging] = useState(false),
    [open, setOpen] = useState(false);
  const start = useRef<{ x: number; y: number; base: number } | null>(null),
    moved = useRef(false),
    root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        setOffset(0);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  function down(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("select,button.swipe-action")) return;
    start.current = { x: e.clientX, y: e.clientY, base: open ? -OPEN : 0 };
    moved.current = false;
  }
  function move(e: React.PointerEvent) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x,
      dy = e.clientY - s.y;
    if (!moved.current) {
      if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 6) return;
      moved.current = true;
      setDragging(true);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* alguns ambientes não suportam captura */
      }
    }
    setOffset(Math.max(-OPEN, Math.min(0, s.base + dx)));
  }
  function end() {
    if (!start.current) return;
    start.current = null;
    if (!moved.current) return;
    setDragging(false);
    const shouldOpen = offset < -THRESHOLD;
    setOpen(shouldOpen);
    setOffset(shouldOpen ? -OPEN : 0);
  }
  function closeThen(fn: () => void) {
    setOpen(false);
    setOffset(0);
    fn();
  }
  return (
    <div className="swipe" ref={root}>
      <div className="swipe-actions">
        <button
          type="button"
          className="swipe-action swipe-edit"
          aria-label={`Editar ${label}`}
          tabIndex={open ? 0 : -1}
          onClick={() => closeThen(onEdit)}
        >
          Editar
        </button>
        <button
          type="button"
          className="swipe-action swipe-delete"
          aria-label={`Excluir ${label}`}
          tabIndex={open ? 0 : -1}
          onClick={() => closeThen(onDelete)}
        >
          Excluir
        </button>
      </div>
      <div
        className={"swipe-content" + (dragging ? " dragging" : "")}
        style={{ transform: `translateX(${offset}px)` }}
        data-open={open}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onClickCapture={(e) => {
          if (moved.current) {
            e.stopPropagation();
            e.preventDefault();
            moved.current = false;
          } else if (open) {
            e.stopPropagation();
            e.preventDefault();
            setOpen(false);
            setOffset(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
