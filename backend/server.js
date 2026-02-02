const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const WebSocket = require('ws');
const http = require('http');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ✅ WebSocket Server
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false,
  clientTracking: true
});

// ✅ CORS Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static files
app.use(express.static('public'));
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ✅ MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bdg_game';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).then(() => {
  console.log('✅ MongoDB Connected');
}).catch(err => {
  console.log('❌ MongoDB Error:', err.message);
});

// ✅ Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// ✅ Schemas
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  permissions: { type: Array, default: ['all'] },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true },
  name: { type: String, default: 'Player' },
  password: { type: String, required: true },
  wallet: { type: Number, default: 1000 },
  inviteCode: { type: String, unique: true },
  referredBy: { type: String },
  level: { type: String, default: 'Silver' },
  totalProfit: { type: Number, default: 0 },
  totalDeposit: { type: Number, default: 0 },
  totalWithdraw: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
  teamSize: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  rank: { type: String, default: '#1000' },
  lastBonusClaim: { type: Date },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const gameSettingsSchema = new mongoose.Schema({
  gameMode: { type: String, required: true, unique: true },
  duration: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  minBet: { type: Number, default: 10 },
  maxBet: { type: Number, default: 50000 },
  winPercentage: { type: Number, default: 50 },
  manipulationMode: { type: String, default: 'low_bet' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const betSchema = new mongoose.Schema({
  betId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  mobile: { type: String, required: true },
  period: { type: String, required: true },
  gameMode: { type: String, required: true },
  gameType: { type: String, required: true },
  amount: { type: Number, required: true },
  option: { type: String, required: true },
  betType: { type: String, default: 'single' },
  status: { type: String, default: 'pending' },
  winAmount: { type: Number, default: 0 },
  resultNumber: { type: Number },
  resultColor: { type: String },
  resultSmallBig: { type: String },
  commission: { type: Number, default: 0 },
  placedAt: { type: Date, default: Date.now },
  settledAt: { type: Date }
});

const gameResultSchema = new mongoose.Schema({
  periodId: { type: String, required: true, unique: true },
  gameMode: { type: String, required: true },
  gameType: { type: String, required: true },
  number: { type: Number },
  color: { type: String },
  smallBig: { type: String },
  crashPoint: { type: Number },
  slotsResult: { type: Array },
  totalBets: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  manipulated: { type: Boolean, default: false },
  manipulationType: { type: String },
  adminSet: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const depositSchema = new mongoose.Schema({
  depositId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  mobile: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  upiId: { type: String },
  bankDetails: { type: Object },
  screenshot: { type: String },
  status: { type: String, default: 'pending' },
  approvedBy: { type: String },
  adminNotes: { type: String },
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date }
});

const withdrawalSchema = new mongoose.Schema({
  withdrawalId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  mobile: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  accountDetails: { type: Object, required: true },
  status: { type: String, default: 'pending' },
  approvedBy: { type: String },
  adminNotes: { type: String },
  utr: { type: String },
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date }
});

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  balanceBefore: { type: Number },
  balanceAfter: { type: Number },
  referenceId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const adminLogSchema = new mongoose.Schema({
  adminId: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: Object },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const agentApplicationSchema = new mongoose.Schema({
  applicationId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  mobile: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  experience: { type: String },
  teamSize: { type: Number, default: 0 },
  expectedCommission: { type: Number },
  status: { type: String, default: 'pending' },
  adminNotes: { type: String },
  approvedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date }
});

// ✅ Models
const Admin = mongoose.model('Admin', adminSchema);
const User = mongoose.model('User', userSchema);
const GameSettings = mongoose.model('GameSettings', gameSettingsSchema);
const Bet = mongoose.model('Bet', betSchema);
const GameResult = mongoose.model('GameResult', gameResultSchema);
const Deposit = mongoose.model('Deposit', depositSchema);
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const AdminLog = mongoose.model('AdminLog', adminLogSchema);
const AgentApplication = mongoose.model('AgentApplication', agentApplicationSchema);

// ✅ Game Configuration
const gameModes = {
  '30': { duration: 30, name: '30 Seconds', type: 'wingo' },
  '60': { duration: 60, name: '1 Minute', type: 'wingo' },
  '180': { duration: 180, name: '3 Minutes', type: 'wingo' },
  '300': { duration: 300, name: '5 Minutes', type: 'wingo' },
  'aviator': { duration: 10, name: 'Aviator', type: 'aviator' },
  'slots': { duration: 5, name: 'Slots', type: 'slots' }
};

// ✅ Game States
let gameTimers = {};
let gameIntervals = {};
let gameStates = {};
const clients = new Map();
const aviatorGames = new Map();
const slotsGames = new Map();

// ✅ Initialize Game Timers
async function initializeGameTimers() {
  try {
    for (const [mode, config] of Object.entries(gameModes)) {
      const existing = await GameSettings.findOne({ gameMode: mode });
      if (!existing) {
        await GameSettings.create({
          gameMode: mode,
          duration: config.duration,
          name: config.name,
          minBet: 10,
          maxBet: 50000,
          winPercentage: 50,
          manipulationMode: 'low_bet'
        });
      }
      
      if (config.type === 'wingo') {
        gameTimers[mode] = {
          timer: config.duration,
          period: generatePeriodId(mode),
          lastUpdate: Date.now(),
          isRunning: true,
          totalBets: 0,
          betSummary: {
            red: 0,
            green: 0,
            violet: 0,
            big: 0,
            small: 0,
            numbers: {0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
          }
        };
        
        gameIntervals[mode] = setInterval(() => {
          updateWingoTimer(mode);
        }, 1000);
      } else if (config.type === 'aviator') {
        gameStates[mode] = {
          status: 'waiting',
          multiplier: 1.00,
          crashPoint: null,
          startTime: null,
          bets: []
        };
        
        startAviatorRound(mode);
      } else if (config.type === 'slots') {
        gameStates[mode] = {
          status: 'idle',
          spinning: false,
          lastResult: null
        };
      }
    }
    
    console.log('✅ Game timers initialized for all games');
  } catch (error) {
    console.error('❌ Error initializing game timers:', error);
  }
}

// ✅ Generate Period ID
function generatePeriodId(gameMode) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

// ✅ WinGo Timer Update
function updateWingoTimer(gameMode) {
  if (!gameTimers[gameMode] || !gameTimers[gameMode].isRunning) return;
  
  gameTimers[gameMode].timer -= 1;
  
  if (gameTimers[gameMode].timer <= 0) {
    generateWingoResult(gameMode);
    gameTimers[gameMode].timer = gameModes[gameMode].duration;
    gameTimers[gameMode].period = generatePeriodId(gameMode);
    gameTimers[gameMode].betSummary = {
      red: 0,
      green: 0,
      violet: 0,
      big: 0,
      small: 0,
      numbers: {0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
    };
  }
  
  broadcastWingoUpdate(gameMode);
}

// ✅ Generate WinGo Result with Low Bet Logic
async function generateWingoResult(gameMode) {
  try {
    const periodId = gameTimers[gameMode].period;
    const betSummary = gameTimers[gameMode].betSummary;
    
    const settings = await GameSettings.findOne({ gameMode });
    const manipulationMode = settings?.manipulationMode || 'low_bet';
    
    let resultNumber, resultColor, resultSize;
    
    if (manipulationMode === 'low_bet') {
      const winningOption = getLowestBetOption(betSummary);
      resultNumber = generateNumberForOption(winningOption);
      resultColor = getColorFromNumber(resultNumber);
      resultSize = getSizeFromNumber(resultNumber);
    } else {
      resultNumber = Math.floor(Math.random() * 10);
      resultColor = getColorFromNumber(resultNumber);
      resultSize = getSizeFromNumber(resultNumber);
    }
    
    const gameResult = new GameResult({
      periodId,
      gameMode,
      gameType: 'wingo',
      number: resultNumber,
      color: resultColor,
      smallBig: resultSize,
      totalBets: betSummary.red + betSummary.green + betSummary.violet + 
                 betSummary.big + betSummary.small + 
                 Object.values(betSummary.numbers).reduce((a, b) => a + b, 0),
      totalAmount: betSummary.red + betSummary.green + betSummary.violet + 
                   betSummary.big + betSummary.small + 
                   Object.values(betSummary.numbers).reduce((a, b) => a + b, 0),
      manipulated: manipulationMode === 'low_bet',
      manipulationType: manipulationMode
    });
    
    await gameResult.save();
    await settleWingoBets(gameMode, periodId, resultNumber, resultColor, resultSize);
    
    broadcastWingoResult(gameMode, periodId, {
      number: resultNumber,
      color: resultColor,
      smallBig: resultSize
    });
    
    console.log(`🎯 WinGo ${gameMode}s Result: ${resultNumber} ${resultColor} ${resultSize}`);
    
  } catch (error) {
    console.error('❌ Error generating WinGo result:', error);
  }
}

// ✅ Get Lowest Bet Option
function getLowestBetOption(betSummary) {
  const options = [];
  
  if (betSummary.green > 0) options.push({ type: 'color', value: 'green', amount: betSummary.green });
  if (betSummary.red > 0) options.push({ type: 'color', value: 'red', amount: betSummary.red });
  if (betSummary.violet > 0) options.push({ type: 'color', value: 'violet', amount: betSummary.violet });
  if (betSummary.big > 0) options.push({ type: 'size', value: 'big', amount: betSummary.big });
  if (betSummary.small > 0) options.push({ type: 'size', value: 'small', amount: betSummary.small });
  
  for (let i = 0; i <= 9; i++) {
    if (betSummary.numbers[i] > 0) {
      options.push({ type: 'number', value: i.toString(), amount: betSummary.numbers[i] });
    }
  }
  
  if (options.length === 0) {
    return { type: 'random', value: Math.floor(Math.random() * 10) };
  }
  
  options.sort((a, b) => a.amount - b.amount);
  return options[0];
}

// ✅ Generate Number for Winning Option
function generateNumberForOption(option) {
  if (option.type === 'random') return option.value;
  
  if (option.type === 'color') {
    const colorNumbers = {
      'green': [1, 3, 7, 9],
      'red': [2, 4, 6, 8],
      'violet': [0, 5]
    };
    const numbers = colorNumbers[option.value];
    return numbers[Math.floor(Math.random() * numbers.length)];
  }
  
  if (option.type === 'size') {
    const sizeNumbers = {
      'big': [5, 6, 7, 8, 9],
      'small': [0, 1, 2, 3, 4]
    };
    const numbers = sizeNumbers[option.value];
    return numbers[Math.floor(Math.random() * numbers.length)];
  }
  
  if (option.type === 'number') {
    return parseInt(option.value);
  }
  
  return Math.floor(Math.random() * 10);
}

// ✅ Helper Functions
function getColorFromNumber(number) {
  if (number === 0 || number === 5) return 'violet';
  if (number % 2 === 0) return 'red';
  return 'green';
}

function getSizeFromNumber(number) {
  return number >= 5 ? 'big' : 'small';
}

// ✅ Settle WinGo Bets
async function settleWingoBets(gameMode, periodId, resultNumber, resultColor, resultSize) {
  try {
    const pendingBets = await Bet.find({
      gameMode,
      period: periodId,
      gameType: 'wingo',
      status: 'pending'
    });
    
    for (const bet of pendingBets) {
      let isWin = false;
      let winAmount = 0;
      let multiplier = 1.98;
      
      if (bet.option === 'Green' && resultColor === 'green') isWin = true;
      if (bet.option === 'Red' && resultColor === 'red') isWin = true;
      if (bet.option === 'Violet' && resultColor === 'violet') isWin = true;
      if (bet.option === 'Big' && resultSize === 'big') isWin = true;
      if (bet.option === 'Small' && resultSize === 'small') isWin = true;
      if (parseInt(bet.option) === resultNumber) {
        isWin = true;
        multiplier = 9;
      }
      
      if (isWin) {
        winAmount = bet.amount * multiplier;
        bet.status = 'win';
        bet.winAmount = winAmount;
        
        const user = await User.findOne({ userId: bet.userId });
        if (user) {
          user.wallet += winAmount;
          user.totalProfit += (winAmount - bet.amount);
          await user.save();
        }
      } else {
        bet.status = 'loss';
      }
      
      bet.resultNumber = resultNumber;
      bet.resultColor = resultColor;
      bet.resultSmallBig = resultSize;
      bet.settledAt = new Date();
      await bet.save();
      
      notifyUser(bet.userId, {
        type: 'BET_RESULT',
        betId: bet.betId,
        status: isWin ? 'win' : 'loss',
        winAmount,
        result: {
          number: resultNumber,
          color: resultColor,
          size: resultSize
        }
      });
    }
  } catch (error) {
    console.error('❌ Error settling WinGo bets:', error);
  }
}

// ✅ Aviator Game Logic
function startAviatorRound(gameMode) {
  gameStates[gameMode].status = 'waiting';
  gameStates[gameMode].multiplier = 1.00;
  gameStates[gameMode].crashPoint = generateCrashPoint();
  gameStates[gameMode].startTime = Date.now() + 5000;
  gameStates[gameMode].bets = [];
  
  broadcastAviatorUpdate(gameMode, {
    type: 'NEW_ROUND',
    crashPoint: gameStates[gameMode].crashPoint,
    startTime: gameStates[gameMode].startTime
  });
  
  setTimeout(() => {
    startAviatorFlight(gameMode);
  }, 5000);
}

function generateCrashPoint() {
  return 1.2 + Math.random() * 8.8;
}

function startAviatorFlight(gameMode) {
  gameStates[gameMode].status = 'flying';
  gameStates[gameMode].multiplier = 1.00;
  
  const interval = setInterval(() => {
    if (gameStates[gameMode].status !== 'flying') {
      clearInterval(interval);
      return;
    }
    
    gameStates[gameMode].multiplier += 0.05 + Math.random() * 0.15;
    
    if (gameStates[gameMode].multiplier >= gameStates[gameMode].crashPoint) {
      gameStates[gameMode].status = 'crashed';
      clearInterval(interval);
      settleAviatorBets(gameMode);
      setTimeout(() => startAviatorRound(gameMode), 3000);
    }
    
    broadcastAviatorUpdate(gameMode, {
      type: 'MULTIPLIER_UPDATE',
      multiplier: gameStates[gameMode].multiplier
    });
  }, 100);
}

async function settleAviatorBets(gameMode) {
  try {
    for (const bet of gameStates[gameMode].bets) {
      if (bet.cashedOut) {
        const winAmount = bet.amount * bet.cashoutMultiplier;
        
        const user = await User.findOne({ userId: bet.userId });
        if (user) {
          user.wallet += winAmount;
          user.totalProfit += (winAmount - bet.amount);
          await user.save();
        }
        
        await Bet.findOneAndUpdate(
          { betId: bet.betId },
          { 
            status: 'win',
            winAmount,
            settledAt: new Date()
          }
        );
      } else {
        await Bet.findOneAndUpdate(
          { betId: bet.betId },
          { 
            status: 'loss',
            settledAt: new Date()
          }
        );
      }
    }
    
    const gameResult = new GameResult({
      periodId: `AVIATOR_${Date.now()}`,
      gameMode: 'aviator',
      gameType: 'aviator',
      crashPoint: gameStates[gameMode].crashPoint,
      totalBets: gameStates[gameMode].bets.length,
      totalAmount: gameStates[gameMode].bets.reduce((sum, bet) => sum + bet.amount, 0),
      timestamp: new Date()
    });
    
    await gameResult.save();
    
    broadcastAviatorUpdate(gameMode, {
      type: 'CRASH',
      crashPoint: gameStates[gameMode].crashPoint,
      finalMultiplier: gameStates[gameMode].multiplier
    });
    
  } catch (error) {
    console.error('❌ Error settling Aviator bets:', error);
  }
}

// ✅ Slots Game Logic
async function spinSlots(userId, amount) {
  try {
    const symbols = ['diamond', 'gem', 'crown', 'seven', 'bar'];
    const result = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];
    
    let winAmount = 0;
    let multiplier = 0;
    
    if (result[0] === result[1] && result[1] === result[2]) {
      const multipliers = {
        'diamond': 50,
        'gem': 25,
        'crown': 15,
        'seven': 10,
        'bar': 5
      };
      multiplier = multipliers[result[0]];
      winAmount = amount * multiplier;
    }
    
    const bet = new Bet({
      betId: `SLOTS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      mobile: 'slots_user',
      period: `SLOTS_${Date.now()}`,
      gameMode: 'slots',
      gameType: 'slots',
      amount,
      option: result.join(','),
      status: winAmount > 0 ? 'win' : 'loss',
      winAmount,
      placedAt: new Date(),
      settledAt: new Date()
    });
    
    await bet.save();
    
    if (winAmount > 0) {
      const user = await User.findOne({ userId });
      if (user) {
        user.wallet += winAmount;
        user.totalProfit += (winAmount - amount);
        await user.save();
      }
    }
    
    const gameResult = new GameResult({
      periodId: bet.period,
      gameMode: 'slots',
      gameType: 'slots',
      slotsResult: result,
      totalBets: 1,
      totalAmount: amount,
      timestamp: new Date()
    });
    
    await gameResult.save();
    
    return {
      success: true,
      result,
      winAmount,
      multiplier,
      newBalance: winAmount > 0 ? winAmount : 0
    };
    
  } catch (error) {
    console.error('❌ Error spinning slots:', error);
    return { success: false, error: 'Spin failed' };
  }
}

// ✅ WebSocket Server
wss.on('connection', (ws, req) => {
  const clientId = Date.now().toString();
  console.log(`🔗 New WebSocket connection: ${clientId}`);
  
  ws.isAlive = true;
  ws.userId = null;
  ws.gameMode = '30';
  
  const pingInterval = setInterval(() => {
    if (ws.isAlive === false) {
      ws.terminate();
      clearInterval(pingInterval);
      return;
    }
    
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (e) {
      console.log('Ping error, closing connection');
      ws.terminate();
      clearInterval(pingInterval);
    }
  }, 30000);
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'AUTHENTICATE') {
        ws.userId = data.userId || 'demo';
        ws.gameMode = data.gameMode || '30';
        
        if (data.userId && data.userId.startsWith('DEMO_')) {
          ws.isDemo = true;
        }
        
        clients.set(ws.userId, ws);
        
        ws.send(JSON.stringify({
          type: 'AUTHENTICATED',
          userId: ws.userId,
          gameMode: ws.gameMode
        }));
        
        sendInitialGameData(ws, ws.gameMode);
      }
      
      else if (data.type === 'GET_GAME_DATA') {
        sendInitialGameData(ws, data.gameMode || '30');
      }
      
      else if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
      
      else if (data.type === 'PLACE_BET') {
        handlePlaceBet(data, ws);
      }
      
      else if (data.type === 'AVIATOR_CASHOUT') {
        handleAviatorCashout(data, ws);
      }
      
      else if (data.type === 'SPIN_SLOTS') {
        handleSpinSlots(data, ws);
      }
      
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid message format'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: ${clientId}`);
    clearInterval(pingInterval);
    
    if (ws.userId) {
      clients.delete(ws.userId);
    }
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error:`, error);
    clearInterval(pingInterval);
  });
  
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'WebSocket connected successfully',
    clientId
  }));
});

// ✅ WebSocket Helper Functions
function sendInitialGameData(ws, gameMode) {
  if (gameModes[gameMode].type === 'wingo' && gameTimers[gameMode]) {
    ws.send(JSON.stringify({
      type: 'WINGO_UPDATE',
      timer: gameTimers[gameMode].timer,
      period: gameTimers[gameMode].period,
      gameMode
    }));
  } else if (gameModes[gameMode].type === 'aviator' && gameStates[gameMode]) {
    ws.send(JSON.stringify({
      type: 'AVIATOR_UPDATE',
      status: gameStates[gameMode].status,
      multiplier: gameStates[gameMode].multiplier,
      crashPoint: gameStates[gameMode].crashPoint,
      startTime: gameStates[gameMode].startTime,
      gameMode
    }));
  }
}

function broadcastWingoUpdate(gameMode) {
  if (!gameTimers[gameMode]) return;
  
  const update = {
    type: 'WINGO_UPDATE',
    timer: gameTimers[gameMode].timer,
    period: gameTimers[gameMode].period,
    gameMode
  };
  
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.gameMode === gameMode) {
      client.send(JSON.stringify(update));
    }
  });
}

function broadcastWingoResult(gameMode, periodId, result) {
  const resultData = {
    type: 'WINGO_RESULT',
    gameMode,
    period: periodId,
    result,
    timestamp: Date.now()
  };
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(resultData));
    }
  });
}

function broadcastAviatorUpdate(gameMode, data) {
  const update = {
    ...data,
    gameMode
  };
  
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.gameMode === 'aviator') {
      client.send(JSON.stringify(update));
    }
  });
}

function notifyUser(userId, data) {
  const client = clients.get(userId);
  if (client && client.readyState === 1) {
    client.send(JSON.stringify(data));
  }
}

// ✅ WebSocket Handlers
async function handlePlaceBet(data, ws) {
  try {
    const { amount, option, gameMode, period, gameType } = data;
    
    if (gameType === 'wingo') {
      if (gameTimers[gameMode]) {
        if (option === 'Green') gameTimers[gameMode].betSummary.green += amount;
        else if (option === 'Red') gameTimers[gameMode].betSummary.red += amount;
        else if (option === 'Violet') gameTimers[gameMode].betSummary.violet += amount;
        else if (option === 'Big') gameTimers[gameMode].betSummary.big += amount;
        else if (option === 'Small') gameTimers[gameMode].betSummary.small += amount;
        else if (!isNaN(parseInt(option))) {
          gameTimers[gameMode].betSummary.numbers[parseInt(option)] += amount;
        }
        
        gameTimers[gameMode].totalBets += amount;
      }
    } else if (gameType === 'aviator') {
      if (gameStates[gameMode] && gameStates[gameMode].status === 'waiting') {
        const betId = `AVIATOR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        gameStates[gameMode].bets.push({
          betId,
          userId: ws.userId,
          amount,
          cashedOut: false,
          cashoutMultiplier: null
        });
      }
    }
    
    ws.send(JSON.stringify({
      type: 'BET_PLACED',
      betId: `BET_${Date.now()}`,
      amount,
      option,
      gameMode,
      period: period || gameTimers[gameMode]?.period
    }));
    
  } catch (error) {
    console.error('WebSocket bet placement error:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Bet placement failed'
    }));
  }
}

async function handleAviatorCashout(data, ws) {
  try {
    const { gameMode, betId } = data;
    
    if (gameStates[gameMode] && gameStates[gameMode].status === 'flying') {
      const bet = gameStates[gameMode].bets.find(b => b.betId === betId && b.userId === ws.userId);
      if (bet && !bet.cashedOut) {
        bet.cashedOut = true;
        bet.cashoutMultiplier = gameStates[gameMode].multiplier;
        
        ws.send(JSON.stringify({
          type: 'AVIATOR_CASHOUT_SUCCESS',
          betId,
          multiplier: bet.cashoutMultiplier,
          winAmount: bet.amount * bet.cashoutMultiplier
        }));
      }
    }
  } catch (error) {
    console.error('Aviator cashout error:', error);
  }
}

async function handleSpinSlots(data, ws) {
  try {
    const { amount } = data;
    const result = await spinSlots(ws.userId, amount);
    
    ws.send(JSON.stringify({
      type: 'SLOTS_RESULT',
      ...result
    }));
  } catch (error) {
    console.error('Slots spin error:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Spin failed'
    }));
  }
}

