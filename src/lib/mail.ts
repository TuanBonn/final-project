import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOrderConfirmationEmail = async (
  toEmail: string,
  orderId: string,
  productName: string,
  amount: number,
  quantity: number
) => {
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ea580c; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Order Confirmation</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>Hello,</p>
          <p>Thank you for shopping at <strong>Model Car Marketplace</strong>. Your order has been successfully recorded.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Order ID:</strong> <span style="font-family: monospace;">${orderId}</span></p>
            <p style="margin: 5px 0;"><strong>Product:</strong> ${productName}</p>
            <p style="margin: 5px 0;"><strong>Quantity:</strong> ${quantity}</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0;"/>
            <p style="margin: 5px 0; font-size: 1.1em;"><strong>Total amount:</strong> <span style="color: #ea580c; font-weight: bold;">${formattedAmount}</span></p>
          </div>
  
          <p>The seller will confirm and ship your order shortly.</p>
          <p>You can track your order status in <a href="${process.env.NEXT_PUBLIC_BASE_URL}/orders" style="color: #ea580c;">My Orders</a>.</p>
          
          <p style="margin-top: 30px; font-size: 0.9em; color: #6b7280;">Best regards,<br/>Admin Team.</p>
        </div>
      </div>
    `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: toEmail,
      subject: `[New Order] ${productName} - ${formattedAmount}`,
      html: htmlContent,
    });
    console.log("📧 Email sent successfully to", toEmail);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};

export const sendWalletTransactionEmail = async (
  toEmail: string,
  type: "deposit" | "withdrawal",
  status: "succeeded" | "failed",
  amount: number,
  username: string
) => {
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

  const isDeposit = type === "deposit";
  const isSuccess = status === "succeeded";

  let title = "";
  let message = "";
  let color = "";

  if (isDeposit) {
    if (isSuccess) {
      title = "Deposit Successful";
      message = `We have received your deposit of <strong>${formattedAmount}</strong>. Your wallet balance has been updated.`;
      color = "#16a34a";
    } else {
      title = "Deposit Failed";
      message = `Your deposit request of <strong>${formattedAmount}</strong> has been cancelled. Please contact Admin if you have any questions.`;
      color = "#dc2626";
    }
  } else {
    if (isSuccess) {
      title = "Withdrawal Successful";
      message = `Admin has transferred <strong>${formattedAmount}</strong> to your bank account. Please check your banking app.`;
      color = "#16a34a";
    } else {
      title = "Withdrawal Rejected";
      message = `Your withdrawal request of <strong>${formattedAmount}</strong> was rejected. The amount has been refunded to your wallet.`;
      color = "#dc2626";
    }
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${color}; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">${title}</h2>
      </div>
      
      <div style="padding: 20px;">
        <p>Hello <strong>${username}</strong>,</p>
        <p>${message}</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
           <p style="font-size: 1.2em; margin: 0;">Amount: <span style="color: ${color}; font-weight: bold;">${formattedAmount}</span></p>
        </div>

        <p>You can check your transaction history in <a href="${process.env.NEXT_PUBLIC_BASE_URL}/wallet" style="color: ${color};">My Wallet</a>.</p>
        
        <p style="margin-top: 30px; font-size: 0.9em; color: #6b7280;">Best regards,<br/>Admin Team.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: toEmail,
      subject: `[Wallet] ${title} - ${formattedAmount}`,
      html: htmlContent,
    });
    console.log(`📧 Wallet Email sent to ${toEmail} (${type} - ${status})`);
  } catch (error) {
    console.error("❌ Error sending wallet email:", error);
  }
};

export const sendPasswordResetEmail = async (
  toEmail: string,
  token: string,
  username: string
) => {
  const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">Password Reset Request</h2>
      </div>
      
      <div style="padding: 20px;">
        <p>Hello <strong>${username}</strong>,</p>
        <p>We received a request to reset your account password.</p>
        <p>Please click the button below to set a new password (the link is valid for 1 hour):</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>

        <p style="font-size: 0.9em; color: #666;">Or copy this link:<br/> <a href="${resetLink}">${resetLink}</a></p>
        
        <p>If you did not request this, please ignore this email.</p>
        <p style="margin-top: 30px; font-size: 0.9em; color: #6b7280;">Best regards,<br/>Admin Team.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: toEmail,
      subject: "[Model Marketplace] Password Reset Instructions",
      html: htmlContent,
    });
    console.log(`📧 Reset Password Email sent to ${toEmail}`);
  } catch (error) {
    console.error("❌ Error sending reset email:", error);
  }
};
