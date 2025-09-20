// Email Service สำหรับส่งรายงานข้อมูลสุขภาพ
// ใช้ระบบส่งอีเมลแบบง่ายโดยไม่ต้องใช้ Google API

import * as MailComposer from 'expo-mail-composer';
import { HealthRecord } from '../database/schema';
import { databaseService } from '../database/database';

export interface EmailReport {
  clinicName: string;
  clinicEmail: string;
  clinicPhone: string;
  clinicLineId?: string;
  patientName?: string;
  reportDate: string;
  healthRecords: HealthRecord[];
  summary: {
    avgSystolic: number;
    avgDiastolic: number;
    avgBloodSugar: number;
    recordCount: number;
    period: string;
  };
}

export class EmailService {
  // สร้างเนื้อหาอีเมลรายงาน
  static generateEmailContent(report: EmailReport): string {
    const { clinicName, patientName, reportDate, healthRecords, summary } = report;
    
    let content = `
รายงานข้อมูลสุขภาพ
========================

คลินิก/โรงพยาบาล: ${clinicName}
ผู้ป่วย: ${patientName || 'ไม่ระบุ'}
วันที่รายงาน: ${reportDate}

สรุปข้อมูล (${summary.period}):
- จำนวนการบันทึก: ${summary.recordCount} ครั้ง
- ความดันโลหิตเฉลี่ย: ${summary.avgSystolic.toFixed(1)}/${summary.avgDiastolic.toFixed(1)} mmHg
- น้ำตาลในเลือดเฉลี่ย: ${summary.avgBloodSugar.toFixed(1)} mg/dL

รายละเอียดข้อมูล:
`;

    healthRecords.forEach((record, index) => {
      const bpStatus = record.systolic && record.diastolic ? this.getBloodPressureStatus(record.systolic, record.diastolic) : null;
      const bsStatus = record.bloodSugar ? this.getBloodSugarStatus(record.bloodSugar) : null;
      
      content += `
${index + 1}. วันที่: ${record.date} เวลา: ${record.time}
   ${record.systolic && record.diastolic ? `- ความดันโลหิต: ${record.systolic}/${record.diastolic} mmHg (${bpStatus?.status || 'ไม่ระบุ'})` : ''}
   ${record.bloodSugar ? `- น้ำตาลในเลือด: ${record.bloodSugar} mg/dL (${bsStatus?.status || 'ไม่ระบุ'})` : ''}
   ${record.notes ? `- หมายเหตุ: ${record.notes}` : ''}
`;
    });

    content += `
---
ส่งจากแอป My Health Tracker
`;

    return content;
  }

  // วิเคราะห์สถานะความดันโลหิต
  private static getBloodPressureStatus(systolic: number, diastolic: number): { status: string } {
    if (systolic < 120 && diastolic < 80) return { status: 'ปกติ' };
    if (systolic < 130 && diastolic < 80) return { status: 'สูงเล็กน้อย' };
    if (systolic < 140 && diastolic < 90) return { status: 'ความดันสูงระดับ 1' };
    if (systolic < 180 && diastolic < 120) return { status: 'ความดันสูงระดับ 2' };
    return { status: 'ความดันสูงวิกฤต' };
  }

  // วิเคราะห์สถานะน้ำตาลในเลือด
  private static getBloodSugarStatus(bloodSugar: number): { status: string } {
    if (bloodSugar < 100) return { status: 'ปกติ' };
    if (bloodSugar < 126) return { status: 'เสี่ยงเบาหวาน' };
    return { status: 'เบาหวาน' };
  }

