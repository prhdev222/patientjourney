import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { HealthRecord } from '../database/schema';
import { databaseService } from '../database/database';

export type DateRangeType = 'day' | 'week' | 'month' | 'custom';

export interface DateRange {
  type: DateRangeType;
  startDate: string;
  endDate: string;
}

export class CSVExportService {
  // สร้างช่วงเวลาตามประเภท
  static getDateRange(type: DateRangeType, customStartDate?: string, customEndDate?: string): DateRange {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    switch (type) {
      case 'day':
        return {
          type: 'day',
          startDate: todayString,
          endDate: todayString
        };
        
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);
        return {
          type: 'week',
          startDate: weekStart.toISOString().split('T')[0],
          endDate: todayString
        };
        
      case 'month':
        const monthStart = new Date(today);
        monthStart.setMonth(today.getMonth() - 1);
        return {
          type: 'month',
          startDate: monthStart.toISOString().split('T')[0],
          endDate: todayString
        };
        
      case 'custom':
        return {
          type: 'custom',
          startDate: customStartDate || todayString,
          endDate: customEndDate || todayString
        };
        
      default:
        return {
          type: 'day',
          startDate: todayString,
          endDate: todayString
        };
    }
  }

  // สร้างเนื้อหา CSV
  static generateCSVContent(healthRecords: HealthRecord[]): string {
    if (healthRecords.length === 0) {
      return 'ไม่พบข้อมูลในช่วงเวลาที่เลือก';
    }

    // แยกข้อมูลตามประเภท - ใช้ field names ที่ถูกต้องจาก database
    const bloodPressureRecords = healthRecords.filter(record => record.systolic && record.diastolic);
    const heartRateRecords = healthRecords.filter(record => record.heartRate && record.heartRate > 0);
    const bloodSugarRecords = healthRecords.filter(record => record.bloodSugar && record.bloodSugar > 0);

    console.log('CSV Content - Total records:', healthRecords.length);
    console.log('CSV Content - BP records:', bloodPressureRecords.length);
    console.log('CSV Content - Heart Rate records:', heartRateRecords.length);
    console.log('CSV Content - Blood Sugar records:', bloodSugarRecords.length);
    
    // Debug: ดูข้อมูลแต่ละ record
    console.log('CSV Debug - Sample record values:');
    healthRecords.slice(0, 3).forEach((record, index) => {
      console.log(`Record ${index + 1}:`, {
        systolic: record.systolic,
        diastolic: record.diastolic,
        heartRate: record.heartRate,
        bloodSugar: record.bloodSugar,
        bloodSugarTime: record.bloodSugarTime,
        // ตรวจสอบ field names จาก database
        rawRecord: record
      });
    });

    // Helper function to safely format CSV values
    const formatCSVValue = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      // ตรวจสอบและแก้ไขค่าที่อาจทำให้เกิด ERROR
      if (stringValue === 'NaN' || stringValue === 'undefined' || stringValue === 'null') {
        return '';
      }
      // Escape double quotes และ newlines
      return stringValue.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ');
    };

    // สร้าง CSV แยกเป็น 3 ชีท
    let csv = '';
    
    // ===== ชีท 1: ความดันโลหิต =====
    csv += '=== ข้อมูลความดันโลหิต ===\n';
    csv += 'วันที่,เวลา,ความดันโลหิตตัวบน (SBP),ความดันโลหิตตัวล่าง (DBP),เวลาวัด,หมายเหตุ\n';
    
    bloodPressureRecords.forEach(record => {
      const notes = formatCSVValue(record.notes || '');
      const bpTime = formatCSVValue(record.bpTime || '');
      csv += `${formatCSVValue(record.date)},${formatCSVValue(record.time)},${formatCSVValue(record.systolic)},${formatCSVValue(record.diastolic)},${bpTime},${notes}\n`;
    });
    
    csv += '\n\n';
    
    // ===== ชีท 2: น้ำตาลในเลือด =====
    csv += '=== ข้อมูลน้ำตาลในเลือด ===\n';
    csv += 'วันที่,เวลา,น้ำตาลในเลือด (mg/dL),เวลาวัด,หมายเหตุ\n';
    
    bloodSugarRecords.forEach(record => {
      const notes = formatCSVValue(record.notes || '');
      const bloodSugarTime = formatCSVValue(record.bloodSugarTime || '');
      csv += `${formatCSVValue(record.date)},${formatCSVValue(record.time)},${formatCSVValue(record.bloodSugar)},${bloodSugarTime},${notes}\n`;
    });
    
    csv += '\n\n';
    
    // ===== ชีท 3: ชีพจร =====
    csv += '=== ข้อมูลชีพจร ===\n';
    csv += 'วันที่,เวลา,ชีพจร (bpm),หมายเหตุ\n';
    
    heartRateRecords.forEach(record => {
      const notes = formatCSVValue(record.notes || '');
      csv += `${formatCSVValue(record.date)},${formatCSVValue(record.time)},${formatCSVValue(record.heartRate)},${notes}\n`;
    });
    
    csv += '\n\n';
    
    // ===== สรุปข้อมูล =====
    csv += '=== สรุปข้อมูล ===\n';
    csv += 'ประเภท,จำนวนรายการ\n';
    csv += `ความดันโลหิต,${bloodPressureRecords.length}\n`;
    csv += `น้ำตาลในเลือด,${bloodSugarRecords.length}\n`;
    csv += `ชีพจร,${heartRateRecords.length}\n`;
    csv += `รวมทั้งหมด,${healthRecords.length}\n`;

    return csv;
  }

  // ส่งออกไฟล์ CSV
  static async exportToCSV(dateRange: DateRange): Promise<boolean> {
    try {
      // ดึงข้อมูลตามช่วงเวลา
      const healthRecords = await databaseService.getHealthRecordsByDateRange(
        dateRange.startDate, 
        dateRange.endDate
      );

      console.log('CSV Export - Date Range:', dateRange);
      console.log('CSV Export - Records found:', healthRecords.length);
      console.log('CSV Export - Sample records:', healthRecords.slice(0, 3));

      if (healthRecords.length === 0) {
        throw new Error('ไม่พบข้อมูลในช่วงเวลาที่เลือก');
      }

      // สร้างเนื้อหา CSV
      const csvContent = this.generateCSVContent(healthRecords);

      // สร้างชื่อไฟล์
      const dateRangeLabel = this.getDateRangeLabel(dateRange);
      const fileName = `health_data_${dateRangeLabel}_${new Date().toISOString().split('T')[0]}.csv`;

      // สร้างไฟล์
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: 'utf8',
      });

      // แชร์ไฟล์
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'ส่งออกข้อมูลสุขภาพ',
        });
        return true;
      } else {
        throw new Error('ไม่สามารถแชร์ไฟล์ได้');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  }

  // สร้างป้ายกำกับช่วงเวลา
  private static getDateRangeLabel(dateRange: DateRange): string {
    switch (dateRange.type) {
      case 'day':
        return 'รายวัน';
      case 'week':
        return 'รายสัปดาห์';
      case 'month':
        return 'รายเดือน';
      case 'custom':
        return 'กำหนดเอง';
      default:
        return 'ไม่ระบุ';
    }
  }
}
