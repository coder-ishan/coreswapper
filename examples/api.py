from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
import json
import os
from web3 import Web3, HTTPProvider
from eth_account import Account
from eth_typing import ChecksumAddress
from hyperliquid.utils import constants
import example_utils

# Initialize Web3
RPC_URL = os.getenv('RPC_URL', 'https://rpc.hyperliquid.xyz/evm')
w3 = Web3(HTTPProvider(RPC_URL))

# USDT Contract ABI (simplified for transfer function)
USDT_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "payable": False,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
]

# USDT Contract Address (Mainnet)
USDT_CONTRACT_ADDRESS = Web3.to_checksum_address('0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb')
USDT_DECIMALS = 6  # USDT has 6 decimals

app = FastAPI(title="HyperLiquid Swap API",
             description="API for performing token swaps on HyperLiquid")

class SwapRequest(BaseModel):
    from_coin: str
    to_coin: str
    amount: float
    maker_fee: float = 0.0004
    taker_fee: float = 0.0007
    skip_ws: bool = True

def round_size(size, sz_decimals, coin):
    if sz_decimals == 0:
        return int(size)
    return round(size, sz_decimals[coin])

def round_price(price, sz_decimals, coin):
    if price > 100_000:
        return int(price)
    return round(float(f"{price:.5g}"), 8 - sz_decimals[coin])

def get_coin_name(coin_id: str) -> str:
    """Extract coin name from coin ID"""
    if coin_id.startswith('@'):
        return coin_id[1:].split('/')[0].split('@')[-1]
    return coin_id.split('/')[0]

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "HyperLiquid Swap API is running"}


#Hype is @107
#Usdt0 is @166

#we use @166 to get @107

def round_size(size, sz_decimals, coin):
    if sz_decimals[coin] == 0:
        return int(size)
    return round(size, sz_decimals[coin])

def round_price(price, sz_decimals, coin):
    if price > 100_000:
        return int(price)
    # If not we round px to 5 significant figures and max_decimals - szDecimals decimals
    else:
        return round(float(f"{price:.5g}"), 8 - sz_decimals[coin])

def get_coin_name(coin_id):
    # Map coin IDs to their names
    coin_map = {
        "@107": "HYPE",
        "@160": "BUDDY",
        "@142": "UBTC",
        "@166": "USDT0",
        "PURR/USDC": "PURR"
    }
    return coin_map.get(coin_id, coin_id)

