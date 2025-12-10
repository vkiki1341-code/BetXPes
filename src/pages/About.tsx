import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";

export default function About() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const team = [
    { name: "Alex Cliff", role: "CEO & Co-founder", bio: "10+ years in fintech" },
    { name: "Sarah Johnson", role: "CTO & Co-founder", bio: "Ex-engineer at leading tech companies" },
    { name: "Michael Davis", role: "COO", bio: "Former sports analyst and operations expert" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900/20 to-slate-950 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
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
              <span className="text-xs sm:text-sm text-purple-300">Our Team</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 text-white leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                About BetXPesa
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl leading-relaxed px-2 sm:px-0">
              Meet the team transforming sports betting through innovation and dedication.
            </p>
          </div>

          <div className="space-y-8 sm:space-y-12 lg:space-y-16 mb-12 sm:mb-20">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-10 rounded-2xl blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-purple-400/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Our Story</h2>
                <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                  Founded in 2023, BetXPesa emerged from a simple idea: sports betting should be fast, fair, and fun. Our team of experienced engineers and betting enthusiasts built a platform that combines cutting-edge technology with user-friendly design to create the next generation of sports betting.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 opacity-10 rounded-2xl blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-blue-400/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Our Mission</h2>
                <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                  To provide the safest, fastest, and most enjoyable sports betting platform in the world. We believe in responsible gambling and are committed to protecting our users while empowering them to make smarter bets.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8 sm:mb-12">Leadership Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-20">
            {team.map((member, index) => (
              <div
                key={index}
                className="group relative"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all duration-500"></div>
                
                <div className="relative bg-slate-900/50 border border-slate-700/50 group-hover:border-purple-400/50 rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl mb-4 sm:mb-6 flex items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-bold text-white">{member.name.charAt(0)}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1">{member.name}</h3>
                  <p className="text-purple-400 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">{member.role}</p>
                  <p className="text-gray-400 text-sm sm:text-base">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-10 rounded-3xl blur-2xl"></div>
            <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-green-400/20 rounded-3xl p-6 sm:p-8 lg:p-12 backdrop-blur-sm text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Join Our Mission</h2>
              <p className="text-gray-300 text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
                We're always looking for talented individuals who believe in our vision. Check out our careers page to see open positions.
              </p>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base">
                Explore Careers
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
      `}</style>
    </div>
  );
}
