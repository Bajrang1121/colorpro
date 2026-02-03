const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  gameType: {
    type: String,
    enum: ['WinGo30s', 'WinGo1Min', 'WinGo3Min', 'WinGo5Min', '5D', 'K3'],
    required: true
  },
  period: {
    type: String,
    required: true
  },
  result: {
    number: Number,
    color: String,
    bigSmall: String
  },
  status: {
    type: String,
    enum: ['waiting', 'running', 'finished'],
    default: 'waiting'
  },
  startTime: Date,
  endTime: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Game', GameSchema);