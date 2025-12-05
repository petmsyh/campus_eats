const mongoose = require('mongoose');

const loungeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Lounge name is required'],
    trim: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  universityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
    required: [true, 'University is required']
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: [true, 'Campus is required']
  },
  description: {
    type: String,
    trim: true
  },
  logo: {
    type: String
  },
  bankAccount: {
    accountNumber: {
      type: String,
      required: [true, 'Bank account number is required']
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required']
    },
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required']
    }
  },
  operatingHours: {
    opening: String,
    closing: String
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
loungeSchema.index({ universityId: 1, campusId: 1, isActive: 1, isApproved: 1 });

module.exports = mongoose.model('Lounge', loungeSchema);
