const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();


// Add this to verify it's loaded
console.log('🔐 JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES ✅' : 'NO ❌');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Import Routes (ALL IMPORTS AT TOP)
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const receiptRoutes = require('./routes/receipts'); // ✅ ADD THIS

// Register Routes (BEFORE 404 HANDLER!)
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/receipts', receiptRoutes); // ✅ ADD THIS

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'RideShare API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      rides: '/api/rides',
      users: '/api/users',
      bookings: '/api/bookings',
      payments: '/api/payments',
      payouts: '/api/payouts',
      webhooks: '/api/webhooks',
      receipts: '/api/receipts' // ✅ ADD THIS
    }
  });
});

// 404 handler (MUST BE AFTER ALL ROUTES!)
app.use((req, res, next) => {
  res.status(404).json({ 
    message: 'Route not found',
    requestedUrl: req.originalUrl 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API available at http://localhost:${PORT}`);
});

module.exports = app;