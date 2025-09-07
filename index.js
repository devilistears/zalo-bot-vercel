// index.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// === CONFIGURATION (CẤU HÌNH) ===
const ZALO_ACCESS_TOKEN = '224522826880768378:RZCXDMDnyslPycjcweVIRwtePKDcctuMZawfQFxgLeZHLYXZXTaRcZzTlIuryRuA'; // Thay bằng Access Token của bạn
const ZALO_API_URL = 'https://openapi.zalo.me/v2.0/oa/message';

// === MAIN LOGIC (LOGIC CHÍNH) ===
app.post('/', async (req, res) => {
  const data = req.body;

  // Zalo sẽ gửi một đối tượng JSON
  const userId = data.sender.id;
  const eventName = data.event_name;
  const messageText = (data.message && data.message.text) ? data.message.text : null;

  if (eventName === 'user_send_text' && messageText) {
    if (messageText.toLowerCase() === 'hello') {
      await sendZaloMessage(userId, 'Xin chào! Bạn cần giúp gì?');
    } else {
      await sendZaloMessage(userId, 'Tôi chỉ hiểu từ khóa "hello" thôi. 😊');
    }
  }

  res.status(200).send('ok');
});

// === HELPER FUNCTION (HÀM HỖ TRỢ) ===
const sendZaloMessage = async (userId, message) => {
  const payload = {
    recipient: {
      user_id: userId,
    },
    message: {
      text: message,
    },
  };

  const headers = {
    'access_token': ZALO_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };

  try {
    await axios.post(ZALO_API_URL, payload, { headers });
  } catch (error) {
    console.error('Error sending message:', error.response ? error.response.data : error.message);
  }
};

// Vercel sẽ tự động khởi động server, bạn không cần chạy app.listen()
// module.exports = app;