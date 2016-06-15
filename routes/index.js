const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth');
const users = require('../controllers/users');
const adminUser = require('../controllers/admin/users');
const adminShop = require('../controllers/admin/shops');
const sellerShop = require('../controllers/seller/shops');
const sellerItem = require('../controllers/seller/items');
const shipPlace = require('../controllers/shipPlaces');
const category = require('../controllers/categories');
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

router.get('/api/v1/users/me/shopOpeningRequests', users.getShopOpeningRequests);
router.post('/api/v1/requestOpenShopFirstTime', users.postRequestOpenShopFirstTime);
router.get('/api/v1/shipPlaces', shipPlace.getShipPlaces);
router.get('/api/v1/categories', category.getCategories);

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
router.post('/api/v1/admin/shops/:id/shipPlaces', mustBe.authorized('admin'), adminShop.postChangeShopShipPlaces);
router.post('/api/v1/admin/shops/:id/uploadAvatar', mustBe.authorized('admin'), adminShop.postShopUploadAvatar);
router.post('/api/v1/admin/shops/:id/uploadCover', mustBe.authorized('admin'), adminShop.postShopUploadCover);

router.get('/api/v1/admin/shopOpeningRequests', mustBe.authorized('admin'), adminShopOpeningRequest.getShopOpeningRequests);
router.post('/api/v1/admin/shopOpeningRequests/:id/accept', mustBe.authorized('admin'), adminShopOpeningRequest.postAcceptShopOpeningRequest);
router.post('/api/v1/admin/shopOpeningRequests/:id/reject', mustBe.authorized('admin'), adminShopOpeningRequest.postRejectShopOpeningRequest);

/*
 * Routes that can be accessed only by authenticated & authorized users who has role 'seller'
 */

router.get('/api/v1/seller/shops', mustBe.authorized('seller'), sellerShop.getShops);
router.get('/api/v1/seller/shops/:id', mustBe.authorized('seller'), sellerShop.getShop);
router.put('/api/v1/seller/shops/:id', mustBe.authorized('seller'), sellerShop.putShop);
router.post('/api/v1/seller/shops/:id/shipPlaces', mustBe.authorized('seller'), sellerShop.postChangeShopShipPlaces);
router.post('/api/v1/seller/shops/:id/uploadAvatar', mustBe.authorized('seller'), sellerShop.postShopUploadAvatar);
router.post('/api/v1/seller/shops/:id/uploadCover', mustBe.authorized('seller'), sellerShop.postShopUploadCover);
router.get('/api/v1/seller/shops/:shopId/items', mustBe.authorized('seller'), sellerItem.getItems);
router.post('/api/v1/seller/shops/:shopId/items', mustBe.authorized('seller'), sellerItem.postItems);
router.put('/api/v1/seller/shops/:shopId/items/:itemId', mustBe.authorized('seller'), sellerItem.putItem);
module.exports = router;
