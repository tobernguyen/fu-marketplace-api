const repl = require('repl');
const dotenv = require('dotenv');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: `.env.${process.env.NODE_ENV || 'development'}` });

global.models = require('./models');

var replServer = repl.start({});
replServer.on('exit', () => {
  process.exit();
});
