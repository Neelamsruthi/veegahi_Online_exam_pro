const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/middleware');
 
// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
 // GET /api/users/colleges - Get distinct colleges
router.get('/colleges', async (req, res) => {
  try {
    const colleges = await User.distinct('collegeName');
    res.json(colleges);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// routes/userRoutes.js or wherever your user-related routes are defined

// Fetch distinct branches
router.get('/branches', async (req, res) => {
  try {
    const branches = await User.distinct('branch'); // Updated field name
    res.json(branches);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update current user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    // Prevent password update here - handle separately if needed
    delete updates.password;
 
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
 
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
 
module.exports = router;
 
  