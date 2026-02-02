const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- AWS CONNECTION CONFIG ---
const pool = new Pool({
    user: 'postgres',
    host: 'YOUR_AWS_ENDPOINT_HERE', // AWS se copy kiya hua Endpoint yahan dalein
    database: 'postgres',
    password: 'YOUR_PASSWORD_HERE', // Jo password aapne AWS me rakha tha
    port: 5432,
    ssl: { rejectUnauthorized: false }
});

// Database aur Table setup check
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);
        console.log("✅ AWS Database & Table Ready!");
    } catch (err) {
        console.error("❌ Database Connection Error:", err.message);
    }
};
initDB();

// --- ROUTES ---

// Registration
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
            [name, email, hashedPassword]
        );
        res.status(201).json({ success: true, message: "User registered successfully!" });
    } catch (err) {
        res.status(400).json({ success: false, message: "Email already exists!" });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }
        
        const isMatch = await bcrypt.compare(password, result.rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Wrong password!" });
        }

        res.json({ success: true, message: "Welcome " + result.rows[0].name });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error!" });
    }
});

// Forget Password (Simulated)
app.post('/forget', async (req, res) => {
    const { email } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length > 0) {
        res.json({ success: true, message: "Password reset link sent to " + email });
    } else {
        res.status(404).json({ success: false, message: "Email not found!" });
    }
});

app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));