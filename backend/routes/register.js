import express from "express";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import supabase from "../supabaseClient.js";
import axios from "axios"; // <- needed for captcha

const router = express.Router();

router.post("/register", async (req, res) => {
  const { first_name, last_name, email, password, captcha } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!captcha) {
    return res.status(400).json({ error: "Captcha is required" });
  }

  // 1️⃣ Verify Google reCAPTCHA
  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${captcha}`
    );

    if (!response.data.success) {
      return res.status(400).json({ error: "Captcha verification failed" });
    }
  } catch (err) {
    console.error("Captcha verification error:", err);
    return res.status(500).json({ error: "Server error during captcha verification" });
  }

  // 2️⃣ Proceed with Supabase registration
  let userId;
  try {
    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      return res.status(400).json({ error: authError.message });
    }

    userId = authUser.user.id;

    // Insert profile info into public.users
    const { error: userInsertError } = await supabase.from("users").insert([{
      id: userId,
      email,
      first_name,
      last_name,
      role: "customer",
      is_verified: false,
    }]);

    if (userInsertError) {
      console.error("Failed to insert into public.users:", userInsertError);

      // Rollback auth usnner
      if (userId) {
        await supabase.auth.admin.deleteUser(userId);
      }

      return res.status(500).json({ error: "Failed to insert user profile" });
    }

    // Generate verification token
    const token = uuidv4();
    const { error: tokenError } = await supabase.from("email_verifications").insert([{
      id: uuidv4(),
      user_id: userId,
      token,
      created_at: new Date(),
    }]);

    if (tokenError) {
      console.error("Failed to insert verification token:", tokenError);
      return res.status(500).json({ error: "Failed to create verification token" });
    }

    // Send verification email
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
      subject: "Activate your email",
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
    return res.status(201).json({ message: "User registered. Check your email to verify." });

  } catch (error) {
    console.error("Unexpected error:", error);

    // Rollback auth user if created
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;