const express = require('express');
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
app.use(cors());

const options = {
    target: 'http://api-rest:4000',
    changeOrigin: true
}

app.use('/test', createProxyMiddleware(options));
app.use('/login', createProxyMiddleware(options));

https.createServer({
    key: fs.readFileSync('./certificates/server_key.pem'), 
    cert: fs.readFileSync('./certificates/server_cert.pem'),
}, app).listen(5000, () => {
    console.log('Proxy running on port 5000');
});