// ✅ JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Access denied. No token provided.' 
    });
  }
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'bdg-secret-key-2024');
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      error: 'Invalid or expired token' 
    });
  }
};

// ✅ Admin Middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'bdg-secret-key-2024');
    
    if (verified.username === 'admin') {
      req.admin = { username: 'admin', role: 'superadmin' };
      return next();
    }
    
    res.status(403).json({ error: 'Admin access required' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// ✅ Initialize Default Data
async function initializeDefaultData() {
  try {
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        role: 'superadmin',
        permissions: ['all']
      });
      console.log('✅ Default admin created: admin / admin123');
    }
    
    const demoUsers = [
      { 
        mobile: '9876543210', 
        password: 'demo123', 
        name: 'Demo Player', 
        wallet: 12560.75,
        inviteCode: 'NNGJ20PN',
        level: 'Gold',
        teamSize: 15,
        commission: 2540.00,
        rank: '#47'
      }
    ];
    
    for (const demoUser of demoUsers) {
      const userExists = await User.findOne({ mobile: demoUser.mobile });
      if (!userExists) {
        const userId = 'DEMO_' + demoUser.mobile;
        const hashedPassword = await bcrypt.hash(demoUser.password, 10);
        
        await User.create({
          userId,
          mobile: demoUser.mobile,
          password: hashedPassword,
          name: demoUser.name,
          wallet: demoUser.wallet,
          inviteCode: demoUser.inviteCode,
          level: demoUser.level,
          totalProfit: demoUser.wallet * 0.3,
          streak: 7,
          teamSize: demoUser.teamSize,
          commission: demoUser.commission,
          rank: demoUser.rank,
          isActive: true
        });
        
        console.log(`✅ Demo user created: ${demoUser.mobile} / ${demoUser.password}`);
      }
    }
    
    console.log('✅ Default data initialized');
    
  } catch (error) {
    console.error('❌ Error initializing default data:', error);
  }
}

