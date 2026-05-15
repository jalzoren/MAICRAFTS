// register.js
import express from "express";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import supabase from "../supabaseClient.js";
import { createAuditLog } from "../services/auditService.js";

const router = express.Router();

router.post("/verify-otp", async (req, res) => {
  const { email, otp, password, first_name, last_name } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP required" });
  }

  try {
    const { data, error } = await supabase
      .from("email_otps")
      .select("*")
      .eq("email", email)
      .eq("otp", otp)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const now = new Date();
    if (now > new Date(data.expires_at)) {
      return res.status(400).json({ error: "OTP expired" });
    }

    await createAuditLog({
      user_id: null,
      user_email: email,
      user_role: "CUSTOMER",
      action: "UPDATE",
      module: "AUTH",
      description: "OTP successfully verified",
    });

    await supabase.from("email_otps").delete().eq("id", data.id);

    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authUser.user.id;

    await supabase.from("users").insert({
      id: userId,
      email,
      first_name,
      last_name,
      is_verified: true,
      is_active: false,
    });

    await createAuditLog({
      user_id: userId,
      user_email: email,
      user_role: "CUSTOMER",
      action: "CREATE",
      module: "USER",
      description: "Customer account created after OTP verification",
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    const token = uuidv4();

    await supabase.from("email_verifications").insert({
      id: uuidv4(),
      user_id: userId,
      token,
      created_at: new Date(),
      is_used: false, // Explicitly set to false
      expires_at: expiresAt.toISOString(), // Explicitly set expiration
    });

    await createAuditLog({
      user_id: userId,
      user_email: email,
      user_role: "CUSTOMER",
      action: "CREATE",
      module: "AUTH",
      description: "Email verification link generated",
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const confirmURL = `http://localhost:5000/api/verify-email?token=${token}`;

    await transporter.sendMail({
      from: `"Maicrafts" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Activate your account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
                    border: 1px solid #e0c896; border-radius: 12px; overflow: hidden;">
          
          <div style="background: #4b2e16; padding: 24px; text-align: center;">
            <h1 style="color: #E6BB71; margin: 0; letter-spacing: 4px;">MAICRAFTS</h1>
          </div>
    
          <div style="background: #E6BB71; padding: 32px; text-align: center;">
            <h2 style="color: #4b2e16; margin-top: 0;">Activate Your Email</h2>
            <p style="color: #4b2e16;">
              Thank you for signing up! Please activate your email address by clicking the button below.
            </p>
    
            <a href="${confirmURL}" 
               style="display: inline-block; margin-top: 24px; padding: 14px 28px;
                      background: #4b2e16; color: #E6BB71; text-decoration: none;
                      border-radius: 8px; font-weight: bold;">
              Activate Email
            </a>
    
            <p style="color: #7a5c3a; font-size: 13px; margin-top: 24px;">
              If you didn't create an account, you can safely ignore this email.
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

    return res.json({
      message: "OTP verified, user created, activation email sent",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;