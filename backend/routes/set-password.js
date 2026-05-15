//set-password.js
import express from "express";
import axios from "axios";
import nodemailer from "nodemailer";
import supabase from "../supabaseClient.js";

const router = express.Router();

router.post("/set-password", async (req, res) => {
  const { email, password, captcha } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  if (!captcha) {
    return res.status(400).json({ error: "Captcha required" });
  }

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

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 60 * 1000);

  try {
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
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
                  border: 1px solid #e0c896; border-radius: 12px; overflow: hidden;">
        
        <!-- Header -->
        <div style="background: #4b2e16; padding: 24px; text-align: center;">
          <h1 style="color: #E6BB71; margin: 0; letter-spacing: 4px;">MAICRAFTS</h1>
        </div>
    
        <!-- Body -->
        <div style="background: #E6BB71; padding: 32px; text-align: center;">
          
          <h2 style="color: #4b2e16; margin-top: 0;">Verification Code</h2>
          
          <p style="color: #4b2e16; margin-bottom: 20px;">
            Use the code below to verify your email address.
          </p>
    
          <!-- OTP BOX -->
          <div style="display: inline-block; padding: 16px 28px;
                      background: #fff3d6; border: 2px dashed #4b2e16;
                      border-radius: 10px; margin-bottom: 20px;">
            <h1 style="letter-spacing: 8px; margin: 0; color: #4b2e16;">
              ${otp}
            </h1>
          </div>
    
          <p style="color: #7a5c3a; font-size: 13px; margin-top: 16px;">
            This code will expire in <b>1 minute</b>.
          </p>
    
          <p style="color: #7a5c3a; font-size: 12px; margin-top: 20px;">
            If you did not request this code, you can safely ignore this email.
          </p>
    
        </div>
    
        <!-- Footer -->
        <div style="background: #4b2e16; padding: 16px; text-align: center;">
          <p style="color: #E6BB71; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Maicrafts. All rights reserved.
          </p>
        </div>
    
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


router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  const { data: lastOtp } = await supabase
    .from("email_otps")
    .select("created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (lastOtp) {
    const lastTime = new Date(lastOtp.created_at).getTime();
    const now = Date.now();

    if (now - lastTime < 60000) {
      return res.status(429).json({
        error: "Please wait before requesting another OTP",
      });
    }
  }

  // 🔢 Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 60 * 1000);

  try {
    // Save new OTP
    const { error } = await supabase
      .from("email_otps")
      .insert({
        email,
        otp,
        expires_at: expiresAt,
      });

    if (error) {
      return res.status(500).json({ error: "Failed to store OTP" });
    }

    // Send email
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
      subject: "Your New OTP Code",
      html: `<h2>Your new OTP is: ${otp}</h2>`,
    });

    return res.json({ message: "OTP resent successfully" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});


export default router;