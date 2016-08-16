'use strict';

var assert = require('assert');

// Helper file for sequelize-cli to load database config when run migration
require('../libs/load-env');

assert(process.env.NODE_ENV, 'Please provide NODE_ENV when run this command');
assert(process.env.ELASTIC_SEARCH_HOST, 'Missing env variable ELASTIC_SEARCH_HOST');
assert(process.env.ELASTIC_SEARCH_INDEX_NAME, 'Missing env variable ELASTIC_SEARCH_INDEX_NAME');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: process.env.ELASTIC_SEARCH_HOST,
  log: process.env.ELASTIC_SEARCH_LOG_LEVEL || 'trace'
});

const INDEX_NAME = process.env.ELASTIC_SEARCH_INDEX_NAME;

let deletePromise;

if (process.env.FORCE_UPDATE) {
  console.log('=============WARNING=============');
  console.log('Force update will remove all index, you may have to reindex your document after this');
  console.log('=================================');

  deletePromise = client.indices.delete({
    index: INDEX_NAME,
    ignore: [404]
  });
} else {
  deletePromise = Promise.resolve();
}

deletePromise.then(() => {
  return client.indices.create({
    index: INDEX_NAME,
    body: require('../config/elasticsearch-indices-settings.json')
  });
}).then(() => {
  console.log('Done');
}).catch(err => {
  console.error(err);
});
