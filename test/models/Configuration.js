'use strict';

const helper = require('../helper');
const Configuration = require('../../models').Configuration;

describe('Configuration Model', () => {
  describe('.set', () => {
    it('should set new configuration to database', done => {
      Configuration.set('some-key', 'some-value').then(() => {
        Configuration.findOne({
          where: {
            key: 'some-key'
          }
        }).then(result => {
          expect(result).to.be.ok;
          expect(result.value).to.equal('some-value');
          done();
        });
      });
    });
  });

  describe('.get', () => {
    it('should get value of configuration from database', done => {
      Configuration.set('some-key', 'some-value').then(() => {
        Configuration.get('some-key').then(result => {
          expect(result).to.equal('some-value');
          done();
        });
      });
    });
  });
});
