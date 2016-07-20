/**
 * Created by mk on 19/07/2016.
 */


'use strict';

const helper = require('../helper');
const Ticket = require('../../models').Ticket;

describe('Ticket models', () => {
  describe('factory', () => {
    it('should be valid', done => {
      let createdOrder, createdTicket;
      helper.factory.createOrder().then(o => {
        createdOrder = o;
        return helper.factory.createTicket({orderId: o.id});
      }).then(t => {
        createdTicket = t;
        expect(t).to.be.ok;
        return Ticket.findById(t.id);
      }).then(ticketFromDb => {
        expect(createdTicket.userNote).to.equal(ticketFromDb.userNote);
        expect(createdTicket.orderId).to.equal(createdOrder.id);
        done();
      }, done);
    });
  });

  describe('#updateTicket', () => {
    describe('with opening ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket().then(t => {
          ticket = t;
          done();
        });
      });

      describe('with valid userNote', () => {
        it('should be ok', done => {
          ticket.updateTicket({
            userNote: 'note 2'
          }).then(t => {
            expect(t).to.be.ok;
            return Ticket.findById(t.id);
          }).then(ticketFromDb => {
            expect(ticketFromDb.userNote).to.equal('note 2');
            expect(ticketFromDb.id).to.equal(ticket.id);
            expect(ticketFromDb.status).to.equal(Ticket.STATUS.OPENING);
            done();
          }, done);
        });
      });

      describe('with invalid userNote', () => {
        it('should be return error', done => {
          ticket.updateTicket({
            userNote: ''
          }).catch(err => {
            expect(err.errors[0].message).to.equal('Validation len failed');
            expect(err.errors[0].type).to.equal('Validation error');
            expect(err.errors[0].path).to.equal('userNote');
            done();
          }, done);
        });
      });
    });

    describe('with investigating ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket({status: Ticket.STATUS.INVESTIGATING}).then(t => {
          ticket = t;
          done();
        });
      });

      it('should be return error', done => {
        ticket.updateTicket({
          userNote: 'note 2'
        }).catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only opening ticket has able to be edited');
          expect(error.type).to.equal('ticket');
          return Ticket.findById(ticket.id);
        }).then(ticketFromDb => {
          expect(ticketFromDb.userNote).to.equal(ticket.userNote);
          expect(ticketFromDb.status).to.equal(Ticket.STATUS.INVESTIGATING);
          done();
        }, done);
      });
    });
  });

  describe('#investigateTicket', () => {
    describe('with opening ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket().then(t => {
          ticket = t;
          done();
        });
      });

      it('should be ok', done => {
        ticket.investigateTicket().then(t => {
          expect(t).to.be.ok;
          return Ticket.findById(t.id);
        }).then(ticketFromDb => {
          expect(ticketFromDb.userNote).to.equal(ticket.userNote);
          expect(ticketFromDb.status).to.equal(Ticket.STATUS.INVESTIGATING);
          done();
        }, done);
      });
    });

    describe('with investigating ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket({status: Ticket.STATUS.INVESTIGATING}).then(t => {
          ticket = t;
          done();
        });
      });

      it('should be return error', done => {
        ticket.investigateTicket().catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only opening ticket has able to be started investigating');
          expect(error.type).to.equal('ticket');
          return Ticket.findById(ticket.id);
        }).then(ticketFromDb => {
          expect(ticketFromDb.userNote).to.equal(ticket.userNote);
          expect(ticketFromDb.status).to.equal(Ticket.STATUS.INVESTIGATING);
          done();
        }, done);
      });
    });
  });

  describe('#closeTicket', () => {
    describe('with opening ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket().then(t => {
          ticket = t;
          done();
        });
      });

      describe('without admin comment ticket', () => {
        it('should be ok and do not update admin comment', done => {
          ticket.closeTicket().then(t => {
            expect(t).to.be.ok;
            return Ticket.findById(t.id);
          }).then(ticketFromDb => {
            expect(ticketFromDb.userNote).to.equal(ticket.userNote);
            expect(ticketFromDb.adminComment).to.equal(ticket.adminComment);
            expect(ticketFromDb.status).to.equal(Ticket.STATUS.CLOSED);
            done();
          }, done);
        });
      });

      describe('with admin comment ticket', () => {
        it('should be ok and update admin comment', done => {
          ticket.closeTicket({
            adminComment: 'xin duoc phep duoc close'
          }).then(t => {
            expect(t).to.be.ok;
            return Ticket.findById(t.id);
          }).then(ticketFromDb => {
            expect(ticketFromDb.adminComment).to.equal('xin duoc phep duoc close');
            expect(ticketFromDb.status).to.equal(Ticket.STATUS.CLOSED);
            done();
          }, done);
        });
      });
    });

    describe('with closed ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket({status: Ticket.STATUS.CLOSED}).then(t => {
          ticket = t;
          done();
        });
      });

      it('should be return error', done => {
        ticket.closeTicket().catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only opening or investigating ticket has able to be closed');
          expect(error.type).to.equal('ticket');
          return Ticket.findById(ticket.id);
        }).then(ticketFromDb => {
          expect(ticketFromDb.userNote).to.equal(ticket.userNote);
          expect(ticketFromDb.status).to.equal(Ticket.STATUS.CLOSED);
          done();
        }, done);
      });
    });
  });

  describe('#reopenTicket', () => {
    describe('with closed ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket({status: Ticket.STATUS.CLOSED}).then(t => {
          ticket = t;
          done();
        });
      });

      it('should be ok', done => {
        ticket.reopenTicket().then(t => {
          expect(t).to.be.ok;
          return Ticket.findById(t.id);
        }).then(ticketFromDb => {
          expect(ticketFromDb.id).to.equal(ticket.id);
          expect(ticketFromDb.status).to.equal(Ticket.STATUS.OPENING);
          done();
        }, done);
      });
    });

    describe('with investigating ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket({status: Ticket.STATUS.INVESTIGATING}).then(t => {
          ticket = t;
          done();
        });
      });

      it('should be return error', done => {
        ticket.reopenTicket().catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only closed ticket has able to be reopening');
          expect(error.type).to.equal('ticket');
          return Ticket.findById(ticket.id);
        }).then(ticketFromDb => {
          expect(ticketFromDb.status).to.equal(Ticket.STATUS.INVESTIGATING);
          done();
        }, done);
      });
    });
  });
});
