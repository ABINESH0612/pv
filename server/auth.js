require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'pv_nutrition_jwt_secret_key_2026_health_is_wealth';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please login again.' });
    }

    // Module 4: Ensure deactivated accounts cannot continue using protected functionality
    const freshUser = db.findUserById(decodedUser.id);
    if (freshUser && freshUser.is_active === false) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact support.' });
    }

    req.user = decodedUser;
    next();
  });
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = {
  generateToken,
  authenticateToken,
  requireRole
};
