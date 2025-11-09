# Software Requirements Specification (SRS)
# ระบบติดตาม Patient Journey แบบ Real-time

## สารบัญ
1. [บทนำ (Introduction)](#1-บทนำ-introduction)
2. [ข้อกำหนดด้านฟังก์ชัน (Functional Requirements)](#2-ข้อกำหนดด้านฟังก์ชัน-functional-requirements)
3. [ข้อกำหนดขั้นตอนการทำงาน (Workflow Requirements)](#3-ข้อกำหนดขั้นตอนการทำงาน-workflow-requirements)
4. [ข้อกำหนดด้านข้อมูล (Data Requirements)](#4-ข้อกำหนดด้านข้อมูล-data-requirements)
5. [ข้อกำหนดด้านความปลอดภัย (Security Requirements)](#5-ข้อกำหนดด้านความปลอดภัย-security-requirements)
6. [ข้อกำหนดด้านเทคนิค (Technical Requirements)](#6-ข้อกำหนดด้านเทคนิค-technical-requirements)
7. [การเชื่อมต่อ LINE OA](#7-การเชื่อมต่อ-line-oa)
8. [User Interface Requirements](#8-user-interface-requirements)
9. [การทดสอบ (Testing Requirements)](#9-การทดสอบ-testing-requirements)
10. [การติดตั้งและ Deployment](#10-การติดตั้งและ-deployment)
11. [การบำรุงรักษา (Maintenance)](#11-การบำรุงรักษา-maintenance)
12. [ข้อจำกัดและข้อควรระวัง](#12-ข้อจำกัดและข้อควรระวัง)
13. [Timeline การพัฒนา](#13-timeline-การพัฒนา)

---

## 1. บทนำ (Introduction)

### 1.1 วัตถุประสงค์
พัฒนาระบบติดตามสถานะผู้ป่วยแบบ real-time เพื่อให้ผู้ป่วยและญาติสามารถติดตามขั้นตอนการรักษาพยาบาล โดยไม่เปิดเผยข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)

### 1.2 ขอบเขตของระบบ
- Web Application สำหรับผู้ป่วย, เจ้าหน้าที่ และผู้ดูแลระบบ
- ติดตามสถานะแบบ real-time คล้ายระบบ food delivery tracking
- เชื่อมต่อกับ LINE Official Account (เฉพาะ link ไปยังระบบ)
- จัดเก็บข้อมูลระยะสั้น (7 วัน) พร้อมระบบสร้างรายงานสถิติ

### 1.3 คำจำกัดความ
- **VN (Visit Number)**: หมายเลขการเข้ารับบริการในแต่ละครั้ง
- **HN (Hospital Number)**: หมายเลขประจำตัวผู้ป่วย
- **PDPA**: พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล
- **Patient Journey**: ขั้นตอนการรับบริการทั้งหมดของผู้ป่วย

---

## 2. ข้อกำหนดด้านฟังก์ชัน (Functional Requirements)

### 2.1 ระบบผู้ใช้งาน (User Management)

#### 2.1.1 การเข้าสู่ระบบผู้ป่วย
| Field | Description |
|-------|-------------|
| **Username** | VN (Visit Number) - หมายเลขการเข้ารับบริการ |
| **Password** | HN (Hospital Number) - หมายเลขประจำตัวผู้ป่วย |
| **Alternative** | รองรับการ login ผ่าน QR Code |
| **Privacy** | ไม่แสดงชื่อ-นามสกุล หรือข้อมูลการรักษา |
| **Security** | Session timeout หลังไม่มีการใช้งาน 30 นาที |

#### 2.1.2 ระดับผู้ใช้งาน
```
1. Patient - ผู้ป่วย/ญาติ (ดูสถานะตนเอง)
2. Staff - เจ้าหน้าที่แต่ละจุดบริการ (อัพเดทสถานะ)
3. Admin - ผู้ดูแลระบบ (จัดการระบบทั้งหมด)
```

### 2.2 Patient Dashboard

#### 2.2.1 หน้าแสดงผลหลัก
**Current Status Card** ประกอบด้วย:
- ชื่อขั้นตอนปัจจุบัน (เช่น "กำลังรอพบแพทย์")
- เวลาที่เริ่มขั้นตอนนี้
- ระยะเวลารอโดยประมาณ
- ลำดับคิวปัจจุบัน (ถ้ามี)

#### 2.2.2 Patient Journey Timeline
แสดงขั้นตอนทั้งหมดในรูปแบบ timeline โดยมีสถานะ:
- ✅ **Completed** (สีเขียว) - ขั้นตอนที่เสร็จแล้ว
- 🔄 **In Progress** (สีฟ้า กระพริบ) - กำลังดำเนินการ
- ⏳ **Upcoming** (สีเทา) - ขั้นตอนที่รอดำเนินการ

#### 2.2.3 ข้อมูลขั้นตอนถัดไป
- ชื่อขั้นตอนถัดไป
- สถานที่/ห้องที่ต้องไป (พร้อมแผนที่หากมี)
- การเตรียมตัว/เอกสารที่ต้องเตรียม
- เวลารอโดยประมาณ (คำนวณจากข้อมูลในอดีต)

### 2.3 Staff Interface

#### 2.3.1 หน้าจัดการผู้ป่วย
**ฟังก์ชันหลัก:**
- ค้นหาผู้ป่วยด้วย VN
- แสดงรายชื่อผู้ป่วยที่อยู่ในความรับผิดชอบ
- ปุ่มอัพเดทสถานะ:
  - "เริ่มขั้นตอน" (Start Process)
  - "จบขั้นตอน" (Complete Process)  
  - "ส่งต่อไปยัง..." (Transfer to...)

#### 2.3.2 การกำหนด Patient Flow
**กรณีการใช้งาน:**
| ประเภทผู้ป่วย | Flow |
|--------------|------|
| ผู้ป่วยใหม่ | ส่งไปคัดกรองก่อนพบแพทย์ |
| ผู้ป่วยนัด | ไปตามขั้นตอนที่กำหนดไว้ |
| กรณีฉุกเฉิน | ข้ามขั้นตอน fast track |

### 2.4 Admin Dashboard

#### 2.4.1 จัดการขั้นตอน/หน่วยงาน
**CRUD Operations:**
- Create: เพิ่มขั้นตอนใหม่
- Read: ดูรายละเอียดขั้นตอน
- Update: แก้ไขข้อมูลขั้นตอน
- Delete: ลบขั้นตอน (soft delete)

#### 2.4.2 โครงสร้างข้อมูลขั้นตอน
```json
{
  "stepId": "UUID",
  "stepName": "ชื่อขั้นตอน",
  "department": "แผนก/หน่วยงาน",
  "location": "สถานที่/ห้อง",
  "estimatedTime": 30, // นาที
  "preparation": "คำแนะนำการเตรียมตัว",
  "nextPossibleSteps": ["stepId1", "stepId2"],
  "isActive": true
}
```

#### 2.4.3 การตั้งค่าระบบ
- Email สำหรับรับรายงานสถิติรายสัปดาห์
- กำหนดเวลาลบข้อมูล (default: 7 วัน)
- ตั้งค่าการเชื่อมต่อ LINE OA

---

## 3. ข้อกำหนดขั้นตอนการทำงาน (Workflow Requirements)

### 3.1 Patient Flow มาตรฐาน

#### 3.1.1 ผู้ป่วยใหม่ (Walk-in)
```mermaid
graph LR
    A[ลงทะเบียน] --> B[วัดสัญญาณชีพ]
    B --> C[คัดกรอง]
    C --> D[พบแพทย์]
    D --> E[สั่งตรวจ/ทำหัตถการ]
    E --> F[จ่ายเงิน]
    F --> G[รับยา]
    G --> H[เสร็จสิ้น]
```

#### 3.1.2 ผู้ป่วยนัดหมาย
```mermaid
graph LR
    A[ลงทะเบียน] --> B[วัดสัญญาณชีพ]
    B --> C[ตามขั้นตอนที่นัด]
    C --> D[พบแพทย์]
    D --> E[จ่ายเงิน]
    E --> F[รับยา]
    F --> G[เสร็จสิ้น]
```

#### 3.1.3 ผู้ป่วย Admit
```mermaid
graph LR
    A[พบแพทย์] --> B[Admit]
    B --> C[รอเตียง]
    C --> D[ขึ้นหอผู้ป่วย]
    D --> E[เสร็จสิ้นการติดตาม]
```

---

## 4. ข้อกำหนดด้านข้อมูล (Data Requirements)

### 4.1 โครงสร้างฐานข้อมูล

#### 4.1.1 Patient Visit Table
```sql
CREATE TABLE patient_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vn VARCHAR(20) UNIQUE NOT NULL,
    hn_hash VARCHAR(255) NOT NULL, -- เก็บแบบ hash ด้วย bcrypt
    qr_code TEXT,
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP,
    current_step_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_vn ON patient_visits(vn);
CREATE INDEX idx_created_at ON patient_visits(created_at);
```

#### 4.1.2 Journey Steps Table
```sql
CREATE TABLE journey_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES patient_visits(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES service_steps(id),
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('waiting', 'in_progress', 'completed', 'skipped')),
    queue_number INTEGER,
    notes TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_visit_id ON journey_steps(visit_id);
CREATE INDEX idx_status ON journey_steps(status);
```

#### 4.1.3 Service Steps Table (Master Data)
```sql
CREATE TABLE service_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    department VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    floor INTEGER,
    estimated_minutes INTEGER DEFAULT 30,
    preparation_text TEXT,
    preparation_text_en TEXT,
    next_steps JSONB DEFAULT '[]'::jsonb,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.1.4 Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff', 'patient')),
    department VARCHAR(100),
    full_name VARCHAR(200),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 การจัดการข้อมูล

#### 4.2.1 Data Retention Policy
**กระบวนการลบข้อมูลอัตโนมัติ:**
1. **ทุกวันอาทิตย์ เวลา 23:00 น.**
2. Export ข้อมูลเป็น CSV
3. ส่ง email พร้อมไฟล์แนบไปยัง admin
4. ลบข้อมูลที่เก่ากว่า 7 วัน
5. บันทึก log การลบข้อมูล

#### 4.2.2 รายงานสถิติใน CSV
**ข้อมูลที่ต้องมีในรายงาน:**
- จำนวนผู้ป่วยทั้งหมดในสัปดาห์
- เวลาเฉลี่ยในแต่ละขั้นตอน
- ขั้นตอนที่ใช้เวลานานที่สุด
- Peak hours ของแต่ละวัน
- อัตราการข้ามขั้นตอน
- จำนวนผู้ป่วยแยกตามประเภท (ใหม่/นัด)

---

## 5. ข้อกำหนดด้านความปลอดภัย (Security Requirements)

### 5.1 การป้องกันข้อมูล
| มาตรการ | รายละเอียด |
|---------|------------|
| **Data Privacy** | ไม่เก็บข้อมูลส่วนบุคคลที่ระบุตัวตนได้ |
| **Encryption** | HN เก็บในรูปแบบ hash (bcrypt, salt rounds: 10) |
| **Transport** | ใช้ HTTPS สำหรับทุก connection (TLS 1.2+) |
| **Authentication** | JWT token พร้อม refresh token |
| **Rate Limiting** | Max 100 requests/minute per IP |
| **Session** | Timeout after 30 minutes inactive |

### 5.2 PDPA Compliance
**หลักการสำคัญ:**
- ✅ ไม่แสดงชื่อ-นามสกุล
- ✅ ไม่แสดงข้อมูลการรักษา
- ✅ ไม่เก็บข้อมูลละเอียดอ่อน
- ✅ มีระบบลบข้อมูลอัตโนมัติ
- ✅ ขอ consent ก่อนเก็บ cookies

### 5.3 Security Headers
```javascript
// การตั้งค่า Security Headers
{
  "Content-Security-Policy": "default-src 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000"
}
```

---

## 6. ข้อกำหนดด้านเทคนิค (Technical Requirements)

### 6.1 Technology Stack

#### Frontend
```yaml
Framework: Next.js 14+ (App Router)
UI Library: React 18+
Styling: Tailwind CSS 3.4+
State Management: Zustand
Real-time: Socket.io Client
Charts: Recharts
PWA: next-pwa
```

#### Backend
```yaml
Runtime: Node.js 20 LTS
Framework: Express.js / Next.js API Routes
WebSocket: Socket.io Server
Authentication: JWT + bcrypt
Validation: Zod
ORM: Prisma
```

#### Database & Infrastructure
```yaml
Primary DB: PostgreSQL (Neon)
Cache: Redis (Upstash)
File Storage: Vercel Blob (for QR codes)
Hosting: Vercel
Version Control: GitHub
CI/CD: GitHub Actions
```

### 6.2 Database Selection Rationale
**Neon PostgreSQL เหมาะสมเพราะ:**
- ✅ Serverless และ auto-scaling
- ✅ รองรับ ACID transactions
- ✅ Row Level Security (RLS)
- ✅ Point-in-time recovery
- ✅ Free tier 3GB เพียงพอสำหรับข้อมูล 7 วัน
- ✅ รองรับ connection pooling

### 6.3 Notification System

#### 6.3.1 Web Push Notifications
```javascript
// Service Worker Registration
if ('serviceWorker' in navigator && 'PushManager' in window) {
  const registration = await navigator.serviceWorker.register('/sw.js');
  
  // Request permission
  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });
  }
}
```

#### 6.3.2 In-App Notifications
```javascript
// Toast notification component
const showNotification = ({ title, message, type }) => {
  toast[type]({
    title,
    description: message,
    duration: 5000,
    isClosable: true,
  });
};

// Real-time status update
socket.on('status-update', (data) => {
  // Update UI
  updatePatientStatus(data);
  
  // Show notification
  showNotification({
    title: 'สถานะอัพเดท',
    message: data.message,
    type: 'info'
  });
  
  // Play sound if enabled
  if (settings.soundEnabled) {
    playNotificationSound();
  }
});
```

### 6.4 Progressive Web App (PWA)
```json
// manifest.json
{
  "name": "Hospital Patient Journey Tracker",
  "short_name": "HJT",
  "description": "ติดตามสถานะการรักษาแบบ Real-time",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#0066cc",
  "icons": [
    {
      "src": "/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 7. การเชื่อมต่อ LINE OA

### 7.1 LINE OA Configuration (Free Plan)

#### 7.1.1 การใช้งานหลัก
**ไม่ใช้ Messaging API - ประหยัด Token:**
- ใช้ Auto Reply Message เท่านั้น
- Rich Menu สำหรับ quick access
- ไม่มี Push Message (ประหยัดค่าใช้จ่าย)

#### 7.1.2 ขั้นตอนการใช้งาน
```mermaid
graph TD
    A[ผู้ป่วยทักมา LINE OA] --> B[Bot ตอบอัตโนมัติพร้อม Link]
    B --> C[ผู้ป่วยคลิก Link]
    C --> D[เปิด Browser ไปยังหน้า Login]
    D --> E[Login ด้วย VN/HN]
    E --> F[เข้าสู่ Patient Dashboard]
    F --> G[รับ Notification ผ่าน Web Push]
```

### 7.2 LINE OA Messages

#### 7.2.1 Auto Reply Template
```
🏥 ระบบติดตามสถานะการรักษา
━━━━━━━━━━━━━━━━━━━━━
สวัสดีค่ะ 👋

📱 คลิกลิงก์ด้านล่างเพื่อเข้าสู่ระบบ:
🔗 https://hospital.vercel.app/login

📝 เตรียมข้อมูลสำหรับ Login:
• VN - หมายเลขการเข้ารับบริการ
• HN - หมายเลขประจำตัวผู้ป่วย

💡 หรือสแกน QR Code ที่ได้รับจากเจ้าหน้าที่

❓ ดูวิธีใช้งาน:
https://hospital.vercel.app/help
```

#### 7.2.2 Rich Menu Structure
```
┌─────────────┬─────────────┐
│             │             │
│  📱 เข้าสู่  │  📖 วิธีใช้  │
│    ระบบ     │     งาน     │
│             │             │
└─────────────┴─────────────┘
```

---

## 8. User Interface Requirements

### 8.1 Design Principles
- **Mobile First**: ออกแบบสำหรับ mobile ก่อน
- **Accessibility**: WCAG 2.1 Level AA compliance
- **Performance**: Lighthouse score > 90
- **Responsive**: รองรับ 320px - 4K displays

### 8.2 หน้าจอหลัก - Patient View

#### 8.2.1 Mobile Layout (Primary)
```
┌─────────────────────────────┐
│  🏥 โรงพยาบาล [Logout]      │
├─────────────────────────────┤
│  VN: 67010001               │
│  เวลาเข้า: 09:30 น.         │
├─────────────────────────────┤
│  สถานะปัจจุบัน 📍            │
│  ┌─────────────────────┐    │
│  │  🩺 รอพบแพทย์         │    │
│  │  ⏱️ 15 นาที          │    │
│  │  คิวที่: A005        │    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  Timeline                   │
│  ✅ ลงทะเบียน      09:30    │
│  ✅ วัดสัญญาณชีพ    09:45    │
│  ✅ คัดกรอง         10:00    │
│  🔄 รอพบแพทย์       10:30    │
│  ⏳ จ่ายเงิน         --:--    │
│  ⏳ รับยา           --:--    │
├─────────────────────────────┤
│  ขั้นตอนถัดไป 👉             │
│  ┌─────────────────────┐    │
│  │ 📍 ห้องจ่ายเงิน ชั้น 1 │    │
│  │ 💡 เตรียมบัตรประชาชน  │    │
│  │ ⏰ รอประมาณ 10 นาที  │    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  [🔔 เปิดการแจ้งเตือน]       │
└─────────────────────────────┘
```

### 8.3 Staff Interface

#### 8.3.1 Tablet Layout (Primary for Staff)
```
┌──────────────────────────────────────┐
│ 🏥 แผนก: จุดคัดกรอง    👤 พยาบาล A   │
├──────────────────────────────────────┤
│  ค้นหา: [___VN/HN___] 🔍             │
├──────────────────────────────────────┤
│  รายการผู้ป่วยปัจจุบัน                │
│  ┌──────────────────────────────┐   │
│  │ VN: 67010001  คิว: A005       │   │
│  │ สถานะ: รอคัดกรอง             │   │
│  │ [เริ่ม] [ข้าม] [ส่งต่อ]       │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ VN: 67010002  คิว: A006       │   │
│  │ สถานะ: กำลังคัดกรอง          │   │
│  │ [เสร็จสิ้น] [หมายเหตุ]       │   │
│  └──────────────────────────────┘   │
├──────────────────────────────────────┤
│  สถิติวันนี้:                        │
│  • ผู้ป่วยทั้งหมด: 45 คน              │
│  • เวลาเฉลี่ย: 8 นาที/คน             │
│  • รอคิว: 5 คน                      │
└──────────────────────────────────────┘
```

### 8.4 Admin Dashboard

```
┌─────────────────────────────────────────┐
│  🏥 Admin Dashboard                     │
├─────────────────────────────────────────┤
│  📊 Overview Today                      │
│  ┌─────────────┬────────────────────┐  │
│  │ Total: 156  │ Completed: 89      │  │
│  │ Waiting: 45 │ Average: 2.5 hrs   │  │
│  └─────────────┴────────────────────┘  │
├─────────────────────────────────────────┤
│  ⚙️ จัดการขั้นตอน                       │
│  [+ เพิ่มขั้นตอน]                       │
│  ┌──────────────────────────────────┐  │
│  │ 1. ลงทะเบียน         [แก้ไข][ลบ] │  │
│  │ 2. วัดสัญญาณชีพ       [แก้ไข][ลบ] │  │
│  │ 3. คัดกรอง           [แก้ไข][ลบ] │  │
│  └──────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  📧 Email Reports: admin@hospital.com   │
│  [เปลี่ยน Email] [ส่งรายงานทันที]       │
└─────────────────────────────────────────┘
```

---

## 9. การทดสอบ (Testing Requirements)

### 9.1 Unit Testing
```javascript
// ตัวอย่าง Test Case
describe('Authentication', () => {
  test('should hash HN correctly', async () => {
    const hn = '1234567';
    const hash = await bcrypt.hash(hn, 10);
    expect(await bcrypt.compare(hn, hash)).toBe(true);
  });
  
  test('should not expose patient name', () => {
    const patientData = sanitizePatientData(rawData);
    expect(patientData.name).toBeUndefined();
    expect(patientData.surname).toBeUndefined();
  });
});
```

**Coverage Requirements:**
- Overall: > 80%
- Critical paths: > 95%
- Security functions: 100%

### 9.2 Integration Testing
| Test Area | Test Cases |
|-----------|------------|
| API Endpoints | All CRUD operations |
| WebSocket | Real-time updates |
| Database | Transaction integrity |
| Authentication | JWT flow |
| Data Retention | Auto-delete after 7 days |

### 9.3 User Acceptance Testing (UAT)
**Test Groups:**
- ผู้ป่วยจริง: 20 คน
- Staff ทุกแผนก: อย่างน้อย 2 คน/แผนก
- Admin: 3 คน

**Performance Criteria:**
- Load: 100 concurrent users
- Response time: < 2 seconds
- Uptime: > 99.5%

---

## 10. การติดตั้งและ Deployment

### 10.1 System Requirements
```yaml
Node.js: >= 20.0.0
npm: >= 10.0.0
PostgreSQL: >= 15.0
Redis: >= 7.0
```

### 10.2 Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db
REDIS_URL=redis://host:6379

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key
BCRYPT_ROUNDS=10

# Application
NEXT_PUBLIC_APP_URL=https://hospital.vercel.app
NODE_ENV=production

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hospital@gmail.com
SMTP_PASS=app-specific-password
ADMIN_EMAIL=admin@hospital.com

# Data Management
DATA_RETENTION_DAYS=7
REPORT_SCHEDULE=0 23 * * 0  # Every Sunday 23:00

# LINE OA (Optional)
LINE_OA_URL=https://line.me/R/ti/p/@hospital
```

### 10.3 Installation Steps
```bash
# 1. Clone repository
git clone https://github.com/hospital/patient-journey.git
cd patient-journey

# 2. Install dependencies
npm install

# 3. Setup database
npx prisma generate
npx prisma migrate deploy

# 4. Build application
npm run build

# 5. Start production server
npm run start
```

### 10.4 Vercel Deployment
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["sin1"], // Singapore for Thailand
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret"
  }
}
```

---

## 11. การบำรุงรักษา (Maintenance)

### 11.1 Monitoring
| Service | Tool | Purpose |
|---------|------|---------|
| Uptime | UptimeRobot | Server availability |
| Errors | Sentry | Error tracking |
| Performance | Vercel Analytics | Page load times |
| Database | Neon Dashboard | Query performance |
| Logs | Vercel Functions | API logs |

### 11.2 Backup Strategy
```yaml
Database Backup:
  Schedule: Daily at 02:00 AM
  Retention: 30 days
  Storage: Cloud Storage
  
Weekly Reports:
  Schedule: Sunday 23:00
  Format: CSV
  Storage: Email + Archive
  
Recovery:
  RTO: 4 hours
  RPO: 24 hours
```

### 11.3 Maintenance Tasks
**Daily:**
- Check system health
- Monitor error rates
- Review performance metrics

**Weekly:**
- Database optimization
- Clear old sessions
- Review security logs

**Monthly:**
- Security updates
- Dependency updates
- Performance audit
- Backup restoration test

---

## 12. ข้อจำกัดและข้อควรระวัง

### 12.1 ข้อจำกัดของระบบ
1. **ไม่ใช่ระบบทางการแพทย์** - ใช้เพื่อติดตามสถานะเท่านั้น
2. **ไม่เก็บข้อมูลการรักษา** - เฉพาะขั้นตอนและเวลา
3. **ข้อมูลชั่วคราว** - ลบอัตโนมัติทุก 7 วัน
4. **ต้องการ Internet** - สำหรับ real-time updates
5. **Browser Support** - Chrome 90+, Safari 14+, Firefox 88+

### 12.2 ข้อควรระวัง
⚠️ **Privacy & Security:**
- ห้ามแสดงข้อมูลส่วนบุคคล
- ตรวจสอบ PDPA compliance สม่ำเสมอ
- ไม่เก็บข้อมูลการรักษา

⚠️ **Performance:**
- จำกัด concurrent users ตาม server capacity
- Monitor database connections
- Implement rate limiting

⚠️ **User Experience:**
- ให้ข้อมูลที่ชัดเจนเกี่ยวกับข้อจำกัด
- แจ้งเตือนก่อนลบข้อมูล
- Fallback UI สำหรับ offline mode

---

## 13. Timeline การพัฒนา

### Phase 1: Foundation (4 สัปดาห์)
**สัปดาห์ 1-2:**
- [ ] Setup project structure
- [ ] Database design & setup
- [ ] Authentication system
- [ ] Basic UI components

**สัปดาห์ 3-4:**
- [ ] Patient dashboard
- [ ] Login with VN/HN
- [ ] QR code generation
- [ ] Basic journey tracking

### Phase 2: Core Features (3 สัปดาห์)
**สัปดาห์ 5-6:**
- [ ] Staff interface
- [ ] Status update system
- [ ] Real-time updates (WebSocket)
- [ ] Notification system

**สัปดาห์ 7:**
- [ ] Admin dashboard
- [ ] Step management CRUD
- [ ] Settings configuration

### Phase 3: Integration (2 สัปดาห์)
**สัปดาห์ 8:**
- [ ] LINE OA setup
- [ ] Web Push Notifications
- [ ] PWA implementation

**สัปดาห์ 9:**
- [ ] Data retention system
- [ ] CSV report generation
- [ ] Email integration

### Phase 4: Testing & Deployment (1 สัปดาห์)
**สัปดาห์ 10:**
- [ ] Unit & Integration testing
- [ ] UAT with real users
- [ ] Performance optimization
- [ ] Production deployment
- [ ] Staff training
- [ ] Documentation

### Milestones
| Milestone | Date | Deliverable |
|-----------|------|-------------|
| M1 | Week 4 | Working prototype with basic features |
| M2 | Week 7 | Complete system with all features |
| M3 | Week 9 | Fully integrated with notifications |
| M4 | Week 10 | Production ready |

---

## Appendix A: API Documentation

### Authentication Endpoints
```yaml
POST /api/auth/login
  Body: { vn: string, hn: string }
  Response: { token: string, refreshToken: string }

POST /api/auth/refresh
  Body: { refreshToken: string }
  Response: { token: string }

POST /api/auth/logout
  Header: Authorization: Bearer {token}
  Response: { success: boolean }
```

### Patient Endpoints
```yaml
GET /api/patient/status
  Header: Authorization: Bearer {token}
  Response: { currentStep, timeline, nextStep }

GET /api/patient/journey
  Header: Authorization: Bearer {token}
  Response: { steps: Array<Step> }
```

### Staff Endpoints
```yaml
GET /api/staff/patients
  Header: Authorization: Bearer {token}
  Query: { department?: string, status?: string }
  Response: { patients: Array<Patient> }

POST /api/staff/update-status
  Header: Authorization: Bearer {token}
  Body: { vn: string, status: string, nextStep?: string }
  Response: { success: boolean }
```

### Admin Endpoints
```yaml
GET /api/admin/steps
  Header: Authorization: Bearer {token}
  Response: { steps: Array<Step> }

POST /api/admin/steps
  Header: Authorization: Bearer {token}
  Body: { name, department, location, estimatedTime }
  Response: { step: Step }

PUT /api/admin/steps/:id
  Header: Authorization: Bearer {token}
  Body: { ...updates }
  Response: { step: Step }

DELETE /api/admin/steps/:id
  Header: Authorization: Bearer {token}
  Response: { success: boolean }
```

---

## Appendix B: Database Schema Diagram

```mermaid
erDiagram
    patient_visits ||--o{ journey_steps : has
    journey_steps }o--|| service_steps : uses
    journey_steps }o--|| users : updated_by
    
    patient_visits {
        uuid id PK
        string vn UK
        string hn_hash
        text qr_code
        timestamp start_time
        timestamp end_time
        uuid current_step_id FK
    }
    
    journey_steps {
        uuid id PK
        uuid visit_id FK
        uuid step_id FK
        timestamp start_time
        timestamp end_time
        string status
        integer queue_number
        text notes
        uuid updated_by FK
    }
    
    service_steps {
        uuid id PK
        string name
        string department
        string location
        integer estimated_minutes
        text preparation_text
        jsonb next_steps
        boolean is_active
    }
    
    users {
        uuid id PK
        string username UK
        string password_hash
        string role
        string department
        string full_name
        string email
    }
```

---

## Appendix C: Cost Analysis

### Monthly Cost Estimation (Free Tier)
| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| Vercel | Hobby | $0 | 100GB bandwidth |
| Neon DB | Free | $0 | 3GB storage |
| Upstash Redis | Free | $0 | 10,000 commands/day |
| GitHub | Free | $0 | Unlimited repos |
| LINE OA | Free | $0 | No push messages |
| **Total** | | **$0** | |

### Scale-up Options
| Service | Pro Plan | Cost/month | Benefits |
|---------|----------|------------|----------|
| Vercel | Pro | $20 | 1TB bandwidth, Analytics |
| Neon | Pro | $19 | 10GB, Auto-scaling |
| Upstash | Pay as you go | ~$5 | 100K commands/day |
| **Total** | | **~$44** | |

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01-19 | Team | Initial SRS |
| 1.1.0 | 2024-01-19 | Team | Remove LINE Notify, Add Web Push |

---

**End of Document**

*This SRS is a living document and will be updated throughout the development process.*