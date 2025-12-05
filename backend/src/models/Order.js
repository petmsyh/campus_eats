const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
  items: [{
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    estimatedTime: {
      type: Number,
      comment: 'Estimated preparation time in minutes'
    }
  }],
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['contract', 'chapa'],
    required: [true, 'Payment method is required']
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
  qrCode: {
    type: String,
    unique: true,
    sparse: true
  },
  qrCodeImage: {
    type: String
  },
  estimatedReadyTime: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  commission: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String
  },
  cancellationReason: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ loungeId: 1, status: 1 });
orderSchema.index({ qrCode: 1 });
orderSchema.index({ createdAt: -1 });

// Calculate estimated ready time before saving
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.estimatedReadyTime) {
    // Calculate based on items' estimated times
    const maxEstimatedTime = Math.max(...this.items.map(item => item.estimatedTime || 15));
    this.estimatedReadyTime = new Date(Date.now() + maxEstimatedTime * 60000);
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