// ==================== ROUTES ====================

// ✅ Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'BDG GAME Backend is running',
    timestamp: new Date(),
    games: Object.keys(gameModes)
  });
});

// ✅ User Registration
app.post('/api/register', async (req, res) => {
  try {
    let { mobile, password, name, inviteCode } = req.body;
    
    if (!mobile || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Mobile and password are required' 
      });
    }
    
    mobile = mobile.toString().replace(/\D/g, '');
    
    if (mobile.length < 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Mobile number must be at least 10 digits' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters' 
      });
    }
    
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Mobile number already registered' 
      });
    }
    
    const userId = 'USR' + Date.now().toString().slice(-8);
    const userInviteCode = 'BDG' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      userId,
      mobile,
      password: hashedPassword,
      name: name || 'Player',
      inviteCode: userInviteCode,
      referredBy: inviteCode || null,
      wallet: 1000
    });
    
    await user.save();
    
    if (inviteCode) {
      const referrer = await User.findOne({ inviteCode });
      if (referrer) {
        referrer.teamSize += 1;
        await referrer.save();
      }
    }
    
    const token = jwt.sign(
      { 
        userId: user.userId, 
        mobile: user.mobile,
        isDemo: false 
      },
      process.env.JWT_SECRET || 'bdg-secret-key-2024',
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        userId: user.userId,
        mobile: user.mobile,
        name: user.name,
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
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during registration'
    });
  }
});

