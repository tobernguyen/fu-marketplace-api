/**
 * Created by sonht on 13/07/2016.
 */
'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');

var _ = require('lodash');

describe('GET /api/v1/shops/:shopId/reviews', () => {
  let shop, reviews, userToken;

  before(done => {
    helper.factory.createShop().then(s => {
      shop = s;
      return helper.factory.createReviews(22, s.id);
    }).then(r => {
      reviews = _.sortBy(r, function(o) { return o.updatedAt; });
      return helper.factory.createUser();
    }).then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with valid shop route', () => {
    describe('with pagination', () => {
      it('should return 200 with reviews which is corresponding with pagination', done => {
        request(app)
          .get(`/api/v1/shops/${shop.id}/reviews?size=2&page=1`)
          .set('X-Access-Token', userToken)
          .expect(res => {
            let rvs = res.body.reviews;
            expect(rvs).to.have.lengthOf(2);
            expect(rvs[0].id).to.equal(reviews[21].id);
            expect(rvs[1].id).to.equal(reviews[20].id);
            expect(rvs[0].user.id).to.equals(reviews[21].userId);
            expect(rvs[0].rate).to.equal(reviews[21].rate);
            expect(rvs[0].comment).to.equal(reviews[21].comment);
          })
          .expect(200, done);
      });
    });

    describe('without pagination', () => {
      it('should return 200 with number of reviews equals default value', done => {
        request(app)
          .get(`/api/v1/shops/${shop.id}/reviews`)
          .set('X-Access-Token', userToken)
          .expect(res => {
            let rvs = res.body.reviews;
            expect(rvs).to.have.lengthOf(10);
            expect(rvs[0].id).to.equal(reviews[21].id);
            expect(rvs[1].id).to.equal(reviews[20].id);
          })
          .expect(200, done);
      });
    });
  });

  describe('with invalid shop route', () => {
    it('should return 200 with empty reviews', done => {
      request(app)
        .get('/api/v1/shops/0/reviews')
        .set('X-Access-Token', userToken)
        .expect(res => {
          let rvs = res.body.reviews;
          expect(rvs).to.have.lengthOf(0);
        })
        .expect(200, done);
    });
  });
});