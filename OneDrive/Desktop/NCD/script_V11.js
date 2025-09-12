// --- Configuration ---
// ใส่ Channel Access Token ของคุณที่นี่
const LINE_TOKEN = 'WiYVXDROjNTqHMj34rruDMkXN33Sabjr4Y2hrpgAEC8AAWodhYuOkGL3BpWNuystHYln2u3LU2DR8FV5c1w1kTKVTkTgW/XQWsVGOhnaZKJghJvdv2QwcjmXluqB13i1eqg8h54l5Sh9NAIhOq8bvgdB04t89/1O/w1cDnyilFU=';

// ใส่ Google Sheet ID สำหรับตารางแพทย์ที่นี่ (Sheet เดิม)
const DOCTOR_SCHEDULE_SHEET_ID = '1nCzz1nyTsMr4HmI8vhLwC0X-Pv3X0Y86eB84TkoSWD0';

// ใส่ Google Sheet ID สำหรับตารางบันทึก User ID ของผู้ใช้ที่นี่ (*** สร้าง Sheet ใหม่สำหรับสิ่งนี้ ***)
const USER_LOG_SHEET_ID = '1NDs7_asB3Fv0RaPWt4fsqwqIAemURI_Lw5JyQceicx0';

// URL สำหรับดู Google Sheet (ไม่สามารถแก้ไขได้)
const SHEET_VIEW_URL = `https://docs.google.com/spreadsheets/d/${DOCTOR_SCHEDULE_SHEET_ID}/edit?usp=sharing&rm=minimal`;

// ID ของ Google Calendar สำหรับวันหยุดราชการไทย
const THAI_HOLIDAY_CALENDAR_ID = 'th.th#holiday@group.v.calendar.google.com';
// ---------------------

/**
 * Handles incoming LINE Messaging API webhook events.
 * This is the main function that receives all events from LINE.
 * @param {object} e - The webhook event object.
 */
function doPost(e) {
  try {
    const events = JSON.parse(e.postData.contents).events;

    for (const event of events) {
      // Handle 'follow' event for new users
      if (event.type === 'follow') {
        const userId = event.source.userId;
        saveUserIdToSheet(USER_LOG_SHEET_ID, userId);
        replyToUser(event.replyToken, getWelcomeMessage(), LINE_TOKEN);
        continue; // Move to the next event
      }

      // Handle 'message' event for user texts
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        let responseMessage = null;

        // Check message content and select appropriate response
        if (userMessage === 'ข่าวสารและความรู้ทางอายุรกรรม') {
          responseMessage = getNewsFlexMessage();
        } else if (userMessage === 'ตารางการออกตรวจของแพทย์') {
          if (isTodayGovernmentHoliday()) {
            // Display a holiday message if it's a public holiday
            responseMessage = getGovernmentHolidayFlexMessage(getCurrentDayInThai());
          } else {
            responseMessage = getAppointmentFlexMessage(DOCTOR_SCHEDULE_SHEET_ID, SHEET_VIEW_URL);
          }
        } else if (userMessage === 'การติดต่อสื่อสาร') {
          responseMessage = getContactFlexMessage();
        } else if (isDayQuery(userMessage)) {
          const dayFull = convertDayShortToFull(userMessage);
          if (isGovernmentHolidayFromSheet(dayFull)) {
             // Respond to queries about a holiday from the sheet
             responseMessage = getGovernmentHolidayFlexMessage(dayFull);
          } else {
             // Respond to queries about doctor schedules on a specific day
             responseMessage = getAppointmentByDayFlexMessage(DOCTOR_SCHEDULE_SHEET_ID, userMessage);
          }
        } else {
          // Auto-reply for unhandled messages
          responseMessage = getAutoReplyMessage();
        }

        // Send the reply message
        if (responseMessage) {
          replyToUser(event.replyToken, responseMessage, LINE_TOKEN);
        }
      }
    }
  } catch (error) {
    console.log('Error: ' + error.toString());
  }

  return ContentService.createTextOutput('OK');
}

