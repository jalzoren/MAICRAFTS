// backend/routes/addressRoutes.js
import express from 'express';
import axios from 'axios';
import supabase from '../supabaseClient.js';
import { createAuditLog } from '../services/auditService.js';
import { decrypt } from '../utils/encryption.js';

const router = express.Router();

// ========== AUTH MIDDLEWARE ==========
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔐 [addressRoutes] Auth Header:', authHeader ? 'Present' : 'Missing');

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Supabase auth error:', error.message);
      req.user = null;
      return next();
    }

    if (user) {
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("role, first_name, last_name")
        .eq("email", user.email)
        .single();
      
      const userRole = dbUser?.role || 'CUSTOMER';
      
      req.user = {
        id: user.id,
        email: user.email,
        role: userRole,
        name: dbUser ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() : user.user_metadata?.name || user.email
      };
      
      console.log('✅ [addressRoutes] Authenticated user:', req.user.email);
    } else {
      req.user = null;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    req.user = null;
  }

  next();
});
// ========== END AUTH MIDDLEWARE ==========

// Geocoding helper
const geocodeAddress = async (addressString) => {
  if (!addressString) return null;
  try {
    const encoded = encodeURIComponent(addressString);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'MAICRAFTS/1.0' }
    });
    if (response.data && response.data.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon)
      };
    }
  } catch (err) {
    console.error("Geocoding error:", err.message);
  }
  return null;
};

// GET all addresses for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('address')
    .select('*')
    .eq('user', userId)
    .order('is_default', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  if (req.user?.id) {
    createAuditLog({
      user_id: req.user.id,
      user_email: req.user.email,
      user_role: req.user.role,
      action: "VIEW",
      module: "ADDRESS",
      description: `Viewed addresses for user ${userId} (${data?.length || 0} addresses)`,
    }).catch(err => console.error('Audit log error:', err));
  }
  res.json({ addresses: data });
});

// POST – add new address (with geocoding)
router.post('/', async (req, res) => {
  const { userId, region, province, city, barangay, postal_code, home_address, is_default } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  if (is_default) {
    await supabase.from('address').update({ is_default: false }).eq('user', userId);
  }

  // ✅ Build full address and geocode
  const fullAddress = `${home_address}, ${barangay}, ${city}, ${province}`;
  const coords = await geocodeAddress(fullAddress);

  const addressData = {
    user: userId,
    region,
    province,
    city,
    barangay,
    postal_code,
    home_address,
    is_default: is_default || false,
    lat: coords?.lat || null,
    lng: coords?.lng || null,
  };

  const { data, error } = await supabase.from('address').insert([addressData]).select();
  if (error) return res.status(500).json({ message: error.message });

  if (req.user?.id) {
    await createAuditLog({
      user_id: req.user.id,
      user_email: req.user.email,
      user_role: req.user.role,
      action: "CREATE",
      module: "ADDRESS",
      description: `Added new address for user ${userId}`,
    });
  }

  res.json({ address: data[0] });
});

// PUT – edit address (with geocoding)
router.put('/:addressId', async (req, res) => {
  const { addressId } = req.params;
  const { userId, region, province, city, barangay, postal_code, home_address, is_default } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  if (is_default) {
    await supabase.from('address').update({ is_default: false }).eq('user', userId);
  }

  // ✅ Build full address and geocode
  const fullAddress = `${home_address}, ${barangay}, ${city}, ${province}`;
  const coords = await geocodeAddress(fullAddress);

  const updateData = {
    region,
    province,
    city,
    barangay,
    postal_code,
    home_address,
    is_default,
    lat: coords?.lat || null,
    lng: coords?.lng || null,
  };

  const { data, error } = await supabase.from('address')
    .update(updateData)
    .eq('address_id', addressId)
    .select();

  if (error) return res.status(500).json({ message: error.message });
  if (!data || data.length === 0) return res.status(404).json({ message: 'Address not found' });

  if (req.user?.id) {
    await createAuditLog({
      user_id: req.user.id,
      user_email: req.user.email,
      user_role: req.user.role,
      action: "UPDATE",
      module: "ADDRESS",
      description: `Updated address ${addressId} for user ${userId}`,
    });
  }

  res.json({ address: data[0] });
});

// DELETE – remove address
router.delete('/:addressId', async (req, res) => {
  const { addressId } = req.params;
  const { error } = await supabase.from('address').delete().eq('address_id', addressId);
  if (error) return res.status(500).json({ message: error.message });
  if (req.user?.id) {
    await createAuditLog({
      user_id: req.user.id,
      user_email: req.user.email,
      user_role: req.user.role,
      action: "DELETE",
      module: "ADDRESS",
      description: `Deleted address ${addressId}`,
    });
  }
  res.json({ message: 'Address deleted' });
});

// GET current user profile (from token)
router.get("/users/me", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, middle_name, email, contact_number_encrypted, profile_url, role")
      .eq("id", req.user.id)
      .single();
    if (error) throw error;
    data.contact_number = decrypt(data.contact_number_encrypted);
    delete data.contact_number_encrypted;
    res.json({ user: data });

  } catch (err) {
    console.error("Error fetching current user:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;