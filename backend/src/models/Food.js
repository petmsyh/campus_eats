const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  loungeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lounge',
    required: [true, 'Lounge is required']
  },
  name: {
    type: String,
    required: [true, 'Food name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'drinks', 'dessert'],
    required: [true, 'Category is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  image: {
    type: String
  },
  estimatedTime: {
    type: Number,
    required: [true, 'Estimated preparation time is required'],
    min: 1,
    comment: 'Time in minutes'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  ingredients: [{
    type: String
  }],
  allergens: [{
    type: String
  }],
  isVegetarian: {
    type: Boolean,
    default: false
  },
  spicyLevel: {
    type: String,
    enum: ['none', 'mild', 'medium', 'hot', 'very-hot'],
    default: 'none'
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
foodSchema.index({ loungeId: 1, isAvailable: 1 });
foodSchema.index({ category: 1, isAvailable: 1 });

module.exports = mongoose.model('Food', foodSchema);
