import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import supabase, { supabaseAdmin } from '../supabaseClient.js'; 
import { createAuditLog } from '../services/auditService.js';

const router = express.Router();

// ========== AUTH MIDDLEWARE ==========
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔐 [forgotPassword] Auth Header:', authHeader ? 'Present' : 'Missing');
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
      
      console.log('✅ [forgotPassword] Authenticated user:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      });
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
    .select('id, email, role') 
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

      await createAuditLog({
        user_id: null,
        user_email: email,
        user_role: 'CUSTOMER',
        action: 'ERROR',
        module: 'PASSWORD_RESET',
        description: `Password reset request failed: Database error - ${userError.message}`,
      });

      return res.status(500).json({ message: 'Failed to verify email.' });
    }

    if (!user) {
      await createAuditLog({
        user_id: null,
        user_email: email,
        user_role: 'CUSTOMER',
        action: 'REQUEST',
        module: 'PASSWORD_RESET',
        description: `Password reset requested for non-existent email: ${email}`,
      });

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

      await createAuditLog({
        user_id: user.id,
        user_email: email,
        user_role: user.role || 'CUSTOMER',
        action: 'ERROR',
        module: 'PASSWORD_RESET',
        description: `Failed to generate reset OTP for ${email}`,
      });

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


      await createAuditLog({
        user_id: user.id,
        user_email: email,
        user_role: user.role || 'CUSTOMER',
        action: 'REQUEST',
        module: 'PASSWORD_RESET',
        description: `Password reset OTP sent to ${email}`,
      });

    } catch (mailError) {
      console.error('Forgot password email error:', mailError);
      await cleanupResetRecords(email);

      await createAuditLog({
        user_id: user.id,
        user_email: email,
        user_role: user.role || 'CUSTOMER',
        action: 'ERROR',
        module: 'PASSWORD_RESET',
        description: `Failed to send reset email to ${email}: ${mailError.message}`,
      });

      return res.status(500).json({ message: 'Failed to send reset email.' });
    }

    return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
  } catch (err) {
    console.error('Forgot password error:', err);

    await createAuditLog({
      user_id: null,
      user_email: email,
      user_role: 'CUSTOMER',
      action: 'ERROR',
      module: 'PASSWORD_RESET',
      description: `Forgot password error: ${err.message}`,
    });

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
    const { user } = await findUserByEmail(email);
    const { data, error } = await getLatestResetRecord(email);

    if (error) {
      console.error('Verify OTP error:', error);

      await createAuditLog({
        user_id: user?.id || null,
        user_email: email,
        user_role: user?.role || 'CUSTOMER',
        action: 'ERROR',
        module: 'PASSWORD_RESET',
        description: `OTP verification database error: ${error.message}`,
      });

      return res.status(500).json({ message: 'Failed to verify reset code.' });
    }

    const validationError = validateResetRecord(data, otp);
    if (validationError) {

      await createAuditLog({
        user_id: user?.id || null,
        user_email: email,
        user_role: user?.role || 'CUSTOMER',
        action: 'FAILED',
        module: 'PASSWORD_RESET',
        description: `OTP verification failed for ${email}: ${validationError.message}`,
      });

      return res.status(validationError.status).json({ message: validationError.message });
    }

    await createAuditLog({
      user_id: user?.id || null,
      user_email: email,
      user_role: user?.role || 'CUSTOMER',
      action: 'VERIFY',
      module: 'PASSWORD_RESET',
      description: `OTP verified successfully for ${email}`,
    });


    return res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    
    await createAuditLog({
      user_id: null,
      user_email: email,
      user_role: 'CUSTOMER',
      action: 'ERROR',
      module: 'PASSWORD_RESET',
      description: `OTP verification error: ${err.message}`,
    });

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
    const { user, error: userError } = await findUserByEmail(email);
    const { data: resetRecord, error: resetLookupError } = await getLatestResetRecord(email);

    if (resetLookupError) {
      console.error('Reset password lookup error:', resetLookupError);
       // ✅ ADD AUDIT LOG
       await createAuditLog({
        user_id: user?.id || null,
        user_email: email,
        user_role: user?.role || 'CUSTOMER',
        action: 'ERROR',
        module: 'PASSWORD_RESET',
        description: `Reset record lookup error: ${resetLookupError.message}`,
      });

      return res.status(500).json({ message: 'Failed to verify reset code.' });
    }

    const validationError = validateResetRecord(resetRecord, otp);
    if (validationError) {

      await createAuditLog({
        user_id: user?.id || null,
        user_email: email,
        user_role: user?.role || 'CUSTOMER',
        action: 'FAILED',
        module: 'PASSWORD_RESET',
        description: `Password reset failed for ${email}: ${validationError.message}`,
      });

      return res.status(validationError.status).json({ message: validationError.message });
    }


    if (userError) {
      console.error('Reset password user lookup error:', userError);

       // ✅ ADD AUDIT LOG
       await createAuditLog({
        user_id: null,
        user_email: email,
        user_role: 'CUSTOMER',
        action: 'ERROR',
        module: 'PASSWORD_RESET',
        description: `Password reset user lookup error: ${userError.message}`,
      });

      return res.status(500).json({ message: 'Failed to look up user.' });
    }

    if (!user) {

       // ✅ ADD AUDIT LOG
       await createAuditLog({
        user_id: null,
        user_email: email,
        user_role: 'CUSTOMER',
        action: 'FAILED',
        module: 'PASSWORD_RESET',
        description: `Password reset failed: User not found for ${email}`,
      });

      return res.status(404).json({ message: 'User not found.' });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error('Reset password update error:', updateError);
        // ✅ ADD AUDIT LOG
        await createAuditLog({
          user_id: user.id,
          user_email: email,
          user_role: user.role || 'CUSTOMER',
          action: 'ERROR',
          module: 'PASSWORD_RESET',
          description: `Password update failed for ${email}: ${updateError.message}`,
        });

      return res.status(500).json({ message: 'Failed to update password.' });
    }

    const { error: markUsedError } = await supabaseAdmin
      .from('email_otps')
      .delete()
      .eq('email', email);

    if (markUsedError) {
      console.warn('Password reset mark-used warning:', markUsedError.message);
    }

    await cleanupResetRecords(email);

    // ✅ SUCCESSFUL PASSWORD RESET AUDIT
    await createAuditLog({
      user_id: user.id,
      user_email: email,
      user_role: user.role || 'CUSTOMER',
      action: 'RESET',
      module: 'PASSWORD_RESET',
      description: `Password reset successfully for ${email}`,
    });

    return res.status(200).json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;