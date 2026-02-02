import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

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
const analytics = getAnalytics(firebaseApp);
const auth = getAuth(firebaseApp);

// Express App Setup
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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
  firebaseUid: { type: String, unique: true },
  email: { type: String },
  wallet: { type: Number, default: 1000 },
  bonusBalance: { type: Number, default: 0 },
  inviteCode: { type: String, unique: true },
  referrerCode: { type: String },
  level: { type: String, default: 'Bronze' },
  totalProfit: { type: Number, default: 0 },
  totalWagered: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  teamSize: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  rank: { type: String, default: '#1000+' },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const GameHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameType: { type: String, enum: ['wingo', 'aviator', 'slots'], required: true },
  gameMode: { type: String },
  betAmount: { type: Number, required: true },
  winAmount: { type: Number },
  result: { type: String, enum: ['win', 'loss', 'pending'] },
  selectedOption: { type: String },
  multiplier: { type: Number },
  combination: { type: String },
  period: { type: String },
  details: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'bonus', 'game_win', 'game_loss', 'commission'], required: true },
  amount: { type: Number, required: true },
  method: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  transactionId: { type: String, unique: true },
  upiId: { type: String },
  bankDetails: { type: Object },
  screenshot: { type: String },
  remarks: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const AgentApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  idProof: { type: String },
  addressProof: { type: String },
  experience: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const LiveGameSchema = new mongoose.Schema({
  gameType: { type: String, required: true },
  gameMode: { type: String },
  period: { type: String, unique: true },
  result: { type: String },
  multiplier: { type: Number },
  winningNumber: { type: Number },
  winningColor: { type: String },
  winningSize: { type: String },
  totalBets: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  players: { type: Number, default: 0 },
  status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
  startTime: { type: Date },
  endTime: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const ReferralSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referredId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referrerCode: { type: String, required: true },
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  commissionEarned: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', UserSchema);
const GameHistory = mongoose.model('GameHistory', GameHistorySchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const AgentApplication = mongoose.model('AgentApplication', AgentApplicationSchema);
const LiveGame = mongoose.model('LiveGame', LiveGameSchema);
const Referral = mongoose.model('Referral', ReferralSchema);

// Generate unique invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'bdg-game-secret-key-2024';

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Routes

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'BDG Game API is running', 
    timestamp: new Date().toISOString() 
  });
});

// Firebase Auth Routes
app.post('/api/auth/send-otp', async (req, res) => {
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
    const existingUser = await User.findOne({ phone: phoneNumber });
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully (Firebase Integration Required)',
      phone: phoneNumber,
      userExists: !!existingUser
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, firebaseUid, idToken } = req.body;
    
    if (!name || !phone || !firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, phone and Firebase UID are required' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ phone: phone }, { firebaseUid }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }
    
    // Generate unique invite code
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
      phone,
      firebaseUid,
      inviteCode,
      wallet: 1000, // Starting bonus
      level: 'Bronze',
      createdAt: new Date()
    });
    
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, phone: newUser.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        phone: newUser.phone,
        wallet: newUser.wallet,
        inviteCode: newUser.inviteCode,
        level: newUser.level,
        totalProfit: newUser.totalProfit,
        streak: newUser.streak,
        teamSize: newUser.teamSize,
        commission: newUser.commission,
        rank: newUser.rank
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, firebaseUid, idToken } = req.body;
    
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }
    
    // Find user
    const user = await User.findOne({ phone });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found. Please register first.' 
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        wallet: user.wallet,
        inviteCode: user.inviteCode,
        level: user.level,
        totalProfit: user.totalProfit,
        streak: user.streak,
        teamSize: user.teamSize,
        commission: user.commission,
        rank: user.rank
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Get User Profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        phone: req.user.phone,
        wallet: req.user.wallet,
        bonusBalance: req.user.bonusBalance,
        inviteCode: req.user.inviteCode,
        level: req.user.level,
        totalProfit: req.user.totalProfit,
        totalWagered: req.user.totalWagered,
        gamesPlayed: req.user.gamesPlayed,
        winRate: req.user.winRate,
        streak: req.user.streak,
        teamSize: req.user.teamSize,
        commission: req.user.commission,
        rank: req.user.rank
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

// Update User Balance
app.put('/api/user/balance', authenticateToken, async (req, res) => {
  try {
    const { balance } = req.body;
    
    if (typeof balance !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid balance required' 
      });
    }
    
    req.user.wallet = balance;
    await req.user.save();
    
    res.json({
      success: true,
      message: 'Balance updated',
      balance: req.user.wallet
    });
  } catch (error) {
    console.error('Balance update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update balance' });
  }
});

