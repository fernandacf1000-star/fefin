import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Check, RotateCcw, CreditCard, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useAllReembolsos } from "@/hooks/useReembolsos";
import { useCartoes, useAddCartao, useUpdateCartao, useDeleteCartao } from "@/hooks/useCartoes";
import type { Cartao } from "@/hooks/useCartoes";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CartaoModal from "@/components/CartaoModal";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Conta = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: allReembolsos = [] } = useAllReembolsos();
  const { data: cartoes = [] } = useCartoes();
  const addCartao = useAddCartao();
  const updateCartao = useUpdateCartao();
  const deleteCartao = useDeleteCartao();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [cartaoModalOpen, setCartaoModalOpen] = useState(false);
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || profile.full_name || "");
      setEmail(profile.email || user?.email || "");
    } else if (user) {
      setEmail(user.email || "");
    }
  }, [profile, user]);

  const currentYear = new Date().getFullYear();
  const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const reembolsosAno = useMemo(
    () => allReembolsos.filter((r) => r.data_reembolso.startsWith(String(currentYear))),
    [allReembolsos, currentYear]
  );
  const reembolsosMes = useMemo(
    () => allReembolsos.filter((r) => r.data_reembolso.startsWith(currentMonth)),
    [allReembolsos, currentMonth]
  );
  const totalAno = useMemo(() => reembolsosAno.reduce((s, r) => s + Number(r.valor_reembolsado), 0), [reembolsosAno]);
  const totalMes = useMemo(() => reembolsosMes.reduce((s, r) => s + Number(r.valor_reembolsado), 0), [reembolsosMes]);

  const porFonte = useMemo(() => {
    const map: Record<string, number> = {};
    reembolsosAno.forEach((r) => {
      const key = r.quem_reembolsou || "Outros";
      map[key] = (map[key] || 0) + Number(r.valor_reembolsado);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [reembolsosAno]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ nome, full_name: nome, email, updated_at: new Date().toISOString() })
        .eq("user_id", user!.id);
      if (profileError) throw profileError;

      if (email !== user?.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
      }

      if (showPwSection && newPw) {
        if (newPw !== confirmPw) { toast.error("As senhas não coincidem"); setSaving(false); return; }
        if (newPw.length < 6) { toast.error("A nova senha deve ter pelo menos 6 caracteres"); setSaving(false); return; }
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user!.email!, password: currentPw });
        if (signInErr) { toast.error("Senha atual incorreta"); setSaving(false); return; }
        const { error: pwError } = await supabase.auth.updateUser({ password: newPw });
        if (pwError) throw pwError;
        setCurrentPw(""); setNewPw(""); setConfirmPw(""); setShowPwSection(false);
      }

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCartao = async (data: { nome: string; bandeira: string; dia_fechamento: number; melhor_dia_compra: number; cor: string }) => {
    try {
      if (editingCartao) {
        await updateCartao.mutateAsync({ id: editingCartao.id, ...data });
        toast.success("Cartão atualizado ✓");
      } else {
        await addCartao.mutateAsync(data);
        toast.success("Cartão adicionado ✓");
      }
      setCartaoModalOpen(false);
      setEditingCartao(null);
    } catch {
      toast.error("Erro ao salvar cartão.");
    }
  };

  const handleDeleteCartao = async (id: string) => {
    try {
      await deleteCartao.mutateAsync(id);
      toast.success("Cartão removido ✓");
    } catch {
      toast.error("Erro ao remover cartão.");
    }
  };

  const inputClass =
    "w-full px-4 py-3.5 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm";

  return (
    <div className="min-h-screen gradient-bg pb-8">
      <div className="px-4 pt-12 w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 animate-fade-up">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Minha conta</h1>
        </div>

        <div className="space-y-6 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome completo</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className={inputClass} />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClass} />
          </div>

          {/* Security */}
          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Segurança</p>
            {!showPwSection ? (
              <button onClick={() => setShowPwSection(true)} className="w-full py-3.5 rounded-xl bg-secondary border border-border/50 text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
                Alterar senha
              </button>
            ) : (
              <div className="space-y-4 glass-card p-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Senha atual</label>
                  <div className="relative">
                    <input type={showCurrentPw ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" className={`${inputClass} pr-12`} />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nova senha</label>
                  <div className="relative">
                    <input type={showNewPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" className={`${inputClass} pr-12`} />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmar nova senha</label>
                  <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" className={inputClass} />
                </div>
                <button onClick={() => { setShowPwSection(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving} className="w-full py-3.5 rounded-xl gradient-emerald text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 mt-4">
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>

          {saved && (
            <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium animate-fade-up">
              <Check size={16} /> Dados atualizados! ✓
            </div>
          )}

          {/* Meus Cartões */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-primary" />
                <p className="text-sm font-semibold text-foreground">💳 Meus cartões</p>
              </div>
              <button
                onClick={() => { setEditingCartao(null); setCartaoModalOpen(true); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground"
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>

            {cartoes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum cartão cadastrado</p>
            ) : (
              <div className="space-y-2">
                {cartoes.map((c) => (
                  <div key={c.id} className="glass-card p-4 flex items-center justify-between" style={{ borderLeft: `3px solid ${c.cor}` }}>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {c.bandeira} · Fecha dia {c.dia_fechamento} · Melhor dia: {c.melhor_dia_compra}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingCartao(c); setCartaoModalOpen(true); }}
                        className="text-xs text-primary font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCartao(c.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reembolsos recebidos */}
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw size={16} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">Reembolsos recebidos</p>
            </div>

            <div className="glass-card p-4 space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Total no mês</p>
                <p className="text-sm font-bold text-primary tabular-nums">{fmt(totalMes)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Total no ano ({currentYear})</p>
                <p className="text-sm font-bold text-primary tabular-nums">{fmt(totalAno)}</p>
              </div>
            </div>

            {porFonte.length > 0 && (
              <div className="glass-card p-4 space-y-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Por fonte</p>
                {porFonte.map(([fonte, valor]) => (
                  <div key={fonte} className="flex items-center justify-between">
                    <p className="text-sm text-foreground">{fonte}</p>
                    <p className="text-sm font-semibold text-primary tabular-nums">{fmt(valor)}</p>
                  </div>
                ))}
              </div>
            )}

            {reembolsosAno.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum reembolso registrado este ano</p>
            )}
          </div>
        </div>
      </div>

      {/* Sobre o app */}
      <div className="px-4 mt-8 pb-8 flex flex-col items-center animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="w-full h-[1px] bg-border/30 mb-6" />
        <h2 className="text-foreground font-bold text-lg mb-1">FeFin</h2>
        <p className="text-muted-foreground text-[12px]">{APP_VERSION}</p>
        <p className="text-muted-foreground text-[12px] mb-4">Atualizado em {APP_UPDATED}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 text-foreground text-sm font-medium hover:bg-secondary/50 transition-colors"
        >
          <span>🔄</span> Forçar atualização
        </button>
      </div>

      <CartaoModal
        open={cartaoModalOpen}
        onClose={() => { setCartaoModalOpen(false); setEditingCartao(null); }}
        onSave={handleSaveCartao}
        isPending={addCartao.isPending || updateCartao.isPending}
        initial={editingCartao ? {
          nome: editingCartao.nome,
          bandeira: editingCartao.bandeira,
          dia_fechamento: editingCartao.dia_fechamento,
          melhor_dia_compra: editingCartao.melhor_dia_compra,
          cor: editingCartao.cor,
        } : undefined}
      />
    </div>
  );
};

export default Conta;
