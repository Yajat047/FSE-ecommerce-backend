const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

module.exports = function(db) {
    // Register route
    router.post('/register', async (req, res) => {
        try {
            const { username, password, email } = req.body;
            const usersCollection = db.collection('users');

            // Check if user already exists
            const existingUser = await usersCollection.findOne({ 
                $or: [{ username }, { email }] 
            });

            if (existingUser) {
                return res.status(400).render('register', { 
                    error: 'Username or email already exists' 
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create new user
            const result = await usersCollection.insertOne({
                username,
                email,
                password: hashedPassword,
                role: 'user', // Default role
                createdAt: new Date()
            });

            res.redirect('/login?message=' + encodeURIComponent('Registration successful! Please login.') + '&type=success');
        } catch (error) {
            res.status(500).render('register', { 
                error: 'Error creating account' 
            });
        }
    });

    // Login route
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            const usersCollection = db.collection('users');

            // Find user
            const user = await usersCollection.findOne({ username });
            if (!user) {
                return res.status(400).render('login', { 
                    error: 'Invalid credentials' 
                });
            }

            // Check password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).render('login', { 
                    error: 'Invalid credentials' 
                });
            }

            // Create token
            const token = jwt.sign(
                { 
                    userId: user._id, 
                    username: user.username,
                    role: user.role 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Store token in session
            req.session.token = token;
            res.redirect('/?message=' + encodeURIComponent('Welcome back, ' + user.username + '!') + '&type=success');
        } catch (error) {
            res.status(500).render('login', { 
                error: 'Error logging in' 
            });
        }
    });

    // Logout route
    router.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/login?message=' + encodeURIComponent('Logged out successfully') + '&type=info');
    });

    return router;
}; 