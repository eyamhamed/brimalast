// utils/paymentService.js
const axios = require('axios');
const crypto = require('crypto');

class PaymentService {
  constructor() {
    this.apiBaseUrl = process.env.EPAY_API_URL || 'https://api.epay-attijari.sandbox';
    this.merchantId = process.env.EPAY_MERCHANT_ID || 'test_merchant';
    this.secretKey = process.env.EPAY_SECRET_KEY || 'test_secret_key';
  }

  /**
   * Create a payment session for e-pay Attijari
   * @param {Object} order Order information
   * @returns {Promise<Object>} Payment session info
   */
  async createPaymentSession(order) {
    try {
      // Generate a unique payment reference
      const paymentRef = `BR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Prepare payment data
      const paymentData = {
        merchantId: this.merchantId,
        paymentReference: paymentRef,
        amount: order.totalAmount,
        currency: 'TND',
        description: `Commande Brima Souk #${order.orderId}`,
        returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/confirm`,
        cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`,
        notifyUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/webhook`,
        customerInfo: {
          fullName: order.customerName,
          email: order.customerEmail,
          phoneNumber: order.customerPhone || ''
        },
        metadata: {
          orderId: order.orderId
        }
      };
      
      // In development mode, log the request and return mock data
      if (process.env.NODE_ENV !== 'production') {
        console.log('------- PAYMENT REQUEST (DEV MODE) -------');
        console.log('Payment data:', JSON.stringify(paymentData, null, 2));
        console.log('------------------------------------------');
        
        return {
          success: true,
          paymentUrl: 'https://example.com/mock-payment',
          sessionId: `mock-session-${Date.now()}`,
          paymentReference: paymentRef
        };
      }
      
      // Generate signature using HMAC
      const signature = this.generateSignature(paymentData);
      
      // Send request to e-pay API
      const response = await axios.post(
        `${this.apiBaseUrl}/payments/create`,
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature
          }
        }
      );
      
      return {
        success: true,
        paymentUrl: response.data.paymentUrl,
        sessionId: response.data.sessionId,
        paymentReference: paymentRef
      };
    } catch (error) {
      console.error('Payment creation error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  /**
   * Verify payment status
   * @param {string} sessionId Payment session ID
   * @returns {Promise<Object>} Payment status info
   */
  async verifyPayment(sessionId) {
    try {
      // In development mode, return mock data
      if (process.env.NODE_ENV !== 'production') {
        console.log('------- PAYMENT VERIFICATION (DEV MODE) -------');
        console.log('Verifying session:', sessionId);
        console.log('----------------------------------------------');
        
        return {
          success: true,
          status: 'COMPLETED',
          transactionId: `mock-transaction-${Date.now()}`,
          paymentMethod: 'card'
        };
      }
      
      const signature = this.generateSignature({ sessionId });
      
      const response = await axios.get(
        `${this.apiBaseUrl}/payments/status/${sessionId}`,
        {
          headers: {
            'X-Signature': signature
          }
        }
      );
      
      return {
        success: true,
        status: response.data.status,
        transactionId: response.data.transactionId,
        paymentMethod: response.data.paymentMethod
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  /**
   * Generate HMAC signature for API security
   * @param {Object} data Data to sign
   * @returns {string} HMAC signature
   */
  generateSignature(data) {
    const payload = JSON.stringify(data);
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');
  }
}

module.exports = new PaymentService();