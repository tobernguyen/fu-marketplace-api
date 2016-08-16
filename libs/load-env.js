'use strict';

if (!process.env.NO_LOAD_ENV_FILE) {
  const dotenv = require('dotenv');
  dotenv.load({ path: `.env.${process.env.NODE_ENV || 'development'}` });
}
