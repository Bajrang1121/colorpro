let currentMode = 'login';
const API_URL = 'http://localhost:3000';

function showRegister() {
    currentMode = 'register';
    document.getElementById('form-title').innerText = 'Create Account';
    document.getElementById('nameInput').style.display = 'block';
    document.getElementById('passInput').style.display = 'block';
    document.getElementById('submitBtn').innerText = 'Register Now';
    document.getElementById('toggle-text').innerHTML = 'Already have an account? <span onclick="showLogin()">Login</span>';
}

function showLogin() {
    currentMode = 'login';
    document.getElementById('form-title').innerText = 'Login';
    document.getElementById('nameInput').style.display = 'none';
    document.getElementById('passInput').style.display = 'block';
    document.getElementById('submitBtn').innerText = 'Login';
    document.getElementById('toggle-text').innerHTML = "Don't have an account? <span onclick=" + 'showRegister()' + ">Register</span>";
}

function showForget() {
    currentMode = 'forget';
    document.getElementById('form-title').innerText = 'Reset Password';
    document.getElementById('nameInput').style.display = 'none';
    document.getElementById('passInput').style.display = 'none';
    document.getElementById('submitBtn').innerText = 'Send Reset Link';
    document.getElementById('toggle-text').innerHTML = 'Back to <span onclick="showLogin()">Login</span>';
}

async function submitForm() {
    const name = document.getElementById('nameInput').value;
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passInput').value;
    const messageDiv = document.getElementById('message');

    messageDiv.innerText = 'Processing...';

    try {
        const response = await fetch(`${API_URL}/${currentMode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (data.success) {
            messageDiv.style.color = 'green';
            messageDiv.innerText = data.message;
            if(currentMode === 'register') setTimeout(showLogin, 2000);
        } else {
            messageDiv.style.color = 'red';
            messageDiv.innerText = data.message;
        }
    } catch (err) {
        messageDiv.style.color = 'red';
        messageDiv.innerText = 'Cannot connect to server!';
    }
}