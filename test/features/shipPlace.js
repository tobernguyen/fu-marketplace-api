'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const ShipPlace = require('../../models').ShipPlace;
var _ = require('lodash');


describe('GET /api/v1/shipPlaces', () => {
  let  shipPlaces, userToken;
  
  before(done => {
    helper.factory.createUser().then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      return ShipPlace.findAll();
    }).then(sp => {
      shipPlaces = sp;
      done();
    });
  });
  
  describe('with exits shop', () => {
    it('should return 200 OK and return new user profile', done => {
      request(app)
        .get('/api/v1/shipPlaces')
        .set('X-Access-Token', userToken)
        .expect(res => {
          let sp = res.body.shipPlaces;

          _.forEach(sp, function(place) {
            expect(res.body.shipPlaces.filter(function(e) {
              return e.name == place.name && e.id == place.id;
            }).length).to.equal(1);
          });
          expect(res.body.shipPlaces.length).to.equal(shipPlaces.length);
        })
        .expect(200, done);  
    });
  });
});