import express from 'express';

import {
    regForEvent,
    myReg,
    getAllRegistrations,
    updateRegStatus,
    exportRegistrationsCSV,
    generateCertificates,
    eventAnalytics
} from '../controllers/regController.js';

import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();


router.post('/events/:id/register', authMiddleware, regForEvent);
router.get('/my/registrations', authMiddleware, myReg);

router.get('/admin/registrations', authMiddleware, adminMiddleware, getAllRegistrations);
router.patch('/admin/registrations/:id', authMiddleware, adminMiddleware, updateRegStatus);
router.get('/admin/registrations/export', authMiddleware, adminMiddleware, exportRegistrationsCSV);
router.post('/admin/events/:eventId/certificates', authMiddleware, adminMiddleware, generateCertificates);
router.get('/admin/events/:eventId/analytics', authMiddleware, adminMiddleware, eventAnalytics);


export default router
/*/api/events/:id/register
/api/my/registrations
/api/admin/registrations
/api/admin/registrations/:id
/api/admin/registrations/export
/api/admin/events/:eventId/certificates*/