  // สร้างรายงานและส่งอีเมลแบบง่าย
  static async generateAndSendReport(): Promise<boolean> {
    try {
      // ดึงข้อมูลการตั้งค่าคลินิก
      const settings = await databaseService.getUserSettings();
      if (!settings || !settings.clinicEmail) {
        throw new Error('กรุณาตั้งค่าอีเมลคลินิกในหน้าตั้งค่าก่อน');
      }

      // ดึงข้อมูลสุขภาพ 3 เดือนล่าสุด
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const startDate = threeMonthsAgo.toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      const healthRecords = await databaseService.getHealthRecordsByDateRange(startDate, endDate);

      if (healthRecords.length === 0) {
        throw new Error('ไม่พบข้อมูลสุขภาพในช่วง 3 เดือนล่าสุดสำหรับสร้างรายงาน');
      }

      // สร้างเนื้อหาอีเมลแบบตารางสวยงาม
      const emailContent = this.generateShortEmailContent(healthRecords, settings);

      // เปิดแอปอีเมลของระบบแบบ plain text
      await this.openEmailApp(settings.clinicEmail, 'รายงานข้อมูลสุขภาพ - My Health Tracker', emailContent);

      return true;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  // สร้างเนื้อหาอีเมลแบบตาราง plain text สวยงาม
  private static generateShortEmailContent(healthRecords: HealthRecord[], settings: any): string {
    // แยกข้อมูลตามประเภท
    const bloodPressureRecords = healthRecords.filter(record => record.systolic && record.diastolic);
    const heartRateRecords = healthRecords.filter(record => record.heartRate);
    const bloodSugarRecords = healthRecords.filter(record => record.bloodSugar);

    // คำนวณช่วงเวลา
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startDateStr = threeMonthsAgo.toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const endDateStr = new Date().toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // สร้างตาราง plain text สำหรับความดันโลหิต
    let bpTable = '';
    if (bloodPressureRecords.length > 0) {
      bpTable = `
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🩸 ข้อมูลความดันโลหิต (${bloodPressureRecords.length} รายการ)                    │
├─────────────┬──────┬─────┬─────┬──────────────┬────────────────────────────────┤
│ วันที่       │ เวลา │ SBP │ DBP │ เวลาวัด      │ หมายเหตุ                        │
├─────────────┼──────┼─────┼─────┼──────────────┼────────────────────────────────┤`;
      
      bloodPressureRecords.slice(0, 10).forEach((record) => {
        const date = record.date.padEnd(11);
        const time = record.time.padEnd(6);
        const sbp = record.systolic?.toString().padEnd(3) || '-'.padEnd(3);
        const dbp = record.diastolic?.toString().padEnd(3) || '-'.padEnd(3);
        const bpTime = (record.bpTime || '-').padEnd(12);
        const notes = (record.notes || '-').padEnd(30);
        
        bpTable += `
│ ${date} │ ${time} │ ${sbp} │ ${dbp} │ ${bpTime} │ ${notes} │`;
      });
      
      bpTable += `
└─────────────┴──────┴─────┴─────┴──────────────┴────────────────────────────────┘`;
      
      if (bloodPressureRecords.length > 10) {
        bpTable += `

... และอีก ${bloodPressureRecords.length - 10} รายการ`;
      }
    }

    // สร้างตาราง plain text สำหรับน้ำตาลในเลือด
    let bsTable = '';
    if (bloodSugarRecords.length > 0) {
      bsTable = `
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🩸 ข้อมูลน้ำตาลในเลือด (${bloodSugarRecords.length} รายการ)                        │
├─────────────┬──────┬─────────────────┬──────────────┬────────────────────────────┤
│ วันที่       │ เวลา │ น้ำตาล (mg/dL)  │ เวลาวัด      │ หมายเหตุ                    │
├─────────────┼──────┼─────────────────┼──────────────┼────────────────────────────┤`;
      
      bloodSugarRecords.slice(0, 10).forEach((record) => {
        const date = record.date.padEnd(11);
        const time = record.time.padEnd(6);
        const bsValue = record.bloodSugar || 0;
        const bs = bsValue.toString().padEnd(15);
        const bsTime = (record.bloodSugarTime || '-').padEnd(12);
        const notes = (record.notes || '-').padEnd(24);
        
        bsTable += `
│ ${date} │ ${time} │ ${bs} │ ${bsTime} │ ${notes} │`;
      });
      
      bsTable += `
└─────────────┴──────┴─────────────────┴──────────────┴────────────────────────────┘`;
      
      if (bloodSugarRecords.length > 10) {
        bsTable += `

... และอีก ${bloodSugarRecords.length - 10} รายการ`;
      }
    }

    // สร้างตาราง plain text สำหรับชีพจร
    let hrTable = '';
    if (heartRateRecords.length > 0) {
      hrTable = `
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 💓 ข้อมูลชีพจร (${heartRateRecords.length} รายการ)                                │
├─────────────┬──────┬─────────────────┬──────────────────────────────────────────┤
│ วันที่       │ เวลา │ ชีพจร (bpm)     │ หมายเหตุ                                  │
├─────────────┼──────┼─────────────────┼──────────────────────────────────────────┤`;
      
      heartRateRecords.slice(0, 10).forEach((record) => {
        const date = record.date.padEnd(11);
        const time = record.time.padEnd(6);
        const hrValue = record.heartRate || 0;
        const hr = hrValue.toString().padEnd(15);
        const notes = (record.notes || '-').padEnd(40);
        
        hrTable += `
│ ${date} │ ${time} │ ${hr} │ ${notes} │`;
      });
      
      hrTable += `
└─────────────┴──────┴─────────────────┴──────────────────────────────────────────┘`;
      
      if (heartRateRecords.length > 10) {
        hrTable += `

... และอีก ${heartRateRecords.length - 10} รายการ`;
      }
    }

    // สร้างสรุปผลการวิเคราะห์
    let analysisSection = '';
    if (bloodPressureRecords.length > 0 || heartRateRecords.length > 0 || bloodSugarRecords.length > 0) {
      analysisSection = `
📈 สรุปผลการวิเคราะห์
─────────────────────────────────────────────────────────────────────────────────`;
      
      if (bloodPressureRecords.length > 0) {
        const avgSystolic = bloodPressureRecords.reduce((sum, r) => sum + r.systolic!, 0) / bloodPressureRecords.length;
        const avgDiastolic = bloodPressureRecords.reduce((sum, r) => sum + r.diastolic!, 0) / bloodPressureRecords.length;
        const bpStatus = this.getBloodPressureStatus(avgSystolic, avgDiastolic);
        analysisSection += `
ความดันโลหิตเฉลี่ย: ${avgSystolic.toFixed(1)}/${avgDiastolic.toFixed(1)} mmHg (${bpStatus.status})`;
      }
      
      if (heartRateRecords.length > 0) {
        const avgHeartRate = heartRateRecords.reduce((sum, r) => sum + r.heartRate!, 0) / heartRateRecords.length;
        analysisSection += `
ชีพจรเฉลี่ย: ${avgHeartRate.toFixed(1)} bpm`;
      }
      
      if (bloodSugarRecords.length > 0) {
        const avgBloodSugar = bloodSugarRecords.reduce((sum, r) => sum + r.bloodSugar!, 0) / bloodSugarRecords.length;
        const bsStatus = this.getBloodSugarStatus(avgBloodSugar);
        analysisSection += `
น้ำตาลในเลือดเฉลี่ย: ${avgBloodSugar.toFixed(1)} mg/dL (${bsStatus.status})`;
      }
    }

    const content = `
═══════════════════════════════════════════════════════════════════════════════════
📊 รายงานข้อมูลสุขภาพ
My Health Tracker
═══════════════════════════════════════════════════════════════════════════════════

📋 ข้อมูลผู้ป่วย
─────────────────────────────────────────────────────────────────────────────────
ชื่อ-นามสกุล: ${settings.patientFirstName || 'ไม่ระบุ'} ${settings.patientLastName || 'ไม่ระบุ'}
เลขประจำตัว: ${settings.patientHN || 'ไม่ระบุ'}
เบอร์โทรศัพท์: ${settings.patientPhone || 'ไม่ระบุ'}
ช่วงเวลารายงาน: ${startDateStr} - ${endDateStr} (3 เดือนล่าสุด)

📊 สรุปข้อมูล
─────────────────────────────────────────────────────────────────────────────────
ความดันโลหิต: ${bloodPressureRecords.length} รายการ
น้ำตาลในเลือด: ${bloodSugarRecords.length} รายการ
ชีพจร: ${heartRateRecords.length} รายการ
รวมทั้งหมด: ${healthRecords.length} รายการ

${bpTable}

${bsTable}

${hrTable}

${analysisSection}

═══════════════════════════════════════════════════════════════════════════════════
ขอแสดงความนับถือ
${settings.patientFirstName || 'ผู้ป่วย'}

📱 ส่งจากแอป My Health Tracker
วันที่: ${new Date().toLocaleString('th-TH')}
═══════════════════════════════════════════════════════════════════════════════════`;

    return content;
  }

  // สร้างเนื้อหาอีเมลแบบง่าย
  private static generateSimpleEmailContent(healthRecords: HealthRecord[], settings: any): string {
    // แยกข้อมูลตามประเภท
    const bloodPressureRecords = healthRecords.filter(record => record.systolic && record.diastolic);
    const heartRateRecords = healthRecords.filter(record => record.heartRate);
    const bloodSugarRecords = healthRecords.filter(record => record.bloodSugar);

    let content = `รายงานข้อมูลสุขภาพ
========================

เรียน คุณหมอ/พยาบาล ที่คลินิก ${settings.clinicName},

นี่คือรายงานสรุปข้อมูลสุขภาพของคนไข้จากแอป My Health Tracker

ข้อมูลผู้ป่วย:
  ชื่อ-นามสกุล: ${settings.patientFirstName} ${settings.patientLastName}
${settings.patientHN ? `  เลขประจำตัวผู้ป่วย (HN): ${settings.patientHN}` : ''}
${settings.patientPhone ? `  เบอร์โทรศัพท์: ${settings.patientPhone}` : ''}

ข้อมูลติดต่อคลินิก:
  ชื่อคลินิก: ${settings.clinicName}
  อีเมล: ${settings.clinicEmail}
  เบอร์โทรศัพท์: ${settings.clinicPhone}
${settings.clinicLineId ? `  Line ID: ${settings.clinicLineId}` : ''}

วันที่รายงาน: ${new Date().toLocaleDateString('th-TH')}
จำนวนการบันทึกทั้งหมด: ${healthRecords.length} ครั้ง

═══════════════════════════════════════════════════════════════
📊 สรุปข้อมูลตามประเภท
═══════════════════════════════════════════════════════════════

📈 ความดันโลหิต: ${bloodPressureRecords.length} ครั้ง
📊 ชีพจร: ${heartRateRecords.length} ครั้ง  
🩸 น้ำตาลในเลือด: ${bloodSugarRecords.length} ครั้ง

═══════════════════════════════════════════════════════════════
📈 ตารางข้อมูลความดันโลหิต
═══════════════════════════════════════════════════════════════
`;

    if (bloodPressureRecords.length > 0) {
      content += `วันที่        | เวลา  | ความดันโลหิต (mmHg) | เวลาวัด | หมายเหตุ
${'─'.repeat(80)}
`;
      
      bloodPressureRecords.forEach(record => {
        const bpStatus = this.getBloodPressureStatus(record.systolic!, record.diastolic!);
        const date = record.date;
        const time = record.time;
        const bp = `${record.systolic}/${record.diastolic}`;
        const bpTime = record.bpTime || '-';
        const notes = record.notes || '-';
        
        content += `${date} | ${time.padEnd(5)} | ${bp.padEnd(20)} | ${bpTime.padEnd(8)} | ${notes}
`;
      });
    } else {
      content += `ไม่พบข้อมูลความดันโลหิต
`;
    }

    content += `
═══════════════════════════════════════════════════════════════
📊 ตารางข้อมูลชีพจร
═══════════════════════════════════════════════════════════════
`;

    if (heartRateRecords.length > 0) {
      content += `วันที่        | เวลา  | ชีพจร (bpm) | หมายเหตุ
${'─'.repeat(60)}
`;
      
      heartRateRecords.forEach(record => {
        const date = record.date;
        const time = record.time;
        const hr = record.heartRate!.toString();
        const notes = record.notes || '-';
        
        content += `${date} | ${time.padEnd(5)} | ${hr.padEnd(12)} | ${notes}
`;
      });
    } else {
      content += `ไม่พบข้อมูลชีพจร
`;
    }

    content += `
═══════════════════════════════════════════════════════════════
🩸 ตารางข้อมูลน้ำตาลในเลือด
═══════════════════════════════════════════════════════════════
`;

    if (bloodSugarRecords.length > 0) {
      content += `วันที่        | เวลา  | น้ำตาล (mg/dL) | เวลาวัด | หมายเหตุ
${'─'.repeat(80)}
`;
      
      bloodSugarRecords.forEach(record => {
        const bsStatus = this.getBloodSugarStatus(record.bloodSugar!);
        const date = record.date;
        const time = record.time;
        const bs = record.bloodSugar!.toString();
        const bsTime = record.bloodSugarTime || '-';
        const notes = record.notes || '-';
        
        content += `${date} | ${time.padEnd(5)} | ${bs.padEnd(15)} | ${bsTime.padEnd(8)} | ${notes}
`;
      });
    } else {
      content += `ไม่พบข้อมูลน้ำตาลในเลือด
`;
    }

    content += `
═══════════════════════════════════════════════════════════════
📋 สรุปผลการวิเคราะห์
═══════════════════════════════════════════════════════════════
`;

    // สรุปความดันโลหิต
    if (bloodPressureRecords.length > 0) {
      const avgSystolic = bloodPressureRecords.reduce((sum, r) => sum + r.systolic!, 0) / bloodPressureRecords.length;
      const avgDiastolic = bloodPressureRecords.reduce((sum, r) => sum + r.diastolic!, 0) / bloodPressureRecords.length;
      content += `ความดันโลหิตเฉลี่ย: ${avgSystolic.toFixed(1)}/${avgDiastolic.toFixed(1)} mmHg
`;
    }

    // สรุปชีพจร
    if (heartRateRecords.length > 0) {
      const avgHeartRate = heartRateRecords.reduce((sum, r) => sum + r.heartRate!, 0) / heartRateRecords.length;
      content += `ชีพจรเฉลี่ย: ${avgHeartRate.toFixed(1)} bpm
`;
    }

    // สรุปน้ำตาลในเลือด
    if (bloodSugarRecords.length > 0) {
      const avgBloodSugar = bloodSugarRecords.reduce((sum, r) => sum + r.bloodSugar!, 0) / bloodSugarRecords.length;
      content += `น้ำตาลในเลือดเฉลี่ย: ${avgBloodSugar.toFixed(1)} mg/dL
`;
    }

    content += `
═══════════════════════════════════════════════════════════════
ขอแสดงความนับถือ
ผู้ใช้งาน My Health Tracker
วันที่ส่งรายงาน: ${new Date().toLocaleString('th-TH')}
`;

    return content;
  }

  // เปิดแอปอีเมลของระบบ
  private static async openEmailApp(to: string, subject: string, body: string): Promise<void> {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: [to],
        subject: subject,
        body: body,
        isHtml: false,
      });
    } else {
      throw new Error('ไม่สามารถเปิดแอปอีเมลได้ กรุณาติดตั้งแอปอีเมลในอุปกรณ์');
    }
  }

  // แปลง HTML เป็น plain text
  private static convertHtmlToPlainText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // ลบ HTML tags
      .replace(/&nbsp;/g, ' ') // แทนที่ &nbsp; ด้วย space
      .replace(/&amp;/g, '&') // แทนที่ &amp; ด้วย &
      .replace(/&lt;/g, '<') // แทนที่ &lt; ด้วย <
      .replace(/&gt;/g, '>') // แทนที่ &gt; ด้วย >
      .replace(/\s+/g, ' ') // รวม spaces หลายตัวเป็นตัวเดียว
      .trim();
  }

  // เปิดแอปอีเมลของระบบพร้อม HTML
  private static async openEmailAppWithHTML(to: string, subject: string, htmlBody: string, textBody: string): Promise<void> {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: [to],
        subject: subject,
        body: htmlBody,
        isHtml: true,
      });
    } else {
      // ถ้าไม่รองรับ HTML ให้ใช้ text version
      await this.openEmailApp(to, subject, textBody);
    }
  }

  // เปิดแอปอีเมลของระบบพร้อมไฟล์ CSV
  private static async openEmailAppWithCSV(to: string, subject: string, body: string, csvContent: string): Promise<void> {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      // ใส่ข้อมูล CSV ในเนื้อหาอีเมล (ไม่สามารถแนบไฟล์ได้)
      const bodyWithCSV = `${body}\n\n═══════════════════════════════════════════════════════════════\n📊 ข้อมูล CSV (สามารถคัดลอกไปใช้ใน Excel ได้)\n═══════════════════════════════════════════════════════════════\n\n${csvContent}`;
      
      await MailComposer.composeAsync({
        recipients: [to],
        subject: subject,
        body: bodyWithCSV,
        isHtml: false,
      });
    } else {
      // ถ้าไม่สามารถส่งอีเมลได้ ให้ใส่ CSV ในเนื้อหาอีเมล
      const bodyWithCSV = `${body}\n\n═══════════════════════════════════════════════════════════════\n📊 ข้อมูล CSV (สามารถคัดลอกไปใช้ใน Excel ได้)\n═══════════════════════════════════════════════════════════════\n\n${csvContent}`;
      await this.openEmailApp(to, subject, bodyWithCSV);
    }
  }

  // สร้างเนื้อหาอีเมลแบบ HTML สำหรับตารางที่สวยงาม
  static generateHTMLEmailContent(healthRecords: HealthRecord[], settings: any): string {
    // แยกข้อมูลตามประเภท
    const bloodPressureRecords = healthRecords.filter(record => record.systolic && record.diastolic);
    const heartRateRecords = healthRecords.filter(record => record.heartRate);
    const bloodSugarRecords = healthRecords.filter(record => record.bloodSugar);

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Sarabun', Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section-title { background-color: #3498db; color: white; padding: 10px 15px; border-radius: 5px; margin-bottom: 15px; font-weight: bold; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .summary-card { background-color: #ecf0f1; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #3498db; }
        .summary-number { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .summary-label { color: #7f8c8d; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #34495e; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f8f9fa; }
        tr:hover { background-color: #e8f4f8; }
        .status-normal { color: #27ae60; font-weight: bold; }
        .status-warning { color: #f39c12; font-weight: bold; }
        .status-danger { color: #e74c3c; font-weight: bold; }
        .no-data { text-align: center; color: #7f8c8d; font-style: italic; padding: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 รายงานข้อมูลสุขภาพ</h1>
            <p>คลินิก/โรงพยาบาล: ${settings.clinicName}</p>
        </div>

        <div class="section">
            <h3>👤 ข้อมูลผู้ป่วย</h3>
            <p><strong>ชื่อ-นามสกุล:</strong> ${settings.patientFirstName} ${settings.patientLastName}</p>
            ${settings.patientHN ? `<p><strong>เลขประจำตัวผู้ป่วย (HN):</strong> ${settings.patientHN}</p>` : ''}
            ${settings.patientPhone ? `<p><strong>เบอร์โทรศัพท์:</strong> ${settings.patientPhone}</p>` : ''}
        </div>

        <div class="section">
            <h3>🏥 ข้อมูลติดต่อคลินิก</h3>
            <p><strong>ชื่อคลินิก:</strong> ${settings.clinicName}</p>
            <p><strong>อีเมล:</strong> ${settings.clinicEmail}</p>
            <p><strong>เบอร์โทรศัพท์:</strong> ${settings.clinicPhone}</p>
            ${settings.clinicLineId ? `<p><strong>Line ID:</strong> ${settings.clinicLineId}</p>` : ''}
        </div>

        <div class="section">
            <h3>📈 สรุปข้อมูลตามประเภท</h3>
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-number">${bloodPressureRecords.length}</div>
                    <div class="summary-label">📈 ความดันโลหิต</div>
                </div>
                <div class="summary-card">
                    <div class="summary-number">${heartRateRecords.length}</div>
                    <div class="summary-label">📊 ชีพจร</div>
                </div>
                <div class="summary-card">
                    <div class="summary-number">${bloodSugarRecords.length}</div>
                    <div class="summary-label">🩸 น้ำตาลในเลือด</div>
                </div>
            </div>
        </div>
`;

    // ตารางความดันโลหิต
    html += `
        <div class="section">
            <div class="section-title">📈 ข้อมูลความดันโลหิต</div>
`;
    
    if (bloodPressureRecords.length > 0) {
      html += `
            <table>
                <thead>
                    <tr>
                        <th>วันที่</th>
                        <th>เวลา</th>
                        <th>ความดันโลหิต (mmHg)</th>
                        <th>เวลาวัด</th>
                        <th>สถานะ</th>
                        <th>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
`;
      
      bloodPressureRecords.forEach(record => {
        const bpStatus = this.getBloodPressureStatus(record.systolic!, record.diastolic!);
        const statusClass = this.getStatusClass(bpStatus.status);
        html += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${record.time}</td>
                        <td><strong>${record.systolic}/${record.diastolic}</strong></td>
                        <td>${record.bpTime || '-'}</td>
                        <td class="${statusClass}">${bpStatus}</td>
                        <td>${record.notes || '-'}</td>
                    </tr>
`;
      });
      
      html += `
                </tbody>
            </table>
`;
    } else {
      html += `<div class="no-data">ไม่พบข้อมูลความดันโลหิต</div>`;
    }

    html += `        </div>`;

    // ตารางชีพจร
    html += `
        <div class="section">
            <div class="section-title">📊 ข้อมูลชีพจร</div>
`;
    
    if (heartRateRecords.length > 0) {
      html += `
            <table>
                <thead>
                    <tr>
                        <th>วันที่</th>
                        <th>เวลา</th>
                        <th>ชีพจร (bpm)</th>
                        <th>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
`;
      
      heartRateRecords.forEach(record => {
        html += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${record.time}</td>
                        <td><strong>${record.heartRate}</strong></td>
                        <td>${record.notes || '-'}</td>
                    </tr>
`;
      });
      
      html += `
                </tbody>
            </table>
`;
    } else {
      html += `<div class="no-data">ไม่พบข้อมูลชีพจร</div>`;
    }

    html += `        </div>`;

    // ตารางน้ำตาลในเลือด
    html += `
        <div class="section">
            <div class="section-title">🩸 ข้อมูลน้ำตาลในเลือด</div>
`;
    
    if (bloodSugarRecords.length > 0) {
      html += `
            <table>
                <thead>
                    <tr>
                        <th>วันที่</th>
                        <th>เวลา</th>
                        <th>น้ำตาล (mg/dL)</th>
                        <th>เวลาวัด</th>
                        <th>สถานะ</th>
                        <th>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
`;
      
      bloodSugarRecords.forEach(record => {
        const bsStatus = this.getBloodSugarStatus(record.bloodSugar!);
        const statusClass = this.getBloodSugarStatusClass(bsStatus.status);
        html += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${record.time}</td>
                        <td><strong>${record.bloodSugar}</strong></td>
                        <td>${record.bloodSugarTime || '-'}</td>
                        <td class="${statusClass}">${bsStatus}</td>
                        <td>${record.notes || '-'}</td>
                    </tr>
`;
      });
      
      html += `
                </tbody>
            </table>
`;
    } else {
      html += `<div class="no-data">ไม่พบข้อมูลน้ำตาลในเลือด</div>`;
    }

    html += `        </div>`;

    // สรุปผลการวิเคราะห์
    html += `
        <div class="section">
            <div class="section-title">📋 สรุปผลการวิเคราะห์</div>
`;

    if (bloodPressureRecords.length > 0) {
      const avgSystolic = bloodPressureRecords.reduce((sum, r) => sum + r.systolic!, 0) / bloodPressureRecords.length;
      const avgDiastolic = bloodPressureRecords.reduce((sum, r) => sum + r.diastolic!, 0) / bloodPressureRecords.length;
      html += `<p><strong>ความดันโลหิตเฉลี่ย:</strong> ${avgSystolic.toFixed(1)}/${avgDiastolic.toFixed(1)} mmHg</p>`;
    }

    if (heartRateRecords.length > 0) {
      const avgHeartRate = heartRateRecords.reduce((sum, r) => sum + r.heartRate!, 0) / heartRateRecords.length;
      html += `<p><strong>ชีพจรเฉลี่ย:</strong> ${avgHeartRate.toFixed(1)} bpm</p>`;
    }

    if (bloodSugarRecords.length > 0) {
      const avgBloodSugar = bloodSugarRecords.reduce((sum, r) => sum + r.bloodSugar!, 0) / bloodSugarRecords.length;
      html += `<p><strong>น้ำตาลในเลือดเฉลี่ย:</strong> ${avgBloodSugar.toFixed(1)} mg/dL</p>`;
    }

    html += `
        </div>

        <div class="footer">
            <p>ขอแสดงความนับถือ<br>ผู้ใช้งาน My Health Tracker</p>
            <p>วันที่ส่งรายงาน: ${new Date().toLocaleString('th-TH')}</p>
        </div>
    </div>
</body>
</html>
`;

    return html;
  }

  // ฟังก์ชันช่วยสำหรับกำหนด CSS class ตามสถานะ
  private static getStatusClass(status: string): string {
    if (status === 'ปกติ') return 'status-normal';
    if (status.includes('สูงเล็กน้อย') || status.includes('เสี่ยง')) return 'status-warning';
    return 'status-danger';
  }

  private static getBloodSugarStatusClass(status: string): string {
    if (status === 'ปกติ') return 'status-normal';
    if (status === 'เสี่ยงเบาหวาน') return 'status-warning';
    return 'status-danger';
  }

  // สร้างไฟล์ CSV สำหรับส่งแนบ
  static generateCSVContent(healthRecords: HealthRecord[]): string {
    let csv = 'วันที่,เวลา,ความดันโลหิตตัวบน,ความดันโลหิตตัวล่าง,เวลาวัดความดัน,ชีพจร,น้ำตาลในเลือด,เวลาวัดน้ำตาล,หมายเหตุ\n';
    
    healthRecords.forEach(record => {
      const systolic = record.systolic || '';
      const diastolic = record.diastolic || '';
      const bpTime = record.bpTime || '';
      const heartRate = record.heartRate || '';
      const bloodSugar = record.bloodSugar || '';
      const bloodSugarTime = record.bloodSugarTime || '';
      const notes = (record.notes || '').replace(/"/g, '""'); // Escape quotes for CSV
      
      csv += `"${record.date}","${record.time}","${systolic}","${diastolic}","${bpTime}","${heartRate}","${bloodSugar}","${bloodSugarTime}","${notes}"\n`;
    });
    
    return csv;
  }

  // สร้างไฟล์ CSV แยกตามประเภท
  static generateSeparatedCSVContent(healthRecords: HealthRecord[]): string {
    // แยกข้อมูลตามประเภท
    const bloodPressureRecords = healthRecords.filter(record => record.systolic && record.diastolic);
    const heartRateRecords = healthRecords.filter(record => record.heartRate);
    const bloodSugarRecords = healthRecords.filter(record => record.bloodSugar);

    let csv = 'รายงานข้อมูลสุขภาพ - แยกตามประเภท\n';
    csv += 'สร้างเมื่อ: ' + new Date().toLocaleString('th-TH') + '\n\n';

    // ตารางความดันโลหิต
    if (bloodPressureRecords.length > 0) {
      csv += '=== ข้อมูลความดันโลหิต ===\n';
      csv += 'วันที่,เวลา,ความดันโลหิตตัวบน,ความดันโลหิตตัวล่าง,เวลาวัด,หมายเหตุ\n';
      
      bloodPressureRecords.forEach(record => {
        const notes = (record.notes || '').replace(/"/g, '""');
        csv += `"${record.date}","${record.time}","${record.systolic}","${record.diastolic}","${record.bpTime || ''}","${notes}"\n`;
      });
      csv += '\n';
    }

    // ตารางชีพจร
    if (heartRateRecords.length > 0) {
      csv += '=== ข้อมูลชีพจร ===\n';
      csv += 'วันที่,เวลา,ชีพจร (bpm),หมายเหตุ\n';
      
      heartRateRecords.forEach(record => {
        const notes = (record.notes || '').replace(/"/g, '""');
        csv += `"${record.date}","${record.time}","${record.heartRate}","${notes}"\n`;
      });
      csv += '\n';
    }

    // ตารางน้ำตาลในเลือด
    if (bloodSugarRecords.length > 0) {
      csv += '=== ข้อมูลน้ำตาลในเลือด ===\n';
      csv += 'วันที่,เวลา,น้ำตาลในเลือด (mg/dL),เวลาวัด,หมายเหตุ\n';
      
      bloodSugarRecords.forEach(record => {
        const notes = (record.notes || '').replace(/"/g, '""');
        csv += `"${record.date}","${record.time}","${record.bloodSugar}","${record.bloodSugarTime || ''}","${notes}"\n`;
      });
      csv += '\n';
    }

    // สรุปข้อมูล
    csv += '=== สรุปข้อมูล ===\n';
    csv += 'ประเภท,จำนวนรายการ\n';
    csv += `"ความดันโลหิต","${bloodPressureRecords.length}"\n`;
    csv += `"ชีพจร","${heartRateRecords.length}"\n`;
    csv += `"น้ำตาลในเลือด","${bloodSugarRecords.length}"\n`;
    csv += `"รวมทั้งหมด","${healthRecords.length}"\n`;

    return csv;
  }
}
