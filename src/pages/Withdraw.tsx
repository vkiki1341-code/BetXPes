import { supabase } from "@/lib/supabaseClient";
import { sendTelegramNotification } from "@/lib/telegramNotifications";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, Wallet, X } from "lucide-react";

interface WithdrawRequest {
  id: string;
  amount: number;
  mpesa: string;
  status: string;
  created_at: string;
}

const Withdraw = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [mpesa, setMpesa] = useState("");
  const [usdtWallet, setUsdtWallet] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"mpesa" | "usdt">("mpesa");
  const [userId, setUserId] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [history, setHistory] = useState<WithdrawRequest[]>([]);
  const [email, setEmail] = useState("");

  const MIN_WITHDRAW = 100;
  const MAX_WITHDRAW = 50000;
  const EXCHANGE_RATE = 130; // 1 USD = 130 KES

  useEffect(() => {
    const fetchUserData = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user?.id) {
        navigate("/login");
        return;
      }

      // Verify user exists in users table (is registered)
      const userRes = await supabase
        .from("users")
        .select("id, email, balance")
        .eq("id", data.user.id)
        .single();

      if (!userRes.data || userRes.error) {
        console.warn("User not registered in system:", data.user.id);
        setError("Your account is not fully registered. Please complete signup.");
        navigate("/signup");
        return;
      }

      setUserId(data.user.id);
      setEmail(data.user.email || "");
      setBalance(userRes.data.balance || 0);

      // Fetch withdrawal history
      const historyRes = await supabase
        .from("withdraw_requests")
        .select("*")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (historyRes.data) {
        setHistory(historyRes.data);
      }
    };

    fetchUserData();
    
    // Set up polling to refresh balance every 3 seconds
    const interval = setInterval(() => {
      fetchUserData();
    }, 3000);

    return () => clearInterval(interval);
  }, [navigate]);

  const validateInputs = () => {
    setError("");
    setInsufficientBalance(false);
    const numAmount = Number(amount);

    if (!amount || isNaN(numAmount)) {
      setError("Please enter a valid amount");
      return false;
    }

    if (numAmount < MIN_WITHDRAW) {
      setError(`Minimum withdrawal is KES ${MIN_WITHDRAW}`);
      return false;
    }

    if (numAmount > MAX_WITHDRAW) {
      setError(`Maximum withdrawal is KES ${MAX_WITHDRAW}`);
      return false;
    }

    if (numAmount > balance) {
      setInsufficientBalance(true);
      return false;
    }

    if (withdrawMethod === "mpesa") {
      if (!mpesa || mpesa.length < 10) {
        setError("Please enter a valid M-Pesa number");
        return false;
      }
    } else if (withdrawMethod === "usdt") {
      if (!usdtWallet || usdtWallet.length < 30) {
        setError("Please enter a valid USDT TRC20 wallet address");
        return false;
      }
    }

    return true;
  };

  const handleWithdraw = async () => {
    if (!validateInputs() || !userId) return;

    setLoading(true);
    setError("");

    try {
      const withdrawData: any = {
        user_id: userId,
        amount: Number(amount),
        payment_method: withdrawMethod,
        status: "pending",
      };

      if (withdrawMethod === "mpesa") {
        withdrawData.mpesa = mpesa;
      } else if (withdrawMethod === "usdt") {
        withdrawData.usdt_wallet = usdtWallet;
      }

      const res = await supabase
        .from("withdraw_requests")
        .insert([withdrawData]);

      if (res.error) {
        setError("Withdrawal request failed: " + res.error.message);
      } else {
        setWithdrawAmount(Number(amount));
        setShowSuccessModal(true);
        setAmount("");
        setMpesa("");
        setUsdtWallet("");

        // Send Telegram notification
        await sendTelegramNotification('withdraw', {
          userEmail: email,
          amount: Number(amount),
          mpesa: withdrawMethod === "mpesa" ? mpesa : `USDT: ${usdtWallet}`,
          status: 'pending',
        });

        // Refresh history
        const historyRes = await supabase
          .from("withdraw_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (historyRes.data) {
          setHistory(historyRes.data);
        }

        // Auto close modal after 8 seconds
        setTimeout(() => setShowSuccessModal(false), 8000);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-KE", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      {/* Insufficient Balance Modal */}
      {insufficientBalance && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-800 border-0 shadow-2xl">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <button
                  onClick={() => setInsufficientBalance(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Insufficient Balance
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                You don't have enough funds to complete this withdrawal.
              </p>

              {/* Balance Info */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-lg p-4 mb-6 border border-red-200 dark:border-red-800">
                <div className="mb-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Available Balance</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    KES {balance.toLocaleString()}
                  </p>
                </div>
                <div className="pt-3 border-t border-red-200 dark:border-red-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Requested Amount</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    KES {Number(amount || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Info Cards */}
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Shortfall</p>
                    <p className="text-slate-600 dark:text-slate-400">
                      You need KES {Math.max(0, Number(amount || 0) - balance).toLocaleString()} more
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Add Funds</p>
                    <p className="text-slate-600 dark:text-slate-400">Deposit to your account to proceed</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate("/deposit")}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  Go to Deposit
                </Button>
                <Button
                  onClick={() => setInsufficientBalance(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-800 border-0 shadow-2xl">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Withdrawal Submitted!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your withdrawal request has been submitted successfully.
              </p>

              {/* Amount Display */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Amount</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  KES {withdrawAmount.toLocaleString()}
                </p>
              </div>

              {/* Status Info */}
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Processing</p>
                    <p className="text-slate-600 dark:text-slate-400">Your withdrawal is being processed</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Quick Transfer</p>
                    <p className="text-slate-600 dark:text-slate-400">Funds will arrive in 1-5 minutes</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Secure Transaction</p>
                    <p className="text-slate-600 dark:text-slate-400">Encrypted and secured by M-Pesa</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue
                </Button>
                <Button
                  onClick={() => navigate("/betting")}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Account
                </Button>
              </div>

              {/* Footer Note */}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
                This modal will close automatically in 8 seconds
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/betting")}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Withdraw Funds</h1>
            <p className="text-sm text-slate-600">{email}</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-2">Available Balance</p>
                  <p className="text-3xl md:text-4xl font-bold">KES {balance.toLocaleString()}</p>
                </div>
                <Wallet className="w-12 h-12 opacity-20" />
              </div>
              {/* Exchange Rate Info */}
              <div className="bg-blue-400/30 rounded-lg p-3 border border-blue-300">
                <p className="text-sm text-blue-50">💱 <strong>Exchange Rate:</strong> 1 USD = KES 130</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Method Selector */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setWithdrawMethod("mpesa")}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              withdrawMethod === "mpesa"
                ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            📱 M-Pesa
          </button>
          <button
            onClick={() => setWithdrawMethod("usdt")}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              withdrawMethod === "usdt"
                ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            💳 USDT TRC20
          </button>
        </div>

        {/* Main Form */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg text-black">Withdraw Funds</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Amount (KES)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  KES
                </span>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    setError("");
                  }}
                  min={MIN_WITHDRAW}
                  max={MAX_WITHDRAW}
                  className="pl-12 text-lg"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Min: KES {MIN_WITHDRAW} • Max: KES {MAX_WITHDRAW}
              </p>
            </div>

            {/* M-Pesa Section */}
            {withdrawMethod === "mpesa" && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  M-Pesa Number
                </label>
                <Input
                  type="tel"
                  placeholder="254712345678 or 0712345678"
                  value={mpesa}
                  onChange={e => {
                    setMpesa(e.target.value);
                    setError("");
                  }}
                  maxLength={13}
                  className="text-lg"
                />
              </div>
            )}

            {/* USDT TRC20 Section */}
            {withdrawMethod === "usdt" && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  USDT TRC20 Wallet Address
                </label>
                <Input
                  type="text"
                  placeholder="Enter your USDT TRC20 wallet address (starts with T...)"
                  value={usdtWallet}
                  onChange={e => {
                    setUsdtWallet(e.target.value);
                    setError("");
                  }}
                  className="text-lg font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Minimum withdrawal: 10 USDT (~KES 1,300)
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {/* Withdraw Button */}
            <Button
              onClick={handleWithdraw}
              disabled={!amount || !mpesa || loading}
              className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Confirm Withdrawal"}
            </Button>

            {/* Info Box */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-slate-600">
                <span className="font-semibold">Processing Time:</span> Withdrawals are processed
                within 1-5 minutes. You'll receive an M-Pesa prompt on your phone.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        {history.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg">Recent Withdrawals</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {history.map(request => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <p className="font-semibold text-slate-900">
                          KES {request.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">{request.mpesa}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-600 capitalize">
                        {request.status}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(request.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Withdraw;
