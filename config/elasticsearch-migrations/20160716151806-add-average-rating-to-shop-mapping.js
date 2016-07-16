'use strict';

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: process.env.ELASTIC_SEARCH_HOST,
  log: process.env.ELASTIC_SEARCH_LOG_LEVEL || 'trace'
});

const INDEX_NAME = process.env.ELASTIC_SEARCH_INDEX_NAME;

exports.up = () => {
  return client.indices.putMapping({
    index: INDEX_NAME,
    type: 'shop',
    body: {
      properties: {
        averageRating: {
          type: 'double',
          index: 'not_analyzed',
          null_value: 0
        }
      }
    }
  });
};

exports.down = () => {

};
