import nodemailer from "nodemailer";

export const sendWelcomeEmail = async ({ email, password, fullName }) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  
    await transporter.sendMail({
        from: `"Maicrafts" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Your Account Has Been Created",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
                      border: 1px solid #e0c896; border-radius: 12px; overflow: hidden;">
            
            <!-- HEADER -->
            <div style="background: #4b2e16; padding: 24px; text-align: center;">
              <h1 style="color: #E6BB71; margin: 0; letter-spacing: 4px;">MAICRAFTS</h1>
            </div>
      
            <!-- BODY -->
            <div style="background: #E6BB71; padding: 32px; text-align: center;">
              <h2 style="color: #4b2e16; margin-top: 0;">Welcome ${fullName || "User"}</h2>
              
              <p style="color: #4b2e16;">
                Your account has been successfully created by the administrator.
              </p>
      
              <p style="color: #4b2e16; font-size: 15px;">
                Here is your temporary login password:
              </p>
      
              <div style="background: #fff; padding: 12px 20px; display: inline-block;
                          border-radius: 8px; margin-top: 10px; font-weight: bold;
                          color: #4b2e16; letter-spacing: 1px;">
                ${password}
              </div>
      
              <p style="color: #7a5c3a; font-size: 13px; margin-top: 24px;">
                Please log in and change your password immediately for security purposes.
              </p>
            </div>
      
            <!-- FOOTER -->
            <div style="background: #4b2e16; padding: 16px; text-align: center;">
              <p style="color: #E6BB71; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Maicrafts. All rights reserved.
              </p>
            </div>
      
          </div>
        `,
      });
  };