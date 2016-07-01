'use strict';

const helper = require('../helper');
const Item = require('../../models').Item;
const Order = require('../../models').Order;
const UserNotification = require('../../models').UserNotification;
const sinon = require('sinon');

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
        expect(createdOrder.shipAddress).to.equal(orderFromDb.shipAddress);
        expect(createdOrder.userId).to.equal(user.id);
        done();
      }, done);
    });
  });

  describe('#accept', () => {
    describe('with new order', () => {
      let order, item;

      describe('with item has quantity', () => {
        beforeEach(done => {
          helper.factory.createItem({
            quantity: 100
          }).then(i => {
            item = i;
            return helper.factory.createOrder({ items: [item]});
          }).then(o => {
            order = o;
            done();
          });
        });

        it('should be ok', done => {
          order.accept().then(o => {
            expect(o).to.be.ok;
            return Order.findById(o.id);
          }).then(orderFromDb => {
            expect(orderFromDb.note).to.equal(order.note);
            expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
            expect(orderFromDb.id).to.equal(order.id);
            expect(orderFromDb.status).to.equal(Order.STATUS.ACCEPTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.quantity).to.equal(99);
            done();
          }, done);
        });

        it('should call UserNotification.createNotificationForUser with valid params', done => {
          let userNotificationSpy = sinon.spy(UserNotification, 'createNotificationForUser');

          order.accept().then(() => {
            expect(userNotificationSpy.withArgs(order.id, Order.STATUS.ACCEPTED).calledOnce).to.be.true;
            UserNotification.createNotificationForUser.restore();
            done();
          });
        });
      });

      describe('with item has no quantity', () => {
        beforeEach(done => {
          helper.factory.createItem().then(i => {
            item = i;
            return helper.factory.createOrder({ items: [item]});
          }).then(o => {
            order = o;
            done();
          });
        });

        it('should be ok', done => {
          order.accept().then(o => {
            expect(o).to.be.ok;
            return Order.findById(o.id);
          }).then(orderFromDb => {
            expect(orderFromDb.note).to.equal(order.note);
            expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
            expect(orderFromDb.id).to.equal(order.id);
            expect(orderFromDb.status).to.equal(Order.STATUS.ACCEPTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.quantity).not.to.be.ok;
            done();
          }, done);
        });
      });
    });

    describe('with accepted order', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder({ status: Order.STATUS.ACCEPTED}).then(o => {
          order = o;
          done();
        });
      });

      it('should be return error', done => {
        order.accept().catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only new order can be accepted');
          expect(error.type).to.equal('order');
          return Order.findById(order.id);
        }).then(orderFromDb => {
          expect(orderFromDb.note).to.equal(order.note);
          expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
          expect(orderFromDb.id).to.equal(order.id);
          expect(orderFromDb.status).to.equal(Order.STATUS.ACCEPTED);
          done();
        }, done);
      });
    });
  });

  describe('#reject', () => {
    let options = {
      sellerMessage: 'toi khong thay ai o phong'
    };
    describe('with out sellerMesage attribute', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder().then(o => {
          order = o;
          done();
        });
      });

      it('should return error', done => {
        order.reject({}).catch(err => {
          expect(err.status).to.equal(404);
          expect(err.message).to.equal('Must provide seller message when reject');
          expect(err.type).to.equal('order');
          done();
        }, done);
      });
    });

    describe('with new order', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder().then(o => {
          order = o;
          done();
        });
      });

      it('should be ok', done => {
        order.reject(options).then(o => {
          expect(o).to.be.ok;
          return Order.findById(o.id);
        }).then(orderFromDb => {
          expect(orderFromDb.note).to.equal(order.note);
          expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
          expect(orderFromDb.id).to.equal(order.id);
          expect(orderFromDb.sellerMessage).to.equal(order.sellerMessage);
          expect(orderFromDb.status).to.equal(Order.STATUS.REJECTED);
          done();
        }, done);
      });

      it('should call UserNotification.createNotificationForUser with valid params', done => {
        let userNotificationSpy = sinon.spy(UserNotification, 'createNotificationForUser');

        order.reject(options).then(() => {
          expect(userNotificationSpy.withArgs(order.id, Order.STATUS.REJECTED).calledOnce).to.be.true;
          UserNotification.createNotificationForUser.restore();
          done();
        });
      });
    });

    describe('with accepted order', () => {
      let order, item;

      describe('with item has quantity', () => {
        beforeEach(done => {
          helper.factory.createItem({
            quantity: 100
          }).then(i => {
            item = i;
            return helper.factory.createOrder({ 
              items: [item],
              status: Order.STATUS.ACCEPTED
            });
          }).then(o => {
            order = o;
            done();
          });
        });

        it('should be ok', done => {
          order.reject(options).then(o => {
            expect(o).to.be.ok;
            return Order.findById(o.id);
          }).then(orderFromDb => {
            expect(orderFromDb.note).to.equal(order.note);
            expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
            expect(orderFromDb.id).to.equal(order.id);
            expect(orderFromDb.status).to.equal(Order.STATUS.REJECTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.quantity).to.equal(101);
            done();
          }, done);
        });
      });

      describe('with item has no quantity', () => {
        beforeEach(done => {
          helper.factory.createItem().then(i => {
            item = i;
            return helper.factory.createOrder({ 
              items: [item],
              status: Order.STATUS.ACCEPTED
            });
          }).then(o => {
            order = o;
            done();
          });
        });

        it('should be ok', done => {
          order.reject(options).then(o => {
            expect(o).to.be.ok;
            return Order.findById(o.id);
          }).then(orderFromDb => {
            expect(orderFromDb.note).to.equal(order.note);
            expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
            expect(orderFromDb.id).to.equal(order.id);
            expect(orderFromDb.status).to.equal(Order.STATUS.REJECTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.quantity).not.to.be.ok;
            done();
          }, done);
        });
      });
    });

    describe('with completed order', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder({ status: Order.STATUS.COMPLETED}).then(o => {
          order = o;
          done();
        });
      });

      it('should be return error', done => {
        order.reject(options).catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only new or accepted order can be rejected');
          expect(error.type).to.equal('order');
          return Order.findById(order.id);
        }).then(orderFromDb => {
          expect(orderFromDb.note).to.equal(order.note);
          expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
          expect(orderFromDb.id).to.equal(order.id);
          expect(orderFromDb.status).to.equal(Order.STATUS.COMPLETED);
          done();
        }, done);
      });
    });
  });

  describe('#cancel', () => {
    describe('with new order', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder().then(o => {
          order = o;
          done();
        });
      });

      it('should be ok', done => {
        order.cancel().then(o => {
          expect(o).to.be.ok;
          return Order.findById(o.id);
        }).then(orderFromDb => {
          expect(orderFromDb.note).to.equal(order.note);
          expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
          expect(orderFromDb.id).to.equal(order.id);
          expect(orderFromDb.status).to.equal(Order.STATUS.CANCELED);
          done();
        }, done);
      });

      it('should call UserNotification.createNotificationForSeller with valid params', done => {
        let userNotificationSpy = sinon.spy(UserNotification, 'createNotificationForSeller');

        order.cancel().then(() => {
          expect(userNotificationSpy.withArgs(order.id, UserNotification.NOTIFICATION_TYPE.USER_CANCEL_ORDER).calledOnce).to.be.true;
          UserNotification.createNotificationForSeller.restore();
          done();
        });
      });
    });

    describe('with accepted order', () => {
      let order, item;

      describe('with item has quantity', () => {
        beforeEach(done => {
          helper.factory.createItem({
            quantity: 100
          }).then(i => {
            item = i;
            return helper.factory.createOrder({ 
              items: [item],
              status: Order.STATUS.ACCEPTED
            });
          }).then(o => {
            order = o;
            done();
          });
        });

        it('should be ok', done => {
          order.cancel().then(o => {
            expect(o).to.be.ok;
            return Order.findById(o.id);
          }).then(orderFromDb => {
            expect(orderFromDb.note).to.equal(order.note);
            expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
            expect(orderFromDb.id).to.equal(order.id);
            expect(orderFromDb.status).to.equal(Order.STATUS.CANCELED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.quantity).to.equal(101);
            done();
          }, done);
        });
      });

      describe('with item has no quantity', () => {
        beforeEach(done => {
          helper.factory.createItem().then(i => {
            item = i;
            return helper.factory.createOrder({ 
              items: [item],
              status: Order.STATUS.ACCEPTED
            });
          }).then(o => {
            order = o;
            done();
          });
        });

        it('should be ok', done => {
          order.cancel().then(o => {
            expect(o).to.be.ok;
            return Order.findById(o.id);
          }).then(orderFromDb => {
            expect(orderFromDb.note).to.equal(order.note);
            expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
            expect(orderFromDb.id).to.equal(order.id);
            expect(orderFromDb.status).to.equal(Order.STATUS.CANCELED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.quantity).not.to.be.ok;
            done();
          }, done);
        });
      });
    });

    describe('with completed order', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder({ status: Order.STATUS.COMPLETED}).then(o => {
          order = o;
          done();
        });
      });

      it('should be return error', done => {
        order.cancel().catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only new or accepted order can be cancelled');
          expect(error.type).to.equal('order');
          return Order.findById(order.id);
        }).then(orderFromDb => {
          expect(orderFromDb.note).to.equal(order.note);
          expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
          expect(orderFromDb.id).to.equal(order.id);
          expect(orderFromDb.status).to.equal(Order.STATUS.COMPLETED);
          done();
        }, done);
      });
    });
  });

  describe('#startShipping', () => {
    describe('with accepted order', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder({ status: Order.STATUS.ACCEPTED}).then(o => {
          order = o;
          done();
        });
      });

      it('should be ok', done => {
        order.startShipping().then(o => {
          expect(o).to.be.ok;
          return Order.findById(o.id);
        }).then(orderFromDb => {
          expect(orderFromDb.note).to.equal(order.note);
          expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
          expect(orderFromDb.id).to.equal(order.id);
          expect(orderFromDb.status).to.equal(Order.STATUS.SHIPPING);
          done();
        }, done);
      });

      it('should call UserNotification.createNotificationForUser with valid params', done => {
        let userNotificationSpy = sinon.spy(UserNotification, 'createNotificationForUser');

        order.startShipping().then(() => {
          expect(userNotificationSpy.withArgs(order.id, Order.STATUS.SHIPPING).calledOnce).to.be.true;
          UserNotification.createNotificationForUser.restore();
          done();
        });
      });
    });

    describe('with completed order', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder({ status: Order.STATUS.COMPLETED}).then(o => {
          order = o;
          done();
        });
      });

      it('should be return error', done => {
        order.startShipping().catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only accepted order has able to be start shipping');
          expect(error.type).to.equal('order');
          return Order.findById(order.id);
        }).then(orderFromDb => {
          expect(orderFromDb.note).to.equal(order.note);
          expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
          expect(orderFromDb.id).to.equal(order.id);
          expect(orderFromDb.status).to.equal(Order.STATUS.COMPLETED);
          done();
        }, done);
      });
    });
  });

  describe('#complete', () => {
    describe('with shipping order', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder({ status: Order.STATUS.SHIPPING}).then(o => {
          order = o;
          done();
        });
      });

      it('should be ok', done => {
        order.complete().then(o => {
          expect(o).to.be.ok;
          return Order.findById(o.id);
        }).then(orderFromDb => {
          expect(orderFromDb.note).to.equal(order.note);
          expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
          expect(orderFromDb.id).to.equal(order.id);
          expect(orderFromDb.status).to.equal(Order.STATUS.COMPLETED);
          done();
        }, done);
      });

      it('should call UserNotification.createNotificationForUser with valid params', done => {
        let userNotificationSpy = sinon.spy(UserNotification, 'createNotificationForUser');

        order.complete().then(() => {
          expect(userNotificationSpy.withArgs(order.id, Order.STATUS.COMPLETED).calledOnce).to.be.true;
          UserNotification.createNotificationForUser.restore();
          done();
        });
      });
    });

    describe('with complete order', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder({ status: Order.STATUS.COMPLETED}).then(o => {
          order = o;
          done();
        });
      });

      it('should be return error', done => {
        order.complete().catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only shipping order has able to be completed');
          expect(error.type).to.equal('order');
          return Order.findById(order.id);
        }).then(orderFromDb => {
          expect(orderFromDb.note).to.equal(order.note);
          expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
          expect(orderFromDb.id).to.equal(order.id);
          expect(orderFromDb.status).to.equal(Order.STATUS.COMPLETED);
          done();
        }, done);
      });
    });
  });

  describe('#abort', () => {
    let options = {
      sellerMessage: 'toi het hang roi'
    };
    describe('with out sellerMesage attribute', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder().then(o => {
          order = o;
          done();
        });
      });

      it('should return error', done => {
        order.abort({}).catch(err => {
          expect(err.status).to.equal(404);
          expect(err.message).to.equal('Must provide seller message when abort');
          expect(err.type).to.equal('order');
          done();
        }, done);
      });
    });

    describe('with shipping order', () => {
      let order, item;

      describe('with item has quantity', () => {
        beforeEach(done => {
          helper.factory.createItem({
            quantity: 100
          }).then(i => {
            item = i;
            return helper.factory.createOrder({ 
              items: [item],
              status: Order.STATUS.SHIPPING
            });
          }).then(o => {
            order = o;
            done();
          });
        });

        it('should be ok and quantity of item should be increase', done => {
          order.abort(options).then(o => {
            expect(o).to.be.ok;
            return Order.findById(o.id);
          }).then(orderFromDb => {
            expect(orderFromDb.note).to.equal(order.note);
            expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
            expect(orderFromDb.id).to.equal(order.id);
            expect(orderFromDb.status).to.equal(Order.STATUS.ABORTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.quantity).to.equal(101);
            done();
          }, done);
        });

        it('should call UserNotification.createNotificationForUser with valid params', done => {
          let userNotificationSpy = sinon.spy(UserNotification, 'createNotificationForUser');

          order.abort(options).then(() => {
            expect(userNotificationSpy.withArgs(order.id, Order.STATUS.ABORTED).calledOnce).to.be.true;
            UserNotification.createNotificationForUser.restore();
            done();
          });
        });
      });

      describe('with item has no quantity', () => {
        beforeEach(done => {
          helper.factory.createItem().then(i => {
            item = i;
            return helper.factory.createOrder({ 
              items: [item],
              status: Order.STATUS.SHIPPING
            });
          }).then(o => {
            order = o;
            done();
          });
        });

        it('should be ok and quantity of item should not be update', done => {
          order.abort(options).then(o => {
            expect(o).to.be.ok;
            return Order.findById(o.id);
          }).then(orderFromDb => {
            expect(orderFromDb.note).to.equal(order.note);
            expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
            expect(orderFromDb.id).to.equal(order.id);
            expect(orderFromDb.status).to.equal(Order.STATUS.ABORTED);
            return Item.findById(item.id);
          }).then(i => {
            expect(i.quantity).not.to.be.ok;
            done();
          }, done);
        });
      });
    });

    describe('with complete order', () => {
      let order;

      beforeEach(done => {
        helper.factory.createOrder({ status: Order.STATUS.COMPLETED}).then(o => {
          order = o;
          done();
        });
      });

      it('should be return error', done => {
        order.abort(options).catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only shipping order has able to be aborted');
          expect(error.type).to.equal('order');
          return Order.findById(order.id);
        }).then(orderFromDb => {
          expect(orderFromDb.note).to.equal(order.note);
          expect(orderFromDb.shipAddress).to.equal(order.shipAddress);
          expect(orderFromDb.id).to.equal(order.id);
          expect(orderFromDb.status).to.equal(Order.STATUS.COMPLETED);
          done();
        }, done);
      });
    });
  });
});
