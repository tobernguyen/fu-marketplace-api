var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: process.env.LOGGER_NAME,
  project_namespace: 'FUM'
});

module.exports = log;
