const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Contract = require('../models/Contract');
const Order = require('../models/Order');
const chapaService = require('../services/chapa.service');
const logger = require('../utils/logger');

// @route   POST /api/v1/payments/initialize
// @desc    Initialize payment with Chapa
// @access  Private
router.post('/initialize', auth, async (req, res) => {
  try {
    const { paymentId, returnUrl } = req.body;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check ownership
    if (payment.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed'
      });
    }

    // Generate unique reference
    const reference = `CE-${Date.now()}-${payment._id}`;
    payment.chapaReference = reference;
    await payment.save();

    // Initialize Chapa payment
    const chapaResponse = await chapaService.initializePayment({
      amount: payment.amount,
      email: req.user.email || `${req.user.phone}@campuseats.et`,
      firstName: req.user.name.split(' ')[0],
      lastName: req.user.name.split(' ').slice(1).join(' ') || 'User',
      phone: req.user.phone,
      reference,
      returnUrl: returnUrl || process.env.FRONTEND_URL,
      description: `Payment for ${payment.type}`
    });

    if (!chapaResponse.success) {
      return res.status(400).json({
        success: false,
        message: chapaResponse.message || 'Failed to initialize payment'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        checkoutUrl: chapaResponse.data.data.checkout_url,
        reference
      }
    });
  } catch (error) {
    logger.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/v1/payments/webhook
// @desc    Chapa webhook for payment confirmation
// @access  Public (but verified)
router.post('/webhook', async (req, res) => {
  try {
    const { tx_ref, status, transaction_id } = req.body;

    logger.info('Chapa webhook received:', req.body);

    // Find payment by reference
    const payment = await Payment.findOne({ chapaReference: tx_ref });

    if (!payment) {
      logger.warn('Payment not found for reference:', tx_ref);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status === 'completed') {
      logger.info('Payment already completed:', tx_ref);
      return res.status(200).json({
        success: true,
        message: 'Payment already processed'
      });
    }

    // Verify payment with Chapa
    const verification = await chapaService.verifyPayment(tx_ref);

    if (!verification.success || verification.data.status !== 'success') {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Update payment status
    payment.status = 'completed';
    payment.chapaTransactionId = transaction_id;
    payment.metadata = verification.data;
    await payment.save();

    // Process based on payment type
    if (payment.type === 'contract') {
      // Activate contract
      const contract = await Contract.findById(payment.contractId);
      if (contract) {
        contract.isActive = true;
        await contract.save();
      }
    } else if (payment.type === 'order') {
      // Update order status
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.status = 'preparing';
        await order.save();
      }
    }

    logger.info('Payment processed successfully:', tx_ref);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/payments/:id/verify
// @desc    Verify payment status
// @access  Private
router.get('/:id/verify', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check ownership
    if (payment.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // If payment already completed, return status
    if (payment.status === 'completed') {
      return res.status(200).json({
        success: true,
        data: {
          status: 'completed',
          payment
        }
      });
    }

    // Verify with Chapa
    if (payment.chapaReference) {
      const verification = await chapaService.verifyPayment(payment.chapaReference);

      if (verification.success && verification.data.status === 'success') {
        payment.status = 'completed';
        payment.metadata = verification.data;
        await payment.save();

        // Process based on payment type
        if (payment.type === 'contract') {
          const contract = await Contract.findById(payment.contractId);
          if (contract) {
            contract.isActive = true;
            await contract.save();
          }
        } else if (payment.type === 'order') {
          const order = await Order.findById(payment.orderId);
          if (order) {
            order.status = 'preparing';
            await order.save();
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        status: payment.status,
        payment
      }
    });
  } catch (error) {
    logger.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/payments
// @desc    Get user's payments
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;

    const query = { userId: req.user.id };
    if (type) query.type = type;
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('orderId', 'status totalPrice')
      .populate('contractId', 'loungeId remainingBalance')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
