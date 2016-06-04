const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth');
const users = require('../controllers/users');
const adminUser = require('../controllers/admin/users');

const _mustBe = require('mustbe');
_mustBe.configure(require('../config/mustbe-config'));

const mustBe = _mustBe.routeHelpers();

/*
 * Routes that can be accessed by any one
 */
router.post('/login', auth.login);
router.get('/auth/google/callback', auth.loginWithGoogle);

/*
 * Routes that can be accessed only by autheticated users
 */
router.get('/api/v1/users/me', users.getCurrentUser);
router.put('/api/v1/users/me', users.putCurrentUser);
router.post('/api/v1/users/me/uploadAvatar', users.postUploadCurrentUserAvatar);
router.post('/api/v1/users/signOutAll', users.postSignOutAll);


/*
 * Routes that can be accessed only by authenticated & authorized users
 */
router.get('/api/v1/admin/users', mustBe.authorized('admin'), adminUser.getUsers);
router.get('/api/v1/admin/users/:id', mustBe.authorized('admin'), adminUser.getUser);
router.put('/api/v1/admin/users/:id', mustBe.authorized('admin'), adminUser.putUser);
router.post('/api/v1/admin/users/:id/setRoles', mustBe.authorized('admin'), adminUser.postSetRoles);

module.exports = router;
