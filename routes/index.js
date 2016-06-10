const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth');
const users = require('../controllers/users');
const adminUser = require('../controllers/admin/users');
const adminShop = require('../controllers/admin/shops');
const adminShopOpeningRequest = require('../controllers/admin/shopOpeningRequests');

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
router.post('/api/v1/users/me/uploadIdentityPhoto', users.postUserUploadIdentityPhoto);

router.post('/api/v1/users/signOutAll', users.postSignOutAll);

router.post('/api/v1/requestOpenShopFirstTime', users.postRequestOpenShopFirstTime);

/*
 * Routes that can be accessed only by authenticated & authorized users
 */
router.get('/api/v1/admin/users', mustBe.authorized('admin'), adminUser.getUsers);
router.get('/api/v1/admin/users/:id', mustBe.authorized('admin'), adminUser.getUser);
router.put('/api/v1/admin/users/:id', mustBe.authorized('admin'), adminUser.putUser);
router.post('/api/v1/admin/users/:id/setRoles', mustBe.authorized('admin'), adminUser.postSetRoles);

router.post('/api/v1/admin/changePassword', mustBe.authorized('admin'), adminUser.postChangePassword);

router.get('/api/v1/admin/shops', mustBe.authorized('admin'), adminShop.getShops);
router.get('/api/v1/admin/shops/:id', mustBe.authorized('admin'), adminShop.getShop);
router.put('/api/v1/admin/shops/:id', mustBe.authorized('admin'), adminShop.putShop);
router.post('/api/v1/admin/shops/:id/uploadAvatar', mustBe.authorized('admin'), adminShop.postShopUploadAvatar);
router.post('/api/v1/admin/shops/:id/uploadCover', mustBe.authorized('admin'), adminShop.postShopUploadCover);

router.get('/api/v1/admin/shopOpeningRequests', mustBe.authorized('admin'), adminShopOpeningRequest.getShopOpeningRequests);

module.exports = router;
