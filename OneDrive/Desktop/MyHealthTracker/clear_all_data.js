// สคริปต์ลบข้อมูลทั้งหมด
const { databaseService } = require('./src/database/database');

async function clearAllData() {
  try {
    console.log('กำลังลบข้อมูลทั้งหมด...');
    await databaseService.deleteAllRecords();
    console.log('✅ ลบข้อมูลทั้งหมดเรียบร้อยแล้ว!');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

clearAllData();
