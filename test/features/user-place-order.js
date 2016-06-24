'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const Order = require('../../models').Order;

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
          expect(res.body.message_code).to.equal('error.model.shop_does_not_exits');
        })
        .expect(404, done);
    });
  });
});

describe('PUT /api/v1/shops/:shopId/orders/:orderId', () => {
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

  describe('with valid shop route', () => {
    describe('with new order', () => {
      describe('with valid order attribute and valid accesToken', () => {
        it('should return 200 with orderInfo', done => {
          request(app)
            .put(`/api/v1/shops/${order.shopId}/orders/${order.id}`)
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
        it('should return 404 order is not exits', done => {
          request(app)
            .put(`/api/v1/shops/${order.shopId}/orders/${order.id}`)
            .set('X-Access-Token', userToken2)
            .set('Content-Type', 'application/json')
            .send({
              note: 'ship truoc 12h',
              shipAddress: 'D201'
            })
            .expect(res => {
              expect(res.body.status).to.equal(404);
              expect(res.body.message_code).to.equal('error.model.order_does_not_exits');
            })
            .expect(404, done);
        });
      });

      describe('with invalid order attribute', () => {
        it('should return 404 invalid attribute', done => {
          request(app)
            .put(`/api/v1/shops/${order.shopId}/orders/${order.id}`)
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

      it('should return 200 with orderInfo', done => {
        request(app)
          .put(`/api/v1/shops/${acceptedOrder.shopId}/orders/${acceptedOrder.id}`)
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
 
  describe('with invalid shop route', () => {
    it('should return 200 with orderInfo', done => {
      request(app)
        .put(`/api/v1/shops/0/orders/${order.id}`)
        .set('X-Access-Token', userToken1)
        .set('Content-Type', 'application/json')
        .send({
          note: 'ship truoc 12h',
          shipAddress: 'D201'
        })
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.model.order_does_not_exits');
        })
        .expect(404, done);
    });
  });
});