const express = require('express');
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
app.use(cors());

// Redirecting login route to api rest server
app.use('/login', createProxyMiddleware({
    target: 'http://node-app:3000',
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        const cert = req.socket.getPeerCertificate();
        if (!req.client.authorized) {
            res.status(401)
                .send(`Sorry, but you need to provide a client certificate to continue.`);
        } else 
        if (!cert.subject) {
            res.status(403)
                .send(`Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not welcome here.`)
        }
        // proxyReq.setHeader('serialNumber', cert.serialNumber);
    }
}));

https.createServer({
    cert: fs.readFileSync('./certificates/server_cert.pem'),
    key: fs.readFileSync('./certificates/server_key.pem'),
    ca: [fs.readFileSync('./certificates/server_cert.pem')],
    requestCert: true,
    rejectUnauthorized: false,
}, app).listen(8000, () => {
    console.log('Proxy https server running on port 8000');
});