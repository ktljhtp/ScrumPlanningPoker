// Позволяет require(...) грузить .ts-файлы напрямую, без отдельного шага
// сборки (см. tsconfig.json). Должно стоять раньше любых require, которые
// (возможно, транзитивно) тянут .ts-модули.
require('ts-node/register');

const { AppServer } = require('./src/server/AppServer');

const server = new AppServer();
server.start();