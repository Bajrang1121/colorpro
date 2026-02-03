// Game Configuration
const gameConfig = {
    gameDuration: 30, // seconds
    currentPeriod: 20260201100051304,
    baseBet: 100,
    colorMultiplier: 2,
    numberMultiplier: 100,
    colors: {
        0: 'green',
        1: 'violet',
        3: 'violet',
        5: 'violet',
        7: 'violet',
        9: 'violet',
        2: 'red',
        4: 'red',
        6: 'red',
        8: 'red'
    }
};

// Game State
let gameState = {
    walletBalance: 9520.97,
    currentBetAmount: 100,
    selectedColor: null,
    selectedNumber: null,
    selectedMultiplier: 1,
    bets: [],
    isGameRunning: true,
    timeRemaining: gameConfig.gameDuration,
    gameHistory: [
        { period: 20260201100051304, number: 9, size: 'Big', color: '●' },
        { period: 20260201100051303, number: 5, size: 'Big', color: '●●' },
        { period: 20260201100051302, number: 8, size: 'Big', color: '●' },
        { period: 20260201100051301, number: 1, size: 'Small', color: '●' },
        { period: 20260201100051300, number: 8, size: 'Big', color: '●●' },
        { period: 20260201100051299, number: 3, size: 'Small', color: '●' },
        { period: 20260201100051298, number: 0, size: 'Small', color: '●●●' },
        { period: 20260201100051297, number: 6, size: 'Big', color: '●' },
        { period: 20260201100051296, number: 7, size: 'Big', color: '●' }
    ],
    recentBets: []
};

// DOM Elements
const elements = {
    walletAmount: document.getElementById('walletAmount'),
    gamePeriod: document.getElementById('gamePeriod'),
    countdownTimer: document.getElementById('countdownTimer'),
    historyBody: document.getElementById('historyBody'),
    recentBetsList: document.getElementById('recentBetsList'),
    accountBalance: document.getElementById('accountBalance'),
    betSlip: document.getElementById('betSlip'),
    betSlipContent: document.getElementById('betSlipContent'),
    totalBetAmount: document.getElementById('totalBetAmount'),
    confirmBet: document.getElementById('confirmBet'),
    placeBet: document.getElementById('placeBet'),
    closeSlip: document.getElementById('closeSlip'),
    depositModal: document.getElementById('depositModal'),
    customAmount: document.getElementById('customAmount'),
    setCustomAmount: document.getElementById('setCustomAmount')
};

// Initialize Game
function initGame() {
    updateDisplay();
    initEventListeners();
    startGameTimer();
    loadGameHistory();
    loadRecentBets();
}

// Update Display
function updateDisplay() {
    elements.walletAmount.textContent = `₹${gameState.walletBalance.toFixed(2)}`;
    elements.accountBalance.textContent = `₹${gameState.walletBalance.toFixed(2)}`;
    elements.gamePeriod.textContent = gameConfig.currentPeriod;
    updateBetSlip();
}

// Event Listeners
function initEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Color Bets
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectColor(btn.dataset.bet);
        });
    });

    // Number Bets
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectNumber(parseInt(btn.dataset.number));
        });
    });

    // Bet Amounts
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.currentBetAmount = parseInt(btn.dataset.amount);
        });
    });

    // Multipliers
    document.querySelectorAll('.multiplier-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            gameState.selectedMultiplier = parseInt(btn.dataset.multiplier);
        });
    });

    // Custom Amount
    elements.setCustomAmount.addEventListener('click', () => {
        const amount = parseInt(elements.customAmount.value);
        if (amount >= 10 && amount <= 10000) {
            gameState.currentBetAmount = amount;
            document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
        }
    });

    // Place Bet
    elements.placeBet.addEventListener('click', () => {
        if (gameState.selectedColor || gameState.selectedNumber) {
            addBet();
            showBetSlip();
        } else {
            alert('Please select a color or number to bet on!');
        }
    });

    // Confirm Bet
    elements.confirmBet.addEventListener('click', confirmBets);

    // Close Bet Slip
    elements.closeSlip.addEventListener('click', hideBetSlip);

    // Deposit/Withdraw Buttons
    document.getElementById('depositBtn')?.addEventListener('click', () => showModal('depositModal'));
    document.getElementById('withdrawBtn')?.addEventListener('click', () => showModal('depositModal'));

    // Modal Close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
        });
    });

    // Quick Amounts
    document.querySelectorAll('.quick-amount').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.customAmount.value = btn.textContent.replace('₹', '');
        });
    });

    // Game History Buttons
    document.querySelectorAll('.history-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.history-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Settings Buttons
    document.querySelectorAll('.settings-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('logout')) {
                if (confirm('Are you sure you want to logout?')) {
                    alert('Logged out successfully!');
                }
            }
        });
    });
}

