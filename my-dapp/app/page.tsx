"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function WalletPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [tokenAddress, setTokenAddress] = useState<string>(""); // ERC20 token address
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [amount, setAmount] = useState<string>("");
  const [fundsSent, setFundsSent] = useState<boolean>(false);
  const [lastSentAmount, setLastSentAmount] = useState<string>("");

  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint amount) returns (bool)",
    "function decimals() view returns (uint8)"
  ];

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("MetaMask is not installed!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);

      const rawBalance = await provider.getBalance(accounts[0]);
      setEthBalance(ethers.formatEther(rawBalance));

      if (tokenAddress) fetchTokenBalance(accounts[0], tokenAddress, provider);
    } catch (err) {
      console.error(err);
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
        provider.getBalance(account).then(bal => setEthBalance(ethers.formatEther(bal)));
      } else {
        fetchTokenBalance(account, tokenAddress);
      }
    }
  }, [account, tokenAddress]);

  const sendFunds = async () => {
    if (!account) return alert("Connect wallet first!");
    if (!amount || isNaN(Number(amount))) return alert("Enter valid amount");

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
        const decimals = await tokenContract.decimals();
        const tx = await tokenContract.transfer(
          "0x43723Bd688e1112b8ad8a5b8D464Cc3d2cE60A1D",
          ethers.parseUnits(amount, decimals)
        );
        await tx.wait();
      }

      const newEthBalance = await provider.getBalance(account);
      setEthBalance(ethers.formatEther(newEthBalance));
      if (tokenAddress) fetchTokenBalance(account, tokenAddress, provider);

      setLastSentAmount(amount);
      setFundsSent(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-6">
      <h1 className="text-2xl font-bold">Wallet Interaction</h1>

      {account ? (
        <>
          <p className="text-green-600">Connected: {account}</p>
          <p className="text-gray-700">ETH Balance: {ethBalance}</p>
          {tokenAddress && <p className="text-gray-700">Token Balance: {tokenBalance}</p>}

          <div className="flex flex-col gap-2 w-96">
            <input
              type="text"
              placeholder="Token Address (leave empty for ETH)"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="text"
              placeholder="Amount to send"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
            <button
              onClick={sendFunds}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Send Funds
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={connectWallet}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Connect MetaMask
        </button>
      )}

      {/* Post component: only amount and user */}
      <PostRequestComponent
        active={fundsSent}
        amount={lastSentAmount}
        user={account || ""}
      />
    </div>
  );
}

function PostRequestComponent({
  active,
  amount,
  user,
}: {
  active: boolean;
  amount: string;
  user: string;
}) {
  const [responseData, setResponseData] = useState<any>(null);

  const sendPostRequest = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          user,
        }),
      });

      const data = await response.json();
      setResponseData(data);
    } catch (err) {
      console.error(err);
      alert("Failed to send POST request");
    }
  };

  return (
    <div className="flex flex-col gap-3 border p-4 rounded-lg shadow-md w-96">
      <h2 className="text-lg font-semibold">Send POST Request</h2>

      <input
        type="text"
        value={amount}
        readOnly
        className="border rounded-lg px-3 py-2 bg-gray-100 text-black"
        disabled={!active}
      />
      <input
        type="text"
        value={user}
        readOnly
        className="border rounded-lg px-3 py-2 bg-gray-100 text-black"
        disabled={!active}
      />
      <button
        onClick={sendPostRequest}
        className={`px-6 py-3 rounded-lg text-white ${
          active
            ? "bg-green-600 hover:bg-green-700"
            : "bg-gray-400 cursor-not-allowed"
        }`}
        disabled={!active}
      >
        Send POST
      </button>

      {responseData && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <p className="font-semibold text-black">Updated Response:</p>
          <pre className="text-sm text-black">{JSON.stringify(responseData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
