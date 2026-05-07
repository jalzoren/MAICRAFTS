// backend/controllers/consentController.js
import ConsentModel from '../models/ConsentModel.js';
import crypto from 'crypto';

// Generate CSRF token
export const generateCsrfToken = (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    
    res.cookie('csrf_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });
    
    console.log('✅ CSRF token generated from consent route');
    res.json({ success: true, csrf_token: token });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({ success: false, error: 'Failed to generate CSRF token' });
  }
};

// Validate CSRF token
const validateCsrfToken = (req) => {
  const csrfTokenFromHeader = req.headers['x-csrf-token'];
  const csrfTokenFromCookie = req.cookies?.csrf_token;
  
  if (!csrfTokenFromHeader || !csrfTokenFromCookie) {
    console.log('CSRF validation failed: Missing tokens');
    return false;
  }
  
  const isValid = csrfTokenFromHeader === csrfTokenFromCookie;
  if (!isValid) {
    console.log('CSRF validation failed: Token mismatch');
  }
  return isValid;
};

export const logConsent = async (req, res) => {
  console.log('📝 Consent log request received:', req.body);
  
  if (!validateCsrfToken(req)) {
    console.log('❌ CSRF validation failed');
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token'
    });
  }
  
  try {
    const {
      visitor_id,
      session_id,
      user_id,
      consent_type,
      consent_value,
      page_url
    } = req.body;

    if (!visitor_id || !consent_type || consent_value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const consentData = {
      visitor_id,
      session_id: session_id || null,
      user_id: user_id || null,
      consent_type,
      consent_value: consent_value === true || consent_value === 'true',
      ip_address: req.ip || req.headers['x-forwarded-for'] || null,
      user_agent: req.headers['user-agent'] || null,
      page_url: page_url || null
    };

    const result = await ConsentModel.logConsent(consentData);

    res.status(200).json({
      success: true,
      message: 'Consent logged successfully',
      data: result
    });
  } catch (error) {
    console.error('Error logging consent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

export const getConsentHistory = async (req, res) => {
  try {
    const { visitorId } = req.params;
    const { limit = 10 } = req.query;

    if (!visitorId) {
      return res.status(400).json({
        success: false,
        error: 'visitorId is required'
      });
    }

    const history = await ConsentModel.getConsentHistory(visitorId, parseInt(limit));

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching consent history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getUserConsentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const history = await ConsentModel.getUserConsentHistory(userId, parseInt(limit));

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching user consent history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getConsentStats = async (req, res) => {
  try {
    const stats = await ConsentModel.getConsentStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching consent stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};