// Tab Switching
function switchTab(tabName) {
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Show active tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === `${tabName}Tab`) {
            tab.classList.add('active');
        }
    });

    // Close bet slip when switching tabs
    hideBetSlip();
}

// Color Selection
function selectColor(color) {
    gameState.selectedColor = color;
    gameState.selectedNumber = null;
    
    // Update UI
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.bet === color) {
            btn.classList.add('selected');
        }
    });
    
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

// Number Selection
function selectNumber(number) {
    gameState.selectedNumber = number;
    gameState.selectedColor = null;
    
    // Update UI
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.dataset.number) === number) {
            btn.classList.add('selected');
        }
    });
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

// Add Bet to Slip
function addBet() {
    const bet = {
        type: gameState.selectedColor ? 'color' : 'number',
        value: gameState.selectedColor || gameState.selectedNumber,
        amount: gameState.currentBetAmount * gameState.selectedMultiplier,
        multiplier: gameState.selectedMultiplier,
        potentialWin: calculatePotentialWin()
    };
    
    gameState.bets.push(bet);
    updateBetSlip();
}

// Calculate Potential Win
function calculatePotentialWin() {
    const baseAmount = gameState.currentBetAmount * gameState.selectedMultiplier;
    let multiplier = gameState.selectedColor ? gameConfig.colorMultiplier : gameConfig.numberMultiplier;
    return baseAmount * multiplier;
}

// Update Bet Slip
function updateBetSlip() {
    elements.betSlipContent.innerHTML = '';
    
    if (gameState.bets.length === 0) {
        elements.betSlipContent.innerHTML = '<p class="empty-slip">No bets placed yet</p>';
        elements.totalBetAmount.textContent = '₹0';
        elements.confirmBet.disabled = true;
        return;
    }
    
    let totalBet = 0;
    
    gameState.bets.forEach((bet, index) => {
        const betElement = document.createElement('div');
        betElement.className = 'bet-slip-item';
        betElement.innerHTML = `
            <div class="bet-item-header">
                <span>${bet.type.toUpperCase()} Bet</span>
                <button class="remove-bet" data-index="${index}">×</button>
            </div>
            <div class="bet-item-details">
                <span>${bet.value}</span>
                <span>Amount: ₹${bet.amount.toFixed(2)}</span>
            </div>
            <div class="bet-item-multiplier">
                Multiplier: ${bet.multiplier}x
            </div>
            <div class="bet-item-win">
                Potential Win: ₹${bet.potentialWin.toFixed(2)}
            </div>
        `;
        elements.betSlipContent.appendChild(betElement);
        totalBet += bet.amount;
    });
    
    elements.totalBetAmount.textContent = `₹${totalBet.toFixed(2)}`;
    elements.confirmBet.disabled = false;
    
    // Add remove bet listeners
    document.querySelectorAll('.remove-bet').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            removeBet(index);
        });
    });
}

// Remove Bet
function removeBet(index) {
    gameState.bets.splice(index, 1);
    updateBetSlip();
}

// Show/Hide Bet Slip
function showBetSlip() {
    elements.betSlip.classList.add('active');
}

function hideBetSlip() {
    elements.betSlip.classList.remove('active');
}

// Confirm Bets
function confirmBets() {
    const totalBet = gameState.bets.reduce((sum, bet) => sum + bet.amount, 0);
    
    if (totalBet > gameState.walletBalance) {
        alert('Insufficient balance!');
        return;
    }
    
    gameState.walletBalance -= totalBet;
    updateDisplay();
    
    // Add to recent bets
    gameState.bets.forEach(bet => {
        gameState.recentBets.unshift({
            ...bet,
            time: new Date().toLocaleTimeString(),
            status: 'pending'
        });
    });
    
    loadRecentBets();
    
    alert('Bets placed successfully! Waiting for game result...');
    gameState.bets = [];
    hideBetSlip();
    updateBetSlip();
}

// Game Timer
function startGameTimer() {
    const timerElement = elements.countdownTimer;
    
    function updateTimer() {
        if (gameState.timeRemaining > 0) {
            gameState.timeRemaining--;
            const minutes = Math.floor(gameState.timeRemaining / 60);
            const seconds = gameState.timeRemaining % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Color change for last 10 seconds
            if (gameState.timeRemaining <= 10) {
                timerElement.style.color = '#ff4757';
                timerElement.style.animation = 'pulse 1s infinite';
            }
        } else {
            endGame();
            startNewGame();
        }
    }
    
    // Initial update
    updateTimer();
    
    // Update every second
    gameState.timerInterval = setInterval(updateTimer, 1000);
}