// ✅ User Login
app.post('/api/login', async (req, res) => {
  try {
    let { mobile, password } = req.body;
    
    if (!mobile || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Mobile and password are required' 
      });
    }
    
    mobile = mobile.toString().replace(/\D/g, '');
    
    const demoUsers = {
      '9876543210': { 
        password: 'demo123', 
        name: 'Demo Player', 
        wallet: 12560.75,
        level: 'Gold',
        inviteCode: 'NNGJ20PN',
        totalProfit: 4520.50,
        streak: 7,
        teamSize: 15,
        commission: 2540.00,
        rank: '#47'
      }
    };
    
    if (demoUsers[mobile] && demoUsers[mobile].password === password) {
      const demoToken = jwt.sign(
        { 
          userId: 'DEMO_' + mobile, 
          mobile: mobile,
          isDemo: true 
        },
        process.env.JWT_SECRET || 'bdg-secret-key-2024',
        { expiresIn: '30d' }
      );
      
      return res.json({
        success: true,
        token: demoToken,
        user: {
          userId: 'DEMO_' + mobile,
          mobile: mobile,
          name: demoUsers[mobile].name,
          wallet: demoUsers[mobile].wallet,
          inviteCode: demoUsers[mobile].inviteCode,
          level: demoUsers[mobile].level,
          totalProfit: demoUsers[mobile].totalProfit,
          streak: demoUsers[mobile].streak,
          teamSize: demoUsers[mobile].teamSize,
          commission: demoUsers[mobile].commission,
          rank: demoUsers[mobile].rank
        }
      });
    }
    
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(400).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid password' 
      });
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const token = jwt.sign(
      { 
        userId: user.userId, 
        mobile: user.mobile,
        isDemo: false 
      },
      process.env.JWT_SECRET || 'bdg-secret-key-2024',
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        mobile: user.mobile,
        name: user.name,
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
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// ✅ Place Bet
app.post('/api/place-bet', authenticateToken, async (req, res) => {
  try {
    const { amount, option, gameMode, period, gameType } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid bet amount' 
      });
    }
    
    if (!option || !gameMode || !gameType) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields' 
      });
    }
    
    if (req.user.isDemo) {
      const betId = 'BET' + Date.now().toString().slice(-8);
      const currentPeriod = period || gameTimers[gameMode]?.period || generatePeriodId(gameMode);
      
      if (gameType === 'wingo' && gameTimers[gameMode]) {
        if (option === 'Green') gameTimers[gameMode].betSummary.green += amount;
        else if (option === 'Red') gameTimers[gameMode].betSummary.red += amount;
        else if (option === 'Violet') gameTimers[gameMode].betSummary.violet += amount;
        else if (option === 'Big') gameTimers[gameMode].betSummary.big += amount;
        else if (option === 'Small') gameTimers[gameMode].betSummary.small += amount;
        else if (!isNaN(parseInt(option))) {
          gameTimers[gameMode].betSummary.numbers[parseInt(option)] += amount;
        }
      }
      
      return res.json({
        success: true,
        message: 'Demo bet placed successfully',
        bet: {
          betId,
          amount: parseFloat(amount),
          option,
          gameMode,
          gameType,
          period: currentPeriod,
          status: 'pending'
        }
      });
    }
    
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    if (user.wallet < amount) {
      return res.status(400).json({ 
        success: false,
        error: 'Insufficient balance' 
      });
    }
    
    const settings = await GameSettings.findOne({ gameMode });
    if (settings) {
      if (amount < settings.minBet) {
        return res.status(400).json({ 
          success: false,
          error: `Minimum bet amount is ₹${settings.minBet}` 
        });
      }
      if (amount > settings.maxBet) {
        return res.status(400).json({ 
          success: false,
          error: `Maximum bet amount is ₹${settings.maxBet}` 
        });
      }
    }
    
    user.wallet -= parseFloat(amount);
    await user.save();
    
    const betId = 'BET' + Date.now().toString().slice(-8);
    const currentPeriod = period || gameTimers[gameMode]?.period || generatePeriodId(gameMode);
    
    const bet = new Bet({
      betId,
      userId: user.userId,
      mobile: user.mobile,
      period: currentPeriod,
      gameMode,
      gameType,
      amount: parseFloat(amount),
      option,
      status: 'pending'
    });
    
    await bet.save();
    
    const transaction = new Transaction({
      transactionId: `BET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.userId,
      type: 'bet',
      amount: -parseFloat(amount),
      description: `Bet placed on ${option} (${gameType})`,
      balanceBefore: user.wallet + parseFloat(amount),
      balanceAfter: user.wallet,
      referenceId: bet.betId
    });
    
    await transaction.save();
    
    if (gameType === 'wingo' && gameTimers[gameMode]) {
      if (option === 'Green') gameTimers[gameMode].betSummary.green += amount;
      else if (option === 'Red') gameTimers[gameMode].betSummary.red += amount;
      else if (option === 'Violet') gameTimers[gameMode].betSummary.violet += amount;
      else if (option === 'Big') gameTimers[gameMode].betSummary.big += amount;
      else if (option === 'Small') gameTimers[gameMode].betSummary.small += amount;
      else if (!isNaN(parseInt(option))) {
        gameTimers[gameMode].betSummary.numbers[parseInt(option)] += amount;
      }
    }
    
    res.json({
      success: true,
      bet: {
        betId: bet.betId,
        amount: bet.amount,
        option: bet.option,
        status: bet.status,
        gameMode: bet.gameMode,
        gameType: bet.gameType,
        period: bet.period
      },
      newBalance: user.wallet
    });
    
  } catch (error) {
    console.error('Place bet error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error placing bet'
    });
  }
});

// ✅ Agent Application
app.post('/api/agent-application', authenticateToken, async (req, res) => {
  try {
    const { name, email, experience, expectedCommission } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'Name and email are required' 
      });
    }
    
    const user = req.user.isDemo ? null : await User.findOne({ userId: req.user.userId });
    
    const applicationId = 'AGENT' + Date.now().toString().slice(-8);
    
    const application = new AgentApplication({
      applicationId,
      userId: req.user.isDemo ? 'DEMO' : req.user.userId,
      mobile: req.user.isDemo ? '9876543210' : user?.mobile || req.user.mobile,
      name,
      email,
      experience: experience || 'Not specified',
      expectedCommission: expectedCommission || 0,
      status: 'pending'
    });
    
    await application.save();
    
    res.json({
      success: true,
      message: 'Agent application submitted successfully',
      applicationId: application.applicationId
    });
    
  } catch (error) {
    console.error('Agent application error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error submitting application'
    });
  }
});

// ✅ Get User Bets
app.get('/api/my-bets', authenticateToken, async (req, res) => {
  try {
    if (req.user.isDemo) {
      return res.json({
        success: true,
        bets: []
      });
    }
    
    const bets = await Bet.find({ userId: req.user.userId })
      .sort({ placedAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      bets: bets.map(bet => ({
        betId: bet.betId,
        period: bet.period,
        gameMode: bet.gameMode,
        gameType: bet.gameType,
        amount: bet.amount,
        option: bet.option,
        status: bet.status,
        winAmount: bet.winAmount,
        placedAt: bet.placedAt,
        settledAt: bet.settledAt
      }))
    });
  } catch (error) {
    console.error('Get bets error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// ✅ Recent Results
app.get('/api/recent-results', async (req, res) => {
  try {
    const { gameMode = '30', limit = 20 } = req.query;
    
    let results = await GameResult.find({ gameMode })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// ✅ Deposit Request
app.post('/api/deposit', authenticateToken, upload.single('screenshot'), async (req, res) => {
  try {
    const { amount, method, upiId, bankDetails } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid amount' 
      });
    }
    
    if (req.user.isDemo) {
      const depositId = 'DEP' + Date.now().toString().slice(-8);
      
      return res.json({
        success: true,
        message: 'Demo deposit submitted successfully',
        depositId,
        newBalance: 12560.75 + parseFloat(amount)
      });
    }
    
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    const depositId = 'DEP' + Date.now().toString().slice(-8);
    
    const deposit = new Deposit({
      depositId,
      userId: user.userId,
      mobile: user.mobile,
      amount: parseFloat(amount),
      method,
      upiId: upiId || null,
      bankDetails: bankDetails ? JSON.parse(bankDetails) : null,
      screenshot: req.file ? req.file.path : null,
      status: 'pending'
    });
    
    await deposit.save();
    
    res.json({
      success: true,
      message: 'Deposit request submitted. Please wait for admin approval.',
      depositId: deposit.depositId
    });
    
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during deposit' 
    });
  }
});

// ✅ Withdrawal Request
app.post('/api/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, method, accountDetails } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid amount' 
      });
    }
    
    if (req.user.isDemo) {
      const withdrawalId = 'WTH' + Date.now().toString().slice(-8);
      
      return res.json({
        success: true,
        message: 'Demo withdrawal submitted successfully',
        withdrawalId,
        newBalance: 12560.75 - parseFloat(amount)
      });
    }
    
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    if (user.wallet < amount) {
      return res.status(400).json({ 
        success: false,
        error: 'Insufficient balance' 
      });
    }
    
    const withdrawalId = 'WTH' + Date.now().toString().slice(-8);
    
    const withdrawal = new Withdrawal({
      withdrawalId,
      userId: user.userId,
      mobile: user.mobile,
      amount: parseFloat(amount),
      method,
      accountDetails,
      status: 'pending'
    });
    
    await withdrawal.save();
    
    user.wallet -= parseFloat(amount);
    await user.save();
    
    res.json({
      success: true,
      message: 'Withdrawal request submitted. Processing time: 1-3 hours.',
      withdrawalId: withdrawal.withdrawalId,
      newBalance: user.wallet
    });
    
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during withdrawal' 
    });
  }
});

// ✅ Claim Bonus
app.post('/api/claim-bonus', authenticateToken, async (req, res) => {
  try {
    if (req.user.isDemo) {
      return res.json({
        success: true,
        bonus: 500,
        streak: 5,
        newBalance: 12560.75 + 500
      });
    }
    
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (user.lastBonusClaim && new Date(user.lastBonusClaim) >= today) {
      return res.status(400).json({ 
        success: false,
        error: 'Bonus already claimed today' 
      });
    }
    
    const streak = user.streak + 1;
    const bonusAmount = streak * 50;
    
    user.wallet += bonusAmount;
    user.streak = streak;
    user.lastBonusClaim = new Date();
    await user.save();
    
    const transaction = new Transaction({
      transactionId: `BONUS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.userId,
      type: 'bonus',
      amount: bonusAmount,
      description: `Daily bonus (Day ${streak})`,
      balanceBefore: user.wallet - bonusAmount,
      balanceAfter: user.wallet
    });
    
    await transaction.save();
    
    res.json({
      success: true,
      bonus: bonusAmount,
      streak: streak,
      newBalance: user.wallet
    });
    
  } catch (error) {
    console.error('Claim bonus error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error claiming bonus' 
    });
  }
});

