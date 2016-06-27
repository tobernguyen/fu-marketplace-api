'use strict';

var Promise = require('bluebird');
var assert = require('assert');

// Helper file for sequelize-cli to load database config when run migration
const dotenv = require('dotenv');
assert(process.env.NODE_ENV, 'Please provide NODE_ENV when run this command');
dotenv.load({ path: `.env.${process.env.NODE_ENV}` });

assert(process.env.ELASTIC_SEARCH_HOST, 'Missing env variable ELASTIC_SEARCH_HOST');
assert(process.env.ELASTIC_SEARCH_INDEX_NAME, 'Missing env variable ELASTIC_SEARCH_INDEX_NAME');

var models = require('../models');

// TODO: Batch processing this to improve performance
models.Shop.findAll().then(shops => {
  return Promise.reduce(shops, s => {
    console.log(`Index shop ID: ${s.id}`);
    return s.reindex();
  });
}).then(() => {
  console.log('Done');
});
