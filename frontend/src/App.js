import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Recaptcha setup
window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    'size': 'invisible'
});

// ✅ Game Configuration
const BACKEND_URL = ' https://colorpro-vfgm.onrender.com';
const WS_URL = ' https://colorpro-vfgm.onrender.com';


// ✅ Game State Management
let gameState = {
    isLoggedIn: false,
    authToken: localStorage.getItem('authToken') || null,
    userData: JSON.parse(localStorage.getItem('userData')) || {
        name: 'MemberNNGJ20PN',
        mobile: '',
        wallet: 9520.97,
        inviteCode: 'NNGJ20PN',
        level: 'Silver',
        totalProfit: 4520.50,
        streak: 0,
        teamSize: 8,
        commission: 2540.00,
        rank: '#47'
    },
    
    currentPage: 'home',
    currentGame: 'wingo',
    wingoTimeFrame: 30,
    
    wingoBet: 0,
    aviatorBet: 0,
    slotsBet: 0,
    selectedColor: null,
    selectedNumber: null,
    selectedSize: null,
    
    wingoTimer: 30,
    timerInterval: null,
    aviatorMultiplier: 1.00,
    aviatorInterval: null,
    isAviatorRunning: false,
    
    selectedPaymentMethod: 'upi',
    selectedWithdrawMethod: 'bank',
    
    gameHistory: [],
    wingoHistory: [],
    aviatorHistory: [],
    slotsHistory: [],
    transactionHistory: [],
    
    bonusClaimed: false,
    dailyBonusClaimed: false,
    dailyBonusDays: [true, true, true, true, true, false, false],
    
    backendConnected: false,
    wsConnected: false
};

// ✅ WebSocket Reference
let ws = null;
let reconnectTimeout = null;
let pingInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// ✅ DOM Elements Cache
const DOM = {
    loadingScreen: document.getElementById('loading-screen'),
    loginPage: document.getElementById('login-page'),
    app: document.getElementById('app'),
    
    loginTab: document.getElementById('login-tab'),
    registerTab: document.getElementById('register-tab'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    forgotForm: document.getElementById('forgot-form'),
    loginPhone: document.getElementById('login-phone'),
    loginPassword: document.getElementById('login-password'),
    registerName: document.getElementById('register-name'),
    registerPhone: document.getElementById('register-phone'),
    registerPassword: document.getElementById('register-password'),
    registerConfirmPassword: document.getElementById('register-confirm-password'),
    termsAgree: document.getElementById('terms-agree'),
    otpSection: document.getElementById('otp-section'),
    otpInput: document.getElementById('otp-input'),
    loginBtn: document.getElementById('login-btn'),
    sendOtpBtn: document.getElementById('send-otp-btn'),
    verifyOtpBtn: document.getElementById('verify-otp-btn'),
    
    balance: document.getElementById('balance'),
    mainBalance: document.getElementById('main-balance'),
    
    depositModal: document.getElementById('deposit-modal'),
    withdrawModal: document.getElementById('withdraw-modal'),
    agentModal: document.getElementById('agent-modal'),
    
    winPopup: document.getElementById('win-popup'),
    lossPopup: document.getElementById('loss-popup'),
    
    homePage: document.getElementById('home-page'),
    gamesPage: document.getElementById('games-page'),
    activityPage: document.getElementById('activity-page'),
    promotionPage: document.getElementById('promotion-page'),
    accountPage: document.getElementById('account-page'),
    
    navButtons: document.querySelectorAll('.nav-btn')
};

// ✅ Initialize Application
function initApp() {
    console.log('🚀 BDG GAME Initializing...');
    
    setTimeout(() => {
        DOM.loadingScreen.style.display = 'none';
        
        const authToken = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (authToken && userData) {
            try {
                gameState.authToken = authToken;
                gameState.userData = JSON.parse(userData);
                gameState.isLoggedIn = true;
                showMainApp();
                
                setTimeout(() => {
                    connectWebSocket();
                }, 500);
            } catch (error) {
                console.error('Error parsing user data:', error);
                showLoginPage();
            }
        } else {
            showLoginPage();
        }
    }, 1500);
    
    initEventListeners();
    checkBackendConnection();
    initSounds();
}

// ✅ Initialize Event Listeners
function initEventListeners() {
    // Auth Event Listeners
    if (DOM.loginTab) DOM.loginTab.addEventListener('click', showLoginForm);
    if (DOM.registerTab) DOM.registerTab.addEventListener('click', showRegisterForm);
    if (DOM.loginBtn) DOM.loginBtn.addEventListener('click', handleLogin);
    if (DOM.sendOtpBtn) DOM.sendOtpBtn.addEventListener('click', sendOtp);
    if (DOM.verifyOtpBtn) DOM.verifyOtpBtn.addEventListener('click', verifyOtp);
    
    // Navigation
    DOM.navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            navigateToPage(this.dataset.page);
        });
    });
    
    // Deposit/Withdraw Buttons
    document.querySelectorAll('.deposit-btn').forEach(btn => {
        btn.addEventListener('click', () => openModal('deposit'));
    });
    
    document.querySelectorAll('.withdraw-btn').forEach(btn => {
        btn.addEventListener('click', () => openModal('withdraw'));
    });
    
    // Game Category Buttons
    document.querySelectorAll('.game-category').forEach(btn => {
        btn.addEventListener('click', function() {
            const game = this.dataset.game;
            navigateToPage('games');
            switchGameTab(game);
        });
    });
    
    // Back Buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => navigateToPage('home'));
    });
    
    // Close Modal Buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.popup');
            if (modal) modal.classList.remove('active');
        });
    });
    
    // Close Popup Buttons
    document.querySelectorAll('.close-popup').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('win-popup').classList.remove('active');
            document.getElementById('loss-popup').classList.remove('active');
        });
    });
    
    // Agent Application
    document.getElementById('apply-agent-btn')?.addEventListener('click', () => openModal('agent'));
    
    // Game Tabs
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const game = this.dataset.game;
            switchGameTab(game);
        });
    });
    
    // WinGo Game Listeners
    initWingoGameListeners();
    
    // Aviator Game Listeners
    initAviatorGameListeners();
    
    // Slots Game Listeners
    initSlotsGameListeners();
    
    // Account Menu Listeners
    initAccountMenuListeners();
    
    // Promotion Listeners
    initPromotionListeners();
    
    // Custom Bet Input
    document.querySelector('.close-custom-bet')?.addEventListener('click', () => {
        document.getElementById('custom-bet-input').classList.remove('active');
    });
    
    document.getElementById('set-custom-bet')?.addEventListener('click', setCustomBet);
}

