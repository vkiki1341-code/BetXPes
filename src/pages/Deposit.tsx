import { supabase } from "@/lib/supabaseClient";
import { sendTelegramNotification } from "@/lib/telegramNotifications";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, Wallet, X } from "lucide-react";

interface DepositRequest {
  id: string;
  amount: number;
  mpesa: string;
  status: string;
  created_at: string;
}

const Deposit = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [mpesa, setMpesa] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [history, setHistory] = useState<DepositRequest[]>([]);
  const [email, setEmail] = useState("");

  const MIN_DEPOSIT = 50;
  const MAX_DEPOSIT = 100000;

  // Function to refresh balance and deposit history
  const refreshUserData = async (userIdToUse?: string) => {
    try {
      let idToUse = userIdToUse;
      
      // If no userIdToUse provided, get current user
      if (!idToUse) {
        const { data } = await supabase.auth.getUser();
        idToUse = data?.user?.id;
      }
      
      if (!idToUse) return;

      // Fetch updated balance
      const balanceRes = await supabase
        .from("users")
        .select("balance")
        .eq("id", idToUse);

      if (balanceRes.data && balanceRes.data.length > 0) {
        setBalance(balanceRes.data[0].balance);
        console.log("Balance updated:", balanceRes.data[0].balance);
      } else if (balanceRes.error) {
        console.error("Error fetching balance:", balanceRes.error);
      } else {
        // User doesn't exist in users table - unregistered user
        console.warn("User not found in users table:", idToUse);
        setError("User account not found. Please complete your registration.");
        navigate("/signup");
        return;
      }

      // Fetch updated deposit history
      const historyRes = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", idToUse)
        .order("created_at", { ascending: false })
        .limit(5);

      if (historyRes.data) {
        setHistory(historyRes.data);
      } else if (historyRes.error) {
        console.error("Error fetching history:", historyRes.error);
      }
    } catch (error) {
      console.error("Refresh error:", error);
    }
  };

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
      await refreshUserData(data.user.id);
    };

    fetchUserData();
    
    // Set up polling to refresh data every 5 seconds
    const interval = setInterval(() => {
      refreshUserData();
    }, 5000);

    return () => clearInterval(interval);
  }, [navigate]);

  const validateInputs = () => {
    setError("");
    const numAmount = Number(amount);

    if (!amount || isNaN(numAmount)) {
      setError("Please enter a valid amount");
      return false;
    }

    if (numAmount < MIN_DEPOSIT) {
      setError(`Minimum deposit is KES ${MIN_DEPOSIT}`);
      return false;
    }

    if (numAmount > MAX_DEPOSIT) {
      setError(`Maximum deposit is KES ${MAX_DEPOSIT}`);
      return false;
    }

    return true;
  };

  const handleDeposit = async () => {
    if (!validateInputs() || !userId) return;

    setLoading(true);
    setError("");

    try {
      const res = await supabase
        .from("deposit_requests")
        .insert([
          {
            user_id: userId,
            amount: Number(amount),
            mpesa: "pending", // Placeholder since no phone number collected
            payment_method: "mpesa",
            status: "pending",
          },
        ]);

      if (res.error) {
        setError("Deposit request failed: " + res.error.message);
      } else {
        setDepositAmount(Number(amount));
        setShowSuccessModal(true);
        setAmount("");

        // Send Telegram notification
        await sendTelegramNotification('deposit', {
          userEmail: email,
          amount: Number(amount),
          status: 'pending',
        });

        // Refresh history
        const historyRes = await supabase
          .from("deposit_requests")
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
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-800 border-0 shadow-2xl">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
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
                Deposit Submitted!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your deposit request has been submitted successfully.
              </p>

              {/* Amount Display */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-4 mb-6 border border-green-200 dark:border-green-800">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Amount</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  KES {depositAmount.toLocaleString()}
                </p>
              </div>

              {/* Status Info */}
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Payment Pending</p>
                    <p className="text-slate-600 dark:text-slate-400">You'll receive an M-Pesa prompt on your phone</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Quick Processing</p>
                    <p className="text-slate-600 dark:text-slate-400">Funds are added instantly after payment</p>
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Add Funds</h1>
            <p className="text-sm text-slate-600">{email}</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-2">Current Balance</p>
                  <p className="text-3xl md:text-4xl font-bold">KES {balance.toLocaleString()}</p>
                </div>
                <Wallet className="w-12 h-12 opacity-20" />
              </div>
              {/* Exchange Rate Info */}
              <div className="bg-green-400/30 rounded-lg p-3 border border-green-300">
                <p className="text-sm text-green-50">💱 <strong>Exchange Rate:</strong> 1 USD = KES 130</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paybill Details */}
        <Card className="mb-6 shadow-lg border-2 border-green-500">
          <CardHeader className="bg-green-50 border-b border-green-200">
            <CardTitle className="text-lg text-green-900">📱 M-Pesa Paybill Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="p-4 bg-green-100 rounded-lg border border-green-300">
                <p className="text-xs text-green-700 mb-1 font-semibold">PAYBILL NUMBER</p>
                <p className="text-2xl font-bold text-green-900 font-mono">714777</p>
              </div>
              <div className="p-4 bg-green-100 rounded-lg border border-green-300">
                <p className="text-xs text-green-700 mb-1 font-semibold">ACCOUNT NUMBER</p>
                <p className="text-2xl font-bold text-green-900 font-mono">440200262196</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">💡 To Deposit via M-Pesa:</span> Go to M-Pesa → Lipa na M-Pesa Online (STK/Online) → Enter Paybill <span className="font-mono font-bold">714777</span> → Account Number <span className="font-mono font-bold">440200262196</span> → Your Amount → Enter PIN
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* USDT TRC20 Details */}
        <Card className="mb-6 shadow-lg border-2 border-purple-500">
          <CardHeader className="bg-purple-50 border-b border-purple-200">
            <CardTitle className="text-lg text-purple-900">💳 USDT TRC20 Deposit</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="p-4 bg-purple-100 rounded-lg border border-purple-300">
                <p className="text-xs text-purple-700 mb-1 font-semibold">WALLET ADDRESS</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-bold text-purple-900 font-mono break-all">TSBTnke1Lz2FCHAo3MQfemvLpp4mGDTEMs</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("TSBTnke1Lz2FCHAo3MQfemvLpp4mGDTEMs");
                      alert("Wallet address copied to clipboard!");
                    }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold flex-shrink-0"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">💡 To Deposit via USDT TRC20:</span> Send USDT to the wallet address above. Minimum deposit: 10 USDT. Your account will be credited once the transaction is confirmed on the blockchain.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg text-black">Deposit Funds</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Amount Deposited (KES)
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
                  min={MIN_DEPOSIT}
                  max={MAX_DEPOSIT}
                  className="pl-12 text-lg"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Min: KES {MIN_DEPOSIT} • Max: KES {MAX_DEPOSIT}
              </p>
            </div>

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

            {/* Instructions Box */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">📱 Instructions:</span> Send payment using the paybill details above. Enter the amount sent and click confirm.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleDeposit}
              disabled={!amount || loading}
              className="w-full h-11 text-base font-semibold bg-green-600 hover:bg-green-700"
            >
              {loading ? "Processing..." : "Confirm Deposit"}
            </Button>
          </CardContent>
        </Card>

        {/* Deposit History */}
        {history.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Deposits</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refreshUserData()}
                className="text-xs"
              >
                Refresh
              </Button>
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

export default Deposit;
