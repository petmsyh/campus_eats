const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { prisma } = require('../config/prisma');
const logger = require('../utils/logger');

// @route   GET /api/v1/lounges
// @desc    Get all lounges (filtered by campus if user is logged in)
// @access  Public/Private
router.get('/', async (req, res) => {
  try {
    const { universityId, campusId, search } = req.query;

    const where = { isActive: true, isApproved: true };

    if (universityId) where.universityId = universityId;
    if (campusId) where.campusId = campusId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const lounges = await prisma.lounge.findMany({
      where,
      include: {
        university: { select: { name: true } },
        campus: { select: { name: true } }
      },
      orderBy: { ratingAverage: 'desc' }
    });

    // Remove bank account details
    const sanitizedLounges = lounges.map(({ accountNumber, bankName, accountHolderName, ...lounge }) => lounge);

    res.status(200).json({
      success: true,
      data: sanitizedLounges
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
    const lounge = await prisma.lounge.findUnique({
      where: { id: req.params.id },
      include: {
        university: { select: { name: true } },
        campus: { select: { name: true } }
      }
    });

    if (!lounge) {
      return res.status(404).json({
        success: false,
        message: 'Lounge not found'
      });
    }

    // Remove bank account details
    const { accountNumber, bankName, accountHolderName, ...sanitizedLounge } = lounge;

    res.status(200).json({
      success: true,
      data: sanitizedLounge
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

    const lounge = await prisma.lounge.create({
      data: {
        name,
        ownerId: req.user.id,
        universityId,
        campusId,
        description,
        logo,
        accountNumber: bankAccount.accountNumber,
        bankName: bankAccount.bankName,
        accountHolderName: bankAccount.accountHolderName,
        opening: operatingHours?.opening,
        closing: operatingHours?.closing
      }
    });

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
    const lounge = await prisma.lounge.findUnique({
      where: { id: req.params.id }
    });

    if (!lounge) {
      return res.status(404).json({
        success: false,
        message: 'Lounge not found'
      });
    }

    // Check ownership
    if (lounge.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
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

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (logo) updateData.logo = logo;
    if (bankAccount) {
      if (bankAccount.accountNumber) updateData.accountNumber = bankAccount.accountNumber;
      if (bankAccount.bankName) updateData.bankName = bankAccount.bankName;
      if (bankAccount.accountHolderName) updateData.accountHolderName = bankAccount.accountHolderName;
    }
    if (operatingHours) {
      if (operatingHours.opening) updateData.opening = operatingHours.opening;
      if (operatingHours.closing) updateData.closing = operatingHours.closing;
    }

    const updatedLounge = await prisma.lounge.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Lounge updated successfully',
      data: updatedLounge
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
    const foods = await prisma.food.findMany({
      where: {
        loungeId: req.params.id,
        isAvailable: true
      },
      orderBy: { category: 'asc' }
    });

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
