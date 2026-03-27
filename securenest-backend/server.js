const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Enable CORS early to prevent pre-flight blocks
app.use(express.json());

// Security Middlewares (Hardened but optimized for Vault high-velocity assets)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images/blobs from backend to be read by frontend
  contentSecurityPolicy: false, // Disable CSP for now to prevent strict domain blocking during production migration
})); 
app.use(mongoSanitize()); 

// Brute-force protection (Increased for high-velocity thumbnail generation)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, // Increased to 1000 to prevent thumbnail loading from triggering blocks
  message: 'Too many vault requests. Security throttle active. Try again in 15 mins.'
});
app.use('/api/', limiter);

// Routes
const authRoutes = require('./src/routes/auth');
const storageRoutes = require('./src/routes/storage');
const otpRoutes = require('./src/routes/otp');

app.use('/api/auth', authRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/otp', otpRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.send('SecureNest API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
