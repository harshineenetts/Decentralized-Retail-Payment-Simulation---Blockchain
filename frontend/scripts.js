let cart = [];
let totalAmount = 0;
let gst = 0;
let vat = 0;
let finalTotalAmount = 0; // Will hold total + tax
let customerDetails = {}; // Will hold address info

// Cache DOM elements
const cartItemsDiv = document.getElementById('cart-items');
const cartTotalDiv = document.getElementById('cart-total');
const cartSection = document.getElementById('cart');
const checkoutSection = document.getElementById('checkout');
const confirmationSection = document.getElementById('confirmation');
const addressStep = document.getElementById('address-step');
const paymentStep = document.getElementById('payment-step');
const newAddressForm = document.getElementById('new-address-form');
const ethModal = document.getElementById('eth-payment-modal');

// --- Event Listeners for New UI ---
document.getElementById('use-default-address-btn').addEventListener('click', () => {
    customerDetails = {
        customerName: 'Justin M. Tabb',
        deliveryAddress: '1017 Rosemont Avenue, Orlando, FL 32801',
        contactNumber: '555-123-4567',
        message: 'Default Address'
    };
    showPaymentStep();
});

document.getElementById('show-new-address-btn').addEventListener('click', () => {
    newAddressForm.classList.remove('hidden');
    document.getElementById('show-new-address-btn').classList.add('hidden');
    document.getElementById('use-default-address-btn').classList.add('hidden');
});

document.getElementById('use-new-address-btn').addEventListener('click', () => {
    const name = document.getElementById('name').value;
    const address = document.getElementById('address').value;
    const contact = document.getElementById('contact').value;

    if (!name || !address || !contact) {
        alert("Please fill in all the required fields (Name, Address, Contact).");
        return;
    }

    customerDetails = {
        customerName: name,
        deliveryAddress: address,
        contactNumber: contact,
        message: document.getElementById('message').value || "N/A"
    };
    showPaymentStep();
});

function showPaymentStep() {
    addressStep.classList.add('hidden');
    paymentStep.classList.remove('hidden');
}

function backToAddress() {
    addressStep.classList.remove('hidden');
    paymentStep.classList.add('hidden');
}

// --- Cart Functions (Unchanged) ---
function addCake(cakeName, price) {
    let item = cart.find(item => item.cakeName === cakeName);
    if (item) {
        item.quantity++;
    } else {
        cart.push({ cakeName, price, quantity: 1 });
    }
    updateCart();
}

function updateQuantity(cakeName, quantity) {
    let item = cart.find(item => item.cakeName === cakeName);
    if (item) {
        item.quantity = parseInt(quantity);
        updateCart();
    }
}

