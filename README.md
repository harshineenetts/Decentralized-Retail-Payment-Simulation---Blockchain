# Decentralized Retail Payment Simulation

A full-stack blockchain simulation that automates the deployment of smart contracts and manages peer-to-peer retail transactions on the Ethereum Sepolia Testnet.

##  Overview
This project demonstrates a seamless integration of web3 technologies to simulate a real-world retail environment. It automates the complex process of contract compilation, deployment, and transaction signing, providing a "one-click" experience for decentralized payments.

## Key Features
* **Dynamic Contract Management:** Automatically compiles and deploys Solidity smart contracts using Python and Web3.py.
* **Real-time Currency Conversion:** Integrates CoinGecko API to calculate live ETH requirements based on fiat retail prices.
* **Secure Wallet Integration:** Uses a Node.js bridge to interact with MetaMask for secure transaction signing.
* **Automated Gas Estimation:** Calculates optimal gas fees to ensure timely transaction processing on the Sepolia Testnet.
* **Transaction Validation:** Direct links to Etherscan for real-time verification of payment success and block confirmation.

##  Tech Stack
* **Languages:** Python, Solidity, JavaScript (Node.js)
* **Blockchain Library:** Web3.py
* **Network:** Ethereum Sepolia Testnet
* **Wallet:** MetaMask
* **APIs:** CoinGecko (Price Feeds), Etherscan (Validation)
* **Tools:** Solc (Solidity Compiler)

## System Architecture


[Image of blockchain payment flow architecture]


1.  **Price Fetching:** Python script calls CoinGecko API to get the current ETH/USD rate.
2.  **Compilation:** Python uses `py-solc-x` to compile the Payment Smart Contract.
3.  **Deployment:** Web3.py deploys the contract to Sepolia.
4.  **Bridge:** Node.js handles the secure handshake between the backend and the MetaMask wallet.
5.  **Validation:** Once the transaction is mined, the Etherscan URL is generated for auditing.

##  Prerequisites
* Python 3.8+
* Node.js & NPM
* MetaMask Extension
* Sepolia ETH (Get funds from a [Sepolia Faucet](https://sepoliafaucet.com/))
* Infura or Alchemy Project ID (for RPC access)

##  Installation & Setup
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/yourusername/retail-payment-simulation.git](https://github.com/yourusername/retail-payment-simulation.git)
   cd retail-payment-simulation
