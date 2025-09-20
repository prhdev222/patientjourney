// Database Schema สำหรับ My Health Tracker
// ตามข้อกำหนด FR-07: ใช้ SQLite สำหรับเก็บข้อมูลในเครื่อง

export interface HealthRecord {
  id: number;
  systolic?: number;     // ความดันโลหิตตัวบน (ไม่บังคับ)
  diastolic?: number;    // ความดันโลหิตตัวล่าง (ไม่บังคับ)
  heartRate?: number;    // ชีพจร (ไม่บังคับ)
  bloodSugar?: number;   // ระดับน้ำตาลในเลือด (DTX) (ไม่บังคับ)
  bloodSugarTime?: string; // เวลาสำหรับ DTX (ก่อนอาหารเช้า, กลางวัน, เย็น, etc.)
  bpTime?: string;       // เวลาสำหรับ BP (ก่อนกินยา, หลังกินยา, etc.)
  date: string;          // วันที่บันทึก (ISO format)
  time: string;          // เวลาบันทึก (HH:MM format)
  notes?: string;        // หมายเหตุเพิ่มเติม
  createdAt: string;     // วันที่สร้างเรคคอร์ด
  updatedAt: string;     // วันที่อัปเดตล่าสุด
}

export interface UserSettings {
  id: number;
  // ข้อมูลผู้ป่วย
  patientFirstName: string;    // ชื่อผู้ป่วย (บังคับ)
  patientLastName: string;     // นามสกุลผู้ป่วย (บังคับ)
  patientHN?: string;          // เลขประจำตัวผู้ป่วย (HN)
  patientPhone?: string;       // เบอร์โทรศัพท์ผู้ป่วย
  // ข้อมูลคลินิก
  clinicName: string;          // ชื่อคลินิก/โรงพยาบาล
  clinicEmail: string;         // อีเมลคลินิก
  clinicPhone: string;         // เบอร์โทรศัพท์คลินิก
  clinicLineId?: string;       // Line ID ของคลินิก
  createdAt: string;
  updatedAt: string;
}

// SQL Commands สำหรับสร้างตาราง
export const CREATE_HEALTH_RECORDS_TABLE = `
  CREATE TABLE IF NOT EXISTS health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    systolic INTEGER,
    diastolic INTEGER,
    heart_rate INTEGER,
    blood_sugar REAL,
    blood_sugar_time TEXT,
    bp_time TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const CREATE_USER_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_first_name TEXT NOT NULL,
    patient_last_name TEXT NOT NULL,
    patient_hn TEXT,
    patient_phone TEXT,
    clinic_name TEXT NOT NULL,
    clinic_email TEXT NOT NULL,
    clinic_phone TEXT NOT NULL,
    clinic_line_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

// Indexes สำหรับการค้นหาที่เร็วขึ้น
export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_health_records_date ON health_records(date);`,
  `CREATE INDEX IF NOT EXISTS idx_health_records_created_at ON health_records(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_user_settings_clinic_email ON user_settings(clinic_email);`
];
