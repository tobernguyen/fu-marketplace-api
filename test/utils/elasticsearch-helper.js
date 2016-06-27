'use strict';

var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
  host: process.env.ELASTIC_SEARCH_HOST,
  log: process.env.ELASTIC_SEARCH_LOG_LEVEL
});
const INDEX_NAME = process.env.ELASTIC_SEARCH_INDEX_NAME;

exports.resetDb = () => {
  return deleteAll().then(createIndexWithConfig);
};

var deleteAll = () => {
  return client.indices.delete({
    index: INDEX_NAME,
    ignore: [404]
  });
};
exports.deleteAll = deleteAll;

var createIndexWithConfig = () => {
  return client.indices.create({
    index: INDEX_NAME,
    body: require('../../config/elasticsearch-indices-settings.json')
  });
};
exports.createIndexWithConfig = createIndexWithConfig;

exports.refreshIndexNow = (cb) => {
  return client.indices.refresh({
    index: INDEX_NAME
  });
};
