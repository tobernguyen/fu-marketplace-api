'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const Category = require('../../models').Category;
var _ = require('lodash');


describe('GET /api/v1/categories', () => {
  let  categories, userToken;
  
  before(done => {
    helper.factory.createUser().then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      return Category.findAll();
    }).then(cs => {
      categories = cs;
      done();
    });
  });
  
  describe('with exits shop', () => {
    it('should return 200 OK and return an array contain all categories', done => {
      request(app)
        .get('/api/v1/categories')
        .set('X-Access-Token', userToken)
        .expect(res => {
          let cs = res.body.categories;
          _.forEach(categories, function(category) {
            expect(cs.filter(function(e) {
              return e.name == category.name && e.id == category.id;
            }).length).to.equal(1);
          });
          expect(res.body.categories.length).to.equal(categories.length);
        })
        .expect(200, done);  
    });
  });
});