// Database Service สำหรับ My Health Tracker
// จัดการการเชื่อมต่อและ CRUD operations กับ SQLite

import * as SQLite from 'expo-sqlite';
import { 
  HealthRecord, 
  UserSettings, 
  CREATE_HEALTH_RECORDS_TABLE, 
  CREATE_USER_SETTINGS_TABLE, 
  CREATE_INDEXES 
} from './schema';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    try {
      console.log('Opening database...');
      this.db = await SQLite.openDatabaseAsync('health_tracker.db');
      
      if (!this.db) {
        throw new Error('Failed to open database');
      }
      
      console.log('Database opened, migrating schema...');
      // ตรวจสอบและอัปเดต schema
      await this.migrateDatabase();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      this.db = null;
      throw error;
    }
  }

  private async migrateDatabase(): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized in migrateDatabase');
      throw new Error('Database not initialized');
    }
    
    try {
      // สร้างตาราง health_records ถ้าไม่มี
      await this.db.execAsync(CREATE_HEALTH_RECORDS_TABLE);
      
      // ตรวจสอบว่าตาราง user_settings มีอยู่หรือไม่
      const tables = await this.db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'"
      );
      
        if (tables.length === 0) {
          // สร้างตารางใหม่
          await this.db.execAsync(CREATE_USER_SETTINGS_TABLE);
        } else {
          // ตรวจสอบและเพิ่มคอลัมน์ที่ขาดหายไป
          const columns = await this.db.getAllAsync("PRAGMA table_info(user_settings)");
          const columnNames = columns.map((col: any) => col.name);

          // เพิ่มคอลัมน์ข้อมูลผู้ป่วย
          if (!columnNames.includes('patient_first_name')) {
            await this.db.execAsync('ALTER TABLE user_settings ADD COLUMN patient_first_name TEXT;');
          }
          if (!columnNames.includes('patient_last_name')) {
            await this.db.execAsync('ALTER TABLE user_settings ADD COLUMN patient_last_name TEXT;');
          }
          if (!columnNames.includes('patient_hn')) {
            await this.db.execAsync('ALTER TABLE user_settings ADD COLUMN patient_hn TEXT;');
          }
          if (!columnNames.includes('patient_phone')) {
            await this.db.execAsync('ALTER TABLE user_settings ADD COLUMN patient_phone TEXT;');
          }
          // เพิ่มคอลัมน์ข้อมูลคลินิก
          if (!columnNames.includes('clinic_name')) {
            await this.db.execAsync('ALTER TABLE user_settings ADD COLUMN clinic_name TEXT;');
          }
          if (!columnNames.includes('clinic_email')) {
            await this.db.execAsync('ALTER TABLE user_settings ADD COLUMN clinic_email TEXT;');
          }
          if (!columnNames.includes('clinic_phone')) {
            await this.db.execAsync('ALTER TABLE user_settings ADD COLUMN clinic_phone TEXT;');
          }
          if (!columnNames.includes('clinic_line_id')) {
            await this.db.execAsync('ALTER TABLE user_settings ADD COLUMN clinic_line_id TEXT;');
          }
        
        // อัปเดตข้อมูลเก่า (ถ้ามีคอลัมน์เก่า)
        try {
          const oldColumns = await this.db.getAllAsync("PRAGMA table_info(user_settings)");
          const oldColumnNames = oldColumns.map((col: any) => col.name);
          
            if (oldColumnNames.includes('hospital_email')) {
              await this.db.execAsync(`
                UPDATE user_settings
                SET patient_first_name = COALESCE(patient_first_name, ''),
                    patient_last_name = COALESCE(patient_last_name, ''),
                    patient_hn = COALESCE(patient_hn, ''),
                    patient_phone = COALESCE(patient_phone, ''),
                    clinic_name = COALESCE(clinic_name, 'คลินิกสุขภาพดี'),
                    clinic_email = COALESCE(clinic_email, COALESCE(hospital_email, '')),
                    clinic_phone = COALESCE(clinic_phone, ''),
                    clinic_line_id = COALESCE(clinic_line_id, COALESCE(google_sheets_id, ''))
                WHERE patient_first_name IS NULL OR patient_last_name IS NULL OR clinic_name IS NULL OR clinic_email IS NULL;
              `);
            } else {
              // ถ้าไม่มีคอลัมน์เก่า ให้ใส่ค่าเริ่มต้น
              await this.db.execAsync(`
                UPDATE user_settings
                SET patient_first_name = COALESCE(patient_first_name, ''),
                    patient_last_name = COALESCE(patient_last_name, ''),
                    patient_hn = COALESCE(patient_hn, ''),
                    patient_phone = COALESCE(patient_phone, ''),
                    clinic_name = COALESCE(clinic_name, 'คลินิกสุขภาพดี'),
                    clinic_email = COALESCE(clinic_email, ''),
                    clinic_phone = COALESCE(clinic_phone, ''),
                    clinic_line_id = COALESCE(clinic_line_id, '')
                WHERE patient_first_name IS NULL OR patient_last_name IS NULL OR clinic_name IS NULL OR clinic_email IS NULL;
              `);
            }
        } catch (error) {
          console.log('Skipping data migration:', error);
        }
      }
      
      // ตรวจสอบและเพิ่มคอลัมน์ blood_sugar_time และ bp_time ใน health_records
      const healthColumns = await this.db.getAllAsync("PRAGMA table_info(health_records)");
      const healthColumnNames = healthColumns.map((col: any) => col.name);
      
      if (!healthColumnNames.includes('blood_sugar_time')) {
        await this.db.execAsync('ALTER TABLE health_records ADD COLUMN blood_sugar_time TEXT;');
      }
      
      if (!healthColumnNames.includes('bp_time')) {
        await this.db.execAsync('ALTER TABLE health_records ADD COLUMN bp_time TEXT;');
      }
      
      if (!healthColumnNames.includes('heart_rate')) {
        await this.db.execAsync('ALTER TABLE health_records ADD COLUMN heart_rate INTEGER;');
      }
      
      // เปลี่ยนคอลัมน์ให้เป็น nullable
      try {
        await this.db.execAsync('ALTER TABLE health_records ADD COLUMN systolic_new INTEGER;');
        await this.db.execAsync('ALTER TABLE health_records ADD COLUMN diastolic_new INTEGER;');
        await this.db.execAsync('ALTER TABLE health_records ADD COLUMN blood_sugar_new REAL;');
        
        await this.db.execAsync('UPDATE health_records SET systolic_new = systolic, diastolic_new = diastolic, blood_sugar_new = blood_sugar;');
        await this.db.execAsync('ALTER TABLE health_records DROP COLUMN systolic;');
        await this.db.execAsync('ALTER TABLE health_records DROP COLUMN diastolic;');
        await this.db.execAsync('ALTER TABLE health_records DROP COLUMN blood_sugar;');
        
        await this.db.execAsync('ALTER TABLE health_records RENAME COLUMN systolic_new TO systolic;');
        await this.db.execAsync('ALTER TABLE health_records RENAME COLUMN diastolic_new TO diastolic;');
        await this.db.execAsync('ALTER TABLE health_records RENAME COLUMN blood_sugar_new TO blood_sugar;');
      } catch (error) {
        // ถ้าไม่สามารถเปลี่ยนได้ ให้ข้าม
        console.log('Skipping column modification:', error);
      }
      
      // สร้าง indexes
      for (const indexQuery of CREATE_INDEXES) {
        try {
          await this.db.execAsync(indexQuery);
        } catch (error) {
          // ข้าม index ที่มีอยู่แล้ว
          console.log('Index already exists:', error);
        }
      }
    } catch (error) {
      console.error('Error migrating database:', error);
      // ถ้า migration ล้มเหลว ให้สร้างใหม่
      await this.db.execAsync('DROP TABLE IF EXISTS health_records;');
      await this.db.execAsync('DROP TABLE IF EXISTS user_settings;');
      await this.db.execAsync(CREATE_HEALTH_RECORDS_TABLE);
      await this.db.execAsync(CREATE_USER_SETTINGS_TABLE);
    }
  }

  // Health Records CRUD Operations
  async addHealthRecord(record: Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (!this.db) {
      console.error('Database not initialized in addHealthRecord');
      throw new Error('Database not initialized');
    }
    
    const now = new Date().toISOString();
    const result = await this.db.runAsync(
      `INSERT INTO health_records (systolic, diastolic, heart_rate, blood_sugar, blood_sugar_time, bp_time, date, time, notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.systolic || null, 
        record.diastolic || null, 
        record.heartRate || null,
        record.bloodSugar || null, 
        record.bloodSugarTime || null,
        record.bpTime || null,
        record.date, 
        record.time, 
        record.notes || '', 
        now, 
        now
      ]
    );
    
    return result.lastInsertRowId as number;
  }

  async getHealthRecords(limit?: number, offset?: number): Promise<HealthRecord[]> {
    if (!this.db) {
      console.error('Database not initialized');
      throw new Error('Database not initialized');
    }
    
    try {
      let query = 'SELECT * FROM health_records ORDER BY created_at DESC';
      const params: any[] = [];
      
      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
        
        if (offset) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }
      
      console.log('Executing query:', query, 'with params:', params);
      const result = await this.db.getAllAsync(query, params);
      console.log('Query result count:', result.length);
      
      return result.map((row: any) => ({
        id: row.id as number,
        systolic: row.systolic as number | undefined,
        diastolic: row.diastolic as number | undefined,
        heartRate: row.heart_rate as number | undefined,
        bloodSugar: row.blood_sugar as number | undefined,
        bloodSugarTime: row.blood_sugar_time as string | undefined,
        bpTime: row.bp_time as string | undefined,
        date: row.date as string,
        time: row.time as string,
        notes: row.notes as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string
      }));
    } catch (error) {
      console.error('Error in getHealthRecords:', error);
      throw error;
    }
  }

  async updateHealthRecord(id: number, record: Partial<Omit<HealthRecord, 'id' | 'createdAt'>>): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized in updateHealthRecord');
      throw new Error('Database not initialized');
    }
    
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    
    if (record.systolic !== undefined) {
      fields.push('systolic = ?');
      values.push(record.systolic);
    }
    if (record.diastolic !== undefined) {
      fields.push('diastolic = ?');
      values.push(record.diastolic);
    }
    if (record.heartRate !== undefined) {
      fields.push('heart_rate = ?');
      values.push(record.heartRate);
    }
    if (record.bloodSugar !== undefined) {
      fields.push('blood_sugar = ?');
      values.push(record.bloodSugar);
    }
    if (record.bloodSugarTime !== undefined) {
      fields.push('blood_sugar_time = ?');
      values.push(record.bloodSugarTime);
    }
    if (record.bpTime !== undefined) {
      fields.push('bp_time = ?');
      values.push(record.bpTime);
    }
    if (record.date !== undefined) {
      fields.push('date = ?');
      values.push(record.date);
    }
    if (record.time !== undefined) {
      fields.push('time = ?');
      values.push(record.time);
    }
    if (record.notes !== undefined) {
      fields.push('notes = ?');
      values.push(record.notes);
    }
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    await this.db.runAsync(
      `UPDATE health_records SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteHealthRecord(id: number): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized in deleteHealthRecord');
      throw new Error('Database not initialized');
    }
    
    await this.db.runAsync('DELETE FROM health_records WHERE id = ?', [id]);
  }

  // User Settings Operations
  async saveUserSettings(settings: Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized in saveUserSettings');
      throw new Error('Database not initialized');
    }
    
    const now = new Date().toISOString();
    
    // ตรวจสอบว่ามี settings อยู่แล้วหรือไม่
    const existing = await this.db.getFirstAsync('SELECT id FROM user_settings LIMIT 1');
    
    if (existing) {
      // อัปเดต settings ที่มีอยู่
      await this.db.runAsync(
        `UPDATE user_settings SET 
         patient_first_name = ?, patient_last_name = ?, patient_hn = ?, patient_phone = ?,
         clinic_name = ?, clinic_email = ?, clinic_phone = ?, clinic_line_id = ?, updated_at = ?`,
        [
          settings.patientFirstName, settings.patientLastName, settings.patientHN || '', settings.patientPhone || '',
          settings.clinicName, settings.clinicEmail, settings.clinicPhone, settings.clinicLineId || '', now
        ]
      );
    } else {
      // สร้าง settings ใหม่
      await this.db.runAsync(
        `INSERT INTO user_settings (patient_first_name, patient_last_name, patient_hn, patient_phone, 
                                   clinic_name, clinic_email, clinic_phone, clinic_line_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          settings.patientFirstName, settings.patientLastName, settings.patientHN || '', settings.patientPhone || '',
          settings.clinicName, settings.clinicEmail, settings.clinicPhone, settings.clinicLineId || '', now, now
        ]
      );
    }
  }

  async getUserSettings(): Promise<UserSettings | null> {
    if (!this.db) {
      console.error('Database not initialized in getUserSettings');
      throw new Error('Database not initialized');
    }
    
    const result = await this.db.getFirstAsync('SELECT * FROM user_settings LIMIT 1') as any;
    
    if (!result) return null;
    
    return {
      id: result.id as number,
      patientFirstName: result.patient_first_name as string || '',
      patientLastName: result.patient_last_name as string || '',
      patientHN: result.patient_hn as string || '',
      patientPhone: result.patient_phone as string || '',
      clinicName: result.clinic_name as string || '',
      clinicEmail: result.clinic_email as string || '',
      clinicPhone: result.clinic_phone as string || '',
      clinicLineId: result.clinic_line_id as string || '',
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string
    };
  }

  // Statistics and Reports
  async getHealthStats(days: number = 30): Promise<{
    avgSystolic: number;
    avgDiastolic: number;
    avgBloodSugar: number;
    recordCount: number;
  }> {
    if (!this.db) {
      console.error('Database not initialized in getHealthStats');
      throw new Error('Database not initialized');
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    const result = await this.db.getFirstAsync(
      `SELECT 
        AVG(systolic) as avg_systolic,
        AVG(diastolic) as avg_diastolic,
        AVG(blood_sugar) as avg_blood_sugar,
        COUNT(*) as record_count
       FROM health_records 
       WHERE date >= ?`,
      [cutoffDateStr]
    ) as any;
    
    return {
      avgSystolic: result?.avg_systolic || 0,
      avgDiastolic: result?.avg_diastolic || 0,
      avgBloodSugar: result?.avg_blood_sugar || 0,
      recordCount: result?.record_count || 0
    };
  }

  // ดึงข้อมูลตามช่วงเวลา
  async getHealthRecordsByDateRange(startDate: string, endDate: string): Promise<HealthRecord[]> {
    if (!this.db) {
      console.error('Database not initialized');
      throw new Error('Database not initialized');
    }
    
    try {
      const query = `
        SELECT * FROM health_records 
        WHERE date BETWEEN ? AND ? 
        ORDER BY date DESC, time DESC
      `;
      console.log('Executing date range query:', query, 'with params:', [startDate, endDate]);
      const result = await this.db.getAllAsync(query, [startDate, endDate]);
      console.log('Date range query result count:', result.length);
      
      return result.map((row: any) => ({
        id: row.id as number,
        systolic: row.systolic as number | undefined,
        diastolic: row.diastolic as number | undefined,
        heartRate: row.heart_rate as number | undefined,
        bloodSugar: row.blood_sugar as number | undefined,
        bloodSugarTime: row.blood_sugar_time as string | undefined,
        bpTime: row.bp_time as string | undefined,
        date: row.date as string,
        time: row.time as string,
        notes: row.notes as string | undefined,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string
      }));
    } catch (error) {
      console.error('Error in getHealthRecordsByDateRange:', error);
      throw error;
    }
  }

  // ลบข้อมูลเก่า (เหลือแค่เดือนล่าสุด)
  async deleteOldRecords(monthsToKeep: number = 3): Promise<number> {
    if (!this.db) {
      console.error('Database not initialized in deleteOldRecords');
      throw new Error('Database not initialized');
    }
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];
    
    const query = `DELETE FROM health_records WHERE date < ?`;
    const result = await this.db.runAsync(query, [cutoffDateString]);
    
    console.log(`Deleted ${result.changes} old records (older than ${cutoffDateString})`);
    return result.changes || 0;
  }

  // ลบข้อมูลทั้งหมด
  async deleteAllRecords(): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized in deleteAllRecords');
      throw new Error('Database not initialized');
    }
    
    await this.db.runAsync('DELETE FROM health_records');
    console.log('All health records deleted');
  }
}

export const databaseService = new DatabaseService();
