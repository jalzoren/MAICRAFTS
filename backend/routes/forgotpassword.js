import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '../supabaseClient.js';

const router = express.Router();
const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const GENERIC_RESET_MESSAGE = 'If this email exists, a reset code has been sent.';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const normalizeEmail = (value = '') => value.trim().toLowerCase();
const normalizeOtp = (value = '') => String(value).trim();

const findUserByEmail = async (email) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle();

  if (error) {
    return { error };
  }

  return { user: data || null };
};

const getLatestResetRecord = async (email) =>
  supabaseAdmin
    .from('email_otps')
    .select('id, email, otp, expires_at, created_at')
    .ilike('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

const validateResetRecord = (record, otp) => {
  if (!record) {
    return { status: 400, message: 'Invalid or expired reset code.' };
  }

  if (normalizeOtp(record.otp) !== normalizeOtp(otp)) {
    return { status: 400, message: 'Incorrect reset code.' };
  }

  if (new Date() > new Date(record.expires_at)) {
    return { status: 400, message: 'Reset code has expired.' };
  }

  return null;
};

const cleanupResetRecords = async (email) => {
  const { error } = await supabaseAdmin.from('email_otps').delete().ilike('email', email);

  if (error) {
    console.warn('Password reset cleanup warning:', error.message);
  }
};

router.post('/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const { user, error: userError } = await findUserByEmail(email);

    if (userError) {
      console.error('Forgot password user lookup error:', userError);
      return res.status(500).json({ message: 'Failed to verify email.' });
    }

    if (!user) {
      return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString();

    await cleanupResetRecords(email);

    const { error: insertError } = await supabaseAdmin.from('email_otps').insert({
      email,
      otp,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Forgot password insert error:', insertError);
      return res.status(500).json({ message: 'Failed to generate reset code.' });
    }

    try {
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
    } catch (mailError) {
      console.error('Forgot password email error:', mailError);
      await cleanupResetRecords(email);
      return res.status(500).json({ message: 'Failed to send reset email.' });
    }

    return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/verify-reset-otp', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    const { data, error } = await getLatestResetRecord(email);

    if (error) {
      console.error('Verify OTP error:', error);
      return res.status(500).json({ message: 'Failed to verify reset code.' });
    }

    const validationError = validateResetRecord(data, otp);
    if (validationError) {
      return res.status(validationError.status).json({ message: validationError.message });
    }

    return res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    const { data: resetRecord, error: resetLookupError } = await getLatestResetRecord(email);

    if (resetLookupError) {
      console.error('Reset password lookup error:', resetLookupError);
      return res.status(500).json({ message: 'Failed to verify reset code.' });
    }

    const validationError = validateResetRecord(resetRecord, otp);
    if (validationError) {
      return res.status(validationError.status).json({ message: validationError.message });
    }

    const { user, error: userError } = await findUserByEmail(email);

    if (userError) {
      console.error('Reset password user lookup error:', userError);
      return res.status(500).json({ message: 'Failed to look up user.' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error('Reset password update error:', updateError);
      return res.status(500).json({ message: 'Failed to update password.' });
    }

    const { error: markUsedError } = await supabaseAdmin
      .from('email_otps')
      .delete()
      .eq('email', email);

    if (markUsedError) {
      console.warn('Password reset mark-used warning:', markUsedError.message);
    }

    return res.status(200).json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;