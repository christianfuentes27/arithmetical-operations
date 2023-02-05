const websocket = require('ws');
const express = require("express");
const jwt = require("jsonwebtoken");
const path = require('path');
const url = require('url');
const runner = require('child_process');
require('dotenv').config();
const cors = require('cors');
const { default: mongoose } = require('mongoose');
// Task queue
const Queue = require('bull');
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
app.use(express.static(path.join(__dirname, '..', '/client')));

// Server listening on port 3000
const server = app.listen(3000, () => {
    console.log("Server running on port 3000");
});

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, '..', '/client/index.html'));
});

// Receiving client's credentials and response with a token with a time no longer 
// than 10 minutes
app.get("/login", async (req, res) => {
    // Create token
    const token = jwt.sign({
        serialNumber: req.headers['serialNumber']
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

                // When job is completed
                queue.on('completed', (job, result) => {
                    result.stdout.on('data', (data) => {
                        setTimeout(() => {
                            ws.send(data);
                        }, Math.floor(Math.random() * 5000) + 1000);
                    });
                });
            }
        });
    });
});

const addJob = async (data) => {
    await queue.add(data);
};

queue.process((job) => {
    return runner.exec(`node ${path.join(__dirname, '..', '/grammar/parser.js')} ${job.data.operation}`, async function (err, response) {
        if (err) return 'Error: ' + err;
        else return response;
    });
});