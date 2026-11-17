const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const manage = require('../controllers/moderationController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Admin dùng chung app nhưng mọi API ở đây đều kiểm tra role = admin ở server
router.use(requireAuth, requireRole('admin'));

router.get('/summary', admin.getSummary);
router.get('/my-reviews', admin.getMyReviews);
router.get('/artist-requests', admin.listRequests);
router.get('/artist-requests/:id', admin.getRequest);
router.post('/artist-requests/:id/approve', admin.approveRequest);
router.post('/artist-requests/:id/reject', admin.rejectRequest);

// Tab Manage (giai đoạn 5): Users / Artists / Reports
router.get('/manage/users', manage.listUsers);
router.get('/manage/users/:id', manage.getUser);
router.post('/manage/users/:id/lock', manage.lockUser);
router.post('/manage/users/:id/unlock', manage.unlockUser);
router.post('/manage/users/:id/role', manage.changeRole);
router.post('/manage/violations/:id/revoke', manage.revokeViolation);

router.get('/manage/artists', manage.listArtists);
router.get('/manage/artists/:id', manage.getArtist);
router.post('/manage/artists/:id/verified', manage.setVerified);
router.post('/manage/artists/:id/hide', manage.hideArtist);
router.post('/manage/artists/:id/unhide', manage.unhideArtist);

router.post('/manage/content/:type/:id/remove', manage.removeContent);

router.get('/manage/reports', manage.listReports);
router.get('/manage/reports/:type/:id', manage.getReport);
router.post('/manage/reports/:type/:id/dismiss', manage.dismissReports);

module.exports = router;
