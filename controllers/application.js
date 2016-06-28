'use strict';

var _ = require('lodash');
var ShipPlace = require('../models').ShipPlace;
var Category = require('../models').Category;

// TODO: cache this request
exports.getMetadata = (req, res) => {
  let promises = [];
  
  promises[promises.length] = ShipPlace.findAll({
    attributes: ['id', 'name']
  });

  promises[promises.length] = Category.findAll({
    attributes: ['id', 'name']
  });

  Promise.all(promises).then(results => {
    res.json({
      shipPlaces: _.map(results[0], s => _.pick(s, ['id', 'name'])),
      categories: _.map(results[1], s => _.pick(s, ['id', 'name']))
    });

    return null;
  });
};
