'use strict';

var _ = require('lodash');
var ShipPlace = require('../models').ShipPlace;
var Category = require('../models').Category;
var cacheManager = require('../libs/cache-manager');

exports.getMetadata = (req, res) => {
  return cacheManager.get(cacheManager.CACHE_KEYS.CONTROLLER_GET_METADATA)
    .then((value) => {
      if (!value) {
        let newValue;
        getMetadata().then(value => {
          newValue = value;
          cacheManager.set(
            cacheManager.CACHE_KEYS.CONTROLLER_GET_METADATA,
            newValue
          );
        }).then(() => res.json(newValue));
      } else {
        res.json(value);
      }

      return null;
    });
};

var getMetadata = () => {
  let promises = [];

  promises[promises.length] = ShipPlace.findAll({
    attributes: ['id', 'name']
  });

  promises[promises.length] = Category.findAll({
    attributes: ['id', 'name']
  });

  return Promise.all(promises).then(results => {
    return Promise.resolve({
      shipPlaces: _.map(results[0], s => _.pick(s, ['id', 'name'])),
      categories: _.map(results[1], s => _.pick(s, ['id', 'name']))
    });
  });
};
