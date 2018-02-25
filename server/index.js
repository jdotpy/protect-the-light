const Koa = require('koa');
const route = require('koa-route');
const websockify = require('koa-websocket');
const KoaStatic = require('koa-static');

const GameEngine = require('./engine.js');

GameEngine.createGame();
 
const server = websockify(new Koa());
server.use(KoaStatic('./www'));
server.ws.use(route.all('/ws-connect', function (ctx) {
  GameEngine.onConnection(ctx);
  ctx.websocket.on('message', function(message) {
    GameEngine.onMessage(ctx, JSON.parse(message))
  });
}));
 

const port = process.env.PORT || 3000;
server.listen(port);
console.log(`Listening on port ${port}`)
