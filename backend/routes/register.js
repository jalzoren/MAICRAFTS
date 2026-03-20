import express from "express";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import supabase from "../supabaseClient.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  let userId; // Will hold the auth user id

  try {
    // 1️⃣ Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // user will confirm via email
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      return res.status(400).json({ error: authError.message });
    }

    userId = authUser.user.id;
    console.log("Auth user created with ID:", userId);

    // 2️⃣ Insert profile info into public.users
    const { error: userInsertError } = await supabase
      .from("users")
      .insert([{
        id: userId,
        email: email, 
        first_name,
        last_name,
        role: "customer",
        is_verified: false
      }]);

    if (userInsertError) {
      console.error("Failed to insert into public.users:", userInsertError);

      // Rollback auth user if public.users insert fails
      if (userId) {
        await supabase.auth.admin.deleteUser(userId);
      }

      return res.status(500).json({ error: "Failed to insert user profile" });
    }

    // 3️⃣ Generate a confirmation token (uuid)
    const token = uuidv4();

    // Save token in email_verifications table
    const { error: tokenError } = await supabase.from("email_verifications").insert([{
      id: uuidv4(),
      user_id: userId,
      token,
      created_at: new Date()
    }]);

    if (tokenError) {
      console.error("Failed to insert verification token:", tokenError);
      return res.status(500).json({ error: "Failed to create verification token" });
    }

    // 4️⃣ Send verification email via Nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER, // your email
        pass: process.env.SMTP_PASS, // app password if using Gmail
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

    res.status(201).json({ message: "User registered. Check your email to verify." });

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

    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;