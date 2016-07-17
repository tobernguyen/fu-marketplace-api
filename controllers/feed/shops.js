'use strict';

var elasticsearch = require('../../libs/elasticsearch');
var errorHandlers = require('../helpers/errorHandlers');
var _ = require('lodash');
var logger = require('../../libs/logger');

/**
 * Request format (2 type):
 * {
 *  keyword: String       // Keyword to search (optional)
 *  categoryIds: Number[] // Array of categoryId to filter (optional)
 *  shipPlaceId: Number   // ID of ship place to filter (optional)
 *  size: Number          // Number of shops to return per scroll (optional)
 * }
 * 
 * OR
 * {
 *  scrollId: String     // Scroll ID to retrieve next batch of result
 * }
 * 
 * Response format
 * {
 *  result: {
 *    total: Number    // Number of total shop found
 *    shops: [
 *      { 
 *        id: String, 
 *        name: String, 
 *        description: String,
 *        avatar: String,
 *        cover: String,
 *        status: Number,
 *        averageRating: Number,
 *        seller: Object {id, name}
 *        categoryIds: String[], 
 *        shipPlaceIds: String[], 
 *        itemImages: String[] 
 *      }
 *    ]
 *  }
 * }
 * 
 */
exports.searchShop = (req, res) => {
  let searchParams = _.pick(req.body, ['keyword', 'size', 'categoryIds', 'shipPlaceId', 'page']);

  elasticsearch.searchShop(searchParams).then(result => {
    let response = {};
    response['total'] = result.hits.total;
    response['shops'] = _.map(result.hits.hits, hit => {
      let shopData = hit['_source'];
      let shop = _.pick(shopData, ['name', 'description', 'categoryIds', 'shipPlaceIds', 'avatar', 'cover', 'opening', 'seller', 'averageRating']);
      shop['itemImages'] = _.map(shopData.items, i => i.image);
      shop['id'] = _.toNumber(hit['_id']);
      return shop;
    });

    // Build aggregations
    response['aggregations'] = {
      category: _.get(result, 'aggregations.category.buckets'),
      shipPlace: _.get(result, 'aggregations.shipPlace.buckets')
    };

    res.json({
      result: response
    });
  }).catch(err => {
    if (err.status >= 500) {
      logger.error(err);
    }
    
    errorHandlers.responseError(400, err.message, 'search', res);
  });
};