// ✅ Initialize WinGo Game Listeners
function initWingoGameListeners() {
    // Timeframe Buttons
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const timeframe = parseInt(this.dataset.timeframe);
            selectWingoTimeFrame(timeframe);
        });
    });
    
    // Bet Amount Buttons
    document.querySelectorAll('.wingo-amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            setWingoBetAmount(amount);
        });
    });
    
    // Color Bet Buttons
    document.querySelectorAll('.wingo-color-bet').forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.dataset.color;
            selectWingoColor(color);
        });
    });
    
    // Number Bet Buttons
    document.querySelectorAll('.wingo-number-bet').forEach(btn => {
        btn.addEventListener('click', function() {
            const number = parseInt(this.dataset.number);
            selectWingoNumber(number);
        });
    });
    
    // Size Bet Buttons
    document.querySelectorAll('.wingo-size-bet').forEach(btn => {
        btn.addEventListener('click', function() {
            const size = this.dataset.size;
            selectWingoSize(size);
        });
    });
    
    // Clear Bet Button
    document.getElementById('wingo-clear-bet')?.addEventListener('click', clearWingoBet);
    
    // Place Bet Button
    document.getElementById('wingo-place-bet')?.addEventListener('click', placeWingoBet);
    
    // Custom Bet Button
    document.querySelector('.wingo-custom-btn')?.addEventListener('click', () => {
        showCustomBetInput('wingo');
    });
}

// ✅ Initialize Aviator Game Listeners
function initAviatorGameListeners() {
    // Bet Amount Buttons
    document.querySelectorAll('.aviator-amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            setAviatorBetAmount(amount);
        });
    });
    
    // Place Bet Button
    document.getElementById('aviator-place-bet')?.addEventListener('click', placeAviatorBet);
    
    // Clear Button
    document.getElementById('aviator-clear')?.addEventListener('click', clearAviatorBet);
    
    // Cashout Button
    document.getElementById('aviator-cashout-btn')?.addEventListener('click', cashoutAviator);
    
    // Custom Bet Button
    document.querySelector('.aviator-custom-btn')?.addEventListener('click', () => {
        showCustomBetInput('aviator');
    });
}

// ✅ Initialize Slots Game Listeners
function initSlotsGameListeners() {
    // Bet Amount Buttons
    document.querySelectorAll('.slots-amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            setSlotsBetAmount(amount);
        });
    });
    
    // Spin Button
    document.getElementById('spin-btn')?.addEventListener('click', spinSlots);
    
    // Custom Bet Button
    document.querySelector('.slots-custom-btn')?.addEventListener('click', () => {
        showCustomBetInput('slots');
    });
}

// ✅ Initialize Account Menu Listeners
function initAccountMenuListeners() {
    // Account Menu Items
    document.querySelectorAll('.account-menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const type = this.dataset.type;
            if (type) {
                handleAccountMenuItem(type);
            }
        });
    });
    
    // Logout Button
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    
    // Close Transaction Modal
    document.querySelector('.close-transaction-modal')?.addEventListener('click', () => {
        document.getElementById('transaction-modal').classList.add('hidden');
    });
}

// ✅ Initialize Promotion Listeners
function initPromotionListeners() {
    // Claim Welcome Bonus
    document.getElementById('claim-welcome-bonus')?.addEventListener('click', claimWelcomeBonus);
    
    // Copy Referral Code
    document.getElementById('copy-referral')?.addEventListener('click', copyReferralCode);
    
    // Share Referral Link
    document.getElementById('share-referral')?.addEventListener('click', shareReferralLink);
    
    // Daily Bonus Claim
    document.querySelector('.claim-btn')?.addEventListener('click', claimDailyBonus);
}

// ✅ Authentication Functions
function showLoginForm() {
    DOM.loginForm.classList.remove('hidden');
    DOM.registerForm.classList.add('hidden');
    DOM.forgotForm.classList.add('hidden');
    
    DOM.loginTab.classList.add('text-gold-primary', 'border-b-2', 'border-gold-primary');
    DOM.loginTab.classList.remove('text-white/70');
    DOM.registerTab.classList.add('text-white/70');
    DOM.registerTab.classList.remove('text-gold-primary', 'border-b-2', 'border-gold-primary');
}

function showRegisterForm() {
    DOM.loginForm.classList.add('hidden');
    DOM.registerForm.classList.remove('hidden');
    DOM.forgotForm.classList.add('hidden');
    
    DOM.registerTab.classList.add('text-gold-primary', 'border-b-2', 'border-gold-primary');
    DOM.registerTab.classList.remove('text-white/70');
    DOM.loginTab.classList.add('text-white/70');
    DOM.loginTab.classList.remove('text-gold-primary', 'border-b-2', 'border-gold-primary');
}

async function handleLogin() {
    const phone = DOM.loginPhone.value.trim();
    const password = DOM.loginPassword.value.trim();
    
    if (!phone || !password) {
        showNotification('Please enter phone number and password', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                mobile: phone,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        if (data.success) {
            gameState.isLoggedIn = true;
            gameState.authToken = data.token;
            gameState.userData = data.user;
            
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            showMainApp();
            showNotification('Login successful!', 'success');
            playSound('swoosh');
            
            setTimeout(() => {
                connectWebSocket();
            }, 1000);
        } else {
            showNotification(data.error || 'Login failed!', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed!', 'error');
    }
}

// 1. Firebase Initialize (Apna Config yahan zaroor dalein)
// Pehle wale response mein bataya tha waisa setup rakhein

// Invisible Recaptcha Setup
window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    'size': 'invisible'
});
async function sendOtp() {
    const phone = DOM.registerPhone.value.trim();
    
    // Validations (Name, Password check)
    if (!phone || phone.length < 10) {
        showNotification('Sahi mobile number dalein', 'error');
        return;
    }

    const fullPhone = "+91" + phone;

    // Real OTP bhejne ka logic
    auth.signInWithPhoneNumber(fullPhone, window.recaptchaVerifier)
        .then((confirmationResult) => {
            window.confirmationResult = confirmationResult;
            DOM.otpSection.classList.remove('hidden'); // OTP box dikhayyein
            showNotification('Real OTP bhej diya gaya hai!', 'success');
        }).catch((error) => {
            console.error(error);
            showNotification('OTP nahi gaya: ' + error.message, 'error');
        });
}
async function verifyOtp() {
    const otp = DOM.otpInput.value.trim();

    if (!otp) {
        showNotification('OTP enter karein', 'error');
        return;
    }

    window.confirmationResult.confirm(otp)
        .then((result) => {
            // Agar yahan tak pahunche, matlab OTP SAHI HAI!
            showNotification('Mobile Verified!', 'success');
            
            // Ab yahan backend registration ka fetch call karein
            completeRegistration(); 
        }).catch((error) => {
            showNotification('Galat OTP!', 'error');
        });
}

// ✅ Navigation Functions
function navigateToPage(page) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    document.getElementById(`${page}-page`).classList.add('active');
    
    gameState.currentPage = page;
    
    const titles = {
        home: 'Premium Gaming Platform',
        games: 'BDG Games',
        activity: 'Daily Activities',
        promotion: 'Promotions & Referrals',
        account: 'My Account'
    };
    
    if (document.getElementById('page-title')) {
        document.getElementById('page-title').textContent = titles[page] || 'BDG GAME';
    }
    
    const header = document.getElementById('main-header');
    const agentBanner = document.getElementById('agent-banner');
    
    if (page === 'account') {
        if (header) header.classList.add('header-hidden');
        if (agentBanner) agentBanner.classList.add('header-hidden');
    } else {
        if (header) header.classList.remove('header-hidden');
        if (agentBanner) agentBanner.classList.remove('header-hidden');
    }
    
    stopAllGames();
    
    DOM.navButtons.forEach(btn => {
        btn.classList.remove('gold-gradient', 'text-white');
        btn.classList.add('hover:bg-gold-primary/10');
    });
    
    const activeBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
    if (activeBtn) {
        activeBtn.classList.add('gold-gradient', 'text-white');
        activeBtn.classList.remove('hover:bg-gold-primary/10');
    }
    
    playSound('click');
}

