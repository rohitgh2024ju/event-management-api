const express = require('express');

const {
    regForEvent,
    myReg,
    getAllRegistrations,
    updateRegStatus,
    exportRegistrationsCSV,
    generateCertificates
} = require('../controllers/regController.js');

const { authMiddleware } = require('../middlewares/authMiddleware.js');
const { adminMiddleware } = require('../middlewares/adminMiddleware.js');

const router = express.Router();


router.post('/events/:id/register', authMiddleware, regForEvent);
router.get('/my/registrations', authMiddleware, myReg);

router.get('/admin/registrations', authMiddleware, adminMiddleware, getAllRegistrations);
router.patch('/admin/registrations/:id', authMiddleware, adminMiddleware, updateRegStatus);
router.get('/admin/registrations/export', authMiddleware, adminMiddleware, exportRegistrationsCSV);
router.post('/admin/events/:eventId/certificates', authMiddleware, adminMiddleware, generateCertificates);
router.get('/admin/events/:eventId/analytics', authMiddleware, adminMiddleware, eventAnalytics);


module.exports = router;

/*/api/events/:id/register
/api/my/registrations
/api/admin/registrations
/api/admin/registrations/:id
/api/admin/registrations/export
/api/admin/events/:eventId/certificates*/