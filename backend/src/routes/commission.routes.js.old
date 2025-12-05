const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const Commission = require('../models/Commission');
const logger = require('../utils/logger');

// @route   GET /api/v1/commissions
// @desc    Get commissions (filtered by lounge for lounge owners)
// @access  Private (Lounge/Admin)
router.get('/', auth, authorize('lounge', 'admin'), async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    let query = {};

    // If lounge owner, filter by their lounges
    if (req.user.role === 'lounge') {
      const Lounge = require('../models/Lounge');
      const lounges = await Lounge.find({ ownerId: req.user.id });
      const loungeIds = lounges.map(l => l._id);
      query.loungeId = { $in: loungeIds };
    }

    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const commissions = await Commission.find(query)
      .populate('orderId', 'totalPrice status createdAt')
      .populate('loungeId', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Commission.countDocuments(query);

    // Calculate totals
    const totalAmount = await Commission.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: commissions,
      summary: {
        totalCommission: totalAmount[0]?.total || 0,
        totalRecords: total
      },
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get commissions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/commissions/report
// @desc    Get commission report
// @access  Private (Admin)
router.get('/report', auth, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, loungeId } = req.query;

    const matchQuery = {};
    
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    if (loungeId) matchQuery.loungeId = loungeId;

    // Aggregate commission data
    const report = await Commission.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$loungeId',
          totalCommission: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
          averageCommission: { $avg: '$amount' },
          totalOrderAmount: { $sum: '$orderAmount' }
        }
      },
      {
        $lookup: {
          from: 'lounges',
          localField: '_id',
          foreignField: '_id',
          as: 'lounge'
        }
      },
      {
        $unwind: '$lounge'
      },
      {
        $project: {
          loungeName: '$lounge.name',
          totalCommission: 1,
          totalOrders: 1,
          averageCommission: 1,
          totalOrderAmount: 1
        }
      },
      {
        $sort: { totalCommission: -1 }
      }
    ]);

    // Overall totals
    const overallTotals = await Commission.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
          totalOrderAmount: { $sum: '$orderAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byLounge: report,
        overall: overallTotals[0] || {
          totalCommission: 0,
          totalOrders: 0,
          totalOrderAmount: 0
        }
      }
    });
  } catch (error) {
    logger.error('Get commission report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/v1/commissions/:id/status
// @desc    Update commission status
// @access  Private (Admin)
router.put('/:id/status', auth, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      return res.status(404).json({
        success: false,
        message: 'Commission not found'
      });
    }

    commission.status = status;
    if (status === 'paid') {
      commission.paidAt = new Date();
    }

    await commission.save();

    res.status(200).json({
      success: true,
      message: 'Commission status updated successfully',
      data: commission
    });
  } catch (error) {
    logger.error('Update commission status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
