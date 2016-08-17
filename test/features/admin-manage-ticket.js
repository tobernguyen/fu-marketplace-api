'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const app = require('../../app.js');
const models = require('../../models');
const Ticket = models.Ticket;
var _ = require('lodash');

describe('GET /api/v1/admin/tickets/', function() {
  this.retries(5);
  let ticket1, ticket3, adminToken;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createTicket();
    }).then(t => {
      ticket1 = t;
      return helper.factory.createTicket({status: Ticket.STATUS.CLOSED});
    }).then(t => {
      return helper.factory.createTicket({status: Ticket.STATUS.INVESTIGATING});
    }).then(t => {
      ticket3 = t;
      done();
    });
  });

  describe('with admin access token', () => {
    describe('without size/page and status filter', () => {
      it('should return 200 OK and return an array which contain ticket', done => {
        request(app)
          .get('/api/v1/admin/tickets/')
          .set('X-Access-Token', adminToken)
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
              include: {
                model: models.Order,
                include: [{
                  model: models.User,
                  attributes: ['id', 'fullName']
                }, {
                  model: models.Shop,
                  attributes: ['id', 'name']
                }]
              }
            }).then(t => {
              expect(ticket.shop.id).to.equal(t.Order.Shop.id);
              expect(ticket.shop.name).to.equal(t.Order.Shop.name);
              expect(ticket.user.id).to.equal(t.Order.User.id);
              expect(ticket.user.fullName).to.equal(t.Order.User.fullName);
              done();
            });
          });
      });
    });

    describe('without size/page and with status filter', () => {
      it('should return 200 OK and return an array which contain ticket', done => {
        request(app)
          .get('/api/v1/admin/tickets/?status=OPENING')
          .set('X-Access-Token', adminToken)
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
          .get('/api/v1/admin/tickets/?page=2&size=1')
          .set('X-Access-Token', adminToken)
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
          .get('/api/v1/admin/tickets/?page=3&size=1&status=OPENING')
          .set('X-Access-Token', adminToken)
          .expect(res => {
            expect(res.body.tickets).to.be.ok;
            let tickets = res.body.tickets;
            expect(tickets.length).to.equal(0);
          })
          .expect(200, done);
      });
    });

    describe('with invalid status filter', () => {
      it('should return 403', done => {
        request(app)
          .get('/api/v1/admin/tickets/?status=INVALID')
          .set('X-Access-Token', adminToken)
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.message).to.equal('Invalid status query');
          })
          .expect(404, done);
      });
    });
  });
});

describe('GET /api/v1/admin/tickets/:ticketId', () => {
  let adminToken, ticket;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with exist ticket', () => {
    beforeEach(done => {
      helper.factory.createTicket({
        status: Ticket.STATUS.CLOSED
      }).then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 200', done => {
      request(app)
        .get(`/api/v1/admin/tickets/${ticket.id}`)
        .set('X-Access-Token', adminToken)
        .expect(200)
        .then(res => {
          let body = res.body;
          expect(body.status).to.equal(Ticket.STATUS.CLOSED);
          expect(body.id).to.equal(ticket.id);
          expect(body.userNote).to.equal(ticket.userNote);
          expect(body.orderId).to.equal(ticket.orderId);

          Ticket.findOne({
            where: {id: ticket.id},
            include: {
              model: models.Order,
              include: {
                model: models.OrderLine,
                attributes: ['item', 'note', 'quantity']
              }
            }
          }).then(t => {
            ['userId', 'shopId', 'note', 'status', 'shipAddress', 'sellerMessage'].forEach(k => {
              expect(body.order[k]).to.equal(t.Order[k]);
            });
            expect(body.order.orderLines).to.eql(_.map(t.Order.OrderLines, ol => ol.get()));
            done();
          });
        });
    });
  });

  describe('with non-exist ticket', () => {
    it('should return 404', done => {
      request(app)
        .get('/api/v1/admin/tickets/0')
        .set('X-Access-Token', adminToken)
        .expect(res => {
          let body = res.body;
          expect(body.status).to.equal(404);
          expect(body.message).to.equal('Ticket does not exist');
        })
        .expect(404, done);
    });
  });
});