// ✅ Forgot Password
app.post('/api/forgot-password', async (req, res) => {
  try {
    let { mobile } = req.body;
    
    if (!mobile) {
      return res.status(400).json({ 
        success: false,
        error: 'Mobile number is required' 
      });
    }
    
    mobile = mobile.toString().replace(/\D/g, '');
    
    if (mobile === '9876543210') {
      return res.json({
        success: true,
        message: 'OTP sent to mobile number',
        otp: '123456'
      });
    }
    
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'OTP sent to mobile number',
      otp: '123456'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// ✅ Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    let { mobile, otp, newPassword } = req.body;
    
    if (!mobile || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }
    
    mobile = mobile.toString().replace(/\D/g, '');
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters' 
      });
    }
    
    if (otp !== '123456') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid OTP' 
      });
    }
    
    if (mobile === '9876543210') {
      return res.json({
        success: true,
        message: 'Password reset successful for demo user'
      });
    }
    
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password reset successful'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// ✅ Get Game State
app.get('/api/game-state', async (req, res) => {
  try {
    const { gameMode = '30' } = req.query;
    
    if (gameModes[gameMode].type === 'wingo' && gameTimers[gameMode]) {
      const recentResults = await GameResult.find({ gameMode })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();
      
      res.json({
        success: true,
        timer: gameTimers[gameMode].timer,
        period: gameTimers[gameMode].period,
        gameMode: gameMode,
        recentResults: recentResults
      });
    } else if (gameModes[gameMode].type === 'aviator' && gameStates[gameMode]) {
      res.json({
        success: true,
        status: gameStates[gameMode].status,
        multiplier: gameStates[gameMode].multiplier,
        crashPoint: gameStates[gameMode].crashPoint,
        gameMode: gameMode
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: 'Invalid game mode' 
      });
    }
  } catch (error) {
    console.error('Game state error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error'
    });
  }
});

