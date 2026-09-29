import rateLimit from 'express-rate-limit';

/**
 * Global API Rate Limiter
 * 1000 requests per 15 minutes per IP (relaxed in test mode)
 */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Global API rate limit exceeded. Please try again after 15 minutes.'
  }
});

/**
 * Stricter Authentication Login Limiter
 * 60 attempts per 15 minutes per IP to prevent brute-force attacks
 */
export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many login attempts. Please try again after 15 minutes.'
  }
});
