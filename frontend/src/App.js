import { initializeApp } from "firebase/app";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();

// Backend Configuration
const BACKEND_URL = 'https://colorpro-vfgm.onrender.com';
const WS_URL = BACKEND_URL.replace('https', 'wss').replace('http', 'ws');

// Game State
let gameState = {
    isLoggedIn: false,
    authToken: localStorage.getItem('authToken') || null,
    userData: JSON.parse(localStorage.getItem('userData')) || null,
    ws: null,
    wsConnected: false,
    currentPage: 'home',
    currentGame: 'wingo',
    wingoBet: 0,
    aviatorBet: 0,
    slotsBet: 0,
    wingoTimeFrame: 30,
    wingoTimer: null,
    aviatorMultiplier: 1.00,
    aviatorInterval: null,
    selectedPaymentMethod: 'upi',
    selectedWithdrawMethod: 'bank',
    gameHistory: [],
    transactionHistory: [],
    wingoHistory: [],
    aviatorHistory: [],
    slotsHistory: [],
    bonusClaimed: false,
    dailyBonusClaimed: false
};

// DOM Elements
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
    connectionStatus: document.getElementById('connection-status'),
    connectionDot: document.getElementById('connection-dot')
};

// Initialize App
export function initApp() {
    console.log('🚀 BDG GAME Initializing...');
    
    // Setup recaptcha
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
            console.log('reCAPTCHA solved');
        }
    });
    
    // Check existing login
    if (gameState.authToken && gameState.userData) {
        gameState.isLoggedIn = true;
        showMainApp();
        connectWebSocket();
    } else {
        showLoginPage();
    }
    
    initEventListeners();
}

// Show Login Page
function showLoginPage() {
    setTimeout(() => {
        DOM.loadingScreen.style.display = 'none';
        DOM.loginPage.classList.remove('hidden');
        DOM.app.classList.add('hidden');
    }, 1500);
}

// Show Main App
function showMainApp() {
    DOM.loadingScreen.style.display = 'none';
    DOM.loginPage.classList.add('hidden');
    DOM.app.classList.remove('hidden');
    updateBalance();
    updateUserProfile();
}

// Initialize Event Listeners
function initEventListeners() {
    // Auth Listeners
    DOM.loginTab?.addEventListener('click', showLoginForm);
    DOM.registerTab?.addEventListener('click', showRegisterForm);
    DOM.loginBtn?.addEventListener('click', handleLogin);
    DOM.sendOtpBtn?.addEventListener('click', handleSendOtp);
    DOM.verifyOtpBtn?.addEventListener('click', handleVerifyOtp);
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            navigateToPage(this.dataset.page);
        });
    });
    
    // Game Listeners
    initGameListeners();
}

// Show Login Form
function showLoginForm() {
    DOM.loginForm.classList.remove('hidden');
    DOM.registerForm.classList.add('hidden');
    DOM.forgotForm.classList.add('hidden');
    DOM.loginTab.classList.add('text-gold-primary', 'border-b-2', 'border-gold-primary');
    DOM.loginTab.classList.remove('text-white/70');
    DOM.registerTab.classList.add('text-white/70');
    DOM.registerTab.classList.remove('text-gold-primary', 'border-b-2', 'border-gold-primary');
}

// Show Register Form
function showRegisterForm() {
    DOM.loginForm.classList.add('hidden');
    DOM.registerForm.classList.remove('hidden');
    DOM.forgotForm.classList.add('hidden');
    DOM.registerTab.classList.add('text-gold-primary', 'border-b-2', 'border-gold-primary');
    DOM.registerTab.classList.remove('text-white/70');
    DOM.loginTab.classList.add('text-white/70');
    DOM.loginTab.classList.remove('text-gold-primary', 'border-b-2', 'border-gold-primary');
}

// Handle Login
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
            
            // Connect WebSocket
            connectWebSocket();
        } else {
            showNotification(data.error || 'Login failed!', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed!', 'error');
    }
}

// Handle Send OTP
async function handleSendOtp() {
    const name = DOM.registerName.value.trim();
    const phone = DOM.registerPhone.value.trim();
    const password = DOM.registerPassword.value.trim();
    const confirmPassword = DOM.registerConfirmPassword.value.trim();
    const termsAgreed = DOM.termsAgree.checked;
    
    // Validations
    if (!name || !phone || !password || !confirmPassword) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    if (!termsAgreed) {
        showNotification('Please agree to Terms & Conditions', 'error');
        return;
    }
    
    if (phone.length !== 10) {
        showNotification('Please enter valid 10-digit phone number', 'error');
        return;
    }
    
    try {
        const phoneNumber = '+91' + phone;
        const appVerifier = window.recaptchaVerifier;
        
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        window.confirmationResult = confirmationResult;
        
        DOM.otpSection.classList.remove('hidden');
        showNotification('OTP sent to your phone', 'success');
    } catch (error) {
        console.error('OTP send error:', error);
        showNotification('Failed to send OTP. Please try again.', 'error');
    }
}

