# คำแนะนำการ Build แอปสำหรับ Google Play Store

## 🚀 ขั้นตอนการ Build

### 1. ติดตั้ง EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login เข้า Expo
```bash
eas login
```
*ต้องมีบัญชี Expo ก่อน หากไม่มีให้ไปสมัครที่ https://expo.dev*

### 3. ตั้งค่า Project
```bash
eas build:configure
```

### 4. Build Android App Bundle (AAB)
```bash
eas build --platform android --profile production
```

### 5. Build APK สำหรับทดสอบ
```bash
eas build --platform android --profile preview
```

## 📱 ข้อมูลแอป

### ข้อมูลพื้นฐาน
- **ชื่อแอป**: My Health Tracker
- **Package Name**: com.myhealthtracker.app
- **Version**: 1.0.0
- **Version Code**: 1

### ข้อมูลกราฟิก
- **App Icon**: `./assets/icon.png` (512x512)
- **Adaptive Icon**: `./assets/adaptive-icon.png`
- **Splash Screen**: `./assets/splash-icon.png`

## 🔐 การ Signing

EAS จะจัดการการ signing ให้อัตโนมัติ โดยจะสร้าง keystore และใช้ในการ sign APK/AAB

## 📦 ไฟล์ที่ได้

### Production Build
- ไฟล์ AAB สำหรับอัปโหลดไปยัง Google Play Store
- ไฟล์จะถูกอัปโหลดไปยัง EAS servers
- สามารถดาวน์โหลดได้จาก EAS dashboard

### Preview Build
- ไฟล์ APK สำหรับทดสอบ
- สามารถติดตั้งบนอุปกรณ์ Android ได้ทันที

## 🎯 การอัปโหลดไปยัง Google Play Store

### 1. สร้าง Google Play Console Account
- ไปที่ https://play.google.com/console
- สร้างบัญชีผู้พัฒนา (เสียค่าธรรมเนียม $25)

### 2. สร้างแอปใหม่
- คลิก "Create app"
- กรอกข้อมูลตามที่ระบุใน `GOOGLE_PLAY_STORE_GUIDE.md`

### 3. อัปโหลด AAB
- ไปที่ "Release" > "Production"
- อัปโหลดไฟล์ AAB ที่ได้จาก EAS

### 4. กรอกข้อมูลแอป
- ข้อมูลแอป
- Screenshots
- Privacy Policy
- ข้อมูลการจัดหมวดหมู่

## 📋 Checklist ก่อน Build

- [ ] ตรวจสอบ app.json
- [ ] ตรวจสอบ eas.json
- [ ] ตรวจสอบ assets (icon, splash)
- [ ] ตรวจสอบ package.json
- [ ] ทดสอบแอปให้แน่ใจว่าไม่มี error
- [ ] ตรวจสอบ permissions
- [ ] ตรวจสอบ version และ versionCode

## 🐛 การแก้ไขปัญหา

### Build Error
```bash
# ลบ cache และ build ใหม่
expo r -c
eas build --platform android --profile production --clear-cache
```

### Login Error
```bash
# Logout และ login ใหม่
eas logout
eas login
```

### Permission Error
ตรวจสอบ permissions ใน app.json:
```json
"android": {
  "permissions": [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE"
  ]
}
```

## 📞 การติดต่อ

หากมีปัญหาหรือคำถาม:
- Email: [อีเมลของคุณ]
- GitHub: [GitHub repository]

---

**หมายเหตุ**: ตรวจสอบข้อมูลล่าสุดจาก EAS documentation ที่ https://docs.expo.dev/build/introduction/
