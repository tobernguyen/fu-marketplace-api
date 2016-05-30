module.exports = {
  error: {
    authentication: {
      invalid_token: {
        'status': 401,
        'message': 'Invalid Token',
        'message_code': 'error.authentication.invalid_token'
      }
    }
  },
  responseError: function(res, err) {
    res.status(err.status);
    res.json(err);
  }
};
