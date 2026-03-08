import { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginBg from "@/assets/login-bg.jpg";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
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
        {/* Logo */}
        <div className="text-center pt-16 animate-fade-up">
          <h1 className="text-5xl font-display font-bold text-gradient tracking-tight">
            FeFin
          </h1>
          <p className="text-muted-foreground mt-2 text-sm tracking-wide">
            Suas finanças, seu controle
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
            className="w-full py-3.5 rounded-xl gradient-emerald text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Entrar
          </button>

          <p className="text-center text-muted-foreground text-xs">
            Esqueceu sua senha?{" "}
            <span className="text-primary cursor-pointer hover:underline">
              Recuperar
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
    </div>
  );
};

export default Login;
