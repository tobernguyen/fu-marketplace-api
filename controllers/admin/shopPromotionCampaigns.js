'use strict';

var ShopPromotionCampaign = require('../../models').ShopPromotionCampaign;
var Shop = require('../../models').Shop;
var _ = require('lodash');
var errorHandlers = require('../helpers/errorHandlers');

const DEFAULT_PAGE_SIZE = 10;

exports.postShopPromotionCampaigns = (req, res) => {
  ShopPromotionCampaign.create(getSpcParams(req)).then(spc => {
    return responseSpc(spc, res);
  }).catch(err => errorHandlers.handleModelError(err, res));
};

exports.getShopPromotionCampaigns = (req, res) => {
  let size = _.toNumber(req.query.size);
  let page = _.toNumber(req.query.page);
  let perPage = size > 0 ? size : DEFAULT_PAGE_SIZE;
  let offset = page > 0 ? (page - 1) * perPage : 0;

  ShopPromotionCampaign.findAll({
    include: {
      model: Shop,
      attributes: ['name']
    },
    limit: perPage,
    offset: offset
  }).then(spcs => {
    let result = _.map(spcs, s => {
      let spc = s.toJSON();
      spc['shop'] = spc['Shop'].toJSON();
      delete spc['Shop'];
      return spc;
    });

    res.json({
      shopPromotionCampaigns: result
    });
  });
};

exports.putShopPromotionCampaigns = (req, res) => {
  var spcId = req.params.id;

  ShopPromotionCampaign.findById(spcId).then(spc => {
    if (!spc) {
      errorHandlers.responseError(404, 'Campaign does not exist', 'model', res);
    } else {
      return spc.update(getSpcParams(req)).then(spc => {
        return responseSpc(spc, res);
      });
    }
  }).catch(err => errorHandlers.handleModelError(err, res));
};

var responseSpc = (spc, res) => {
  return spc.getShop().then(shop => {
    let result = spc.toJSON();
    result['shop'] = {
      name: shop.name
    };
    res.json(result);
  });
};

var getSpcParams = (req, isUpdate) => {
  let spcParams = _.pick(req.body, ['shopId', 'type', 'startDate', 'endDate', 'active']);
  
  if (!isUpdate) spcParams['ownerId'] = req.user.id; // Record ownerId when create new only
  
  return spcParams;
};
