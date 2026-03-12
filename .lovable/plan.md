

## Redesign Dashboard — Light Theme with Quinzenas

### Overview
Complete visual overhaul of `src/pages/Dashboard.tsx` from dark to light theme. Keep all hooks, queries, and data logic. Replace the JSX layout with the new structure. Also update BottomNav mobile bar colors for the light-themed Dashboard context.

### What changes

**File: `src/pages/Dashboard.tsx`** — rewrite the return JSX and add a `quinzenas` useMemo.

**New data computation — Quinzenas:**
```typescript
const quinzenas = useMemo(() => {
  const lastDay = new Date(mesAtual.year, mesAtual.month + 1, 0).getDate();
  const q1Desp = despesas.filter(d => { const day = parseInt(d.data.split("-")[2]); return day >= 1 && day <= 15; });
  const q2Desp = despesas.filter(d => { const day = parseInt(d.data.split("-")[2]); return day >= 16; });
  const q1Rec = receitas.filter(r => { const day = parseInt(r.data.split("-")[2]); return day >= 1 && day <= 15; });
  const q2Rec = receitas.filter(r => { const day = parseInt(r.data.split("-")[2]); return day >= 16; });
  // sum with reembolso deduction for despesas
  return { q1: { desp, rec, reserva }, q2: { desp, rec, reserva }, lastDay };
}, [despesas, receitas, allReembolsos, mesAtual]);
```

**New layout structure (top to bottom):**

1. **Container**: `bg-[#F4F7FB] min-h-screen` instead of dark gradient. Inline style override for body-level dark bg.
2. **Header**: "Olá, [nome] ✨" + month nav arrows (reuse existing `mesAtual` state).
3. **Main card** (white, rounded-[20px], shadow):
   - Best card chip: `💳 [name] · fecha em Xd` — reuse `bestCartaoId` + `getCartaoCycle`.
   - "DESPESAS DO MÊS" label + large value.
   - Two sub-cards: RECEITAS (bg `#EDF1F8`) and RESERVA (bg teal/10%).
4. **Quinzenas section**: Two side-by-side cards with progress bars (accent `#6366F1`).
5. **Categorias section**: 2-col grid of category cards (white, rounded-[14px]).

**What to remove:**
- "Saldo disponível" card
- "Meta do mês" card (keep `handleSaveMeta` and meta modal for future use but don't render the card)
- Parcelamentos section
- Cartões section
- Recent transactions section
- Profile bottom sheet (keep)
- Dark theme classes (`gradient-bg`, `glass-card`, dark colors)

**Color tokens used inline:**
- Background: `#F4F7FB`
- Cards: `#FFFFFF`, shadow `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)`
- Text: `#1E293B` (primary), `#64748B` (secondary), `#94A3B8` (dim)
- Accent: `#6366F1`
- Positive/teal: `#0D9488`
- Alert: `#E07A5F`

**BottomNav**: Update mobile nav bar from `bg-card/90` to white with blur (`rgba(255,255,255,0.92)`) and border color to match light theme. Update sidebar left panel background similarly.

### Files to edit
1. `src/pages/Dashboard.tsx` — full layout rewrite (keep all hooks/state/logic, replace JSX)
2. `src/components/BottomNav.tsx` — update mobile nav background to white/blur for light theme
3. `src/version.ts` — bump version

### Sections preserved as-is
- All `useMemo` data computations (receitas, despesas, categoryTotals, bestCartaoId, etc.)
- Profile bottom sheet + logout confirmation + meta modal (with updated colors to match light theme)
- Month navigation state and handlers
- All Supabase/React Query integration

