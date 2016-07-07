/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const morgan = require('morgan');
const errorHandler = require('errorhandler');
const logger = require('./libs/logger');
const dotenv = require('dotenv');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: `.env.${process.env.NODE_ENV || 'development'}` });

/**
 * Create Express server.
 */
const app = express();

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.use(compression());
app.use(morgan('dev'));
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
