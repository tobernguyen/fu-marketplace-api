const dotenv = require('dotenv');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: `.env.${process.env.NODE_ENV || 'development'}` });

var io = require('socket.io')(process.env.SOCKET_IO_PORT);
var redis = require('socket.io-redis');
io.adapter(redis(process.env.REDIS_URI.replace('redis://', ''), {key: process.env.SOCKET_IO_REDIS_PREFIX || 'socket.io'}));

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
