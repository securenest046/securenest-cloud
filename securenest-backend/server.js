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

// Security Middlewares
app.use(helmet()); // Protects against common web vulnerabilities by setting HTTP headers
app.use(mongoSanitize()); // Prevents NoSQL injection

// Brute-force protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Middleware
app.use(cors());
app.use(express.json());

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
