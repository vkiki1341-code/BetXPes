import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect to betting if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/betting");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    if (!identifier || !password) {
      setError("Please enter email and password.");
      setLoading(false);
      return;
    }

    // Email login only
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });

    if (loginError) {
      setError(loginError.message);
    } else {
      setError("");
      // Login successful - redirect to betting
      navigate("/betting");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background py-8 px-2">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <Button variant="ghost" className="mb-4 self-start" onClick={() => navigate("/")}>← Back to Home</Button>
        <div className="flex flex-col items-center mb-6">
          <div className="text-4xl font-extrabold text-primary mb-1 tracking-tight">Bet<span className="text-accent">XPesa</span></div>
          <div className="text-muted-foreground text-sm">Welcome back! Please login to continue.</div>
        </div>
        <div className="w-full flex flex-col gap-3">
          <Input
            placeholder="Email Address"
            type="email"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            className=""
            autoFocus
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className=""
          />
        </div>
        {error && <div className="text-red-500 mt-2 w-full text-center">{error}</div>}
        <Button onClick={handleLogin} disabled={loading} className="w-full mt-5 mb-2 text-base font-semibold py-2">
          {loading ? "Logging in..." : "Login"}
        </Button>
        <div className="w-full flex items-center gap-2 my-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex flex-col gap-2 w-full text-center">
          <Link to="/signup" className="text-blue-600 hover:underline font-medium">Don't have an account? <span className="underline">Sign Up</span></Link>
          <Link to="/forgot-password" className="text-blue-600 hover:underline font-medium">Forgot Password? <span className="underline">Reset it</span></Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