function updateCart() {
    cartItemsDiv.innerHTML = `
        <tr>
            <th>Item</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Total</th>
        </tr>
    `;

    totalAmount = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        cartItemsDiv.innerHTML += `
            <tr>
                <td>${item.cakeName}</td>
                <td>₹${item.price}</td>
                <td>${item.quantity}</td>
                <td>₹${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    gst = totalAmount * 0.18; // 18% GST
    vat = totalAmount * 0.05; // 5% VAT
    finalTotalAmount = totalAmount + gst + vat;

    cartTotalDiv.innerHTML = `
        <p>Subtotal: ₹${totalAmount.toFixed(2)}</p>
        <p>GST (18%): ₹${gst.toFixed(2)}</p>
        <p>VAT (5%): ₹${vat.toFixed(2)}</p>
        <p><strong>Total: ₹${finalTotalAmount.toFixed(2)}</strong></p>
    `;

    cartSection.classList.remove('hidden');
}

function goToCheckout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    cartSection.classList.add('hidden');
    checkoutSection.classList.remove('hidden');
    // Reset checkout to address step
    backToAddress();
    newAddressForm.classList.add('hidden');
    document.getElementById('show-new-address-btn').classList.remove('hidden');
    document.getElementById('use-default-address-btn').classList.remove('hidden');
}

// --- NEW PAYMENT LOGIC ---
async function confirmOrder() {
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    const orderDetails = {
        ...customerDetails,
        cakes: cart,
        totalAmount: finalTotalAmount,
        gst,
        vat,
        paymentMode: paymentMethod
    };

    if (paymentMethod === 'ETH') {
        // Open the ETH payment modal
        await openEthModal();
    } else {
        // For dummy payments (COD, UPI)
        saveOrderAndShowConfirmation(orderDetails, "Order placed with dummy payment.");
    }
}

async function openEthModal() {
    ethModal.classList.remove('hidden');
    const logEl = document.getElementById('simulation-log');
    const ethAmountEl = document.getElementById('eth-amount');
    const ethPriceEl = document.getElementById('eth-price');
    const payBtn = document.getElementById('pay-now-button');

    // Reset modal state
    logEl.textContent = "Fetching ETH exchange rate...";
    ethAmountEl.textContent = "Calculating...";
    ethPriceEl.textContent = "...";
    payBtn.disabled = true;
    document.getElementById('user-private-key').value = '';

    try {
        const response = await fetch('/get-eth-amount', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalAmount: finalTotalAmount })
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch ETH price from server.');
        }
        
        const data = await response.json();
        ethAmountEl.textContent = `${data.ethAmount} ETH`;
        ethPriceEl.textContent = `₹${data.ethPriceInInr}`;
        logEl.textContent = "Please enter your Sepolia Testnet private key and click 'Pay Now'.";
        payBtn.disabled = false;

    } catch (error) {
        console.error('Error getting ETH amount:', error);
        logEl.textContent = `Error: ${error.message}`;
    }
}

function closeEthModal() {
    ethModal.classList.add('hidden');
}

async function handleEthPayment() {
    const userPrivateKey = document.getElementById('user-private-key').value;
    const logEl = document.getElementById('simulation-log');
    const payBtn = document.getElementById('pay-now-button');

    if (!userPrivateKey) {
        logEl.textContent = "Error: Private key is required.";
        return;
    }

    logEl.textContent = "Initializing simulation...\nConnecting to Sepolia testnet...\nThis may take 1-2 minutes. Do not close this window.";
    payBtn.disabled = true;
    payBtn.textContent = "Processing...";

    try {
        const response = await fetch('/simulate-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                totalAmount: finalTotalAmount,
                userPrivateKey: userPrivateKey
            })
        });

        const simData = await response.json();
        logEl.textContent = simData.log; // Display the full log

        if (simData.success) {
            // Payment was successful, now save the order
            logEl.textContent += "\n\nPAYMENT SUCCESSFUL.\nSaving order to database...";
            
            const orderDetails = {
                ...customerDetails,
                cakes: cart,
                totalAmount: finalTotalAmount,
                gst,
                vat,
                paymentMode: 'ETH (Sepolia)'
            };
            
            // Pass the simulation log to the confirmation page
            saveOrderAndShowConfirmation(orderDetails, simData.log);
            
            // Close modal after a delay
            setTimeout(() => {
                closeEthModal();
            }, 3000);

        } else {
            // Simulation failed
            throw new Error(simData.log || 'Simulation failed. Check console.');
        }

    } catch (error) {
        console.error('Error in simulation:', error);
        logEl.textContent = `Error: ${error.message}`;
        payBtn.disabled = false;
        payBtn.textContent = "Pay Now";
    }
}

// --- NEW Re-usable function to save order and show confirmation ---
function saveOrderAndShowConfirmation(orderDetails, confirmationLog) {
    // 1. Save the order to MongoDB
    fetch('/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderDetails)
    })
    .then(response => response.json())
    .then(data => {
        // 2. Show the confirmation screen
        showConfirmation(data.orderId, orderDetails, confirmationLog);
    })
    .catch(error => {
        console.error('Error placing order:', error);
        alert('Payment was successful, but saving the order failed. Please contact support.');
    });
}


// --- MODIFIED Show Confirmation function ---
function showConfirmation(orderId, orderDetails, log = null) {
    checkoutSection.classList.add('hidden');
    confirmationSection.classList.remove('hidden');

    const confirmationDiv = document.getElementById('confirmation-details');
    confirmationDiv.innerHTML = `
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Name:</strong> ${orderDetails.customerName}</p>
        <p><strong>Address:</strong> ${orderDetails.deliveryAddress}</p>
        <p><strong>Contact:</strong> ${orderDetails.contactNumber}</p>
        <p><strong>Total Amount:</strong> ₹${orderDetails.totalAmount.toFixed(2)}</p>
        <p><strong>Payment Mode:</strong> ${orderDetails.paymentMode}</p>
    `;

    // If there is a simulation log, add it
    if (log) {
        const logContainer = document.createElement('div');
        logContainer.id = 'simulation-log-container';
        logContainer.innerHTML = `
            <h3>Transaction Log:</h3>
            <pre id="simulation-log">${log}</pre>
        `;
        confirmationDiv.appendChild(logContainer);
    }
}

// Back to Cakes after confirmation
function backToCakes() {
    confirmationSection.classList.add('hidden');
    cart = [];
    totalAmount = 0;
    gst = 0;
    vat = 0;
    finalTotalAmount = 0;
    customerDetails = {};
    
    // Hide all checkout/cart sections
    cartSection.classList.add('hidden');
    checkoutSection.classList.add('hidden');
    
    // Clear cart UI
    cartItemsDiv.innerHTML = '';
    cartTotalDiv.innerHTML = '';

    // Clear new address form
    document.getElementById('name').value = '';
    document.getElementById('address').value = '';
    document.getElementById('contact').value = '';
    document.getElementById('message').value = '';
}
