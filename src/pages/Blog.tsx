import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, User, Zap, TrendingUp } from "lucide-react";

export default function Blog() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const posts = [
    {
      title: "How to Win More Sports Bets in 2025",
      date: "January 15, 2025",
      author: "Sarah Johnson",
      excerpt: "Learn the advanced strategies used by professional bettors to increase their win rate and profitability.",
      gradient: "from-purple-600 to-pink-600"
    },
    {
      title: "The Evolution of Sports Betting Technology",
      date: "January 10, 2025",
      author: "Michael Davis",
      excerpt: "Explore how AI and machine learning are transforming the sports betting landscape and what it means for bettors.",
      gradient: "from-blue-600 to-cyan-600"
    },
    {
      title: "Responsible Gambling: Setting Limits That Work",
      date: "January 5, 2025",
      author: "Alex Chen",
      excerpt: "A comprehensive guide to responsible betting practices and how to maintain a healthy relationship with sports betting.",
      gradient: "from-green-600 to-emerald-600"
    },
    {
      title: "Understanding Odds and Probability",
      date: "December 28, 2024",
      author: "Sarah Johnson",
      excerpt: "Master the fundamentals of odds calculation and how to identify value in sports betting markets.",
      gradient: "from-yellow-600 to-orange-600"
    },
    {
      title: "BetXPesa's 2025 Roadmap Announcement",
      date: "December 20, 2024",
      author: "Alex Chen",
      excerpt: "Exciting new features coming to BetXPesa in 2025, including AI coaching and advanced analytics.",
      gradient: "from-red-600 to-pink-600"
    },
    {
      title: "Live Betting Strategies That Actually Work",
      date: "December 15, 2024",
      author: "Michael Davis",
      excerpt: "Real-time tips and strategies for maximizing profits during live match betting events.",
      gradient: "from-indigo-600 to-purple-600"
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
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Latest Insights</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Blog & Insights
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">
              Latest insights, tips, and updates from the BetXPesa community and experts.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {posts.map((post, index) => (
              <article
                key={index}
                className="group relative cursor-pointer transition-transform hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${post.gradient} opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all duration-500`}></div>
                
                <div className="relative bg-slate-900/50 border border-slate-700/50 group-hover:border-purple-400/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
                  <div className={`h-48 bg-gradient-to-br ${post.gradient} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">{post.title}</h3>
                    <p className="text-gray-300 mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="space-y-2 mb-4 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {post.date}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {post.author}
                      </div>
                    </div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-300">
                      Read More
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              className="border-purple-400 text-purple-400 hover:bg-purple-600/10 px-8 py-3 rounded-xl transition-all duration-300"
            >
              Load More Articles
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
