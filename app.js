/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
require('./libs/load-env');

/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const errorHandler = require('errorhandler');
const _ = require('lodash');
const logger = require('./libs/logger');

/**
 * Handle global uncaughtException
 */
process.on('uncaughtException', function(err) {
  logger.fatal(err);
});

/**
 * Create Express server.
 */
const app = express();

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.use(compression());
app.use(bodyParser.json());
app.use(expressValidator());
app.all('/*', function(req, res, next) {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*'); // restrict it to the required domain
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  // Set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.use(require('express-bunyan-logger')({
    name: process.env.LOGGER_NAME,
    format: ':method :url :status-code :res-headers[content-length] - :response-time ms',
    parseUA: false,
    levelFn: function(status, err, meta) {
      meta['route'] = `${meta['method']} ${_.get(meta, 'req.route.path')}`;

      if (meta['status-code'] >= 500 || meta['response-time'] > 1000) {
        meta['debug-data'] = {
          req: _.pick(meta['req'], ['headers', 'params', 'query', 'body', 'user'])
        };

        // Delete access token from debug-data
        _.unset(meta, 'debug-data.req.headers.x-access-token');

        return 'fatal';
      } else if (meta['response-time'] > 500) {
        meta['debug-data'] = {
          req: _.pick(meta['req'], ['headers', 'params', 'query', 'body', 'user'])
        };
        return 'warn';
      } else {
        return 'info';
      }
    },
    excludes: [
      'remote-address',
      'pid', 'req_id',
      'ip', 'referer',
      'user-agent',
      'short-body',
      'body', 'response-hrtime',
      'http-version',
      'req-headers',
      'res-headers',
      'req', 'res',
      'incoming'
    ]
  }));
}

// Auth Middleware - This will check if the token is valid
// Only the requests that start with /api/v1/* will be checked for the token.
// Any URL's that do not follow the below pattern should be avoided unless you
// are sure that authentication is not needed
app.all('/api/v1/*', [require('./middlewares/validateToken')]);
app.use('/', require('./routes'));

// For testing and development enrivonment only
if (process.env.UPLOAD_TO_S3 == 'false') {
  app.use(express.static('public'));
}

/**
 * Mount Kue UI
 */
var ui = require('kue-ui');
var kue = require('./libs/kue')._kue;
var basicAuth = require('basic-auth-connect');

ui.setup({
  apiURL: '/kue-api', // IMPORTANT: specify the api url
  baseURL: '/kue', // IMPORTANT: specify the base url
  updateInterval: 5000 // Optional: Fetches new data every 5000 ms
});

app.use('/kue-api', basicAuth(process.env.KUE_LOGIN_USER, process.env.KUE_LOGIN_PASSWORD), kue.app);
app.use('/kue', basicAuth(process.env.KUE_LOGIN_USER, process.env.KUE_LOGIN_PASSWORD), ui.app);

// If no route is matched by now, it must be a 404
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development' || process.env.SHOW_ERROR_TO_CLIENT === 'true') {
  app.use(errorHandler());
} else {
  app.use(function(err, req, res, next) {
    res.status(err.status).end();
  });
}

/**
 * Start Express server.
 */
if (require.main === module) {
  app.listen(app.get('port'), () => {
    logger.info('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
  });
}

//////////////////////////////////////////
// FOR DEVELOPMENT AND TEST ENVIRONMENT //
/////////////////////////////////////////
if (process.env.NODE_ENV !== 'production') {
  // Start socket-io server when start main app
  require('./socket-server');
}

module.exports = app;
