'use strict';

var _ = require('lodash');
var logger = require('./logger');
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: process.env.ELASTIC_SEARCH_HOST,
  log: process.env.ELASTIC_SEARCH_LOG_LEVEL
});
var ESQ = require('esq');

var SCROLL_TIME = '1m';
var INDEX_NAME = process.env.ELASTIC_SEARCH_INDEX_NAME;
var SHOP_DOCUMENT_NAME = 'shop';
var DEFAULT_PER_PAGE = 5;

var buildShopDocument = (shopId) => {
  let models = require('../models');

  return models.Shop.findOne({
    attributes: ['name', 'description', 'opening', 'status', 'avatar', 'cover'],
    where: {
      id: shopId
    },
    include: [{
      model: models.User,
      attributes: ['id', 'fullName']
    }, {
      model: models.ShipPlace,
      attributes: ['id']
    }, {
      model: models.Item,
      attributes: ['name', 'description', 'categoryId', 'image'],
      where: {
        status: models.Item.STATUS.FOR_SELL
      },
      required: false
    }]
  }).then(shop => {
    if (!shop) return Promise.reject('Shop not found, skip indexing.');
    let shopDocument = _.pick(shop, ['name', 'description', 'opening', 'status', 'avatar', 'cover']);
    shopDocument['seller'] = _.pick(shop.User, ['id', 'fullName']);
    shopDocument['items'] = _.map(shop.Items, i => {
      return {
        name: i.name,
        description: i.description,
        image: i.image
      };
    });
    shopDocument['categoryIds'] = _.chain(shop.Items).map(i => i.categoryId).uniq().value();
    shopDocument['shipPlaceIds'] = _.map(shop.ShipPlaces, sp => sp.id);

    return Promise.resolve(shopDocument);
  });
};

/**
 * @param {number} shopId - The id of the shop to be indexed
 * This function receive a shop id then do the following actions:
 * - Query to get shop information from database including shop's items and owner info
 * - Transform the shop information to format that follow the Shop Document Schema in config/elasticsearch-indices-settings
 */
var indexShopById = (shopId) => {
  return buildShopDocument(shopId).then(shopDocument => {
    return client.index({
      index: INDEX_NAME,
      type: SHOP_DOCUMENT_NAME,
      id: shopId,
      body: shopDocument
    });
  }).catch(err => {
    logger.error(err);
  });
};
exports.indexShopById = indexShopById;

var deleteShopIndexById = (shopId) => {
  return client.delete({
    index: INDEX_NAME,
    type: SHOP_DOCUMENT_NAME,
    id: shopId,
    ignore: [404] // Dont reject promise if document not exist
  }).catch(err => {
    logger.error(err);
  });
};
exports.deleteShopIndexById = deleteShopIndexById;

var searchShop = (query) => {
  if (!query) query = {};

  let models = require('../models');
  let esq = new ESQ();

  if (_.isString(query.keyword)) {
    esq.query('bool', ['must'], {
      multi_match: {
        type: 'best_fields',
        query: query.keyword,
        fields: [
          'name^2', 
          'name.folded', 
          'description^2', 
          'description.folded', 
          'seller.fullName^2', 
          'seller.fullName.folded', 
          'items.name^10',
          'items.name.folded^5', 
          'items.description^10', 
          'items.description.folded^5'
        ]
      }
    });
  }

  esq.query('bool', ['must'], {
    term: { status: models.Shop.STATUS.PUBLISHED }
  });

  if (_.isArray(query.categoryIds)) {
    esq.query('bool', ['must'], {
      terms: { categoryIds: query.categoryIds }
    });
  }

  if (_.isNumber(query.shipPlaceId)) {
    esq.query('bool', ['must'], {
      term: { shipPlaceIds: query.shipPlaceId }
    });
  }

  esq.query('bool', 'should', {
    term: { opening: true }
  });

  return client.search({
    index: INDEX_NAME,
    type: SHOP_DOCUMENT_NAME,
    body: {
      query: esq.getQuery()
    },
    _source: [ 'id', 'name', 'description', 'categoryIds', 'status', 'avatar', 'cover', 'shipPlaceIds', 'seller', 'items.image', 'opening'],
    scroll: SCROLL_TIME,
    size: _.isNumber(query.size) ? query.size : DEFAULT_PER_PAGE
  });
};
exports.searchShop = searchShop;

var getResultForScrollId = (scrollId) => {
  return client.scroll({
    scroll: SCROLL_TIME,
    scrollId: scrollId
  });
};
exports.getResultForScrollId = getResultForScrollId;
