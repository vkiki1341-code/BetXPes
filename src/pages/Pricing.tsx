import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Zap } from "lucide-react";

export default function Pricing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const plans = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for casual bettors",
      features: ["Basic betting features", "5 bets per day", "Standard odds", "Community access"],
      cta: "Get Started"
    },
    {
      name: "Pro",
      price: "Custom",
      period: "/month",
      description: "For serious bettors",
      features: ["Everything in Starter", "Unlimited bets", "Premium odds", "Advanced statistics", "Priority support", "AI predictions"],
      cta: "Start Free Trial",
      highlighted: true
    },
    {
      name: "Elite",
      price: "Custom",
      period: "/month",
      description: "Maximum advantage",
      features: ["Everything in Pro", "Personal betting coach", "Custom algorithms", "Private community", "Exclusive events", "API access"],
      cta: "Contact Sales"
    }
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
              <span className="text-xs sm:text-sm text-purple-300">Flexible Plans</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 text-white leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Flexible Pricing
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl leading-relaxed px-2 sm:px-0">
              Choose the plan that fits your betting style. Pricing in KES (Kenyan Shilling). Contact us for custom enterprise plans.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`group relative transition-transform hover:scale-105 ${
                  plan.highlighted ? "sm:scale-105" : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-20 rounded-3xl blur-2xl"></div>
                )}
                
                <div
                  className={`relative rounded-3xl p-6 sm:p-8 backdrop-blur-sm transition-all duration-300 h-full ${
                    plan.highlighted
                      ? "bg-gradient-to-br from-slate-900/80 to-slate-900/40 border-2 border-purple-400/50 shadow-2xl shadow-purple-500/30"
                      : "bg-slate-900/50 border border-slate-700/50 hover:border-purple-400/30"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="mb-3 sm:mb-4 inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">{plan.name}</h3>
                  <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6 min-h-[24px]">{plan.description}</p>
                  <div className="mb-6 sm:mb-8">
                    <span className="text-4xl sm:text-5xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-gray-400 text-sm sm:text-lg">{plan.period}</span>}
                  </div>
                  <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 sm:gap-3 text-gray-300 text-sm sm:text-base">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full py-2 sm:py-3 font-semibold transition-all duration-300 rounded-xl text-sm sm:text-base ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/50"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-sm sm:text-base text-gray-400 px-2">All plans include 24/7 support, SSL security, instant withdrawals, and are available in KES</p>
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
