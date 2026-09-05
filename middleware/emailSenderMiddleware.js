// middleware/emailSenderMiddleware.js

import transporter from '../config/emailConfig.js';

/**
 * Send a plain-text email
 * @param {string} to - recipient email
 * @param {string} subject
 * @param {string} text
 */
const sendEmail = async (to, subject, text) => {
   const mailOptions = {
      from: `"MyBank" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
   };

   try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}`);
   } catch (error) {
      console.error('Error sending email:', error.message);
      // Non-fatal — don't throw; just log
   }
};

/**
 * Build and send a transaction confirmation email to the sender
 */
export const sendTransactionEmail = async ({ toEmail, customerName, transactionId, amount, fromAccount, toAccount, recipientName, status, timestamp }) => {
   const subject = `MyBank — Transfer ${status === 'SUCCESS' ? 'Successful' : 'Update'} | ${transactionId}`;

   const text = `
Dear ${customerName},

Your fund transfer has been processed.

─────────────────────────────────
TRANSACTION RECEIPT
─────────────────────────────────
Transaction ID : ${transactionId}
Status         : ${status}
Amount         : ₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
From Account   : ${fromAccount}
To Account     : ${toAccount}
Recipient Name : ${recipientName || 'N/A'}
Date & Time    : ${timestamp || new Date().toISOString()}
─────────────────────────────────

If you did not initiate this transfer, please contact MyBank support immediately.

Thank you for banking with MyBank.

MyBank Customer Support
`;

   await sendEmail(toEmail, subject, text);
};

export default sendEmail;
