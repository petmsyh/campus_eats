const { prisma } = require('../config/prisma');
const { generateQRData, generateQRCode, verifyQRCode } = require('../utils/qrcode');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

/**
 * Create a new order
 */
exports.createOrder = async (req, res) => {
  try {
    const { loungeId, items, paymentMethod, contractId } = req.body;

    // Fetch food items and calculate total
    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const food = await prisma.food.findUnique({
        where: { id: item.foodId }
      });

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
        foodId: food.id,
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
      payment = await handleContractPayment(req.user.id, contractId, loungeId, totalPrice, commission);
    } else if (paymentMethod === 'chapa') {
      payment = await handleChapaPayment(req.user.id, totalPrice, commission);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    // Create order with items
    const orderData = {
      userId: req.user.id,
      loungeId,
      totalPrice,
      paymentMethod: paymentMethod.toUpperCase(),
      paymentId: payment.id,
      contractId: paymentMethod === 'contract' ? contractId : null,
      commission,
      items: {
        create: orderItems.map(item => ({
          foodId: item.foodId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          estimatedTime: item.estimatedTime
        }))
      }
    };

    const order = await prisma.order.create({
      data: orderData,
      include: {
        items: true,
        lounge: { select: { name: true, logo: true } }
      }
    });

    // Generate QR code
    const qrData = generateQRData(order.id);
    const qrCodeImage = await generateQRCode(qrData);

    // Update order with QR code
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        qrCode: qrData,
        qrCodeImage
      },
      include: {
        items: true,
        lounge: { select: { name: true, logo: true } }
      }
    });

    // Update payment with orderId
    await prisma.payment.update({
      where: { id: payment.id },
      data: { orderId: order.id }
    });

    // Create commission record
    await prisma.commission.create({
      data: {
        orderId: order.id,
        loungeId,
        amount: commission,
        rate: commissionRate,
        orderAmount: totalPrice
      }
    });

    // Send notification to user
    await sendOrderNotification(req.user, order.id, 'preparing');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: updatedOrder
    });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

/**
 * Get orders (user's own or lounge's orders)
 */
exports.getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let where = {};

    if (req.user.role === 'USER') {
      where.userId = req.user.id;
    } else if (req.user.role === 'LOUNGE') {
      const lounges = await prisma.lounge.findMany({
        where: { ownerId: req.user.id },
        select: { id: true }
      });
      const loungeIds = lounges.map(l => l.id);
      where.loungeId = { in: loungeIds };
    }

    if (status) where.status = status.toUpperCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true } },
          lounge: { select: { name: true, logo: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.order.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
};

/**
 * Get order by ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, phone: true } },
        lounge: { select: { name: true, logo: true, opening: true, closing: true } },
        items: {
          include: {
            food: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    const lounge = await prisma.lounge.findUnique({
      where: { id: order.loungeId }
    });
    
    if (
      req.user.role !== 'ADMIN' &&
      order.userId !== req.user.id &&
      (!lounge || lounge.ownerId !== req.user.id)
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
      message: 'Failed to retrieve order'
    });
  }
};

/**
 * Update order status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const statusUpper = status.toUpperCase();

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { lounge: true }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'ADMIN' && order.lounge.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    const updateData = { status: statusUpper };
    if (statusUpper === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData
    });

    // Send notification to user
    const user = await prisma.user.findUnique({
      where: { id: order.userId }
    });
    
    await sendOrderNotification(user, order.id, statusUpper);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

/**
 * Verify QR code and mark order as delivered
 */
exports.verifyQRCode = async (req, res) => {
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
    const order = await prisma.order.findFirst({
      where: { qrCode },
      include: {
        lounge: true,
        user: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'ADMIN' && order.lounge.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify this order'
      });
    }

    if (order.status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Order already delivered'
      });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date()
      }
    });

    // Send notification to user
    await sendOrderNotification(order.user, order.id, 'DELIVERED');

    res.status(200).json({
      success: true,
      message: 'Order verified and marked as delivered',
      data: updatedOrder
    });
  } catch (error) {
    logger.error('Verify QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify QR code'
    });
  }
};

// Helper functions
async function handleContractPayment(userId, contractId, loungeId, totalPrice, commission) {
  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      userId,
      loungeId,
      isActive: true,
      isExpired: false
    }
  });

  if (!contract) {
    throw new Error('Valid contract not found for this lounge');
  }

  if (contract.remainingBalance < totalPrice) {
    throw new Error('Insufficient contract balance');
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.contract.update({
      where: { id: contract.id },
      data: {
        remainingBalance: contract.remainingBalance - totalPrice
      }
    });

    const payment = await tx.payment.create({
      data: {
        userId,
        amount: totalPrice,
        type: 'ORDER',
        method: 'contract-wallet',
        status: 'COMPLETED',
        contractId: contract.id,
        commission
      }
    });

    return payment;
  });

  return result;
}

async function handleChapaPayment(userId, totalPrice, commission) {
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: totalPrice,
      type: 'ORDER',
      method: 'chapa',
      status: 'PENDING',
      commission
    }
  });

  return payment;
}

async function sendOrderNotification(user, orderId, status) {
  if (user && user.fcmToken) {
    const notification = notificationService.orderStatusNotification(status, orderId);
    await notificationService.sendNotification(user.fcmToken, notification, {
      orderId,
      type: 'order_status',
      status
    });
  }
}
