// cartRoutes.js 
import express from 'express';
import supabase, { supabaseAdmin } from '../supabaseClient.js';

const router = express.Router();

// Helper to normalize note (store as string)
const normalizeNote = (note) => {
	if (note === null || note === undefined) return null;
	if (typeof note === 'string') return note;
	try { return JSON.stringify(note); } catch (e) { return String(note); }
};

// GET /api/cart/:userId - return cart items for a user (with product summary)
router.get('/cart/:userId', async (req, res) => {
	try {
		const userId = req.params.userId;
		const { data: cartRows, error: cartErr } = await supabaseAdmin
			.from('cart')
			.select('*')
			.eq('user_id', userId);

		if (cartErr) return res.status(500).json({ success: false, error: cartErr.message || cartErr });
		if (!cartRows || cartRows.length === 0) return res.json({ success: true, cart: [] });

		const productIds = [...new Set(cartRows.map(r => r.product_id).filter(Boolean))];
		const { data: products = [], error: prodErr } = productIds.length > 0
			? await supabaseAdmin.from('products').select('*').in('id', productIds)
			: { data: [], error: null };

		if (prodErr) console.error('Product fetch error for cart:', prodErr);

		const prodMap = new Map((products || []).map(p => [p.id, p]));

		const cart = cartRows.map(row => {
			const prod = prodMap.get(row.product_id) || null;
			let images = prod?.images;
			try { if (typeof images === 'string') images = JSON.parse(images); } catch(e) { images = images ? [images] : []; }

			return {
				cart_id: row.cart_id,
				user_id: row.user_id,
				product_id: row.product_id,
				quantity: row.quantity,
				note: row.note,
				created_at: row.created_at,
				product: prod ? {
					id: prod.id,
					name: prod.name,
					price: Number(prod.price),
					stock: prod.stock,
					category: prod.category,
					image: prod.image || prod.main_image || (images && images[0]) || null,
					mainImage: prod.main_image || prod.image || (images && images[0]) || null,
				} : null,
			};
		});

		res.json({ success: true, cart });
	} catch (error) {
		console.error('GET /cart/:userId error:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

// POST /api/cart - add or increment an item
router.post('/cart', async (req, res) => {
	try {
		const { user_id, product_id, quantity = 1, note = null } = req.body;
		if (!user_id || !product_id) return res.status(400).json({ success: false, error: 'Missing user_id or product_id' });

		const nNote = normalizeNote(note);
		const { data: existing } = await supabaseAdmin
			.from('cart')
			.select('*')
			.eq('user_id', user_id)
			.eq('product_id', product_id)
			.eq('note', nNote);

		if (existing && existing.length > 0) {
			const row = existing[0];
			const newQty = (row.quantity || 0) + Number(quantity);
			const { data, error } = await supabaseAdmin.from('cart').update({ quantity: newQty }).eq('cart_id', row.cart_id).select();
			if (error) return res.status(500).json({ success: false, error: error.message });
			return res.json({ success: true, data: data?.[0] });
		}

		const { data, error } = await supabaseAdmin.from('cart').insert([{ user_id, product_id, quantity, note: nNote }]).select();
		if (error) return res.status(500).json({ success: false, error: error.message });
		res.status(201).json({ success: true, data: data?.[0] });
	} catch (error) {
		console.error('POST /cart error:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

// POST /api/cart/merge - merge guest items into a user's cart
router.post('/cart/merge', async (req, res) => {
	try {
		const { userId, guestItems } = req.body;
		if (!userId || !Array.isArray(guestItems)) return res.status(400).json({ success: false, error: 'Missing userId or guestItems' });

		for (const item of guestItems) {
			const product_id = item.product_id || item.id || item.productId;
			const quantity = item.quantity || item.qty || 1;
			const note = normalizeNote(item.note || item.note);
			if (!product_id) continue;

			const { data: existing } = await supabaseAdmin
				.from('cart')
				.select('*')
				.eq('user_id', userId)
				.eq('product_id', product_id)
				.eq('note', note);

			if (existing && existing.length > 0) {
				const row = existing[0];
				await supabaseAdmin.from('cart').update({ quantity: (row.quantity || 0) + Number(quantity) }).eq('cart_id', row.cart_id);
			} else {
				await supabaseAdmin.from('cart').insert([{ user_id: userId, product_id, quantity, note }]);
			}
		}

		const { data: cartRows } = await supabaseAdmin.from('cart').select('*').eq('user_id', userId);
		res.json({ success: true, cart: cartRows });
	} catch (error) {
		console.error('POST /cart/merge error:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

// PUT /api/cart/:userId/:productId - update quantity (optional note to match)
router.put('/cart/:userId/:productId', async (req, res) => {
	try {
		const userId = req.params.userId;
		const productId = req.params.productId;
		const { quantity, note } = req.body;
		if (quantity === undefined) return res.status(400).json({ success: false, error: 'Missing quantity' });

		let q = supabaseAdmin.from('cart').update({ quantity }).eq('user_id', userId).eq('product_id', productId);
		if (note !== undefined) q = q.eq('note', normalizeNote(note));

		const { data, error } = await q.select();
		if (error) return res.status(500).json({ success: false, error: error.message });
		res.json({ success: true, data });
	} catch (error) {
		console.error('PUT /cart error:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

// DELETE /api/cart/:userId/:productId - remove a specific item (optional note query param)
router.delete('/cart/:userId/:productId', async (req, res) => {
	try {
		const userId = req.params.userId;
		const productId = req.params.productId;
		const { note } = req.query;

		let q = supabaseAdmin.from('cart').delete().eq('user_id', userId).eq('product_id', productId);
		if (note !== undefined) q = q.eq('note', note);

		const { data, error } = await q.select();
		if (error) return res.status(500).json({ success: false, error: error.message });
		res.json({ success: true, data });
	} catch (error) {
		console.error('DELETE /cart error:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

// DELETE /api/cart/:userId - clear all cart items for a user
router.delete('/cart/:userId', async (req, res) => {
	try {
		const userId = req.params.userId;
		const { data, error } = await supabaseAdmin.from('cart').delete().eq('user_id', userId).select();
		if (error) return res.status(500).json({ success: false, error: error.message });
		res.json({ success: true, data });
	} catch (error) {
		console.error('DELETE /cart (clear) error:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

export default router;