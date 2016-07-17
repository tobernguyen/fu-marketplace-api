'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const Order = require('../../models').Order;
const app = require('../../app.js');
var _ = require('lodash');

describe('GET /api/v1/seller/shops/:id/salesStatistic', () => {
  let  sellerToken, seller, shop, order;

  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      seller = u;
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShop({ownerId: seller.id});
    }).then(s => {
      shop = s;
      return helper.factory.createOrder({shopId: shop.id, status: Order.STATUS.COMPLETED});
    }).then(o => {
      order = o;
      done();
    });
  });

  describe('with seller access token', () => {
    it('should return 200 and return sales statistic', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop.id}/salesStatistic`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(200)
        .then(res => {
          let salesStatistic = res.body.salesStatistic;
          expect(salesStatistic).to.be.ok;
          expect(salesStatistic.data).to.be.an('array');
          expect(salesStatistic.data).to.have.lengthOf(1);

          let firstStat = salesStatistic.data[0];
          expect(firstStat.year).to.equal(order.createdAt.getFullYear());
          expect(firstStat.month).to.equal(order.createdAt.getMonth() + 1);
          expect(firstStat.day).to.equal(order.createdAt.getDate());

          order.getOrderLines().then(orderLines => {
            let expectedTotalSales = _.reduce(orderLines, (sum, ol) => sum + ol.item.price * ol.quantity, 0);
            expect(firstStat.totalSales).to.equal(expectedTotalSales);

            done();
          });
        }).catch(done);
    });
  });
});

describe('GET /api/v1/seller/shops/:id/ordersStatistic', () => {
  let  sellerToken, seller, shop, completedOrder, incompleteOrder;

  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      seller = u;
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShop({ownerId: seller.id});
    }).then(s => {
      shop = s;
      return helper.factory.createOrder({shopId: shop.id, status: Order.STATUS.COMPLETED});
    }).then(o => {
      completedOrder = o;
      return helper.factory.createOrder({shopId: shop.id, status: Order.STATUS.NEW});
    }).then(o => {
      incompleteOrder = o;
      done();
    });
  });

  describe('with seller access token', () => {
    it('should return 200 and return sales statistic', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop.id}/ordersStatistic`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(200)
        .then(res => {
          let ordersStatistic = res.body.ordersStatistic;
          expect(ordersStatistic).to.be.ok;
          expect(ordersStatistic.data).to.be.an('array');
          expect(ordersStatistic.data).to.have.lengthOf(1);

          let firstStat = ordersStatistic.data[0];
          expect(firstStat.year).to.equal(completedOrder.createdAt.getFullYear());
          expect(firstStat.month).to.equal(completedOrder.createdAt.getMonth() + 1);
          expect(firstStat.day).to.equal(completedOrder.createdAt.getDate());
          expect(firstStat.completedOrders).to.equal(1);
          expect(firstStat.incompleteOrders).to.equal(1);

          done();
        }).catch(done);
    });
  });
});
