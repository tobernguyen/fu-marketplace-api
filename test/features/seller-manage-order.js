'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const app = require('../../app.js');
const Order = require('../../models').Order;
const Item = require('../../models').Item;

var _ = require('lodash');

describe('GET /api/v1/seller/shops/:shopId/orders/', () => {
  let sellerToken, orders, shopId;

  before(done => {
    helper.factory.createShop().then(s => {
      shopId = s.id;
      sellerToken = helper.createAccessTokenForUserId(s.ownerId);

      let promises = [];

      promises[promises.length] = helper.factory.createOrder({ shopId: s.id});
      promises[promises.length] = helper.factory.createOrder({ shopId: s.id, status: Order.STATUS.SHIPPING});
      promises[promises.length] = helper.factory.createOrder({ shopId: s.id, status: Order.STATUS.CANCELED});
      return Promise.all(promises);
    }).then(o => {
      orders = o;
      done();
    });
  });

  describe('with valid accesToken and get all order', () => {
    it('should return 200 with all orderInfo', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shopId}/orders/`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          let bodyOrder = res.body.orders;
          expect(bodyOrder).to.have.lengthOf(3);
          let sortedBodyOrders = _.sortBy(bodyOrder, ['id']);
          let sortedOrder = _.sortBy(orders, ['id']);
          
          _([0, 1, 2]).forEach(function(value) {
            expect(sortedBodyOrders[value].id).to.equal(sortedOrder[value].id);
            expect(sortedBodyOrders[value].note).to.equal(sortedOrder[value].note);
            expect(sortedBodyOrders[value].shipAddress).to.equal(sortedOrder[value].shipAddress);

            orders[value].getOrderLines(ols => {
              expect(sortedBodyOrders[value].orderLines[0].note).to.equal(ols[0].note);
              expect(sortedBodyOrders[value].orderLines[0].quantity).to.equal(ols[0].quantity);
              expect(sortedBodyOrders[value].orderLines[0].item).to.equal(ols[0].item);
            });
          });
        })
        .expect(200, done);
    });
  });

  describe('with valid accesToken and get cancel order', () => {
    it('should return 200 with 1 cancel orderInfo', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shopId}/orders/?status=CANCELED`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          let bodyOrder = res.body.orders;
          let order = _.filter(orders, function(o) { return o.status === Order.STATUS.CANCELED; })[0];

          expect(bodyOrder).to.have.lengthOf(1);
          expect(bodyOrder[0].id).to.equal(order.id);
          expect(bodyOrder[0].note).to.equal(order.note);
          expect(bodyOrder[0].shipAddress).to.equal(order.shipAddress);

          order.getOrderLines(ols => {
            expect(bodyOrder[0].orderLines[0].note).to.equal(ols[0].note);
            expect(bodyOrder[0].orderLines[0].quantity).to.equal(ols[0].quantity);
            expect(bodyOrder[0].orderLines[0].item).to.equal(ols[0].item);
          });
        })
        .expect(200, done);
    });
  });

  describe('with valid accesToken and get rejected order', () => {
    it('should return 200 with empty array', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shopId}/orders/?status=REJECTED`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          let bodyOrder = res.body.orders;
          expect(bodyOrder).to.have.lengthOf(0);
        })
        .expect(200, done);
    });
  });
});

describe('POST /api/v1/seller/orders/:id/accept', () => {
  let sellerToken, invalidToken, order, item, shop;

  before(done => {
    helper.factory.createShop().then(s => {
      shop = s;
      sellerToken = helper.createAccessTokenForUserId(s.ownerId);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      invalidToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  beforeEach(done => {
    helper.factory.createItem({shopId: shop.id}).then(i => {
      item = i;
      expect(item.quantity).not.to.be.ok;
      return helper.factory.createOrder({ shopId: shop.id, items: [item]});
    }).then(o => {
      order = o;
      expect(o.status).to.equal(Order.STATUS.NEW);
      done();
    });
  });

  describe('with valid accesToken and new order with item has quantity is 100', () => {
    beforeEach(done => {
      item.update({
        quantity: 100
      }).then(i => {
        expect(i.quantity).to.equal(100);
        expect(i.id).to.equal(item.id);
        done();
      });
    });

    it('should return 200 with all orderInfo and quantity of item is 99', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/accept`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(200)
        .then(res => {
          let body = res.body;
          expect(body.id).to.equal(order.id);
          expect(body.status).to.equal(Order.STATUS.ACCEPTED);
          return Item.findById(item.id);
        }).then(i => {
          expect(i.name).to.equal(item.name);
          expect(i.quantity).to.equal(99);
          done();
        }).catch(done);
    });
  });

  describe('with valid accesToken and new order with item has quantity is 0', () => {
    beforeEach(done => {
      item.update({
        quantity: 0
      }).then(i => {
        expect(i.quantity).to.equal(0);
        expect(i.id).to.equal(item.id);
        done();
      });
    });

    it('should return 200 with all orderInfo and quantity of item is -1', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/accept`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(200)
        .then(res => {
          let body = res.body;
          expect(body.id).to.equal(order.id);
          expect(body.status).to.equal(Order.STATUS.ACCEPTED);
          return Item.findById(item.id);
        }).then(i => {
          expect(i.name).to.equal(item.name);
          expect(i.quantity).to.equal(-1);
          done();
        }).catch(done);
    });
  });

  describe('with valid accesToken and new order with item has no quantity', () => {

    it('should return 200 with all orderInfo', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/accept`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(200)
        .then(res => {
          let body = res.body;
          expect(body.id).to.equal(order.id);
          expect(body.status).to.equal(Order.STATUS.ACCEPTED);
          return Item.findById(item.id);
        }).then(i => {
          expect(i.name).to.equal(item.name);
          expect(i.quantity).not.to.be.ok;
          done();
        }).catch(done);
    });
  });
  

  describe('with invalid accessToken', () => {
    it('should return 404 order is not exits', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/accept`)
        .set('X-Access-Token', invalidToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.model.order_does_not_exits');
        })
        .expect(404, done);
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
        .post(`/api/v1/seller/orders/${shippingOrder.id}/accept`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.order.only_new_order_can_be_accepted');
        })
        .expect(403, done);
    });
  });
});

describe('POST /api/v1/seller/orders/:id/reject', () => {
  let sellerToken, invalidToken, order, item, shop;

  before(done => {
    helper.factory.createShop().then(s => {
      shop = s;
      sellerToken = helper.createAccessTokenForUserId(s.ownerId);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      invalidToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  beforeEach(done => {
    helper.factory.createItem({shopId: shop.id}).then(i => {
      item = i;
      expect(item.quantity).not.to.be.ok;
      return helper.factory.createOrder({ shopId: shop.id, items: [item]});
    }).then(o => {
      order = o;
      expect(o.status).to.equal(Order.STATUS.NEW);
      done();
    });
  });

  describe('with valid accessToken and without sellerMessage', () => {
    beforeEach(done => {
      item.update({
        quantity: 100
      }).then(i => {
        expect(i.quantity).to.equal(100);
        expect(i.id).to.equal(item.id);
        done();
      });
    });

    it('should return 404 with all orderInfo and quantity of item is 100', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/reject`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(404)
        .then(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.order.must_provide_seller_message_when_reject');
          done();
        }).catch(done);
    });
  });


  describe('with new order', () => {
    describe('with valid accessToken and item has quantity is 100', () => {
      beforeEach(done => {
        item.update({
          quantity: 100
        }).then(i => {
          expect(i.quantity).to.equal(100);
          expect(i.id).to.equal(item.id);
          done();
        });
      });

      it('should return 200 with all orderInfo and quantity of item is 100', done => {
        request(app)
          .post(`/api/v1/seller/orders/${order.id}/reject`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            sellerMessage: 'minh het hang roi ban a'
          })
          .expect(200)
          .then(res => {
            let body = res.body;
            expect(body.id).to.equal(order.id);
            expect(body.status).to.equal(Order.STATUS.REJECTED);
            expect(body.sellerMessage).to.equal('minh het hang roi ban a');
            return Item.findById(item.id);
          }).then(i => {
            expect(i.name).to.equal(item.name);
            expect(i.quantity).to.equal(100);
            done();
          }).catch(done);
      });
    });

    describe('with valid accessToken and item has quantity is 0', () => {
      beforeEach(done => {
        item.update({
          quantity: 0
        }).then(i => {
          expect(i.quantity).to.equal(0);
          expect(i.id).to.equal(item.id);
          done();
        });
      });

      it('should return 200 with all orderInfo and quantity of item is 0', done => {
        request(app)
          .post(`/api/v1/seller/orders/${order.id}/reject`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            sellerMessage: 'minh het hang roi ban a'
          })
          .expect(200)
          .then(res => {
            let body = res.body;
            expect(body.id).to.equal(order.id);
            expect(body.status).to.equal(Order.STATUS.REJECTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.name).to.equal(item.name);
            expect(i.quantity).to.equal(0);
            done();
          }).catch(done);
      });
    });

    describe('with valid accesToken and item has no quantity', () => {

      it('should return 200 with all orderInfo', done => {
        request(app)
          .post(`/api/v1/seller/orders/${order.id}/reject`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            sellerMessage: 'minh het hang roi ban a'
          })
          .expect(200)
          .then(res => {
            let body = res.body;
            expect(body.id).to.equal(order.id);
            expect(body.status).to.equal(Order.STATUS.REJECTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.name).to.equal(item.name);
            expect(i.quantity).not.to.be.ok;
            done();
          }).catch(done);
      });
    });
  });

  describe('with accepted order', () => {
    beforeEach(done => {
      order.update({
        status: Order.STATUS.ACCEPTED
      }).then(o => {
        expect(o.status).to.equal(Order.STATUS.ACCEPTED);
        expect(o.id).to.equal(order.id);
        done();
      });
    });

    describe('with valid accesToken and item has quantity is 100', () => {
      beforeEach(done => {
        item.update({
          quantity: 100
        }).then(i => {
          expect(i.quantity).to.equal(100);
          expect(i.id).to.equal(item.id);
          done();
        });
      });

      it('should return 200 with all orderInfo and quantity of item is 101', done => {
        request(app)
          .post(`/api/v1/seller/orders/${order.id}/reject`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            sellerMessage: 'minh het hang roi ban a'
          })
          .expect(200)
          .then(res => {
            let body = res.body;
            expect(body.id).to.equal(order.id);
            expect(body.status).to.equal(Order.STATUS.REJECTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.name).to.equal(item.name);
            expect(i.quantity).to.equal(101);
            done();
          }).catch(done);
      });
    });

    describe('with valid accesToken and item has quantity is -1', () => {
      beforeEach(done => {
        item.update({
          quantity: -1
        }).then(i => {
          expect(i.quantity).to.equal(-1);
          expect(i.id).to.equal(item.id);
          done();
        });
      });

      it('should return 200 with all orderInfo and quantity of item is 0', done => {
        request(app)
          .post(`/api/v1/seller/orders/${order.id}/reject`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            sellerMessage: 'minh het hang roi ban a'
          })
          .expect(200)
          .then(res => {
            let body = res.body;
            expect(body.id).to.equal(order.id);
            expect(body.status).to.equal(Order.STATUS.REJECTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.name).to.equal(item.name);
            expect(i.quantity).to.equal(0);
            done();
          }).catch(done);
      });
    });

    describe('with valid accesToken and item has no quantity', () => {

      it('should return 200 with all orderInfo', done => {
        request(app)
          .post(`/api/v1/seller/orders/${order.id}/reject`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            sellerMessage: 'minh het hang roi ban a'
          })
          .expect(200)
          .then(res => {
            let body = res.body;
            expect(body.id).to.equal(order.id);
            expect(body.status).to.equal(Order.STATUS.REJECTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.name).to.equal(item.name);
            expect(i.quantity).not.to.be.ok;
            done();
          }).catch(done);
      });
    });
  });

  describe('with invalid accesToken', () => {
    it('should return 404 order is not exits', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/reject`)
        .set('X-Access-Token', invalidToken)
        .set('Content-Type', 'application/json')
        .send({
          sellerMessage: 'minh het hang roi ban a'
        })
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.model.order_does_not_exits');
        })
        .expect(404, done);
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
        .post(`/api/v1/seller/orders/${shippingOrder.id}/reject`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .send({
          sellerMessage: 'minh het hang roi ban a'
        })
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.order.only_new_or_accepted_order_can_be_rejected');
        })
        .expect(403, done);
    });
  });
});

describe('POST /api/v1/seller/orders/:id/ship', () => {
  let sellerToken, invalidToken, order;

  before(done => {
    helper.factory.createShop().then(s => {
      sellerToken = helper.createAccessTokenForUserId(s.ownerId);
      return helper.factory.createOrder({ shopId: s.id, status: Order.STATUS.ACCEPTED});
    }).then(o => {
      order = o;
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      invalidToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with valid accesToken and accepted order', () => {
    it('should return 200 with all orderInfo', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/ship`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          let body = res.body;
          expect(body.id).to.equal(order.id);
          expect(body.status).to.equal(Order.STATUS.SHIPPING);
        })
        .expect(200, done);
    });
  });

  describe('with invalid accesToken', () => {
    it('should return 404 order is not exits', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/ship`)
        .set('X-Access-Token', invalidToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.model.order_does_not_exits');
        })
        .expect(404, done);
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
        .post(`/api/v1/seller/orders/${shippingOrder.id}/ship`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.order.only_accepted_order_has_able_to_be_start_shipping');
        })
        .expect(403, done);
    });
  });
});

describe('POST /api/v1/seller/orders/:id/complete', () => {
  let sellerToken, invalidToken, order;

  before(done => {
    helper.factory.createShop().then(s => {
      sellerToken = helper.createAccessTokenForUserId(s.ownerId);
      return helper.factory.createOrder({ shopId: s.id, status: Order.STATUS.SHIPPING});
    }).then(o => {
      order = o;
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      invalidToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with valid accesToken and shipping order', () => {
    it('should return 200 with all orderInfo', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/complete`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          let body = res.body;
          expect(body.id).to.equal(order.id);
          expect(body.status).to.equal(Order.STATUS.COMPLETED);
        })
        .expect(200, done);
    });
  });

  describe('with invalid accesToken', () => {
    it('should return 404 order is not exits', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/complete`)
        .set('X-Access-Token', invalidToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.model.order_does_not_exits');
        })
        .expect(404, done);
    });
  });

  describe('with rejected order', () => {
    let shippingOrder;
    beforeEach(done => {
      helper.factory.createOrder({
        shopId: order.shopId,
        userId: order.userId,
        status: Order.STATUS.REJECTED
      }).then(o => {
        expect(o.status).to.equal(Order.STATUS.REJECTED);
        shippingOrder = o;
        done();
      });
      
    });

    it('should return 403', done => {
      request(app)
        .post(`/api/v1/seller/orders/${shippingOrder.id}/complete`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.order.only_shipping_order_has_able_to_be_completed');
        })
        .expect(403, done);
    });
  });
});

describe('POST /api/v1/seller/orders/:id/abort', () => {
  let sellerToken, invalidToken, order, item, shop;

  before(done => {
    helper.factory.createShop().then(s => {
      shop = s;
      sellerToken = helper.createAccessTokenForUserId(s.ownerId);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      invalidToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with valid accessToken and without sellerMessage', () => {
    beforeEach(done => {
      helper.factory.createItem({shopId: shop.id}).then(i => {
        item = i;
        expect(item.quantity).not.to.be.ok;
        return helper.factory.createOrder({
          shopId: shop.id,
          items: [item],
          status: Order.STATUS.SHIPPING}
        );
      }).then(o => {
        order = o;
        expect(o.status).to.equal(Order.STATUS.SHIPPING);
        done();
      });
    });

    it('should return 404', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/abort`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .expect(404)
        .then(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.order.must_provide_seller_message_when_abort');
          done();
        }).catch(done);
    });
  });

  describe('with shipping order', () => {
    beforeEach(done => {
      helper.factory.createItem({shopId: shop.id}).then(i => {
        item = i;
        expect(item.quantity).not.to.be.ok;
        return helper.factory.createOrder({ 
          shopId: shop.id, 
          items: [item],
          status: Order.STATUS.SHIPPING
        });
      }).then(o => {
        order = o;
        expect(o.status).to.equal(Order.STATUS.SHIPPING);
        done();
      });
    });

    describe('with valid accesToken and item has quantity is 100', () => {
      beforeEach(done => {
        item.update({
          quantity: 100
        }).then(i => {
          expect(i.quantity).to.equal(100);
          expect(i.id).to.equal(item.id);
          done();
        });
      });

      it('should return 200 with all orderInfo and quantity of item is 100', done => {
        request(app)
          .post(`/api/v1/seller/orders/${order.id}/abort`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            sellerMessage: 'minh khong thay ai o phong'
          })
          .expect(200)
          .then(res => {
            let body = res.body;
            expect(body.id).to.equal(order.id);
            expect(body.status).to.equal(Order.STATUS.ABORTED);
            expect(body.sellerMessage).to.equal('minh khong thay ai o phong');
            return Item.findById(item.id);
          }).then(i => {
            expect(i.name).to.equal(item.name);
            expect(i.quantity).to.equal(101);
            done();
          }).catch(done);
      });
    });

    describe('with valid accesToken and item has quantity is 0', () => {
      beforeEach(done => {
        item.update({
          quantity: 0
        }).then(i => {
          expect(i.quantity).to.equal(0);
          expect(i.id).to.equal(item.id);
          done();
        });
      });

      it('should return 200 with all orderInfo and quantity of item is 0', done => {
        request(app)
          .post(`/api/v1/seller/orders/${order.id}/abort`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .expect(200)
          .send({
            sellerMessage: 'minh khong thay ai o phong'
          })
          .then(res => {
            let body = res.body;
            expect(body.id).to.equal(order.id);
            expect(body.status).to.equal(Order.STATUS.ABORTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.name).to.equal(item.name);
            expect(i.quantity).to.equal(1);
            done();
          }).catch(done);
      });
    });

    describe('with valid accesToken and item has no quantity', () => {
      it('should return 200 with all orderInfo', done => {
        request(app)
          .post(`/api/v1/seller/orders/${order.id}/abort`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            sellerMessage: 'minh khong thay ai o phong'
          })
          .expect(200)
          .then(res => {
            let body = res.body;
            expect(body.id).to.equal(order.id);
            expect(body.status).to.equal(Order.STATUS.ABORTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.name).to.equal(item.name);
            expect(i.quantity).not.to.be.ok;
            done();
          }).catch(done);
      });
    });
  });

  describe('with invalid accesToken', () => {
    it('should return 404 order is not exits', done => {
      request(app)
        .post(`/api/v1/seller/orders/${order.id}/abort`)
        .set('X-Access-Token', invalidToken)
        .set('Content-Type', 'application/json')
        .send({
          sellerMessage: 'minh khong thay ai o phong'
        })
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.model.order_does_not_exits');
        })
        .expect(404, done);
    });
  });

  describe('with new order', () => {
    let newOrder;
    beforeEach(done => {
      helper.factory.createOrder({
        shopId: order.shopId,
        userId: order.userId
      }).then(o => {
        expect(o.status).to.equal(Order.STATUS.NEW);
        newOrder = o;
        done();
      });
    });

    it('should return 403', done => {
      request(app)
        .post(`/api/v1/seller/orders/${newOrder.id}/abort`)
        .set('X-Access-Token', sellerToken)
        .set('Content-Type', 'application/json')
        .send({
          sellerMessage: 'minh khong thay ai o phong'
        })
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.order.only_shipping_order_has_able_to_be_aborted');
        })
        .expect(403, done);
    });
  });
});