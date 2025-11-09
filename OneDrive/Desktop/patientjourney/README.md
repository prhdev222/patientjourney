# ระบบติดตาม Patient Journey แบบ Real-time

ระบบติดตามสถานะผู้ป่วยแบบ real-time เพื่อให้ผู้ป่วยและญาติสามารถติดตามขั้นตอนการรักษาพยาบาล โดยไม่เปิดเผยข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)

## เทคโนโลยีที่ใช้

- **Frontend**: Next.js 14+ (App Router), React 18+, Tailwind CSS
- **Backend**: Next.js API Routes, Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Real-time**: Socket.io
- **Authentication**: JWT + bcrypt
- **State Management**: Zustand
- **Charts**: Recharts

## การติดตั้ง

### 1. Clone repository
```bash
git clone <repository-url>
cd patientjourney
```

### 2. ติดตั้ง dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables
```bash
cp .env.example .env
# แก้ไข .env ตามค่าที่ต้องการ
```

### 4. ตั้งค่าฐานข้อมูล
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# หรือใช้ migration
npm run db:migrate
```

### 5. รันโปรเจกต์
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## โครงสร้างโปรเจกต์

```
patientjourney/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── (auth)/            # Auth pages
│   ├── (patient)/         # Patient pages
│   ├── (staff)/           # Staff pages
│   └── (admin)/           # Admin pages
├── components/            # React Components
├── lib/                   # Utilities & Helpers
├── prisma/                # Prisma Schema
├── public/                # Static files
└── types/                 # TypeScript types
```

## ฟีเจอร์หลัก

- ✅ การเข้าสู่ระบบด้วย VN/HN หรือ QR Code
- ✅ Patient Dashboard แสดงสถานะแบบ real-time
- ✅ Staff Interface สำหรับอัพเดทสถานะ
- ✅ Admin Dashboard สำหรับจัดการขั้นตอน
- ✅ Real-time updates ผ่าน WebSocket
- ✅ Web Push Notifications
- ✅ PWA Support
- ✅ ระบบลบข้อมูลอัตโนมัติ (7 วัน)
- ✅ รายงานสถิติรายสัปดาห์

## การทดสอบ

```bash
npm test
```

## License

MIT



