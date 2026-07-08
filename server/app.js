require('ts-node/register');

const { AppServer } = require('./src/server/AppServer');

const server = new AppServer();
server.start();