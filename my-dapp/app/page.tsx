"use client";

import { useState } from "react";
import { ethers } from "ethers";

export default function WalletPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [amount, setAmount] = useState<string>("");
  const [fundsSent, setFundsSent] = useState<boolean>(false);
  const [lastSentAmount, setLastSentAmount] = useState<string>(""); // store sent amount
  const hardcodedAddress = "0x43723Bd688e1112b8ad8a5b8D464Cc3d2cE60A1D";

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
      setBalance(ethers.formatEther(rawBalance));
    } catch (err) {
      console.error("Error connecting wallet:", err);
    }
  };

  const sendFunds = async () => {
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      alert("Enter a valid amount in ETH!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: hardcodedAddress,
        value: ethers.parseEther(amount),
      });

      alert(`Transaction sent! Hash: ${tx.hash}`);
      await tx.wait();

      const newBalance = await provider.getBalance(account);
      setBalance(ethers.formatEther(newBalance));

      // Store the last sent amount for PostRequestComponent
      setLastSentAmount(amount);
      setFundsSent(true);
    } catch (err) {
      console.error("Error sending funds:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-6">
      <h1 className="text-2xl font-bold">Wallet Interaction</h1>

      {account ? (
        <>
          <p className="text-green-600">Connected: {account}</p>
          <p className="text-gray-700">Balance: {balance} ETH</p>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Enter amount in ETH"
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

      {/* Post component gets the last sent amount + user */}
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
      console.error("Error sending POST:", err);
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
