const admin = require('../config/firebaseAdmin');

const requireFirebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Missing authorization token',
      });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }
};

module.exports = requireFirebaseAuth;
