# การตั้งค่า EAS Credentials สำหรับ My Health Tracker

## 🔐 ขั้นตอนการสร้าง Keystore

### วิธีที่ 1: ผ่าน EAS Dashboard (แนะนำ)

1. **ไปที่ EAS Dashboard**
   - เปิดเบราว์เซอร์ไปที่ https://expo.dev
   - Login ด้วยบัญชี uradev222@gmail.com
   - ไปที่ project "my-health-tracker"

2. **สร้าง Keystore**
   - ไปที่ "Credentials" tab
   - เลือก "Android" platform
   - คลิก "Create new keystore"
   - ตั้งชื่อ: "MyHealthTracker-Production"
   - คลิก "Create"

3. **ตรวจสอบ Keystore**
   - ควรเห็น keystore ที่สร้างแล้ว
   - มี status "Active"

### วิธีที่ 2: ผ่าน Command Line (Interactive)

```bash
# เปิด terminal ใหม่
eas credentials --platform android

# เลือก:
# 1. production
# 2. Set up a new keystore
# 3. ตั้งชื่อ: MyHealthTracker-Production
# 4. รอให้สร้างเสร็จ
```

## 🚀 หลังจากสร้าง Keystore แล้ว

### 1. สร้าง Android App Bundle (AAB)
```bash
eas build --platform android --profile production
```

### 2. ตรวจสอบ Build Status
- ไปที่ EAS Dashboard
- ดู build progress
- รอให้ build เสร็จ (ประมาณ 10-15 นาที)

### 3. ดาวน์โหลด AAB
- เมื่อ build เสร็จแล้ว
- คลิก "Download" เพื่อดาวน์โหลดไฟล์ AAB
- ไฟล์จะใช้สำหรับอัปโหลดไปยัง Google Play Store

## 📱 ข้อมูล Keystore

### ข้อมูลสำคัญ
- **Keystore Name**: MyHealthTracker-Production
- **Package Name**: com.myhealthtracker.app
- **Project ID**: 74801009-5aaa-410a-b540-4ce70ae5ef41

### ข้อมูลความปลอดภัย
- Keystore ถูกเก็บไว้ใน EAS servers
- ไม่สามารถดาวน์โหลด keystore ได้
- EAS จะจัดการการ signing ให้อัตโนมัติ

## 🔧 การแก้ไขปัญหา

### หาก Build ล้มเหลว
```bash
# ลบ cache และ build ใหม่
expo r -c
eas build --platform android --profile production --clear-cache
```

### หาก Keystore ไม่ทำงาน
1. ไปที่ EAS Dashboard
2. ลบ keystore เก่า
3. สร้าง keystore ใหม่
4. Build ใหม่

## 📞 การติดต่อ

หากมีปัญหาหรือคำถาม:
- Email: uradev222@gmail.com
- GitHub: https://github.com/prhdev222
- EAS Dashboard: https://expo.dev/accounts/prhdev222/projects/my-health-tracker

---

**หมายเหตุ**: ตรวจสอบข้อมูลล่าสุดจาก EAS documentation ที่ https://docs.expo.dev/build/setup/
