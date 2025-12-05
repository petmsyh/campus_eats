const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  loungeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lounge',
    required: [true, 'Lounge is required']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: 0
  },
  remainingBalance: {
    type: Number,
    required: [true, 'Remaining balance is required'],
    min: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required']
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  renewalCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
contractSchema.index({ userId: 1, loungeId: 1, isActive: 1 });
contractSchema.index({ expiresAt: 1, isExpired: 1 });

// Check if contract is expired
contractSchema.methods.checkExpiry = function() {
  if (new Date() > this.expiresAt) {
    this.isExpired = true;
    this.isActive = false;
  }
  return this.isExpired;
};

// Auto-update expiry status before queries
contractSchema.pre(/^find/, function(next) {
  this.where({ expiresAt: { $gt: new Date() } }).updateMany({}, { isExpired: false });
  next();
});

module.exports = mongoose.model('Contract', contractSchema);
