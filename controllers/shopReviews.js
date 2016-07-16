/**
 * Created by sonht on 13/07/2016.
 */
'use strict';

var _ = require('lodash');
var Shop = require('../models').Shop;
var User = require('../models').User;
var Review = require('../models').Review;

const DEFAULT_PAGE_SIZE = 10;

exports.getReviews = (req, res) => {

  let shopId = req.params.shopId;

  let size = _.toNumber(req.query.size);
  let page = _.toNumber(req.query.page);

  let perPage = size > 0 ? size : DEFAULT_PAGE_SIZE;
  let offset = page > 0 ? (page - 1) * perPage : 0;

  Review.findAll({
    where: {
      shopId: shopId
    },
    attributes: ['id', 'shopId', 'rate', 'comment', 'updatedAt'],
    limit: perPage,
    offset: offset,
    order: '"updatedAt" DESC',
    include: [{
      model: Shop,
      attributes: ['id', 'banned'],
      where: {
        banned: {
          $not: true
        }
      }
    }, {
      model: User,
      attributes:['id', 'fullName', 'avatar']
    }]
  }).then(rvs => {
    let result = _.map(rvs, r => {
      let review = r.toJSON();
      let userInfo = r.User;
      delete review['Shop'];
      delete review['User'];
      review['user'] = userInfo;
      return review;
    });
    res.json({
      reviews: result
    });
  });
};