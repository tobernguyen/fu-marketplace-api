'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const app = require('../../app.js');
const _ = require('lodash');

describe('GET /api/v1/shopPromotions/topFeedSlideShow', () => {
  let userToken, shopPromotions, shops;

  before(done => {
    helper.dbUtils.truncateTable('Shops').then(() => {
      return helper.factory.createUser({});
    }).then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);

      let promises = [];

      _.times(3, i => {
        promises[promises.length] = helper.factory.createShopPromotionCampaign({});
      });

      return Promise.all(promises);
    }).then(spcs => {
      shopPromotions = spcs;

      let promises = _.map(shopPromotions, spc => spc.getShop());

      return Promise.all(promises);
    }).then(ss => {
      shops = ss;
      done();
    });
  });

  it('should return all shops have valid top-feed-slide-show campaign', done => {
    request(app)
      .get('/api/v1/shopPromotions/topFeedSlideShow')
      .set('X-Access-Token', userToken)
      .expect(200)
      .then(res => {
        let actualShops = res.body.shops;

        expect(actualShops).to.be.an('array');
        expect(actualShops).to.have.lengthOf(3);
        expect(_.map(actualShops, s => s.name)).to.have.members(_.map(shops, s => s.name));
        
        done();
      }).catch(done);
  });
});
