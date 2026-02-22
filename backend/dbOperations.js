const Order = require('./orderModel');

async function placeOrder(orderData) {
  const newOrder = new Order(orderData);
  await newOrder.save();
  return { 
    message: 'Order placed successfully', 
    orderId: newOrder._id // Use the MongoDB _id as the order ID
  };
}

module.exports = { placeOrder };
