const mongoose = require('mongoose');

const BetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  betAmount: {
    type: Number,
    required: true
  },
  betOn: {
    type: String,
    required: true
  },
  betType: {
    type: String,
    enum: ['color', 'number', 'bigSmall'],
    required: true
  },
  multiplier: {
    type: Number,
    default: 1
  },
  potentialWin: Number,
  status: {
    type: String,
    enum: ['pending', 'won', 'lost', 'cancelled'],
    default: 'pending'
  },
  winAmount: Number,
  placedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Bet', BetSchema);