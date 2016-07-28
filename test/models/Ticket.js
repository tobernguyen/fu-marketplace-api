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
          expect(error.message).to.equal('Only opening ticket can be edited');
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
          helper.queue.testMode.clear();
          done();
        });
      });

      it('should be ok', done => {
        ticket.investigateTicket().then(t => {
          let jobs = helper.queue.testMode.jobs;
          expect(jobs).to.have.lengthOf(1);
          expect(jobs[0].type).to.equal('send ticket notification');
          expect(jobs[0].data).to.eql({ticketId: ticket.id, newStatus: Ticket.STATUS.INVESTIGATING});
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
          expect(error.message).to.equal('Only opening ticket can be started investigating');
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

  describe('#closeTicketByUser', () => {
    describe('with opening ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket().then(t => {
          ticket = t;
          helper.queue.testMode.clear();
          done();
        });
      });

      it('should be ok and do not update admin comment', done => {
        ticket.closeTicketByUser().then(t => {
          expect(t).to.be.ok;
          return Ticket.findById(t.id);
        }).then(ticketFromDb => {
          expect(ticketFromDb.userNote).to.equal(ticket.userNote);
          expect(ticketFromDb.adminComment).to.equal(ticket.adminComment);
          expect(ticketFromDb.status).to.equal(Ticket.STATUS.CLOSED);
          done();
        }, done);
      });

      it('should not create "send ticket notification" job', done => {
        ticket.closeTicketByUser().then(() => {
          let jobs = helper.queue.testMode.jobs;
          expect(jobs).to.have.lengthOf(0);
          done();
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
        ticket.closeTicketByUser().catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only opening or investigating ticket can be closed');
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

  describe('#closeTicketByAdmin', () => {
    describe('with opening ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket().then(t => {
          ticket = t;
          helper.queue.testMode.clear();
          done();
        });
      });

      it('should return error', done => {
        ticket.closeTicketByAdmin({
          adminComment: 'minh close ticket nay nhe'
        }).catch(error => {
          expect(error.status).to.equal(403);
          expect(error.message).to.equal('Only investigating ticket can be closed by admin');
          expect(error.type).to.equal('ticket');
          return Ticket.findById(ticket.id);
        }).then(ticketFromDb => {
          expect(ticketFromDb.userNote).to.equal(ticket.userNote);
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
          helper.queue.testMode.clear();
          done();
        });
      });

      describe('without adminMessage', () => {
        it('should return error', done => {
          ticket.closeTicketByAdmin().catch(error => {
            expect(error.status).to.equal(404);
            expect(error.message).to.equal('Must provide adminComment message when admin close ticket');
            expect(error.type).to.equal('ticket');
            return Ticket.findById(ticket.id);
          }).then(ticketFromDb => {
            expect(ticketFromDb.userNote).to.equal(ticket.userNote);
            expect(ticketFromDb.adminComment).to.equal(ticket.adminComment);
            expect(ticketFromDb.status).to.equal(Ticket.STATUS.INVESTIGATING);
            done();
          }, done);
        });
      });

      describe('with adminMessage', () => {
        it('should return error', done => {
          ticket.closeTicketByAdmin({
            adminComment: 'minh close ticket nay nhe, khong van de gi ca'
          }).then(t => {
            expect(t).to.be.ok;
            return Ticket.findById(t.id);
          }).then(ticketFromDb => {
            expect(ticketFromDb.userNote).to.equal(ticket.userNote);
            expect(ticketFromDb.adminComment).to.equal('minh close ticket nay nhe, khong van de gi ca');
            expect(ticketFromDb.status).to.equal(Ticket.STATUS.CLOSED);
            done();
          }, done);
        });
      });
    });
  });

  describe('#reopenTicket', () => {
    describe('with closed ticket', () => {
      let ticket;

      beforeEach(done => {
        helper.factory.createTicket({status: Ticket.STATUS.CLOSED}).then(t => {
          ticket = t;
          helper.queue.testMode.clear();
          done();
        });
      });

      it('should be ok', done => {
        ticket.reopenTicket().then(t => {
          let jobs = helper.queue.testMode.jobs;
          expect(jobs).to.have.lengthOf(0);
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
          expect(error.message).to.equal('Only closed ticket can be reopening');
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
