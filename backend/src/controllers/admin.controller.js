const { prisma } = require('../config/prisma');
const logger = require('../utils/logger');

/**
 * Get system statistics
 */
exports.getStats = async (req, res) => {
  try {
    const [
      users,
      lounges,
      approvedLounges,
      pendingLounges,
      orders,
      activeOrders,
      completedOrders,
      universities,
      campuses
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.lounge.count(),
      prisma.lounge.count({ where: { isApproved: true } }),
      prisma.lounge.count({ where: { isApproved: false } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PREPARING', 'READY'] } } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.university.count(),
      prisma.campus.count()
    ]);

    const revenueData = await prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: {
        totalPrice: true,
        commission: true
      }
    });

    const stats = {
      users,
      lounges,
      approvedLounges,
      pendingLounges,
      orders,
      activeOrders,
      completedOrders,
      universities,
      campuses,
      revenue: {
        totalRevenue: revenueData._sum.totalPrice || 0,
        totalCommission: revenueData._sum.commission || 0
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
};

/**
 * Get all users
 */
exports.getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;

    const where = {};
    if (role) {
      where.role = role.toUpperCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          university: { select: { name: true } },
          campus: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
};

/**
 * Update user (activate/deactivate)
 */
exports.updateUser = async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive }
    });

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

/**
 * Get all lounges (including pending approval)
 */
exports.getLounges = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const where = {};
    if (status === 'pending') {
      where.isApproved = false;
    }
    if (status === 'approved') {
      where.isApproved = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [lounges, total] = await Promise.all([
      prisma.lounge.findMany({
        where,
        include: {
          owner: { select: { name: true, phone: true } },
          university: { select: { name: true } },
          campus: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.lounge.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: lounges,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    logger.error('Get lounges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve lounges'
    });
  }
};

/**
 * Approve or reject lounge
 */
exports.approveLounge = async (req, res) => {
  try {
    const { isApproved } = req.body;

    const lounge = await prisma.lounge.update({
      where: { id: req.params.id },
      data: { isApproved }
    });

    res.status(200).json({
      success: true,
      message: `Lounge ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: lounge
    });
  } catch (error) {
    logger.error('Approve lounge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lounge approval status'
    });
  }
};

/**
 * Create university
 */
exports.createUniversity = async (req, res) => {
  try {
    const { name, code, city, region } = req.body;

    const university = await prisma.university.create({
      data: {
        name,
        code: code.toUpperCase(),
        city,
        region,
        country: 'Ethiopia'
      }
    });

    res.status(201).json({
      success: true,
      message: 'University created successfully',
      data: university
    });
  } catch (error) {
    logger.error('Create university error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create university'
    });
  }
};

/**
 * Get all universities
 */
exports.getUniversities = async (req, res) => {
  try {
    const universities = await prisma.university.findMany({
      include: {
        _count: {
          select: { campuses: true, users: true, lounges: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: universities
    });
  } catch (error) {
    logger.error('Get universities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve universities'
    });
  }
};

/**
 * Create campus
 */
exports.createCampus = async (req, res) => {
  try {
    const { name, universityId, address, latitude, longitude } = req.body;

    const campus = await prisma.campus.create({
      data: {
        name,
        universityId,
        address,
        latitude,
        longitude
      }
    });

    res.status(201).json({
      success: true,
      message: 'Campus created successfully',
      data: campus
    });
  } catch (error) {
    logger.error('Create campus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campus'
    });
  }
};

/**
 * Get all campuses
 */
exports.getCampuses = async (req, res) => {
  try {
    const { universityId } = req.query;

    const where = {};
    if (universityId) {
      where.universityId = universityId;
    }

    const campuses = await prisma.campus.findMany({
      where,
      include: {
        university: { select: { name: true } },
        _count: {
          select: { users: true, lounges: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: campuses
    });
  } catch (error) {
    logger.error('Get campuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve campuses'
    });
  }
};

/**
 * Get all orders (admin overview)
 */
exports.getOrders = async (req, res) => {
  try {
    const { status, loungeId, page = 1, limit = 10 } = req.query;

    const where = {};
    if (status) {
      where.status = status.toUpperCase();
    }
    if (loungeId) {
      where.loungeId = loungeId;
    }

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
    logger.error('Get admin orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
};

/**
 * Get all commissions (admin overview)
 */
exports.getCommissions = async (req, res) => {
  try {
    const { loungeId, status, page = 1, limit = 10 } = req.query;

    const where = {};
    if (loungeId) {
      where.loungeId = loungeId;
    }
    if (status) {
      where.status = status.toUpperCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        include: {
          lounge: { select: { name: true } },
          order: { select: { id: true, createdAt: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.commission.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: commissions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    logger.error('Get admin commissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve commissions'
    });
  }
};

/**
 * Get all payments (admin overview)
 */
exports.getPayments = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;

    const where = {};
    if (type) {
      where.type = type.toUpperCase();
    }
    if (status) {
      where.status = status.toUpperCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.payment.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    logger.error('Get admin payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payments'
    });
  }
};
