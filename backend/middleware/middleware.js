const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Authenticate user by verifying JWT token in cookies
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
 
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role };
 // ✅ FIXED here
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
}

// Authorize based on user roles (e.g., 'admin', 'student')
// Usage: authorizeRoles('admin'), authorizeRoles('admin', 'student')
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user info' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};