// End Game
function endGame() {
    clearInterval(gameState.timerInterval);
    
    // Generate random result
    const winningNumber = Math.floor(Math.random() * 10);
    const winningColor = gameConfig.colors[winningNumber];
    const size = winningNumber >= 5 ? 'Big' : 'Small';
    
    // Add to history
    const colorSymbol = winningNumber === 0 ? '●' : 
                       [1,3,5,7,9].includes(winningNumber) ? '●●' : '●●●';
    
    gameState.gameHistory.unshift({
        period: gameConfig.currentPeriod,
        number: winningNumber,
        size: size,
        color: colorSymbol
    });
    
    // Process winning bets
    processWinningBets(winningNumber, winningColor);
    
    // Update display
    loadGameHistory();
    
    // Show result
    showGameResult(winningNumber, winningColor);
}

// Start New Game
function startNewGame() {
    gameConfig.currentPeriod++;
    gameState.timeRemaining = gameConfig.gameDuration;
    gameState.selectedColor = null;
    gameState.selectedNumber = null;
    gameState.bets = [];
    
    elements.gamePeriod.textContent = gameConfig.currentPeriod;
    elements.countdownTimer.textContent = gameConfig.gameDuration.toString().padStart(2, '0') + ':00';
    elements.countdownTimer.style.color = '#ffffff';
    elements.countdownTimer.style.animation = '';
    
    startGameTimer();
    updateBetSlip();
}

// Process Winning Bets
function processWinningBets(winningNumber, winningColor) {
    // In a real application, this would check bets from database
    // Here we'll simulate checking recent bets
    gameState.recentBets.forEach((bet, index) => {
        if (bet.status === 'pending') {
            let isWinning = false;
            
            if (bet.type === 'number' && bet.value === winningNumber) {
                isWinning = true;
                bet.winAmount = bet.potentialWin;
            } else if (bet.type === 'color' && bet.value === winningColor) {
                isWinning = true;
                bet.winAmount = bet.potentialWin;
            }
            
            bet.status = isWinning ? 'win' : 'lose';
            
            if (isWinning) {
                gameState.walletBalance += bet.winAmount;
            }
        }
    });
    
    updateDisplay();
    loadRecentBets();
}

// Show Game Result
function showGameResult(number, color) {
    const resultElement = document.createElement('div');
    resultElement.className = 'game-result';
    resultElement.innerHTML = `
        <div class="result-content">
            <h3>Game Result!</h3>
            <div class="result-number ${color}">
                ${number}
            </div>
            <p>Winning ${color.toUpperCase()}</p>
            <button class="close-result">Continue</button>
        </div>
    `;
    
    resultElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    document.body.appendChild(resultElement);
    
    // Auto close after 5 seconds
    setTimeout(() => {
        if (resultElement.parentNode) {
            resultElement.remove();
        }
    }, 5000);
    
    // Manual close
    resultElement.querySelector('.close-result').addEventListener('click', () => {
        resultElement.remove();
    });
}

// Load Game History
function loadGameHistory() {
    elements.historyBody.innerHTML = '';
    
    gameState.gameHistory.forEach(game => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${game.period}</td>
            <td>${game.number}</td>
            <td>${game.size}</td>
            <td>${game.color}</td>
        `;
        elements.historyBody.appendChild(row);
    });
}

// Load Recent Bets
function loadRecentBets() {
    elements.recentBetsList.innerHTML = '';
    
    if (gameState.recentBets.length === 0) {
        elements.recentBetsList.innerHTML = '<p class="no-bets">No recent bets</p>';
        return;
    }
    
    gameState.recentBets.slice(0, 10).forEach(bet => {
        const betElement = document.createElement('div');
        betElement.className = `bet-item ${bet.status}`;
        betElement.innerHTML = `
            <div class="bet-info">
                <span class="bet-type">${bet.type.toUpperCase()}</span>
                <span class="bet-value">${bet.value}</span>
            </div>
            <div class="bet-amount">₹${bet.amount.toFixed(2)}</div>
            <div class="bet-status ${bet.status}">
                ${bet.status === 'win' ? 'WON ₹' + bet.winAmount?.toFixed(2) : 'LOST'}
            </div>
        `;
        elements.recentBetsList.appendChild(betElement);
    });
}

// Show Modal
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// PWA: Add to Home Screen
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install promotion
    setTimeout(() => {
        const installPromo = document.createElement('div');
        installPromo.className = 'install-promo';
        installPromo.innerHTML = `
            <p>Install BDG Game for better experience!</p>
            <button id="installBtn">Install</button>
            <button id="dismissBtn">Later</button>
        `;
        installPromo.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: var(--accent-color);
            padding: 15px;
            border-radius: var(--border-radius);
            z-index: 1000;
            box-shadow: var(--shadow);
        `;
        document.body.appendChild(installPromo);
        
        document.getElementById('installBtn').addEventListener('click', () => {
            installPromo.remove();
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                deferredPrompt = null;
            });
        });
        
        document.getElementById('dismissBtn').addEventListener('click', () => {
            installPromo.remove();
        });
    }, 5000);
});