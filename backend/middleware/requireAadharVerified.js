// Middleware to require Aadhar verification
exports.requireAadharVerified = (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!user.aadharVerified) {
      // Exact message required by UI
      return res.status(403).json({ success: false, message: 'Please verify Aadhar', code: 'AADHAR_REQUIRED' });
    }

    next();
  } catch (err) {
    console.error('requireAadharVerified error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
