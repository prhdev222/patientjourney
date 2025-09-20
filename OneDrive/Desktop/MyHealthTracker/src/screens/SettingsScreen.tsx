// หน้าจอการตั้งค่า
// ตามข้อกำหนด FR-06: ตั้งค่าอีเมลโรงพยาบาล

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Switch,
  ScrollView,
} from 'react-native';
import { databaseService } from '../database/database';
import { UserSettings } from '../database/schema';

interface SettingsScreenProps {
  onNavigateToHome: () => void;
}

export default function SettingsScreen({ onNavigateToHome }: SettingsScreenProps) {
  // ข้อมูลผู้ป่วย
  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientLastName, setPatientLastName] = useState('');
  const [patientHN, setPatientHN] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  // ข้อมูลคลินิก
  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicLineId, setClinicLineId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await databaseService.getUserSettings();
      if (settings) {
        setPatientFirstName(settings.patientFirstName);
        setPatientLastName(settings.patientLastName);
        setPatientHN(settings.patientHN || '');
        setPatientPhone(settings.patientPhone || '');
        setClinicName(settings.clinicName);
        setClinicEmail(settings.clinicEmail);
        setClinicPhone(settings.clinicPhone);
        setClinicLineId(settings.clinicLineId || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดการตั้งค่าได้');
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    // ตรวจสอบข้อมูลผู้ป่วย (บังคับ)
    if (!patientFirstName.trim()) {
      Alert.alert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อผู้ป่วย');
      return;
    }

    if (!patientLastName.trim()) {
      Alert.alert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกนามสกุลผู้ป่วย');
      return;
    }

    // ตรวจสอบข้อมูลคลินิก (บังคับ)
    if (!clinicName.trim()) {
      Alert.alert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อคลินิก/โรงพยาบาล');
      return;
    }

    if (!clinicEmail.trim()) {
      Alert.alert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกอีเมลคลินิก');
      return;
    }

    if (!validateEmail(clinicEmail)) {
      Alert.alert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกอีเมลที่ถูกต้อง');
      return;
    }

      // เบอร์โทรศัพท์คลินิกไม่บังคับ

    setIsSaving(true);
    try {
      await databaseService.saveUserSettings({
        patientFirstName: patientFirstName.trim(),
        patientLastName: patientLastName.trim(),
        patientHN: patientHN.trim(),
        patientPhone: patientPhone.trim(),
        clinicName: clinicName.trim(),
        clinicEmail: clinicEmail.trim(),
        clinicPhone: clinicPhone.trim(),
        clinicLineId: clinicLineId.trim(),
      });

      Alert.alert('สำเร็จ', 'บันทึกการตั้งค่าเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setIsSaving(false);
    }
  };

  // ฟังก์ชันล้างข้อมูลเก่า (เหลือแค่ 3 เดือนล่าสุด)
  const handleCleanOldData = async () => {
    Alert.alert(
      'ล้างข้อมูลเก่า',
      'คุณต้องการลบข้อมูลเก่าที่มีอายุมากกว่า 3 เดือนหรือไม่?\n\nข้อมูลที่ลบจะไม่สามารถกู้คืนได้',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบข้อมูล', 
          style: 'destructive',
          onPress: async () => {
            try {
              const deletedCount = await databaseService.deleteOldRecords(3);
              Alert.alert('สำเร็จ', `ลบข้อมูลเก่าแล้ว ${deletedCount} รายการ`);
            } catch (error) {
              console.error('Error cleaning old data:', error);
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้');
            }
          }
        }
      ]
    );
  };

  // ฟังก์ชันล้างข้อมูลทั้งหมด
  const handleCleanAllData = async () => {
    Alert.alert(
      'ล้างข้อมูลทั้งหมด',
      'คุณต้องการลบข้อมูลทั้งหมดหรือไม่?\n\nข้อมูลที่ลบจะไม่สามารถกู้คืนได้',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบทั้งหมด', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('เริ่มลบข้อมูลทั้งหมด...');
              await databaseService.deleteAllRecords();
              console.log('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
              Alert.alert('สำเร็จ', 'ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
            } catch (error) {
              console.error('Error cleaning all data:', error);
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้');
            }
          }
        }
      ]
    );
  };


  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>กำลังโหลดการตั้งค่า...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateToHome}>
          <Text style={styles.backButtonText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.title}>การตั้งค่า</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลผู้ป่วย</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อผู้ป่วย *</Text>
            <TextInput
              style={styles.input}
              value={patientFirstName}
              onChangeText={setPatientFirstName}
              placeholder="สมชาย"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>นามสกุลผู้ป่วย *</Text>
            <TextInput
              style={styles.input}
              value={patientLastName}
              onChangeText={setPatientLastName}
              placeholder="ใจดี"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>เลขประจำตัวผู้ป่วย (HN)</Text>
            <TextInput
              style={styles.input}
              value={patientHN}
              onChangeText={setPatientHN}
              placeholder="HN123456"
              autoCapitalize="characters"
            />
            <Text style={styles.helpText}>
              เลขประจำตัวผู้ป่วยในโรงพยาบาล (ไม่บังคับ)
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>เบอร์โทรศัพท์ผู้ป่วย</Text>
            <TextInput
              style={styles.input}
              value={patientPhone}
              onChangeText={setPatientPhone}
              placeholder="081-234-5678"
              keyboardType="phone-pad"
            />
            <Text style={styles.helpText}>
              เบอร์โทรศัพท์สำหรับติดต่อผู้ป่วย (ไม่บังคับ)
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลคลินิก/โรงพยาบาล</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อคลินิก/โรงพยาบาล *</Text>
            <TextInput
              style={styles.input}
              value={clinicName}
              onChangeText={setClinicName}
              placeholder="คลินิกสุขภาพดี"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมลคลินิก *</Text>
            <TextInput
              style={styles.input}
              value={clinicEmail}
              onChangeText={setClinicEmail}
              placeholder="clinic@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.helpText}>
              อีเมลที่ใช้ส่งรายงานข้อมูลสุขภาพไปยังคลินิก
            </Text>
          </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>เบอร์โทรศัพท์คลินิก</Text>
          <TextInput
            style={styles.input}
            value={clinicPhone}
            onChangeText={setClinicPhone}
            placeholder="02-123-4567"
            keyboardType="phone-pad"
          />
          <Text style={styles.helpText}>
            เบอร์โทรศัพท์สำหรับติดต่อคลินิก (ไม่บังคับ)
          </Text>
        </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Line ID คลินิก (ไม่บังคับ)</Text>
            <TextInput
              style={styles.input}
              value={clinicLineId}
              onChangeText={setClinicLineId}
              placeholder="@clinic_health"
              autoCapitalize="none"
            />
            <Text style={styles.helpText}>
              Line ID สำหรับติดต่อคลินิกโดยตรง
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลแอป</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>เวอร์ชัน:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ผู้พัฒนา:</Text>
            <Text style={styles.infoValue}>My Health Tracker Team</Text>
          </View>
        </View>

        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </Text>
          </TouchableOpacity>

          {/* ปุ่มล้างข้อมูล */}
          <View style={styles.dataManagementSection}>
            <Text style={styles.sectionTitle}>จัดการข้อมูล</Text>
            
            <TouchableOpacity
              style={styles.cleanButton}
              onPress={handleCleanOldData}
            >
              <Text style={styles.cleanButtonText}>🗑️ ล้างข้อมูลเก่า (เหลือ 3 เดือนล่าสุด)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cleanButton, styles.dangerButton]}
              onPress={handleCleanAllData}
            >
              <Text style={[styles.cleanButtonText, styles.dangerButtonText]}>⚠️ ล้างข้อมูลทั้งหมด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 50,
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  switchInfo: {
    flex: 1,
    marginRight: 15,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  saveButtonContainer: {
    marginTop: 30,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#45a049',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dataManagementSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cleanButton: {
    backgroundColor: '#ff9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  cleanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dangerButtonText: {
    color: 'white',
  },
});