describe('POST /api/v1/admin/tickets/:ticketId/investigate', () => {
  let adminToken, ticket;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with closed ticket', () => {
    beforeEach(done => {
      helper.factory.createTicket({
        status: Ticket.STATUS.CLOSED
      }).then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 403', done => {
      request(app)
        .post(`/api/v1/admin/tickets/${ticket.id}/investigate`)
        .set('X-Access-Token', adminToken)
        .expect(res => {
          let body = res.body;
          expect(body.status).to.equal(403);
          expect(body.message).to.equal('Only opening ticket can be started investigating');
        })
        .expect(403, done);
    });
  });

  describe('with opening ticket', () => {

    beforeEach(done => {
      helper.factory.createTicket().then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 200', done => {
      request(app)
        .post(`/api/v1/admin/tickets/${ticket.id}/investigate`)
        .set('X-Access-Token', adminToken)
        .expect(res => {
          let body = res.body;
          expect(body.id).to.equal(ticket.id);
          expect(body.status).to.equal(Ticket.STATUS.INVESTIGATING);
        })
        .expect(200, done);
    });
  });
});

describe('POST /api/v1/admin/tickets/:ticketId/close', () => {
  let adminToken, ticket;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with closed ticket', () => {
    beforeEach(done => {
      helper.factory.createTicket({
        status: Ticket.STATUS.CLOSED
      }).then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 403', done => {
      request(app)
        .post(`/api/v1/admin/tickets/${ticket.id}/close`)
        .set('X-Access-Token', adminToken)
        .set('Content-Type', 'application/json')
        .send({
          adminComment: 'bon nay lam an chan qua'
        })
        .expect(res => {
          let body = res.body;
          expect(body.status).to.equal(403);
          expect(body.message).to.equal('Only investigating ticket can be closed by admin');
        })
        .expect(403, done);
    });
  });

  describe('with opening ticket', () => {
    beforeEach(done => {
      helper.factory.createTicket().then(t => {
        ticket = t;
        done();
      });
    });

    it('should return 403', done => {
      request(app)
          .post(`/api/v1/admin/tickets/${ticket.id}/close`)
          .set('X-Access-Token', adminToken)
          .set('Content-Type', 'application/json')
          .send({
            adminComment: 'bon nay lam an chan qua'
          })
          .expect(res => {
            let body = res.body;
            expect(body.status).to.equal(403);
            expect(body.message).to.equal('Only investigating ticket can be closed by admin');
          })
          .expect(403, done);
    });
  });

  describe('with investigating ticket', () => {

    beforeEach(done => {
      helper.factory.createTicket({
        status: Ticket.STATUS.INVESTIGATING
      }).then(t => {
        ticket = t;
        done();
      });
    });
    describe('with admin comment', () => {
      it('should return 200', done => {
        request(app)
          .post(`/api/v1/admin/tickets/${ticket.id}/close`)
          .set('X-Access-Token', adminToken)
          .set('Content-Type', 'application/json')
          .send({
            adminComment: 'bon nay lam an chan qua'
          })
          .expect(res => {
            let body = res.body;
            expect(body.id).to.equal(ticket.id);
            expect(body.status).to.equal(Ticket.STATUS.CLOSED);
          })
          .expect(200, done);
      });
    });

    describe('without admin comment', () => {
      it('should return 400', done => {
        request(app)
          .post(`/api/v1/admin/tickets/${ticket.id}/close`)
          .set('X-Access-Token', adminToken)
          .expect(res => {
            let body = res.body;
            expect(body.status).to.equal(400);
            expect(body.message).to.equal('Admin must provide comment when close ticket');
          })
          .expect(400, done);
      });
    });
  });
});
