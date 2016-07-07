var winston = require('winston');

winston.handleExceptions(new (winston.transports.Console)());
winston.level = process.env.LOG_LEVEL || 'info';

module.exports = winston;
