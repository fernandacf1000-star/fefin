import { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginBg from "@/assets/login-bg.jpg";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { APP_VERSION, APP_UPDATED } from "@/version";

const REMEMBER_KEY = "fefin_remember";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const saved = (() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.password) {
        const clean = { email: parsed.email };
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(clean));
        return clean;
      }
      return parsed;
    } catch { return null; }
  })();

  const [email, setEmail] = useState(saved?.email ?? "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(!!saved);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("E-mail ou senha incorretos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={loginBg} alt="FeFin background" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-between px-6 py-12 w-full">
        {/* Mascot + Logo */}
        <div className="text-center pt-16 animate-fade-up flex flex-col items-center">
          <img 
            src="/fina-mascot.png" 
            alt="Fina" 
            style={{ width: 120, height: "auto" }}
            className="drop-shadow-lg"
          />
          <h1 className="text-[38px] font-bold mt-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            <span className="text-primary">Fina</span>
          </h1>
          <p className="mt-1.5 uppercase text-muted-foreground" style={{ fontSize: 11, letterSpacing: 2 }}>
            Minhas finanças, minhas regras
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3.5 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              maxLength={255}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-secondary accent-primary"
            />
            <span className="text-xs text-muted-foreground">Lembrar de mim</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl gradient-emerald text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Entrar"}
          </button>

          <p className="text-center text-muted-foreground text-xs">
            Não tem conta?{" "}
            <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate("/cadastro")}>
              Criar conta
            </span>
          </p>
        </form>

        {/* Footer */}
        <div className="flex flex-col items-center gap-1 animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <p className="text-center text-muted-foreground/50 text-xs">
            Ao entrar, você concorda com nossos{" "}
            <span className="text-primary/70">Termos de Uso</span>
          </p>
          <p className="text-muted-foreground/30 text-[10px]">{APP_VERSION} · {APP_UPDATED}</p>
        </div>
      </div>

      <style>{`
        .mascot-login { animation: floatLogin 3s ease-in-out infinite; }
        @keyframes floatLogin { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-7px); } }
        #eye-right-login { animation: winkLogin 4.5s ease-in-out infinite; transform-origin: 62.5px 47.5px; }
        @keyframes winkLogin { 0%, 88%, 100% { transform: scaleY(1); } 93% { transform: scaleY(0.08); } }
      `}</style>
    </div>
  );
};

export default Login;
