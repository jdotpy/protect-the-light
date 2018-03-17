require('proto-utils');

const Koa = require('koa');
const route = require('koa-route');
const websockify = require('koa-websocket');
const KoaStatic = require('koa-static');

const GameEngine = require('./engine.js');

GameEngine.createGame();
 
const server = websockify(new Koa());
server.use(KoaStatic('./www'));
server.ws.use(route.all('/ws-connect', function (ctx) {
  try {
    GameEngine.onConnection(ctx);
  }
  catch (error) {
    console.error('Error handling new connection');
    console.error(error);
  }
  ctx.websocket.on('message', function(message) {
    try {
      GameEngine.onMessage(ctx, JSON.parse(message))
    }
    catch (error) {
      console.error('Error handling websocket message');
      console.error(error);
    }
  });
}));
 

const port = process.env.PORT || 3000;
server.listen(port);
console.log(`Listening on port ${port}`)