// Place Bet (WinGo, Aviator, Slots)
app.post('/api/games/place-bet', authenticateToken, async (req, res) => {
  try {
    const { amount, gameType, gameMode, option, autoCashout } = req.body;
    
    if (!amount || !gameType || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid bet amount and game type required' 
      });
    }
    
    // Check if user has enough balance
    if (req.user.wallet < amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient balance' 
      });
    }
    
    // Deduct bet amount
    req.user.wallet -= amount;
    req.user.totalWagered += amount;
    await req.user.save();
    
    // Create game history record
    const gameHistory = new GameHistory({
      userId: req.user._id,
      gameType,
      gameMode,
      betAmount: amount,
      selectedOption: option,
      result: 'pending',
      period: `#${Date.now()}`,
      details: { autoCashout }
    });
    
    await gameHistory.save();
    
    // Create transaction record
    const transaction = new Transaction({
      userId: req.user._id,
      type: 'game_loss',
      amount,
      status: 'completed',
      transactionId: `GAME_${Date.now()}`,
      remarks: `Bet placed on ${gameType}`
    });
    
    await transaction.save();
    
    // For real-time, we would process the game result here
    // For now, return success
    res.json({
      success: true,
      message: 'Bet placed successfully',
      betId: gameHistory._id,
      newBalance: req.user.wallet
    });
  } catch (error) {
    console.error('Place bet error:', error);
    res.status(500).json({ success: false, error: 'Failed to place bet' });
  }
});

// Get Recent Game History
app.get('/api/games/history/recent', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const history = await GameHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    const formattedHistory = history.map(game => ({
      id: game._id,
      game: game.gameType,
      result: game.result,
      amount: game.winAmount || game.betAmount,
      betAmount: game.betAmount,
      option: game.selectedOption,
      multiplier: game.multiplier,
      combination: game.combination,
      period: game.period,
      time: game.createdAt
    }));
    
    res.json({
      success: true,
      history: formattedHistory
    });
  } catch (error) {
    console.error('Game history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get game history' });
  }
});

// Get Live Games Data
app.get('/api/games/live', async (req, res) => {
  try {
    // Get current active games
    const currentTime = new Date();
    
    // Simulate live games data
    const liveGames = {
      wingo: {
        timer: Math.floor(Math.random() * 30) + 1,
        currentNumber: Math.floor(Math.random() * 10),
        currentColor: ['green', 'red', 'violet'][Math.floor(Math.random() * 3)],
        lastResult: Math.floor(Math.random() * 10),
        lastColor: ['green', 'red', 'violet'][Math.floor(Math.random() * 3)]
      },
      aviator: {
        current: (Math.random() * 5 + 1).toFixed(2),
        lastRound: (Math.random() * 10 + 1).toFixed(2),
        players: Math.floor(Math.random() * 500) + 100,
        totalBet: Math.floor(Math.random() * 100000) + 50000
      },
      slots: {
        players: Math.floor(Math.random() * 300) + 50,
        lastWin: Math.floor(Math.random() * 5000) + 1000,
        lastCombination: ['3 Diamonds', '3 Gems', '3 Crowns'][Math.floor(Math.random() * 3)]
      }
    };
    
    res.json({
      success: true,
      games: liveGames
    });
  } catch (error) {
    console.error('Live games error:', error);
    res.status(500).json({ success: false, error: 'Failed to get live games data' });
  }
});

// Deposit Request
app.post('/api/transactions/deposit', authenticateToken, async (req, res) => {
  try {
    const { amount, method, upiId, screenshot } = req.body;
    
    if (!amount || amount < 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Minimum deposit amount is ₹100' 
      });
    }
    
    // Create deposit transaction
    const transaction = new Transaction({
      userId: req.user._id,
      type: 'deposit',
      amount,
      method,
      upiId,
      screenshot,
      status: 'pending',
      transactionId: `DEP_${Date.now()}`,
      remarks: `Deposit via ${method}`
    });
    
    await transaction.save();
    
    // In real app, this would be processed after verification
    // For demo, auto approve
    setTimeout(async () => {
      transaction.status = 'completed';
      await transaction.save();
      
      req.user.wallet += amount;
      await req.user.save();
      
      // Notify user via WebSocket if connected
      io.to(req.user._id.toString()).emit('deposit_completed', {
        amount,
        newBalance: req.user.wallet
      });
    }, 2000);
    
    res.json({
      success: true,
      message: 'Deposit request submitted',
      transactionId: transaction.transactionId,
      status: 'pending'
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ success: false, error: 'Failed to process deposit' });
  }
});