/**
 * Saves a new user's ID and timestamp to a specified Google Sheet.
 * @param {string} sheetId - The ID of the Google Sheet file.
 * @param {string} userId - The user's ID from LINE.
 */
function saveUserIdToSheet(sheetId, userId) {
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    const now = new Date();
    sheet.appendRow([userId, now]);
    console.log(`Saved User ID: ${userId} to sheet ID: ${sheetId}`);
  } catch (error) {
    console.log('Error saving User ID to sheet: ' + error.toString());
  }
}

/**
 * Checks if today is a public holiday by looking it up in a Google Calendar.
 * @returns {boolean} True if today is a holiday, false otherwise.
 */
function isTodayGovernmentHoliday() {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const calendar = CalendarApp.getCalendarById(THAI_HOLIDAY_CALENDAR_ID);
    if (!calendar) {
      console.log('Error: Google Calendar not found with the specified ID.');
      return false;
    }

    const events = calendar.getEvents(startOfDay, endOfDay);
    return events.length > 0;
  } catch (error) {
    console.log('Error checking Google Calendar: ' + error.toString());
    return false;
  }
}

/**
 * Creates a welcome message for new users.
 * @returns {object} The message object.
 */
function getWelcomeMessage() {
  return {
    "type": "text",
    "text": "🙏 ยินดีต้อนรับครับ 🙏\n\nขอบคุณที่เพิ่มแผนกอายุรกรรม โรงพยาบาลสงฆ์ เป็นเพื่อน\n\nกระผมเป็น LINE Bot ส่งข้อความอัตโนมัติ \n\n📋 ท่านสามารถเลือกเมนูด้านล่างเพื่อรับบริการครับ"
  };
}

// ฟังก์ชันส่งข้อความตอบกลับ
function replyToUser(replyToken, message, token) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const payload = {
    'replyToken': replyToken,
    'messages': [message]
  };

  const options = {
    'method': 'POST',
    'headers': {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    'payload': JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}

// ฟังก์ชันอ่านข้อมูลจาก Google Sheet
function getSheetData(sheetId) {
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    return data;
  } catch (error) {
    console.log('Error reading sheet: ' + error.toString());
    return [];
  }
}

// ฟังก์ชันหาวันปัจจุบันเป็นภาษาไทย
function getCurrentDayInThai() {
  const today = new Date();
  const dayIndex = today.getDay(); // 0=อาทิตย์, 1=จันทร์, ..., 6=เสาร์

  const thaiDays = [
    'อาทิตย์',
    'จันทร์',
    'อังคาร',
    'พุธ',
    'พฤหัสบดี',
    'ศุกร์',
    'เสาร์'
  ];

  return thaiDays[dayIndex];
}

// ฟังก์ชันกรองข้อมูลแพทย์ตามวันปัจจุบัน
function getTodayDoctors(sheetData) {
  const today = getCurrentDayInThai();
  const todayDoctors = [];

  if (sheetData.length > 1) {
    // Start from row 2 (skip header)
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      const doctorName = row[0] || '';
      const day = row[1] || '';
      const time = row[2] || '';
      const room = row[3] || '';
      const specialty = row[4] || ''; // Read column 4 (specialty)

      // Check if the day in the sheet matches the current day
      if (day.includes(today) || day === today) {
        todayDoctors.push({
          name: doctorName,
          day: day,
          time: time,
          room: room,
          specialty: specialty // Add specialty
        });
      }
    }
  }

  return todayDoctors;
}

// ฟังก์ชันตรวจสอบว่าข้อความเป็นการถามเกี่ยวกับวันหรือไม่
function isDayQuery(message) {
  const dayShorts = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
  const cleanMessage = message.trim();
  return dayShorts.includes(cleanMessage);
}

// ฟังก์ชันแปลงชื่อวันแบบย่อเป็นชื่อวันเต็ม
function convertDayShortToFull(dayShort) {
  const dayMapping = {
    'จ': 'จันทร์',
    'อ': 'อังคาร',
    'พ': 'พุธ',
    'พฤ': 'พฤหัสบดี',
    'ศ': 'ศุกร์',
    'ส': 'เสาร์',
    'อา': 'อาทิตย์'
  };

  return dayMapping[dayShort] || dayShort;
}

