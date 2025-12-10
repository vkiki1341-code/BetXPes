import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, BarChart3, Lock, TrendingUp, Shield, Smartphone } from "lucide-react";

export default function Product() {
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
    { icon: Zap, title: "Lightning Fast", desc: "Bet placement in milliseconds with atomic transaction guarantees", color: "from-purple-600 to-pink-600" },
    { icon: BarChart3, title: "Smart Analytics", desc: "AI-powered insights to help you make smarter betting decisions", color: "from-blue-600 to-cyan-600" },
    { icon: Lock, title: "Bank-Level Security", desc: "Your funds protected with enterprise-grade encryption", color: "from-green-600 to-emerald-600" }
  ];

  const coreFeatures = [
    { icon: TrendingUp, text: "Real-time match tracking" },
    { icon: Smartphone, text: "Live odds updates" },
    { icon: Shield, text: "Multi-league support" },
    { icon: Zap, text: "Instant payouts" },
    { icon: BarChart3, text: "Flexible betting options" },
    { icon: Lock, text: "Secure transactions" }
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-12 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>

          <div className={`mb-20 transform transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30 mb-6">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Next Generation Platform</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Next-Level Betting
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">
              Experience the future of sports betting with cutting-edge technology, real-time analytics, and intuitive design that puts you in control.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all duration-500`}></div>
                  
                  <div className="relative bg-slate-900/50 border border-slate-700/50 group-hover:border-purple-400/50 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} p-0.5 mb-6`}>
                      <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative mb-20">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-10 rounded-3xl blur-2xl"></div>
            <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-purple-400/20 rounded-3xl p-12 backdrop-blur-sm">
              <h2 className="text-4xl font-bold text-white mb-12">Platform Features</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coreFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-center gap-4 group">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <p className="text-gray-300 group-hover:text-white transition-colors">{feature.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => navigate("/signup")}
              className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all duration-300 group"
            >
              Experience BetXPesa Now
              <Zap className="ml-2 w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </Button>
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
