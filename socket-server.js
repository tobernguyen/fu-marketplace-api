/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
require('./libs/load-env');

var io = require('socket.io')(process.env.SOCKET_IO_PORT);
var redis = require('socket.io-redis');
io.adapter(redis(process.env.REDIS_URI.replace('redis://', ''), {key: process.env.SOCKET_IO_REDIS_PREFIX || 'socket.io'}));

// Assign another name for logger if this server is run on other process
process.env.LOGGER_NAME = process.env.SOCKET_IO_LOGGER_NAME;
var logger = require('./libs/logger');
var validateSocketIOToken = require('./middlewares/validateSocketIOToken');

logger.info(`SocketIO server listening on port ${process.env.SOCKET_IO_PORT} in ${process.env.NODE_ENV} mode`);

io.on('connection', validateSocketIOToken)
  .on('authenticated', socket => {
    logger.debug('User connected with ID:  ' + socket.user.id);

    // Join current socket to public channel
    socket.join('public-channel');

    // Join current socket to private channel
    socket.join(`user.${socket.user.id}`);
  });