// ฟังก์ชันตรวจสอบว่าเป็นวันหยุดราชการหรือไม่ (อิงจากข้อมูลใน Sheet)
function isGovernmentHolidayFromSheet(dayFull) {
  // วันหยุดราชการปกติ: เสาร์, อาทิตย์
  const holidays = ['เสาร์', 'อาทิตย์'];
  return holidays.includes(dayFull);
}

// ฟังก์ชันกรองข้อมูลแพทย์ตามวันที่ระบุ
function getDoctorsByDay(sheetData, targetDay) {
  const doctors = [];

  if (sheetData.length > 1) {
    // Start from row 2 (skip header)
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      const doctorName = row[0] || '';
      const day = row[1] || '';
      const time = row[2] || '';
      const room = row[3] || '';
      const specialty = row[4] || ''; // Read column 4 (specialty)

      // Check if the day in the sheet matches the target day
      if (day.includes(targetDay) || day === targetDay) {
        doctors.push({
          name: doctorName,
          day: day,
          time: time,
          room: room,
          specialty: specialty // Add specialty
        });
      }
    }
  }

  return doctors;
}

// ฟังก์ชันสำหรับการตอบข้อความอัตโนมัติ
function getAutoReplyMessage() {
  return {
    "type": "text",
    "text": "🙏 สวัสดีครับพระคุณเจ้า\n\nกระผมเป็น LINE Bot ส่งข้อความอัตโนมัติเท่านั้น \n\nถ้าพระคุณเจ้าอยากทราบเรื่องตารางแพทย์ออกตรวจในแต่ละวัน กระผมจะเรียนแจ้งให้ทราบ \n\nแต่ถ้าเรื่องอื่นๆ ให้ติดต่อทางช่องทางการติดต่อสื่อสารเลยครับผม\n\n📋 กรุณาเลือกเมนูด้านล่างเพื่อรับบริการครับ\n\n📅 ต้องการทราบแพทย์ออกตรวจในวันอะไร พิมพ์ชื่อวัน:\n• จ (จันทร์)\n• อ (อังคาร) \n• พ (พุธ)\n• พฤ (พฤหัสบดี)\n• ศ (ศุกร์)\n\n⚠️ หมายเหตุ: \n• วันหยุดราชการ แพทย์จะไม่ได้ลงตรวจ\n• เวลาการตรวจอาจปรับเปลี่ยนตามสถานการณ์เร่งด่วน"
  };
}

// ฟังก์ชันแสดง Flex Message วันหยุดราชการ
function getGovernmentHolidayFlexMessage(dayFull) {
    return {
      "type": "flex",
      "altText": `วัน${dayFull} เป็นวันหยุดราชการ`,
      "contents": {
        "type": "bubble",
        "header": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": `📅 วัน${dayFull}`,
              "weight": "bold",
              "size": "xl",
              "color": "#FFFFFF"
            }
          ],
          "backgroundColor": "#DC143C",
          "paddingAll": "20px"
        },
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "🏖️ วันหยุดราชการ",
              "size": "xxl",
              "align": "center",
              "margin": "lg"
            },
            {
              "type": "text",
              "text": `วัน${dayFull} เป็นวันหยุดราชการ`,
              "size": "lg",
              "color": "#333333",
              "align": "center",
              "weight": "bold",
              "margin": "md"
            },
            {
              "type": "text",
              "text": "แพทย์จะไม่ได้ลงตรวจในวันดังกล่าว",
              "size": "sm",
              "color": "#666666",
              "align": "center",
              "margin": "md"
            }
          ],
          "paddingAll": "20px"
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "button",
              "style": "primary",
              "color": "#8B4513",
              "action": {
                "type": "message",
                "text": "การติดต่อสื่อสาร",
                "label": "📞 ติดต่อสอบถาม"
              }
            }
          ],
          "paddingAll": "20px"
        }
      }
    };
}


