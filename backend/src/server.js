require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/prisma');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
const sanitizeInput = require('./middleware/sanitize');
const { helmetConfig, getCorsConfig, requestSizeLimits } = require('./config/security');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const loungeRoutes = require('./routes/lounge.routes');
const foodRoutes = require('./routes/food.routes');
const orderRoutes = require('./routes/order.routes');
const contractRoutes = require('./routes/contract.routes');
const paymentRoutes = require('./routes/payment.routes');
const commissionRoutes = require('./routes/commission.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Connect to Database
connectDB();

// Security Middleware
app.use(helmetConfig); // Security headers (OWASP)
app.use(cors(getCorsConfig())); // CORS with whitelist

// Body parsing with size limits (prevents DoS)
app.use(express.json(requestSizeLimits.json));
app.use(express.urlencoded(requestSizeLimits.urlencoded));

// Input sanitization (prevents XSS)
app.use(sanitizeInput);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// General rate limiting (prevents DoS)
app.use('/api/', generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Campus Eats API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes with specific rate limiting
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/lounges', loungeRoutes);
app.use('/api/v1/foods', foodRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/commissions', commissionRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
  logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = app;
