// utils/emailService.js
const nodemailer = require('nodemailer');

// Configure transporter based on environment
let transporter;

if (process.env.NODE_ENV === 'production') {
  // Production configuration with real SMTP server
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
} else {
  // Development configuration - log emails instead of sending
  transporter = {
    sendMail: (mailOptions) => {
      console.log('------- EMAIL WOULD BE SENT IN PRODUCTION -------');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Content:', mailOptions.html || mailOptions.text);
      console.log('------------------------------------------------');
      return Promise.resolve({ messageId: 'dev-mode-' + Date.now() });
    }
  };
}

/**
 * Send event confirmation email with promo code
 * @param {string} email Recipient email
 * @param {Object} event Event data
 * @param {Object} reservation Reservation data
 * @param {string} promoCode Promotional code
 * @returns {Promise<boolean>} Success status
 */
const sendEventConfirmation = async (email, event, reservation, promoCode) => {
  try {
    const emailContent = `
      <h2>Confirmation de réservation</h2>
      <p>Bonjour ${reservation.fullName},</p>
      <p>Votre réservation pour l'événement <strong>${event.title}</strong> a été confirmée.</p>
      
      <h3>Détails de l'événement:</h3>
      <ul>
        <li><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString('fr-FR')}</li>
        <li><strong>Heure:</strong> ${new Date(event.startDate).toLocaleTimeString('fr-FR')}</li>
        <li><strong>Lieu:</strong> ${event.location.address || ''}, ${event.location.city || ''}</li>
      </ul>
      
      <p><strong>Votre code promo:</strong> ${promoCode}</p>
      <p>Utilisez ce code lors de votre prochain achat sur notre plateforme pour bénéficier d'une réduction!</p>
      
      <p>Merci d'avoir choisi Brima Souk!</p>
    `;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Brima Souk" <no-reply@brimasouk.com>',
      to: email,
      subject: `Confirmation de réservation: ${event.title}`,
      html: emailContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

/**
 * Send order confirmation email
 * @param {string} email Recipient email
 * @param {Object} order Order data
 * @returns {Promise<boolean>} Success status
 */
const sendOrderConfirmation = async (email, order) => {
  try {
    // Generate items HTML
    const itemsHtml = order.items.map(item => `
      <tr>
        <td>${item.product.name}</td>
        <td>${item.quantity}</td>
        <td>${item.price.toFixed(2)} TND</td>
        <td>${item.totalPrice.toFixed(2)} TND</td>
      </tr>
    `).join('');
    
    const emailContent = `
      <h2>Confirmation de commande</h2>
      <p>Bonjour ${order.shippingAddress.fullName},</p>
      <p>Nous vous remercions pour votre commande. Voici les détails:</p>
      
      <h3>Détails de la commande #${order._id}:</h3>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <th>Produit</th>
          <th>Quantité</th>
          <th>Prix unitaire</th>
          <th>Total</th>
        </tr>
        ${itemsHtml}
        <tr>
          <td colspan="3" align="right"><strong>Sous-total:</strong></td>
          <td>${order.subtotal.toFixed(2)} TND</td>
        </tr>
        <tr>
          <td colspan="3" align="right"><strong>Frais de livraison:</strong></td>
          <td>${order.shippingCost.toFixed(2)} TND</td>
        </tr>
        ${order.discount > 0 ? `
        <tr>
          <td colspan="3" align="right"><strong>Réduction:</strong></td>
          <td>-${order.discount.toFixed(2)} TND</td>
        </tr>` : ''}
        <tr>
          <td colspan="3" align="right"><strong>Total:</strong></td>
          <td>${order.totalAmount.toFixed(2)} TND</td>
        </tr>
      </table>
      
      <h3>Adresse de livraison:</h3>
      <p>
        ${order.shippingAddress.addressLine1}<br>
        ${order.shippingAddress.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
        ${order.shippingAddress.city}, ${order.shippingAddress.region}<br>
        ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}<br>
        Téléphone: ${order.shippingAddress.phone}
      </p>
      
      <p>Merci d'avoir choisi Brima Souk!</p>
    `;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Brima Souk" <no-reply@brimasouk.com>',
      to: email,
      subject: `Confirmation de commande #${order._id}`,
      html: emailContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent:', info.messageId);
    
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return false;
  }
};

module.exports = {
  sendEventConfirmation,
  sendOrderConfirmation
};