def swap(amount, from_coin, to_coin):
    print(f"[DEBUG] Starting swap - Amount: {amount}, From: {from_coin}, To: {to_coin}")
    try:
        # Initialize exchange
        print("[DEBUG] Initializing exchange...")
        address, info, exchange = example_utils.setup(constants.MAINNET_API_URL, skip_ws=True)
        print(f"[DEBUG] Exchange initialized. Address: {address}")
        
        # Get metadata and mids
        print("[DEBUG] Fetching market data...")
        meta = info.spot_meta()
        mids = info.all_mids()
        print(f"[DEBUG] Got market data. Available pairs: {len(meta.get('universe', []))}")
        
        # Create maps for szDecimals
        sz_decimals = {}
        
        # Map token names to their szDecimals
        for token in meta.get('tokens', []):
            if 'name' in token and 'szDecimals' in token:
                sz_decimals[token['name']] = token['szDecimals']
        
        # Add the PURR/USDC pair if it exists
        for pair in meta.get('universe', []):
            if pair['name'] == 'PURR/USDC':
                sz_decimals['PURR/USDC'] = 0
                print("[DEBUG] Added PURR/USDC to sz_decimals")
                break
        
        # Get coin names
        from_coin_name = get_coin_name(from_coin)
        to_coin_name = get_coin_name(to_coin)
        print(f"[DEBUG] Coin names - From: {from_coin_name}, To: {to_coin_name}")
        
        # Trading parameters
        maker_fee = 0.0004
        taker_fee = 0.0007
        
        # Set initial size with proper rounding
        initial_size = round_size(amount, sz_decimals, from_coin_name)
        print(f"[DEBUG] Rounded initial size: {initial_size} {from_coin_name}")
        
        # Get current prices
        from_price = float(mids.get(from_coin, 0))
        to_price = float(mids.get(to_coin, 0))
        print(f"[DEBUG] Current prices - {from_coin}: {from_price}, {to_coin}: {to_price}")
        
        if from_price == 0 or to_price == 0:
            error_msg = f"Could not get prices for one or both tokens. {from_coin}: {from_price}, {to_coin}: {to_price}"
            print(f"[ERROR] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Calculate expected output with fees
        expected_output = (1 - maker_fee) * (1 - taker_fee) * \
                        ((round_size(initial_size, sz_decimals, from_coin_name) * 
                          round_price(from_price, sz_decimals, from_coin_name)) / 
                         round_price(to_price, sz_decimals, to_coin_name))
        
        rounded_output = round_size(expected_output, sz_decimals, to_coin_name)
        print(f"[DEBUG] Expected output: {expected_output}, Rounded: {rounded_output} {to_coin_name}")
        
        # Execute first trade (sell from_coin)
        print(f"[DEBUG] Executing first trade: Selling {initial_size} {from_coin_name}")
        order_result = exchange.market_open(from_coin, False, initial_size, None, 0.01)
        print(f"[DEBUG] First trade result: {json.dumps(order_result, indent=2)}")
        
        if order_result["status"] != "ok":
            error_msg = f"Error in first trade: {order_result}"
            print(f"[ERROR] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        filled = None
        for status in order_result["response"]["data"]["statuses"]:
            if "filled" in status:
                filled = status["filled"]
                print(f'[DEBUG] Order #{filled["oid"]} filled {filled["totalSz"]} @{filled["avgPx"]}')
            elif "error" in status:
                error_msg = f'First trade error: {status["error"]}'
                print(f"[ERROR] {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
        
        if not filled:
            error_msg = "No fills in first trade"
            print(f"[ERROR] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Get actual fill details
        filled_size = float(filled["totalSz"])
        filled_price = float(filled["avgPx"])
        print(f"[DEBUG] First trade filled - Size: {filled_size}, Price: {filled_price}")
        
        # Get current final token price again in case it changed
        current_to_price = float(mids.get(to_coin, 0))
        print(f"[DEBUG] Current {to_coin} price: {current_to_price}")
        
        if current_to_price == 0:
            error_msg = f"Could not get current price for {to_coin}"
            print(f"[ERROR] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Calculate output size based on filled amount and current price
        output_size = (filled_size * filled_price) / current_to_price
        rounded_output = round_size(output_size, sz_decimals, to_coin_name)
        print(f"[DEBUG] Calculated output - Raw: {output_size}, Rounded: {rounded_output} {to_coin_name}")
        
        if rounded_output <= 0:
            error_msg = f"Invalid output size {rounded_output}"
            print(f"[ERROR] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Small delay between trades
        print("[DEBUG] Waiting before second trade...")
        time.sleep(1)
        
        # Second trade (buy to_coin)
        print(f"[DEBUG] Executing second trade: Buying {rounded_output} {to_coin_name}")
        order_result2 = exchange.market_open(to_coin, True, rounded_output, None, 0.01)
        print(f"[DEBUG] Second trade result: {json.dumps(order_result2, indent=2)}")
        
        if order_result2["status"] != "ok":
            error_msg = f"Error in second trade: {order_result2}"
            print(f"[ERROR] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        filled2 = None
        for status in order_result2["response"]["data"]["statuses"]:
            if "filled" in status:
                filled2 = status["filled"]
                print(f'[DEBUG] Order #{filled2["oid"]} filled {filled2["totalSz"]} @{filled2["avgPx"]}')
            elif "error" in status:
                error_msg = f'Second trade error: {status["error"]}'
                print(f"[ERROR] {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
        
        if not filled2:
            error_msg = "No fills in second trade"
            print(f"[ERROR] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Calculate final amounts with fees
        final_amount = float(filled2['totalSz']) * (1 - taker_fee)
        
        return {
            "status": "success",
            "from_coin": from_coin,
            "to_coin": to_coin,
            "from_amount": filled["totalSz"],
            "to_amount": final_amount,
            "from_price": filled["avgPx"],
            "to_price": filled2["avgPx"],
            "fees_paid": {
                "maker_fee": f"{maker_fee * 100}%",
                "taker_fee": f"{taker_fee * 100}%"
            },
            "order_ids": [filled["oid"], filled2["oid"]]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def send_usdt_to_system(amount: float, private_key: str) -> Dict[str, Any]:
    """Send USDT to the system address using Web3"""
    try:
        # Initialize account
        account = Account.from_key(private_key)
        from_address = account.address
        
        # System address
        system_address = Web3.to_checksum_address("0x200000000000000000000000000000000000010C")
        
        # Initialize USDT contract
        usdt_contract = w3.eth.contract(address=USDT_CONTRACT_ADDRESS, abi=USDT_ABI)
        
        # Convert amount to USDT's decimal places
        amount_wei = int(amount * (10 ** USDT_DECIMALS))
        
        # Get current nonce
        nonce = w3.eth.get_transaction_count(from_address)
        
        # Build transaction
        tx = usdt_contract.functions.transfer(
            system_address,
            amount_wei
        ).build_transaction({
            'chainId': 999, 
            'gas': 200000, 
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
        })
        
        # Sign transaction
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        # Wait for transaction receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status != 1:
            raise Exception("Transaction failed")
            
        return {
            "status": "success",
            "tx_hash": tx_hash.hex(),
            "from": from_address,
            "to": system_address,
            "amount": amount,
            "block_number": receipt.blockNumber
        }
        
    except Exception as e:
        raise Exception(f"Failed to send USDT: {str(e)}")
def send_ubtc_to_user(amount: float, to_address: str, private_key: str) -> Dict[str, Any]:
    """Send UBTC to a user's address using EVM ERC20 transfer.
    
    Args:
        amount: Amount of UBTC to send
        to_address: Recipient's address
        private_key: Private key of the sender's wallet
        
    Returns:
        Dict containing transaction details or error information
    """
    try:
        print(f"[DEBUG] Sending {amount} UBTC to {to_address}")
        
        # Initialize account
        account = Account.from_key(private_key)
        from_address = account.address
        
        # UBTC token contract address on the EVM
        UBTC_CONTRACT_ADDRESS = Web3.to_checksum_address("0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463")
        
        # Initialize UBTC contract with standard ERC20 ABI
        ubtc_contract = w3.eth.contract(address=UBTC_CONTRACT_ADDRESS, abi=USDT_ABI)  # Using same ABI as USDT since both are ERC20
        
        # Convert amount to token's decimal places (assuming 6 decimals like USDT)
        amount_wei = int(amount * (10 ** 6))  # Adjust decimal places if UBTC uses different decimals
        
        # Get current nonce
        nonce = w3.eth.get_transaction_count(from_address)
        
        # Build transaction
        tx = ubtc_contract.functions.transfer(
            Web3.to_checksum_address(to_address),
            amount_wei
        ).build_transaction({
            'chainId': 999,  # Hyperliquid chain ID
            'gas': 200000,   # Adjust gas limit as needed
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
        })
        
        # Sign transaction
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        # Wait for transaction receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status != 1:
            raise Exception("Transaction failed")
            
        return {
            "status": "success",
            "tx_hash": tx_hash.hex(),
            "from": from_address,
            "to": to_address,
            "amount": amount,
            "token": "UBTC",
            "block_number": receipt.blockNumber
        }
        
    except Exception as e:
        error_msg = f"Failed to send UBTC: {str(e)}"
        print(f"[ERROR] {error_msg}")
        raise Exception(error_msg)

@app.post("/swap")
async def execute_swap(data: dict):
    """
    Execute a swap by first sending USDT to the system address, then performing the swap
    
    Args:
        amount: Amount of USDT to swap
        private_key: Private key of the wallet (for demo purposes; in production, use a more secure method)
    """
    try:
        print(data)
        amount = data["amount"]
        user_address = w3.to_checksum_address(data["user"])
        private_key = "eca06dd81c68c4417f8e578bda74c5ebab48ce44b11029a7f086c3c26842775f"
        # First, send USDT to system address
        send_result = send_usdt_to_system(amount, private_key)
        
        if send_result["status"] != "success":
            raise HTTPException(status_code=400, detail=send_result)
        
        # Now perform the swap
        from_coin = "@166"  # USDT
        to_coin = "@142"    # BTC
        
        swap_result = swap(amount, from_coin, to_coin)
        
        if swap_result["status"] != "success":
            raise HTTPException(status_code=400, detail=swap_result)
        
        # Send UBTC to UBTC address after successful swap
        try:
            # Get the UBTC address from config
            ubtc_address = w3.to_checksum_address("0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463")
            
            # Get the amount of UBTC received from the swap
            ubtc_amount = float(swap_result["to_amount"])
            
            # Initialize exchange for Hyperliquid
            _, _, exchange = example_utils.setup(constants.MAINNET_API_URL, skip_ws=True)
            
            # Send UBTC to the UBTC address
            # Using empty strings for SOURCE_DEX and DESTINATION_DEX as per mainnet requirements
            send_result = exchange.spot_transfer(
                ubtc_amount,
                "0x20000000000000000000000000000000000000c5",
                "UBTC:0x8f254b963e8468305d409b33aa137c67"
            )
            
            if send_result.get("status") != "ok":
                raise Exception(f"Failed to send UBTC: {send_result}")

            # Send UBTC to the user address 
            send_result = send_ubtc_to_user(ubtc_amount, user_address, private_key)
            return {
                "status": "success",
                "usdt_transfer": send_result,
                "swap": swap_result,
                "ubtc_transfer": {
                    "status": "success",
                    "to": ubtc_address,
                    "amount": ubtc_amount,
                    "tx_hash": send_result.get("response", {}).get("data", {}).get("status")
                }
            }
            
        except Exception as e:
            # If UBTC transfer fails, still return the swap result but include the error
            return {
                "status": "partial_success",
                "usdt_transfer": send_result,
                "swap": swap_result,
                "ubtc_transfer": {
                    "status": "error",
                    "error": str(e)
                },
                "message": "Swap completed but UBTC transfer failed"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
