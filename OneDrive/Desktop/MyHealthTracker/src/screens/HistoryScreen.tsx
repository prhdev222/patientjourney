// หน้าจอแสดงประวัติข้อมูลสุขภาพ
// ตามข้อกำหนด FR-04: แสดงประวัติข้อมูลในรูปแบบตารางหรือกราฟ

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  Dimensions,
  TextInput,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { databaseService } from '../database/database';
import { HealthRecord } from '../database/schema';
import { CSVExportService, DateRangeType } from '../services/csvExportService';

interface HistoryScreenProps {
  onNavigateToHome: () => void;
}

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'quarterly';
type ChartType = 'bp' | 'dtx' | 'dtx_other' | 'dtx_after_meal' | 'pulse';

export default function HistoryScreen({ onNavigateToHome }: HistoryScreenProps) {
  const navigation = useNavigation();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [chartType, setChartType] = useState<ChartType>('bp');
  const [showCharts, setShowCharts] = useState(true);
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false);
  const [showChartTypeDropdown, setShowChartTypeDropdown] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{time: string, date: string, value: number} | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [markedDates, setMarkedDates] = useState<{[key: string]: any}>({});

  useEffect(() => {
    loadRecords();
  }, []);

  // Refresh ข้อมูลเมื่อกลับมาที่หน้าประวัติ
  useFocusEffect(
    React.useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    try {
      console.log('Loading records...');
      
      // ตรวจสอบว่า database service พร้อมใช้งานหรือไม่
      if (!databaseService) {
        console.error('Database service not available');
        Alert.alert('เกิดข้อผิดพลาด', 'Database service ไม่พร้อมใช้งาน');
        return;
      }
      
      const data = await databaseService.getHealthRecords();
      console.log('Loaded records:', data.length);
      
      setRecords(data);
      
      // สร้าง marked dates สำหรับปฏิทิน
      createMarkedDates(data);
    } catch (error) {
      console.error('Error loading records:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  // สร้าง marked dates สำหรับปฏิทิน
  const createMarkedDates = (records: HealthRecord[]) => {
    const marked: {[key: string]: any} = {};
    
    records.forEach(record => {
      if (record.date) {
        marked[record.date] = {
          marked: true,
          dotColor: '#4CAF50',
          selectedColor: '#2196F3',
        };
      }
    });
    
    setMarkedDates(marked);
  };

  // ฟังก์ชันสำหรับ export CSV
  const handleExportCSV = async (dateRangeType: DateRangeType) => {
    try {
      setIsExporting(true);
      setShowExportDropdown(false);
      
      const dateRange = CSVExportService.getDateRange(dateRangeType);
      await CSVExportService.exportToCSV(dateRange);
      
      Alert.alert('สำเร็จ', 'ส่งออกข้อมูลเป็นไฟล์ CSV เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งออกไฟล์ได้: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const handleDeleteRecord = (id: number) => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบข้อมูลนี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteHealthRecord(id);
              await loadRecords();
              Alert.alert('สำเร็จ', 'ลบข้อมูลเรียบร้อยแล้ว');
            } catch (error) {
              console.error('Error deleting record:', error);
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getBloodPressureStatus = (systolic?: number, diastolic?: number) => {
    if (!systolic || !diastolic) return null;
    if (systolic < 120 && diastolic < 80) return { status: 'ปกติ', color: '#4CAF50' };
    if (systolic < 130 && diastolic < 80) return { status: 'สูงเล็กน้อย', color: '#FF9800' };
    if (systolic < 140 && diastolic < 90) return { status: 'ความดันสูงระดับ 1', color: '#FF5722' };
    if (systolic < 180 && diastolic < 120) return { status: 'ความดันสูงระดับ 2', color: '#F44336' };
    return { status: 'ความดันสูงวิกฤต', color: '#D32F2F' };
  };

  const getBloodSugarStatus = (bloodSugar?: number) => {
    if (!bloodSugar) return null;
    if (bloodSugar < 100) return { status: 'ปกติ', color: '#4CAF50' };
    if (bloodSugar < 126) return { status: 'เสี่ยงเบาหวาน', color: '#FF9800' };
    return { status: 'เบาหวาน', color: '#F44336' };
  };

  const getHeartRateStatus = (heartRate?: number) => {
    if (!heartRate) return null;
    if (heartRate >= 60 && heartRate <= 100) return { status: 'ปกติ', color: '#4CAF50' };
    if (heartRate >= 50 && heartRate <= 110) return { status: 'ใกล้ปกติ', color: '#FF9800' };
    if (heartRate < 50) return { status: 'เต้นช้า', color: '#2196F3' };
    return { status: 'เต้นเร็ว', color: '#F44336' };
  };

  // ฟังก์ชันสำหรับกรองข้อมูลตามช่วงเวลา
  const getFilteredRecords = () => {
    if (!records.length) return [];
    
    const now = new Date();
    const filteredRecords: HealthRecord[] = [];
    
    records.forEach(record => {
      const recordDate = new Date(record.date);
      let shouldInclude = false;
      
      switch (timeRange) {
        case 'daily':
          // ข้อมูล 7 วันที่ผ่านมา
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          shouldInclude = recordDate >= sevenDaysAgo;
          break;
        case 'weekly':
          // ข้อมูล 4 สัปดาห์ที่ผ่านมา
          const fourWeeksAgo = new Date(now);
          fourWeeksAgo.setDate(now.getDate() - 28);
          shouldInclude = recordDate >= fourWeeksAgo;
          break;
        case 'monthly':
          // ข้อมูล 6 เดือนที่ผ่านมา
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          shouldInclude = recordDate >= sixMonthsAgo;
          break;
        case 'quarterly':
          // ข้อมูล 12 เดือนที่ผ่านมา
          const twelveMonthsAgo = new Date(now);
          twelveMonthsAgo.setMonth(now.getMonth() - 12);
          shouldInclude = recordDate >= twelveMonthsAgo;
          break;
      }
      
      if (shouldInclude) {
        filteredRecords.push(record);
      }
    });
    
    return filteredRecords.sort((a, b) => {
      // เรียงตามวันที่และเวลา
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // ถ้าวันที่ต่างกัน ให้เรียงตามวันที่
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // ถ้าวันที่เดียวกัน ให้เรียงตามเวลา
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  // ฟังก์ชันสำหรับสร้างข้อมูลกราฟ
  const getChartData = () => {
    const filteredRecords = getFilteredRecords();
    if (filteredRecords.length === 0) return null;

    // สร้าง labels สำหรับทุกข้อมูล - แสดงเฉพาะเวลา
    const allLabels = filteredRecords.map(record => {
      const timeStr = record.time || '00:00';
      const hour = timeStr.split(':')[0];
      const minute = timeStr.split(':')[1];
      return `${hour}:${minute}`;
    });

    // สร้างข้อมูลวันที่แยกต่างหาก - แสดงเฉพาะข้อมูลที่มีจุดกราฟจริง
    const dateGroups: { [key: string]: string[] } = {};
    const validTimeIndices: number[] = [];
    
    // รวบรวม index ของเวลาที่มีข้อมูลจริง
    filteredRecords.forEach((record, index) => {
      if (chartType === 'bp') {
        if (record.systolic && record.diastolic) {
          validTimeIndices.push(index);
        }
      }
      if (chartType === 'pulse') {
        if (record.heartRate) {
          validTimeIndices.push(index);
        }
      }
      if (chartType === 'dtx' || chartType === 'dtx_other' || chartType === 'dtx_after_meal') {
        if (record.bloodSugar) {
          // ตรวจสอบประเภทของ DTX
          if (chartType === 'dtx_other' && record.bloodSugarTime === 'อื่นๆ') {
            validTimeIndices.push(index);
          } else if (chartType === 'dtx_after_meal' && record.bloodSugarTime === 'หลังอาหาร 2ชม') {
            validTimeIndices.push(index);
          } else if (chartType === 'dtx' && 
                     (record.bloodSugarTime === 'ก่อนอาหารเช้า' || 
                      record.bloodSugarTime === 'ก่อนอาหารกลางวัน' || 
                      record.bloodSugarTime === 'ก่อนอาหารเย็น' || 
                      record.bloodSugarTime === 'ก่อนนอน')) {
            validTimeIndices.push(index);
          }
        }
      }
    });

    // สร้าง dateGroups จากเวลาที่มีข้อมูลจริงเท่านั้น
    validTimeIndices.forEach(index => {
      const record = filteredRecords[index];
      const date = new Date(record.date);
      const dateKey = date.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = [];
      }
      dateGroups[dateKey].push(allLabels[index]);
    });

    // เรียงลำดับเวลาในแต่ละวัน
    Object.keys(dateGroups).forEach(dateKey => {
      dateGroups[dateKey].sort((a, b) => a.localeCompare(b));
    });

    const datasets = [];

    if (chartType === 'bp') {
      // สร้างข้อมูล BP - แสดงเฉพาะจุดที่มีข้อมูล
      const systolicData: (number | null)[] = [];
      const diastolicData: (number | null)[] = [];
      
      filteredRecords.forEach(record => {
        if (record.systolic && record.diastolic) {
          systolicData.push(record.systolic);
          diastolicData.push(record.diastolic);
        } else {
          systolicData.push(null);
          diastolicData.push(null);
        }
      });

      // กรองข้อมูลที่ไม่เป็น null
      const validIndices: number[] = [];
      systolicData.forEach((value, index) => {
        if (value !== null) validIndices.push(index);
      });

      if (validIndices.length > 0) {
        const validSystolicData = validIndices.map(i => systolicData[i]!);
        const validDiastolicData = validIndices.map(i => diastolicData[i]!);
        const validLabels = validIndices.map(i => allLabels[i]);

        datasets.push(
          {
            data: validSystolicData,
            color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`, // สีแดง
            strokeWidth: 2,
          },
          {
            data: validDiastolicData,
            color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`, // สีน้ำเงิน
            strokeWidth: 2,
          }
        );
      }
    }

    if (chartType === 'pulse') {
      // สร้างข้อมูล Pulse - แสดงเฉพาะจุดที่มีข้อมูล
      const heartRateData: (number | null)[] = [];
      
      filteredRecords.forEach(record => {
        if (record.heartRate) {
          heartRateData.push(record.heartRate);
        } else {
          heartRateData.push(null);
        }
      });

      // กรองข้อมูลที่ไม่เป็น null
      const validIndices: number[] = [];
      heartRateData.forEach((value, index) => {
        if (value !== null) validIndices.push(index);
      });

      if (validIndices.length > 0) {
        const validHeartRateData = validIndices.map(i => heartRateData[i]!);
        const validLabels = validIndices.map(i => allLabels[i]);

        datasets.push({
          data: validHeartRateData,
          color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`, // สีเหลือง
          strokeWidth: 2,
        });
      }
    }

    if (chartType === 'dtx' || chartType === 'dtx_other' || chartType === 'dtx_after_meal') {
      // สร้างข้อมูล DTX - แยกตามประเภท
      const bloodSugarData: (number | null)[] = [];
      
      console.log('DTX Chart Type:', chartType);
      console.log('Filtered Records for DTX:', filteredRecords.map(r => ({ 
        bloodSugar: r.bloodSugar, 
        bloodSugarTime: r.bloodSugarTime 
      })));
      
      filteredRecords.forEach(record => {
        if (record.bloodSugar) {
          console.log('Processing DTX record:', record.bloodSugar, record.bloodSugarTime, 'Chart Type:', chartType);
          
          // ตรวจสอบประเภทของ DTX
          if (chartType === 'dtx_other' && record.bloodSugarTime === 'อื่นๆ') {
            console.log('Found DTX Other:', record.bloodSugar, record.bloodSugarTime);
            bloodSugarData.push(record.bloodSugar);
          } else if (chartType === 'dtx_after_meal' && record.bloodSugarTime === 'หลังอาหาร 2ชม') {
            console.log('Found DTX After Meal:', record.bloodSugar, record.bloodSugarTime);
            bloodSugarData.push(record.bloodSugar);
          } else if (chartType === 'dtx' && 
                     (record.bloodSugarTime === 'ก่อนอาหารเช้า' || 
                      record.bloodSugarTime === 'ก่อนอาหารกลางวัน' || 
                      record.bloodSugarTime === 'ก่อนอาหารเย็น' || 
                      record.bloodSugarTime === 'ก่อนนอน')) {
            console.log('Found DTX Main (Before Meals):', record.bloodSugar, record.bloodSugarTime);
            bloodSugarData.push(record.bloodSugar);
          } else {
            console.log('DTX not matching any category:', record.bloodSugar, record.bloodSugarTime, 'Chart Type:', chartType);
            bloodSugarData.push(null);
          }
        } else {
          bloodSugarData.push(null);
        }
      });

      // กรองข้อมูลที่ไม่เป็น null
      const validIndices: number[] = [];
      bloodSugarData.forEach((value, index) => {
        if (value !== null) validIndices.push(index);
      });

      if (validIndices.length > 0) {
        const validBloodSugarData = validIndices.map(i => bloodSugarData[i]!);
        const validLabels = validIndices.map(i => allLabels[i]);

        console.log('DTX Valid Data:', validBloodSugarData);
        console.log('DTX Valid Labels:', validLabels);

        datasets.push({
          data: validBloodSugarData,
          color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`, // สีเขียว
          strokeWidth: 2,
        });
      } else {
        console.log('No valid DTX data found for chart type:', chartType);
      }
    }

    // ใช้ labels เฉพาะเวลาที่มีข้อมูลจริง
    const validLabels = validTimeIndices.map(i => allLabels[i]);
    
    return {
      labels: validLabels,
      datasets,
      dateGroups, // เพิ่มข้อมูลวันที่แยกต่างหาก
    };
  };

  const getChartTitle = () => {
    switch (chartType) {
      case 'bp': return 'กราฟความดันโลหิต (BP)';
      case 'dtx': return 'กราฟน้ำตาลในเลือด (ก่อนอาหาร-ก่อนนอน)';
      case 'dtx_other': return 'กราฟน้ำตาลในเลือด (อื่นๆ)';
      case 'dtx_after_meal': return 'กราฟน้ำตาลในเลือด (หลังอาหาร 2ชม)';
      case 'pulse': return 'กราฟชีพจร (Pulse)';
      default: return 'กราฟข้อมูลสุขภาพ';
    }
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'daily': return 'รายวัน';
      case 'weekly': return 'รายสัปดาห์';
      case 'monthly': return 'รายเดือน';
      case 'quarterly': return 'ราย 3 เดือน';
      default: return 'รายสัปดาห์';
    }
  };

  const getChartTypeLabel = () => {
    switch (chartType) {
      case 'bp': return 'ความดันโลหิต';
      case 'dtx': return 'น้ำตาลในเลือด (ก่อนอาหาร-ก่อนนอน)';
      case 'dtx_other': return 'น้ำตาลในเลือด (อื่นๆ)';
      case 'dtx_after_meal': return 'น้ำตาลในเลือด (หลังอาหาร 2ชม)';
      case 'pulse': return 'ชีพจร';
      default: return 'ความดันโลหิต';
    }
  };

  // คำนวณสถิติ 2 สัปดาห์ล่าสุด
  const calculateTwoWeekStats = () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];
    
    const recentRecords = records.filter(record => record.date >= twoWeeksAgoStr);
    
    // คำนวณค่าเฉลี่ย DTX (เฉพาะก่อนอาหารเช้า, กลางวัน, เย็น, ก่อนนอน)
    const dtxMealRecords = recentRecords.filter(record => 
      record.bloodSugar && 
      record.bloodSugarTime && 
      ['ก่อนอาหารเช้า', 'ก่อนอาหารกลางวัน', 'ก่อนอาหารเย็น', 'ก่อนนอน'].includes(record.bloodSugarTime)
    );
    
    const avgDTX = dtxMealRecords.length > 0 
      ? dtxMealRecords.reduce((sum, r) => sum + (r.bloodSugar || 0), 0) / dtxMealRecords.length 
      : 0;
    
    // คำนวณค่าเฉลี่ย SBP, DBP
    const bpRecords = recentRecords.filter(record => record.systolic && record.diastolic);
    const avgSBP = bpRecords.length > 0 
      ? bpRecords.reduce((sum, r) => sum + (r.systolic || 0), 0) / bpRecords.length 
      : 0;
    const avgDBP = bpRecords.length > 0 
      ? bpRecords.reduce((sum, r) => sum + (r.diastolic || 0), 0) / bpRecords.length 
      : 0;
    
    // คำนวณค่าเฉลี่ย Pulse
    const pulseRecords = recentRecords.filter(record => record.heartRate);
    const avgPulse = pulseRecords.length > 0 
      ? pulseRecords.reduce((sum, r) => sum + (r.heartRate || 0), 0) / pulseRecords.length 
      : 0;
    
    // ค่าสูงสุด-ต่ำสุด
    const maxSBP = bpRecords.length > 0 ? Math.max(...bpRecords.map(r => r.systolic || 0)) : 0;
    const minSBP = bpRecords.length > 0 ? Math.min(...bpRecords.map(r => r.systolic || 0)) : 0;
    const maxDBP = bpRecords.length > 0 ? Math.max(...bpRecords.map(r => r.diastolic || 0)) : 0;
    const minDBP = bpRecords.length > 0 ? Math.min(...bpRecords.map(r => r.diastolic || 0)) : 0;
    const maxPulse = pulseRecords.length > 0 ? Math.max(...pulseRecords.map(r => r.heartRate || 0)) : 0;
    const minPulse = pulseRecords.length > 0 ? Math.min(...pulseRecords.map(r => r.heartRate || 0)) : 0;
    const maxDTX = dtxMealRecords.length > 0 ? Math.max(...dtxMealRecords.map(r => r.bloodSugar || 0)) : 0;
    const minDTX = dtxMealRecords.length > 0 ? Math.min(...dtxMealRecords.map(r => r.bloodSugar || 0)) : 0;
    
    console.log('Two Week Stats Debug:', {
      recentRecords: recentRecords.length,
      dtxMealRecords: dtxMealRecords.length,
      bpRecords: bpRecords.length,
      pulseRecords: pulseRecords.length,
      avgDTX,
      avgSBP,
      avgDBP,
      avgPulse,
      maxSBP, minSBP,
      maxDBP, minDBP,
      maxPulse, minPulse,
      maxDTX, minDTX
    });
    
    return {
      avgDTX: avgDTX,
      avgSBP: avgSBP,
      avgDBP: avgDBP,
      avgPulse: avgPulse,
      maxSBP, minSBP,
      maxDBP, minDBP,
      maxPulse, minPulse,
      maxDTX, minDTX,
      recordCount: recentRecords.length
    };
  };

  // ข้อมูลล่าสุด 3 ครั้ง
  const getLatestThreeRecords = () => {
    return records
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3);
  };

  // ค้นหาข้อมูล
  const searchRecords = () => {
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }
    setShowSearchResults(true);
  };

  // ฟิลเตอร์ข้อมูลตามคำค้นหา
  const getFilteredSearchResults = () => {
    if (!searchQuery.trim()) return [];
    
    return records.filter(record => {
      const query = searchQuery.toLowerCase();
      
      // ค้นหาตามคำสำคัญ
      const hasBP = (
        query.includes('ความดัน') || 
        query.includes('bp') || 
        query.includes('ความดันโลหิต') ||
        query.includes('systolic') ||
        query.includes('diastolic')
      ) && (record.systolic || record.diastolic);
      
      const hasDTX = (
        query.includes('น้ำตาล') || 
        query.includes('dtx') || 
        query.includes('น้ำตาลในเลือด') ||
        query.includes('blood sugar') ||
        query.includes('glucose')
      ) && record.bloodSugar;
      
      const hasPulse = (
        query.includes('ชีพจร') || 
        query.includes('pulse') || 
        query.includes('heart rate') ||
        query.includes('hr') ||
        query.includes('bpm')
      ) && record.heartRate;
      
      // ค้นหาตามค่าตัวเลข
      const hasNumericValue = (
        (record.systolic && record.systolic.toString().includes(query)) ||
        (record.diastolic && record.diastolic.toString().includes(query)) ||
        (record.bloodSugar && record.bloodSugar.toString().includes(query)) ||
        (record.heartRate && record.heartRate.toString().includes(query))
      );
      
      // ค้นหาตามวันที่และเวลา
      const hasDateTime = (
        record.date.toLowerCase().includes(query) ||
        record.time.toLowerCase().includes(query)
      );
      
      // ค้นหาตามเวลาวัด
      const hasTimeInfo = (
        (record.bpTime && record.bpTime.toLowerCase().includes(query)) ||
        (record.bloodSugarTime && record.bloodSugarTime.toLowerCase().includes(query))
      );
      
      // ค้นหาตามหมายเหตุ
      const hasNotes = record.notes && record.notes.toLowerCase().includes(query);
      
      return hasBP || hasDTX || hasPulse || hasNumericValue || hasDateTime || hasTimeInfo || hasNotes;
    }).sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });
  };

  // ฟิลเตอร์ข้อมูลตามวันที่ที่เลือก
  const getFilteredRecordsByDate = (date: string) => {
    return records.filter(record => record.date === date)
      .sort((a, b) => {
        const timeA = new Date(`2000-01-01T${a.time}`);
        const timeB = new Date(`2000-01-01T${b.time}`);
        return timeB.getTime() - timeA.getTime();
      });
  };

  // จัดการการเลือกวันที่ในปฏิทิน
  const handleDayPress = (day: any) => {
    const selectedDateStr = day.dateString;
    setSelectedDate(selectedDateStr);
    setShowCalendar(false);
    
    // แสดงข้อมูลในวันที่ที่เลือก
    const dayRecords = getFilteredRecordsByDate(selectedDateStr);
    if (dayRecords.length > 0) {
      Alert.alert(
        `ข้อมูลวันที่ ${selectedDateStr}`,
        `พบข้อมูล ${dayRecords.length} รายการ\n\n${dayRecords.map(record => 
          `เวลา ${record.time}: ${record.systolic ? `ความดัน ${record.systolic}/${record.diastolic}` : ''}${record.bloodSugar ? ` น้ำตาล ${record.bloodSugar}` : ''}${record.heartRate ? ` ชีพจร ${record.heartRate}` : ''}`
        ).join('\n')}`,
        [{ text: 'ตกลง' }]
      );
    } else {
      Alert.alert('ไม่พบข้อมูล', `ไม่มีข้อมูลในวันที่ ${selectedDateStr}`);
    }
  };


  const screenWidth = Dimensions.get('window').width;

  const renderRecord = ({ item }: { item: HealthRecord }) => {
    const bpStatus = getBloodPressureStatus(item.systolic, item.diastolic);
    const bsStatus = getBloodSugarStatus(item.bloodSugar);
    const hrStatus = getHeartRateStatus(item.heartRate);

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
          <Text style={styles.recordTime}>{item.time}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteRecord(item.id)}
          >
            <Text style={styles.deleteButtonText}>ลบ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recordContent}>
          <View style={styles.measurementRow}>
            {item.systolic && item.diastolic && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>ความดันโลหิต</Text>
                <Text style={styles.measurementValue}>
                  {item.systolic}/{item.diastolic} mmHg
                </Text>
                {item.bpTime && (
                  <Text style={styles.timeText}>
                    ({item.bpTime})
                  </Text>
                )}
                {bpStatus && (
                  <Text style={[styles.statusText, { color: bpStatus.color }]}>
                    {bpStatus.status}
                  </Text>
                )}
              </View>
            )}

            {item.heartRate && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>ชีพจร</Text>
                <Text style={styles.measurementValue}>
                  {item.heartRate} bpm
                </Text>
                {hrStatus && (
                  <Text style={[styles.statusText, { color: hrStatus.color }]}>
                    {hrStatus.status}
                  </Text>
                )}
              </View>
            )}

            {item.bloodSugar && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>น้ำตาลในเลือด</Text>
                <Text style={styles.measurementValue}>
                  {item.bloodSugar} mg/dL
                </Text>
                {item.bloodSugarTime && (
                  <Text style={styles.timeText}>
                    ({item.bloodSugarTime})
                  </Text>
                )}
                {bsStatus && (
                  <Text style={[styles.statusText, { color: bsStatus.color }]}>
                    {bsStatus.status}
                  </Text>
                )}
              </View>
            )}
          </View>

          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>หมายเหตุ:</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>ยังไม่มีข้อมูลสุขภาพ</Text>
      <Text style={styles.emptyStateSubtext}>เริ่มบันทึกข้อมูลสุขภาพของคุณ</Text>
      <TouchableOpacity style={styles.addButton} onPress={onNavigateToHome}>
        <Text style={styles.addButtonText}>บันทึกข้อมูลแรก</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTimeRangeSelector = () => (
    <View style={styles.controlContainer}>
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownLabel}>ช่วงเวลา:</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
        >
          <Text style={styles.dropdownButtonText}>{getTimeRangeLabel()}</Text>
          <Text style={styles.dropdownArrow}>{showTimeRangeDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showTimeRangeDropdown && (
          <View style={styles.dropdownMenu}>
            {[
              { key: 'daily', label: 'รายวัน' },
              { key: 'weekly', label: 'รายสัปดาห์' },
              { key: 'monthly', label: 'รายเดือน' },
              { key: 'quarterly', label: 'ราย 3 เดือน' },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dropdownItem,
                  timeRange === key && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setTimeRange(key as TimeRange);
                  setShowTimeRangeDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    timeRange === key && styles.dropdownItemTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownLabel}>แสดงกราฟ:</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowChartTypeDropdown(!showChartTypeDropdown)}
        >
          <Text style={styles.dropdownButtonText}>{getChartTypeLabel()}</Text>
          <Text style={styles.dropdownArrow}>{showChartTypeDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showChartTypeDropdown && (
          <View style={styles.dropdownMenu}>
              {[
                { key: 'bp', label: 'ความดันโลหิต' },
                { key: 'dtx', label: 'น้ำตาลในเลือด (ก่อนอาหาร-ก่อนนอน)' },
                { key: 'dtx_other', label: 'น้ำตาลในเลือด (อื่นๆ)' },
                { key: 'dtx_after_meal', label: 'น้ำตาลในเลือด (หลังอาหาร 2ชม)' },
                { key: 'pulse', label: 'ชีพจร' },
              ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dropdownItem,
                  chartType === key && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setChartType(key as ChartType);
                  setShowChartTypeDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    chartType === key && styles.dropdownItemTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderCharts = () => {
    const chartData = getChartData();
    console.log('Chart Data:', chartData);
    console.log('Chart Datasets:', chartData?.datasets);
    console.log('Chart Labels:', chartData?.labels);
    
    if (!chartData || chartData.datasets.length === 0) {
      console.log('No chart data to display');
      return null;
    }

    return (
      <View style={styles.chartsContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{getChartTitle()}</Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowCharts(!showCharts)}
          >
            <Text style={styles.toggleButtonText}>
              {showCharts ? 'ซ่อนกราฟ' : 'แสดงกราฟ'}
            </Text>
          </TouchableOpacity>
        </View>

        {showCharts && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartWrapper}>
                <LineChart
                  data={chartData}
                  width={screenWidth - 40}
                  height={200}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#ffa726',
                    },
                    propsForLabels: {
                      fontSize: 12,
                      rotation: 0,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withDots={true}
                  withShadow={false}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  withInnerLines={true}
                  withOuterLines={true}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  fromZero={false}
                  segments={4}
                  onDataPointClick={(data) => {
                    const pointIndex = data.index;
                    const time = chartData.labels[pointIndex];
                    const value = chartData.datasets[0]?.data[pointIndex];
                    if (value) {
                      // หาวันที่จากข้อมูล
                      const filteredRecords = getFilteredRecords();
                      const record = filteredRecords.find(r => {
                        const timeStr = r.time || '00:00';
                        const hour = timeStr.split(':')[0];
                        const minute = timeStr.split(':')[1];
                        return `${hour}:${minute}` === time;
                      });
                      const date = record ? new Date(record.date).toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'ไม่ทราบวันที่';
                      
                      setSelectedPoint({
                        time: time,
                        date: date,
                        value: value
                      });
                    }
                  }}
                />
              
    {/* แสดงข้อมูลจุดที่เลือก */}
    {selectedPoint && (
      <View style={styles.selectedPointContainer}>
        <Text style={styles.selectedPointText}>
          เวลา: {selectedPoint.time} | วันที่: {selectedPoint.date} | ค่า: {selectedPoint.value}
        </Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setSelectedPoint(null)}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    )}

    {/* แสดงวันที่ด้านล่างกราฟ - แสดงแค่เวลาต้น-ท้ายสุด */}
    <View style={styles.dateGroupsContainer}>
      {Object.entries(chartData.dateGroups || {}).map(([date, times]) => {
        // แสดงแค่เวลาต้น-ท้ายสุด
        const firstTime = times[0];
        const lastTime = times[times.length - 1];
        const timeRange = firstTime === lastTime ? firstTime : `${firstTime} - ${lastTime}`;
        
        return (
          <View key={date} style={styles.dateGroup}>
            <Text style={styles.dateGroupTitle}>{date}</Text>
            <View style={styles.timesContainer}>
              <Text style={styles.timeLabel}>{timeRange}</Text>
            </View>
          </View>
        );
      })}
    </View>


              <View style={styles.chartLegend}>
                {chartType === 'all' || chartType === 'bp' ? (
                  <>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: '#ff6384' }]} />
                      <Text style={styles.legendText}>ความดันตัวบน (Systolic)</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: '#36a2eb' }]} />
                      <Text style={styles.legendText}>ความดันตัวล่าง (Diastolic)</Text>
                    </View>
                  </>
                ) : null}
                {chartType === 'all' || chartType === 'pulse' ? (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#ffce56' }]} />
                    <Text style={styles.legendText}>ชีพจร (Heart Rate)</Text>
                  </View>
                ) : null}
                {chartType === 'all' || chartType === 'dtx' || chartType === 'dtx_other' || chartType === 'dtx_after_meal' ? (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#4bc0c0' }]} />
                    <Text style={styles.legendText}>น้ำตาลในเลือด (DTX)</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ประวัติข้อมูลสุขภาพ</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Export Button - ย้ายลงมาด้านล่าง */}
      <View style={styles.exportSection}>
        <TouchableOpacity 
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]} 
          onPress={() => setShowExportDropdown(!showExportDropdown)}
          disabled={isExporting}
        >
          <Text style={styles.exportButtonText}>
            {isExporting ? 'กำลังส่งออก...' : '📥 ส่งออกข้อมูล CSV'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Export Dropdown */}
      {showExportDropdown && (
        <View style={styles.exportDropdown}>
          <TouchableOpacity 
            style={styles.exportOption} 
            onPress={() => handleExportCSV('day')}
          >
            <Text style={styles.exportOptionText}>📅 รายวัน (วันนี้)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.exportOption} 
            onPress={() => handleExportCSV('week')}
          >
            <Text style={styles.exportOptionText}>📊 รายสัปดาห์ (7 วันที่ผ่านมา)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.exportOption} 
            onPress={() => handleExportCSV('month')}
          >
            <Text style={styles.exportOptionText}>📈 รายเดือน (30 วันที่ผ่านมา)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.exportOption} 
            onPress={() => setShowExportDropdown(false)}
          >
            <Text style={[styles.exportOptionText, styles.cancelText]}>❌ ยกเลิก</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {renderTimeRangeSelector()}
          {renderCharts()}
          
          {/* สถิติ 2 สัปดาห์ล่าสุด */}
          {(() => {
            const stats = calculateTwoWeekStats();
            
            return (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>
                  📊 สถิติ 2 สัปดาห์ล่าสุด ({stats.recordCount} รายการ)
                </Text>
                
                {stats.recordCount === 0 ? (
                  <Text style={styles.noDataText}>ไม่มีข้อมูลใน 2 สัปดาห์ล่าสุด</Text>
                ) : (
                  <View style={styles.statsGrid}>
                    {/* ค่าเฉลี่ย */}
                    <View style={styles.statsSection}>
                      <Text style={styles.statsSectionTitle}>ค่าเฉลี่ย</Text>
                      {stats.avgDTX > 0 ? (
                        <Text style={styles.statsItem}>
                          DTX (ก่อนอาหาร): {stats.avgDTX.toFixed(1)} mg/dL
                        </Text>
                      ) : (
                        <Text style={styles.statsItemEmpty}>ไม่มีข้อมูล DTX</Text>
                      )}
                      {stats.avgSBP > 0 ? (
                        <Text style={styles.statsItem}>
                          SBP: {stats.avgSBP.toFixed(1)} mmHg
                        </Text>
                      ) : (
                        <Text style={styles.statsItemEmpty}>ไม่มีข้อมูล SBP</Text>
                      )}
                      {stats.avgDBP > 0 ? (
                        <Text style={styles.statsItem}>
                          DBP: {stats.avgDBP.toFixed(1)} mmHg
                        </Text>
                      ) : (
                        <Text style={styles.statsItemEmpty}>ไม่มีข้อมูล DBP</Text>
                      )}
                      {stats.avgPulse > 0 ? (
                        <Text style={styles.statsItem}>
                          Pulse: {stats.avgPulse.toFixed(1)} bpm
                        </Text>
                      ) : (
                        <Text style={styles.statsItemEmpty}>ไม่มีข้อมูล Pulse</Text>
                      )}
                    </View>
                    
                    {/* ค่าสูงสุด-ต่ำสุด */}
                    <View style={styles.statsSection}>
                      <Text style={styles.statsSectionTitle}>ค่าสูงสุด-ต่ำสุด</Text>
                      {stats.maxSBP > 0 ? (
                        <Text style={styles.statsItem}>
                          SBP: {stats.maxSBP} - {stats.minSBP} mmHg
                        </Text>
                      ) : (
                        <Text style={styles.statsItemEmpty}>ไม่มีข้อมูล SBP</Text>
                      )}
                      {stats.maxDBP > 0 ? (
                        <Text style={styles.statsItem}>
                          DBP: {stats.maxDBP} - {stats.minDBP} mmHg
                        </Text>
                      ) : (
                        <Text style={styles.statsItemEmpty}>ไม่มีข้อมูล DBP</Text>
                      )}
                      {stats.maxPulse > 0 ? (
                        <Text style={styles.statsItem}>
                          Pulse: {stats.maxPulse} - {stats.minPulse} bpm
                        </Text>
                      ) : (
                        <Text style={styles.statsItemEmpty}>ไม่มีข้อมูล Pulse</Text>
                      )}
                      {stats.maxDTX > 0 ? (
                        <Text style={styles.statsItem}>
                          DTX: {stats.maxDTX} - {stats.minDTX} mg/dL
                        </Text>
                      ) : (
                        <Text style={styles.statsItemEmpty}>ไม่มีข้อมูล DTX</Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })()}

          {/* ข้อมูลล่าสุด 3 ครั้ง */}
          {(() => {
            const latestRecords = getLatestThreeRecords();
            if (latestRecords.length === 0) return null;
            
            return (
              <View style={styles.latestRecordsContainer}>
                <Text style={styles.latestRecordsTitle}>📝 ข้อมูลล่าสุด 3 ครั้ง</Text>
                {latestRecords.map((record, index) => (
                  <View key={record.id} style={styles.latestRecordItem}>
                    <View style={styles.latestRecordHeader}>
                      <Text style={styles.latestRecordDate}>
                        {formatDate(record.date)} {record.time}
                      </Text>
                      <Text style={styles.latestRecordNumber}>#{index + 1}</Text>
                    </View>
                    
                    <View style={styles.latestRecordContent}>
                      {record.systolic && record.diastolic && (
                        <Text style={styles.latestRecordValue}>
                          BP: {record.systolic}/{record.diastolic} mmHg
                          {record.bpTime && ` (${record.bpTime})`}
                        </Text>
                      )}
                      {record.bloodSugar && (
                        <Text style={styles.latestRecordValue}>
                          DTX: {record.bloodSugar} mg/dL
                          {record.bloodSugarTime && ` (${record.bloodSugarTime})`}
                        </Text>
                      )}
                      {record.heartRate && (
                        <Text style={styles.latestRecordValue}>
                          Pulse: {record.heartRate} bpm
                        </Text>
                      )}
                      {record.notes && (
                        <Text style={styles.latestRecordNotes}>
                          หมายเหตุ: {record.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* ค้นหาและจัดการข้อมูล */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchTitle}>🔍 ค้นหาและจัดการข้อมูล</Text>
            
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="ค้นหา: ความดัน, น้ำตาล, ชีพจร, วันที่, ค่า..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchRecords}
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={searchRecords}
              >
                <Text style={styles.searchButtonText}>ค้นหา</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.searchHint}>
              💡 ค้นหาได้: ความดัน, น้ำตาล, ชีพจร, BP, DTX, Pulse, วันที่, เวลา, ค่าตัวเลข
            </Text>

            {/* ปุ่มปฏิทิน */}
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={() => setShowCalendar(!showCalendar)}
            >
              <Text style={styles.calendarButtonText}>
                📅 ค้นหาตามปฏิทิน
              </Text>
            </TouchableOpacity>

            {/* แสดงปฏิทิน */}
            {showCalendar && (
              <View style={styles.calendarContainer}>
                <Text style={styles.calendarTitle}>📅 ปฏิทินข้อมูลสุขภาพ</Text>
                <Text style={styles.calendarSubtitle}>
                  แตะวันที่ที่มีวงสีเพื่อดูข้อมูล
                </Text>
                <Calendar
                  onDayPress={handleDayPress}
                  markedDates={{
                    ...markedDates,
                    [selectedDate]: {
                      ...markedDates[selectedDate],
                      selected: true,
                      selectedColor: '#2196F3',
                    }
                  }}
                  theme={{
                    backgroundColor: '#ffffff',
                    calendarBackground: '#ffffff',
                    textSectionTitleColor: '#b6c1cd',
                    selectedDayBackgroundColor: '#2196F3',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#2196F3',
                    dayTextColor: '#2d4150',
                    textDisabledColor: '#d9e1e8',
                    dotColor: '#4CAF50',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#2196F3',
                    monthTextColor: '#2196F3',
                    indicatorColor: '#2196F3',
                    textDayFontWeight: '300',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '300',
                    textDayFontSize: 16,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 13
                  }}
                />
              </View>
            )}

            {showSearchResults && (
              <View style={styles.searchResultsContainer}>
                <View style={styles.searchResultsHeader}>
                  <Text style={styles.searchResultsTitle}>
                    ผลการค้นหา ({getFilteredSearchResults().length} รายการ)
                  </Text>
                  <TouchableOpacity 
                    style={styles.clearSearchButton}
                    onPress={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                  >
                    <Text style={styles.clearSearchButtonText}>ล้าง</Text>
                  </TouchableOpacity>
                </View>
                
                {getFilteredSearchResults().length === 0 ? (
                  <Text style={styles.noSearchResults}>ไม่พบข้อมูลที่ค้นหา</Text>
                ) : (
                  <FlatList
                    data={getFilteredSearchResults()}
                    renderItem={({ item }) => (
                      <View style={styles.searchResultItem}>
                        <View style={styles.searchResultHeader}>
                          <Text style={styles.searchResultDate}>
                            {formatDate(item.date)} {item.time}
                          </Text>
                          <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => handleDeleteRecord(item.id)}
                          >
                            <Text style={styles.deleteButtonText}>ลบ</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.searchResultContent}>
                          {item.systolic && item.diastolic && (
                            <Text style={styles.searchResultValue}>
                              BP: {item.systolic}/{item.diastolic} mmHg
                              {item.bpTime && ` (${item.bpTime})`}
                            </Text>
                          )}
                          {item.bloodSugar && (
                            <Text style={styles.searchResultValue}>
                              DTX: {item.bloodSugar} mg/dL
                              {item.bloodSugarTime && ` (${item.bloodSugarTime})`}
                            </Text>
                          )}
                          {item.heartRate && (
                            <Text style={styles.searchResultValue}>
                              Pulse: {item.heartRate} bpm
                            </Text>
                          )}
                          {item.notes && (
                            <Text style={styles.searchResultNotes}>
                              หมายเหตุ: {item.notes}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                    keyExtractor={(item) => `search-${item.id}`}
                    scrollEnabled={false}
                  />
                )}
              </View>
            )}
          </View>
          
          {/* แสดงข้อมูลล่าสุด 1 ครั้ง */}
          {(() => {
            const latestRecord = records
              .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateB.getTime() - dateA.getTime();
              })
              .slice(0, 1)[0];

            if (!latestRecord) return null;

            const bpStatus = getBloodPressureStatus(latestRecord.systolic, latestRecord.diastolic);
            const bsStatus = getBloodSugarStatus(latestRecord.bloodSugar);
            const hrStatus = getHeartRateStatus(latestRecord.heartRate);

            return (
              <View style={styles.latestRecordContainer}>
                <Text style={styles.latestRecordTitle}>📝 ข้อมูลล่าสุด</Text>
                <View style={styles.latestRecordCard}>
                  <View style={styles.latestRecordHeader}>
                    <Text style={styles.latestRecordDate}>
                      {formatDate(latestRecord.date)} {latestRecord.time}
                    </Text>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteRecord(latestRecord.id)}
                    >
                      <Text style={styles.deleteButtonText}>ลบ</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.latestRecordContent}>
                    {latestRecord.systolic && latestRecord.diastolic && (
                      <View style={styles.measurementItem}>
                        <Text style={styles.measurementLabel}>ความดันโลหิต</Text>
                        <Text style={styles.measurementValue}>
                          {latestRecord.systolic}/{latestRecord.diastolic} mmHg
                        </Text>
                        {latestRecord.bpTime && (
                          <Text style={styles.timeText}>
                            ({latestRecord.bpTime})
                          </Text>
                        )}
                        {bpStatus && (
                          <Text style={[styles.statusText, { color: bpStatus.color }]}>
                            {bpStatus.status}
                          </Text>
                        )}
                      </View>
                    )}

                    {latestRecord.heartRate && (
                      <View style={styles.measurementItem}>
                        <Text style={styles.measurementLabel}>ชีพจร</Text>
                        <Text style={styles.measurementValue}>
                          {latestRecord.heartRate} bpm
                        </Text>
                        {hrStatus && (
                          <Text style={[styles.statusText, { color: hrStatus.color }]}>
                            {hrStatus.status}
                          </Text>
                        )}
                      </View>
                    )}

                    {latestRecord.bloodSugar && (
                      <View style={styles.measurementItem}>
                        <Text style={styles.measurementLabel}>น้ำตาลในเลือด</Text>
                        <Text style={styles.measurementValue}>
                          {latestRecord.bloodSugar} mg/dL
                        </Text>
                        {latestRecord.bloodSugarTime && (
                          <Text style={styles.timeText}>
                            ({latestRecord.bloodSugarTime})
                          </Text>
                        )}
                        {bsStatus && (
                          <Text style={[styles.statusText, { color: bsStatus.color }]}>
                            {bsStatus.status}
                          </Text>
                        )}
                      </View>
                    )}

                    {latestRecord.notes && (
                      <Text style={styles.notesText}>
                        หมายเหตุ: {latestRecord.notes}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 10, // ขยับ header ลงมา
  },
  backButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 60, // เพิ่มความกว้างให้เท่ากับปุ่มกลับ
  },
  exportSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 20,
  },
  recordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recordTime: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recordContent: {
    gap: 12,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  measurementItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  measurementLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  notesLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  controlContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  dropdownContainer: {
    flex: 1,
    position: 'relative',
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  chartsContainer: {
    backgroundColor: 'white',
    marginBottom: 4,
    padding: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 1, // ให้ปุ่มอยู่ด้านบน
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1, // ให้ข้อความใช้พื้นที่ที่เหลือ
    marginRight: 10, // เพิ่มระยะห่างจากปุ่ม
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    zIndex: 2, // ให้ปุ่มอยู่ด้านบนสุด
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chartWrapper: {
    alignItems: 'center',
    maxHeight: 300, // จำกัดความสูงของกราฟ
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    maxHeight: 250, // จำกัดความสูงของกราฟ
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  selectedPointContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    margin: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPointText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#ff4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateGroupsContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  dateGroup: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  dateGroupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  timesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: '#666',
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  exportDropdown: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    minWidth: 200,
  },
  exportOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  exportOptionText: {
    fontSize: 14,
    color: '#333',
  },
  cancelText: {
    color: '#ff4444',
    textAlign: 'center',
  },
  // สถิติ 2 สัปดาห์
  statsContainer: {
    backgroundColor: '#f8f9fa',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsSection: {
    flex: 1,
    marginHorizontal: 8,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 8,
    textAlign: 'center',
  },
  statsItem: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
    paddingVertical: 2,
  },
  statsItemEmpty: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 4,
    paddingVertical: 2,
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  // ข้อมูลล่าสุด 3 ครั้ง
  latestRecordsContainer: {
    backgroundColor: '#fff3e0',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  latestRecordsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  latestRecordItem: {
    backgroundColor: 'white',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  latestRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  latestRecordDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  latestRecordNumber: {
    fontSize: 12,
    color: '#7f8c8d',
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  latestRecordContent: {
    gap: 4,
  },
  latestRecordValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  latestRecordNotes: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // ค้นหาและจัดการข้อมูล
  searchContainer: {
    backgroundColor: '#e8f4fd',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  searchHint: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  calendarButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  calendarButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
    textAlign: 'center',
  },
  calendarSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 12,
  },
  searchResultsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  clearSearchButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearSearchButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  noSearchResults: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  searchResultItem: {
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchResultDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  searchResultContent: {
    gap: 4,
  },
  searchResultValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  searchResultNotes: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // ข้อมูลล่าสุด 1 ครั้ง
  latestRecordContainer: {
    backgroundColor: '#f0f8ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4169E1',
  },
  latestRecordTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  latestRecordCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  latestRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  latestRecordDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  latestRecordContent: {
    gap: 8,
  },
  measurementItem: {
    marginBottom: 8,
  },
  measurementLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  timeText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});
