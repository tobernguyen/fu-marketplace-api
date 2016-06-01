'use strict';

const dotenv = require('dotenv');
dotenv.load({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const models = require('./models');
models.sequelize.sync({force: true});
