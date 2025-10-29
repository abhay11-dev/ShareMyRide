const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");

const app = express(); // ✅ You must initialize app first!

app.use(cors({
  origin: [
    "https://share-my-ride-git-main-abhays-projects-cdb9056e.vercel.app",
    "https://share-my-ride.vercel.app", // (optional future production)
    "http://localhost:5173" // for local testing
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));





console.log('🔐 JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES ✅' : 'NO ❌');

app.use(express.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const receiptRoutes = require('./routes/receipts');

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/receipts', receiptRoutes);

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
      receipts: '/api/receipts'
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    requestedUrl: req.originalUrl 
  });
});

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
