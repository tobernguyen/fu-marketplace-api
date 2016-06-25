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
 *    scrollId: String // Scroll ID to retrieve next batch of result
 *    total: Number    // Number of total shop found
 *    shops: [
 *      { 
 *        id: String, 
 *        name: String, 
 *        description: String,
 *        avatar: String,
 *        cover: String,
 *        status: Number
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
  let searchPromise;

  if (req.body.scrollId) {
    searchPromise = elasticsearch.getResultForScrollId(req.body.scrollId);
  } else {
    let searchParams = _.pick(req.body, ['keyword', 'size', 'categoryIds', 'shipPlaceId']);
    searchPromise = elasticsearch.searchShop(searchParams);
  }

  searchPromise.then(result => {
    let response = {};
    response['scrollId'] = result['_scroll_id'];
    response['total'] = result.hits.total;
    response['shops'] = _.map(result.hits.hits, hit => {
      let shopData = hit['_source'];
      let shop = _.pick(shopData, ['name', 'description', 'categoryIds', 'shipPlaceIds', 'avatar', 'cover', 'opening', 'seller']);
      shop['itemImages'] = _.map(shopData.items, i => i.image);
      shop['id'] = _.toNumber(hit['_id']);
      return shop;
    });

    res.json({
      result: response
    });
  }).catch(err => {
    logger.error(err);
    errorHandlers.responseError(400, err, 'search', res);
  });
};
