'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const Order = require('../../models').Order;
const UserNotification = require('../../models').UserNotification;
const sinon = require('sinon');

var _ = require('lodash');

describe('POST /api/v1/shops/:shopId/orders', () => {
  let user, item1, item2, userToken;

  before(done => {
    helper.factory.createItem().then(i => {
      item1 = i;
      return helper.factory.createItem({ shopId: i.shopId});
    }).then(i => {
      item2 = i;
      return helper.factory.createUser();
    }).then(u => {
      user = u;
      userToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with valid shop route', () => {
    describe('with valid order attribute and valid accesToken', () => {
      let userNotificationSpy;

      beforeEach(() => {
        userNotificationSpy = sinon.spy(UserNotification, 'createNotificationForSeller');
      });

      afterEach(() => {
        UserNotification.createNotificationForSeller.restore();
      });

      it('should return 200 with orderInfo', done => {
        request(app)
          .post(`/api/v1/shops/${item1.shopId}/orders`)
          .set('X-Access-Token', userToken)
          .set('Content-Type', 'application/json')
          .send({
            items: [
              {
                id: item1.id,
                quantity: 2,
                note: 'không hành nhiều dứa'
              }, 
              {
                id: item2.id,
                quantity: 3,
                note: 'không hành'
              }
            ],
            note: 'ship truoc 12h',
            shipAddress: 'D201'
          })
          .expect(res => {
            let body = res.body;
            expect(body.note).to.equal('ship truoc 12h');
            expect(body.shipAddress).to.equal('D201');
            expect(body.shopId).to.equal(item1.shopId);
            expect(body.userId).to.equal(user.id);
            expect(body.status).to.equal(Order.STATUS.NEW);
            expect(body.orderLines).to.have.lengthOf(2);
            let orderLines = body.orderLines;
            expect(orderLines[1].quantity).to.equal(2);
            expect(orderLines[1].note).to.equal('không hành nhiều dứa');
            let item = orderLines[1].item;
            expect(item.id).to.equal(item1.id);
            expect(item.name).to.equal(item1.name);
            expect(item.description).to.equal(item1.description);
            expect(item.price).to.equal(item1.price);
            expect(userNotificationSpy.withArgs(body.id, UserNotification.NOTIFICATION_TYPE.USER_PLACE_ORDER).calledOnce).to.be.true;
          })
          .expect(200, done);
      });
    });

    describe('with invalid order attribute and valid accesToken', () => {
      it('should return 403', done => {
        request(app)
          .post(`/api/v1/shops/${item1.shopId}/orders`)
          .set('X-Access-Token', userToken)
          .set('Content-Type', 'application/json')
          .send({
            items: [
              {
                id: 0,
                quantity: 2,
                note: 'không hành nhiều dứa'
              }
            ],
            note: 'ship truoc 12h',
            shipAddress: 'D201'
          })
          .expect(res => {
            expect(res.body.status).to.equal(403);
            expect(res.body.message_code).to.equal('error.order.item_not_found');
          })
          .expect(403, done);
      });
    });

    describe('with quantity = 0 attribute and valid accesToken', () => {
      it('should return 200 and quantity autochange to 1', done => {
        request(app)
          .post(`/api/v1/shops/${item1.shopId}/orders`)
          .set('X-Access-Token', userToken)
          .set('Content-Type', 'application/json')
          .send({
            items: [
              {
                id: item1.id,
                quantity: 0,
                note: 'không hành nhiều dứa'
              }
            ],
            note: 'ship truoc 12h',
            shipAddress: 'D201'
          })
          .expect(res => {
            let orderLines = res.body.orderLines;
            expect(orderLines).to.have.lengthOf(1);
            expect(orderLines[0].quantity).to.equal(1);
          })
          .expect(200, done);
      });
    });
  });

  
  describe('with invalid shop route', () => {
    it('should return 200 with orderInfo', done => {
      request(app)
        .post('/api/v1/shops/0/orders')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .send({
          items: [
            {
              id: item1.id,
              quantity: 2,
              note: 'không hành nhiều dứa'
            }, 
            {
              id: item2.id,
              quantity: 3,
              note: 'không hành'
            }
          ],
          note: 'ship truoc 12h',
          shipAddress: 'D201'
        })
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.model.shop_does_not_exist');
        })
        .expect(404, done);
    });
  });
});

