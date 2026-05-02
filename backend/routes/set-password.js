//set-password.js
import express from "express";
import axios from "axios";
import nodemailer from "nodemailer";
import supabase from "../supabaseClient.js";

const router = express.Router();

router.post("/set-password", async (req, res) => {
  const { email, password, captcha } = req.body;

  // 1. VALIDATION
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  if (!captcha) {
    return res.status(400).json({ error: "Captcha required" });
  }

  // 2. VERIFY CAPTCHA
  try {
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captcha,
        },
      }
    );

    if (!response.data.success) {
      return res.status(400).json({ error: "Captcha failed" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Captcha error" });
  }

  // 3. GENERATE OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 60 * 1000);

  try {
    // 4. STORE OTP IN DB
    const { error: otpError } = await supabase
      .from("email_otps")
      .insert({
        email,
        otp,
        expires_at: expiresAt,
      });

    if (otpError) {
      return res.status(500).json({ error: "Failed to store OTP" });
    }

    // 5. SEND EMAIL
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.VERIFY_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Maicrafts" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `
        <div style="font-family: Arial; text-align:center;">
          <h2>Verification Code</h2>
          <h1 style="letter-spacing:6px;">${otp}</h1>
          <p>This code expires in 5 minutes.</p>
        </div>
      `,
    });

    return res.json({
      message: "OTP sent successfully",
      nextStep: "enter-code",
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});




export default router;