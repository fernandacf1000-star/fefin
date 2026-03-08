import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Conta = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password section
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || profile.full_name || "");
      setEmail(profile.email || user?.email || "");
    } else if (user) {
      setEmail(user.email || "");
    }
  }, [profile, user]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Update profile table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ nome, full_name: nome, email, updated_at: new Date().toISOString() })
        .eq("user_id", user!.id);
      if (profileError) throw profileError;

      // Update auth email if changed
      if (email !== user?.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
      }

      // Update password if filled
      if (showPwSection && newPw) {
        if (newPw !== confirmPw) {
          toast.error("As senhas não coincidem");
          setSaving(false);
          return;
        }
        if (newPw.length < 6) {
          toast.error("A nova senha deve ter pelo menos 6 caracteres");
          setSaving(false);
          return;
        }
        // Verify current password by re-signing in
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user!.email!,
          password: currentPw,
        });
        if (signInErr) {
          toast.error("Senha atual incorreta");
          setSaving(false);
          return;
        }
        const { error: pwError } = await supabase.auth.updateUser({ password: newPw });
        if (pwError) throw pwError;
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
        setShowPwSection(false);
      }

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Nome completo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className={inputClass}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={inputClass}
            />
          </div>

          {/* Security */}
          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Segurança
            </p>
            {!showPwSection ? (
              <button
                onClick={() => setShowPwSection(true)}
                className="w-full py-3.5 rounded-xl bg-secondary border border-border/50 text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Alterar senha
              </button>
            ) : (
              <div className="space-y-4 glass-card p-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Senha atual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-12`}
                    />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-12`}
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Confirmar nova senha
                  </label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
                <button
                  onClick={() => { setShowPwSection(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-xl gradient-emerald text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>

          {saved && (
            <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium animate-fade-up">
              <Check size={16} />
              Dados atualizados! ✓
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conta;
