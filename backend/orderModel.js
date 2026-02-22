const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: String,
  deliveryAddress: String,
  contactNumber: String,
  message: String,
  cakes: [
    {
      cakeName: String,
      price: Number,
      quantity: Number
    }
  ],
  totalAmount: Number,
  gst: Number,
  vat: Number,
  paymentMode: String,
  orderDate: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
