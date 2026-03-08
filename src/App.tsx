import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Despesas from "./pages/Despesas";
import Pais from "./pages/Pais";
import Graficos from "./pages/Graficos";
import Patrimonio from "./pages/Patrimonio";
import IR from "./pages/IR";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);
  const { session, loading } = useAuth();

  return (
    <div className="w-full sm:max-w-[430px] mx-auto min-h-screen relative bg-background">
      {showSplash && <Splash onFinish={handleSplashFinish} />}
      <Routes>
        <Route path="/" element={!loading && session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/despesas" element={<ProtectedRoute><Despesas /></ProtectedRoute>} />
        <Route path="/pais" element={<ProtectedRoute><Pais /></ProtectedRoute>} />
        <Route path="/graficos" element={<ProtectedRoute><Graficos /></ProtectedRoute>} />
        <Route path="/patrimonio" element={<ProtectedRoute><Patrimonio /></ProtectedRoute>} />
        <Route path="/ir" element={<ProtectedRoute><IR /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
