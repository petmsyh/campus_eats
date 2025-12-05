const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

// @route   POST /api/v1/contracts
// @desc    Create a new contract
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { loungeId, totalAmount, durationDays } = req.body;

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    const duration = durationDays || 30; // Default 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    // Check if active contract exists
    const existingContract = await Contract.findOne({
      userId: req.user.id,
      loungeId,
      isActive: true,
      isExpired: false
    });

    if (existingContract) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active contract with this lounge'
      });
    }

    // Create payment (will be completed via Chapa)
    const payment = new Payment({
      userId: req.user.id,
      amount: totalAmount,
      type: 'contract',
      method: 'chapa',
      status: 'pending'
    });
    await payment.save();

    // Create contract
    const contract = new Contract({
      userId: req.user.id,
      loungeId,
      totalAmount,
      remainingBalance: totalAmount,
      expiresAt,
      paymentId: payment._id
    });

    await contract.save();

    // Link contract to payment
    payment.contractId = contract._id;
    await payment.save();

    await contract.populate('loungeId', 'name logo');

    res.status(201).json({
      success: true,
      message: 'Contract created successfully. Complete payment to activate.',
      data: {
        contract,
        payment: {
          id: payment._id,
          amount: payment.amount,
          status: payment.status
        }
      }
    });
  } catch (error) {
    logger.error('Create contract error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/contracts
// @desc    Get user's contracts
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { loungeId, status } = req.query;

    const query = { userId: req.user.id };
    if (loungeId) query.loungeId = loungeId;
    if (status === 'active') {
      query.isActive = true;
      query.isExpired = false;
    } else if (status === 'expired') {
      query.isExpired = true;
    }

    const contracts = await Contract.find(query)
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

// @route   GET /api/v1/contracts/:id
// @desc    Get contract by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('loungeId', 'name logo operatingHours')
      .populate('paymentId');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check ownership
    if (contract.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this contract'
      });
    }

    res.status(200).json({
      success: true,
      data: contract
    });
  } catch (error) {
    logger.error('Get contract error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/v1/contracts/:id/renew
// @desc    Renew a contract
// @access  Private
router.post('/:id/renew', auth, async (req, res) => {
  try {
    const { amount, durationDays } = req.body;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check ownership
    if (contract.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to renew this contract'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    // Create payment for renewal
    const payment = new Payment({
      userId: req.user.id,
      amount,
      type: 'contract',
      method: 'chapa',
      status: 'pending',
      contractId: contract._id
    });
    await payment.save();

    // Update contract
    contract.totalAmount += amount;
    contract.remainingBalance += amount;
    contract.renewalCount += 1;
    contract.isExpired = false;
    contract.isActive = true;

    // Extend expiry date
    const duration = durationDays || 30;
    const newExpiryDate = new Date(contract.expiresAt);
    newExpiryDate.setDate(newExpiryDate.getDate() + duration);
    contract.expiresAt = newExpiryDate;

    await contract.save();

    res.status(200).json({
      success: true,
      message: 'Contract renewal initiated. Complete payment to activate.',
      data: {
        contract,
        payment: {
          id: payment._id,
          amount: payment.amount,
          status: payment.status
        }
      }
    });
  } catch (error) {
    logger.error('Renew contract error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/contracts/lounge/:loungeId
// @desc    Get user's contract with specific lounge
// @access  Private
router.get('/lounge/:loungeId', auth, async (req, res) => {
  try {
    const contract = await Contract.findOne({
      userId: req.user.id,
      loungeId: req.params.loungeId,
      isActive: true,
      isExpired: false
    }).populate('loungeId', 'name logo');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'No active contract found with this lounge'
      });
    }

    res.status(200).json({
      success: true,
      data: contract
    });
  } catch (error) {
    logger.error('Get lounge contract error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
