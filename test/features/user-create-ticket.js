'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const app = require('../../app.js');
const Ticket = require('../../models').Ticket;
const Order = require('../../models').Order;
const Shop = require('../../models').Shop;

describe('POST /api/v1/orders/:orderId/openTicket', () => {
  let userToken, order;

  before(done => {
    helper.factory.createUser().then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createOrder({userId: u.id});
    }).then(o => {
      order = o;
      done();
    });
  });

  describe('with invalid order route', () => {
    it('should return 404 Order do not exist', done => {
      request(app)
        .post('/api/v1/orders/0/openTicket')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .send({
          userNote: 'bon nay lam an chan qua'
        })
        .expect(res => {
          let body = res.body;
          expect(body.status).to.equal(404);
          expect(body.message).to.equal('Order does not exits');
        })
        .expect(404, done);
    });
  });

  describe('with valid order route', () => {
    describe('with order do not have opening ticket', () => {
      it('should return 200 with new ticket', done => {
        request(app)
          .post(`/api/v1/orders/${order.id}/openTicket`)
          .set('X-Access-Token', userToken)
          .set('Content-Type', 'application/json')
          .send({
            userNote: 'bon nay lam an chan qua'
          })
          .expect(res => {
            let body = res.body;
            expect(body.orderId).to.equal(order.id);
            expect(body.userNote).to.equal('bon nay lam an chan qua');
          })
          .expect(200, done);
      });
    });

    describe('with order is already having opening ticket', () => {
      beforeEach(done => {
        helper.factory.createTicket({orderId: order.id}).then(() => {
          done();
        });
      });

      it('should return 200 ok', done => {
        request(app)
          .post(`/api/v1/orders/${order.id}/openTicket`)
          .set('X-Access-Token', userToken)
          .set('Content-Type', 'application/json')
          .send({
            userNote: 'bon nay lam an chan qua'
          })
          .expect(res => {
            let body = res.body;
            expect(body.orderId).to.equal(order.id);
            expect(body.userNote).to.equal('bon nay lam an chan qua');
          })
          .expect(200, done);
      });
    });
  });
});

describe('GET /api/v1/tickets/', () => {
  let ticket1, ticket3, userToken, user;

  before(done => {
    helper.factory.createUser().then(u => {
      user = u;
      userToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createTicket({userId: u.id});
    }).then(t => {
      ticket1 = t;
      return helper.factory.createTicket({status: Ticket.STATUS.CLOSED, userId: user.id});
    }).then(t => {
      return helper.factory.createTicket({status: Ticket.STATUS.INVESTIGATING, userId: user.id});
    }).then(t => {
      ticket3 = t;
      done();
    });
  });

  describe('with access token of user, who have ticket, ', () => {
    describe('without size/page and status filter', () => {
      it('should return 200 OK and return an array which contain ticket', done => {
        request(app)
            .get('/api/v1/tickets/')
            .set('X-Access-Token', userToken)
            .expect(200)
            .then(res => {
              expect(res.body.tickets).to.be.ok;
              let tickets = res.body.tickets;
              expect(tickets.length).to.equal(3);
              let ticket = tickets[0];
              expect(ticket.orderId).to.equal(ticket1.orderId);
              expect(ticket.id).to.equal(ticket1.id);

              Ticket.findOne({
                where: {id: ticket1.id},
                include: [{
                  model: Order,
                  where: { userId: user.id },
                  include: {
                    model: Shop,
                    attributes: ['id', 'name']
                  }
                }]
              }).then(expectedTicket => {
                expect(ticket.shop).to.eql(expectedTicket.Order.Shop.get());
                done();
              });
            }).catch(done);
      });
    });

    describe('without size/page and with status filter', () => {
      it('should return 200 OK and return an array which contain ticket', done => {
        request(app)
            .get('/api/v1/tickets/?status=OPENING')
            .set('X-Access-Token', userToken)
            .expect(res => {
              expect(res.body.tickets).to.be.ok;
              let tickets = res.body.tickets;
              expect(tickets.length).to.equal(1);
              let ticket = tickets[0];
              expect(ticket.orderId).to.equal(ticket1.orderId);
              expect(ticket.id).to.equal(ticket1.id);
            })
            .expect(200, done);
      });
    });

    describe('without status filter and with size/page', () => {
      it('should return 200 OK and return an array which contain ticket', done => {
        request(app)
            .get('/api/v1/tickets/?page=2&size=1')
            .set('X-Access-Token', userToken)
            .expect(res => {
              expect(res.body.tickets).to.be.ok;
              let tickets = res.body.tickets;
              expect(tickets.length).to.equal(1);
              let ticket = tickets[0];
              expect(ticket.orderId).to.equal(ticket3.orderId);
              expect(ticket.id).to.equal(ticket3.id);
            })
            .expect(200, done);
      });
    });

    describe('with status filter and size/page', () => {
      it('should return 200 OK and return an array which contain ticket', done => {
        request(app)
            .get('/api/v1/tickets/?page=3&size=1&status=OPENING')
            .set('X-Access-Token', userToken)
            .expect(res => {
              expect(res.body.tickets).to.be.ok;
              let tickets = res.body.tickets;
              expect(tickets.length).to.equal(0);
            })
            .expect(200, done);
      });
    });

    describe('with invalid status filter', () => {
      it('should return 400', done => {
        request(app)
            .get('/api/v1/tickets/?status=INVALID')
            .set('X-Access-Token', userToken)
            .expect(res => {
              expect(res.body.status).to.equal(400);
              expect(res.body.message).to.equal('Invalid status query');
            })
            .expect(400, done);
      });
    });
  });

  describe('with access token of user, who have ticket', () => {

    let anotherToken;

    before(done => {
      helper.factory.createUser().then(u => {
        anotherToken = helper.createAccessTokenForUserId(u.id);
        done();
      });
    });


    it('should return 200 OK and empty tickets', done => {
      request(app)
          .get('/api/v1/tickets/')
          .set('X-Access-Token', anotherToken)
          .expect(res => {
            expect(res.body.tickets).to.be.ok;
            let tickets = res.body.tickets;
            expect(tickets.length).to.equal(0);
          })
          .expect(200, done);
    });
  });
});

