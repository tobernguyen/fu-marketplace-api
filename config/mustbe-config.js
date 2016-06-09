'use strict';

module.exports = function(config){
  config.routeHelpers(function(rh){
    // get the current user from the request object
    rh.getUser(function(req, cb){
      // return cb(err); if there is an error
      cb(null, req.user);
    });

    // what do we do when the user is not authorized?
    rh.notAuthorized(function(req, res, next){
      res.status(403);
      res.json({
        'status': 403,
        'message': 'Not Authorized',
        'message_code': 'error.authentication.not_authorized'
      });
    });
  });

  config.activities(function(activities){
    // configure an activity with an authorization check
    activities.can('admin', function(identity, params, cb){
      identity.user.verifyRole('admin').then(isValid => cb(null, isValid));
    });

    activities.can('seller', function(identity, params, cb){
      identity.user.verifyRole('seller').then(isValid => cb(null, isValid));
    });
  });
};