describe('PUT /api/v1/orders/:orderId', () => {
  let order, userToken1, userToken2;

  before(done => {
    helper.factory.createUser().then(u => {
      userToken1 = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createOrder({ userId: u.id});
    }).then(o => {
      order = o;
      return helper.factory.createUser();
    }).then(u => {
      userToken2 = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with new order', () => {
    describe('with valid order attribute and valid accesToken', () => {
      it('should return 200 with orderInfo', done => {
        request(app)
          .put(`/api/v1/orders/${order.id}`)
          .set('X-Access-Token', userToken1)
          .set('Content-Type', 'application/json')
          .send({
            note: 'ship truoc 12h',
            shipAddress: 'D201'
          })
          .expect(res => {
            let body = res.body;
            expect(body.note).to.equal('ship truoc 12h');
            expect(body.shipAddress).to.equal('D201');
            expect(body.shopId).to.equal(order.shopId);
            expect(body.id).to.equal(order.id);
          })
          .expect(200, done);
      });
    });

    describe('with invalid accesToken', () => {
      it('should return 404 order is not exist', done => {
        request(app)
          .put(`/api/v1/orders/${order.id}`)
          .set('X-Access-Token', userToken2)
          .set('Content-Type', 'application/json')
          .send({
            note: 'ship truoc 12h',
            shipAddress: 'D201'
          })
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.message_code).to.equal('error.model.order_does_not_exist');
          })
          .expect(404, done);
      });
    });

    describe('with invalid order attribute', () => {
      it('should return 404 invalid attribute', done => {
        request(app)
          .put(`/api/v1/orders/${order.id}`)
          .set('X-Access-Token', userToken1)
          .set('Content-Type', 'application/json')
          .send({
            note: 'ship truoc 12h',
            shipAddress: ''
          })
          .expect(res => {
            expect(res.body.status).to.equal(422);
            let errors = res.body.errors;
            expect(_.toPairs(errors)).to.have.lengthOf(1);
            expect(errors.shipAddress.message).to.equal('Validation len failed');
            expect(errors.shipAddress.message_code).to.equal('error.model.validation_len_failed');
          })
          .expect(422, done);
      });
    });
  });
  
  describe('with not new order (status is not new)', () => {
    let acceptedOrder;
    beforeEach(done => {
      helper.factory.createOrder({
        shopId: order.shopId,
        userId: order.userId,
        status: Order.STATUS.ACCEPTED
      }).then(o => {
        expect(o.status).to.equal(Order.STATUS.ACCEPTED);
        acceptedOrder = o;
        done();
      });
      
    });

    it('should return 403', done => {
      request(app)
        .put(`/api/v1/orders/${acceptedOrder.id}`)
        .set('X-Access-Token', userToken1)
        .set('Content-Type', 'application/json')
        .send({
          note: 'ship truoc 12h',
          shipAddress: 'D201'
        })
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.order.cannot_update_accepted_order');
        })
        .expect(403, done);
    });
  });

});

