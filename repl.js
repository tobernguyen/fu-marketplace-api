const repl = require('repl');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
require('./libs/load-env');

global.models = require('./models');

var replServer = repl.start({});
replServer.on('exit', () => {
  process.exit();
});
