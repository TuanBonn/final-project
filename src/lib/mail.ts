// src/lib/mail.ts
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

// ... (Hàm sendOrderConfirmationEmail cũ giữ nguyên) ...
export const sendOrderConfirmationEmail = async (
  toEmail: string,
  orderId: string,
  productName: string,
  amount: number,
  quantity: number
) => {
  // ... (Code cũ giữ nguyên)
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ea580c; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Xác Nhận Đơn Hàng</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>Xin chào,</p>
          <p>Cảm ơn bạn đã mua hàng tại <strong>Sàn Giao Dịch Mô Hình Xe</strong>. Đơn hàng của bạn đã được hệ thống ghi nhận thành công.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Mã đơn hàng:</strong> <span style="font-family: monospace;">${orderId}</span></p>
            <p style="margin: 5px 0;"><strong>Sản phẩm:</strong> ${productName}</p>
            <p style="margin: 5px 0;"><strong>Số lượng:</strong> ${quantity}</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0;"/>
            <p style="margin: 5px 0; font-size: 1.1em;"><strong>Tổng thanh toán:</strong> <span style="color: #ea580c; font-weight: bold;">${formattedAmount}</span></p>
          </div>
  
          <p>Người bán sẽ sớm xác nhận và tiến hành giao hàng cho bạn.</p>
          <p>Bạn có thể theo dõi trạng thái đơn hàng tại mục <a href="${process.env.NEXT_PUBLIC_BASE_URL}/orders" style="color: #ea580c;">Đơn hàng của tôi</a>.</p>
          
          <p style="margin-top: 30px; font-size: 0.9em; color: #6b7280;">Trân trọng,<br/>Đội ngũ Admin.</p>
        </div>
      </div>
    `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: toEmail,
      subject: `[Đơn hàng mới] ${productName} - ${formattedAmount}`,
      html: htmlContent,
    });
    console.log("📧 Email sent successfully to", toEmail);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};

// === THÊM HÀM MỚI ===
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
      title = "Nạp tiền thành công";
      message = `Hệ thống đã nhận được khoản nạp <strong>${formattedAmount}</strong> của bạn. Số dư ví đã được cập nhật.`;
      color = "#16a34a"; // Green
    } else {
      title = "Nạp tiền thất bại";
      message = `Yêu cầu nạp tiền <strong>${formattedAmount}</strong> của bạn đã bị hủy. Nếu có thắc mắc, vui lòng liên hệ Admin.`;
      color = "#dc2626"; // Red
    }
  } else {
    // Withdrawal
    if (isSuccess) {
      title = "Rút tiền thành công";
      message = `Admin đã chuyển khoản <strong>${formattedAmount}</strong> vào tài khoản ngân hàng của bạn. Vui lòng kiểm tra app ngân hàng.`;
      color = "#16a34a";
    } else {
      title = "Rút tiền bị từ chối";
      message = `Yêu cầu rút tiền <strong>${formattedAmount}</strong> của bạn đã bị từ chối. Số tiền đã được hoàn lại vào ví của bạn.`;
      color = "#dc2626";
    }
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${color}; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">${title}</h2>
      </div>
      
      <div style="padding: 20px;">
        <p>Xin chào <strong>${username}</strong>,</p>
        <p>${message}</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
           <p style="font-size: 1.2em; margin: 0;">Số tiền: <span style="color: ${color}; font-weight: bold;">${formattedAmount}</span></p>
        </div>

        <p>Bạn có thể kiểm tra lịch sử giao dịch tại mục <a href="${process.env.NEXT_PUBLIC_BASE_URL}/wallet" style="color: ${color};">Ví của tôi</a>.</p>
        
        <p style="margin-top: 30px; font-size: 0.9em; color: #6b7280;">Trân trọng,<br/>Đội ngũ Admin.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: toEmail,
      subject: `[Ví điện tử] ${title} - ${formattedAmount}`,
      html: htmlContent,
    });
    console.log(`📧 Wallet Email sent to ${toEmail} (${type} - ${status})`);
  } catch (error) {
    console.error("❌ Error sending wallet email:", error);
  }
};
