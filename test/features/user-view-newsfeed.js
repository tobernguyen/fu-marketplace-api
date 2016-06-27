'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const app = require('../../app.js');
const Shop = require('../../models').Shop;
const Item = require('../../models').Item;
const ShipPlace = require('../../models').ShipPlace;
var _ = require('lodash');
var elasticsearchHelper = require('../utils/elasticsearch-helper');

describe('POST /api/v1/feed/shops', () => {
  let userToken, shops = [];

  before(function(done) {
    this.timeout(5000);

    // This test case is sensitive to number of shops
    // so we have to clear all shops first
    helper.dbUtils.truncateTable('Shops').then(() => {
      return elasticsearchHelper.resetDb();
    }).then(u => {
      return helper.factory.createUser({});
    }).then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      
      let promises = [];
      promises[promises.length] = helper.factory.createShop({
        name: 'Alo mình nghe',
        description: 'Hôm nay mình có bán xúc xích luộc, trứng luộc, nước chanh, mong các bạn ủng hộ.',
        opening: true,
        status: Shop.STATUS.PUBLISHED
      });
      promises[promises.length] = helper.factory.createShop({
        name: 'ORIOLE SHOP',
        description: 'HOA QUẢ - NƯỚC NGỌT - BIA - ĐỒ ĂN VẶT - MÌ TÔM',
        opening: false,
        status: Shop.STATUS.PUBLISHED
      });
      promises[promises.length] = helper.factory.createShop({
        name: 'Bá Long Shop',
        description: 'BIG SIZE✦BÁNH MỲ PATE TRỨNG ✦ BÁNH MỲ PATE CHẢ RUỐC ✦ 15K✦TRÀ SỮA SOCOLA ✦ [HẾT TRÀ SỮA THÁI XANH',
        opening: true,
        status: Shop.STATUS.PUBLISHED
      });
      promises[promises.length] = helper.factory.createShop({
        name: 'Vũ Đức Hiếu',
        description: 'BÚN NGAN BÁNH BAO LẠC LUỘC NƯỚC CHANH NƯỚC NGỌT THUỐC LÁ',
        opening: true,
        status: Shop.STATUS.UNPUBLISHED
      });
      promises[promises.length] = helper.factory.createShop({
        name: 'LK Game Store',
        description: 'Hiện mình nhận cung cấp bản quyền game giá rẻ trên steam, giá giao động từ 10->18k/$ tùy từng game. Và qua đêm nay là đến summer sales, đây là cơ hội tốt để mọi người có thể mua game bản quyền với những cái giá không thể rẻ hơn.',
        opening: true,
        status: Shop.STATUS.PUBLISHED
      });

      return Promise.all(promises);
    }).then(result => {
      shops = result;

      let promises = [];
      // Add ship places shops
      ['Dom A', 'Dom B'].forEach(shipPlaceName => promises[promises.length] = helper.factory.addShipPlaceToShop(shops[0], shipPlaceName));
      ['Dom B', 'Dom C'].forEach(shipPlaceName => promises[promises.length] = helper.factory.addShipPlaceToShop(shops[1], shipPlaceName));
      ['Dom B', 'Dom D'].forEach(shipPlaceName => promises[promises.length] = helper.factory.addShipPlaceToShop(shops[2], shipPlaceName));
      ['Dom D'].forEach(shipPlaceName => promises[promises.length] = helper.factory.addShipPlaceToShop(shops[3], shipPlaceName));
      ['Dom E', 'Dom F', 'Dom B'].forEach(shipPlaceName => promises[promises.length] = helper.factory.addShipPlaceToShop(shops[4], shipPlaceName));

      return Promise.all(promises);
    }).then(() => {
      // Add random items to shops
      let promises = [];
      _.range(5).forEach(i => {
        _.range(_.random(1, 5)).forEach(() => {
          promises[promises.length] = helper.factory.createItem({
            shopId: shops[i].id,
            categoryId: _.random(1, 6), // Random category
            status: Item.STATUS.FOR_SELL
          });
        });
      });

      promises[promises.length] = helper.factory.createItem({
        shopId: shops[0].id, // Shop "Alo mình nghe"
        categoryId: 1,
        name: 'cơm rang dưa bò',
        description: 'Món cơm rang này của bọn mình có dưa xào với bò, ăn rất ngon, bổ rẻ, thịt tươi.',
        status: Item.STATUS.FOR_SELL
      });

      return Promise.all(promises);
    }).then(() => {
      return elasticsearchHelper.refreshIndexNow();
    }).then(() => {
      done();
    }).catch(done);
  });

  describe('without any params', () => {
    it('should return all publised shops and from opening shops to closing shops', done => {
      let lastShopData;

      request(app)
        .post('/api/v1/feed/shops')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .expect(200)
        .then(res => {
          let result = res.body.result;
          expect(result.total).to.equal(4);
          expect(result.shops).to.be.an('Array');
          expect(result.shops).to.have.lengthOf(4); // Because we have one UNPUBLISHED shop and 4 PUBLISHED shops

          let itemImages = result.shops[0].itemImages;
          expect(itemImages).to.be.an('Array');

          let expectedLastShop = shops[1]; // This shop is the only closed shop
          lastShopData = result.shops[3];
          expect(lastShopData.name).to.equal(expectedLastShop.name); // We expect closed shop is on the bottom of the list

          return expectedLastShop.getUser();
        }).then(seller => {
          expect(lastShopData.seller.id).to.equal(seller.id);
          expect(lastShopData.seller.name).to.equal(seller.name);
          done();
        });
    });
  });

  describe('with keyword', () => {
    it('should return shops that relevant to that keyword', done => {
      request(app)
        .post('/api/v1/feed/shops')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .send({
          keyword: 'bản quyền game'
        })
        .expect(res => {
          let result = res.body.result;
          let firstShop = result.shops[0];
          expect(firstShop.id).to.equal(shops[4].id);
          expect(firstShop.name).to.equal(shops[4].name);
          expect(firstShop.description).to.equal(shops[4].description);
        })
        .expect(200, done);
    });
  });

  describe('with page key', () => {
    it('should return next page of result', done => {
      request(app)
        .post('/api/v1/feed/shops')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .send({
          size: 2
        })
        .expect(200)
        .then(res => {
          let result = res.body.result;
          expect(result.shops).to.have.lengthOf(2);
          
          return request(app)
            .post('/api/v1/feed/shops')
            .set('X-Access-Token', userToken)
            .set('Content-Type', 'application/json')
            .send({
              size: 2,
              page: 2
            })
            .expect(200);
        }).then(res => {
          let result = res.body.result;
          expect(result.shops).to.have.lengthOf(2);
          done();
        });
    });
  });

  describe('with categoryIds and/or shipPlaceId', () => {
    it('should return shops that filtered by categoryId and shipPlaceId', done => {
      ShipPlace.findOne({
        where: {
          name: 'Dom A'
        }
      }).then(sp => {
        return request(app)
          .post('/api/v1/feed/shops')
          .set('X-Access-Token', userToken)
          .set('Content-Type', 'application/json')
          .expect(200)
          .send({
            shipPlaceId: sp.id
          });
      }).then(res => {
        let result = res.body.result;
        let firstShop = result.shops[0];
        expect(firstShop.id).to.equal(shops[0].id);
        
        return request(app)
          .post('/api/v1/feed/shops')
          .set('X-Access-Token', userToken)
          .set('Content-Type', 'application/json')
          .expect(200)
          .send({
            categoryIds: [1]
          });
      }).then(res => {
        let result = res.body.result;
        result.shops.forEach(s => {
          expect(s.categoryIds).to.include(1);
        });
        done();
      });
    });
  });
});
