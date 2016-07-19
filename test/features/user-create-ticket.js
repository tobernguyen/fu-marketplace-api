'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const Ticket = require('../../models').Ticket;

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
    describe('with order do not have opening or investigating ticket', () => {
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

    describe('with order is already having opening or investigating ticket', () => {
      beforeEach(done => {
        helper.factory.createTicket({orderId: order.id}).then(() => {
          done();
        });
      });

      it('should return 403', done => {
        request(app)
          .post(`/api/v1/orders/${order.id}/openTicket`)
          .set('X-Access-Token', userToken)
          .set('Content-Type', 'application/json')
          .send({
            userNote: 'bon nay lam an chan qua'
          })
          .expect(res => {
            let body = res.body;
            expect(body.status).to.equal(403);
            expect(body.message).to.equal('Already have a opening or investigating ticket');
          })
          .expect(403, done);
      });
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
          expect(body.message).to.equal('Only opening ticket has able to be edited');
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
        .expect(res => {
          let body = res.body;
          expect(body.id).to.equal(ticket.id);
          expect(body.orderId).to.equal(order.id);
        })
        .expect(200, done);
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
          expect(body.message).to.equal('Only opening or investigating ticket has able to be closed');
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
            expect(body.message).to.equal('Only closed ticket has able to be reopening');
          })
          .expect(403, done);
    });
  });
});