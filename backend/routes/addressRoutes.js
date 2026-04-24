// backend/routes/addressRoutes.js
import express from 'express';
import supabase from '../supabaseClient.js';

const router = express.Router();

// GET all addresses for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('address')
    .select('*')
    .eq('user', userId)
    .order('is_default', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  res.json({ addresses: data });
});

// POST — add new address
router.post('/', async (req, res) => {
  const { userId, region, province, city, barangay, postal_code, home_address, is_default } = req.body;

  // If this is default, unset all others first
  if (is_default) {
    await supabase.from('address').update({ is_default: false }).eq('user', userId);
  }

  const { data, error } = await supabase.from('address').insert([{
    user: userId, region, province, city, barangay,
    postal_code, home_address, is_default: is_default || false,
  }]).select().single();

  if (error) return res.status(500).json({ message: error.message });
  res.json({ address: data });
});

// PUT — edit address
router.put('/:addressId', async (req, res) => {
  const { addressId } = req.params;
  const { userId, region, province, city, barangay, postal_code, home_address, is_default } = req.body;

  if (is_default) {
    await supabase.from('address').update({ is_default: false }).eq('user', userId);
  }

  const { data, error } = await supabase.from('address')
    .update({ region, province, city, barangay, postal_code, home_address, is_default })
    .eq('address_id', addressId)
    .select().single();

  if (error) return res.status(500).json({ message: error.message });
  res.json({ address: data });
});

// DELETE — remove address
router.delete('/:addressId', async (req, res) => {
  const { addressId } = req.params;
  const { error } = await supabase.from('address').delete().eq('address_id', addressId);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Address deleted' });
});

export default router;