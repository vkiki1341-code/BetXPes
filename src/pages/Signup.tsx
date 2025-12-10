import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { saveUserPhoneNumber } from "@/lib/whatsappService";

const Signup = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  useEffect(() => {
    // Get referral code from URL
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
    }
  }, [searchParams]);

  const handleSignup = async () => {
    setLoading(true);
    setError("");
    
    if (!identifier || !password || !phoneNumber) {
      setError("Please enter email, password, and phone number.");
      setLoading(false);
      return;
    }

    try {
      // Email signup only - no email verification required
      const { data, error: signupError } = await supabase.auth.signUp({
        email: identifier,
        password,
        options: {
          emailRedirectTo: undefined,
        },
      });

      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }

      // Create user record in users table with initial balance of 0
      if (data.user?.id) {
        await supabase
          .from("users")
          .insert([{
            id: data.user.id,
            email: identifier,
            balance: 0,
            status: 'active'
          }]);

        // Save phone number and send WhatsApp welcome message
        await saveUserPhoneNumber(data.user.id, phoneNumber, identifier);
      }

      // If referral code is provided, validate and track it
      if (referralCode && data.user?.id) {
        // Find the referrer by code
        const { data: referrerList } = await supabase
          .from("referrals")
          .select("user_id")
          .eq("referral_code", referralCode);

        if (referrerList && referrerList.length > 0) {
          const referrerData = referrerList[0];
          
          // Get current referral data
          const { data: referralData } = await supabase
            .from("referrals")
            .select("referred_count, referral_earnings")
            .eq("user_id", referrerData.user_id)
            .single();
          
          // Add to referral_list and update referrals count/earnings
          await Promise.all([
            supabase.from("referral_list").insert([
              {
                referrer_id: referrerData.user_id,
                referred_user_id: data.user.id,
                referred_user_email: identifier,
                bonus_earned: 500,
                status: "active",
              },
            ]),
            supabase
              .from("referrals")
              .update({
                referred_count: (referralData?.referred_count || 0) + 1,
                referral_earnings: (referralData?.referral_earnings || 0) + 500,
              })
              .eq("user_id", referrerData.user_id),
            supabase
              .from("users")
              .update({
                referral_used_code: referralCode,
                referred_by_user_id: referrerData.user_id,
              })
              .eq("id", data.user.id),
          ]);
        }
      }

      // Auto-login after signup - no email verification needed
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });
      
      if (loginError) {
        setError("Signup successful, but login failed. Please try logging in.");
      } else {
        navigate("/betting");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-background py-0 px-0">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <div className="flex flex-col items-center mb-6 mt-2">
          <div className="text-4xl font-extrabold text-primary mb-1 tracking-tight">Bet<span className="text-accent">XPesa</span></div>
          <div className="text-muted-foreground text-sm">Create your account to get started.</div>
        </div>
        
        {/* Referral Code Display */}
        {referralCode && (
          <div className="w-full p-3 mb-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-600 text-center">
              🎁 Bonus: You'll get KES 500 when you complete your signup!
            </p>
          </div>
        )}

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
          <Input
            placeholder="Phone Number (e.g., +254712345678 or 0712345678)"
            type="tel"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            className=""
          />
        </div>
        {error && <div className="text-red-500 mt-2 w-full text-center text-sm">{error}</div>}
        <Button onClick={handleSignup} disabled={loading} className="w-full mt-5 mb-2 text-base font-semibold py-2">
          {loading ? "Signing up..." : "Sign Up"}
        </Button>
        <div className="w-full flex items-center gap-2 my-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex flex-col gap-2 w-full text-center">
          <Link to="/login" className="text-blue-600 hover:underline font-medium">Already have an account? <span className="underline">Login</span></Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
