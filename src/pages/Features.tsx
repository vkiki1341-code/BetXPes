import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, TrendingUp, Users, Target, Smartphone, Gauge } from "lucide-react";

export default function Features() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    { icon: Zap, title: "Lightning Fast Betting", desc: "Place bets in milliseconds with our optimized platform", color: "from-purple-600 to-pink-600" },
    { icon: TrendingUp, title: "Live Statistics", desc: "Real-time match statistics and odds updates", color: "from-blue-600 to-cyan-600" },
    { icon: Users, title: "Multi-League Support", desc: "Bet on multiple leagues and tournaments worldwide", color: "from-green-600 to-emerald-600" },
    { icon: Target, title: "Smart Predictions", desc: "AI-powered betting recommendations and insights", color: "from-yellow-600 to-orange-600" },
    { icon: Smartphone, title: "Instant Payouts", desc: "Withdraw winnings instantly to your account", color: "from-pink-600 to-rose-600" },
    { icon: Gauge, title: "Social Features", desc: "Share picks and compete with other bettors", color: "from-indigo-600 to-purple-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900/20 to-slate-950 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        ></div>
      </div>

      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8 sm:mb-12 transition-colors group text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>

          <div className={`mb-12 sm:mb-20 transform transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-purple-500/20 border border-purple-400/30 mb-4 sm:mb-6">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
              <span className="text-xs sm:text-sm text-purple-300">Comprehensive Platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 text-white leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl leading-relaxed px-2 sm:px-0">
              Everything you need to make smarter bets and maximize your winnings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-20">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all duration-500`}></div>
                  
                  <div className="relative bg-slate-900/50 border border-slate-700/50 group-hover:border-purple-400/50 rounded-2xl p-4 sm:p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 h-full">
                    <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-r ${feature.color} p-0.5 mb-3 sm:mb-6`}>
                      <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                        <Icon className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">{feature.title}</h3>
                    <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-10 rounded-3xl blur-2xl"></div>
            <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-purple-400/20 rounded-3xl p-6 sm:p-8 lg:p-12 backdrop-blur-sm">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-8">Coming Soon</h2>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8 px-2 sm:px-0">
                We're constantly innovating and adding new features to enhance your betting experience. Advanced AI coaching, predictive analytics, and social betting features are in development.
              </p>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base">
                Get Notified
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
