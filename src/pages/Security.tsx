import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Zap, Eye, Shield, CheckCircle } from "lucide-react";

export default function Security() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const securityFeatures = [
    { icon: Lock, title: "AES-256 Encryption", desc: "Military-grade encryption for all data transmission and storage", color: "from-purple-600 to-pink-600" },
    { icon: Shield, title: "Atomic Transactions", desc: "All bets are placed atomically - either fully succeed or fully fail", color: "from-blue-600 to-cyan-600" },
    { icon: Eye, title: "Audit Logging", desc: "Complete audit trail of all transactions for accountability", color: "from-green-600 to-emerald-600" },
    { icon: Zap, title: "Real-Time Monitoring", desc: "24/7 monitoring for suspicious activity and fraud prevention", color: "from-yellow-600 to-orange-600" }
  ];

  const standards = [
    "ISO 27001 Certified",
    "GDPR Compliant",
    "Regular Security Audits",
    "PCI DSS Compliance",
    "Two-Factor Authentication",
    "Cold Wallet Storage"
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
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Enterprise Security</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Security First
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">
              Your funds and data are protected with enterprise-grade security measures and industry compliance standards.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {securityFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
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

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-10 rounded-3xl blur-2xl"></div>
            <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-purple-400/20 rounded-3xl p-12 backdrop-blur-sm">
              <h2 className="text-4xl font-bold text-white mb-8">Compliance & Certifications</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {standards.map((standard, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-gray-300 group-hover:text-white transition-colors">{standard}</span>
                  </div>
                ))}
              </div>
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
