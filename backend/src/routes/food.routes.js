const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const Food = require('../models/Food');
const Lounge = require('../models/Lounge');
const logger = require('../utils/logger');

// @route   GET /api/v1/foods
// @desc    Get all foods (with filters)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { loungeId, category, search, available } = req.query;

    const query = {};
    
    if (loungeId) query.loungeId = loungeId;
    if (category) query.category = category;
    if (available !== undefined) query.isAvailable = available === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const foods = await Food.find(query)
      .populate('loungeId', 'name logo')
      .sort('-rating.average');

    res.status(200).json({
      success: true,
      data: foods
    });
  } catch (error) {
    logger.error('Get foods error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/foods/:id
// @desc    Get food by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const food = await Food.findById(req.params.id)
      .populate('loungeId', 'name logo operatingHours');

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: food
    });
  } catch (error) {
    logger.error('Get food error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/v1/foods
// @desc    Create a food item
// @access  Private (Lounge owner)
router.post('/', auth, authorize('lounge', 'admin'), async (req, res) => {
  try {
    const {
      loungeId,
      name,
      description,
      category,
      price,
      image,
      estimatedTime,
      ingredients,
      allergens,
      isVegetarian,
      spicyLevel
    } = req.body;

    // Verify lounge ownership
    if (req.user.role !== 'admin') {
      const lounge = await Lounge.findById(loungeId);
      if (!lounge || lounge.ownerId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add food to this lounge'
        });
      }
    }

    const food = new Food({
      loungeId,
      name,
      description,
      category,
      price,
      image,
      estimatedTime,
      ingredients,
      allergens,
      isVegetarian,
      spicyLevel
    });

    await food.save();

    res.status(201).json({
      success: true,
      message: 'Food item created successfully',
      data: food
    });
  } catch (error) {
    logger.error('Create food error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/v1/foods/:id
// @desc    Update food item
// @access  Private (Lounge owner)
router.put('/:id', auth, authorize('lounge', 'admin'), async (req, res) => {
  try {
    const food = await Food.findById(req.params.id).populate('loungeId');

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    // Check ownership
    if (req.user.role !== 'admin' && food.loungeId.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this food item'
      });
    }

    const updatedFields = {};
    const allowedFields = [
      'name', 'description', 'category', 'price', 'image',
      'estimatedTime', 'isAvailable', 'ingredients', 'allergens',
      'isVegetarian', 'spicyLevel'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updatedFields[field] = req.body[field];
      }
    });

    const updatedFood = await Food.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Food item updated successfully',
      data: updatedFood
    });
  } catch (error) {
    logger.error('Update food error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/v1/foods/:id
// @desc    Delete food item
// @access  Private (Lounge owner)
router.delete('/:id', auth, authorize('lounge', 'admin'), async (req, res) => {
  try {
    const food = await Food.findById(req.params.id).populate('loungeId');

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    // Check ownership
    if (req.user.role !== 'admin' && food.loungeId.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this food item'
      });
    }

    await food.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Food item deleted successfully'
    });
  } catch (error) {
    logger.error('Delete food error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
