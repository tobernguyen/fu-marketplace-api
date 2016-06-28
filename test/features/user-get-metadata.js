'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const Category = require('../../models').Category;
const ShipPlace = require('../../models').ShipPlace;
const _ = require('lodash');

describe('GET /api/v1/metadata', () => {
  let accessToken, categories, shipPlaces;
  
  before(done => {
    helper.factory.createUser().then(u => {
      accessToken = helper.createAccessTokenForUserId(u.id);
      return Category.findAll({});
    }).then(c => {
      categories = c;
      return ShipPlace.findAll({});
    }).then(sp => {
      shipPlaces = sp;
      done();
    });
  });
  
  describe('with valid access token', () => {
    it('should return 200 OK with metadata info', done => {
      request(app)
        .get('/api/v1/metadata')
        .set('X-Access-Token', accessToken)
        .expect(res => {
          let body = res.body;
          expect(body.categories).to.be.an('array');
          expect(body.categories).to.have.lengthOf(categories.length);
          body.categories.forEach(cat => {
            let expectedCategory = _.find(categories, c => c.id === cat.id);
            expect(expectedCategory).to.be.ok;
            expect(cat.name).to.equal(expectedCategory.name);
          });

          expect(body.shipPlaces).to.be.an('array');
          expect(body.shipPlaces).to.have.lengthOf(shipPlaces.length);
          body.shipPlaces.forEach(sp => {
            let expectedShipPlace = _.find(shipPlaces, s => s.id === sp.id);
            expect(expectedShipPlace).to.be.ok;
            expect(sp.name).to.equal(expectedShipPlace.name);
          });
        })
        .expect(200, done);  
    });
  });
});
