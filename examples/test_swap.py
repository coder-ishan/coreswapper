import time

import example_utils
import json

from hyperliquid.utils import constants

def round_size(size, sz_decimals,coin):
    if sz_decimals == 0:
        return int(size)
    return round(size, sz_decimals[coin])

def round_price(price, sz_decimals,coin):
    if price > 100_000:
        return int(price)
    # If not we round px to 5 significant figures and max_decimals - szDecimals decimals
    else:
        return round(float(f"{price:.5g}"), 8 - sz_decimals[coin])

def main():
    address, info, exchange = example_utils.setup(constants.MAINNET_API_URL, skip_ws=True)

    # Get metadata and mids
    meta = info.spot_meta()
    mids = info.all_mids()
    
    # Create maps for szDecimals and mids
    sz_decimals = {}
    
    # Map token names to their szDecimals
    for token in meta['tokens']:
        if 'name' in token and 'szDecimals' in token:
            sz_decimals[token['name']] = token['szDecimals']
    
    # Also add the PURR/USDC pair
    for pair in meta['universe']:
        if pair['name'] == 'PURR/USDC':
            sz_decimals['PURR/USDC'] = 0  # Perps typically have 0 szDecimals
            break
    
    # Trading parameters
    '''
    initial_coin = "PURR/USDC"
    initial_coin_name = "PURR"
    final_coin = "@107"
    final_coin_name = "HYPE"
    
    inital_qty = 97.65
    '''

    initial_coin = "@107"
    initial_coin_name = "HYPE"
    final_coin = "@160"
    final_coin_name = "BUDDY"
   
    inital_qty = 2.41
    maker_fee = 0.0004
    taker_fee = 0.0007
   
    '''
    final_coin = "@142"
    final_coin_name = "BTC"

    '''
    '''
    final_coin = "PURR/USDC"
    final_coin_name = "PURR"
    '''

    """
    final_coin = "@160"
    final_coin_name = "BUDDY"
    """
    
    # Set initial size to minimum allowed by the token
    initial_size = round_size(inital_qty, sz_decimals, initial_coin_name)
    
    print(f"Token details - {initial_coin}: szDecimals={sz_decimals[initial_coin_name]}, {final_coin}: szDecimals={sz_decimals[final_coin_name]}")
    print(f"Using minimum size for {initial_coin}: {initial_size}")
    
    # Get current prices from mids
    initial_price = float(mids.get(initial_coin, 0))
    final_price = float(mids.get(final_coin, 0))
    
    if initial_price == 0 or final_price == 0:
        print(f"Error: Could not get prices for one or both tokens")
        print(f"{initial_coin} price: {initial_price}")
        print(f"{final_coin} price: {final_price}")
        return
    
    print(f"Current prices - {initial_coin}: {initial_price}, {final_coin}: {final_price}")
    
    # Calculate expected output size based on current prices
    expected_output = (1-maker_fee)*(1-taker_fee)*((round_size(initial_size, sz_decimals, initial_coin_name) * round_price(initial_price, sz_decimals, initial_coin_name)) / round_price(final_price, sz_decimals, final_coin_name))
    
    # Round the output size according to the final token's szDecimals
    rounded_output = round_size(expected_output, sz_decimals, final_coin_name)
    
    print(f"Attempting to swap {initial_size} {initial_coin_name} for ~{rounded_output} {final_coin_name}")
    initial_time = time.time()
    # First trade: Sell initial token
    print(f"\nExecuting first trade: Selling {initial_size} {initial_coin_name}")
    order_result = exchange.market_open(initial_coin, False, initial_size, None, 0.01)
    print(order_result)
    
    if order_result["status"] != "ok":
        print(f"Error in first trade: {order_result}")
        return
        
    filled = None
    for status in order_result["response"]["data"]["statuses"]:
        if "filled" in status:
            filled = status["filled"]
            print(f'Order #{filled["oid"]} filled {filled["totalSz"]} @{filled["avgPx"]}')
        elif "error" in status:
            print(f'Error: {status["error"]}')
            return
    
    if not filled:
        print("No fills in first trade")
        return
    
    # Calculate output size based on actual fill price and size
    filled_size = float(filled["totalSz"])
    filled_price = float(filled["avgPx"])
    
    # Get current final token price again in case it changed
    current_final_price = float(mids.get(final_coin, 0))
    if current_final_price == 0:
        print(f"Error: Could not get current price for {final_coin}")
        return
    
    # Calculate output size with proper rounding
    output_size = (filled_size * filled_price) / current_final_price
    rounded_output = round_size(output_size, sz_decimals, final_coin_name)
    
    if rounded_output <= 0:
        print(f"Error: Invalid output size {rounded_output}")
        return
    
    print(f"\nExecuting second trade: Buying {rounded_output} {final_coin}")
    
    # Small delay between trades
    time.sleep(1)
    
    # Second trade: Buy final token
    order_result2 = exchange.market_open(final_coin, True, rounded_output, None, 0.01)
    print(order_result2)
    
    if order_result2["status"] != "ok":
        print(f"Error in second trade: {order_result2}")
        return
    
    filled2 = None
    for status in order_result2["response"]["data"]["statuses"]:
        if "filled" in status:
            filled2 = status["filled"]
            print(f'Order #{filled2["oid"]} filled {filled2["totalSz"]} @{filled2["avgPx"]}')
        elif "error" in status:
            print(f'Error: {status["error"]}')
    
    if filled2:
        print(f"\nSuccessfully swapped {filled['totalSz']} {initial_coin_name} for {float(filled2['totalSz'])*(1-taker_fee)} {final_coin_name} in {time.time() - initial_time} seconds")
    else:
        print("\nSecond trade did not fill")
if __name__ == "__main__":
    main()
