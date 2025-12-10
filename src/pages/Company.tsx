import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, BarChart3, Globe, Zap } from "lucide-react";

export default function Company() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const stats = [
    { icon: Users, label: "500K+ Active Users", value: "500K" },
    { icon: BarChart3, label: "$100M+ Annual Volume", value: "$100M" },
    { icon: Globe, label: "40+ Countries", value: "40+" },
    { icon: Zap, label: "99.99% Uptime", value: "99.99%" }
  ];

  const values = [
    "Integrity in all operations",
    "Security and user protection",
    "Innovation and excellence",
    "Responsibility and compliance",
    "Transparency and trust"
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
              <Globe className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">About BetXPesa</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Building the Future
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">
              Transforming the sports betting industry through innovation, integrity, and cutting-edge technology.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="relative group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all duration-500"></div>
                  
                  <div className="relative bg-slate-900/50 border border-slate-700/50 group-hover:border-purple-400/50 rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
                    <Icon className="w-8 h-8 text-purple-400 mx-auto mb-4" />
                    <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                    <p className="text-gray-400">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-20">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Founded in 2023, BetXPesa emerged from a simple idea: sports betting should be fast, fair, and fun. Our team of experienced engineers and betting enthusiasts built a platform that combines cutting-edge technology with user-friendly design.
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                Today, we serve hundreds of thousands of players worldwide, processing millions of bets with 99.99% uptime and zero security breaches.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-10 rounded-2xl blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-purple-400/20 rounded-2xl p-8 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-6">Our Values</h3>
                <ul className="space-y-4">
                  {values.map((value, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-300 group">
                      <span className="text-purple-400 font-bold mt-1">✓</span>
                      <span className="group-hover:text-white transition-colors">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Join Us?</h2>
            <p className="text-gray-300 text-lg mb-8">Be part of the sports betting revolution</p>
            <Button
              onClick={() => navigate("/signup")}
              className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all duration-300"
            >
              Get Started Now
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