// ฟังก์ชันแสดงตารางแพทย์ตามวันที่ระบุ
function getAppointmentByDayFlexMessage(sheetId, dayShort) {
  const dayFull = convertDayShortToFull(dayShort);
  const sheetData = getSheetData(sheetId);
  const doctors = getDoctorsByDay(sheetData, dayFull);

  // Create contents for the list of doctors on the specified day
  let doctorContents = [];

  if (doctors.length > 0) {
    // There are doctors on duty on the specified day
    for (let i = 0; i < doctors.length; i++) {
      const doctor = doctors[i];

      doctorContents.push({
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "text": "👨‍⚕️",
                "size": "md",
                "flex": 0
              },
              {
                "type": "text",
                "text": doctor.name || 'ไม่ระบุชื่อ',
                "size": "md",
                "color": "#333333",
                "weight": "bold",
                "flex": 1,
                "margin": "sm"
              }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "text": "🏥",
                "size": "sm",
                "flex": 0
              },
              {
                "type": "text",
                "text": `ความเชี่ยวชาญ: ${doctor.specialty || 'ไม่ระบุ'}`,
                "size": "sm",
                "color": "#2E8B57",
                "flex": 1,
                "margin": "sm",
                "weight": "bold",
                "wrap": true
              }
            ],
            "margin": "xs"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "text": "🕐",
                "size": "sm",
                "flex": 0
              },
              {
                "type": "text",
                "text": `เวลา: ${doctor.time || 'ไม่ระบุเวลา'}`,
                "size": "sm",
                "color": "#666666",
                "flex": 1,
                "margin": "sm"
              }
            ],
            "margin": "xs"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "text": "📍",
                "size": "sm",
                "flex": 0
              },
              {
                "type": "text",
                "text": `สถานที่: ${doctor.room || 'ไม่ระบุห้อง'}`,
                "size": "sm",
                "color": "#666666",
                "flex": 1,
                "margin": "sm"
              }
            ],
            "margin": "xs"
          }
        ],
        "margin": "md",
        "paddingAll": "12px",
        "backgroundColor": "#f0f8ff",
        "cornerRadius": "8px",
        "borderWidth": "1px",
        "borderColor": "#8B4513"
      });

      // Add separator between doctors (except the last one)
      if (i < doctors.length - 1) {
        doctorContents.push({
          "type": "separator",
          "margin": "md",
          "color": "#E0E0E0"
        });
      }
    }

    // Add summary message
    doctorContents.push({
      "type": "text",
      "text": `📋 รวม ${doctors.length} ท่าน ออกตรวจในวัน${dayFull}`,
      "size": "xs",
      "color": "#8B4513",
      "margin": "lg",
      "align": "center",
      "weight": "bold"
    });

  } else {
    // No doctors on duty on the specified day
    doctorContents.push({
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "😔",
          "size": "xxl",
          "align": "center"
        },
        {
          "type": "text",
          "text": `วัน${dayFull}`,
          "size": "md",
          "color": "#333333",
          "align": "center",
          "weight": "bold",
          "margin": "md"
        },
        {
          "type": "text",
          "text": "ไม่มีแพทย์ออกตรวจ",
          "size": "sm",
          "color": "#666666",
          "align": "center",
          "margin": "xs"
        }
      ],
      "paddingAll": "20px",
      "backgroundColor": "#f8f9fa",
      "cornerRadius": "8px"
    });
  }

  return {
    "type": "flex",
    "altText": `ตารางแพทย์ออกตรวจวัน${dayFull}`,
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": `📅 ตารางวัน${dayFull}`,
            "weight": "bold",
            "size": "xl",
            "color": "#FFFFFF"
          }
        ],
        "backgroundColor": "#8B4513",
        "paddingAll": "20px"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "แพทย์ออกตรวจแผนกอายุรกรรม",
            "weight": "bold",
            "size": "md",
            "color": "#333333",
            "wrap": true
          },
          {
            "type": "text",
            "text": "โรงพยาบาลสงฆ์",
            "size": "sm",
            "color": "#666666",
            "margin": "xs"
          },
          {
            "type": "separator",
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": doctorContents,
            "margin": "lg"
          }
        ],
        "paddingAll": "20px"
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "height": "sm",
            "action": {
              "type": "message",
              "text": "การติดต่อสื่อสาร",
              "label": "📞 ติดต่อสอบถาม"
            },
            "color": "#8B4513"
          }
        ],
        "paddingAll": "20px"
      }
    }
  };
}

