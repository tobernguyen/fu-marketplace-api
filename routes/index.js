const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth');
const users = require('../controllers/users');
const orders = require('../controllers/orders');
const adminUser = require('../controllers/admin/users');
const adminShop = require('../controllers/admin/shops');
const sellerShop = require('../controllers/seller/shops');
const sellerItem = require('../controllers/seller/items');
const sellerOrder = require('../controllers/seller/orders');
const shipPlace = require('../controllers/shipPlaces');
const category = require('../controllers/categories');
const adminShopOpeningRequest = require('../controllers/admin/shopOpeningRequests');
const shopFeed = require('../controllers/feed/shops');
const application = require('../controllers/application');

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
router.get('/api/v1/metadata', application.getMetadata);
router.get('/api/v1/shops/:shopId', users.getShop);
router.post('/api/v1/shops/:shopId/orders', orders.postPlaceOrder);

router.get('/api/v1/orders', orders.getOrders);
router.put('/api/v1/orders/:orderId', orders.putUpdateOrder);
router.post('/api/v1/orders/:orderId/cancel', orders.cancelOrder);

router.post('/api/v1/feed/shops', shopFeed.searchShop);

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
router.get('/api/v1/seller/shops/:shopId/items/:itemId', mustBe.authorized('seller'), sellerItem.getItem);
router.post('/api/v1/seller/shops/:shopId/items', mustBe.authorized('seller'), sellerItem.postItems);
router.put('/api/v1/seller/shops/:shopId/items/:itemId', mustBe.authorized('seller'), sellerItem.putItem);
router.delete('/api/v1/seller/shops/:shopId/items/:itemId', mustBe.authorized('seller'), sellerItem.deleteItem);
router.get('/api/v1/seller/shops/:shopId/orders', mustBe.authorized('seller'), sellerOrder.getOrderByShop);
router.post('/api/v1/seller/orders/:orderId/accept', mustBe.authorized('seller'), sellerOrder.acceptOrder);
router.post('/api/v1/seller/orders/:orderId/reject', mustBe.authorized('seller'), sellerOrder.rejectOrder);
router.post('/api/v1/seller/orders/:orderId/ship', mustBe.authorized('seller'), sellerOrder.shipOrder);
router.post('/api/v1/seller/orders/:orderId/complete', mustBe.authorized('seller'), sellerOrder.completeOrder);
router.post('/api/v1/seller/orders/:orderId/abort', mustBe.authorized('seller'), sellerOrder.abortOrder);

module.exports = router;