function switchGameTab(game) {
    gameState.currentGame = game;
    
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`.game-tab[data-game="${game}"]`)?.classList.add('active');
    
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(`${game}-section`)?.classList.add('active');
    
    if (game === 'wingo') {
        initWingoGame();
    } else if (game === 'aviator') {
        initAviatorGame();
    } else if (game === 'slots') {
        initSlotsGame();
    }
}

// ✅ WinGo Game Functions
function selectWingoTimeFrame(timeframe) {
    gameState.wingoTimeFrame = timeframe;
    
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.classList.remove('gold-gradient');
        btn.classList.add('bg-bdg-card', 'border', 'border-gold-primary/30');
    });
    
    const selectedBtn = document.querySelector(`.timeframe-btn[data-timeframe="${timeframe}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('gold-gradient');
        selectedBtn.classList.remove('bg-bdg-card', 'border', 'border-gold-primary/30');
    }
    
    startWingoTimer(timeframe);
}

function setWingoBetAmount(amount) {
    gameState.wingoBet = amount;
    updateWingoDisplay();
}

function selectWingoColor(color) {
    gameState.selectedColor = color;
    gameState.selectedNumber = null;
    gameState.selectedSize = null;
    
    document.querySelectorAll('.wingo-color-bet').forEach(btn => {
        btn.classList.remove('opacity-100');
        btn.classList.add('opacity-90');
    });
    
    const selectedBtn = document.querySelector(`.wingo-color-bet[data-color="${color}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('opacity-100');
        selectedBtn.classList.remove('opacity-90');
    }
    
    clearOtherWingoSelections('color');
}

function selectWingoNumber(number) {
    gameState.selectedNumber = number;
    gameState.selectedColor = null;
    gameState.selectedSize = null;
    
    document.querySelectorAll('.wingo-number-bet').forEach(btn => {
        btn.classList.remove('gold-gradient');
        btn.classList.add('bg-bdg-card');
    });
    
    const selectedBtn = document.querySelector(`.wingo-number-bet[data-number="${number}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('gold-gradient');
        selectedBtn.classList.remove('bg-bdg-card');
    }
    
    clearOtherWingoSelections('number');
}

function selectWingoSize(size) {
    gameState.selectedSize = size;
    gameState.selectedColor = null;
    gameState.selectedNumber = null;
    
    document.querySelectorAll('.wingo-size-bet').forEach(btn => {
        btn.classList.remove('bg-blue-700');
        btn.classList.add('bg-blue-600');
    });
    
    const selectedBtn = document.querySelector(`.wingo-size-bet[data-size="${size}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('bg-blue-700');
        selectedBtn.classList.remove('bg-blue-600');
    }
    
    clearOtherWingoSelections('size');
}

function clearOtherWingoSelections(currentType) {
    if (currentType !== 'color') {
        document.querySelectorAll('.wingo-color-bet').forEach(btn => {
            btn.classList.remove('opacity-100');
            btn.classList.add('opacity-90');
        });
    }
    
    if (currentType !== 'number') {
        document.querySelectorAll('.wingo-number-bet').forEach(btn => {
            btn.classList.remove('gold-gradient');
            btn.classList.add('bg-bdg-card');
        });
    }
    
    if (currentType !== 'size') {
        document.querySelectorAll('.wingo-size-bet').forEach(btn => {
            btn.classList.remove('bg-blue-700');
            btn.classList.add('bg-blue-600');
        });
    }
}

function clearWingoBet() {
    gameState.wingoBet = 0;
    gameState.selectedColor = null;
    gameState.selectedNumber = null;
    gameState.selectedSize = null;
    
    document.querySelectorAll('.wingo-amount-btn, .wingo-number-bet').forEach(btn => {
        btn.classList.remove('gold-gradient');
        btn.classList.add('bg-bdg-card');
    });
    
    document.querySelectorAll('.wingo-color-bet').forEach(btn => {
        btn.classList.remove('opacity-100');
        btn.classList.add('opacity-90');
    });
    
    document.querySelectorAll('.wingo-size-bet').forEach(btn => {
        btn.classList.remove('bg-blue-700');
        btn.classList.add('bg-blue-600');
    });
    
    updateWingoDisplay();
}

async function placeWingoBet() {
    if (gameState.wingoBet <= 0) {
        showNotification('Please select a bet amount!', 'error');
        return;
    }
    
    if (!gameState.selectedColor && !gameState.selectedNumber && !gameState.selectedSize) {
        showNotification('Please select a betting option!', 'error');
        return;
    }
    
    if (!gameState.userData || gameState.wingoBet > gameState.userData.wallet) {
        showNotification('Insufficient balance!', 'error');
        return;
    }
    
    const option = gameState.selectedColor || 
                   gameState.selectedNumber?.toString() || 
                   gameState.selectedSize;
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/place-bet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gameState.authToken}`
            },
            body: JSON.stringify({
                amount: gameState.wingoBet,
                option: option,
                gameMode: gameState.wingoTimeFrame.toString(),
                gameType: 'wingo'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (gameState.userData) {
                gameState.userData.wallet -= gameState.wingoBet;
                updateBalance();
            }
            
            const betRecord = {
                id: Date.now(),
                type: 'wingo',
                bet: gameState.wingoBet,
                option: option,
                status: 'Pending',
                time: new Date().toLocaleTimeString(),
                period: data.bet?.period || `#${Date.now()}`
            };
            
            gameState.wingoHistory.push(betRecord);
            gameState.gameHistory.push(betRecord);
            
            showNotification(`Bet placed: ₹${gameState.wingoBet} on ${option}`, 'success');
            playSound('coin');
            
            clearWingoBet();
            updateGameHistory();
            updateRecentGameHistory();
        } else {
            showNotification(data.error || 'Bet placement failed', 'error');
        }
    } catch (error) {
        console.error('Bet placement error:', error);
        showNotification('Bet placed (demo mode)', 'info');
        
        if (gameState.userData) {
            gameState.userData.wallet -= gameState.wingoBet;
            updateBalance();
        }
        
        const betRecord = {
            id: Date.now(),
            type: 'wingo',
            bet: gameState.wingoBet,
            option: option,
            status: 'Pending',
            time: new Date().toLocaleTimeString(),
            period: `#demo_${Date.now()}`
        };
        
        gameState.wingoHistory.push(betRecord);
        gameState.gameHistory.push(betRecord);
        
        clearWingoBet();
        updateGameHistory();
        updateRecentGameHistory();
    }
}

