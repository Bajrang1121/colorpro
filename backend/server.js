import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdXXFRUZo0y_jEa4gYyHdMiYxxvNd18Cg",
  authDomain: "bdg-game-4f0eb.firebaseapp.com",
  projectId: "bdg-game-4f0eb",
  storageBucket: "bdg-game-4f0eb.firebasestorage.app",
  messagingSenderId: "56509330896",
  appId: "1:56509330896:web:11441164c5755a27a4f5d5",
  measurementId: "G-6PLHRFXKJH"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Express App Setup
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bdg_game';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ MongoDB connected successfully');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// MongoDB Schemas
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  wallet: { type: Number, default: 1000 },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  inviteCode: { type: String, unique: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Helper Functions
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate JWT Token
function generateToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'bdg-game-secret-key-2024',
    { expiresIn: '30d' }
  );
}

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bdg-game-secret-key-2024');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};

// 🔥 ROUTES 🔥

// 1. Health Check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'BDG Game API is running', 
    timestamp: new Date().toISOString() 
  });
});
// Test karne ke liye ki backend live hai
app.get('/', (req, res) => {
    res.send("Backend is Live and Running! ✅");
});

// Aapka login/register route niche hoga...
app.post('/api/register', (req, res) => {
    // register logic
});
// 2. Send OTP for Registration
app.post('/api/auth/send-otp-register', async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid 10-digit phone number required' 
      });
    }
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name is required' 
      });
    }
    
    const phoneNumber = '+91' + phone;
    
    // Check if user already exists
    const existingUser = await User.findOne({ phone: phoneNumber });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number already registered' 
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes
    
    // Save OTP to database (temporary record or update)
    // We'll store in a temporary collection or update existing
    // For now, we'll just simulate sending OTP
    
    // In real app, send OTP via SMS service
    console.log(`OTP for ${phoneNumber}: ${otp}`);
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      phone: phoneNumber,
      otp: otp // In production, don't send OTP in response
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// 3. Register User with OTP Verification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, password, otp } = req.body;
    
    if (!name || !phone || !password || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }
    
    const phoneNumber = '+91' + phone;
    
    // Verify OTP (in real app, check against stored OTP)
    // For demo, we'll accept any 6-digit OTP
    if (otp.length !== 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid OTP' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ phone: phoneNumber });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate invite code
    let inviteCode;
    let isUnique = false;
    while (!isUnique) {
      inviteCode = generateInviteCode();
      const existing = await User.findOne({ inviteCode });
      if (!existing) isUnique = true;
    }
    
    // Create new user
    const newUser = new User({
      name,
      phone: phoneNumber,
      password: hashedPassword,
      inviteCode,
      wallet: 1000, // Starting balance
      isVerified: true,
      createdAt: new Date()
    });
    
    await newUser.save();
    
    // Generate JWT token
    const token = generateToken(newUser._id);
    
    // Remove password from response
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      phone: newUser.phone,
      wallet: newUser.wallet,
      inviteCode: newUser.inviteCode,
      isVerified: newUser.isVerified
    };
    
    res.json({
      success: true,
      message: 'Registration successful',
      token,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// 4. Send OTP for Login
app.post('/api/auth/send-otp-login', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid 10-digit phone number required' 
      });
    }
    
    const phoneNumber = '+91' + phone;
    
    // Check if user exists
    const user = await User.findOne({ phone: phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found. Please register first.' 
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Save OTP to user (temporary)
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes
    await user.save();
    
    // In real app, send OTP via SMS service
    console.log(`Login OTP for ${phoneNumber}: ${otp}`);
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      phone: phoneNumber,
      otp: otp // In production, don't send OTP in response
    });
    
  } catch (error) {
    console.error('Send login OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// 5. Login with OTP
app.post('/api/auth/login-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone and OTP are required' 
      });
    }
    
    const phoneNumber = '+91' + phone;
    
    // Find user
    const user = await User.findOne({ phone: phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Verify OTP (in real app, check against stored OTP with expiry)
    // For demo, we'll accept any 6-digit OTP
    if (otp.length !== 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid OTP' 
      });
    }
    
    // Check if OTP is expired
    if (user.otpExpiry && new Date() > user.otpExpiry) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP expired. Please request a new one.' 
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    // Remove password from response
    const userResponse = {
      id: user._id,
      name: user.name,
      phone: user.phone,
      wallet: user.wallet,
      inviteCode: user.inviteCode,
      isVerified: user.isVerified
    };
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// 6. Login with Password
app.post('/api/auth/login-password', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone and password are required' 
      });
    }
    
    const phoneNumber = '+91' + phone;
    
    // Find user
    const user = await User.findOne({ phone: phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid password' 
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    // Remove password from response
    const userResponse = {
      id: user._id,
      name: user.name,
      phone: user.phone,
      wallet: user.wallet,
      inviteCode: user.inviteCode,
      isVerified: user.isVerified
    };
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// 7. Forgot Password - Send Reset OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid 10-digit phone number required' 
      });
    }
    
    const phoneNumber = '+91' + phone;
    
    // Check if user exists
    const user = await User.findOne({ phone: phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60000); // 15 minutes
    
    // Save reset token
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();
    
    // Generate OTP for verification
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60000);
    await user.save();
    
    // In real app, send OTP via SMS
    console.log(`Reset OTP for ${phoneNumber}: ${otp}`);
    console.log(`Reset Token: ${resetToken}`);
    
    res.json({ 
      success: true, 
      message: 'Reset OTP sent successfully',
      phone: phoneNumber,
      otp: otp // In production, don't send OTP in response
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// 8. Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { phone, otp, newPassword, confirmPassword } = req.body;
    
    if (!phone || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Passwords do not match' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }
    
    const phoneNumber = '+91' + phone;
    
    // Find user
    const user = await User.findOne({ 
      phone: phoneNumber,
      resetToken: { $exists: true },
      resetTokenExpiry: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired reset token' 
      });
    }
    
    // Verify OTP
    if (user.otp !== otp || !user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired OTP' 
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear reset tokens
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.updatedAt = new Date();
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Password reset successful. Please login with new password.'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// 9. Change Password (Logged in user)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'New passwords do not match' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, req.user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current password is incorrect' 
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    req.user.password = hashedPassword;
    req.user.updatedAt = new Date();
    await req.user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// 10. Verify Token/Get User Profile
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const userResponse = {
      id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      wallet: req.user.wallet,
      inviteCode: req.user.inviteCode,
      isVerified: req.user.isVerified,
      createdAt: req.user.createdAt
    };
    
    res.json({
      success: true,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify token' });
  }
});

// 11. Check Phone Availability
app.post('/api/auth/check-phone', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid 10-digit phone number required' 
      });
    }
    
    const phoneNumber = '+91' + phone;
    const existingUser = await User.findOne({ phone: phoneNumber });
    
    res.json({
      success: true,
      exists: !!existingUser,
      phone: phoneNumber
    });
    
  } catch (error) {
    console.error('Check phone error:', error);
    res.status(500).json({ success: false, error: 'Failed to check phone' });
  }
});

// Start server
const PORT = process.env.PORT || 10000; // Render aksar 10000 use karta hai
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

export { app };