// index.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.json());

// === CONFIGURATION (CẤU HÌNH) ===
const ZALO_ACCESS_TOKEN = '224522826880768378:KNwjuyEbFXvjroVTFJBivjWCxSkYgiBrhWcEcklJCpQLhtjystHGHxSTBDbfztho'; 
const ZALO_API_URL = 'https://openapi.zalo.me/v2.0/oa/message';

// Cấu hình Google Sheets
const GOOGLE_SHEET_ID = '17oKkd8uZ4HR8RAMu06xUz-BFrZI2e3DF8pR9XUa222M'; 
// Đặt tên sheet cần tìm kiếm vào đây
const SEARCH_SHEET_NAME = 'VaiDinhHinh_ZaloBot'; // Thay 'Sheet1' bằng tên sheet của bạn

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  }),
});

// === MAIN LOGIC (LOGIC CHÍNH) ===
app.post('/', async (req, res) => {
  const data = req.body;

  const userId = data.sender.id;
  const eventName = data.event_name;
  const messageText = (data.message && data.message.text) ? data.message.text : null;

  if (eventName === 'user_send_text' && messageText) {
    // Nếu người dùng gõ "hello", bot sẽ chào
    if (messageText.toLowerCase() === 'hello') {
      await sendTextZaloMessage(userId, 'Xin chào! Bạn cần giúp gì?');
    }
    // Xử lý yêu cầu hiển thị ảnh khi người dùng nhấn nút
    else if (messageText.toLowerCase().startsWith('show_image:')) {
      const imageUrl = messageText.substring(11).trim();
      await sendImageZaloMessage(userId, imageUrl);
    }
    // Nếu không phải "hello" hay "show_image", bot sẽ tự động tìm kiếm
    else {
      await handleSearchRequest(userId, messageText);
    }
  }
  
  res.status(200).send('ok');
});

// === HELPER FUNCTION (HÀM HỖ TRỢ) ===
const handleSearchRequest = async (userId, searchTerm) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SEARCH_SHEET_NAME}!B:P`, // Dùng biến hằng số để chỉ định sheet
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      await sendTextZaloMessage(userId, `Không tìm thấy dữ liệu trong sheet "${SEARCH_SHEET_NAME}".`);
      return;
    }
    
    for (const row of rows) {
      if (row[0] && row[0].toLowerCase().includes(searchTerm.toLowerCase())) {
        const resultColumns = row.slice(2, 14).filter(Boolean); 
        let messageText = resultColumns.join('\n');

        const imageUrl = row[14] ? row[14].trim() : '';

        if (imageUrl) {
          const buttonText = "Xem thêm về vải mẫu";
          const payload = {
            recipient: {
              user_id: userId,
            },
            message: {
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'template',
                  elements: [{
                    title: messageText,
                    subtitle: 'Nhấn nút để xem ảnh',
                    buttons: [{
                      title: buttonText,
                      type: 'query_show',
                      payload: {
                        template_type: 'template',
                        message: `show_image: ${imageUrl}`,
                        action_title: 'Xem ảnh',
                      },
                    }],
                  }],
                },
              },
            },
          };
          await sendZaloMessage(userId, payload);
        } else {
          await sendTextZaloMessage(userId, messageText);
        }
        return;
      }
    }
    
    await sendTextZaloMessage(userId, `Không tìm thấy kết quả nào cho "${searchTerm}".`);
  } catch (error) {
    console.error('Error searching Google Sheets:', error.message);
    await sendTextZaloMessage(userId, 'Đã có lỗi xảy ra khi tìm kiếm.');
  }
};

const sendTextZaloMessage = async (userId, message) => {
  const payload = {
    recipient: {
      user_id: userId,
    },
    message: {
      text: message,
    },
  };
  await sendZaloMessage(userId, payload);
};

const sendImageZaloMessage = async (userId, imageUrl) => {
  const payload = {
    recipient: {
      user_id: userId,
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'media',
          elements: [{
            media_type: 'image',
            url: imageUrl,
          }],
        },
      },
    },
  };
  await sendZaloMessage(userId, payload);
};

const sendZaloMessage = async (userId, payload) => {
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

module.exports = app;
