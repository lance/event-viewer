const EventEmitter = require('events');
const { Message, HTTP } = require('cloudevents');

const fastify = require('fastify')({
  logger: false
});
fastify.register(require('fastify-websocket'));

const eventQueue = new EventEmitter();

// Index page opens a websocket to /events
// TODO: add static content for viewing event logs from a websocket
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
});

// send events to the endpoint
fastify.post('/receiver', function (request, reply) {
  // receive a CloudEvent 
  const message = new Message(request.headers, request.body);
  if (HTTP.isEvent(message)) {
    const event = HTTP.toEvent(message);
    eventQueue.emit('received', event);
  }
  reply.send('OK');
});

// websocket endpoint for streaming events to the browser
fastify.get('/events', { websocket: true }, (connection /* SocketStream */, req /* FastifyRequest */) => {
  connection.socket.on('message', message => {
    // TODO: add connection handshake
    // https://github.com/cloudevents/spec/blob/v1.0.1/websockets-protocol-binding.md
    eventQueue.on('received', (event) => {
      connection.socket.send(event.toJSON());
    });
  })
});

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`server listening on ${address}`)
});