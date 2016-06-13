'use strict';

var _ = require('lodash');
var ShipPlace = require('../models').ShipPlace;

// TODO: cache this request
exports.getShipPlaces = (req, res) => {
  ShipPlace.findAll().then(shipPlaces => {
    let shipPlace = _.map(shipPlaces, function(sp) {
      return {
        id: sp.id,
        name: sp.name
      };
    });
    res.json({
      shipPlaces: shipPlace
    });
  });
};