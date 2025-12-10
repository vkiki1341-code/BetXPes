import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { ThemeProvider } from "@/context/ThemeContext";
import { InstallPrompt } from "@/components/InstallPrompt";
import { setupGlobalTimeSystem } from "@/lib/globalTimeIntegration";
import { switchToGlobalTimeSystem } from "@/lib/bettingSystemInitializer";
import BetXPesa from "./pages/SharedTimeframesBetting";
import Admin from "./pages/Admin";
import Results from "./pages/Results";
import Promos from "./pages/Promos";
import MyBets from "./pages/MyBets";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import History from "./pages/History";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Referral from "./pages/Referral";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import Product from "./pages/Product";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import Security from "./pages/Security";
import Company from "./pages/Company";
import About from "./pages/About";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import ReferralDashboard from "./pages/ReferralDashboard";
import AdminPanel from "./pages/AdminPanel";
import UserAnalytics from "./pages/UserAnalytics";
import AdvancedSearch from "./pages/AdvancedSearch";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // Initialize global time-based match system FIRST
    // This ensures we use global time, not the old week-based system
    setupGlobalTimeSystem();
    switchToGlobalTimeSystem(); // Force switch away from week-based system

    // Initialize auth state from stored session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthInitialized(true);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthInitialized(true);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Handle session changes
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          // Session state updated
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Landing Page Route */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Public Info Pages */}
            <Route path="/product" element={<Product />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/security" element={<Security />} />
            <Route path="/company" element={<Company />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            
            {/* Public Routes - No Authentication Required */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes - Authentication Required */}
            <Route
              path="/betting"
              element={
                <ProtectedRoute>
                  <BetXPesa />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results"
              element={
                <ProtectedRoute>
                  <Results />
                </ProtectedRoute>
              }
            />
            <Route
              path="/promos"
              element={
                <ProtectedRoute>
                  <Promos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mybets"
              element={
                <ProtectedRoute>
                  <MyBets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deposit"
              element={
                <ProtectedRoute>
                  <Deposit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/withdraw"
              element={
                <ProtectedRoute>
                  <Withdraw />
                </ProtectedRoute>
              }
            />
            <Route
              path="/referral"
              element={
                <ProtectedRoute>
                  <Referral />
                </ProtectedRoute>
              }
            />
            <Route
              path="/referral-dashboard"
              element={
                <ProtectedRoute>
                  <ReferralDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-panel"
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user-analytics"
              element={
                <ProtectedRoute>
                  <UserAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advanced-search"
              element={
                <ProtectedRoute>
                  <AdvancedSearch />
                </ProtectedRoute>
              }
            />

            {/* Catch-all Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  );
};

export default App;
