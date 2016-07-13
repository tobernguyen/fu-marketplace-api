'use strict';

var ShopPromotionCampaign = require('../models').ShopPromotionCampaign;
var _ = require('lodash');

const DEFAULT_PAGE_SIZE = 5;

exports.getTopFeedSlideShow = (req, res) => {
  ShopPromotionCampaign.scope('validTopFeedSlideShow').findAll({
    limit: DEFAULT_PAGE_SIZE
  }).then(spcs => {
    let shops = _.map(spcs, spc => spc.Shop.toJSON());
    res.json({
      shops: _.shuffle(shops)
    });
  });
};
