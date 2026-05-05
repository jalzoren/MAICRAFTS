import { supabase } from '../supabaseClient.js';

class ConsentModel {
  static async logConsent(data) {
    const {
      visitor_id,
      session_id,
      user_id,
      consent_type,
      consent_value,
      ip_address,
      user_agent,
      page_url
    } = data;

    const { data: result, error } = await supabase
      .from('cookie_consent_logs')
      .insert([
        {
          visitor_id,
          session_id: session_id || null,
          user_id: user_id || null,
          consent_type,
          consent_value,
          ip_address,
          user_agent,
          page_url
        }
      ])
      .select();

    if (error) throw error;
    return result;
  }

  static async getConsentHistory(visitorId, limit = 10) {
    const { data, error } = await supabase
      .from('cookie_consent_logs')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async getUserConsentHistory(userId, limit = 10) {
    const { data, error } = await supabase
      .from('cookie_consent_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async getConsentStats() {
    const { data, error } = await supabase
      .from('cookie_consent_logs')
      .select('consent_type, consent_value')
      .limit(1000);

    if (error) throw error;
    
    const stats = {
      total: data.length,
      accepted: data.filter(d => d.consent_value === true).length,
      declined: data.filter(d => d.consent_value === false).length,
      byType: {}
    };

    data.forEach(item => {
      if (!stats.byType[item.consent_type]) {
        stats.byType[item.consent_type] = { accepted: 0, declined: 0 };
      }
      if (item.consent_value) {
        stats.byType[item.consent_type].accepted++;
      } else {
        stats.byType[item.consent_type].declined++;
      }
    });

    return stats;
  }
}

export default ConsentModel;