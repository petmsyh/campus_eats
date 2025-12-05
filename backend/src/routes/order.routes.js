const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const Food = require('../models/Food');
const Contract = require('../models/Contract');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Commission = require('../models/Commission');
const { generateQRData, generateQRCode, verifyQRCode } = require('../utils/qrcode');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

// @route   POST /api/v1/orders
// @desc    Create a new order
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { loungeId, items, paymentMethod, contractId } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Fetch food items and calculate total
    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const food = await Food.findById(item.foodId);
      if (!food) {
        return res.status(404).json({
          success: false,
          message: `Food item ${item.foodId} not found`
        });
      }

      if (!food.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `${food.name} is not available`
        });
      }

      const subtotal = food.price * item.quantity;
      totalPrice += subtotal;

      orderItems.push({
        foodId: food._id,
        name: food.name,
        quantity: item.quantity,
        price: food.price,
        subtotal,
        estimatedTime: food.estimatedTime
      });
    }

    // Calculate commission
    const commissionRate = parseFloat(process.env.SYSTEM_COMMISSION_RATE) || 0.05;
    const commission = totalPrice * commissionRate;

    // Handle payment method
    let payment;
    if (paymentMethod === 'contract') {
      // Validate contract
      const contract = await Contract.findOne({
        _id: contractId,
        userId: req.user.id,
        loungeId,
        isActive: true,
        isExpired: false
      });

      if (!contract) {
        return res.status(400).json({
          success: false,
          message: 'Valid contract not found for this lounge'
        });
      }

      if (contract.remainingBalance < totalPrice) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient contract balance'
        });
      }

      // Deduct from contract
      contract.remainingBalance -= totalPrice;
      await contract.save();

      // Create payment record
      payment = new Payment({
        userId: req.user.id,
        amount: totalPrice,
        type: 'order',
        method: 'contract-wallet',
        status: 'completed',
        contractId: contract._id,
        commission
      });
      await payment.save();
    } else if (paymentMethod === 'chapa') {
      // Payment will be handled separately via Chapa
      payment = new Payment({
        userId: req.user.id,
        amount: totalPrice,
        type: 'order',
        method: 'chapa',
        status: 'pending',
        commission
      });
      await payment.save();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    // Create order
    const order = new Order({
      userId: req.user.id,
      loungeId,
      items: orderItems,
      totalPrice,
      paymentMethod,
      paymentId: payment._id,
      contractId: paymentMethod === 'contract' ? contractId : undefined,
      commission
    });

    // Generate QR code
    const qrData = generateQRData(order._id);
    order.qrCode = qrData;
    order.qrCodeImage = await generateQRCode(qrData);

    await order.save();

    // Link payment to order
    payment.orderId = order._id;
    await payment.save();

    // Create commission record
    const commissionRecord = new Commission({
      orderId: order._id,
      loungeId,
      amount: commission,
      rate: commissionRate,
      orderAmount: totalPrice
    });
    await commissionRecord.save();

    // Send notification to user
    if (req.user.fcmToken) {
      const notification = notificationService.orderStatusNotification('preparing', order._id);
      await notificationService.sendNotification(req.user.fcmToken, notification, {
        orderId: order._id.toString(),
        type: 'order_status'
      });
    }

    // Populate order details
    await order.populate('loungeId', 'name logo');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/v1/orders
// @desc    Get orders (user's own or lounge's orders)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {};

    if (req.user.role === 'user') {
      query.userId = req.user.id;
    } else if (req.user.role === 'lounge') {
      // Find lounges owned by this user
      const Lounge = require('../models/Lounge');
      const lounges = await Lounge.find({ ownerId: req.user.id });
      const loungeIds = lounges.map(l => l._id);
      query.loungeId = { $in: loungeIds };
    }

    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('userId', 'name phone')
      .populate('loungeId', 'name logo')
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

// @route   GET /api/v1/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name phone')
      .populate('loungeId', 'name logo operatingHours')
      .populate('items.foodId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    const Lounge = require('../models/Lounge');
    const lounge = await Lounge.findById(order.loungeId);
    
    if (
      req.user.role !== 'admin' &&
      order.userId.toString() !== req.user.id &&
      (!lounge || lounge.ownerId.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/v1/orders/:id/status
// @desc    Update order status
// @access  Private (Lounge owner)
router.put('/:id/status', auth, authorize('lounge', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findById(req.params.id).populate('loungeId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && order.loungeId.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    order.status = status;

    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Send notification to user
    const user = await User.findById(order.userId);
    if (user && user.fcmToken) {
      const notification = notificationService.orderStatusNotification(status, order._id);
      await notificationService.sendNotification(user.fcmToken, notification, {
        orderId: order._id.toString(),
        type: 'order_status',
        status
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/v1/orders/verify-qr
// @desc    Verify QR code and mark order as delivered
// @access  Private (Lounge owner)
router.post('/verify-qr', auth, authorize('lounge', 'admin'), async (req, res) => {
  try {
    const { qrCode } = req.body;

    // Verify QR code format
    const verification = verifyQRCode(qrCode);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code'
      });
    }

    // Find order
    const order = await Order.findOne({ qrCode }).populate('loungeId userId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && order.loungeId.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify this order'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order already delivered'
      });
    }

    // Update order status
    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    // Send notification to user
    if (order.userId.fcmToken) {
      const notification = notificationService.orderStatusNotification('delivered', order._id);
      await notificationService.sendNotification(order.userId.fcmToken, notification, {
        orderId: order._id.toString(),
        type: 'order_status',
        status: 'delivered'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order verified and marked as delivered',
      data: order
    });
  } catch (error) {
    logger.error('Verify QR error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
