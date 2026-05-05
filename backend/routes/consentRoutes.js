// backend/routes/consentRoutes.js
import express from 'express';
import {
  logConsent,
  getConsentHistory,
  getUserConsentHistory,
  getConsentStats
} from '../controllers/consentController.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  console.log('✅ Test route hit');
  res.json({ 
    success: true, 
    message: 'Consent route is working!' 
  });
});

// POST /log - Save consent to Supabase
router.post('/log', logConsent);

// GET /history/:visitorId - Get consent history by visitor ID
router.get('/history/:visitorId', getConsentHistory);

// GET /user/:userId - Get consent history by user ID
router.get('/user/:userId', getUserConsentHistory);

// GET /stats - Get consent statistics
router.get('/stats', getConsentStats);

export default router;