// Flex Message 1: ข่าวสารและความรู้ทางอายุรกรรม
function getNewsFlexMessage() {
  return {
    "type": "flex",
    "altText": "ข่าวสารและความรู้ทางอายุรกรรม - แผนกอายุรกรรม",
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "💡 ข่าวสารและความรู้",
            "size": "lg",
            "color": "#ffffff",
            "weight": "bold"
          }
        ],
        "paddingAll": "20px",
        "backgroundColor": "#8B4513"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "ข่าวสารและความรู้ของแผนกอายุรกรรมโรงพยาบาลสงฆ์",
            "size": "md",
            "color": "#333333",
            "weight": "bold",
            "wrap": true
          },
          {
            "type": "separator",
            "margin": "md"
          },
          {
            "type": "text",
            "text": "พระคุณเจ้าสามารถติดตามกิจกรรมและความรู้ใหม่ๆที่จะเกิดขึ้นของแผนกได้ที่นี่ครับ",
            "size": "sm",
            "color": "#666666",
            "wrap": true,
            "margin": "md"
          }
        ],
        "paddingAll": "20px"
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "color": "#8B4513",
            "action": {
              "type": "uri",
              "uri": "https://prhdev222.github.io/med_prh_patientNCDs/",
              "label": "📖 อ่านเพิ่มเติม"
            }
          }
        ],
        "paddingAll": "20px"
      }
    }
  };
}

