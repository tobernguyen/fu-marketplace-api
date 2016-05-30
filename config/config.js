// Helper file for sequelize-cli to load database config when run migration
const dotenv = require('dotenv');
dotenv.load({ path: `.env.${process.env.NODE_ENV || 'development'}` });

module.exports = {
  'production': {
    'url': process.env.DB_CONNECTION_STRING,
    'dialect': 'postgres'
  },
  'development': {
    'url': process.env.DB_CONNECTION_STRING,
    'dialect': 'postgres'
  },
  'test': {
    'url': process.env.DB_CONNECTION_STRING,
    'dialect': 'postgres'
  }
};
