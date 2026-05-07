import { lazy, Suspense, useCallback, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Despesas from "./pages/Despesas";
import Pais from "./pages/Pais";
import Conta from "./pages/Conta";
import NotFound from "./pages/NotFound";

const Graficos = lazy(() => import("./pages/Graficos"));
const Patrimonio = lazy(() => import("./pages/Patrimonio"));
const IR = lazy(() => import("./pages/IR"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #EDE8FF 100%)" }}>
    <img
      src="/fina-mascot.png"
      alt="Fina"
      width={96}
      height={96}
      className="drop-shadow"
      decoding="async"
    />
    <p className="text-sm font-semibold text-white">Carregando Fina...</p>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);
  const { session, loading } = useAuth();

  return (
    <div className="w-full sm:max-w-[430px] md:max-w-none mx-auto min-h-screen relative bg-background overflow-x-hidden">
      {showSplash && <Splash onFinish={handleSplashFinish} />}
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={!loading && session ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/cadastro" element={!loading && session ? <Navigate to="/dashboard" replace /> : <SignUp />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/despesas" element={<ProtectedRoute><Despesas /></ProtectedRoute>} />
          <Route path="/pais" element={<ProtectedRoute><Pais /></ProtectedRoute>} />
          <Route path="/graficos" element={<ProtectedRoute><Graficos /></ProtectedRoute>} />
          <Route path="/patrimonio" element={<ProtectedRoute><Patrimonio /></ProtectedRoute>} />
          <Route path="/ir" element={<ProtectedRoute><IR /></ProtectedRoute>} />
          <Route path="/conta" element={<ProtectedRoute><Conta /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
