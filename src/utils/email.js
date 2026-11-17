const nodemailer = require('nodemailer');
const config = require('../config/env');

/**
 * Gửi mail đặt lại mật khẩu.
 * - Có SMTP_HOST: gửi thật.
 * - Không có SMTP_HOST: ở dev in link ra console (production thì không in vì link là bí mật).
 * Trả về { delivered: boolean }.
 */
async function sendResetPasswordEmail(to, link) {
  if (!config.smtp.host) {
    if (config.env !== 'production') {
      console.log(`[email] Chưa cấu hình SMTP. Link đặt lại mật khẩu cho ${to}: ${link}`);
    }
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject: 'Đặt lại mật khẩu',
    text: `Bạn vừa yêu cầu đặt lại mật khẩu. Mở liên kết sau trong vòng 30 phút:\n${link}\n\nNếu không phải bạn, hãy bỏ qua email này.`,
    html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu. Liên kết có hiệu lực trong 30 phút:</p><p><a href="${link}">${link}</a></p><p>Nếu không phải bạn, hãy bỏ qua email này.</p>`,
  });
  return { delivered: true };
}

module.exports = { sendResetPasswordEmail };
