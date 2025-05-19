import { httpServer } from './src/http_server/index';

const HTTP_PORT = 8181;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

import { BattleshipServer } from './src/server';

const PORT = 3000;
const server = new BattleshipServer(PORT);

process.on('SIGINT', () => {
  server.close();
  process.exit();
});

process.on('SIGTERM', () => {
  server.close();
  process.exit();
});
