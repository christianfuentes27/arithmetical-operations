const express = require('express');
const app = express();
const cors = require('cors');
const url = require('url');
const runner = require('child_process');
const jwt = require("jsonwebtoken");
const websocket = require('ws');
const path = require('path');
const port = 4000;
require('dotenv').config();

app.use(cors());
app.use(express.json());
var wsClients = [];

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

app.get('/test', (req, res) => {
    res.send({'message': 'Hello World!'});
});

app.get('/login', (req, res) => {
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

const server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

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
