const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Contract = require('../models/Contract');
const Order = require('../models/Order');
const logger = require('../utils/logger');

// @route   GET /api/v1/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('universityId', 'name code')
      .populate('campusId', 'name');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/v1/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, fcmToken } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        name,
        email,
        ...(fcmToken && { fcmToken })
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/users/wallet
// @desc    Get wallet balance
// @access  Private
router.get('/wallet', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        balance: user.walletBalance
      }
    });
  } catch (error) {
    logger.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/users/contracts
// @desc    Get user contracts
// @access  Private
router.get('/contracts', auth, async (req, res) => {
  try {
    const contracts = await Contract.find({ userId: req.user.id })
      .populate('loungeId', 'name logo')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: contracts
    });
  } catch (error) {
    logger.error('Get contracts error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/users/orders
// @desc    Get user orders
// @access  Private
router.get('/orders', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { userId: req.user.id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('loungeId', 'name logo')
      .populate('items.foodId', 'name image')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
