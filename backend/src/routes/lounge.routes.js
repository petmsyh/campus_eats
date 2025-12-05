const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const Lounge = require('../models/Lounge');
const logger = require('../utils/logger');

// @route   GET /api/v1/lounges
// @desc    Get all lounges (filtered by campus if user is logged in)
// @access  Public/Private
router.get('/', async (req, res) => {
  try {
    const { universityId, campusId, search } = req.query;

    const query = { isActive: true, isApproved: true };

    if (universityId) query.universityId = universityId;
    if (campusId) query.campusId = campusId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const lounges = await Lounge.find(query)
      .populate('universityId', 'name')
      .populate('campusId', 'name')
      .select('-bankAccount')
      .sort('-rating.average');

    res.status(200).json({
      success: true,
      data: lounges
    });
  } catch (error) {
    logger.error('Get lounges error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/lounges/:id
// @desc    Get lounge by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const lounge = await Lounge.findById(req.params.id)
      .populate('universityId', 'name')
      .populate('campusId', 'name')
      .select('-bankAccount');

    if (!lounge) {
      return res.status(404).json({
        success: false,
        message: 'Lounge not found'
      });
    }

    res.status(200).json({
      success: true,
      data: lounge
    });
  } catch (error) {
    logger.error('Get lounge error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/v1/lounges
// @desc    Create a lounge
// @access  Private (User/Admin)
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      universityId,
      campusId,
      description,
      logo,
      bankAccount,
      operatingHours
    } = req.body;

    const lounge = new Lounge({
      name,
      ownerId: req.user.id,
      universityId,
      campusId,
      description,
      logo,
      bankAccount,
      operatingHours
    });

    await lounge.save();

    res.status(201).json({
      success: true,
      message: 'Lounge created successfully. Awaiting approval.',
      data: lounge
    });
  } catch (error) {
    logger.error('Create lounge error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/v1/lounges/:id
// @desc    Update lounge
// @access  Private (Lounge owner)
router.put('/:id', auth, async (req, res) => {
  try {
    const lounge = await Lounge.findById(req.params.id);

    if (!lounge) {
      return res.status(404).json({
        success: false,
        message: 'Lounge not found'
      });
    }

    // Check ownership
    if (lounge.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lounge'
      });
    }

    const {
      name,
      description,
      logo,
      bankAccount,
      operatingHours
    } = req.body;

    lounge.name = name || lounge.name;
    lounge.description = description || lounge.description;
    lounge.logo = logo || lounge.logo;
    lounge.bankAccount = bankAccount || lounge.bankAccount;
    lounge.operatingHours = operatingHours || lounge.operatingHours;

    await lounge.save();

    res.status(200).json({
      success: true,
      message: 'Lounge updated successfully',
      data: lounge
    });
  } catch (error) {
    logger.error('Update lounge error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/lounges/:id/menu
// @desc    Get lounge menu
// @access  Public
router.get('/:id/menu', async (req, res) => {
  try {
    const Food = require('../models/Food');
    
    const foods = await Food.find({
      loungeId: req.params.id,
      isAvailable: true
    }).sort('category');

    res.status(200).json({
      success: true,
      data: foods
    });
  } catch (error) {
    logger.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
