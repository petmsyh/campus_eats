const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0
  },
  type: {
    type: String,
    enum: ['order', 'contract', 'refund'],
    required: [true, 'Payment type is required']
  },
  method: {
    type: String,
    enum: ['chapa', 'contract-wallet'],
    required: [true, 'Payment method is required']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
  commission: {
    type: Number,
    default: 0,
    min: 0
  },
  chapaReference: {
    type: String,
    unique: true,
    sparse: true
  },
  chapaTransactionId: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient queries
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ chapaReference: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