// Withdrawal Request
app.post('/api/transactions/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, method, upiId, bankDetails } = req.body;
    
    if (!amount || amount < 500) {
      return res.status(400).json({ 
        success: false, 
        error: 'Minimum withdrawal amount is ₹500' 
      });
    }
    
    if (req.user.wallet < amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient balance' 
      });
    }
    
    // Deduct amount immediately
    req.user.wallet -= amount;
    await req.user.save();
    
    // Create withdrawal transaction
    const transaction = new Transaction({
      userId: req.user._id,
      type: 'withdrawal',
      amount,
      method,
      upiId,
      bankDetails,
      status: 'pending',
      transactionId: `WDL_${Date.now()}`,
      remarks: `Withdrawal via ${method}`
    });
    
    await transaction.save();
    
    res.json({
      success: true,
      message: 'Withdrawal request submitted',
      transactionId: transaction.transactionId,
      status: 'pending',
      newBalance: req.user.wallet
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to process withdrawal' });
  }
});

// Get Transaction History
app.get('/api/transactions/history', authenticateToken, async (req, res) => {
  try {
    const { type, limit } = req.query;
    
    const query = { userId: req.user._id };
    if (type && type !== 'all') {
      query.type = type;
    }
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 20)
      .lean();
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get transaction history' });
  }
});

// Apply as Agent
app.post('/api/agent/apply', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, email, address, experience } = req.body;
    
    if (!firstName || !lastName || !phone || !email || !address) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }
    
    // Check if already applied
    const existingApplication = await AgentApplication.findOne({ 
      $or: [{ userId: req.user._id }, { email }, { phone }] 
    });
    
    if (existingApplication) {
      return res.status(400).json({ 
        success: false, 
        error: 'Application already submitted' 
      });
    }
    
    // Create agent application
    const application = new AgentApplication({
      userId: req.user._id,
      firstName,
      lastName,
      phone,
      email,
      address,
      experience,
      status: 'pending'
    });
    
    await application.save();
    
    res.json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: application._id
    });
  } catch (error) {
    console.error('Agent application error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit application' });
  }
});

// Claim Welcome Bonus
app.post('/api/bonus/welcome', authenticateToken, async (req, res) => {
  try {
    // Check if already claimed
    const existingBonus = await Transaction.findOne({
      userId: req.user._id,
      type: 'bonus',
      remarks: 'Welcome Bonus'
    });
    
    if (existingBonus) {
      return res.status(400).json({ 
        success: false, 
        error: 'Welcome bonus already claimed' 
      });
    }
    
    const bonusAmount = 500;
    
    // Add bonus to wallet
    req.user.wallet += bonusAmount;
    req.user.bonusBalance += bonusAmount;
    await req.user.save();
    
    // Create bonus transaction
    const transaction = new Transaction({
      userId: req.user._id,
      type: 'bonus',
      amount: bonusAmount,
      status: 'completed',
      transactionId: `BONUS_${Date.now()}`,
      remarks: 'Welcome Bonus'
    });
    
    await transaction.save();
    
    res.json({
      success: true,
      message: 'Welcome bonus claimed successfully',
      amount: bonusAmount,
      newBalance: req.user.wallet
    });
  } catch (error) {
    console.error('Welcome bonus error:', error);
    res.status(500).json({ success: false, error: 'Failed to claim welcome bonus' });
  }
});

// Get Referral Info
app.get('/api/referrals/info', authenticateToken, async (req, res) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user._id })
      .populate('referredId', 'name phone createdAt')
      .lean();
    
    const totalEarned = referrals.reduce((sum, ref) => sum + ref.commissionEarned, 0);
    const pending = referrals.filter(ref => ref.status === 'pending').length;
    const completed = referrals.filter(ref => ref.status === 'completed').length;
    
    res.json({
      success: true,
      referralCode: req.user.inviteCode,
      totalReferrals: referrals.length,
      totalEarned,
      pending,
      completed,
      referrals: referrals.slice(0, 10)
    });
  } catch (error) {
    console.error('Referral info error:', error);
    res.status(500).json({ success: false, error: 'Failed to get referral info' });
  }
});