function startWingoTimer(timeframe) {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.wingoTimer = timeframe;
    updateWingoTimerDisplay();
    
    gameState.timerInterval = setInterval(() => {
        gameState.wingoTimer--;
        
        if (gameState.wingoTimer <= 0) {
            gameState.wingoTimer = timeframe;
            simulateWingoResult();
        }
        
        updateWingoTimerDisplay();
        
        if (gameState.wingoTimer <= 10 && gameState.wingoTimer > 0) {
            playSound('tik');
        }
    }, 1000);
}

function simulateWingoResult() {
    if (!gameState.userData) {
        console.warn('User data not available');
        return;
    }
    
    const resultNumber = Math.floor(Math.random() * 10);
    const resultColor = resultNumber === 0 ? 'green' : 
                       (resultNumber >= 1 && resultNumber <= 4) ? 'red' : 'violet';
    const resultSize = resultNumber >= 5 ? 'big' : 'small';
    
    const pendingBets = gameState.wingoHistory.filter(bet => 
        bet.status === 'Pending' && 
        bet.type === 'wingo'
    );
    
    pendingBets.forEach(bet => {
        let isWin = false;
        let winAmount = 0;
        
        if (bet.option === 'Green' && resultColor === 'green') isWin = true;
        if (bet.option === 'Red' && resultColor === 'red') isWin = true;
        if (bet.option === 'Violet' && (resultNumber === 0 || resultNumber === 5)) isWin = true;
        if (bet.option === 'Big' && resultNumber >= 5) isWin = true;
        if (bet.option === 'Small' && resultNumber < 5 && resultNumber !== 0) isWin = true;
        if (parseInt(bet.option) === resultNumber) isWin = true;
        
        if (isWin) {
            winAmount = bet.bet * (parseInt(bet.option) === resultNumber ? 9 : 1.9);
            
            bet.status = 'Win';
            bet.winAmount = winAmount;
            bet.result = resultNumber;
            bet.resultColor = resultColor;
            bet.resultSize = resultSize;
            
            if (gameState.userData) {
                gameState.userData.wallet += winAmount;
            }
            
            showWinPopup(winAmount, `Number: ${resultNumber}, ${resultColor}, ${resultSize}`);
            playSound('win');
        } else {
            bet.status = 'Loss';
            bet.result = resultNumber;
            bet.resultColor = resultColor;
            bet.resultSize = resultSize;
            
            showLossPopup(bet.bet, `Result: Number ${resultNumber}, ${resultColor}, ${resultSize}`);
            playSound('loss');
        }
    });
    
    updateBalance();
    updateGameHistory();
    updateRecentGameHistory();
    updateWingoResultsDisplay(resultNumber, resultColor, resultSize);
}

// ✅ Aviator Game Functions
function setAviatorBetAmount(amount) {
    gameState.aviatorBet = amount;
    updateAviatorDisplay();
}

function clearAviatorBet() {
    gameState.aviatorBet = 0;
    gameState.isAviatorRunning = false;
    
    if (gameState.aviatorInterval) {
        clearInterval(gameState.aviatorInterval);
        gameState.aviatorInterval = null;
    }
    
    document.getElementById('aviator-cashout-btn').classList.add('hidden');
    updateAviatorDisplay();
}

