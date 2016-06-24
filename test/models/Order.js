'use strict';

const helper = require('../helper');
const Order = require('../../models').Order;

describe('Order models', () => {
  describe('factory', () => {
    it('should be valid', done => {
      let createdOrder, user; 
      helper.factory.createUser().then(u => {
        user = u;
        return helper.factory.createOrder({userId: u.id});
      }).then(o => {
        createdOrder = o;
        expect(o).to.be.ok;
        return Order.findById(o.id);
      }).then(orderFromDb => {
        expect(createdOrder.note).to.equal(orderFromDb.note);
        expect(createdOrder.shopAddress).to.equal(orderFromDb.shopAddress);
        expect(createdOrder.userId).to.equal(user.id);
        done();
      }, done);
    });
  });
});