// Flex Message 2: ตารางการออกตรวจของแพทย์ (แสดงเฉพาะวันปัจจุบัน)
function getAppointmentFlexMessage(sheetId, sheetViewUrl) {
  const sheetData = getSheetData(sheetId);
  const todayDoctors = getTodayDoctors(sheetData);
  const currentDay = getCurrentDayInThai();

  // Create contents for the list of doctors today
  let doctorContents = [];

  if (todayDoctors.length > 0) {
    // There are doctors on duty today
    for (let i = 0; i < todayDoctors.length; i++) {
      const doctor = todayDoctors[i];

      doctorContents.push({
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "text": "👨‍⚕️",
                "size": "md",
                "flex": 0
              },
              {
                "type": "text",
                "text": doctor.name || 'ไม่ระบุชื่อ',
                "size": "md",
                "color": "#333333",
                "weight": "bold",
                "flex": 1,
                "margin": "sm"
              }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "text": "🏥",
                "size": "sm",
                "flex": 0
              },
              {
                "type": "text",
                "text": `ความเชี่ยวชาญ: ${doctor.specialty || 'ไม่ระบุ'}`,
                "size": "sm",
                "color": "#2E8B57",
                "flex": 1,
                "margin": "sm",
                "weight": "bold",
                "wrap": true
              }
            ],
            "margin": "xs"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "text": "🕐",
                "size": "sm",
                "flex": 0
              },
              {
                "type": "text",
                "text": `เวลา: ${doctor.time || 'ไม่ระบุเวลา'}`,
                "size": "sm",
                "color": "#666666",
                "flex": 1,
                "margin": "sm"
              }
            ],
            "margin": "xs"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "text": "📍",
                "size": "sm",
                "flex": 0
              },
              {
                "type": "text",
                "text": `สถานที่: ${doctor.room || 'ไม่ระบุห้อง'}`,
                "size": "sm",
                "color": "#666666",
                "flex": 1,
                "margin": "sm"
              }
            ],
            "margin": "xs"
          }
        ],
        "margin": "md",
        "paddingAll": "12px",
        "backgroundColor": "#f0f8ff",
        "cornerRadius": "8px",
        "borderWidth": "1px",
        "borderColor": "#8B4513"
      });

      // Add separator between doctors (except the last one)
      if (i < todayDoctors.length - 1) {
        doctorContents.push({
          "type": "separator",
          "margin": "md",
          "color": "#E0E0E0"
        });
      }
    }

    // Add summary message
    doctorContents.push({
      "type": "text",
      "text": `📋 รวม ${todayDoctors.length} ท่าน ออกตรวจในวัน${currentDay}`,
      "size": "xs",
      "color": "#8B4513",
      "margin": "lg",
      "align": "center",
      "weight": "bold"
    });

  } else {
    // No doctors on duty today
    doctorContents.push({
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "😔",
          "size": "xxl",
          "align": "center"
        },
        {
          "type": "text",
          "text": `วัน${currentDay}นี้`,
          "size": "md",
          "color": "#333333",
          "align": "center",
          "weight": "bold",
          "margin": "md"
        },
        {
          "type": "text",
          "text": "ไม่มีแพทย์ออกตรวจ",
          "size": "sm",
          "color": "#666666",
          "align": "center",
          "margin": "xs"
        },
        {
          "type": "text",
          "text": "กรุณาติดต่อสอบถามตารางแพทย์",
          "size": "xs",
          "color": "#888888",
          "align": "center",
          "margin": "md"
        }
      ],
      "paddingAll": "20px",
      "backgroundColor": "#f8f9fa",
      "cornerRadius": "8px"
    });
  }

  return {
    "type": "flex",
    "altText": `ตารางแพทย์ออกตรวจวัน${currentDay}`,
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": `📅 ตารางวัน${currentDay}`,
            "weight": "bold",
            "size": "xl",
            "color": "#FFFFFF"
          },
          {
            "type": "text",
            "text": getCurrentDateString(),
            "size": "sm",
            "color": "#FFFFFF",
            "margin": "xs"
          }
        ],
        "backgroundColor": "#8B4513",
        "paddingAll": "20px"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "แพทย์ออกตรวจแผนกอายุรกรรม",
            "weight": "bold",
            "size": "md",
            "color": "#333333",
            "wrap": true
          },
          {
            "type": "text",
            "text": "โรงพยาบาลสงฆ์",
            "size": "sm",
            "color": "#666666",
            "margin": "xs"
          },
          {
            "type": "separator",
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": doctorContents,
            "margin": "lg"
          },
          {
            "type": "text",
            "text": "🔄 ข้อมูลอัปเดตจาก Google Sheet",
            "size": "xs",
            "color": "#888888",
            "margin": "lg",
            "align": "center"
          }
        ],
        "paddingAll": "20px"
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "style": "primary",
                "height": "sm",
                "action": {
                  "type": "uri",
                  "uri": sheetViewUrl,
                  "label": "📊 ดูตารางเต็ม"
                },
                "color": "#2E8B57",
                "flex": 1
              },
              {
                "type": "button",
                "style": "primary",
                "height": "sm",
                "action": {
                  "type": "message",
                  "text": "การติดต่อสื่อสาร",
                  "label": "📞 ติดต่อ"
                },
                "color": "#8B4513",
                "flex": 1
              }
            ]
          },
          {
            "type": "button",
            "style": "secondary",
            "height": "sm",
            "action": {
              "type": "message",
              "text": "ตารางการออกตรวจของแพทย์",
              "label": "🔄 รีเฟรช"
            }
          }
        ],
        "paddingAll": "20px"
      }
    }
  };
}

// ฟังก์ชันสำหรับแสดงวันที่ปัจจุบันในรูปแบบไทย
function getCurrentDateString() {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear() + 543; // Convert to Buddhist era

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  return `${day} ${thaiMonths[month-1]} ${year}`;
}