// WebSocket Connection for Real-time Data
io.on('connection', (socket) => {
  console.log('🔌 New WebSocket connection:', socket.id);
  
  socket.on('authenticate', async (data) => {
    try {
      const { token } = data;
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      // Join user room
      socket.join(user._id.toString());
      socket.userId = user._id;
      
      socket.emit('authenticated', { 
        message: 'WebSocket authenticated',
        userId: user._id 
      });
      
      console.log(`✅ User ${user._id} connected to WebSocket`);
    } catch (error) {
      console.error('WebSocket auth error:', error);
      socket.emit('error', { message: 'Authentication failed' });
    }
  });
  
  socket.on('subscribe_game', (data) => {
    const { gameType, gameMode } = data;
    const room = `${gameType}_${gameMode}`;
    socket.join(room);
    console.log(`User subscribed to ${room}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 WebSocket disconnected:', socket.id);
  });
});

// Start game simulation intervals
function startGameSimulations() {
  // WinGo 30s Game Simulation
  setInterval(async () => {
    try {
      const period = `WINGO_${Date.now()}`;
      const winningNumber = Math.floor(Math.random() * 10);
      const winningColor = winningNumber === 0 ? 'green' : 
                         (winningNumber >= 1 && winningNumber <= 4) ? 'red' : 'violet';
      const winningSize = winningNumber >= 5 ? 'big' : 'small';
      
      // Save live game result
      const liveGame = new LiveGame({
        gameType: 'wingo',
        gameMode: '30',
        period,
        winningNumber,
        winningColor,
        winningSize,
        status: 'completed',
        endTime: new Date()
      });
      
      await liveGame.save();
      
      // Notify all subscribed clients
      io.to('wingo_30').emit('wingo_result', {
        period,
        winningNumber,
        winningColor,
        winningSize,
        timestamp: new Date()
      });
      
      // Process pending bets
      const pendingBets = await GameHistory.find({
        gameType: 'wingo',
        gameMode: '30',
        result: 'pending',
        createdAt: { $gte: new Date(Date.now() - 35000) }
      });
      
      for (const bet of pendingBets) {
        const user = await User.findById(bet.userId);
        if (!user) continue;
        
        let isWin = false;
        let winAmount = 0;
        const multiplier = bet.selectedOption === winningNumber.toString() ? 9 : 1.9;
        
        if (bet.selectedOption === 'Green' && winningColor === 'green') isWin = true;
        if (bet.selectedOption === 'Red' && winningColor === 'red') isWin = true;
        if (bet.selectedOption === 'Violet' && (winningNumber === 0 || winningNumber === 5)) isWin = true;
        if (bet.selectedOption === 'Big' && winningNumber >= 5) isWin = true;
        if (bet.selectedOption === 'Small' && winningNumber < 5 && winningNumber !== 0) isWin = true;
        if (bet.selectedOption === winningNumber.toString()) isWin = true;
        
        if (isWin) {
          winAmount = bet.betAmount * multiplier;
          user.wallet += winAmount;
          user.totalProfit += winAmount - bet.betAmount;
          user.gamesPlayed += 1;
          
          bet.result = 'win';
          bet.winAmount = winAmount;
          bet.multiplier = multiplier;
        } else {
          bet.result = 'loss';
          user.gamesPlayed += 1;
        }
        
        await user.save();
        await bet.save();
        
        // Create transaction
        const transaction = new Transaction({
          userId: user._id,
          type: isWin ? 'game_win' : 'game_loss',
          amount: isWin ? winAmount : bet.betAmount,
          status: 'completed',
          transactionId: `GAME_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          remarks: `WinGo 30s ${isWin ? 'Win' : 'Loss'}`
        });
        
        await transaction.save();
        
        // Notify user
        io.to(user._id.toString()).emit('game_result', {
          gameId: bet._id,
          result: isWin ? 'win' : 'loss',
          amount: isWin ? winAmount : bet.betAmount,
          newBalance: user.wallet
        });
      }
    } catch (error) {
      console.error('WinGo simulation error:', error);
    }
  }, 30000);
  
  // Aviator Game Simulation
  setInterval(async () => {
    try {
      const crashPoint = (Math.random() * 10 + 1.1).toFixed(2);
      const period = `AVIATOR_${Date.now()}`;
      
      // Save live game result
      const liveGame = new LiveGame({
        gameType: 'aviator',
        period,
        multiplier: crashPoint,
        status: 'completed',
        endTime: new Date()
      });
      
      await liveGame.save();
      
      // Notify all subscribed clients
      io.to('aviator').emit('aviator_result', {
        period,
        multiplier: crashPoint,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Aviator simulation error:', error);
    }
  }, 15000);
}

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 Backend URL: https://colorpro-vfgm.onrender.com`);
  
  // Start game simulations
  startGameSimulations();
});

export { app, httpServer };