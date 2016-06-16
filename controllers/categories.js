'use strict';

var _ = require('lodash');
var Category = require('../models').Category;

// TODO: cache this request
exports.getCategories = (req, res) => {
  Category.findAll().then(cs => {
    let categories = _.map(cs, function(sp) {
      return {
        id: sp.id,
        name: sp.name,
        description: sp.description
      };
    });
    res.json({
      categories: categories
    });
  });
};