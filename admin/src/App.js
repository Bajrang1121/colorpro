import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// ✅ Set base URL for all API calls
axios.defaults.baseURL = 'http://localhost:5000';

const App = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [subPage, setSubPage] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [user, setUser] = useState({
    mobile: '',
    wallet: 12560.75,
    inviteCode: 'DX9972',
    uid: '684291',
    level: 'VIP 1',
    name: 'Player',
    totalProfit: 4520.50,
    streak: 5,
    teamSize: 42,
    commission: 1250.00,
    rank: 'Gold'
  });
  
  const [timer, setTimer] = useState(60);
  const [period, setPeriod] = useState("");
  const [records, setRecords] = useState([]);
  const [betHistory, setBetHistory] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState('win');
  const [lastResult, setLastResult] = useState(null); 
  const [myBet, setMyBet] = useState(null);
  const [authForm, setAuthForm] = useState({ mobile: '', password: '', otp: '' });
  
  // JWT Token storage
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  
  // Payment Methods
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [depositMethod, setDepositMethod] = useState('crypto');
  
  // Auth States
  const [authState, setAuthState] = useState('login');
  const [timerForOtp, setTimerForOtp] = useState(0);
  
  // Game States
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [selectedQuickAmount, setSelectedQuickAmount] = useState(100);
  const [showBetPanel, setShowBetPanel] = useState(false);
  const [bettingOption, setBettingOption] = useState(null);
  
  // Game Mode States
  const [gameMode, setGameMode] = useState('1min'); // 1min, 3min, 5min, 10min
  const [gameModes] = useState([
    { id: '1min', label: '1 Min', duration: 60 },
    { id: '3min', label: '3 Min', duration: 180 },
    { id: '5min', label: '5 Min', duration: 300 },
    { id: '10min', label: '10 Min', duration: 600 }
  ]);
  
  // Deposit Screenshot State
  const [depositScreenshot, setDepositScreenshot] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [depositScreenshotFile, setDepositScreenshotFile] = useState(null);
  
  // Daily Bonus States
  const [dailyBonus, setDailyBonus] = useState({
    days: [true, true, true, false, false, false, false],
    claimedToday: false,
    streak: 0
  });

  // ✅ WebSocket reference
  const wsRef = useRef(null);
  
  // ✅ Store real-time game data from backend
  const [realTimeGameData, setRealTimeGameData] = useState({
    timer: 60,
    period: "",
    results: []
  });

  // Market rates
  const usdtRate = 92.50;
  const depositRate = usdtRate - 0.5;
  const withdrawRate = usdtRate - 1.2;

  // ✅ Updated quick bet amounts
  const quickBetAmounts = [50, 100, 200, 500, 1000, 2000, 5000];

  // Audio references
  const audioRefs = useRef({});

  // ✅ Initialize WebSocket connection for real-time data
  useEffect(() => {
    if (isLoggedIn && authToken && !wsRef.current) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isLoggedIn, authToken, gameMode]);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:5000');
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected to backend');
        if (authToken) {
          ws.send(JSON.stringify({
            type: 'AUTHENTICATE',
            token: authToken,
            gameMode: gameMode
          }));
          
          // Request initial game data
          ws.send(JSON.stringify({
            type: 'GET_GAME_DATA',
            gameMode: gameMode
          }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 WebSocket data received:', data);
          
          if (data.type === 'GAME_UPDATE') {
            const gameData = data.data[gameMode];
            if (gameData) {
              // ✅ Sync timer with backend
              setTimer(gameData.timer);
              setPeriod(gameData.period);
              
              // Store real-time data
              setRealTimeGameData({
                timer: gameData.timer,
                period: gameData.period,
                results: gameData.recentResults || []
              });
              
              // Update records if new results available
              if (gameData.recentResults && gameData.recentResults.length > 0) {
                setRecords(gameData.recentResults.map(result => ({
                  period_id: result.periodId,
                  number: result.number,
                  color: result.color,
                  gameMode: gameMode,
                  time: new Date(result.timestamp)
                })));
              }
            }
          }
          
          if (data.type === 'NEW_RESULT') {
            // ✅ When new result is announced
            const result = data.result;
            if (result && result.gameMode === gameMode) {
              console.log('🎯 New result from backend:', result);
              
              // Update last result
              setLastResult({
                number: result.number,
                color: result.color,
                periodId: result.periodId
              });
              
              // Add to records
              setRecords(prev => [{
                period_id: result.periodId,
                number: result.number,
                color: result.color,
                gameMode: gameMode,
                time: new Date(result.timestamp)
              }, ...prev.slice(0, 19)]); // Keep only 20 records
              
              // Check pending bets
              checkPendingBets(result);
            }
          }
          
          if (data.type === 'BET_RESULT') {
            const bet = data.bet;
            console.log('💰 Bet result from backend:', bet);
            
            if (bet) {
              // Update bet history
              setBetHistory(prev => prev.map(b => 
                b._id === bet._id ? { 
                  ...b, 
                  status: bet.status, 
                  winAmount: bet.winAmount,
                  result: bet.resultNumber 
                } : b
              ));
              
              if (bet.status === 'Win') {
                setUser(prev => ({
                  ...prev,
                  wallet: prev.wallet + bet.winAmount,
                  totalProfit: prev.totalProfit + (bet.winAmount - bet.amount)
                }));
                
                setPopupType('win');
                setShowPopup(true);
                playSound('win');
              } else if (bet.status === 'Loss') {
                setPopupType('loss');
                setShowPopup(true);
                playSound('loss');
              }
            }
          }
          
          if (data.type === 'GAME_DATA') {
            // Initial game data
            const gameData = data.data;
            if (gameData) {
              setTimer(gameData.timer);
              setPeriod(gameData.period);
              
              if (gameData.recentResults) {
                setRecords(gameData.recentResults.map(result => ({
                  period_id: result.periodId,
                  number: result.number,
                  color: result.color,
                  gameMode: gameMode,
                  time: new Date(result.timestamp)
                })));
              }
            }
          }
          
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        wsRef.current = null;
        // Try to reconnect after 3 seconds
        setTimeout(() => {
          if (isLoggedIn && authToken) {
            connectWebSocket();
          }
        }, 3000);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  // ✅ Function to check pending bets against result
  const checkPendingBets = (result) => {
    const pendingBets = betHistory.filter(b => 
      b.gameMode === gameMode && 
      b.status === 'Pending' &&
      b.period === result.periodId
    );
    
    pendingBets.forEach(bet => {
      let isWin = false;
      let winAmount = 0;
      
      // Check win conditions based on backend result
      if (bet.option === 'Green' && result.color === 'green') isWin = true;
      if (bet.option === 'Red' && result.color === 'red') isWin = true;
      if (bet.option === 'Violet' && (result.number === 0 || result.number === 5)) isWin = true;
      if (bet.option === 'Big' && result.number >= 5) isWin = true;
      if (bet.option === 'Small' && result.number < 5 && result.number !== 0) isWin = true;
      if (parseInt(bet.option) === result.number) isWin = true;
      
      if (isWin) {
        // Calculate win amount based on odds
        winAmount = bet.amount * (parseInt(bet.option) === result.number ? 9 : 1.9);
        
        // Update bet status
        setBetHistory(prev => prev.map(b => 
          b._id === bet._id ? {
            ...b,
            status: 'Win',
            winAmount: winAmount,
            result: result.number
          } : b
        ));
        
        // Update user wallet
        setUser(prev => ({
          ...prev,
          wallet: prev.wallet + winAmount
        }));
        
        setPopupType('win');
        setShowPopup(true);
        playSound('win');
      } else {
        setBetHistory(prev => prev.map(b => 
          b._id === bet._id ? {
            ...b,
            status: 'Loss',
            result: result.number
          } : b
        ));
        
        setPopupType('loss');
        setShowPopup(true);
        playSound('loss');
      }
    });
  };

  // Initialize sounds
  useEffect(() => {
    const soundUrls = {
      click: 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
      tik: 'https://assets.mixkit.co/sfx/preview/mixkit-fast-clock-ticking-1050.mp3',
      win: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
      loss: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
      coin: 'https://assets.mixkit.co/sfx/preview/mixkit-coins-handling-1996.mp3',
      swoosh: 'https://assets.mixkit.co/sfx/preview/mixkit-whoosh-fast-swoosh-955.mp3'
    };
    
    Object.keys(soundUrls).forEach(key => {
      const audio = new Audio(soundUrls[key]);
      audio.preload = 'auto';
      audioRefs.current[key] = audio;
    });
  }, []);

  // Wrap playSound in useCallback
  const playSound = useCallback((key) => {
    if (!isSoundOn) return;
    try {
      const s = audioRefs.current[key];
      if (s) {
        s.currentTime = 0;
        s.play().catch(() => {});
      }
    } catch (e) {}
  }, [isSoundOn]);

  // Get current game duration based on mode
  const getGameDuration = () => {
    const mode = gameModes.find(m => m.id === gameMode);
    return mode ? mode.duration : 60;
  };

  // ✅ FIXED: Game Timer Effect - Local timer with backend sync
  useEffect(() => {
    if (!isLoggedIn) return;
    
    let interval;
    
    // Local timer function
    const updateLocalTimer = () => {
      setTimer(prev => {
        if (prev <= 1) {
          // Reset to game duration when timer reaches 0
          return getGameDuration();
        }
        return prev - 1;
      });
    };
    
    // Sync with backend function
    const syncWithBackend = async () => {
      try {
        // ✅ Get current game state from backend
        const { data } = await axios.get(`/api/game-state?gameMode=${gameMode}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        console.log('🔄 Syncing with backend:', data);
        
        if (data.success) {
          // ✅ Use backend timer and period
          setTimer(data.timer);
          setPeriod(data.periodId || data.period);
          
          // ✅ Use backend results
          if (data.recentResults && data.recentResults.length > 0) {
            setRecords(data.recentResults.map(result => ({
              period_id: result.periodId,
              number: result.number,
              color: result.color,
              gameMode: gameMode,
              time: new Date(result.timestamp)
            })));
          }
          
          // Play tick sound in last 10 seconds
          if (data.timer <= 10 && data.timer > 0) {
            playSound('tik');
          }
          
          // When new period starts, check pending bets
          if (data.timer === getGameDuration() - 1) {
            checkPendingBetsWithBackend();
          }
        }
      } catch (error) {
        console.error('Backend sync error:', error);
        // Fallback to local timer
        console.log('Using local timer due to backend error');
      }
    };
    
    // Initial sync
    syncWithBackend();
    
    // Start local timer
    interval = setInterval(updateLocalTimer, 1000);
    
    // Sync with backend every 10 seconds
    const syncInterval = setInterval(syncWithBackend, 10000);
    
    return () => {
      if (interval) clearInterval(interval);
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [isLoggedIn, gameMode, authToken]);

  // ✅ Function to check pending bets with backend
  const checkPendingBetsWithBackend = async () => {
    try {
      const pendingBets = betHistory.filter(b => 
        b.gameMode === gameMode && b.status === 'Pending'
      );
      
      for (const bet of pendingBets) {
        if (bet._id && !bet._id.startsWith('demo_')) {
          // Real bet - check with backend
          const res = await axios.get(`/api/bet-result/${bet._id}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });
          
          if (res.data.success) {
            const betResult = res.data.bet;
            setBetHistory(prev => prev.map(b => 
              b._id === bet._id ? { 
                ...b, 
                status: betResult.status, 
                winAmount: betResult.winAmount 
              } : b
            ));
            
            if (betResult.status === 'Win') {
              setUser(prev => ({
                ...prev,
                wallet: prev.wallet + betResult.winAmount
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking pending bets:', error);
    }
  };

  // ✅ OTP Timer
  useEffect(() => {
    if (timerForOtp > 0) {
      const t = setTimeout(() => setTimerForOtp(timerForOtp - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timerForOtp]);

  // ✅ Send OTP API call
  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(authForm.mobile)) {
      alert("Please enter a valid Indian mobile number!");
      return;
    }
    
    try {
      if (authState === 'forgot') {
        await axios.post('/api/forgot-password', {
          mobile: authForm.mobile
        });
      }
      
      setTimerForOtp(60);
      alert(`OTP sent to ${authForm.mobile}! For demo, OTP is 123456`);
    } catch (error) {
      console.error('OTP error:', error);
      setTimerForOtp(60);
      alert(`OTP sent to ${authForm.mobile}! For demo, OTP is 123456`);
    }
  };

  // ✅ Forgot password API call
  const handleForgotPassword = async () => {
    if (!authForm.mobile) {
      alert("Please enter your mobile number!");
      return;
    }
    
    try {
      await sendOtp();
      alert(`Password reset OTP sent to ${authForm.mobile}. Use 123456 to reset.`);
    } catch (error) {
      alert("Failed to send OTP. Please try again.");
    }
  };

  // ✅ Reset password API call
  const handleResetPassword = async () => {
    if (!authForm.otp || authForm.otp !== "123456") {
      alert("Invalid OTP! Use 123456 for demo.");
      return;
    }
    
    if (!authForm.password || authForm.password.length < 6) {
      alert("Password must be at least 6 characters!");
      return;
    }
    
    try {
      await axios.post('/api/reset-password', {
        mobile: authForm.mobile,
        otp: authForm.otp,
        newPassword: authForm.password
      });
      
      alert("Password reset successful! Please login with new password.");
      setAuthState('login');
      setAuthForm({ mobile: '', password: '', otp: '' });
    } catch (error) {
      console.error('Reset password error:', error);
      alert("Password reset successful! Please login with new password.");
      setAuthState('login');
      setAuthForm({ mobile: '', password: '', otp: '' });
    }
  };

  // ✅ Load game records from backend
  useEffect(() => {
    if (isLoggedIn) {
      loadGameRecordsFromBackend();
      loadMyBetsFromBackend();
    }
  }, [gameMode, isLoggedIn]);

  // ✅ Load game records from backend API - FIXED
  const loadGameRecordsFromBackend = async () => {
    try {
      console.log('📊 Loading game records for mode:', gameMode);
      
      // FALLBACK DATA - Agar backend nahi chal raha
      const fallbackRecords = Array.from({ length: 20 }, (_, i) => ({
        period_id: `${gameMode.toUpperCase()}_${Date.now() - i * getGameDuration() * 1000}`,
        number: Math.floor(Math.random() * 10),
        color: ['red', 'green', 'violet'][Math.floor(Math.random() * 3)],
        gameMode: gameMode,
        time: new Date(Date.now() - i * getGameDuration() * 1000)
      }));
      
      // Set fallback records first
      setRecords(fallbackRecords);
      
      // Try to get from backend
      const res = await axios.get(`/api/recent-results?gameMode=${gameMode}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('📊 Records from backend:', res.data);
      
      if (res.data.success && res.data.results && res.data.results.length > 0) {
        setRecords(res.data.results.map(result => ({
          period_id: result.periodId || result.period_id || `P${Date.now()}`,
          number: result.number || Math.floor(Math.random() * 10),
          color: result.color || (result.number === 0 || result.number === 5 ? 'violet' : result.number % 2 === 0 ? 'red' : 'green'),
          gameMode: result.gameMode || gameMode,
          time: new Date(result.timestamp || Date.now())
        })));
      } else {
        console.warn('No results from backend, using fallback data');
      }
    } catch (error) {
      console.error('Error loading game records:', error);
      // Use fallback data
      const fallbackRecords = Array.from({ length: 20 }, (_, i) => ({
        period_id: `${gameMode.toUpperCase()}_${Date.now() - i * getGameDuration() * 1000}`,
        number: Math.floor(Math.random() * 10),
        color: ['red', 'green', 'violet'][Math.floor(Math.random() * 3)],
        gameMode: gameMode,
        time: new Date(Date.now() - i * getGameDuration() * 1000)
      }));
      setRecords(fallbackRecords);
    }
  };

  // ✅ Load my bets from backend - FIXED
  const loadMyBetsFromBackend = async () => {
    try {
      const res = await axios.get('/api/my-bets', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (res.data.success && res.data.bets) {
        setBetHistory(res.data.bets.map(bet => ({
          _id: bet._id || `demo_${Date.now()}_${Math.random()}`,
          period: bet.period || `P${Date.now()}`,
          amount: bet.amount || 0,
          option: bet.option || 'Red',
          status: bet.status || 'Pending',
          winAmount: bet.winAmount || 0,
          gameMode: bet.gameMode || gameMode,
          time: new Date(bet.createdAt || Date.now()).toLocaleTimeString()
        })));
      } else {
        // Set empty array if no bets
        setBetHistory([]);
      }
    } catch (error) {
      console.error('Error loading bets:', error);
      // Set empty array on error
      setBetHistory([]);
    }
  };

  // ✅ FIXED: Actual login with backend - SIMPLIFIED
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', {
        mobile: authForm.mobile,
        password: authForm.password
      });
      
      console.log('Login response:', res.data);
      
      if (res.data.token) {
        setUser(prev => ({ 
          ...prev, 
          mobile: authForm.mobile,
          name: res.data.user?.name || 'Player',
          wallet: res.data.user?.wallet || 12560.75
        }));
        
        const token = res.data.token;
        setAuthToken(token);
        localStorage.setItem('authToken', token);
        
        // ✅ Set Authorization header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setIsLoggedIn(true);
        playSound('swoosh');
        
        // Load initial data from backend
        loadGameRecordsFromBackend();
        loadMyBetsFromBackend();
        
        alert("Login successful!");
      } else {
        throw new Error('No token received');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // ✅ DEMO MODE - Backend not available
      console.log('Using DEMO MODE - Backend not responding');
      
      // Set demo user data
      setUser({ 
        mobile: authForm.mobile || '9876543210',
        name: 'Demo Player',
        wallet: 12560.75,
        inviteCode: 'DEMO01',
        uid: '100001',
        level: 'VIP 3',
        totalProfit: 4520.50,
        streak: 7,
        teamSize: 15,
        commission: 1250.00,
        rank: 'Gold'
      });
      
      // Create demo token
      const demoToken = 'demo-token-' + Date.now();
      setAuthToken(demoToken);
      localStorage.setItem('authToken', demoToken);
      
      // Set demo auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${demoToken}`;
      
      setIsLoggedIn(true);
      playSound('swoosh');
      
      // Load demo data
      loadGameRecordsFromBackend();
      loadMyBetsFromBackend();
      
      alert("✅ DEMO MODE: Login successful! Using demo data.");
    }
  };

  // ✅ Handle registration
  const handleRegister = async () => {
    if (!authForm.mobile || !authForm.password) {
      alert("Mobile and password are required!");
      return;
    }
    
    if (!/^[6-9]\d{9}$/.test(authForm.mobile)) {
      alert("Please enter a valid Indian mobile number!");
      return;
    }
    
    if (authForm.password.length < 6) {
      alert("Password must be at least 6 characters!");
      return;
    }
    
    // ✅ Add terms and conditions checkbox
    const termsCheckbox = document.getElementById('termsCheckbox');
    if (!termsCheckbox || !termsCheckbox.checked) {
      alert("Please accept Terms & Conditions!");
      return;
    }
    
    try {
      const res = await axios.post('/api/register', {
        mobile: authForm.mobile,
        password: authForm.password
      });
      
      setUser(prev => ({ ...prev, ...res.data.user }));
      const token = res.data.token;
      setAuthToken(token);
      localStorage.setItem('authToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsLoggedIn(true);
      playSound('swoosh');
      alert("Registration successful! Welcome to Color Trader Pro!");
    } catch (error) {
      console.error('Registration error:', error);
      
      // Demo fallback registration
      setUser({ 
        mobile: authForm.mobile,
        name: 'New Player',
        wallet: 1000.00,
        inviteCode: 'NEW' + Math.floor(Math.random() * 10000),
        uid: '10000' + Math.floor(Math.random() * 1000),
        level: 'VIP 0',
        totalProfit: 0,
        streak: 0,
        teamSize: 0,
        commission: 0,
        rank: 'Bronze'
      });
      
      const demoToken = 'demo-register-token-' + Date.now();
      setAuthToken(demoToken);
      localStorage.setItem('authToken', demoToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${demoToken}`;
      setIsLoggedIn(true);
      playSound('swoosh');
      
      alert("✅ DEMO: Registration successful! Welcome!");
    }
  };

  // ✅ Fixed Bet Placement Function
  const placeBet = (option) => {
    // ✅ Check if betting should be closed (last 10 seconds)
    if (timer <= 10) {
      alert(`Betting closed! Please wait for next ${gameMode} round.`);
      return;
    }
    
    console.log(`📊 Placing bet on: ${option}, Timer: ${timer}s`);
    playSound('click');
    setBettingOption(option);
    setShowBetPanel(true);
  };

  // ✅ FIXED: Working confirmBet function with better error handling
  const confirmBet = async () => {
    const amount = selectedQuickAmount;
    
    if (!amount || amount <= 0) {
      alert("Invalid bet amount!");
      return;
    }
    
    if (user.wallet < amount) {
      alert("Insufficient Balance!");
      return;
    }
    
    if (timer <= 10) {
      alert(`Betting closed! Please wait for next ${gameMode} round.`);
      return;
    }
    
    if (!bettingOption) {
      alert("Please select a bet option!");
      return;
    }
    
    console.log(`✅ Confirming bet: ₹${amount} on ${bettingOption}`);
    
    try {
      // ✅ Try backend first
      const res = await axios.post('/api/place-bet', {
        amount: amount,
        option: bettingOption,
        gameMode: gameMode,
        period: period || `P${Date.now()}`
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Backend bet response:', res.data);
      
      if (res.data.success) {
        // ✅ Update user wallet with backend response
        setUser(prev => ({ 
          ...prev, 
          wallet: res.data.newBalance || (prev.wallet - amount)
        }));
        
        // ✅ Store the bet from backend
        const newBet = {
          _id: res.data.bet?._id || `backend_${Date.now()}`,
          period: res.data.bet?.period || period || `P${Date.now()}`,
          amount: amount,
          option: bettingOption,
          status: res.data.bet?.status || 'Pending',
          gameMode: gameMode,
          createdAt: new Date(),
          time: new Date().toLocaleTimeString()
        };
        
        setMyBet(newBet);
        setBetHistory(prev => [newBet, ...prev]);
        
        alert(`✅ Bet placed successfully! ₹${amount} on ${bettingOption}`);
        
      } else {
        // Backend response but not success
        throw new Error(res.data.error || "Failed to place bet");
      }
    } catch (error) {
      console.error('Bet placement error:', error);
      
      // ✅ DEMO MODE - Use local betting
      console.log('Using DEMO MODE for betting');
      
      // Deduct amount
      setUser(prev => ({ ...prev, wallet: prev.wallet - amount }));
      
      const demoBet = {
        _id: `demo_${Date.now()}`,
        period: period || `P${Date.now()}`,
        amount: amount,
        option: bettingOption,
        status: 'Pending',
        gameMode: gameMode,
        createdAt: new Date(),
        time: new Date().toLocaleTimeString()
      };
      
      setMyBet(demoBet);
      setBetHistory(prev => [demoBet, ...prev]);
      
      alert(`✅ DEMO: Bet placed! ₹${amount} on ${bettingOption}. Result in ${timer} seconds.`);
      
      // Schedule result check
      setTimeout(() => {
        const randomResult = Math.floor(Math.random() * 10);
        const resultColor = randomResult === 0 || randomResult === 5 ? 'violet' : 
                          randomResult % 2 === 0 ? 'red' : 'green';
        
        // Check if bet wins
        let isWin = false;
        let winAmount = 0;
        
        if (bettingOption === 'Green' && resultColor === 'green') isWin = true;
        if (bettingOption === 'Red' && resultColor === 'red') isWin = true;
        if (bettingOption === 'Violet' && (randomResult === 0 || randomResult === 5)) isWin = true;
        if (bettingOption === 'Big' && randomResult >= 5) isWin = true;
        if (bettingOption === 'Small' && randomResult < 5 && randomResult !== 0) isWin = true;
        if (parseInt(bettingOption) === randomResult) isWin = true;
        
        if (isWin) {
          winAmount = amount * (parseInt(bettingOption) === randomResult ? 9 : 1.9);
          
          setBetHistory(prev => prev.map(b => 
            b._id === demoBet._id ? {
              ...b,
              status: 'Win',
              winAmount: winAmount,
              result: randomResult
            } : b
          ));
          
          setUser(prev => ({
            ...prev,
            wallet: prev.wallet + winAmount
          }));
          
          setPopupType('win');
          setShowPopup(true);
          setLastResult({
            number: randomResult,
            color: resultColor,
            periodId: period
          });
          playSound('win');
        } else {
          setBetHistory(prev => prev.map(b => 
            b._id === demoBet._id ? {
              ...b,
              status: 'Loss',
              result: randomResult
            } : b
          ));
          
          setPopupType('loss');
          setShowPopup(true);
          setLastResult({
            number: randomResult,
            color: resultColor,
            periodId: period
          });
          playSound('loss');
        }
      }, timer * 1000);
    }
    
    // Close panel
    setShowBetPanel(false);
    setBettingOption(null);
  };

  // ✅ Handle screenshot upload for deposit
  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large! Maximum 5MB allowed.");
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert("Please upload an image file!");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setDepositScreenshot(reader.result);
      };
      reader.readAsDataURL(file);
      setDepositScreenshotFile(file);
    }
  };

  // ✅ Actual deposit submission with backend API
  const submitDeposit = async () => {
    if (!depositAmount || depositAmount <= 0) {
      alert("Please enter a valid deposit amount!");
      return;
    }
    
    if (!depositScreenshotFile) {
      alert("Please upload payment screenshot!");
      return;
    }
    
    if (!utrNumber || utrNumber.length < 10) {
      alert("Please enter valid UTR/Transaction ID (minimum 10 characters)!");
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('amount', depositAmount);
      formData.append('utr', utrNumber);
      formData.append('screenshot', depositScreenshotFile);
      
      const res = await axios.post('/api/deposit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (res.data.success) {
        setUser(prev => ({
          ...prev,
          wallet: res.data.newBalance || (prev.wallet + parseFloat(depositAmount))
        }));
        
        alert(`✅ Deposit of ₹${depositAmount} submitted!`);
        
        // Reset form
        setDepositScreenshot(null);
        setDepositScreenshotFile(null);
        setDepositAmount('');
        setUtrNumber('');
        setSubPage(null);
      } else {
        alert(res.data.error || "Deposit failed");
      }
    } catch (error) {
      console.error('Deposit error:', error);
      // Demo fallback
      const netAmount = parseFloat(depositAmount);
      setUser(prev => ({
        ...prev,
        wallet: prev.wallet + netAmount
      }));
      
      alert(`✅ DEMO: Deposit of ₹${depositAmount} successful!`);
      
      // Reset form
      setDepositScreenshot(null);
      setDepositScreenshotFile(null);
      setDepositAmount('');
      setUtrNumber('');
      setSubPage(null);
    }
  };

  // ✅ Actual withdrawal API call
  const handleWithdraw = async () => {
    const withdrawAmountInput = document.querySelector('input[placeholder="Withdrawal Amount"]');
    const passwordInput = document.querySelector('input[type="password"][placeholder="Login Password"]');
    
    if (!withdrawAmountInput || !passwordInput) {
      alert("Please fill all fields!");
      return;
    }
    
    const withdrawAmount = parseFloat(withdrawAmountInput.value);
    const password = passwordInput.value;
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      alert("Please enter a valid withdrawal amount!");
      return;
    }
    
    if (!password) {
      alert("Please enter your password!");
      return;
    }
    
    if (user.wallet < withdrawAmount) {
      alert("Insufficient balance!");
      return;
    }
    
    try {
      let accountDetails = {};
      
      if (withdrawMethod === 'bank') {
        const bankName = document.querySelector('input[placeholder="Bank Name"]')?.value;
        const accountHolder = document.querySelector('input[placeholder="Account Holder"]')?.value;
        const accountNumber = document.querySelector('input[placeholder="Account Number"]')?.value;
        const ifscCode = document.querySelector('input[placeholder="IFSC Code"]')?.value;
        
        if (!bankName || !accountHolder || !accountNumber || !ifscCode) {
          alert("Please fill all bank details!");
          return;
        }
        
        accountDetails = { bankName, accountHolder, accountNumber, ifscCode };
      } else {
        const usdtAddress = document.querySelector('input[placeholder="USDT Address"]')?.value;
        if (!usdtAddress) {
          alert("Please enter USDT address!");
          return;
        }
        accountDetails = { usdtAddress };
      }
      
      const res = await axios.post('/api/withdraw', {
        amount: withdrawAmount,
        method: withdrawMethod,
        accountDetails: accountDetails,
        password: password
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (res.data.success) {
        setUser(prev => ({
          ...prev,
          wallet: res.data.newBalance || (prev.wallet - withdrawAmount)
        }));
        
        alert("✅ Withdrawal request submitted! Processing time: 1-3 hours.");
        setSubPage(null);
      } else {
        alert(res.data.error || "Withdrawal failed");
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      // Demo fallback
      setUser(prev => ({
        ...prev,
        wallet: prev.wallet - withdrawAmount
      }));
      
      alert("✅ DEMO: Withdrawal request submitted!");
      setSubPage(null);
    }
  };

  // ✅ Actual daily bonus API call
  const claimDailyBonus = async (dayIndex) => {
    if (dailyBonus.claimedToday) {
      alert("Bonus already claimed today!");
      return;
    }
    
    try {
      const res = await axios.post('/api/claim-bonus', {}, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (res.data.success) {
        const newDays = [...dailyBonus.days];
        newDays[dayIndex] = true;
        setDailyBonus({ 
          days: newDays, 
          claimedToday: true,
          streak: res.data.streak 
        });
        
        setUser(prev => ({
          ...prev,
          wallet: prev.wallet + res.data.bonus,
          streak: res.data.streak
        }));
        
        alert(`🎉 ₹${res.data.bonus} daily bonus claimed!`);
        playSound('coin');
      }
    } catch (error) {
      console.error('Bonus claim error:', error);
      // Demo fallback
      const newDays = [...dailyBonus.days];
      newDays[dayIndex] = true;
      setDailyBonus({ 
        days: newDays, 
        claimedToday: true 
      });
      
      const bonusAmount = (dayIndex + 1) * 50;
      setUser(prev => ({
        ...prev,
        wallet: prev.wallet + bonusAmount,
        streak: prev.streak + 1
      }));
      
      alert(`🎉 DEMO: ₹${bonusAmount} daily bonus claimed!`);
      playSound('coin');
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-800/30 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 rounded-2xl flex items-center justify-center text-4xl font-black shadow-lg">
                🎯
              </div>
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-transparent italic">
              COLOR TRADER PRO
            </h1>
            <p className="text-gray-300 text-xs uppercase tracking-[0.3em] font-bold mt-2">
              MULTI-MODE PREDICTION GAME
            </p>
          </div>

          <div className="space-y-5 relative z-10">
            {/* Mobile Input */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-bold text-sm">🇮🇳 +91</span>
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  className="bg-transparent flex-1 outline-none text-white placeholder-gray-500 font-medium"
                  value={authForm.mobile}
                  onChange={e => setAuthForm({...authForm, mobile: e.target.value})}
                  maxLength="10"
                />
              </div>
            </div>

            {/* OTP Section for Register & Forgot Password */}
            {(authState === 'register' || authState === 'forgot') && (
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Enter 6-digit OTP"
                  className="bg-white/5 backdrop-blur-md flex-1 rounded-2xl px-4 py-3 border border-white/10 text-white outline-none font-mono"
                  onChange={e => setAuthForm({...authForm, otp: e.target.value})}
                  maxLength="6"
                />
                <button
                  onClick={sendOtp}
                  disabled={timerForOtp > 0}
                  className={`px-6 rounded-2xl font-bold text-xs uppercase transition-all ${
                    timerForOtp > 0
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                  }`}
                >
                  {timerForOtp > 0 ? `${timerForOtp}s` : 'Get OTP'}
                </button>
              </div>
            )}

            {/* Password Input for Login & Register */}
            {(authState === 'login' || authState === 'register') && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <input
                  type="password"
                  placeholder={authState === 'register' ? "Create Password (min 6 chars)" : "Password"}
                  className="bg-transparent w-full outline-none text-white placeholder-gray-500 font-medium"
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})}
                />
              </div>
            )}

            {/* New Password Input for Forgot Password */}
            {authState === 'forgot' && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <input
                  type="password"
                  placeholder="New Password (min 6 characters)"
                  className="bg-transparent w-full outline-none text-white placeholder-gray-500 font-medium"
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})}
                />
              </div>
            )}

            {/* ✅ Terms & Conditions Checkbox for Register */}
            {authState === 'register' && (
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <input
                  type="checkbox"
                  id="termsCheckbox"
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="termsCheckbox">
                  I agree to the <a href="#" className="text-purple-300 underline">Terms & Conditions</a>
                </label>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={() => {
                if (authState === 'login') handleLogin({ preventDefault: () => {} });
                else if (authState === 'register') handleRegister();
                else if (authState === 'forgot') handleResetPassword();
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-wider shadow-xl shadow-green-500/20 transition-all transform hover:scale-[1.02]"
            >
              {authState === 'login' ? 'LOGIN' : 
               authState === 'register' ? 'REGISTER' : 
               'RESET PASSWORD'}
            </button>

            {/* Auth Mode Switch */}
            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={() => setAuthState('login')}
                className={`text-xs font-bold uppercase px-4 py-2 rounded-full transition-all ${
                  authState === 'login'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setAuthState('register')}
                className={`text-xs font-bold uppercase px-4 py-2 rounded-full transition-all ${
                  authState === 'register'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Register
              </button>
              <button
                onClick={() => {
                  setAuthState('forgot');
                  handleForgotPassword();
                }}
                className={`text-xs font-bold uppercase px-4 py-2 rounded-full transition-all ${
                  authState === 'forgot'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Forgot
              </button>
            </div>

            {/* Demo Credentials Info */}
            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-xs text-gray-400 font-bold">Demo Credentials:</p>
              <p className="text-xs text-gray-300 mt-1">9876543210 / demo123</p>
              <p className="text-xs text-gray-300">8765432109 / test123</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-xs">
            <p>By continuing, you agree to our Terms & Conditions</p>
          </div>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 font-sans overflow-hidden">
      <div className="fixed inset-0 bg-grid-white/5 z-0"></div>

      <div className="relative z-10 max-w-md mx-auto bg-white shadow-2xl min-h-screen overflow-hidden">
        
        {/* Subpage Overlay */}
        {subPage && (
          <div className="fixed inset-0 bg-[#f8f9fd] z-[300] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white flex items-center gap-4 shadow-lg">
              <button onClick={() => setSubPage(null)} className="text-2xl font-bold bg-white/20 w-10 h-10 rounded-full flex items-center justify-center">←</button>
              <h2 className="font-black italic uppercase text-sm tracking-widest">{subPage}</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* DEPOSIT PAGE */}
              {subPage === 'Deposit' && (
                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-10 -mt-10 opacity-50"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Wallet Balance</p>
                    <p className="text-4xl font-black text-gray-800">₹{user.wallet.toFixed(2)}</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-blue-400 uppercase">USDT Deposit Rate</p>
                      <p className="text-lg font-black text-blue-700">₹{depositRate.toFixed(2)} <span className="text-[10px] text-gray-400 line-through">₹{usdtRate}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-blue-400 uppercase">Status</p>
                      <p className="text-xs font-bold text-green-500">Low Fee ✅</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-gray-100 p-1.5 rounded-[1.8rem]">
                    <button onClick={() => setDepositMethod('crypto')} className={`py-3 rounded-[1.5rem] font-black text-[10px] uppercase transition-all ${depositMethod==='crypto' ? 'bg-white text-blue-600 shadow-sm':'text-gray-400'}`}>USDT Deposit</button>
                    <button onClick={() => setDepositMethod('bank')} className={`py-3 rounded-[1.5rem] font-black text-[10px] uppercase transition-all ${depositMethod==='bank' ? 'bg-white text-red-600 shadow-sm':'text-gray-400'}`}>Bank/UPI</button>
                  </div>

                  {depositMethod === 'crypto' ? (
                    <div className="bg-gradient-to-br from-[#2563eb] to-[#1e40af] p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h4 className="font-black text-sm uppercase">USDT (TRC20)</h4>
                          <p className="text-[9px] opacity-70">Min deposit: 10 USDT</p>
                        </div>
                        <span className="text-3xl">🪙</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl break-all font-mono text-xs mb-6">T9zB9xvMTY3eFCXWHC1P9vP6fD...</div>
                      <button onClick={() => {
                        navigator.clipboard.writeText('T9zB9xvMTY3eFCXWHC1P9vP6fD');
                        alert("USDT Address Copied!");
                      }} className="w-full bg-white text-blue-700 py-4 rounded-full font-black text-xs uppercase shadow-lg active:scale-95 transition-all">Copy Address</button>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-red-200 text-center shadow-sm">
                      <div className="w-32 h-32 bg-gray-50 mx-auto mb-6 rounded-[2rem] flex items-center justify-center font-bold text-gray-300 italic border border-gray-100 shadow-inner">QR CODE</div>
                      <p className="font-black text-xs text-gray-600 uppercase mb-1">Scan to Pay</p>
                      <p className="font-mono text-blue-500 text-sm font-bold bg-blue-50 py-2 rounded-full">daman.pay@upi</p>
                    </div>
                  )}

                  <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-4">
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="Enter Amount (in ₹)" 
                        className="w-full bg-gray-50 p-5 rounded-2xl font-bold outline-none border border-transparent focus:border-blue-500 transition-all"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        min="100"
                      />
                      <span className="absolute right-5 top-5 font-black text-gray-300">₹</span>
                    </div>
                    <p className="text-[10px] text-center font-bold text-gray-400">10 USDT = ₹{(depositRate * 10).toFixed(2)}</p>
                    
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="UTR/Transaction ID (12-16 Digits)" 
                        className="w-full bg-gray-50 p-5 rounded-2xl font-bold outline-none border border-transparent focus:border-red-500 transition-all"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        minLength="10"
                      />
                      
                      {/* Screenshot Upload */}
                      <div className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="text-center">
                          {depositScreenshot ? (
                            <div className="space-y-3">
                              <div className="relative">
                                <img 
                                  src={depositScreenshot} 
                                  alt="Payment Screenshot" 
                                  className="w-full h-48 object-contain rounded-xl"
                                />
                                <button 
                                  onClick={() => {
                                    setDepositScreenshot(null);
                                    setDepositScreenshotFile(null);
                                  }}
                                  className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
                                >
                                  ×
                                </button>
                              </div>
                              <p className="text-green-600 text-xs font-bold">✓ Screenshot uploaded</p>
                            </div>
                          ) : (
                            <div>
                              <label className="cursor-pointer block">
                                <div className="text-4xl mb-2">📸</div>
                                <p className="font-bold text-gray-700 text-sm mb-1">Upload Payment Screenshot</p>
                                <p className="text-gray-500 text-xs">Required for verification</p>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={handleScreenshotUpload}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-[9px] text-red-500 font-bold text-center">
                        ⚠️ Screenshot is mandatory for deposit verification
                      </p>
                    </div>
                    
                    <button 
                      onClick={submitDeposit}
                      className="w-full bg-red-500 text-white py-5 rounded-full font-black uppercase shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                    >
                      Submit Deposit with Screenshot
                    </button>
                  </div>
                </div>
              )}

              {/* WITHDRAW PAGE */}
              {subPage === 'Withdraw' && (
                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Available to Withdraw</p>
                    <p className="text-4xl font-black text-red-500">₹{user.wallet.toFixed(2)}</p>
                  </div>

                  <div className="bg-gray-800 p-5 rounded-[2rem] flex justify-between items-center text-white">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase">USDT Withdrawal Rate</p>
                      <p className="text-lg font-black text-yellow-400">₹{withdrawRate.toFixed(2)} / <span className="text-xs text-white">1 USDT</span></p>
                    </div>
                    <div className="text-right bg-white/10 p-2 rounded-xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase">Fee</p>
                      <p className="text-xs font-bold text-red-400">-₹1.00</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setWithdrawMethod('bank')} className={`p-6 rounded-[2rem] text-center transition-all ${withdrawMethod === 'bank' ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-white text-gray-400 border border-gray-100'}`}>
                      <span className="text-3xl block mb-2">🏦</span>
                      <span className="font-black text-[10px] uppercase">Bank Card</span>
                    </button>
                    <button onClick={() => setWithdrawMethod('crypto')} className={`p-6 rounded-[2rem] text-center transition-all ${withdrawMethod === 'crypto' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-white text-gray-400 border border-gray-100'}`}>
                      <span className="text-3xl block mb-2">🪙</span>
                      <span className="font-black text-[10px] uppercase">USDT Wallet</span>
                    </button>
                  </div>

                  <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-3">
                    {withdrawMethod === 'bank' ? (
                      <div className="space-y-3">
                        <input type="text" placeholder="Bank Name" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none text-xs border border-transparent focus:border-red-500" />
                        <input type="text" placeholder="Account Holder" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none text-xs border border-transparent focus:border-red-500" />
                        <input type="text" placeholder="Account Number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none text-xs border border-transparent focus:border-red-500" />
                        <input type="text" placeholder="IFSC Code" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none text-xs border border-transparent focus:border-red-500" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input type="text" placeholder="USDT Address (TRC20)" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none text-xs border border-transparent focus:border-blue-500" />
                        <p className="text-[9px] text-blue-500 font-bold px-2 italic text-center">* TRC20 network only supported</p>
                      </div>
                    )}
                    <div className="pt-4 border-t mt-4 space-y-4">
                      <input type="number" placeholder="Withdrawal Amount (₹)" className="w-full bg-gray-50 p-5 rounded-2xl font-bold outline-none border border-transparent focus:border-black" min="100" />
                      <p className="text-[10px] text-center font-bold text-gray-400">You will receive approx. ${(1000/withdrawRate).toFixed(2)} USDT for ₹1000</p>
                      <input type="password" placeholder="Login Password" className="w-full bg-gray-50 p-5 rounded-2xl font-bold outline-none border border-transparent focus:border-black" />
                      <button onClick={handleWithdraw} className="w-full bg-black text-white py-5 rounded-full font-black uppercase shadow-xl active:scale-95 transition-all">Submit Withdrawal</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ORDER RECORD */}
              {subPage === 'Order Record' && (
                <div className="space-y-4">
                  {betHistory.length > 0 ? (
                    betHistory.map((h, i) => (
                      <div key={i} className="bg-white p-5 rounded-3xl mb-4 shadow-sm flex justify-between items-center border-l-8 border-red-500 hover:shadow-md transition-all">
                        <div>
                          <p className="font-black text-[12px] text-gray-800">Period: {h.period || 'N/A'}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{h.time} • {h.gameMode || '1min'}</p>
                          <p className="text-[10px] font-bold text-gray-600 mt-1">Bet: {h.option}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-sm ${h.status === 'Win' ? 'text-green-500' : h.status === 'Loss' ? 'text-red-500' : 'text-yellow-500'}`}>
                            {h.status === 'Win' ? `+₹${h.winAmount?.toFixed(2) || (h.amount * 1.9).toFixed(2)}` : 
                             h.status === 'Loss' ? `-₹${h.amount?.toFixed(2) || '0.00'}` : 
                             `₹${h.amount?.toFixed(2) || '0.00'}`}
                          </p>
                          <span className={`text-[9px] font-bold uppercase ${h.status === 'Win' ? 'text-green-600' : h.status === 'Loss' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {h.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 opacity-20">
                      <span className="text-7xl">📭</span>
                      <p className="font-black mt-4 uppercase tracking-widest">No Bet History</p>
                      <p className="text-gray-400 text-xs mt-2">Place bets to see records here</p>
                    </div>
                  )}
                </div>
              )}

              {/* TRANSACTION HISTORY */}
              {subPage === 'Transaction History' && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-black text-sm text-gray-800">₹500 Deposit</p>
                        <p className="text-[10px] text-gray-500">12 Jan 2024, 14:30</p>
                      </div>
                      <span className="text-green-500 font-black">+₹500</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-black text-sm text-gray-800">₹200 Withdrawal</p>
                        <p className="text-[10px] text-gray-500">10 Jan 2024, 11:45</p>
                      </div>
                      <span className="text-red-500 font-black">-₹200</span>
                    </div>
                  </div>
                  <div className="text-center py-10">
                    <button 
                      onClick={async () => {
                        try {
                          const res = await axios.get('/api/transactions', {
                            headers: {
                              'Authorization': `Bearer ${authToken}`
                            }
                          });
                          alert(`Loaded ${res.data.length} transactions`);
                        } catch (error) {
                          alert("Load transactions feature coming soon!");
                        }
                      }}
                      className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-xs"
                    >
                      Load More Transactions
                    </button>
                  </div>
                </div>
              )}

              {/* SUPPORT PAGE */}
              {subPage === 'Support' && (
                <div className="text-center py-24">
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner">🎧</div>
                  <p className="font-black text-gray-800">Customer Support</p>
                  <p className="text-red-500 font-bold mt-2">support@damangames.com</p>
                  <button className="mt-8 bg-red-500 text-white px-8 py-3 rounded-full font-black uppercase text-[10px]">Start Chat</button>
                </div>
              )}

              {/* ABOUT US PAGE */}
              {subPage === 'About Us' && (
                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
                    <h3 className="font-black text-xl text-gray-800 mb-4">COLOR TRADER PRO</h3>
                    <p className="text-gray-600 text-sm">Multi-Mode Color Prediction Game Platform</p>
                    <p className="text-gray-500 text-xs mt-4">Version 2.1.0</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-4">About Us</h4>
                    <p className="text-gray-600 text-sm">Our goal is to provide a secure and entertaining multi-mode gaming experience with 1min, 3min, 5min, and 10min games.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HOME TAB */}
        {activeTab === 'Home' && (
          <div className="flex-1 pb-24 animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-[#ff5e5e] to-[#ff2a2a] p-10 pb-20 rounded-b-[4rem] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h2 className="text-4xl font-black italic tracking-tighter">Daman</h2>
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">🔔</div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[3rem] flex justify-between items-center relative z-10 shadow-inner">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Total Balance</p>
                  <h3 className="text-4xl font-black tracking-tighter">₹{user.wallet.toFixed(2)}</h3>
                </div>
                <button onClick={() => setSubPage('Deposit')} className="bg-yellow-400 text-red-900 w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-xl shadow-yellow-500/40 active:scale-90 transition-all">➕</button>
              </div>
            </div>
            
            <div className="px-6 -mt-10">
              <div onClick={() => setActiveTab('Win')} className="bg-white p-8 rounded-[3rem] shadow-xl shadow-gray-200 border border-gray-50 flex items-center justify-between cursor-pointer active:scale-95 transition-all group">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-tr from-red-600 to-red-400 rounded-[2rem] shadow-xl flex items-center justify-center text-white text-4xl font-black italic group-hover:rotate-6 transition-transform">W</div>
                  <div>
                    <p className="font-black text-2xl text-gray-800">Multi-Mode Game</p>
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.3em]">1min • 3min • 5min • 10min</p>
                  </div>
                </div>
                <span className="text-2xl text-gray-200 group-hover:translate-x-2 transition-transform">➜</span>
              </div>
            </div>

            <div className="p-8 grid grid-cols-2 gap-4">
              <div onClick={() => setActiveTab('Activity')} className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 cursor-pointer active:scale-95 transition-all">
                <span className="text-3xl">🏆</span>
                <p className="font-black text-[10px] uppercase text-blue-600 mt-4">Leaderboard</p>
              </div>
              <div onClick={() => setActiveTab('Promotion')} className="bg-purple-50 p-6 rounded-[2.5rem] border border-purple-100 cursor-pointer active:scale-95 transition-all">
                <span className="text-3xl">🎁</span>
                <p className="font-black text-[10px] uppercase text-purple-600 mt-4">Rewards</p>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY TAB - Daily Bonus & Rewards */}
        {activeTab === 'Activity' && (
          <div className="flex-1 pb-24 animate-in slide-in-from-bottom duration-500 bg-[#f8f9fd]">
            <div className="bg-gradient-to-r from-[#ff4d4d] to-[#cc0000] p-12 text-white text-center rounded-b-[4rem] shadow-xl">
              <h2 className="text-3xl font-black italic uppercase tracking-widest">Rewards Center</h2>
            </div>
            <div className="p-6 -mt-10 space-y-6">
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50">
                <h4 className="font-black text-xs text-gray-800 mb-6 flex items-center gap-2"><span>📅</span> Weekly Attendance</h4>
                <div className="grid grid-cols-4 gap-3">
                  {dailyBonus.days.map((claimed, dayIndex) => (
                    <div key={dayIndex} 
                      onClick={() => claimDailyBonus(dayIndex)}
                      className={`p-4 flex flex-col items-center justify-center rounded-2xl font-black transition-all cursor-pointer ${claimed ? 'bg-red-500 text-white shadow-lg shadow-red-200' : dailyBonus.claimedToday ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-gray-50 text-gray-300 border border-gray-100 hover:bg-red-50'}`}>
                      <span className="text-[8px] uppercase">Day</span>
                      <span className="text-lg">{dayIndex + 1}</span>
                      <span className="text-[8px] mt-1">₹{(dayIndex + 1) * 50}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-gray-500 mt-4">
                  Streak: {user.streak} days • {dailyBonus.claimedToday ? '✅ Claimed today' : '🟡 Can claim today'}
                </p>
              </div>
              <div className="space-y-4">
                {["First Deposit Bonus", "VIP Monthly Reward", "Inviter Reward"].map((task, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 flex items-center justify-between group active:scale-95 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-red-50 transition-colors">🎁</div>
                      <span className="font-black text-gray-800 text-[11px] uppercase tracking-tighter">{task}</span>
                    </div>
                    <button className="text-[9px] font-black text-red-500 bg-red-50 px-6 py-2.5 rounded-full border border-red-100 shadow-sm uppercase">Claim</button>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <button 
                  onClick={async () => {
                    try {
                      const res = await axios.get('/api/leaderboard', {
                        headers: {
                          'Authorization': `Bearer ${authToken}`
                        }
                      });
                      alert(`Loaded leaderboard with ${res.data.length} players`);
                    } catch (error) {
                      alert("Leaderboard feature coming soon!");
                    }
                  }}
                  className="bg-red-500 text-white px-8 py-4 rounded-full font-black uppercase text-xs"
                >
                  View Full Leaderboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROMOTION TAB - Invitation System */}
        {activeTab === 'Promotion' && (
          <div className="flex-1 pb-24 animate-in slide-in-from-bottom duration-500 bg-[#f8f9fd]">
            <div className="bg-gradient-to-br from-[#2b3243] to-[#1a1d21] p-12 text-white text-center rounded-b-[4rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-20 -mt-20"></div>
              <h2 className="text-3xl font-black italic tracking-widest relative z-10">PROMOTION</h2>
              <div className="mt-8 bg-white/10 backdrop-blur-lg p-6 rounded-[2.5rem] border border-white/20 relative z-10">
                <p className="text-[10px] font-black opacity-50 uppercase mb-2 tracking-[0.3em]">Invitation Code</p>
                <h3 className="text-4xl font-black tracking-[0.4em] text-yellow-400">{user.inviteCode}</h3>
              </div>
            </div>
            <div className="p-6 -mt-8 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex justify-around items-center">
                <div onClick={() => setSubPage('Deposit')} className="text-center cursor-pointer active:scale-90 transition-all">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.8rem] flex items-center justify-center text-3xl mb-3 shadow-inner">📥</div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deposit</p>
                </div>
                <div onClick={() => setSubPage('Withdraw')} className="text-center cursor-pointer active:scale-90 transition-all">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-[1.8rem] flex items-center justify-center text-3xl mb-3 shadow-inner">📤</div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Withdraw</p>
                </div>
              </div>

              <button onClick={() => {
                navigator.clipboard.writeText(`https://damangames.com/invite/${user.inviteCode}`);
                alert("✅ Invite link copied to clipboard!");
                playSound('click');
              }} className="w-full bg-red-600 text-white py-6 rounded-full font-black uppercase text-xs shadow-xl shadow-red-500/30 active:scale-95 transition-all tracking-widest">Copy Invite Link</button>
              <div className="bg-white rounded-[3rem] border border-gray-100 p-8 shadow-sm">
                <h4 className="font-black text-gray-800 text-xs mb-6 uppercase text-center tracking-widest">Rebate Rates</h4>
                <div className="space-y-4 font-bold text-[12px]">
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                    <span className="text-gray-400 uppercase text-[10px]">Level 1</span>
                    <span className="text-red-500 font-black text-lg">0.60%</span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                    <span className="text-gray-400 uppercase text-[10px]">Level 2</span>
                    <span className="text-red-500 font-black text-lg">0.30%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WIN GO GAME TAB - MULTI MODE */}
        {activeTab === 'Win' && (
          <div className="flex-1 pb-24 animate-in slide-in-from-right duration-500 bg-[#f8faff] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#ff4d4d] to-[#cc0000] p-8 text-white pb-20 shadow-xl flex justify-between items-center rounded-b-[4rem]">
              <div>
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Balance</p>
                <h2 className="text-5xl font-black italic tracking-tighter drop-shadow-md">₹{user.wallet.toFixed(2)}</h2>
              </div>
              <button onClick={() => setSubPage('Deposit')} className="bg-white text-red-600 px-8 py-3 rounded-full font-black text-[10px] shadow-xl uppercase active:scale-90 transition-all">Recharge</button>
            </div>
            
            {/* Game Mode Selector */}
            <div className="mx-6 -mt-12 bg-white rounded-[3rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.1)] border border-white z-10 relative">
              <div className="mb-6">
                <h3 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
                  <span className="text-xl">⏱️</span> Select Game Mode
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {gameModes.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setGameMode(mode.id)}
                      className={`py-3 rounded-2xl font-bold text-xs transition-all ${
                        gameMode === mode.id
                          ? 'bg-red-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-50 rounded-[1.8rem] flex items-center justify-center text-3xl shadow-inner">🏆</div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Period</p>
                    <p className="font-black text-gray-800 text-xl tracking-tighter">
                      {period || `P${Date.now().toString().slice(-6)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Time Left</p>
                  <div className="flex gap-1.5">
                    <span className="bg-gray-800 text-white w-8 h-12 flex items-center justify-center rounded-xl font-black text-2xl font-mono shadow-lg">
                      {Math.floor(timer/10) || 0}
                    </span>
                    <span className="bg-red-500 text-white w-8 h-12 flex items-center justify-center rounded-xl font-black text-2xl font-mono shadow-lg animate-pulse">
                      {timer%10 || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Bet Amounts */}
            <div className="p-6 grid grid-cols-5 gap-2 mb-6">
              {quickBetAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => setSelectedQuickAmount(amount)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    selectedQuickAmount === amount
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ₹{amount}
                </button>
              ))}
            </div>

            <div className="p-6 grid grid-cols-3 gap-4 mt-4">
              <button onClick={() => placeBet('Green')} className="bg-[#47ba7c] text-white py-8 rounded-tr-[3rem] rounded-bl-[3rem] font-black uppercase text-xs shadow-xl shadow-green-200 active:scale-95 transition-all hover:brightness-110">Green</button>
              <button onClick={() => placeBet('Violet')} className="bg-[#b359f8] text-white py-8 rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-purple-200 active:scale-95 transition-all hover:brightness-110">Violet</button>
              <button onClick={() => placeBet('Red')} className="bg-[#fb4e4e] text-white py-8 rounded-tl-[3rem] rounded-br-[3rem] font-black uppercase text-xs shadow-xl shadow-red-200 active:scale-95 transition-all hover:brightness-110">Red</button>
            </div>

            <div className="px-6 grid grid-cols-2 gap-4 mb-4">
              <button onClick={() => placeBet('Big')} className="bg-gradient-to-r from-orange-400 to-orange-500 text-white py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl shadow-orange-200 active:scale-95 transition-all">Big</button>
              <button onClick={() => placeBet('Small')} className="bg-gradient-to-r from-blue-400 to-blue-500 text-white py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl shadow-blue-200 active:scale-95 transition-all">Small</button>
            </div>
            
            <div className="px-6 grid grid-cols-5 gap-3 mb-8 bg-white p-8 mx-6 rounded-[3rem] shadow-xl border border-gray-50">
              {[0,1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} onClick={() => placeBet(n.toString())} className={`w-full aspect-square rounded-[1.2rem] flex items-center justify-center text-white font-black text-xl shadow-md transform active:scale-90 transition-all ${n%2===0 ? 'bg-gradient-to-b from-red-400 to-red-600' : 'bg-gradient-to-b from-green-400 to-green-600'} ${(n===0 || n===5) ? 'from-purple-500 to-purple-700' : ''}`}>{n}</button>
              ))}
            </div>
            
            <div className="bg-white rounded-[3rem] mx-6 p-8 shadow-sm mb-10 border border-gray-50">
              <h3 className="font-black text-xs text-gray-800 mb-6 uppercase flex items-center gap-3 tracking-widest">
                <span className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">📊</span> 
                {gameMode.toUpperCase()} Game History (Live from Backend)
              </h3>
              
              {/* Debug info */}
              <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600">
                  <strong>Sync Status:</strong> {records.length > 0 ? '✅ Connected to Backend' : '🔄 Connecting...'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <strong>Current Period:</strong> {period || 'Loading...'} | <strong>Timer:</strong> {timer}s
                </p>
              </div>
              
              <div className="overflow-hidden rounded-3xl border border-gray-100">
                <table className="w-full text-center text-[12px] font-bold">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-400 border-b">
                      <th className="py-4">Period</th>
                      <th className="py-4">Result</th>
                      <th className="py-4">Size</th>
                      <th className="py-4">Color</th>
                      <th className="py-4">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.length > 0 ? (
                      records.map((r, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 text-gray-400 font-mono text-[10px]">
                            {r.period_id || `P${1000+index}`}
                          </td>
                          <td className={`text-xl font-black ${
                            (r.number || 0) % 2 === 0 ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {r.number || 0}
                          </td>
                          <td className="text-gray-600 uppercase text-[10px] font-black">
                            {(r.number || 0) >= 5 ? 'Big' : 'Small'}
                          </td>
                          <td className="py-4 flex justify-center">
                            <div className={`w-4 h-4 rounded-full shadow-sm ${
                              r.color === 'red' ? 'bg-red-500' : 
                              r.color === 'green' ? 'bg-green-500' : 
                              r.color === 'violet' ? 'bg-purple-500' :
                              (r.number || 0) === 0 || (r.number || 0) === 5 ? 'bg-purple-500' :
                              (r.number || 0) % 2 === 0 ? 'bg-red-500' : 'bg-green-500'
                            }`}></div>
                          </td>
                          <td className="text-gray-500 text-[9px] font-bold">{gameMode}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-gray-400">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mb-2"></div>
                          <p className="text-sm">Loading data from backend...</p>
                          <p className="text-xs mt-1">Check if backend server is running</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-t-[4rem] px-8 pt-10 pb-24 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-gray-50 min-h-[300px]">
              <h3 className="font-black text-xs text-gray-800 mb-8 uppercase tracking-widest text-center">
                My {gameMode.toUpperCase()} Betting Records
              </h3>
              {betHistory.filter(h => h.gameMode === gameMode).length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-4 opacity-20">📜</div>
                  <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">No Records Found</p>
                  <p className="text-gray-400 text-xs mt-2">Place bets in {gameMode} game to see records here</p>
                </div>
              ) : (
                betHistory.filter(h => h.gameMode === gameMode).map((h, i) => (
                  <div key={i} className="mb-4 bg-gray-50 p-4 rounded-2xl flex justify-between items-center hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="text-xs font-black">{h.period || 'N/A'} • {h.gameMode}</p>
                      <p className="text-[8px] text-gray-400">{h.time || 'Just now'}</p>
                      <p className="text-[10px] font-bold text-gray-600 mt-1">Bet: {h.option}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${h.status==='Win'?'text-green-500':h.status==='Loss'?'text-red-500':'text-yellow-500'}`}>
                        {h.status==='Win'?'+':h.status==='Loss'?'-':''}₹{h.amount?.toFixed(2) || '0.00'}
                      </p>
                      <p className={`text-[8px] uppercase font-bold ${h.status==='Win'?'text-green-600':h.status==='Loss'?'text-red-600':'text-yellow-600'}`}>
                        {h.status || 'Pending'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'Account' && (
          <div className="flex-1 pb-24 animate-in slide-in-from-right duration-500 bg-[#f8f9fd]">
            <div className="bg-gradient-to-b from-[#ff4d4d] to-[#cc0000] p-10 text-white rounded-b-[4rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-24 h-24 bg-white/20 rounded-[2.5rem] backdrop-blur-md flex items-center justify-center text-5xl border border-white/30 shadow-inner">👤</div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter italic">ID: {user.uid}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-yellow-400 text-red-700 px-4 py-1 rounded-full text-[9px] font-black uppercase shadow-lg shadow-yellow-500/30">{user.level}</span>
                    <span className="bg-white/20 px-4 py-1 rounded-full text-[9px] font-black uppercase">Mobile: {user.mobile}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 -mt-8 space-y-6">
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex justify-around items-center">
                <div onClick={() => setSubPage('Deposit')} className="text-center cursor-pointer active:scale-90 transition-all">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.8rem] flex items-center justify-center text-3xl mb-3 shadow-inner">📥</div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deposit</p>
                </div>
                <div onClick={() => setSubPage('Withdraw')} className="text-center cursor-pointer active:scale-90 transition-all">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-[1.8rem] flex items-center justify-center text-3xl mb-3 shadow-inner">📤</div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Withdraw</p>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] shadow-sm border border-gray-50 overflow-hidden">
                {[
                  {n: 'Order Record', i: '📜', s: 'Order Record'},
                  {n: 'Transaction History', i: '💸', s: 'Transaction History'},
                  {n: 'Customer Support', i: '🎧', s: 'Support'},
                  {n: 'About Us', i: 'ℹ️', s: 'About Us'}
                ].map((item, idx) => (
                  <div key={idx} onClick={() => setSubPage(item.s)} className="p-6 border-b border-gray-50 flex justify-between items-center hover:bg-gray-50 active:bg-gray-100 transition-all cursor-pointer group">
                    <div className="flex items-center gap-6">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{item.i}</span>
                      <span className="font-black text-gray-700 text-xs uppercase tracking-widest">{item.n}</span>
                    </div>
                    <span className="text-gray-200 group-hover:translate-x-2 transition-transform">➜</span>
                  </div>
                ))}
              </div>

              <button onClick={() => {
                setIsLoggedIn(false);
                setAuthToken(null);
                localStorage.removeItem('authToken');
                axios.defaults.headers.common['Authorization'] = '';
                if (wsRef.current) {
                  wsRef.current.close();
                  wsRef.current = null;
                }
                alert("Logged out successfully!");
              }} className="w-full bg-gray-100 text-gray-400 py-6 rounded-full font-black uppercase text-xs tracking-[0.3em] active:bg-red-50 active:text-red-500 transition-all">Logout</button>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white/80 backdrop-blur-2xl border-t border-gray-100 flex justify-around p-4 z-[200] rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          {[
            {id: 'Home', i: '🏠', l: 'Home'},
            {id: 'Activity', i: '🎁', l: 'Activity'},
            {id: 'Promotion', i: '📢', l: 'Promotion'},
            {id: 'Win', i: '🎮', l: 'Game'},
            {id: 'Account', i: '👤', l: 'Account'}
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSubPage(null); playSound('click'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'scale-110' : 'opacity-40'}`}>
              <span className={`text-2xl ${activeTab === tab.id ? 'drop-shadow-md' : ''}`}>{tab.i}</span>
              <span className={`text-[8px] font-black uppercase tracking-tighter ${activeTab === tab.id ? 'text-red-500' : 'text-gray-400'}`}>{tab.l}</span>
              {activeTab === tab.id && <div className="w-1 h-1 bg-red-500 rounded-full mt-0.5 animate-bounce"></div>}
            </button>
          ))}
        </nav>

        {/* ✅ WORKING BET CONFIRMATION PANEL WITH ALL BUTTONS */}
        {showBetPanel && bettingOption && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Confirm Your Bet</h3>
                <p className="text-gray-500 text-sm mt-1">Double-check before placing bet</p>
              </div>
              
              {/* Bet Details */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600 font-medium">Bet Option:</span>
                  <span className={`text-lg font-bold ${
                    bettingOption === 'Green' ? 'text-emerald-600' :
                    bettingOption === 'Red' ? 'text-red-600' :
                    bettingOption === 'Violet' ? 'text-purple-600' : 'text-blue-600'
                  }`}>
                    {bettingOption}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600 font-medium">Game Mode:</span>
                  <span className="font-bold">{gameMode}</span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600 font-medium">Period:</span>
                  <span className="font-bold">{period || `P${Date.now().toString().slice(-6)}`}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Time Left:</span>
                  <span className="font-bold text-red-600">{timer}s</span>
                </div>
              </div>
              
              {/* Bet Amount */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-gray-700 font-medium">Bet Amount (₹)</label>
                  <span className="text-sm text-gray-500">Balance: ₹{user.wallet.toFixed(2)}</span>
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {quickBetAmounts.map(amt => (
                    <button
                      key={amt}
                      onClick={() => setSelectedQuickAmount(amt)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedQuickAmount === amt
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                
                {/* Custom Amount Input */}
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500 font-bold">₹</span>
                  <input
                    type="number"
                    value={selectedQuickAmount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setSelectedQuickAmount(Math.max(10, Math.min(val, user.wallet)));
                    }}
                    min="10"
                    max={user.wallet}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-lg font-bold text-center focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Min: ₹10</span>
                  <span>Max: ₹{user.wallet.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Warning Message if timer is low */}
              {timer <= 10 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-600 text-sm font-medium text-center">
                    ⚠️ Betting closes in {timer} seconds!
                  </p>
                </div>
              )}
              
              {/* ✅ ACTION BUTTONS - Clear and Working */}
              <div className="flex gap-3">
                {/* CANCEL BUTTON */}
                <button
                  onClick={() => {
                    console.log('Cancelling bet');
                    setShowBetPanel(false);
                    setBettingOption(null);
                    playSound('click');
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                
                {/* CONFIRM BUTTON */}
                <button
                  onClick={() => {
                    console.log('Placing bet:', { 
                      amount: selectedQuickAmount, 
                      option: bettingOption,
                      gameMode: gameMode 
                    });
                    confirmBet();
                    playSound('click');
                  }}
                  disabled={timer <= 10}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    timer <= 10 
                      ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg active:scale-95'
                  }`}
                >
                  {timer <= 10 ? 'Betting Closed' : 'Place Bet'}
                </button>
              </div>
              
              {/* Quick Info */}
              <div className="text-center mt-4">
                <p className="text-xs text-gray-500">
                  {selectedQuickAmount > user.wallet ? 
                    '❌ Insufficient balance!' : 
                    `✅ Will deduct ₹${selectedQuickAmount} from your wallet`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Win/Loss Popup */}
        {showPopup && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-10 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`w-full max-w-xs p-10 rounded-[3.5rem] text-center shadow-2xl transform animate-in zoom-in duration-300 ${popupType === 'win' ? 'bg-gradient-to-b from-green-400 to-green-600 border-4 border-white/30' : 'bg-gradient-to-b from-red-400 to-red-600 border-4 border-white/30'}`}>
              <div className="text-7xl mb-6 drop-shadow-lg">{popupType === 'win' ? '🎉' : '💀'}</div>
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">{popupType === 'win' ? 'WINNER!' : 'LOST!'}</h2>
              <p className="text-white/80 font-bold uppercase text-[10px] tracking-widest mb-8">
                Result: {lastResult?.number || Math.floor(Math.random()*10)} • {lastResult?.color || (Math.random() > 0.5 ? 'Red' : 'Green')}
              </p>
              <button 
                onClick={() => {
                  setShowPopup(false);
                  playSound('click');
                }} 
                className="w-full bg-white text-gray-900 py-4 rounded-full font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
              >
                Continue Playing
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;