// Handle Verify OTP and Register
async function handleVerifyOtp() {
    const otp = DOM.otpInput.value.trim();
    const name = DOM.registerName.value.trim();
    const phone = DOM.registerPhone.value.trim();
    const password = DOM.registerPassword.value.trim();
    
    if (!otp) {
        showNotification('Please enter OTP', 'error');
        return;
    }
    
    try {
        // Verify OTP with Firebase
        const result = await window.confirmationResult.confirm(otp);
        
        if (result.user) {
            // Register with backend
            const response = await fetch(`${BACKEND_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    mobile: phone,
                    password: password,
                    firebaseUid: result.user.uid
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Registration successful! Please login.', 'success');
                showLoginForm();
                
                // Clear form
                DOM.registerName.value = '';
                DOM.registerPhone.value = '';
                DOM.registerPassword.value = '';
                DOM.registerConfirmPassword.value = '';
                DOM.termsAgree.checked = false;
                DOM.otpInput.value = '';
                DOM.otpSection.classList.add('hidden');
            } else {
                showNotification(data.error || 'Registration failed', 'error');
            }
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showNotification('Invalid OTP. Please try again.', 'error');
    }
}

// Connect WebSocket
function connectWebSocket() {
    if (gameState.ws) {
        gameState.ws.close();
    }
    
    gameState.ws = new WebSocket(WS_URL);
    
    gameState.ws.onopen = () => {
        console.log('✅ WebSocket Connected');
        gameState.wsConnected = true;
        updateConnectionStatus('connected');
        
        // Authenticate with token
        gameState.ws.send(JSON.stringify({
            type: 'auth',
            token: gameState.authToken
        }));
    };
    
    gameState.ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    };
    
    gameState.ws.onclose = () => {
        console.log('❌ WebSocket Disconnected');
        gameState.wsConnected = false;
        updateConnectionStatus('disconnected');
        
        // Attempt reconnect after 5 seconds
        setTimeout(() => {
            if (gameState.isLoggedIn) {
                connectWebSocket();
            }
        }, 5000);
    };
    
    gameState.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('error');
    };
}

// Handle WebSocket Messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'auth_success':
            console.log('WebSocket authentication successful');
            break;
            
        case 'balance_update':
            if (gameState.userData) {
                gameState.userData.wallet = data.balance;
                updateBalance();
            }
            break;
            
        case 'game_result':
            handleGameResult(data);
            break;
            
        case 'live_update':
            updateLiveGames(data.games);
            break;
            
        case 'error':
            showNotification(data.message, 'error');
            break;
    }
}

// Update Connection Status
function updateConnectionStatus(status) {
    if (!DOM.connectionStatus) return;
    
    DOM.connectionStatus.classList.remove('hidden');
    
    switch (status) {
        case 'connected':
            DOM.connectionDot.className = 'w-2 h-2 rounded-full bg-green-500';
            DOM.connectionStatus.querySelector('span').textContent = 'Connected';
            break;
            
        case 'disconnected':
            DOM.connectionDot.className = 'w-2 h-2 rounded-full bg-red-500 animate-pulse';
            DOM.connectionStatus.querySelector('span').textContent = 'Disconnected';
            break;
            
        case 'error':
            DOM.connectionDot.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';
            DOM.connectionStatus.querySelector('span').textContent = 'Connection Error';
            break;
    }
}

// Update Balance
function updateBalance() {
    if (!gameState.userData) return;
    
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

// Update User Profile
function updateUserProfile() {
    if (!gameState.userData) return;
    
    const userNameElement = document.querySelector('#account-page h3');
    if (userNameElement) {
        userNameElement.textContent = gameState.userData.name || 'Member';
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transform transition-transform duration-300 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    } text-white`;
    notification.style.transform = 'translateX(400px)';
    
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Navigation
function navigateToPage(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    // Show selected page
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('gold-gradient', 'text-white');
        btn.classList.add('hover:bg-gold-primary/10');
    });
    
    const activeBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
    if (activeBtn) {
        activeBtn.classList.add('gold-gradient', 'text-white');
        activeBtn.classList.remove('hover:bg-gold-primary/10');
    }
}

// Initialize Game Listeners
function initGameListeners() {
    // Game category buttons
    document.querySelectorAll('.game-category').forEach(btn => {
        btn.addEventListener('click', function() {
            const game = this.dataset.game;
            navigateToPage('games');
            switchGameTab(game);
        });
    });
    
    // Game tabs
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const game = this.dataset.game;
            switchGameTab(game);
        });
    });
    
    // Deposit/Withdraw buttons
    document.querySelectorAll('.deposit-btn').forEach(btn => {
        btn.addEventListener('click', () => openModal('deposit'));
    });
    
    document.querySelectorAll('.withdraw-btn').forEach(btn => {
        btn.addEventListener('click', () => openModal('withdraw'));
    });
    
    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => navigateToPage('home'));
    });
    
    // Initialize game specific listeners
    initWingoListeners();
    initAviatorListeners();
    initSlotsListeners();
}

// Switch Game Tab
function switchGameTab(game) {
    gameState.currentGame = game;
    
    // Update tabs
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.game-tab[data-game="${game}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    // Update sections
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const activeSection = document.getElementById(`${game}-section`);
    if (activeSection) activeSection.classList.add('active');
}

// Initialize WinGo Listeners
function initWingoListeners() {
    // Timeframe buttons
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const timeframe = parseInt(this.dataset.timeframe);
            selectWingoTimeFrame(timeframe);
        });
    });
    
    // Bet amount buttons
    document.querySelectorAll('.wingo-amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            setWingoBetAmount(amount);
        });
    });
    
    // Place bet button
    document.getElementById('wingo-place-bet')?.addEventListener('click', placeWingoBet);
}

// Initialize Aviator Listeners
function initAviatorListeners() {
    // Bet amount buttons
    document.querySelectorAll('.aviator-amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            setAviatorBetAmount(amount);
        });
    });
    
    // Place bet button
    document.getElementById('aviator-place-bet')?.addEventListener('click', placeAviatorBet);
}

// Initialize Slots Listeners
function initSlotsListeners() {
    // Bet amount buttons
    document.querySelectorAll('.slots-amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            setSlotsBetAmount(amount);
        });
    });
    
    // Spin button
    document.getElementById('spin-btn')?.addEventListener('click', spinSlots);
}

// Export functions for global use
export {
    navigateToPage,
    switchGameTab,
    showNotification,
    updateBalance
};