import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to betting if already logged in
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/betting");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleResetPassword = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message || "Failed to send reset email. Please try again.");
    } else {
      setSuccess("Password reset email sent! Check your inbox for instructions.");
      setEmail("");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background py-8 px-2">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <Button variant="ghost" className="mb-4 self-start" onClick={() => navigate("/login")}>← Back to Login</Button>
        <div className="flex flex-col items-center mb-6">
          <div className="text-4xl font-extrabold text-primary mb-1 tracking-tight">Match<span className="text-accent">day</span></div>
          <div className="text-muted-foreground text-sm">Reset your password</div>
        </div>
        <div className="w-full flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Email Address</label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className=""
              autoFocus
              disabled={loading}
            />
          </div>
        </div>
        {error && <div className="text-red-500 mt-2 w-full text-center text-sm">{error}</div>}
        {success && <div className="text-green-600 mt-2 w-full text-center text-sm">{success}</div>}
        <Button onClick={handleResetPassword} disabled={loading || !email} className="w-full mt-5 mb-2 text-base font-semibold py-2">
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
        <div className="w-full flex items-center gap-2 my-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex flex-col gap-2 w-full text-center">
          <Link to="/login" className="text-blue-600 hover:underline font-medium">Back to <span className="underline">Login</span></Link>
          <Link to="/signup" className="text-blue-600 hover:underline font-medium">Create a new <span className="underline">Account</span></Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
