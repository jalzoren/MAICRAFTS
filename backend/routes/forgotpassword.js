// forgotpassword.js
import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import supabase from '../supabaseClient.js';

const router = express.Router();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── POST /api/forgot-password ────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    // 1. Check if user exists in Supabase Auth
    const { data: users, error: fetchError } =
      await supabase.auth.admin.listUsers();

    if (fetchError) {
      return res.status(500).json({ message: 'Failed to verify email.' });
    }

    const userExists = users.users.some((u) => u.email === email);

    // Always return a generic message to prevent user enumeration
    if (!userExists) {
      return res.status(200).json({
        message: 'If this email exists, a reset code has been sent.',
      });
    }

    // 2. Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Upsert OTP into password_resets table
    const { error: upsertError } = await supabase
      .from('password_resets')
      .upsert(
        {
          email,
          otp,
          expires_at: expiresAt.toISOString(),
          used: false,
        },
        { onConflict: 'email' }
      );

    if (upsertError) {
      return res.status(500).json({ message: 'Failed to generate reset code.' });
    }

    // 4. Send OTP email via Nodemailer
    await transporter.sendMail({
      from: `"Maicrafts" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Maicrafts Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
                    border: 1px solid #e0c896; border-radius: 12px; overflow: hidden;">
          <div style="background: #4b2e16; padding: 24px; text-align: center;">
            <h1 style="color: #E6BB71; margin: 0; letter-spacing: 4px;">MAICRAFTS</h1>
          </div>
          <div style="background: #E6BB71; padding: 32px; text-align: center;">
            <h2 style="color: #4b2e16; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #4b2e16;">
              Use the code below to reset your password.
              It expires in <strong>10 minutes</strong>.
            </p>
            <div style="background: #fff; border-radius: 8px; padding: 20px;
                        margin: 24px auto; display: inline-block;">
              <span style="font-size: 36px; font-weight: bold;
                           letter-spacing: 10px; color: #4b2e16;">${otp}</span>
            </div>
            <p style="color: #7a5c3a; font-size: 13px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          <div style="background: #4b2e16; padding: 16px; text-align: center;">
            <p style="color: #E6BB71; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Maicrafts. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({
      message: 'If this email exists, a reset code has been sent.',
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/verify-otp ─────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .single();

    if (error || !data) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }

    if (new Date() > new Date(data.expires_at)) {
      return res.status(400).json({ message: 'Reset code has expired.' });
    }

    if (data.otp !== otp) {
      return res.status(400).json({ message: 'Incorrect reset code.' });
    }

    return res.status(200).json({ message: 'OTP verified successfully.' });

  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/reset-password ─────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // 1. Re-validate OTP before allowing password change
    const { data, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .single();

    if (error || !data) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }

    if (new Date() > new Date(data.expires_at)) {
      return res.status(400).json({ message: 'Reset code has expired.' });
    }

    if (data.otp !== otp) {
      return res.status(400).json({ message: 'Incorrect reset code.' });
    }

    // 2. Find user UUID from Supabase Auth
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find((u) => u.email === email);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 3. Update password using Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      return res.status(500).json({ message: 'Failed to update password.' });
    }

    // 4. Mark OTP as used so it can't be reused
    await supabase
      .from('password_resets')
      .update({ used: true })
      .eq('email', email);

    return res.status(200).json({ message: 'Password reset successfully.' });

  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;