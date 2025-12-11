/**
 * Security Configuration
 * Comprehensive security settings following OWASP standards
 */

const helmet = require('helmet');

/**
 * Helmet configuration for security headers
 * Follows OWASP Security Headers best practices
 */
const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  
  // Prevents clickjacking attacks
  frameguard: {
    action: 'deny'
  },
  
  // Prevents MIME type sniffing
  noSniff: true,
  
  // Enables XSS filter in older browsers
  xssFilter: true,
  
  // Hides X-Powered-By header
  hidePoweredBy: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

/**
 * CORS configuration
 */
const getCorsConfig = () => {
  const whitelist = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [];
  
  // In development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    whitelist.push('http://localhost:3001', 'http://localhost:3000');
  }
  
  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
};

/**
 * Request size limits to prevent DoS attacks
 * 1MB is appropriate for API requests (food descriptions, images as URLs)
 * Increase only if handling direct file uploads
 */
const requestSizeLimits = {
  json: { limit: '1mb' },
  urlencoded: { limit: '1mb', extended: true }
};

module.exports = {
  helmetConfig,
  getCorsConfig,
  requestSizeLimits
};
