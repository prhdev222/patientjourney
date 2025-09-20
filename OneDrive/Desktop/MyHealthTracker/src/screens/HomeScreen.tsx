// หน้าจอหลักสำหรับบันทึกข้อมูลสุขภาพ
// ตามข้อกำหนด FR-02: บันทึกค่า BP และ DTX พร้อมวันที่และเวลา

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { databaseService } from '../database/database';
import { HealthRecord } from '../database/schema';
import { EmailService } from '../services/emailService';

interface HomeScreenProps {}

// ตัวเลือกสำหรับ DTX
const DTX_TIME_OPTIONS = [
  'ก่อนอาหารเช้า',
  'ก่อนอาหารกลางวัน', 
  'ก่อนอาหารเย็น',
  'ก่อนนอน',
  'หลังอาหาร 2ชม',
  'อื่นๆ...'
];

// ตัวเลือกสำหรับ BP
const BP_TIME_OPTIONS = [
  'ก่อนกินยา',
  'หลังกินยา',
  'หลังตื่นนอน',
  'ก่อนนอน',
  'ตอนมีอาการ ระบุอาการ...',
  'อื่นๆ...'
];

export default function HomeScreen({}: HomeScreenProps) {
  const navigation = useNavigation();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [bloodSugarTime, setBloodSugarTime] = useState('');
  const [bpTime, setBpTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  
  // Modal states
  const [showDTXModal, setShowDTXModal] = useState(false);
  const [showBPModal, setShowBPModal] = useState(false);
  const [showTextInputModal, setShowTextInputModal] = useState(false);
  const [textInputTitle, setTextInputTitle] = useState('');
  const [textInputPlaceholder, setTextInputPlaceholder] = useState('');
  const [textInputValue, setTextInputValue] = useState('');
  const [textInputType, setTextInputType] = useState<'dtx' | 'bp'>('dtx');

  // ตั้งค่าวันที่และเวลาปัจจุบัน
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now.toISOString().split('T')[0]);
    setCurrentTime(now.toTimeString().split(' ')[0].substring(0, 5));
  }, []);

  const validateInput = (): boolean => {
    const hasBP = systolic.trim() && diastolic.trim();
    const hasDTX = bloodSugar.trim();
    const hasHeartRate = heartRate.trim();

    // ต้องมีอย่างน้อย 1 อย่าง
    if (!hasBP && !hasDTX && !hasHeartRate) {
      Alert.alert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลความดันโลหิต, ระดับน้ำตาลในเลือด หรือชีพจรอย่างใดอย่างหนึ่ง');
      return false;
    }

    // ตรวจสอบ BP ถ้ามี
    if (hasBP) {
      const systolicNum = parseInt(systolic);
      const diastolicNum = parseInt(diastolic);

      if (systolicNum < 50 || systolicNum > 300) {
        Alert.alert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกค่าความดันโลหิตตัวบน (50-300)');
        return false;
      }

      if (diastolicNum < 30 || diastolicNum > 200) {
        Alert.alert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกค่าความดันโลหิตตัวล่าง (30-200)');
        return false;
      }

      if (systolicNum <= diastolicNum) {
        Alert.alert('ข้อมูลไม่ถูกต้อง', 'ค่าความดันโลหิตตัวบนต้องมากกว่าตัวล่าง');
        return false;
      }

      if (!bpTime.trim()) {
        Alert.alert('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกเวลาสำหรับการวัดความดันโลหิต');
        return false;
      }
    }

    // ตรวจสอบ DTX ถ้ามี
    if (hasDTX) {
      const bloodSugarNum = parseFloat(bloodSugar);

      if (bloodSugarNum < 20 || bloodSugarNum > 600) {
        Alert.alert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกค่าระดับน้ำตาลในเลือด (20-600)');
        return false;
      }

      if (!bloodSugarTime.trim()) {
        Alert.alert('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกเวลาสำหรับการวัดน้ำตาลในเลือด');
        return false;
      }
    }

    // ตรวจสอบ Heart Rate ถ้ามี
    if (hasHeartRate) {
      const heartRateNum = parseInt(heartRate);

      if (heartRateNum < 30 || heartRateNum > 200) {
        Alert.alert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกค่าชีพจร (30-200)');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateInput()) return;

    setIsLoading(true);
    try {
      const newRecord: Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        systolic: systolic.trim() ? parseInt(systolic) : undefined,
        diastolic: diastolic.trim() ? parseInt(diastolic) : undefined,
        heartRate: heartRate.trim() ? parseInt(heartRate) : undefined,
        bloodSugar: bloodSugar.trim() ? parseFloat(bloodSugar) : undefined,
        bloodSugarTime: bloodSugar.trim() ? bloodSugarTime.trim() : undefined,
        bpTime: (systolic.trim() && diastolic.trim()) ? bpTime.trim() : undefined,
        date: currentDate,
        time: currentTime,
        notes: notes.trim(),
      };

      console.log('Saving record:', newRecord);
      console.log('Blood Sugar Time:', newRecord.bloodSugarTime);
      console.log('BP Time:', newRecord.bpTime);
      
      await databaseService.addHealthRecord(newRecord);
      console.log('Record saved successfully');
      
      Alert.alert('สำเร็จ', 'บันทึกข้อมูลสุขภาพเรียบร้อยแล้ว', [
        {
          text: 'ตกลง',
          onPress: () => {
            // รีเซ็ตฟอร์ม
            setSystolic('');
            setDiastolic('');
            setHeartRate('');
            setBloodSugar('');
            setBloodSugarTime('');
            setBpTime('');
            setNotes('');
          }
        }
      ]);
    } catch (error) {
      console.error('Error saving health record:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReport = async () => {
    try {
      setIsSendingReport(true);
      
      // สร้างและส่งรายงาน
      await EmailService.generateAndSendReport();
      
      Alert.alert('สำเร็จ', 'เปิดแอปอีเมลเรียบร้อยแล้ว รายงานจะส่งไปยังอีเมลคลินิกที่ตั้งค่าไว้');
    } catch (error) {
      console.error('Error sending report:', error);
      if (error.message.includes('กรุณาตั้งค่าอีเมลคลินิก')) {
        Alert.alert(
          'ข้อมูลไม่ครบถ้วน',
          'กรุณาตั้งค่าอีเมลคลินิกในหน้าตั้งค่าก่อน',
          [
            { text: 'ยกเลิก', style: 'cancel' },
            { text: 'ไปตั้งค่า', onPress: () => navigation.navigate('Settings' as never) }
          ]
        );
      } else {
        Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถส่งรายงานได้');
      }
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleDTXTimeSelect = (time: string) => {
    if (time === 'อื่นๆ...') {
      setTextInputTitle('ระบุรายละเอียดสำหรับ DTX อื่นๆ');
      setTextInputPlaceholder('กรุณากรอกรายละเอียดเวลาหรือสถานการณ์ (สั้นๆ)');
      setTextInputValue('');
      setTextInputType('dtx');
      setShowTextInputModal(true);
    } else {
      setBloodSugarTime(time);
    }
    setShowDTXModal(false);
  };

  const handleBPTimeSelect = (time: string) => {
    if (time === 'ตอนมีอาการ ระบุอาการ...') {
      setTextInputTitle('ระบุอาการ');
      setTextInputPlaceholder('กรุณากรอกอาการที่เกิดขึ้น (สั้นๆ)');
      setTextInputValue('');
      setTextInputType('bp');
      setShowTextInputModal(true);
    } else if (time === 'อื่นๆ...') {
      setTextInputTitle('ระบุเวลาสำหรับ BP');
      setTextInputPlaceholder('กรุณากรอกเวลาสำหรับการวัดความดันโลหิต (สั้นๆ)');
      setTextInputValue('');
      setTextInputType('bp');
      setShowTextInputModal(true);
    } else {
      setBpTime(time);
    }
    setShowBPModal(false);
  };

  const handleTextInputConfirm = () => {
    if (textInputValue.trim()) {
      if (textInputType === 'dtx') {
        // สำหรับ DTX "อื่นๆ..." ให้บันทึกเป็น "อื่นๆ" และเก็บรายละเอียดในหมายเหตุ
        setBloodSugarTime('อื่นๆ');
        setNotes(textInputValue.trim()); // บันทึกรายละเอียดในช่องหมายเหตุ
        console.log('Set bloodSugarTime to: อื่นๆ and notes to:', textInputValue.trim());
      } else {
        if (textInputTitle === 'ระบุอาการ') {
          setBpTime(`ตอนมีอาการ: ${textInputValue.trim()}`);
        } else {
          setBpTime(textInputValue.trim());
        }
      }
    }
    setShowTextInputModal(false);
    setTextInputValue('');
  };

  const renderDTXModal = () => (
    <Modal
      visible={showDTXModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDTXModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>เลือกเวลาสำหรับ DTX</Text>
          <FlatList
            data={DTX_TIME_OPTIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => handleDTXTimeSelect(item)}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowDTXModal(false)}
          >
            <Text style={styles.modalCloseButtonText}>ปิด</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderBPModal = () => (
    <Modal
      visible={showBPModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowBPModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>เลือกเวลาสำหรับ BP</Text>
          <FlatList
            data={BP_TIME_OPTIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => handleBPTimeSelect(item)}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowBPModal(false)}
          >
            <Text style={styles.modalCloseButtonText}>ปิด</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderTextInputModal = () => (
    <Modal
      visible={showTextInputModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTextInputModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.textInputModalContent}>
          <Text style={styles.modalTitle}>{textInputTitle}</Text>
          <Text style={styles.modalSubtitle}>{textInputPlaceholder}</Text>
          <TextInput
            style={styles.textInput}
            value={textInputValue}
            onChangeText={setTextInputValue}
            placeholder={textInputPlaceholder}
            multiline={false}
            autoFocus={true}
          />
          <View style={styles.textInputButtonRow}>
            <TouchableOpacity
              style={[styles.textInputButton, styles.cancelButton]}
              onPress={() => setShowTextInputModal(false)}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.textInputButton, styles.confirmButton]}
              onPress={handleTextInputConfirm}
            >
              <Text style={styles.confirmButtonText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>บันทึกข้อมูลสุขภาพ</Text>
        <Text style={styles.subtitle}>กรอกอย่างใดอย่างหนึ่งได้</Text>
        
        <View style={styles.formContainer}>
          {/* วันที่และเวลา */}
          <View style={styles.dateTimeContainer}>
            <Text style={styles.label}>วันที่: {currentDate}</Text>
            <Text style={styles.label}>เวลา: {currentTime}</Text>
          </View>

          {/* ความดันโลหิต */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ความดันโลหิต</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>ตัวบน (Systolic)</Text>
                <TextInput
                  style={styles.input}
                  value={systolic}
                  onChangeText={setSystolic}
                  placeholder="120"
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.unit}>mmHg</Text>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>ตัวล่าง (Diastolic)</Text>
                <TextInput
                  style={styles.input}
                  value={diastolic}
                  onChangeText={setDiastolic}
                  placeholder="80"
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.unit}>mmHg</Text>
              </View>
            </View>
            
            {systolic.trim() && diastolic.trim() && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>เวลาสำหรับ BP *</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowBPModal(true)}
                >
                  <Text style={[styles.dropdownText, !bpTime && styles.placeholderText]}>
                    {bpTime || 'เลือกเวลาสำหรับการวัดความดันโลหิต'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ชีพจร */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ชีพจร</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>อัตราการเต้นของหัวใจ</Text>
                <TextInput
                  style={styles.input}
                  value={heartRate}
                  onChangeText={setHeartRate}
                  placeholder="72"
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.unit}>bpm</Text>
              </View>
            </View>
          </View>

          {/* ระดับน้ำตาลในเลือด */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>น้ำตาลในเลือด (DTX)</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>ระดับน้ำตาล</Text>
                <TextInput
                  style={styles.input}
                  value={bloodSugar}
                  onChangeText={setBloodSugar}
                  placeholder="100"
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text style={styles.unit}>mg/dL</Text>
              </View>
            </View>
            
            {bloodSugar.trim() && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>เวลาสำหรับ DTX *</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowDTXModal(true)}
                >
                  <Text style={[styles.dropdownText, !bloodSugarTime && styles.placeholderText]}>
                    {bloodSugarTime || 'เลือกเวลาสำหรับการวัดน้ำตาลในเลือด'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* หมายเหตุ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>หมายเหตุ (ไม่บังคับ)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="เพิ่มหมายเหตุ..."
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ปุ่มบันทึก */}
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.disabledButton]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </Text>
          </TouchableOpacity>

          {/* ปุ่มส่งรายงาน */}
          <TouchableOpacity
            style={[styles.reportButton, isSendingReport && styles.disabledButton]}
            onPress={handleSendReport}
            disabled={isSendingReport}
          >
            <Text style={styles.reportButtonText}>
              {isSendingReport ? 'กำลังเตรียมรายงาน...' : 'ส่งรายงานไปยังคลินิก'}
            </Text>
          </TouchableOpacity>

          {/* ปุ่มดูประวัติ */}
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('History' as never)}
          >
            <Text style={styles.historyButtonText}>ดูประวัติข้อมูล</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Modals */}
      {renderDTXModal()}
      {renderBPModal()}
      {renderTextInputModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    fontStyle: 'italic',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputGroup: {
    marginTop: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
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
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  unit: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  reportButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  historyButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
  },
  historyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Dropdown styles
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalCloseButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Text Input Modal styles
  textInputModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    maxHeight: '60%',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  textInputButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textInputButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