async function placeAviatorBet() {
    if (gameState.aviatorBet <= 0) {
        showNotification('Please select a bet amount!', 'error');
        return;
    }
    
    if (!gameState.userData || gameState.aviatorBet > gameState.userData.wallet) {
        showNotification('Insufficient balance!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/place-bet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gameState.authToken}`
            },
            body: JSON.stringify({
                amount: gameState.aviatorBet,
                gameMode: 'aviator',
                gameType: 'aviator',
                option: 'aviator'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (gameState.userData) {
                gameState.userData.wallet -= gameState.aviatorBet;
                updateBalance();
            }
            
            startAviatorGame();
            
            const betRecord = {
                id: Date.now(),
                type: 'aviator',
                bet: gameState.aviatorBet,
                status: 'Playing',
                time: new Date().toLocaleTimeString()
            };
            
            gameState.aviatorHistory.push(betRecord);
            gameState.gameHistory.push(betRecord);
            
            showNotification(`Aviator bet placed: ₹${gameState.aviatorBet}`, 'success');
            playSound('swoosh');
        }
    } catch (error) {
        console.error('Aviator bet error:', error);
        showNotification('Aviator bet placed (demo mode)', 'info');
        
        if (gameState.userData) {
            gameState.userData.wallet -= gameState.aviatorBet;
            updateBalance();
        }
        startAviatorGame();
    }
}

function startAviatorGame() {
    gameState.isAviatorRunning = true;
    gameState.aviatorMultiplier = 1.00;
    
    document.getElementById('aviator-cashout-btn').classList.remove('hidden');
    
    gameState.aviatorInterval = setInterval(() => {
        const increase = 0.05 + Math.random() * 0.2;
        gameState.aviatorMultiplier += increase;
        
        updateAviatorDisplay();
        
        const crashPoint = 1.2 + Math.random() * 8.8;
        
        if (gameState.aviatorMultiplier >= crashPoint) {
            clearInterval(gameState.aviatorInterval);
            gameState.aviatorInterval = null;
            gameState.isAviatorRunning = false;
            
            document.getElementById('aviator-cashout-btn').classList.add('hidden');
            
            const betRecord = gameState.aviatorHistory[gameState.aviatorHistory.length - 1];
            if (betRecord) {
                betRecord.status = 'Loss';
                betRecord.multiplier = gameState.aviatorMultiplier.toFixed(2) + 'x';
            }
            
            showLossPopup(gameState.aviatorBet, `Crashed at ${gameState.aviatorMultiplier.toFixed(2)}x`);
            playSound('loss');
            
            gameState.aviatorBet = 0;
            updateAviatorDisplay();
            updateGameHistory();
        }
    }, 200);
}

function cashoutAviator() {
    if (!gameState.isAviatorRunning || !gameState.aviatorInterval) return;
    
    clearInterval(gameState.aviatorInterval);
    gameState.aviatorInterval = null;
    gameState.isAviatorRunning = false;
    
    const winAmount = gameState.aviatorBet * gameState.aviatorMultiplier;
    
    if (gameState.userData) {
        gameState.userData.wallet += winAmount;
        updateBalance();
    }
    
    const betRecord = gameState.aviatorHistory[gameState.aviatorHistory.length - 1];
    if (betRecord) {
        betRecord.status = 'Win';
        betRecord.winAmount = winAmount;
        betRecord.multiplier = gameState.aviatorMultiplier.toFixed(2) + 'x';
    }
    
    showWinPopup(winAmount, `Cashed out at ${gameState.aviatorMultiplier.toFixed(2)}x`);
    playSound('win');
    
    document.getElementById('aviator-cashout-btn').classList.add('hidden');
    gameState.aviatorBet = 0;
    updateAviatorDisplay();
    updateGameHistory();
}

// ✅ Slots Game Functions
function setSlotsBetAmount(amount) {
    gameState.slotsBet = amount;
    updateSlotsDisplay();
}

async function spinSlots() {
    if (gameState.slotsBet <= 0) {
        showNotification('Please select a bet amount!', 'error');
        return;
    }
    
    if (!gameState.userData || gameState.slotsBet > gameState.userData.wallet) {
        showNotification('Insufficient balance!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/place-bet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gameState.authToken}`
            },
            body: JSON.stringify({
                amount: gameState.slotsBet,
                gameMode: 'slots',
                gameType: 'slots',
                option: 'slots'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (gameState.userData) {
                gameState.userData.wallet -= gameState.slotsBet;
                updateBalance();
            }
            
            startSlotsAnimation();
            
            const betRecord = {
                id: Date.now(),
                type: 'slots',
                bet: gameState.slotsBet,
                status: 'Spinning',
                time: new Date().toLocaleTimeString()
            };
            
            gameState.slotsHistory.push(betRecord);
            gameState.gameHistory.push(betRecord);
            
            showNotification(`Slots spin: ₹${gameState.slotsBet}`, 'success');
        }
    } catch (error) {
        console.error('Slots error:', error);
        
        if (gameState.userData) {
            gameState.userData.wallet -= gameState.slotsBet;
            updateBalance();
        }
        startSlotsAnimation();
    }
}

function startSlotsAnimation() {
    const reels = ['diamond', 'gem', 'crown', 'seven', 'bar'];
    const reelElements = [
        document.getElementById('reel1'),
        document.getElementById('reel2'),
        document.getElementById('reel3')
    ];
    
    reelElements.forEach(reel => {
        reel.classList.add('spinning');
        reel.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    });
    
    setTimeout(() => {
        reelElements.forEach(reel => {
            reel.classList.remove('spinning');
        });
        
        const results = [];
        for (let i = 0; i < 3; i++) {
            const randomReel = reels[Math.floor(Math.random() * reels.length)];
            results.push(randomReel);
        }
        
        const icons = {
            'diamond': 'fa-diamond',
            'gem': 'fa-gem',
            'crown': 'fa-crown',
            'seven': 'fa-dice',
            'bar': 'fa-chart-bar'
        };
        
        const colors = {
            'diamond': 'text-blue-400',
            'gem': 'text-purple-400',
            'crown': 'text-yellow-400',
            'seven': 'text-red-400',
            'bar': 'text-green-400'
        };
        
        for (let i = 0; i < 3; i++) {
            reelElements[i].innerHTML = `<i class="fas ${icons[results[i]]} ${colors[results[i]]}"></i>`;
        }
        
        const allSame = results[0] === results[1] && results[1] === results[2];
        
        if (allSame) {
            const multipliers = {
                'diamond': 50,
                'gem': 25,
                'crown': 15,
                'seven': 10,
                'bar': 5
            };
            
            const multiplier = multipliers[results[0]];
            const winAmount = gameState.slotsBet * multiplier;
            
            if (gameState.userData) {
                gameState.userData.wallet += winAmount;
                updateBalance();
            }
            
            const betRecord = gameState.slotsHistory[gameState.slotsHistory.length - 1];
            if (betRecord) {
                betRecord.status = 'Win';
                betRecord.winAmount = winAmount;
                betRecord.combination = `3 ${results[0]}s`;
                betRecord.multiplier = `${multiplier}x`;
            }
            
            showWinPopup(winAmount, `3 ${results[0]}s - ${multiplier}x`);
            playSound('win');
        } else {
            const betRecord = gameState.slotsHistory[gameState.slotsHistory.length - 1];
            if (betRecord) {
                betRecord.status = 'Loss';
                betRecord.combination = `${results[0]}, ${results[1]}, ${results[2]}`;
            }
            
            showLossPopup(gameState.slotsBet, 'Better luck next time!');
            playSound('loss');
        }
        
        gameState.slotsBet = 0;
        updateSlotsDisplay();
        updateGameHistory();
    }, 2000);
}

// ✅ Display Update Functions
function updateBalance() {
    if (!gameState.userData || typeof gameState.userData.wallet !== 'number') {
        console.warn('User data or wallet is not available');
        return;
    }
    
    const balanceElements = document.querySelectorAll('#balance, #main-balance');
    balanceElements.forEach(el => {
        if (el) {
            el.textContent = gameState.userData.wallet.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    });
}

function updateWingoDisplay() {
    const currentBetElement = document.getElementById('wingo-current-bet');
    const potentialWinElement = document.getElementById('wingo-potential-win');
    
    if (currentBetElement) {
        currentBetElement.textContent = gameState.wingoBet;
    }
    
    if (potentialWinElement && gameState.wingoBet > 0) {
        const multiplier = 1.98;
        const potentialWin = gameState.wingoBet * multiplier;
        potentialWinElement.textContent = potentialWin.toFixed(2);
    }
}

function updateWingoTimerDisplay() {
    const timerElement = document.getElementById('wingo-timer');
    const timerBar = document.getElementById('wingo-timer-bar');
    
    if (timerElement) {
        const mins = Math.floor(gameState.wingoTimer / 60);
        const secs = gameState.wingoTimer % 60;
        timerElement.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    if (timerBar) {
        const percentage = (gameState.wingoTimer / gameState.wingoTimeFrame) * 100;
        timerBar.style.width = `${percentage}%`;
    }
}

function updateAviatorDisplay() {
    const betElement = document.getElementById('aviator-bet');
    const multiplierElement = document.getElementById('aviator-multiplier');
    const cashoutElement = document.getElementById('aviator-cashout');
    
    if (betElement) betElement.textContent = gameState.aviatorBet;
    if (multiplierElement) multiplierElement.textContent = gameState.aviatorMultiplier.toFixed(2) + 'x';
    if (cashoutElement) cashoutElement.textContent = (gameState.aviatorBet * gameState.aviatorMultiplier).toFixed(2);
}

function updateSlotsDisplay() {
    const betElement = document.getElementById('slots-bet');
    const winElement = document.getElementById('slots-win');
    
    if (betElement) betElement.textContent = gameState.slotsBet;
    if (winElement) winElement.textContent = (gameState.slotsBet * 50).toFixed(2);
}

function updateGameHistory() {
    const container = document.getElementById('game-period-history');
    if (!container) return;
    
    container.innerHTML = '';
    
    const recentHistory = [...gameState.gameHistory]
        .sort((a, b) => b.id - a.id)
        .slice(0, 5);
    
    recentHistory.forEach(record => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gold-primary/10';
        
        let gameName = '';
        let result = '';
        let resultClass = '';
        
        if (record.type === 'wingo') {
            gameName = 'WinGo';
            if (record.status === 'Win') {
                result = `+₹${record.winAmount || record.bet}`;
                resultClass = 'text-green-500';
            } else if (record.status === 'Loss') {
                result = `-₹${record.bet}`;
                resultClass = 'text-red-500';
            } else {
                result = `₹${record.bet}`;
                resultClass = 'text-yellow-500';
            }
        } else if (record.type === 'aviator') {
            gameName = 'Aviator';
            if (record.status === 'Win') {
                result = `+₹${record.winAmount || record.bet}`;
                resultClass = 'text-green-500';
            } else if (record.status === 'Loss') {
                result = `-₹${record.bet}`;
                resultClass = 'text-red-500';
            } else {
                result = `₹${record.bet}`;
                resultClass = 'text-yellow-500';
            }
        } else if (record.type === 'slots') {
            gameName = 'Slots';
            if (record.status === 'Win') {
                result = `+₹${record.winAmount || record.bet}`;
                resultClass = 'text-green-500';
            } else if (record.status === 'Loss') {
                result = `-₹${record.bet}`;
                resultClass = 'text-red-500';
            } else {
                result = `₹${record.bet}`;
                resultClass = 'text-yellow-500';
            }
        }
        
        row.innerHTML = `
            <td class="py-2">${gameName}</td>
            <td class="py-2">${record.period || 'N/A'}</td>
            <td class="py-2 ${resultClass} font-bold">${result}</td>
            <td class="py-2">₹${record.winAmount || record.bet || '0'}</td>
            <td class="py-2">${record.time || 'Just now'}</td>
        `;
        container.appendChild(row);
    });
}

function updateRecentGameHistory() {
    const container = document.getElementById('recent-game-history');
    if (!container) return;
    
    container.innerHTML = '';
    
    const recentHistory = [...gameState.gameHistory]
        .sort((a, b) => b.id - a.id)
        .slice(0, 3);
    
    recentHistory.forEach(game => {
        const item = document.createElement('div');
        item.className = 'game-history-item';
        
        let icon = 'fa-gamepad';
        if (game.type === 'wingo') icon = 'fa-clock';
        if (game.type === 'aviator') icon = 'fa-plane';
        if (game.type === 'slots') icon = 'fa-gamepad';
        
        let resultClass = game.status === 'Win' ? 'text-green-500' : 'text-red-500';
        
        item.innerHTML = `
            <div class="w-8 h-8 gold-gradient rounded-full flex items-center justify-center">
                <i class="fas ${icon}"></i>
            </div>
            <div class="flex-1">
                <div class="flex justify-between">
                    <span class="font-bold">${game.type === 'wingo' ? 'WinGo' : game.type === 'aviator' ? 'Aviator' : 'Slots'}</span>
                    <span class="${resultClass}">${game.status}</span>
                </div>
                <div class="flex justify-between text-xs opacity-70">
                    <span>Amount: ₹${game.winAmount || game.bet}</span>
                    <span>${game.time}</span>
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
}

function updateWingoResultsDisplay(number, color, size) {
    const container = document.getElementById('wingo-results-container');
    if (!container) return;
    
    const resultDiv = document.createElement('div');
    const bgColor = color === 'green' ? 'bg-bdg-green' : color === 'red' ? 'bg-bdg-red' : 'bg-purple-600';
    
    resultDiv.className = `flex-shrink-0 w-16 h-16 ${bgColor} rounded-bdg flex flex-col items-center justify-center`;
    resultDiv.innerHTML = `
        <p class="text-xs">#${Math.floor(100000 + Math.random() * 900000)}</p>
        <p class="text-xl font-bold">${number}</p>
        <p class="text-xs">${size}</p>
    `;
    
    container.insertBefore(resultDiv, container.firstChild);
    
    if (container.children.length > 6) {
        container.removeChild(container.lastChild);
    }
}

// ✅ Modal Functions
function openModal(type) {
    if (type === 'deposit') {
        DOM.depositModal.classList.add('active');
    } else if (type === 'withdraw') {
        DOM.withdrawModal.classList.add('active');
        updateWithdrawBalance();
    } else if (type === 'agent') {
        DOM.agentModal.classList.add('active');
    }
}

function showCustomBetInput(gameType) {
    const modal = document.getElementById('custom-bet-input');
    modal.dataset.game = gameType;
    modal.classList.add('active');
    document.getElementById('custom-bet-amount').focus();
}

function setCustomBet() {
    const modal = document.getElementById('custom-bet-input');
    const amount = parseInt(document.getElementById('custom-bet-amount').value);
    const gameType = modal.dataset.game;
    
    if (!amount || amount < 10) {
        showNotification('Minimum bet amount is ₹10', 'error');
        return;
    }
    
    if (gameType === 'wingo') {
        setWingoBetAmount(amount);
    } else if (gameType === 'aviator') {
        setAviatorBetAmount(amount);
    } else if (gameType === 'slots') {
        setSlotsBetAmount(amount);
    }
    
    modal.classList.remove('active');
    document.getElementById('custom-bet-amount').value = '';
}

function updateWithdrawBalance() {
    const element = document.getElementById('available-balance');
    if (element && gameState.userData) {
        element.textContent = gameState.userData.wallet.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

// ✅ Popup Functions
function showWinPopup(amount, message) {
    const winAmountElement = document.getElementById('win-amount');
    if (winAmountElement) {
        winAmountElement.textContent = amount.toFixed(2);
    }
    
    DOM.winPopup.classList.add('active');
    playSound('win');
}

function showLossPopup(amount, message) {
    const lossAmountElement = document.getElementById('loss-amount');
    if (lossAmountElement) {
        lossAmountElement.textContent = amount;
    }
    
    DOM.lossPopup.classList.add('active');
    playSound('loss');
}

// ✅ Account Functions
function handleAccountMenuItem(type) {
    if (type === 'transaction') {
        showTransactionHistory('all');
    } else if (type === 'deposit') {
        showTransactionHistory('deposit');
    } else if (type === 'withdrawal') {
        showTransactionHistory('withdrawal');
    } else if (type === 'game') {
        showTransactionHistory('game');
    } else if (type === 'security') {
        showSecuritySettings();
    } else if (type === 'support') {
        showSupportInfo();
    } else if (type === 'about') {
        showAboutInfo();
    }
}

function showTransactionHistory(type) {
    const modal = document.getElementById('transaction-modal');
    const title = document.getElementById('transaction-modal-title');
    const list = document.getElementById('transaction-list');
    
    const titles = {
        'all': 'Transaction History',
        'deposit': 'Deposit History',
        'withdrawal': 'Withdrawal History',
        'game': 'Game History'
    };
    
    title.textContent = titles[type] || 'Transaction History';
    list.innerHTML = '';
    
    const transactions = [
        { id: 1, type: 'deposit', amount: 5000, method: 'UPI', status: 'Completed', time: '2 hours ago' },
        { id: 2, type: 'withdrawal', amount: 2000, method: 'Bank Transfer', status: 'Processing', time: '5 hours ago' },
        { id: 3, type: 'game', amount: 500, game: 'WinGo', result: 'Win', time: '1 day ago' },
        { id: 4, type: 'deposit', amount: 3000, method: 'Crypto', status: 'Completed', time: '2 days ago' },
        { id: 5, type: 'bonus', amount: 100, reason: 'Daily Bonus', time: '3 days ago' }
    ];
    
    transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        let icon = 'fa-wallet';
        let color = 'text-gold-primary';
        let title = transaction.type.toUpperCase();
        
        if (transaction.type === 'deposit') {
            icon = 'fa-arrow-down';
            color = 'text-green-500';
        } else if (transaction.type === 'withdrawal') {
            icon = 'fa-arrow-up';
            color = 'text-red-500';
        } else if (transaction.type === 'bonus') {
            icon = 'fa-gift';
            color = 'text-yellow-500';
        }
        
        item.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-bdg-card rounded-full flex items-center justify-center">
                        <i class="fas ${icon} ${color}"></i>
                    </div>
                    <div>
                        <p class="font-bold">${title}</p>
                        <p class="text-xs opacity-70">${transaction.method || transaction.reason || ''}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold ${transaction.type === 'deposit' || transaction.type === 'bonus' ? 'text-green-500' : 'text-red-500'}">
                        ${transaction.type === 'deposit' || transaction.type === 'bonus' ? '+' : '-'}₹${transaction.amount}
                    </p>
                    <p class="text-xs opacity-70">${transaction.time}</p>
                    <span class="text-xs ${transaction.status === 'Completed' ? 'text-green-500' : 
                        transaction.status === 'Processing' ? 'text-yellow-500' : 'text-gray-500'}">
                        ${transaction.status || ''}
                    </span>
                </div>
            </div>
        `;
        list.appendChild(item);
    });
    
    modal.classList.remove('hidden');
}

function showSecuritySettings() {
    const modal = document.getElementById('transaction-modal');
    const title = document.getElementById('transaction-modal-title');
    const list = document.getElementById('transaction-list');
    
    title.textContent = 'Security Settings';
    list.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-bdg-card rounded-bdg">
                <h4 class="font-bold mb-2">Change Password</h4>
                <input type="password" class="input-field mb-2" placeholder="Current Password">
                <input type="password" class="input-field mb-2" placeholder="New Password">
                <input type="password" class="input-field mb-3" placeholder="Confirm New Password">
                <button class="w-full py-2 gold-gradient rounded-bdg font-bold">Update Password</button>
            </div>
            <div class="p-4 bg-bdg-card rounded-bdg">
                <h4 class="font-bold mb-2">Two-Factor Authentication</h4>
                <p class="text-sm opacity-70 mb-3">Add extra security to your account</p>
                <button class="w-full py-2 bg-bdg-card border border-gold-primary/30 rounded-bdg font-bold">Enable 2FA</button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function showSupportInfo() {
    const modal = document.getElementById('transaction-modal');
    const title = document.getElementById('transaction-modal-title');
    const list = document.getElementById('transaction-list');
    
    title.textContent = 'Customer Support';
    list.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-bdg-card rounded-bdg text-center">
                <i class="fas fa-headset text-4xl text-gold-primary mb-3"></i>
                <h4 class="font-bold mb-2">24/7 Customer Support</h4>
                <p class="text-sm opacity-70 mb-3">We're here to help you anytime</p>
                <div class="space-y-2">
                    <a href="#" class="block p-3 bg-bdg-card rounded-bdg hover:bg-gold-primary/10">
                        <i class="fas fa-whatsapp mr-2 text-green-500"></i> WhatsApp Support
                    </a>
                    <a href="#" class="block p-3 bg-bdg-card rounded-bdg hover:bg-gold-primary/10">
                        <i class="fas fa-phone-alt mr-2"></i> Call: +91-XXXXXXXXXX
                    </a>
                    <a href="#" class="block p-3 bg-bdg-card rounded-bdg hover:bg-gold-primary/10">
                        <i class="fas fa-envelope mr-2"></i> Email: support@bdggame.com
                    </a>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function showAboutInfo() {
    const modal = document.getElementById('transaction-modal');
    const title = document.getElementById('transaction-modal-title');
    const list = document.getElementById('transaction-list');
    
    title.textContent = 'About BDG GAME';
    list.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-bdg-card rounded-bdg text-center">
                <div class="w-20 h-20 bg-white/5 rounded-[1.5rem] flex items-center justify-center backdrop-blur-md border border-gold-primary/30 mx-auto mb-4">
                    <span class="text-3xl font-bold text-gold-primary">BDG</span>
                </div>
                <h4 class="font-bold mb-2">BDG GAME</h4>
                <p class="text-sm opacity-70 mb-3">Version 1.0.0</p>
                <p class="text-sm opacity-70 mb-4">Premium Gaming Platform offering secure and fair gaming experience with instant withdrawals and 24/7 support.</p>
                <div class="text-xs opacity-50">
                    <p>© 2024 BDG GAME. All rights reserved.</p>
                    <p class="mt-2">Licensed and Regulated</p>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function handleLogout() {
    // Custom confirmation modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-bdg-card rounded-bdg p-6 max-w-sm w-full mx-4">
            <h3 class="text-xl font-bold mb-4">Confirm Logout</h3>
            <p class="mb-6">Are you sure you want to logout?</p>
            <div class="flex gap-3">
                <button id="cancel-logout" class="flex-1 py-2 bg-bdg-card border border-gold-primary/30 rounded-bdg hover:bg-gold-primary/10">
                    Cancel
                </button>
                <button id="confirm-logout" class="flex-1 py-2 gold-gradient rounded-bdg font-bold">
                    Logout
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('cancel-logout').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.getElementById('confirm-logout').addEventListener('click', () => {
        document.body.removeChild(modal);
        
        gameState.isLoggedIn = false;
        gameState.authToken = null;
        gameState.userData = null;
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        if (ws) {
            ws.close();
            ws = null;
        }
        
        showLoginPage();
        showNotification('Logged out successfully!', 'success');
    });
}

// ✅ Promotion Functions
function claimWelcomeBonus() {
    if (gameState.bonusClaimed) {
        showNotification('Welcome bonus already claimed!', 'error');
        return;
    }
    
    if (gameState.userData) {
        gameState.userData.wallet += 500;
    }
    gameState.bonusClaimed = true;
    updateBalance();
    
    showNotification('Welcome bonus of ₹500 claimed successfully!', 'success');
    playSound('coin');
}

function claimDailyBonus() {
    if (gameState.dailyBonusClaimed) {
        showNotification('Daily bonus already claimed today!', 'error');
        return;
    }
    
    if (gameState.userData) {
        gameState.userData.wallet += 100;
    }
    gameState.dailyBonusClaimed = true;
    gameState.dailyBonusDays[5] = true;
    updateBalance();
    
    const day6 = document.querySelector('.bg-yellow-400\\/30');
    if (day6) {
        day6.innerHTML = `
            <p class="text-xs">Day 6</p>
            <p class="font-bold">₹100</p>
            <div class="mt-1"><i class="fas fa-check text-green-300"></i></div>
        `;
    }
    
    showNotification('Daily bonus of ₹100 claimed successfully!', 'success');
    playSound('coin');
}

function copyReferralCode() {
    const referralCode = gameState.userData?.inviteCode || 'NNGJ20PN';
    navigator.clipboard.writeText(referralCode)
        .then(() => showNotification('Referral code copied to clipboard!', 'success'))
        .catch(() => showNotification('Failed to copy referral code', 'error'));
}

function shareReferralLink() {
    const referralLink = `https://bdggame.com/ref/${gameState.userData?.inviteCode || 'NNGJ20PN'}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Join BDG GAME',
            text: 'Get ₹500 welcome bonus when you join using my link!',
            url: referralLink,
        });
    } else {
        navigator.clipboard.writeText(referralLink)
            .then(() => showNotification('Referral link copied to clipboard!', 'success'))
            .catch(() => showNotification('Failed to copy referral link', 'error'));
    }
}

// ✅ Connection Functions
function checkBackendConnection() {
    fetch(`${BACKEND_URL}/health`)
        .then(response => response.json())
        .then(data => {
            gameState.backendConnected = true;
            console.log('✅ Backend connection established');
        })
        .catch(error => {
            console.log('⚠️ Backend connection failed');
        });
}

function connectWebSocket() {
    if (!gameState.isLoggedIn) {
        console.log('User not logged in, skipping WebSocket connection');
        return;
    }
    
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket already connected or connecting');
        return;
    }
    
    try {
        console.log('Connecting to WebSocket...');
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            console.log('✅ WebSocket connected successfully');
            reconnectAttempts = 0;
            
            ws.send(JSON.stringify({
                type: 'AUTHENTICATE',
                userId: gameState.userData?.userId || 'DEMO_9876543210',
                gameMode: gameState.currentGame === 'wingo' ? '30' : gameState.currentGame
            }));
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket message received:', data.type);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        };
        
        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };
        
        ws.onclose = (event) => {
            console.log(`🔌 WebSocket disconnected: ${event.code} ${event.reason}`);
            
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && gameState.isLoggedIn) {
                reconnectAttempts++;
                const delay = Math.min(1000 * reconnectAttempts, 10000);
                console.log(`Reconnecting in ${delay}ms... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                
                setTimeout(() => {
                    if (gameState.isLoggedIn) {
                        connectWebSocket();
                    }
                }, delay);
            } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.log('Max reconnection attempts reached');
                showNotification('Connection lost. Please refresh the page.', 'error');
            }
        };
    } catch (error) {
        console.error('❌ WebSocket connection error:', error);
    }
}

function handleWebSocketMessage(data) {
    console.log('WebSocket message:', data.type);
    
    try {
        switch (data.type) {
            case 'CONNECTED':
                console.log('WebSocket connection confirmed');
                break;
                
            case 'AUTHENTICATED':
                console.log('WebSocket authentication successful');
                break;
                
            case 'WINGO_UPDATE':
                if (data.gameMode === gameState.wingoTimeFrame.toString()) {
                    gameState.wingoTimer = data.timer;
                    updateWingoTimerDisplay();
                }
                break;
                
            case 'WINGO_RESULT':
                console.log('Wingo result received:', data.result);
                if (data.gameMode === gameState.wingoTimeFrame.toString()) {
                    updateRecentGameHistory();
                }
                break;
                
            case 'AVIATOR_UPDATE':
                if (data.gameMode === 'aviator') {
                    if (data.type === 'MULTIPLIER_UPDATE') {
                        gameState.aviatorMultiplier = data.multiplier;
                        updateAviatorDisplay();
                    }
                }
                break;
                
            case 'BET_RESULT':
                if (data.status === 'win' && gameState.userData) {
                    gameState.userData.wallet += data.winAmount || 0;
                    updateBalance();
                    showWinPopup(data.winAmount || 0, 'Congratulations!');
                }
                break;
                
            case 'BALANCE_UPDATE':
                if (data.balance !== undefined && gameState.userData) {
                    gameState.userData.wallet = data.balance;
                    updateBalance();
                }
                break;
                
            case 'PONG':
                break;
                
            case 'ERROR':
                showNotification(data.message || 'WebSocket error', 'error');
                break;
                
            default:
                console.log('Unknown WebSocket message:', data);
        }
    } catch (error) {
        console.error('Error handling WebSocket message:', error);
    }
}

// ✅ Utility Functions
function showLoginPage() {
    DOM.loginPage.classList.remove('hidden');
    DOM.app.classList.add('hidden');
    showLoginForm();
}

function showMainApp() {
    DOM.loginPage.classList.add('hidden');
    DOM.app.classList.remove('hidden');
    navigateToPage('home');
    updateBalance();
    updateGameHistory();
    updateRecentGameHistory();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg max-w-sm transform transition-transform duration-300 translate-x-full`;
    
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-yellow-500 text-white'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-3"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
        notification.classList.add('translate-x-0');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-0');
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function stopAllGames() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    if (gameState.aviatorInterval) {
        clearInterval(gameState.aviatorInterval);
        gameState.aviatorInterval = null;
    }
    
    gameState.isAviatorRunning = false;
    document.getElementById('aviator-cashout-btn')?.classList.add('hidden');
}

function mockApiCall(endpoint, data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (endpoint === '/api/login' && data.mobile === '9876543210' && data.password === 'demo123') {
                resolve({
                    success: true,
                    token: 'mock_jwt_token_' + Date.now(),
                    user: {
                        userId: 'DEMO_9876543210',
                        mobile: data.mobile,
                        name: 'Demo Player',
                        wallet: 12560.75,
                        inviteCode: 'NNGJ20PN',
                        level: 'Gold',
                        totalProfit: 4520.50,
                        streak: 7,
                        teamSize: 15,
                        commission: 2540.00,
                        rank: '#47'
                    }
                });
            } else {
                resolve({ success: false, error: 'Invalid credentials' });
            }
        }, 500);
    });
}

function initWingoGame() {
    selectWingoTimeFrame(30);
    updateWingoDisplay();
}

function initAviatorGame() {
    gameState.aviatorMultiplier = 1.00;
    const multiplierElement = document.getElementById('aviator-multiplier');
    if (multiplierElement) {
        multiplierElement.textContent = '1.00x';
    }
    document.getElementById('aviator-cashout-btn')?.classList.add('hidden');
}

function initSlotsGame() {
    updateSlotsDisplay();
}

function initSounds() {
    const sounds = {
        click: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3'),
        tik: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-fast-clock-ticking-1050.mp3'),
        win: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3'),
        loss: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3'),
        coin: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-coins-handling-1996.mp3'),
        swoosh: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-whoosh-fast-swoosh-955.mp3')
    };
    
    Object.values(sounds).forEach(audio => {
        audio.preload = 'auto';
    });
    
    window.gameSounds = sounds;
}

function playSound(name) {
    if (window.gameSounds && window.gameSounds[name]) {
        try {
            window.gameSounds[name].currentTime = 0;
            window.gameSounds[name].play().catch(() => {});
        } catch (error) {
            console.log('Sound play error:', error);
        }
    }
}

// ✅ Initialize the application when page loads
window.addEventListener('DOMContentLoaded', initApp);

// ✅ Expose functions to global scope for inline event handlers
window.navigateToPage = navigateToPage;
window.switchGameTab = switchGameTab;
window.openModal = openModal;
window.showCustomBetInput = showCustomBetInput;
window.setCustomBet = setCustomBet;
window.handleLogout = handleLogout;
window.copyReferralCode = copyReferralCode;
window.shareReferralLink = shareReferralLink;
window.claimDailyBonus = claimDailyBonus;
window.claimWelcomeBonus = claimWelcomeBonus;