describe('PUT /api/v1/tickets/:ticketId', () => {
  let userToken, order, ticket;

  before(done => {
    helper.factory.createUser().then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createOrder({userId: u.id});
    }).then(o => {
      order = o;
      done();
    });
  });

  describe('with opening ticket', () => {
    beforeEach(done => {
      helper.factory.createTicket({orderId: order.id}).then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 200', done => {
      request(app)
        .put(`/api/v1/tickets/${ticket.id}`)
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .send({
          userNote: 'bon nay lam an chan qua'
        })
        .expect(res => {
          let body = res.body;
          expect(body.id).to.equal(ticket.id);
          expect(body.userNote).to.equal('bon nay lam an chan qua');
        })
        .expect(200, done);
    });
  });

  describe('with investigating ticket', () => {

    beforeEach(done => {
      helper.factory.createTicket({
        orderId: order.id,
        status: Ticket.STATUS.INVESTIGATING
      }).then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 403', done => {
      request(app)
        .put(`/api/v1/tickets/${ticket.id}`)
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .send({
          userNote: 'bon nay lam an chan qua'
        })
        .expect(res => {
          let body = res.body;
          expect(body.status).to.equal(403);
          expect(body.message).to.equal('Only opening ticket can be edited');
        })
        .expect(403, done);
    });
  });
});

describe('GET /api/v1/tickets/:ticketId', () => {
  let userToken, order, ticket;

  before(done => {
    helper.factory.createUser().then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createOrder({userId: u.id});
    }).then(o => {
      order = o;
      done();
    });
  });

  describe('with exist ticket', () => {
    beforeEach(done => {
      helper.factory.createTicket({orderId: order.id}).then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 200', done => {
      request(app)
        .get(`/api/v1/tickets/${ticket.id}`)
        .set('X-Access-Token', userToken)
        .expect(200)
        .then(res => {
          let body = res.body;
          expect(body.id).to.equal(ticket.id);
          expect(body.orderId).to.equal(order.id);

          Ticket.findOne({
            where: {id: ticket.id},
            include: {
              model: Order,
              include: {
                model: Shop,
                attributes: ['id', 'name']
              }
            }
          }).then(expectedTicket => {
            expect(body.shop).to.eql(expectedTicket.Order.Shop.get());
          });

          done();
        });
    });
  });

  describe('with non-exist ticket', () => {

    it('should return 404', done => {
      request(app)
        .get('/api/v1/tickets/0')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .send({
          userNote: 'bon nay lam an chan qua'
        })
        .expect(res => {
          let body = res.body;
          expect(body.status).to.equal(404);
          expect(body.message).to.equal('Ticket does not exist');
        })
        .expect(404, done);
    });
  });
});

describe('POST /api/v1/tickets/:ticketId/close', () => {
  let userToken, order, ticket;

  before(done => {
    helper.factory.createUser().then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createOrder({userId: u.id});
    }).then(o => {
      order = o;
      done();
    });
  });

  describe('with opening ticket', () => {
    beforeEach(done => {
      helper.factory.createTicket({orderId: order.id}).then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 200', done => {
      request(app)
        .post(`/api/v1/tickets/${ticket.id}/close`)
        .set('X-Access-Token', userToken)
        .expect(res => {
          let body = res.body;
          expect(body.id).to.equal(ticket.id);
          expect(body.status).to.equal(Ticket.STATUS.CLOSED);
        })
        .expect(200, done);
    });
  });

  describe('with closed ticket', () => {

    beforeEach(done => {
      helper.factory.createTicket({
        orderId: order.id,
        status: Ticket.STATUS.CLOSED
      }).then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 403', done => {
      request(app)
        .post(`/api/v1/tickets/${ticket.id}/close`)
        .set('X-Access-Token', userToken)
        .expect(res => {
          let body = res.body;
          expect(body.status).to.equal(403);
          expect(body.message).to.equal('Only opening or investigating ticket can be closed');
        })
        .expect(403, done);
    });
  });
});

describe('POST /api/v1/tickets/:ticketId/reopen', () => {
  let userToken, order, ticket;

  before(done => {
    helper.factory.createUser().then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createOrder({userId: u.id});
    }).then(o => {
      order = o;
      done();
    });
  });

  describe('with closed ticket', () => {
    beforeEach(done => {
      helper.factory.createTicket({
        orderId: order.id,
        status: Ticket.STATUS.CLOSED
      }).then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 200', done => {
      request(app)
          .post(`/api/v1/tickets/${ticket.id}/reopen`)
          .set('X-Access-Token', userToken)
          .expect(res => {
            let body = res.body;
            expect(body.id).to.equal(ticket.id);
            expect(body.status).to.equal(Ticket.STATUS.OPENING);
          })
          .expect(200, done);
    });
  });

  describe('with opening ticket', () => {

    beforeEach(done => {
      helper.factory.createTicket({
        orderId: order.id
      }).then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 403', done => {
      request(app)
          .post(`/api/v1/tickets/${ticket.id}/reopen`)
          .set('X-Access-Token', userToken)
          .expect(res => {
            let body = res.body;
            expect(body.status).to.equal(403);
            expect(body.message).to.equal('Only closed ticket can be reopening');
          })
          .expect(403, done);
    });
  });
});