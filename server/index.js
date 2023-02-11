const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs');
const https = require('https');
const path = require('path');

app.use(express.static(path.join(__dirname, '..', '/client')));

const opts = { 
    key: fs.readFileSync('./certificates/server_key.pem'), 
    cert: fs.readFileSync(path.join('./certificates/server_cert.pem')),
    requestCert: true,
    rejectUnauthorized: false,
    ca: [ fs.readFileSync('./certificates/server_cert.pem') ]
}

app.get('/', (req, res) => {
    const cert = req.socket.getPeerCertificate();
    if (req.client.authorized) {
		res.sendFile(path.join(__dirname, '..', '/client/index.html'));
    } else if (cert.subject) {
        res.status(403)
		   .send(`Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not welcome here.`);
    } else {
        res.status(401)
		   .send(`Sorry, but you need to provide a client certificate to continue.`);
    }
});

https.createServer(opts, app).listen(port, () => {
    console.log(`Main server running on port ${port}`);
});