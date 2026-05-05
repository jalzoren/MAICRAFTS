// backend/controllers/consentController.js
import ConsentModel from '../models/ConsentModel.js';

export const logConsent = async (req, res) => {
  console.log('📝 Consent log request received:', req.body);
  
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
      console.log('Missing fields:', { visitor_id, consent_type, consent_value });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: visitor_id, consent_type, consent_value'
      });
    }

    const consentData = {
      visitor_id,
      session_id: session_id || null,
      user_id: user_id || null,
      consent_type,
      consent_value,
      ip_address: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null,
      page_url: page_url || null
    };

    console.log('Saving to Supabase:', consentData);
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