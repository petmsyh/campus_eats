const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order is required']
  },
  loungeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lounge',
    required: [true, 'Lounge is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0
  },
  rate: {
    type: Number,
    required: [true, 'Commission rate is required'],
    min: 0,
    max: 1
  },
  orderAmount: {
    type: Number,
    required: [true, 'Order amount is required'],
    min: 0
  },
  recipient: {
    type: String,
    enum: ['system', 'lounge'],
    default: 'system'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paidAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
commissionSchema.index({ loungeId: 1, status: 1 });
commissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Commission', commissionSchema);
