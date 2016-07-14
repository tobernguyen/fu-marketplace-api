'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const app = require('../../app.js');
const ShopPromotionCampaign = require('../../models').ShopPromotionCampaign;
const moment = require('moment');

describe('POST /api/v1/admin/shopPromotionCampaigns', () => {
  let  adminToken, shop;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);

      return helper.factory.createShop();
    }).then(s => {
      shop = s;
      done();
    });
  });

  describe('with valid campaign data', () => {
    let startDate = moment().subtract(1, 'day').toDate(),
      endDate = new Date();

    it('should return 200 and create new campaign', done => {
      request(app)
        .post('/api/v1/admin/shopPromotionCampaigns')
        .set('X-Access-Token', adminToken)
        .send({
          shopId: shop.id,
          type: ShopPromotionCampaign.TYPE.TOP_FEED_SLIDE_SHOW,
          startDate: startDate,
          endDate: endDate,
          active: true
        })
        .then(res => {
          let body = res.body;
          expect(body.shopId).to.equal(shop.id);
          expect(body.type).to.equal(ShopPromotionCampaign.TYPE.TOP_FEED_SLIDE_SHOW);
          expect(new Date(body.startDate).getTime()).to.equal(startDate.getTime());
          expect(new Date(body.endDate).getTime()).to.equal(endDate.getTime());
          expect(body.active).to.equal(true);
          done();
        }).catch(done);
    });
  });
});

describe('GET /api/v1/admin/shopPromotionCampaigns', () => {
  let  adminToken;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with valid access token', () => {
    let shopPromotionCampaign;

    before(done => {
      helper.factory.createShopPromotionCampaign().then(spc => {
        shopPromotionCampaign = spc;
        done();
      });
    });

    it('should return 200 OK with all campaigns', done => {
      request(app)
        .get('/api/v1/admin/shopPromotionCampaigns')
        .set('X-Access-Token', adminToken)
        .expect(200)
        .then(res => {
          let body = res.body;
          let firstSpc = body.shopPromotionCampaigns[0];

          expect(firstSpc.name).to.equal(shopPromotionCampaign.name);
          expect(firstSpc.shopId).to.equal(shopPromotionCampaign.shopId);
          expect(firstSpc.type).to.equal(shopPromotionCampaign.type);
          expect(firstSpc.active).to.equal(shopPromotionCampaign.active);
          expect(new Date(firstSpc.startDate).getTime()).to.equal(shopPromotionCampaign.startDate.getTime());
          expect(new Date(firstSpc.endDate).getTime()).to.equal(shopPromotionCampaign.endDate.getTime());

          return shopPromotionCampaign.getShop().then(shop => {
            expect(firstSpc.shop.name).to.equal(shop.name);
            done();
          });
        }).catch(done);
    });
    
    it.skip('should support pagination', done => {
      
    });
  });
});

describe('PUT /api/v1/admin/shopPromotionCampaigns/:id', () => {
  let  adminToken, shopPromotionCampaign;
  let newStartDate = moment().add(3, 'days').toDate();
  let newEndDate = moment().add(5, 'days').toDate();

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      
      helper.factory.createShopPromotionCampaign().then(spc => {
        shopPromotionCampaign = spc;
        done();
      });
    });
  });

  describe('with valid campaign data', () => {
    it('should return 200 and update the campaign', done => {
      request(app)
        .put(`/api/v1/admin/shopPromotionCampaigns/${shopPromotionCampaign.id}`)
        .set('X-Access-Token', adminToken)
        .send({
          active: false,
          startDate: newStartDate,
          endDate: newEndDate
        })
        .expect(200)
        .then(res => {
          let body = res.body;

          expect(body.active).to.equal(false);
          expect(new Date(body.startDate).getTime()).to.equal(newStartDate.getTime());
          expect(new Date(body.endDate).getTime()).to.equal(newEndDate.getTime());

          return shopPromotionCampaign.getShop().then(shop => {
            expect(body.shop.name).to.equal(shop.name);
            done();
          });
        }).catch(done);
    });
  });
});