describe('POST /api/v1/orders/:orderId/cancel', () => {
  let order, userToken1, userToken2;

  before(done => {
    helper.factory.createUser().then(u => {
      userToken1 = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createOrder({ userId: u.id});
    }).then(o => {
      order = o;
      return helper.factory.createUser();
    }).then(u => {
      userToken2 = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with new order', () => {
    describe('with valid order attribute and valid accesToken', () => {
      it('should return 200 with canceled orderInfo', done => {
        request(app)
          .post(`/api/v1/orders/${order.id}/cancel`)
          .set('X-Access-Token', userToken1)
          .set('Content-Type', 'application/json')
          .expect(res => {
            let body = res.body;
            expect(body.status).to.equal(Order.STATUS.CANCELED);
            expect(body.id).to.equal(order.id);
          })
          .expect(200, done);
      });
    });

    describe('with invalid accesToken', () => {
      it('should return 404 order is not exits', done => {
        request(app)
          .post(`/api/v1/orders/${order.id}/cancel`)
          .set('X-Access-Token', userToken2)
          .set('Content-Type', 'application/json')
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.message_code).to.equal('error.model.order_does_not_exits');
          })
          .expect(404, done);
      });
    });
  });
  
  describe('with shipping order', () => {
    let shippingOrder;
    beforeEach(done => {
      helper.factory.createOrder({
        shopId: order.shopId,
        userId: order.userId,
        status: Order.STATUS.SHIPPING
      }).then(o => {
        expect(o.status).to.equal(Order.STATUS.SHIPPING);
        shippingOrder = o;
        done();
      });
      
    });

    it('should return 403', done => {
      request(app)
        .post(`/api/v1/orders/${shippingOrder.id}/cancel`)
        .set('X-Access-Token', userToken1)
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.order.only_new_or_accepted_order_can_be_cancelled');
        })
        .expect(403, done);
    });
  });
});

describe('GET /api/v1/orders/', () => {
  let userToken, orders;

  before(done => {
    helper.factory.createUser().then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);

      let promises = [];

      promises[promises.length] = helper.factory.createOrder({ userId: u.id});
      promises[promises.length] = helper.factory.createOrder({ userId: u.id, status: Order.STATUS.CANCELED});
      return Promise.all(promises);
    }).then(o => {
      orders = o;
      done();
    });
  });

  describe('with valid accesToken and get all order', () => {
    it('should return 200 with all orderInfo', done => {
      request(app)
        .get('/api/v1/orders/')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          let bodyOrders = res.body.orders;
          expect(bodyOrders).to.have.lengthOf(2);
          let sortedBody = _.sortBy(bodyOrders, ['id']);
          let sortedOrders = _.sortBy(orders, ['id']);
          
          _([0, 1]).forEach(function(value) {
            expect(sortedBody[value].id).to.equal(sortedOrders[value].id);
            expect(sortedBody[value].note).to.equal(sortedOrders[value].note);
            expect(sortedBody[value].shipAddress).to.equal(sortedOrders[value].shipAddress);

            sortedOrders[value].getOrderLines(ols => {
              expect(sortedBody[value].orderLines[0].note).to.equal(ols[0].note);
              expect(sortedBody[value].orderLines[0].quantity).to.equal(ols[0].quantity);
              expect(sortedBody[value].orderLines[0].item).to.equal(ols[0].item);
            });
          });
        })
        .expect(200, done);
    });
  });

  describe('with valid accesToken and get cancel order', () => {
    it('should return 200 with 1 cancel orderInfo', done => {
      request(app)
        .get('/api/v1/orders/?status=CANCELED')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          let bodyOrders = res.body.orders;
          let order = _.filter(orders, function(o) { return o.status === Order.STATUS.CANCELED; })[0];

          expect(bodyOrders).to.have.lengthOf(1);
          expect(bodyOrders[0].id).to.equal(order.id);
          expect(bodyOrders[0].note).to.equal(order.note);
          expect(bodyOrders[0].shipAddress).to.equal(order.shipAddress);

          order.getOrderLines(ols => {
            expect(bodyOrders[0].orderLines[0].note).to.equal(ols[0].note);
            expect(bodyOrders[0].orderLines[0].quantity).to.equal(ols[0].quantity);
            expect(bodyOrders[0].orderLines[0].item).to.equal(ols[0].item);
          });
        })
        .expect(200, done);
    });
  });

  describe('with valid accesToken and get rejected order', () => {
    it('should return 200 with empty array', done => {
      request(app)
        .get('/api/v1/orders/?status=REJECTED')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          let bodyOrders = res.body.orders;
          expect(bodyOrders).to.have.lengthOf(0);
        })
        .expect(200, done);
    });
  });
});