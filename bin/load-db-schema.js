'use strict';

require('../libs/load-env');

const models = require('./models');
models.sequelize.sync({force: true});
