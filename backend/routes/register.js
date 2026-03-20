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
      email_confirm: false,
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

      // Rollback auth user
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
      from: '"MAICRAFTS" <no-reply@maicrafts.com>',
      to: email,
      subject: "Confirm your email",
      html: `
        <h2>Confirm your email</h2>
        <p>Click this link to verify your account:</p>
        <a href="${confirmURL}">Verify Email</a>
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