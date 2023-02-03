const websocket = require('ws');
const express = require("express");
const jwt = require("jsonwebtoken");
const path = require('path');
const url = require('url');
const runner = require('child_process');
require('dotenv').config();
const cors = require('cors');
const User = require('../database/model.js');
const Joi = require('@hapi/joi');
const { default: mongoose } = require('mongoose');
const bcrypt = require('bcrypt');
// Task queue
const Queue = require('bull');
const { result } = require('@hapi/joi/lib/base.js');
const queue = new Queue("myQueue", {
    redis: {
        host: 'redis',
        port: 6379
    },
    limiter: {
        max: 1000,
        duration: 5000
    }
});

// Uri connection to mongodb
const uri = "mongodb://mongo:27017";
// Connect to database
mongoose.connect(uri)
    .then(() => {
        console.log('Connected to db');
    }).catch((e) => {
        console.log('Db error', e);
    });

var wsClients = [];

const app = express();
// Use Cross Origin Resource Sharing
app.use(cors());
app.use(express.json());
// Make html's dependencies working correctly
app.use(express.static(path.join(__dirname, '..')));

// Server listening on port 3000
const server = app.listen(3000, () => {
    console.log("Server running on port 3000");
});

// Set validation schema
const schemaLogin = Joi.object({
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).required()
});

// Register user
app.post('/register', async (req, res) => {
    // Login schema validation
    const { error } = schemaLogin.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Check if email exists
    const isEmailExist = await User.findOne({ email: req.body.email });
    if (isEmailExist) return res.status(400).json({ error: 'Email already taken' });

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(req.body.password, salt);

    // Create user using the model
    const user = new User({
        email: req.body.email,
        password
    });

    // Save user into database
    try {
        const savedUser = await user.save();
        res.json({
            error: null,
            data: savedUser
        });
    } catch (error) {
        res.status(400).json({ error });
    }
});

// Receiving client's credentials and response with a token with a time no longer 
// than 10 minutes
app.post("/login", async (req, res) => {
    // Login schema validation
    const { error } = schemaLogin.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    // Email existence validation
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    // Password validation
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    // Create token
    const token = jwt.sign({
        email: user.email,
        id: user._id
    }, process.env.TOKEN_SECRET, {
        expiresIn: '10m'
    });

    res.header('auth-token', token).json({
        error: null,
        data: { token }
    });
});

// Set WebSocketServer in express server on path '/ws'
const wss = new websocket.Server({ server: server, path: '/ws' });

wss.on('connection', (ws, req) => {
    // Get token from the url and verifies it
    var token = url.parse(req.url, true).query.token;
    // If it is not valid, websocket connection is closed
    // Otherwise, client's websocket is saved with his correspondant token
    jwt.verify(token, process.env.TOKEN_SECRET, (err) => {
        if (err) {
            ws.close();
        } else {
            wsClients[token] = ws;
        }
    });
    // On message, if there is an error or current requests have reached the limit, websocket 
    // connection is closed
    ws.on('message', (data) => {
        data = JSON.parse(data);
        jwt.verify(token, process.env.TOKEN_SECRET, async (err) => {
            if (err || data.requests == 0) {
                ws.send("Your token is no longer valid.<br>");
                ws.close();
            } else {
                // Add job to queue
                addJob(data);

                queue.on('completed', (job, result) => {
                    ws.send(result);
                });

                queue.on('failed', (job, result) => {
                    ws.send(result);
                });
            }
        });
    });
});

const addJob = async (data) => {
    await queue.add(data);
};

queue.process((job) => {
    setTimeout(() => {
        runner.exec(`node ../grammar/parser.js ${job.data}`, function (err, response) {
            if (err) return Promise.reject(err);
            else return Promise.resolve(response);
        });
    }, (Math.floor(Math.random() * 5000)));
});