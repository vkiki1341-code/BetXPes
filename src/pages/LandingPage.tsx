import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { ArrowRight, Zap, TrendingUp, Users, Shield, Smartphone, Clock } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsVisible(true);
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const handleGetStarted = () => {
    navigate("/signup");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Gradient orbs */}
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
          style={{ transform: `translate(${mousePosition.x * 0.01}px, ${scrollY * 0.5}px)` }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"
          style={{ transform: `translate(${mousePosition.x * -0.01}px, ${scrollY * 0.3}px)` }}
        ></div>
        <div
          className="absolute -bottom-8 right-1/3 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"
          style={{ transform: `translate(${mousePosition.x * 0.015}px, ${scrollY * 0.2}px)` }}
        ></div>

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation Bar */}
        <nav className={`fixed top-0 w-full bg-gradient-to-b from-slate-900/80 to-transparent backdrop-blur-md z-50 transition-all duration-300 ${scrollY > 50 ? "shadow-lg" : ""}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-sm sm:text-lg">
                ⚽
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                BetXPesa
              </span>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={handleLogin}
                className="hidden sm:flex border-purple-400/50 text-purple-400 hover:bg-purple-500/10 text-sm"
              >
                Login
              </Button>
              <Button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs sm:text-sm"
              >
                Get Started
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 pt-24 sm:pt-20">
          {/* Floating elements - hidden on very small screens */}
          <div className="hidden sm:block absolute top-1/4 left-5 sm:left-10 w-12 h-12 sm:w-20 sm:h-20 border-2 border-purple-500/30 rounded-lg animate-float opacity-30"></div>
          <div className="hidden sm:block absolute bottom-1/4 right-5 sm:right-10 w-10 h-10 sm:w-16 sm:h-16 border-2 border-pink-500/30 rounded-full animate-float opacity-30" style={{ animationDelay: "1s" }}></div>

          <div className={`text-center max-w-4xl mx-auto transform transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            {/* Navigation Links */}
            <nav className="hidden md:flex flex-wrap gap-4 lg:gap-6 text-xs sm:text-sm justify-center mb-8">
              <button onClick={() => navigate("/product")} className="text-gray-300 hover:text-purple-400 transition-colors whitespace-nowrap">Product</button>
              <button onClick={() => navigate("/features")} className="text-gray-300 hover:text-purple-400 transition-colors whitespace-nowrap">Features</button>
              <button onClick={() => navigate("/pricing")} className="text-gray-300 hover:text-purple-400 transition-colors whitespace-nowrap">Pricing</button>
              <button onClick={() => navigate("/security")} className="text-gray-300 hover:text-purple-400 transition-colors whitespace-nowrap">Security</button>
              <button onClick={() => navigate("/company")} className="text-gray-300 hover:text-purple-400 transition-colors whitespace-nowrap">Company</button>
              <button onClick={() => navigate("/about")} className="text-gray-300 hover:text-purple-400 transition-colors whitespace-nowrap">About</button>
              <button onClick={() => navigate("/blog")} className="text-gray-300 hover:text-purple-400 transition-colors whitespace-nowrap">Blog</button>
              <button onClick={() => navigate("/contact")} className="text-gray-300 hover:text-purple-400 transition-colors whitespace-nowrap">Contact</button>
            </nav>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-purple-500/20 border border-purple-400/30 mb-4 sm:mb-6 animate-pulse text-xs sm:text-sm">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
              <span className="text-purple-300">BetXPesa Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Experience
              </span>
              <br />
              <span className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                Football Betting
              </span>
              <br className="hidden sm:block" />
              <span className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                Like Never Before
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
              Real-time odds, atomic bet placement, instant resolution. Join thousands of players enjoying the future of sports betting.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12">
              <Button
                onClick={handleGetStarted}
                className="px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg group"
              >
                Start Betting Now
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                onClick={handleLogin}
                className="px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-lg border-2 border-purple-400/50 text-purple-400 hover:bg-purple-500/10"
              >
                Already have an account?
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-400 px-2">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                <span className="whitespace-nowrap">10K+ Active Players</span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-gray-600"></div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
                <span className="whitespace-nowrap">₭500M+ Wagered</span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-gray-600"></div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                <span className="whitespace-nowrap">99.8% Success Rate</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-3 sm:mb-4">
              Why Choose <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">BetXPesa</span>?
            </h2>
            <p className="text-gray-400 text-center mb-12 sm:mb-16 max-w-2xl mx-auto text-sm sm:text-base px-2">
              Advanced technology meets user-friendly design for the ultimate betting experience
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Feature 1 */}
              <div className="group p-6 sm:p-8 rounded-xl bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/20 hover:border-purple-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Lightning Fast</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  Place bets in milliseconds with our atomic transaction system. No delays, no failures.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group p-6 sm:p-8 rounded-xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 hover:border-blue-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Real-Time Odds</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  Live odds updates across all matches. Always get the best betting opportunities.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group p-6 sm:p-8 rounded-xl bg-gradient-to-br from-pink-900/20 to-blue-900/20 border border-pink-500/20 hover:border-pink-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-500 to-blue-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Secure & Fair</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  Bank-level security with transparent odds. Your funds are always protected.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group p-6 sm:p-8 rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 hover:border-purple-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Instant Payouts</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  Win and get paid immediately. No waiting, no hassle. Withdrawals in minutes.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group p-6 sm:p-8 rounded-xl bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-500/20 hover:border-pink-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Community</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  Join a vibrant community of bettors. Share tips, compete, and earn rewards.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="group p-6 sm:p-8 rounded-xl bg-gradient-to-br from-blue-900/20 to-pink-900/20 border border-blue-500/20 hover:border-blue-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-pink-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Mobile Ready</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  Bet anywhere, anytime. Perfect experience on all devices.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="p-8 rounded-xl bg-gradient-to-br from-purple-900/30 to-transparent border border-purple-500/20 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  10K+
                </div>
                <p className="text-gray-400">Active Players</p>
              </div>
              <div className="p-8 rounded-xl bg-gradient-to-br from-blue-900/30 to-transparent border border-blue-500/20 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  ₭500M
                </div>
                <p className="text-gray-400">Total Wagered</p>
              </div>
              <div className="p-8 rounded-xl bg-gradient-to-br from-pink-900/30 to-transparent border border-pink-500/20 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  99.8%
                </div>
                <p className="text-gray-400">Success Rate</p>
              </div>
              <div className="p-8 rounded-xl bg-gradient-to-br from-green-900/30 to-transparent border border-green-500/20 text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  24/7
                </div>
                <p className="text-gray-400">Support Available</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative p-12 rounded-2xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 overflow-hidden">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative z-10 text-center">
                <h2 className="text-4xl font-bold mb-4">
                  Ready to Win Big?
                </h2>
                <p className="text-gray-300 mb-8 text-lg max-w-2xl mx-auto">
                  Join thousands of successful bettors. Sign up today and get exclusive welcome bonuses.
                </p>
                <Button
                  onClick={handleGetStarted}
                  className="px-10 py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg"
                >
                  Start Your Journey Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-purple-500/20 py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold">
                    ⚽
                  </div>
                  <span className="font-bold">BetXPesa</span>
                </div>
                <p className="text-gray-400 text-sm">The future of sports betting is here.</p>
              </div>
              <div>
                <h4 className="font-bold mb-4">Product</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li onClick={() => navigate("/features")} className="hover:text-purple-400 cursor-pointer">Features</li>
                  <li onClick={() => navigate("/pricing")} className="hover:text-purple-400 cursor-pointer">Pricing</li>
                  <li onClick={() => navigate("/security")} className="hover:text-purple-400 cursor-pointer">Security</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Company</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li onClick={() => navigate("/about")} className="hover:text-purple-400 cursor-pointer">About</li>
                  <li onClick={() => navigate("/blog")} className="hover:text-purple-400 cursor-pointer">Blog</li>
                  <li onClick={() => navigate("/contact")} className="hover:text-purple-400 cursor-pointer">Contact</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Legal</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li onClick={() => navigate("/terms")} className="hover:text-purple-400 cursor-pointer">Terms</li>
                  <li onClick={() => navigate("/privacy")} className="hover:text-purple-400 cursor-pointer">Privacy</li>
                  <li onClick={() => navigate("/cookies")} className="hover:text-purple-400 cursor-pointer">Cookies</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-8 text-center text-gray-400 text-sm">
              <p>&copy; 2025 BetXPesa. All rights reserved. Play responsibly.</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