// Flex Message 3: การติดต่อสื่อสาร
function getContactFlexMessage() {
  return {
    "type": "flex",
    "altText": "การติดต่อสื่อสาร - แผนกอายุรกรรม",
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "📱 การติดต่อสื่อสาร",
            "size": "lg",
            "color": "#ffffff",
            "weight": "bold"
          }
        ],
        "paddingAll": "20px",
        "backgroundColor": "#8B4513"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "ช่องทางการติดต่อสื่อสารแผนกอายุรกรรมโรงพยาบาลสงฆ์",
            "size": "md",
            "color": "#333333",
            "weight": "bold",
            "wrap": true
          },
          {
            "type": "separator",
            "margin": "md"
          },
          {
            "type": "text",
            "text": "เลือกช่องทางการติดต่อที่สะดวกสำหรับท่าน มีทั้งโทรศัพท์ LINE และอีเมล",
            "size": "sm",
            "color": "#666666",
            "wrap": true,
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  {
                    "type": "text",
                    "text": "📞",
                    "size": "sm",
                    "flex": 0
                  },
                  {
                    "type": "text",
                    "text": "โทรศัพท์: 02-354-4305",
                    "size": "xs",
                    "color": "#888888",
                    "flex": 1,
                    "margin": "sm"
                  }
                ],
                "margin": "md"
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  {
                    "type": "text",
                    "text": "💬",
                    "size": "sm",
                    "flex": 0
                  },
                  {
                    "type": "text",
                    "text": "LINE Official Account",
                    "size": "xs",
                    "color": "#888888",
                    "flex": 1,
                    "margin": "sm"
                  }
                ],
                "margin": "sm"
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  {
                    "type": "text",
                    "text": "✉️",
                    "size": "sm",
                    "flex": 0
                  },
                  {
                    "type": "text",
                    "text": "Email: uradev222@gmail.com",
                    "size": "xs",
                    "color": "#888888",
                    "flex": 1,
                    "margin": "sm"
                  }
                ],
                "margin": "sm"
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  {
                    "type": "text",
                    "text": "🕐",
                    "size": "sm",
                    "flex": 0
                  },
                  {
                    "type": "text",
                    "text": "เวลาติดต่อ: จันทร์-ศุกร์ 8.00-16.00 น.",
                    "size": "xs",
                    "color": "#888888",
                    "flex": 1,
                    "margin": "sm"
                  }
                ],
                "margin": "sm"
              }
            ],
            "margin": "lg",
            "paddingAll": "12px",
            "backgroundColor": "#f8f9fa",
            "cornerRadius": "8px"
          }
        ],
        "paddingAll": "20px"
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "button",
                "style": "primary",
                "color": "#8B4513",
                "action": {
                  "type": "uri",
                  "uri": "tel:02-354-4305",
                  "label": "📞 โทร"
                },
                "flex": 1,
                "height": "sm"
              },
              {
                "type": "button",
                "style": "primary",
                "color": "#34C759",
                "action": {
                  "type": "uri",
                  "uri": "https://line.me/ti/p/@your_line_id",
                  "label": "LINE"
                },
                "flex": 1,
                "height": "sm"
              },
              {
                "type": "button",
                "style": "primary",
                "color": "#F39C12",
                "action": {
                  "type": "uri",
                  "uri": "mailto:uradev222@gmail.com",
                  "label": "อีเมล"
                },
                "flex": 1,
                "height": "sm"
              }
            ],
            "spacing": "sm"
          }
        ],
        "paddingAll": "20px"
      }
    }
  };
}

// ฟังก์ชันทดสอบการอ่าน Google Sheet
function testReadSheet() {
  const DOCTOR_SCHEDULE_SHEET_ID = '1nCzz1nyTsMr4HmI8vhLwC0X-Pv3X0Y86eB84TkoSWD0';

  try {
    const sheet = SpreadsheetApp.openById(DOCTOR_SCHEDULE_SHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    console.log('ข้อมูลใน Sheet:', data);
    console.log('จำนวนแถว:', data.length);
    return data;
  } catch (error) {
    console.log('Error อ่าน Sheet:', error.toString());
    return null;
  }
}
