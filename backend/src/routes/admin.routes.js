const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Lounge = require('../models/Lounge');
const Order = require('../models/Order');
const University = require('../models/University');
const Campus = require('../models/Campus');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

// @route   GET /api/v1/admin/stats
// @desc    Get system statistics
// @access  Private (Admin)
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const stats = {
      users: await User.countDocuments({ role: 'user' }),
      lounges: await Lounge.countDocuments(),
      approvedLounges: await Lounge.countDocuments({ isApproved: true }),
      pendingLounges: await Lounge.countDocuments({ isApproved: false }),
      orders: await Order.countDocuments(),
      activeOrders: await Order.countDocuments({ status: { $in: ['pending', 'preparing', 'ready'] } }),
      completedOrders: await Order.countDocuments({ status: 'delivered' }),
      universities: await University.countDocuments(),
      campuses: await Campus.countDocuments()
    };

    // Revenue statistics
    const revenueData = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalCommission: { $sum: '$commission' }
        }
      }
    ]);

    stats.revenue = revenueData[0] || { totalRevenue: 0, totalCommission: 0 };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', auth, authorize('admin'), async (req, res) => {
  try {
    const { role, universityId, campusId, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (universityId) query.universityId = universityId;
    if (campusId) query.campusId = campusId;

    const users = await User.find(query)
      .populate('universityId', 'name')
      .populate('campusId', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/v1/admin/users/:id/status
// @desc    Activate/Deactivate user
// @access  Private (Admin)
router.put('/users/:id/status', auth, authorize('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/admin/lounges
// @desc    Get all lounges
// @access  Private (Admin)
router.get('/lounges', auth, authorize('admin'), async (req, res) => {
  try {
    const { isApproved, universityId, campusId, page = 1, limit = 20 } = req.query;

    const query = {};
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (universityId) query.universityId = universityId;
    if (campusId) query.campusId = campusId;

    const lounges = await Lounge.find(query)
      .populate('ownerId', 'name phone')
      .populate('universityId', 'name')
      .populate('campusId', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lounge.countDocuments(query);

    res.status(200).json({
      success: true,
      data: lounges,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get lounges error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/v1/admin/lounges/:id/approve
// @desc    Approve/Reject lounge
// @access  Private (Admin)
router.put('/lounges/:id/approve', auth, authorize('admin'), async (req, res) => {
  try {
    const { isApproved } = req.body;

    const lounge = await Lounge.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true }
    );

    if (!lounge) {
      return res.status(404).json({
        success: false,
        message: 'Lounge not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Lounge ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: lounge
    });
  } catch (error) {
    logger.error('Approve lounge error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/admin/universities
// @desc    Get all universities
// @access  Private (Admin)
router.get('/universities', auth, authorize('admin'), async (req, res) => {
  try {
    const universities = await University.find().sort('name');

    res.status(200).json({
      success: true,
      data: universities
    });
  } catch (error) {
    logger.error('Get universities error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/v1/admin/universities
// @desc    Create university
// @access  Private (Admin)
router.post('/universities', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, code, location } = req.body;

    const university = new University({
      name,
      code,
      location
    });

    await university.save();

    res.status(201).json({
      success: true,
      message: 'University created successfully',
      data: university
    });
  } catch (error) {
    logger.error('Create university error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/admin/campuses
// @desc    Get all campuses
// @access  Private (Admin)
router.get('/campuses', auth, authorize('admin'), async (req, res) => {
  try {
    const { universityId } = req.query;

    const query = universityId ? { universityId } : {};

    const campuses = await Campus.find(query)
      .populate('universityId', 'name code')
      .sort('name');

    res.status(200).json({
      success: true,
      data: campuses
    });
  } catch (error) {
    logger.error('Get campuses error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/v1/admin/campuses
// @desc    Create campus
// @access  Private (Admin)
router.post('/campuses', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, universityId, location } = req.body;

    const campus = new Campus({
      name,
      universityId,
      location
    });

    await campus.save();

    res.status(201).json({
      success: true,
      message: 'Campus created successfully',
      data: campus
    });
  } catch (error) {
    logger.error('Create campus error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/admin/orders
// @desc    Get all orders
// @access  Private (Admin)
router.get('/orders', auth, authorize('admin'), async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('userId', 'name phone')
      .populate('loungeId', 'name')
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
