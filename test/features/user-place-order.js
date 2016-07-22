'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const app = require('../../app.js');
const Order = require('../../models').Order;
const Shop = require('../../models').Shop;
const Ticket = require('../../models').Ticket;
const UserNotification = require('../../models').UserNotification;

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
    beforeEach(() => {
      helper.queue.testMode.clear();
    });

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
            expect(orderLines[0].quantity).to.equal(2);
            expect(orderLines[0].note).to.equal('không hành nhiều dứa');
            let item = orderLines[0].item;
            expect(item.id).to.equal(item1.id);
            expect(item.name).to.equal(item1.name);
            expect(item.description).to.equal(item1.description);
            expect(item.price).to.equal(item1.price);
            expect(item.categoryId).to.equal(item1.categoryId);

            // Expect the system to create the job to create notification
            let jobs = helper.queue.testMode.jobs;
            expect(jobs).to.have.lengthOf(1);
            expect(jobs[0].type).to.equal('send order notification to seller');
            expect(jobs[0].data).to.eql({orderId: body.id, notificationType: UserNotification.NOTIFICATION_TYPE.USER_PLACE_ORDER});
          })
          .expect(200, done);
      });
    });

    describe('with not exist item id and valid accesToken', () => {
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

    describe('with sellerToken', () => {

      let sellerToken;

      beforeEach(done => {
        Shop.findById(item1.shopId).then(s => {
          sellerToken = helper.createAccessTokenForUserId(s.ownerId);
          done();
        });
      });

      it('should return 403', done => {
        request(app)
          .post(`/api/v1/shops/${item1.shopId}/orders`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            items: [
              {
                id: item1.id,
                note: 'không hành nhiều dứa'
              }
            ],
            note: 'ship truoc 12h',
            shipAddress: 'D201'
          })
          .expect(res => {
            expect(res.body.status).to.equal(403);
            expect(res.body.message_code).to.equal('error.order.you_cannot_order_on_your_own_shop');
          })
          .expect(403, done);
      });
    });

    describe('with invalid order attribute', () => {
      it('should return 422', done => {
        request(app)
          .post(`/api/v1/shops/${item1.shopId}/orders`)
          .set('X-Access-Token', userToken)
          .set('Content-Type', 'application/json')
          .send({
            items: [
              {
                id: item1.id,
                quantity: 2,
                note: 'Raigor Stonehoof the Earthshaker is a melee strength hero with several area of effect disables, commonly played as a ganker or initiator. Unlike most strength heroes, he is played more like an intelligence caster hero and is almost entirely reliant on his spells to inflict heavy damage.'
              }
            ],
            note: 'ship truoc 12h',
            shipAddress: 'D201'
          })
          .expect(res => {
            expect(res.body.status).to.equal(422);
            let errors = res.body.errors;
            expect(_.toPairs(errors)).to.have.lengthOf(1);
            expect(errors['SequelizeModel:OrderLine.note'].message).to.equal('Validation len failed');
            expect(errors['SequelizeModel:OrderLine.note'].message_code).to.equal('error.model.validation_len_failed');
          })
          .expect(422, done);
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
    it('should return 404', done => {
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

    describe('with invalid note attribute', () => {
      it('should return 422 valid fail', done => {
        request(app)
          .put(`/api/v1/orders/${order.id}`)
          .set('X-Access-Token', userToken1)
          .set('Content-Type', 'application/json')
          .send({
            note: 'The barn owl (Tyto alba) is the most widely distributed species of owl, and one of the most widespread of all birds. It is found in most parts of the world, with one major lineage in the New World, one in Australasia, and another in Eurasia and Africa. The 28 subspecies, between 33 and 39 cm (13 and 15 in) in length',
            shipAddress: 'D201'
          })
          .expect(res => {
            expect(res.body.status).to.equal(422);
            let errors = res.body.errors;
            expect(_.toPairs(errors)).to.have.lengthOf(1);
            expect(errors.note.message).to.equal('Validation len failed');
            expect(errors.note.message_code).to.equal('error.model.validation_len_failed');
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

describe('POST /api/v1/orders/:orderId/rate', () => {
  let userToken1, userToken2, user;

  before(done => {
    helper.factory.createUser().then(u => {
      user = u;
      userToken1 = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUser();
    }).then(u => {
      userToken2 = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with completed order', () => {
    let completedOrder;
    beforeEach(done => {
      helper.factory.createOrder({
        userId: user.id,
        status: Order.STATUS.COMPLETED
      }).then(o => {
        expect(o.status).to.equal(Order.STATUS.COMPLETED);
        completedOrder = o;
        done();
      });
    });

    describe('with valid rate attribute and valid accessToken', () => {
      it('should return 200 with canceled orderInfo', done => {
        request(app)
          .post(`/api/v1/orders/${completedOrder.id}/rate`)
          .set('X-Access-Token', userToken1)
          .set('Content-Type', 'application/json')
          .send({
            rate: 5
          })
          .expect(res => {
            let body = res.body;
            expect(body.status).to.equal(Order.STATUS.COMPLETED);
            expect(body.id).to.equal(completedOrder.id);
            expect(body.rate).to.equal(5);
            expect(body.comment).not.to.be.ok;
          })
          .expect(200, done);
      });
    });

    describe('with valid rate attribute and valid accessToken', () => {
      it('should return 200 with canceled orderInfo', done => {
        request(app)
            .post(`/api/v1/orders/${completedOrder.id}/rate`)
            .set('X-Access-Token', userToken1)
            .set('Content-Type', 'application/json')
            .send({
              rate: 5,
              comment: 'Good'
            })
            .expect(res => {
              let body = res.body;
              expect(body.status).to.equal(Order.STATUS.COMPLETED);
              expect(body.id).to.equal(completedOrder.id);
              expect(body.comment).to.equal('Good');
            })
            .expect(200, done);
      });
    });

    describe('with invalid accessToken', () => {
      it('should return 404 order is not exits', done => {
        request(app)
          .post(`/api/v1/orders/${completedOrder.id}/rate`)
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
        userId: user.id,
        status: Order.STATUS.SHIPPING
      }).then(o => {
        expect(o.status).to.equal(Order.STATUS.SHIPPING);
        shippingOrder = o;
        done();
      });
    });

    it('should return 403', done => {
      request(app)
        .post(`/api/v1/orders/${shippingOrder.id}/rate`)
        .set('X-Access-Token', userToken1)
        .set('Content-Type', 'application/json')
        .send({
          rate: 2
        })
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.order.can_only_rate_completed_or_aborted_order');
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
        .expect(200)
        .then(res => {
          let bodyOrders = res.body.orders;
          expect(bodyOrders).to.have.lengthOf(2);
          let sortedBody = _.sortBy(bodyOrders, ['id']);
          let sortedOrders = _.sortBy(orders, ['id']);

          _([0, 1]).forEach(function(value) {
            expect(sortedBody[value].id).to.equal(sortedOrders[value].id);
            expect(sortedBody[value].note).to.equal(sortedOrders[value].note);
            expect(sortedBody[value].shipAddress).to.equal(sortedOrders[value].shipAddress);
          });

          return sortedOrders[0].getOrderLines().then(ols => {
            expect(sortedBody[0].orderLines[0].note).to.equal(ols[0].note);
            expect(sortedBody[0].orderLines[0].quantity).to.equal(ols[0].quantity);
            expect(sortedBody[0].orderLines[0].item).to.eql(ols[0].item);

            return sortedOrders[0].getShop();
          }).then(shop => {
            expect(sortedBody[0].shopName).to.equal(shop.name);
            done();
          }).catch(done);
        });
    });
  });

  describe('with valid accesToken and get new order', () => {
    it('should return 200 with 1 new orderInfo', done => {
      request(app)
        .get('/api/v1/orders/?status=NEW')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          let bodyOrders = res.body.orders;
          let order = _.filter(orders, function(o) { return o.status === Order.STATUS.NEW; })[0];
          expect(bodyOrders).to.have.lengthOf(1);
          expect(bodyOrders[0].id).to.equal(order.id);
          expect(bodyOrders[0].note).to.equal(order.note);
          expect(bodyOrders[0].shipAddress).to.equal(order.shipAddress);
        })
        .expect(200, done);
    });
  });

  describe('with valid accesToken and active order', () => {
    it('should return 200 with 1 active orderInfo', done => {
      request(app)
        .get('/api/v1/orders/?type=ACTIVE')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          let bodyOrders = res.body.orders;
          let order = _.filter(orders, function(o) {
            return _.indexOf([Order.STATUS.NEW, Order.STATUS.ACCEPTED, Order.STATUS.SHIPPING], o.status) !== -1;
          })[0];

          expect(bodyOrders).to.have.lengthOf(1);
          expect(bodyOrders[0].id).to.equal(order.id);
          expect(bodyOrders[0].note).to.equal(order.note);
          expect(bodyOrders[0].shipAddress).to.equal(order.shipAddress);
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

describe('POST /api/v1/orders/:orderId/openTicket', () => {
  let order, userToken;

  before(done => {
    helper.factory.createUser().then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createOrder({ userId: u.id});
    }).then(o => {
      order = o;
      done();
    });
  });

  describe('with empty userNote', () => {
    it('should return 422', done => {
      request(app)
        .post(`/api/v1/orders/${order.id}/openTicket`)
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .send({
          userNote: ''
        })
        .expect(res => {
          expect(res.body.status).to.equal(422);
          expect(res.body.errors.userNote.message).to.equal('Validation len failed');
        })
        .expect(422, done);
    });
  });

  describe('with not empty userNote', () => {
    it('should return 200', done => {
      request(app)
        .post(`/api/v1/orders/${order.id}/openTicket`)
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .send({
          userNote: 'da accept 2 tieng nhung khong ship'
        })
        .expect(res => {
          let ticket = res.body;
          expect(ticket.orderId).to.equal(order.id);
          expect(ticket.status).to.equal(Ticket.STATUS.OPENING);
        })
        .expect(200, done);
    });
  });
});