// ==================== ADMIN ROUTES ====================

// ✅ Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { username: 'admin', role: 'superadmin' },
        process.env.JWT_SECRET || 'bdg-secret-key-2024',
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        token,
        admin: {
          username: 'admin',
          role: 'superadmin'
        }
      });
    }
    
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ error: 'Admin not found' });
    
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
    
    admin.lastLogin = new Date();
    await admin.save();
    
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET || 'bdg-secret-key-2024',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      admin: {
        username: admin.username,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Admin Dashboard Stats
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalBets = await Bet.countDocuments();
    const pendingBets = await Bet.countDocuments({ status: 'pending' });
    
    const totalDeposits = await Deposit.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    
    const totalWithdrawals = await Withdrawal.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    
    const recentDeposits = await Deposit.find()
      .sort({ createdAt: -1 })
      .limit(10);
    
    const recentWithdrawals = await Withdrawal.find()
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, active: activeUsers },
        bets: { total: totalBets, pending: pendingBets },
        deposits: { total: totalDeposits[0]?.total || 0, count: totalDeposits[0]?.count || 0 },
        withdrawals: { total: totalWithdrawals[0]?.total || 0, count: totalWithdrawals[0]?.count || 0 }
      },
      recent: {
        deposits: recentDeposits,
        withdrawals: recentWithdrawals
      }
    });
    
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get All Users
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (search) {
      query.$or = [
        { mobile: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get Agent Applications
app.get('/api/admin/agent-applications', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (status) query.status = status;
    
    const applications = await AgentApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await AgentApplication.countDocuments(query);
    
    res.json({
      success: true,
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get agent applications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Update Agent Application
app.put('/api/admin/agent-applications/:applicationId', authenticateAdmin, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, adminNotes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const application = await AgentApplication.findOne({ applicationId });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    application.status = status;
    application.adminNotes = adminNotes;
    application.approvedBy = req.admin.username;
    application.approvedAt = new Date();
    
    await application.save();
    
    res.json({
      success: true,
      message: `Agent application ${status} successfully`,
      application
    });
  } catch (error) {
    console.error('Update agent application error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get All Deposits
app.get('/api/admin/deposits', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (status) query.status = status;
    
    const deposits = await Deposit.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Deposit.countDocuments(query);
    
    res.json({
      success: true,
      deposits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get deposits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Approve/Reject Deposit
app.put('/api/admin/deposits/:depositId', authenticateAdmin, async (req, res) => {
  try {
    const { depositId } = req.params;
    const { status, adminNotes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const deposit = await Deposit.findOne({ depositId });
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }
    
    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: 'Deposit already processed' });
    }
    
    deposit.status = status;
    deposit.adminNotes = adminNotes;
    deposit.approvedBy = req.admin.username;
    deposit.approvedAt = new Date();
    
    await deposit.save();
    
    if (status === 'approved') {
      const user = await User.findOne({ userId: deposit.userId });
      if (user) {
        user.wallet += deposit.amount;
        user.totalDeposit += deposit.amount;
        await user.save();
      }
    }
    
    res.json({
      success: true,
      message: `Deposit ${status} successfully`,
      deposit
    });
  } catch (error) {
    console.error('Update deposit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get All Withdrawals
app.get('/api/admin/withdrawals', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (status) query.status = status;
    
    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Withdrawal.countDocuments(query);
    
    res.json({
      success: true,
      withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Approve/Reject Withdrawal
app.put('/api/admin/withdrawals/:withdrawalId', authenticateAdmin, async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { status, utr, adminNotes } = req.body;
    
    if (!['approved', 'rejected', 'processing'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const withdrawal = await Withdrawal.findOne({ withdrawalId });
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed' });
    }
    
    withdrawal.status = status;
    withdrawal.utr = utr || null;
    withdrawal.adminNotes = adminNotes;
    withdrawal.approvedBy = req.admin.username;
    withdrawal.approvedAt = new Date();
    
    await withdrawal.save();
    
    if (status === 'rejected') {
      const user = await User.findOne({ userId: withdrawal.userId });
      if (user) {
        user.wallet += withdrawal.amount;
        await user.save();
      }
    }
    
    res.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      withdrawal
    });
  } catch (error) {
    console.error('Update withdrawal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get Game Results
app.get('/api/admin/game-results', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, gameMode = '' } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (gameMode) query.gameMode = gameMode;
    
    const results = await GameResult.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await GameResult.countDocuments(query);
    
    res.json({
      success: true,
      results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get game results error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get Game Settings
app.get('/api/admin/game-settings', authenticateAdmin, async (req, res) => {
  try {
    const settings = await GameSettings.find();
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get game settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Update Game Settings
app.put('/api/admin/game-settings/:gameMode', authenticateAdmin, async (req, res) => {
  try {
    const { gameMode } = req.params;
    const updateData = req.body;
    
    let settings = await GameSettings.findOne({ gameMode });
    
    if (!settings) {
      settings = new GameSettings({
        gameMode,
        ...updateData
      });
    } else {
      Object.assign(settings, updateData);
      settings.updatedAt = new Date();
    }
    
    await settings.save();
    
    res.json({
      success: true,
      message: 'Game settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update game settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Manual Game Result
app.post('/api/admin/manual-result', authenticateAdmin, async (req, res) => {
  try {
    const { gameMode, number } = req.body;
    
    if (!gameMode || number === undefined) {
      return res.status(400).json({ error: 'Game mode and number are required' });
    }
    
    const period = gameTimers[gameMode]?.period;
    if (!period) {
      return res.status(400).json({ error: 'Invalid period' });
    }
    
    const result = {
      number: parseInt(number),
      color: getColorFromNumber(parseInt(number)),
      smallBig: getSizeFromNumber(parseInt(number))
    };
    
    const gameResult = new GameResult({
      periodId: period,
      gameMode,
      gameType: 'wingo',
      number: result.number,
      color: result.color,
      smallBig: result.smallBig,
      totalBets: gameTimers[gameMode]?.totalBets || 0,
      manipulated: true,
      manipulationType: 'admin_manual',
      adminSet: true
    });
    
    await gameResult.save();
    
    if (gameTimers[gameMode]) {
      gameTimers[gameMode].timer = gameModes[gameMode].duration;
      gameTimers[gameMode].period = generatePeriodId(gameMode);
    }
    
    res.json({
      success: true,
      message: 'Manual result set successfully',
      result
    });
  } catch (error) {
    console.error('Manual result error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get Real-time Game Data
app.get('/api/admin/real-time', authenticateAdmin, async (req, res) => {
  try {
    const gameData = {};
    
    for (const [mode, timer] of Object.entries(gameTimers)) {
      gameData[mode] = {
        timer: timer.timer,
        period: timer.period,
        totalBets: timer.totalBets,
        betSummary: timer.betSummary
      };
    }
    
    res.json({
      success: true,
      gameData
    });
  } catch (error) {
    console.error('Get real-time data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`\n🎮 ========================================= 🎮`);
  console.log(`✅ BDG GAME Backend Started`);
  console.log(`🔹 Port: ${PORT}`);
  console.log(`🔹 HTTP: http://localhost:${PORT}`);
  console.log(`🔹 WebSocket: ws://localhost:${PORT}`);
  console.log(`🔹 Health: http://localhost:${PORT}/health`);
  console.log(`🔹 Admin Login: admin / admin123`);
  console.log(`🔹 Demo User: 9876543210 / demo123`);
  console.log(`🎮 ========================================= 🎮\n`);
  
  await initializeDefaultData();
  await initializeGameTimers();
});

module.exports = app;