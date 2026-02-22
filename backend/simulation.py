from solcx import compile_standard, install_solc, set_solc_version
from web3 import Web3
import os, time, random, sys # Import sys

# --- CONFIGURATION ---
SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com"
CHAIN_ID = 11155111
w3 = Web3(Web3.HTTPProvider(SEPOLIA_RPC))

# --- Helper utilities ---
def to_eth(wei):
    return w3.from_wei(wei, 'ether')

def gwei(n):
    return w3.to_wei(n, 'gwei')

# --- NEW: Accept arguments from Node.js ---
if len(sys.argv) < 3:
    print("[ERROR] Not enough arguments. Need ETH Amount and Private Key.")
    sys.exit(1)

try:
    eth_amount_from_order = float(sys.argv[1])
    private_key = sys.argv[2]
    
    # Ensure private key is in hex format
    if not private_key.startswith('0x'):
        private_key = '0x' + private_key
        
    acct = w3.eth.account.from_key(private_key)
    sender_address = acct.address
except ValueError:
    print("[ERROR] Invalid private key. Please check your key and try again.")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] {e}")
    sys.exit(1)

print("\n--- Simulation Started ---")
print("Connecting to Sepolia:", w3.is_connected())
print(f"Using Wallet Address: {sender_address}")

# --- Get Initial Balance ---
try:
    start_balance_wei = w3.eth.get_balance(sender_address)
    start_balance_eth = to_eth(start_balance_wei)
    print(f"Starting Balance: {start_balance_eth:.18f} ETH")
except Exception as e:
    print(f"[ERROR] Could not get balance for address. Is the RPC (Sepolia) node down? Error: {e}")
    sys.exit(1)
    
value_to_contract = w3.to_wei(eth_amount_from_order, 'ether')

if start_balance_wei < value_to_contract:
    print("\n--- TRANSACTION FAILED ---")
    print(f"[ERROR] Insufficient funds. Wallet has {start_balance_eth:.18f} ETH, but order requires {eth_amount_from_order:.18f} ETH (plus gas).")
    sys.exit(1)


# --- Gas Info ---
pending = w3.eth.get_block('pending')
base_fee = pending.get('baseFeePerGas', None)
suggested_priority = gwei(2)
suggested_max_fee = int(base_fee * 2 + suggested_priority) if base_fee else w3.eth.gas_price
print("\nNetwork Gas Info (Gwei):", float(to_eth(base_fee))*1e9 if base_fee else 'N/A')

# --------------------------
# 1) Deploy a "Shop" smart contract to receive payment
# --------------------------
print("\n--- Step 1: Deploying Shop Contract ---")
contract_source = '''
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
contract ShopContract {
    address public owner;
    event Received(address indexed from, uint256 amount);
    constructor() { owner = msg.sender; }
    receive() external payable { emit Received(msg.sender, msg.value); }
    function getBalance() public view returns (uint256) { return address(this).balance; }
}
'''

try:
    install_solc("0.8.17")
    set_solc_version("0.8.17")
except Exception as e:
    print(f"Solc installation warning (may be fine if already installed): {e}")

compiled = compile_standard({
    "language":"Solidity",
    "sources":{"ShopContract.sol":{"content": contract_source}},
    "settings":{"outputSelection":{"*":{"*":["abi","evm.bytecode"]}}}
})
auth_abi = compiled["contracts"]["ShopContract.sol"]["ShopContract"]["abi"]
auth_bytecode = compiled["contracts"]["ShopContract.sol"]["ShopContract"]["evm"]["bytecode"]["object"]

Shop = w3.eth.contract(abi=auth_abi, bytecode=auth_bytecode)
nonce = w3.eth.get_transaction_count(sender_address)
construct_tx = Shop.constructor().build_transaction({
    "from": sender_address, "nonce": nonce, "chainId": CHAIN_ID, "type": 2,
    "maxPriorityFeePerGas": suggested_priority, "maxFeePerGas": suggested_max_fee,
})
est_gas = w3.eth.estimate_gas({"from": sender_address, "data": auth_bytecode})
construct_tx["gas"] = int(est_gas * 1.25)
signed_construct = w3.eth.account.sign_transaction(construct_tx, private_key)
txh = w3.eth.send_raw_transaction(signed_construct.raw_transaction)
print("Deploying contract, tx:", txh.hex())
receipt = w3.eth.wait_for_transaction_receipt(txh)
contract_address = receipt.contractAddress
deploy_fee_wei = receipt.gasUsed * int(receipt.effectiveGasPrice)
print("Shop Contract deployed at:", contract_address)

# --------------------------
# 2) Send Ether (from order) to smart contract
# --------------------------
print("\n--- Step 2: Sending Payment to Contract ---")
print(f"Sending {eth_amount_from_order:.18f} ETH to contract...")

nonce = w3.eth.get_transaction_count(sender_address) # Fresh nonce
tx_to_contract = {
    "type": 2, "from": sender_address, "to": contract_address, "value": value_to_contract,
    "nonce": nonce, "chainId": CHAIN_ID, "maxPriorityFeePerGas": suggested_priority,
    "maxFeePerGas": suggested_max_fee,
}
est_g = w3.eth.estimate_gas({"from": sender_address, "to": contract_address, "value": value_to_contract})
tx_to_contract["gas"] = int(est_g * 1.1)
signed = w3.eth.account.sign_transaction(tx_to_contract, private_key)
txh_payment = w3.eth.send_raw_transaction(signed.raw_transaction)
print("Sent payment tx:", txh_payment.hex())
rec_payment = w3.eth.wait_for_transaction_receipt(txh_payment)
payment_fee_wei = rec_payment.gasUsed * int(rec_payment.effectiveGasPrice)
print(f"Payment tx included in block: {rec_payment.blockNumber}")

# --------------------------
# 3) Final Report
# --------------------------
print("\n--- Step 3: Final Transaction Report ---")
end_balance_wei = w3.eth.get_balance(sender_address)
total_fee_wei = deploy_fee_wei + payment_fee_wei
total_spent_wei = value_to_contract + total_fee_wei

print(f"Wallet Address: {sender_address}")
print(f"Starting Balance: {to_eth(start_balance_wei):.18f} ETH")
print("---------------------------------")
print(f"Amount Sent:        {to_eth(value_to_contract):.18f} ETH")
print(f"Total Gas Fees:     {to_eth(total_fee_wei):.18f} ETH")
print(f"  (Deploy Fee:  {to_eth(deploy_fee_wei):.18f} ETH)")
print(f"  (Payment Fee: {to_eth(payment_fee_wei):.18f} ETH)")
print("---------------------------------")
print(f"Total Spent:        {to_eth(total_spent_wei):.18f} ETH")
print(f"Final Balance:    {to_eth(end_balance_wei):.18f} ETH")

print("\n--- Simulation Complete ---")
