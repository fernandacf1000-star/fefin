import { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginBg from "@/assets/login-bg.jpg";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REMEMBER_KEY = "fefin_remember";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const saved = (() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const [email, setEmail] = useState(saved?.email ?? "");
  const [password, setPassword] = useState(saved?.password ?? "");
  const [rememberMe, setRememberMe] = useState(!!saved);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }));
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={loginBg}
          alt="FeFin background"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-between px-6 py-12 max-w-md mx-auto w-full">
        {/* Mascot + Logo */}
        <div className="text-center pt-16 animate-fade-up flex flex-col items-center">
          <div className="mascot-login">
            <svg width="90" height="113" viewBox="0 0 100 130" fill="none">
              <ellipse cx="50" cy="42" rx="34" ry="36" fill="#2C1810"/>
              <path d="M74 45 Q88 55 85 80 Q82 95 75 100 Q80 80 76 65 Q74 55 74 45Z" fill="#2C1810"/>
              <path d="M26 45 Q12 58 15 82 Q18 96 24 100 Q20 80 24 65 Q26 55 26 45Z" fill="#2C1810"/>
              <ellipse cx="50" cy="50" rx="28" ry="30" fill="#FDDBB4"/>
              <ellipse cx="50" cy="18" rx="16" ry="10" fill="#2C1810"/>
              <path d="M32 40 Q39 36 44 39" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <path d="M56 39 Q61 36 68 40" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <ellipse cx="38" cy="47" rx="5" ry="5.5" fill="white"/>
              <ellipse cx="62" cy="47" rx="5" ry="5.5" fill="white"/>
              <ellipse cx="38.5" cy="47.5" rx="3.5" ry="4" fill="#3D2314"/>
              <ellipse id="eye-right-login" cx="62.5" cy="47.5" rx="3.5" ry="4" fill="#3D2314"/>
              <circle cx="40" cy="46" r="1.2" fill="white"/>
              <circle cx="64" cy="46" r="1.2" fill="white"/>
              <path d="M38 63 Q50 72 62 63" stroke="#C68642" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <ellipse cx="30" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
              <ellipse cx="70" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
              <circle cx="22" cy="56" r="4" fill="#F7D070"/>
              <circle cx="78" cy="56" r="4" fill="#F7D070"/>
              <path d="M22 92 Q20 115 22 130 L78 130 Q80 115 78 92 Q70 82 50 82 Q30 82 22 92Z" fill="#10B981"/>
              <circle cx="76" cy="95" r="10" fill="#F7D070" stroke="#E8B800" strokeWidth="1.5"/>
              <text x="76" y="99" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#B8860B">$</text>
              <ellipse cx="24" cy="100" rx="7" ry="5" fill="#FDDBB4"/>
            </svg>
          </div>
          <h1 className="text-[38px] font-bold mt-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            <span className="text-white">Fe</span>
            <span style={{ color: "#10B981" }}>Fin</span>
          </h1>
          <p className="mt-1.5 uppercase" style={{ color: "#475569", fontSize: 11, letterSpacing: 2 }}>
            Minhas finanças, minhas regras
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleLogin}
          className="space-y-5 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3.5 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Senha
            </label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl gradient-emerald text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Carregando..." : isSignUp ? "Criar Conta" : "Entrar"}
          </button>

          <p className="text-center text-muted-foreground text-xs">
            {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
            <span
              className="text-primary cursor-pointer hover:underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Entrar" : "Criar conta"}
            </span>
          </p>
        </form>

        {/* Footer */}
        <p
          className="text-center text-muted-foreground/50 text-xs animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          Ao entrar, você concorda com nossos{" "}
          <span className="text-primary/70">Termos de Uso</span>
        </p>
      </div>

      <style>{`
        .mascot-login {
          animation: floatLogin 3s ease-in-out infinite;
        }
        @keyframes floatLogin {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        #eye-right-login {
          animation: winkLogin 4.5s ease-in-out infinite;
          transform-origin: 62.5px 47.5px;
        }
        @keyframes winkLogin {
          0%, 88%, 100% { transform: scaleY(1); }
          93% { transform: scaleY(0.08); }
        }
      `}</style>
    </div>
  );
};

export default Login;
