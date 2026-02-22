const express = require('express');
const path = require('path');
const mongoose = require('./db_setup');
const { placeOrder } = require('./dbOperations');
const app = express();
const port = 3000;

// --- NEW IMPORTS ---
const { spawn } = require('child_process'); // To run Python script
const axios = require('axios'); // To fetch ETH price
// -------------------

app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// This endpoint remains the same
app.post('/place-order', async (req, res) => {
  try {
    const response = await placeOrder(req.body);
    res.json(response); // Send the orderId back to the frontend
  } catch (error) {
    res.status(500).json({ message: 'Error placing order', error });
  }
});

// --- NEW HELPER FUNCTION ---
async function getEthToInrPrice() {
  try {
    const coingeckoUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr';
    const priceResponse = await axios.get(coingeckoUrl);
    return priceResponse.data.ethereum.inr;
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    throw new Error('Could not fetch ETH price');
  }
}

// --- NEW ENDPOINT to get ETH amount ---
app.post('/get-eth-amount', async (req, res) => {
  try {
    const { totalAmount } = req.body; // Total in Rupees
    if (!totalAmount) {
      return res.status(400).json({ message: 'Total amount is required' });
    }
    
    const ethPriceInInr = await getEthToInrPrice();
    const ethAmount = totalAmount / ethPriceInInr;
    
    res.json({ ethAmount: ethAmount.toFixed(18), ethPriceInInr });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// --- MODIFIED ENDPOINT FOR BLOCKCHAIN SIMULATION ---
app.post('/simulate-payment', async (req, res) => {
  try {
    // We now receive the private key from the user
    const { totalAmount, userPrivateKey } = req.body; // Total in Rupees
    
    if (!totalAmount || !userPrivateKey) {
      return res.status(400).json({ success: false, log: 'Error: Missing total amount or private key.' });
    }

    const ethPriceInInr = await getEthToInrPrice();
    const ethAmount = totalAmount / ethPriceInInr;

    // Spawn the Python script
    // We now pass TWO arguments: the ETH amount and the user's private key
    const pythonProcess = spawn('python', [
      path.join(__dirname, 'simulation.py'),
      ethAmount.toString(),
      userPrivateKey // Pass the key as the second argument
    ]);

    let simulationOutput = "";
    let simulationError = "";

    pythonProcess.stdout.on('data', (data) => {
      simulationOutput += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
      simulationError += data.toString();
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python script exited with code ${code}`);

      let finalReport = `--- Order & Exchange Rate ---\n`;
      finalReport += `Order Total: ₹${Number(totalAmount).toFixed(2)}\n`;
      finalReport += `Live ETH Price: ₹${ethPriceInInr}\n`;
      finalReport += `Calculated Payment: ${ethAmount.toFixed(18)} ETH\n`;
      finalReport += `---------------------------------\n\n`;
      
      if (code === 0) {
        finalReport += simulationOutput;
        res.json({ success: true, log: finalReport });
      } else {
        // Send back the specific error from the script
        finalReport += "Error running simulation.\n\n" + (simulationError || simulationOutput);
        res.status(500).json({ success: false, log: finalReport });
      }
    });

  } catch (error) {
    console.error('Error in simulation endpoint:', error);
    res.status(500).json({ 
      success: false, 
      log: 'Server error while trying to run simulation.' 
    });
  }
});
// ---------------------------------------------

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
