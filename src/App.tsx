import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  FilePlus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  FileText,
  Clock,
  User,
  FolderKanban,
  Edit3,
  X,
  Database,
  BarChart3,
  Calendar,
  MessageSquareText,
  Code2,
  Copy,
  Check,
  Settings,
  Plus,
  Trash2,
  RotateCcw
} from 'lucide-react';

// Live Google Apps Script URL
const SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwzVbN4t1jqlxOnI6hBjr6TBhgDtApKcxTanP49JLkGGJQgN5HiMmfl4vmYWQNmchRV/exec';

// Attached CSV Database Path
const CSV_DB_PATH = '/assets/aistudio/__________75c81dc1';

export interface CaseRecord {
  rowIndex?: number;
  docNumber: string;
  receiveDate: string;
  staffName: string;
  problemType: string;
  problemDetail: string;
  status: string;
  remark: string;
  lastUpdate: string;
}

const DEFAULT_STAFF_LIST = [
  'นายศุภกิตติ์ บุญแก้ว',
  'นางสาวจีรนันท์ เอกวรรณัง',
  'นางสาวสุภารักษ์ สุทธิ',
  'นายสุเมธ ยิ้มพงษ์',
  'นางสาวภาณุมาศ สาลีนาค',
  'นางสุมาลี รักไทย',
];

const DEFAULT_PROBLEM_TYPES = [
  'ข้อมูลแก้ไขข้อมูล',
  'ระบบ eworkpermit',
  'ขอคืนสถานะ',
  'ร้องเรียน/เสนอแนะ',
  'อื่น ๆ',
];

const DEFAULT_STATUS_OPTIONS = [
  'อยู่ระหว่างตรวจสอบข้อมูล',
  'อยู่ระหว่างประสานงานผู้แจ้ง',
  'อยู่ระหว่างประสานงาน OS',
  'อยู่ระหว่างเสนอหนังสือพิจารณา/อนุมัติ',
  'ส่งต่อกลุ่มงานอื่นๆ ที่เกี่ยวข้อง',
  'นำส่งผู้อำนวยการ',
  'ดำเนินการเสร็จสิ้น/ปิดเคส',
];

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

// Helper to sort records by staffName (Thai alphabetical order) automatically
function sortRecordsByStaffName(records: CaseRecord[]): CaseRecord[] {
  return [...records].sort((a, b) => {
    const cmp = (a.staffName || '').localeCompare(b.staffName || '', 'th');
    if (cmp !== 0) return cmp;
    return (a.rowIndex || 0) - (b.rowIndex || 0);
  });
}

// RFC-4180 compliant CSV parser supporting multiline quoted fields
function parseCsvText(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function formatThaiDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '-';
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === '-') return '-';
  if (THAI_MONTHS.some((m) => trimmed.includes(m))) return trimmed;

  // Handle ISO UTC strings returned by Google Sheets getValues(), e.g. "2569-03-11T17:00:00.000Z"
  if (trimmed.includes('T') && trimmed.endsWith('Z')) {
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      // Shift to Thailand Time (UTC+7)
      const thaiTime = new Date(parsedDate.getTime() + 7 * 60 * 60 * 1000);
      const year = thaiTime.getUTCFullYear();
      const month = thaiTime.getUTCMonth() + 1;
      const day = thaiTime.getUTCDate();
      const thaiMonth = THAI_MONTHS[month - 1];
      const thaiYear = year > 2400 ? year : year + 543;
      return `${day} ${thaiMonth} ${thaiYear}`;
    }
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (year >= 1900 && year <= 3000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const thaiMonth = THAI_MONTHS[month - 1];
      const thaiYear = year > 2400 ? year : year + 543;
      return `${day} ${thaiMonth} ${thaiYear}`;
    }
  }
  return trimmed;
}

export function getCurrentThaiDateTime(): string {
  const now = new Date();
  const day = now.getDate();
  const month = THAI_MONTHS[now.getMonth()];
  const year = now.getFullYear() + 543;
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${day} ${month} ${year} เวลา ${hours}:${minutes}:${seconds} น.`;
}

function getStatusColorClass(status: string): string {
  const colors: Record<string, string> = {
    'อยู่ระหว่างตรวจสอบข้อมูล': 'text-amber-700',
    'อยู่ระหว่างประสานงานผู้แจ้ง': 'text-sky-700',
    'อยู่ระหว่างประสานงาน OS': 'text-violet-700',
    'อยู่ระหว่างเสนอหนังสือพิจารณา/อนุมัติ': 'text-orange-700',
    'ส่งต่อกลุ่มงานอื่นๆ ที่เกี่ยวข้อง': 'text-indigo-700',
    'นำส่งผู้อำนวยการ': 'text-teal-700',
    'ดำเนินการเสร็จสิ้น/ปิดเคส': 'text-emerald-700',
  };
  return colors[status] || 'text-slate-700';
}

function getStatusBarColorClass(status: string): string {
  const colors: Record<string, string> = {
    'อยู่ระหว่างตรวจสอบข้อมูล': 'bg-gradient-to-r from-amber-400 to-amber-500',
    'อยู่ระหว่างประสานงานผู้แจ้ง': 'bg-gradient-to-r from-sky-400 to-sky-600',
    'อยู่ระหว่างประสานงาน OS': 'bg-gradient-to-r from-violet-500 to-purple-600',
    'อยู่ระหว่างเสนอหนังสือพิจารณา/อนุมัติ': 'bg-gradient-to-r from-orange-400 to-orange-600',
    'ส่งต่อกลุ่มงานอื่นๆ ที่เกี่ยวข้อง': 'bg-gradient-to-r from-indigo-500 to-blue-600',
    'นำส่งผู้อำนวยการ': 'bg-gradient-to-r from-teal-500 to-cyan-600',
    'ดำเนินการเสร็จสิ้น/ปิดเคส': 'bg-gradient-to-r from-emerald-500 to-teal-600',
  };
  return colors[status] || 'bg-slate-500';
}

function getProblemTypeBarColorClass(type: string): string {
  const colors: Record<string, string> = {
    'ข้อมูลแก้ไขข้อมูล': 'bg-gradient-to-r from-teal-500 to-emerald-600',
    'ขอคืนสถานะ': 'bg-gradient-to-r from-sky-500 to-blue-600',
    'ระบบ eworkpermit': 'bg-gradient-to-r from-indigo-500 to-violet-600',
    'ร้องเรียน/เสนอแนะ': 'bg-gradient-to-r from-amber-500 to-orange-500',
    'อื่น ๆ': 'bg-gradient-to-r from-slate-500 to-slate-700',
  };
  return colors[type] || 'bg-gradient-to-r from-emerald-500 to-teal-600';
}

const GAS_AUTO_SORT_SCRIPT = `function doGet(e) {
  var callback = e.parameter.callback;
  var action = e.parameter.action;
  var result;
  
  try {
    if (action === 'create') {
      result = createRecord(e.parameter);
    } else if (action === 'search') {
      result = searchRecord(e.parameter.docNumber);
    } else if (action === 'update') {
      result = updateRecord(e.parameter);
    } else if (action === 'list') {
      result = listRecords();
    } else {
      result = { success: false, error: 'Invalid action' };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
  }
  
  var jsonStr = JSON.stringify(result);
  var jsonpResponse = callback ? callback + '(' + jsonStr + ')' : jsonStr;
  return ContentService.createTextOutput(jsonpResponse)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function createRecord(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Case Data');
  
  if (!sheet) throw new Error("ไม่พบชีตชื่อ 'Case Data'");

  // สร้างหัวตารางถ้าชีตว่างเปล่า
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'เลขหนังสือ', 'วันที่รับ', 'ผู้รับผิดชอบ', 'ประเภทปัญหา', 
      'ปัญหาที่พบ', 'สถานะ', 'หมายเหตุ', 'วันเวลาแจ้งสถานะล่าสุด'
    ]);
  }
  
  sheet.appendRow([
    params.docNumber || '',
    params.receiveDate || '',
    params.staffName || '',
    params.problemType || '',
    params.problemDetail || '',
    params.status || '',
    params.remark || '',
    getCurrentThaiDateTime()
  ]);
  
  // เรียกฟังก์ชันเรียงข้อมูลหลังจากเพิ่มเสร็จ (เรียงตามคอลัมน์ 3: ผู้รับผิดชอบ)
  autoSort(sheet);
  
  return { success: true, message: 'บันทึกและเรียงข้อมูลสำเร็จ' };
}

function searchRecord(docNumber) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Case Data');
  if (!sheet) return { success: false, error: "ไม่พบชีตชื่อ 'Case Data'" };

  // ใช้ getDisplayValues() เพื่อดึงข้อความทุกคอลัมน์ตรงตามที่แสดงในชีต 100% (ป้องกันวันที่เพี้ยนเป็น UTC)
  var data = sheet.getDataRange().getDisplayValues();
  var searchDocNumber = (docNumber || '').toString().toUpperCase().trim();
  var matches = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().toUpperCase().trim() === searchDocNumber) {
      matches.push({
        rowIndex: i + 1,
        docNumber: data[i][0],
        receiveDate: data[i][1],
        staffName: data[i][2],
        problemType: data[i][3],
        problemDetail: data[i][4],
        status: data[i][5],
        remark: data[i][6],
        lastUpdate: data[i][7]
      });
    }
  }

  if (matches.length > 0) {
    return {
      success: true,
      data: matches[0],
      matches: matches,
      rowNumber: matches[0].rowIndex
    };
  }
  return { success: false, error: 'ไม่พบข้อมูลเลขหนังสือนี้' };
}

function updateRecord(params) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Case Data');
  if (!sheet) return { success: false, error: "ไม่พบชีตชื่อ 'Case Data'" };

  var data = sheet.getDataRange().getDisplayValues();
  var searchDocNumber = (params.docNumber || '').toString().toUpperCase().trim();
  var targetRow = params.rowIndex ? parseInt(params.rowIndex, 10) : null;
  
  for (var i = 1; i < data.length; i++) {
    var isDocMatch = data[i][0].toString().toUpperCase().trim() === searchDocNumber;
    var isRowMatch = !targetRow || (i + 1) === targetRow;
    if (isDocMatch && isRowMatch) {
      // อัปเดตสถานะ (คอลัมน์ 6)
      if (typeof params.status !== 'undefined' && params.status !== '') {
        sheet.getRange(i + 1, 6).setValue(params.status);
      }
      // อัปเดตหมายเหตุเพิ่มเติม (คอลัมน์ 7)
      if (typeof params.remark !== 'undefined') {
        sheet.getRange(i + 1, 7).setValue(params.remark);
      }
      // อัปเดตวันเวลาแจ้งสถานะล่าสุด (คอลัมน์ 8)
      sheet.getRange(i + 1, 8).setValue(getCurrentThaiDateTime());
      
      // เรียงข้อมูลตามชื่อผู้รับผิดชอบ (คอลัมน์ 3) ให้เป็นระเบียบเสมอ
      autoSort(sheet);
      
      return { success: true, message: 'อัปเดตสถานะและหมายเหตุสำเร็จ' };
    }
  }
  return { success: false, error: 'ไม่พบข้อมูลที่ต้องการอัปเดต' };
}

function listRecords() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Case Data');
  if (!sheet) return { success: false, error: "ไม่พบชีตชื่อ 'Case Data'" };

  // ใช้ getDisplayValues() เพื่อดึงข้อมูลทุกแถวและทุกคอลัมน์มาแสดงครบถ้วนตรงตามชีต
  var data = sheet.getDataRange().getDisplayValues();
  var records = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var hasContent = row.some(function(cell) { return cell && cell.toString().trim() !== ''; });
    if (hasContent) {
      records.push({
        rowIndex: i + 1,
        docNumber: row[0] || '',
        receiveDate: row[1] || '-',
        staffName: row[2] || '-',
        problemType: row[3] || '-',
        problemDetail: row[4] || '-',
        status: row[5] || 'อยู่ระหว่างตรวจสอบข้อมูล',
        remark: row[6] || '',
        lastUpdate: row[7] || '-'
      });
    }
  }
  return { success: true, records: records, total: records.length };
}

// --- ฟังก์ชันเรียงข้อมูลอัตโนมัติ ---
function autoSort(sheet) {
  SpreadsheetApp.flush(); // บังคับให้เขียนข้อมูลลง Sheet ให้เสร็จก่อน
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 8);
  if (lastRow > 2) {
    // เรียงคอลัมน์ที่ 3 (ผู้รับผิดชอบ) จาก ก-ฮ และเรียงคอลัมน์ที่ 1 (เลขหนังสือ) เป็นลำดับรอง
    var range = sheet.getRange(2, 1, lastRow - 1, lastCol);
    range.sort([
      { column: 3, ascending: true },
      { column: 1, ascending: true }
    ]);
  }
}

function getCurrentThaiDateTime() {
  var now = new Date();
  var thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var day = now.getDate();
  var month = thaiMonths[now.getMonth()];
  var year = now.getFullYear() + 543;
  var hours = ('0' + now.getHours()).slice(-2);
  var minutes = ('0' + now.getMinutes()).slice(-2);
  var seconds = ('0' + now.getSeconds()).slice(-2);
  return day + ' ' + month + ' ' + year + ' เวลา ' + hours + ':' + minutes + ':' + seconds + ' น.';
}`;

let jsonpCounter = 0;

function sendJsonp<T = any>(url: string, data: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonpCallback_${Date.now()}_${jsonpCounter++}`;
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('หมดเวลาการเชื่อมต่อกับฐานข้อมูล (เกิน 30 วินาที)'));
    }, 30000);

    (window as any)[callbackName] = (response: T) => {
      cleanup();
      resolve(response);
    };

    function cleanup() {
      window.clearTimeout(timeout);
      delete (window as any)[callbackName];
      const script = document.getElementById(callbackName);
      if (script) script.remove();
    }

    const params = new URLSearchParams(data);
    params.append('callback', callbackName);

    const script = document.createElement('script');
    script.id = callbackName;
    script.src = `${url}?${params.toString()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('ไม่สามารถเชื่อมต่อเครือข่ายหรือฐานข้อมูลได้'));
    };

    document.body.appendChild(script);
  });
}

const STORAGE_KEY = 'korphai_recent_doc_numbers_v1';
const SETTINGS_STORAGE_KEY = 'korphai_custom_options_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'search' | 'settings'>('dashboard');

  // Configurable lists (Staff, Problem Types, Status Options) persisted in localStorage
  const [staffList, setStaffList] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.staffList) && parsed.staffList.length > 0) {
          return parsed.staffList;
        }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_STAFF_LIST;
  });

  const [problemTypes, setProblemTypes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.problemTypes) && parsed.problemTypes.length > 0) {
          return parsed.problemTypes;
        }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PROBLEM_TYPES;
  });

  const [statusOptions, setStatusOptions] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.statusOptions) && parsed.statusOptions.length > 0) {
          return parsed.statusOptions;
        }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_STATUS_OPTIONS;
  });

  // Inputs for Settings tab
  const [newStaffInput, setNewStaffInput] = useState('');
  const [newProblemTypeInput, setNewProblemTypeInput] = useState('');
  const [newStatusInput, setNewStatusInput] = useState('');

  // Preloaded records from the attached CSV database (818 records) — automatically sorted by staffName
  const [dbRecords, setDbRecords] = useState<CaseRecord[]>([]);
  const [isLoadingCsv, setIsLoadingCsv] = useState(true);
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [liveSyncSource, setLiveSyncSource] = useState<'csv' | 'live'>('csv');

  // Dashboard filter states
  const [dashStaffFilter, setDashStaffFilter] = useState<string>('ALL');
  const [dashStatusFilter, setDashStatusFilter] = useState<string>('ALL');
  const [dashTypeFilter, setDashTypeFilter] = useState<string>('ALL');

  // Modal for Google Sheets Auto-Sort Script instructions
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Form states for adding a new record
  const todayIso = new Date().toISOString().split('T')[0];
  const [docNumber, setDocNumber] = useState('');
  const [receiveDate, setReceiveDate] = useState(todayIso);
  const [staffName, setStaffName] = useState('');
  const [problemType, setProblemType] = useState('');
  const [problemDetail, setProblemDetail] = useState('');
  const [status, setStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for searching & editing
  const [searchDocNumber, setSearchDocNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<CaseRecord | null>(null);
  const [matchedList, setMatchedList] = useState<CaseRecord[]>([]);
  const [noResultFound, setNoResultFound] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Recent searched/created doc numbers for quick convenience
  const [recentDocNumbers, setRecentDocNumbers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['4389', '2833', '4644', '7407'];
    } catch {
      return ['4389', '2833', '4644', '7407'];
    }
  });

  // Notification banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    docNum?: string;
  } | null>(null);

  const handleManualSyncFromSheet = async (showNotice = true) => {
    setIsSyncingLive(true);
    if (showNotice) setNotification(null);
    try {
      const res = await sendJsonp<{ success: boolean; records?: any[]; error?: string }>(
        SCRIPT_URL,
        { action: 'list' }
      );
      if (res && res.success && Array.isArray(res.records) && res.records.length > 0) {
        const liveParsed: CaseRecord[] = res.records.map((item, idx) => ({
          rowIndex: item.rowIndex || idx + 2,
          docNumber: String(item.docNumber || '').trim(),
          receiveDate: formatThaiDate(String(item.receiveDate || '-')),
          staffName: String(item.staffName || '-').trim(),
          problemType: String(item.problemType || '-').trim(),
          problemDetail: String(item.problemDetail || '-').trim(),
          status: String(item.status || 'อยู่ระหว่างตรวจสอบข้อมูล').trim(),
          remark: String(item.remark || '').trim(),
          lastUpdate: formatThaiDate(String(item.lastUpdate || '-')),
        }));
        setDbRecords(sortRecordsByStaffName(liveParsed));
        setLiveSyncSource('live');
        if (showNotice) {
          setNotification({
            type: 'success',
            title: 'ซิงค์ข้อมูลสดจาก Google Sheet สำเร็จ!',
            message: `ดึงข้อมูลจากชีต 'Case Data' ครบถ้วนทั้งหมด ${liveParsed.length.toLocaleString()} รายการแล้ว`,
          });
        }
      } else if (showNotice) {
        setNotification({
          type: 'error',
          title: 'Google Apps Script ยังไม่ได้อัปเดตเป็นเวอร์ชันใหม่ (New Deployment)',
          message:
            'ขณะนี้ลิงก์ Apps Script ยังรันโค้ดเดิมที่ไม่มีคำสั่งดึงข้อมูลทั้งหมด (action=list) กรุณากดปุ่ม "โค้ด Apps Script" เพื่อคัดลอกโค้ดใหม่ไปวาง แล้วกด Deploy > Manage deployments > Edit > เลือก New version ครับ',
        });
      }
    } catch {
      if (showNotice) {
        setNotification({
          type: 'error',
          title: 'ไม่สามารถเชื่อมต่อเพื่อดึงข้อมูลทั้งหมดได้',
          message: 'กรุณาตรวจสอบการตั้งค่า Deploy ใน Google Apps Script ให้เป็น Anyone (ทุกคนเข้าถึงได้)',
        });
      }
    } finally {
      setIsSyncingLive(false);
    }
  };

  // Load the attached 818-row CSV database on mount and sync with live Google Sheet if action=list is enabled
  useEffect(() => {
    let mounted = true;
    fetch(CSV_DB_PATH)
      .then((res) => res.text())
      .then((text) => {
        if (!mounted) return;
        const rows = parseCsvText(text);
        if (rows.length > 1) {
          const parsed: CaseRecord[] = rows.slice(1).map((cols, idx) => ({
            rowIndex: idx + 2,
            docNumber: cols[0] || '',
            receiveDate: formatThaiDate(cols[1] || '-'),
            staffName: cols[2] || '-',
            problemType: cols[3] || '-',
            problemDetail: cols[4] || '-',
            status: cols[5] || 'อยู่ระหว่างตรวจสอบข้อมูล',
            remark: cols[6] || '',
            lastUpdate: cols[7] || '-',
          }));
          setDbRecords((prev) => (prev.length > parsed.length ? prev : sortRecordsByStaffName(parsed)));
        }
      })
      .catch(() => {
        // Fallback silently to online-only search if local CSV unavailable
      })
      .finally(() => {
        if (mounted) setIsLoadingCsv(false);
      });

    // Also try fetching live records via action=list from Google Apps Script
    sendJsonp<{ success: boolean; records?: any[] }>(SCRIPT_URL, { action: 'list' })
      .then((res) => {
        if (!mounted || !res?.success || !Array.isArray(res.records) || res.records.length === 0) {
          return;
        }
        const liveParsed: CaseRecord[] = res.records.map((item, idx) => ({
          rowIndex: item.rowIndex || idx + 2,
          docNumber: String(item.docNumber || '').trim(),
          receiveDate: formatThaiDate(String(item.receiveDate || '-')),
          staffName: String(item.staffName || '-').trim(),
          problemType: String(item.problemType || '-').trim(),
          problemDetail: String(item.problemDetail || '-').trim(),
          status: String(item.status || 'อยู่ระหว่างตรวจสอบข้อมูล').trim(),
          remark: String(item.remark || '').trim(),
          lastUpdate: formatThaiDate(String(item.lastUpdate || '-')),
        }));
        setDbRecords(sortRecordsByStaffName(liveParsed));
        setLiveSyncSource('live');
      })
      .catch(() => {
        // Ignore if user hasn't redeployed action=list yet
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentDocNumbers.slice(0, 6)));
    } catch {
      // ignore storage errors
    }
  }, [recentDocNumbers]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          staffList,
          problemTypes,
          statusOptions,
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [staffList, problemTypes, statusOptions]);

  // Dashboard Computed Analytics (Sorted automatically by staffName by default)
  const filteredDashboardRecords = useMemo(() => {
    const filtered = dbRecords.filter((r) => {
      if (dashStaffFilter !== 'ALL' && r.staffName !== dashStaffFilter) return false;
      if (dashStatusFilter !== 'ALL' && r.status !== dashStatusFilter) return false;
      if (dashTypeFilter !== 'ALL' && r.problemType !== dashTypeFilter) return false;
      return true;
    });

    return sortRecordsByStaffName(filtered);
  }, [dbRecords, dashStaffFilter, dashStatusFilter, dashTypeFilter]);

  const dashboardMetrics = useMemo(() => {
    const total = filteredDashboardRecords.length;
    const completed = filteredDashboardRecords.filter(
      (r) => r.status === 'ดำเนินการเสร็จสิ้น/ปิดเคส'
    ).length;
    const executive = filteredDashboardRecords.filter(
      (r) =>
        r.status === 'นำส่งผู้อำนวยการ' ||
        r.status === 'อยู่ระหว่างเสนอหนังสือพิจารณา/อนุมัติ'
    ).length;
    const inProgress = total - completed;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

    // Status breakdown
    const statusMap = new Map<string, number>();
    statusOptions.forEach((st) => statusMap.set(st, 0));
    filteredDashboardRecords.forEach((r) => {
      statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
    });
    const byStatus = Array.from(statusMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Problem type breakdown
    const typeMap = new Map<string, number>();
    problemTypes.forEach((pt) => typeMap.set(pt, 0));
    filteredDashboardRecords.forEach((r) => {
      if (r.problemType) {
        typeMap.set(r.problemType, (typeMap.get(r.problemType) || 0) + 1);
      }
    });
    const byType = Array.from(typeMap.entries())
      .filter(([name, count]) => count > 0 || problemTypes.includes(name))
      .map(([name, count]) => ({
        name,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Staff workload matrix (sorted alphabetically by Thai name)
    const staffStatsMap = new Map<
      string,
      { total: number; completed: number; pending: number }
    >();
    staffList.forEach((s) => staffStatsMap.set(s, { total: 0, completed: 0, pending: 0 }));

    dbRecords.forEach((r) => {
      if (dashStatusFilter !== 'ALL' && r.status !== dashStatusFilter) return;
      if (dashTypeFilter !== 'ALL' && r.problemType !== dashTypeFilter) return;
      const current = staffStatsMap.get(r.staffName) || {
        total: 0,
        completed: 0,
        pending: 0,
      };
      current.total += 1;
      if (r.status === 'ดำเนินการเสร็จสิ้น/ปิดเคส') {
        current.completed += 1;
      } else {
        current.pending += 1;
      }
      staffStatsMap.set(r.staffName, current);
    });

    const byStaff = Array.from(staffStatsMap.entries())
      .map(([name, stat]) => ({
        name,
        ...stat,
        isCurrentTeam: staffList.includes(name),
        rateNum: stat.total > 0 ? (stat.completed / stat.total) * 100 : 0,
        rate: stat.total > 0 ? ((stat.completed / stat.total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'th'));

    return {
      total,
      completed,
      inProgress,
      executive,
      completionRate,
      byStatus,
      byType,
      byStaff,
    };
  }, [filteredDashboardRecords, dbRecords, dashStatusFilter, dashTypeFilter, staffList, problemTypes, statusOptions]);

  const allDistinctStaff = useMemo(() => {
    const set = new Set<string>(staffList);
    dbRecords.forEach((r) => {
      if (r.staffName && r.staffName !== '-') set.add(r.staffName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [dbRecords, staffList]);

  const allDistinctTypes = useMemo(() => {
    const set = new Set<string>(problemTypes);
    dbRecords.forEach((r) => {
      if (r.problemType && r.problemType !== '-') set.add(r.problemType);
    });
    return Array.from(set);
  }, [dbRecords, problemTypes]);

  // Detect if the user is typing a docNumber in the Add form that already exists in DB
  const existingDocWarning = useMemo(() => {
    const trimmed = docNumber.trim();
    if (!trimmed) return null;
    const found = dbRecords.filter((r) => r.docNumber === trimmed);
    return found.length > 0 ? found : null;
  }, [docNumber, dbRecords]);

  const rememberDocNumber = (num: string) => {
    const trimmed = num.trim();
    if (!trimmed) return;
    setRecentDocNumbers((prev) => [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 6));
  };

  const resetForm = () => {
    setDocNumber('');
    setReceiveDate(new Date().toISOString().split('T')[0]);
    setStaffName('');
    setProblemType('');
    setProblemDetail('');
    setStatus('');
    setRemark('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    const trimmedDoc = docNumber.trim();
    if (!trimmedDoc || !receiveDate || !staffName || !problemType || !problemDetail.trim() || !status) {
      setNotification({
        type: 'error',
        title: 'กรอกข้อมูลไม่ครบถ้วน',
        message: 'กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบทุกช่อง',
      });
      return;
    }

    setIsSubmitting(true);
    const thaiDate = formatThaiDate(receiveDate);
    const nowTime = getCurrentThaiDateTime();

    const formData = {
      action: 'create',
      docNumber: trimmedDoc,
      receiveDate: thaiDate,
      staffName,
      problemType,
      problemDetail: problemDetail.trim(),
      status,
      remark: remark.trim(),
      sortBy: 'staffName',
    };

    try {
      const response = await sendJsonp<{ success: boolean; error?: string }>(SCRIPT_URL, formData);
      if (response && response.success) {
        const newRecord: CaseRecord = {
          rowIndex: dbRecords.length + 2,
          docNumber: trimmedDoc,
          receiveDate: thaiDate,
          staffName,
          problemType,
          problemDetail: problemDetail.trim(),
          status,
          remark: remark.trim(),
          lastUpdate: nowTime,
        };
        // Automatically insert and re-sort by staffName (ก-ฮ)
        setDbRecords((prev) => sortRecordsByStaffName([...prev, newRecord]));
        rememberDocNumber(trimmedDoc);
        setNotification({
          type: 'success',
          title: 'บันทึกและจัดเรียงตามชื่อผู้รับผิดชอบสำเร็จ!',
          message: `ข้อมูลเลขหนังสือ "${trimmedDoc}" ถูกบันทึกและจัดเรียงเข้ากลุ่มของ "${staffName}" โดยอัตโนมัติแล้ว`,
          docNum: trimmedDoc,
        });
        resetForm();
      } else {
        throw new Error(response?.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (error: any) {
      setNotification({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการบันทึก',
        message: error?.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeSearch = async (targetQuery: string) => {
    const trimmed = targetQuery.trim();
    setNotification(null);

    if (!trimmed) {
      setNotification({
        type: 'error',
        title: 'กรุณากรอกเลขหนังสือหรือคำค้นหา',
        message: 'โปรดระบุเลขหนังสือ สบต. ที่ต้องการค้นหา',
      });
      return;
    }

    setIsSearching(true);
    setNoResultFound(false);
    setMatchedList([]);

    const exactMatches = dbRecords.filter((r) => r.docNumber === trimmed);
    const keywordMatches =
      exactMatches.length === 0
        ? dbRecords.filter(
            (r) =>
              r.docNumber.includes(trimmed) ||
              r.problemDetail.toLowerCase().includes(trimmed.toLowerCase()) ||
              r.staffName.includes(trimmed) ||
              r.remark.toLowerCase().includes(trimmed.toLowerCase())
          )
        : [];

    try {
      const response = await sendJsonp<{
        success: boolean;
        data?: any;
        matches?: any[];
        rowNumber?: number;
        error?: string;
      }>(SCRIPT_URL, {
        action: 'search',
        docNumber: trimmed,
      });

      if (response && response.success && response.data) {
        const formatItem = (raw: any, fallbackRow?: number): CaseRecord => ({
          rowIndex: raw.rowIndex || fallbackRow,
          docNumber: String(raw.docNumber || trimmed).trim(),
          receiveDate: formatThaiDate(String(raw.receiveDate || '-')),
          staffName: String(raw.staffName || '-').trim(),
          problemType: String(raw.problemType || '-').trim(),
          problemDetail: String(raw.problemDetail || '-').trim(),
          status: String(raw.status || 'อยู่ระหว่างตรวจสอบข้อมูล').trim(),
          remark: String(raw.remark || '-').trim() || '-',
          lastUpdate: formatThaiDate(String(raw.lastUpdate || getCurrentThaiDateTime())),
        });

        const primaryLive = formatItem(response.data, response.rowNumber);

        // If Apps Script returned multiple matches (new script), use them; otherwise combine with local exactMatches
        let allMatches: CaseRecord[] = [];
        if (Array.isArray(response.matches) && response.matches.length > 0) {
          allMatches = response.matches.map((m, i) => formatItem(m, m.rowIndex || i + 2));
        } else if (exactMatches.length > 1) {
          allMatches = exactMatches.map((m, idx) => (idx === 0 ? primaryLive : m));
        } else {
          allMatches = [primaryLive];
        }

        setSearchResult(allMatches[0]);
        setEditStatus(allMatches[0].status);
        setEditRemark(allMatches[0].remark === '-' ? '' : allMatches[0].remark);
        setMatchedList(allMatches.length > 1 ? allMatches : []);
        setNoResultFound(false);
        rememberDocNumber(allMatches[0].docNumber);
      } else if (exactMatches.length > 0) {
        setSearchResult(exactMatches[0]);
        setEditStatus(exactMatches[0].status);
        setEditRemark(exactMatches[0].remark === '-' ? '' : exactMatches[0].remark);
        if (exactMatches.length > 1) {
          setMatchedList(exactMatches);
        }
        setNoResultFound(false);
        rememberDocNumber(exactMatches[0].docNumber);
      } else if (keywordMatches.length > 0) {
        setSearchResult(keywordMatches[0]);
        setEditStatus(keywordMatches[0].status);
        setEditRemark(keywordMatches[0].remark === '-' ? '' : keywordMatches[0].remark);
        setMatchedList(keywordMatches.slice(0, 20));
        setNoResultFound(false);
      } else {
        setSearchResult(null);
        setNoResultFound(true);
      }
    } catch {
      if (exactMatches.length > 0) {
        setSearchResult(exactMatches[0]);
        setEditStatus(exactMatches[0].status);
        setEditRemark(exactMatches[0].remark === '-' ? '' : exactMatches[0].remark);
        if (exactMatches.length > 1) setMatchedList(exactMatches);
        setNoResultFound(false);
      } else if (keywordMatches.length > 0) {
        setSearchResult(keywordMatches[0]);
        setEditStatus(keywordMatches[0].status);
        setEditRemark(keywordMatches[0].remark === '-' ? '' : keywordMatches[0].remark);
        setMatchedList(keywordMatches.slice(0, 20));
        setNoResultFound(false);
      } else {
        setSearchResult(null);
        setNoResultFound(true);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchDocNumber);
  };

  const handleConfirmUpdateStatus = async () => {
    if (!searchResult) return;
    setShowConfirmModal(false);
    setNotification(null);
    setIsUpdating(true);

    const updatedTime = getCurrentThaiDateTime();
    const cleanedRemark = editRemark.trim();

    try {
      const response = await sendJsonp<{ success: boolean; error?: string }>(SCRIPT_URL, {
        action: 'update',
        docNumber: searchResult.docNumber,
        status: editStatus,
        remark: cleanedRemark,
        lastUpdate: updatedTime,
        sortBy: 'staffName',
      });

      if (response && response.success) {
        const updated: CaseRecord = {
          ...searchResult,
          status: editStatus,
          remark: cleanedRemark || '-',
          lastUpdate: updatedTime,
        };
        setSearchResult(updated);
        setDbRecords((prev) =>
          sortRecordsByStaffName(
            prev.map((r) => (r.docNumber === updated.docNumber ? updated : r))
          )
        );
        setNotification({
          type: 'success',
          title: 'บันทึกการแก้ไขสำเร็จ!',
          message: `อัปเดตสถานะและหมายเหตุของเลขหนังสือ "${searchResult.docNumber}" บน Google Sheets เรียบร้อยแล้ว`,
        });
      } else {
        throw new Error(response?.error || 'ไม่สามารถแก้ไขข้อมูลได้');
      }
    } catch (error: any) {
      setNotification({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการบันทึกการแก้ไข',
        message: error?.message || 'ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyGasScript = () => {
    navigator.clipboard.writeText(GAS_AUTO_SORT_SCRIPT);
    setCopiedScript(true);
    window.setTimeout(() => setCopiedScript(false), 2500);
  };

  const hasActiveDashFilters =
    dashStaffFilter !== 'ALL' || dashStatusFilter !== 'ALL' || dashTypeFilter !== 'ALL';

  return (
    <div className="min-h-screen flex flex-col text-slate-900">
      {/* Top Bar Contract: 3 zones (Brand | Nav Links | Primary Action) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-emerald-900/10 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('dashboard');
              setNotification(null);
            }}
            className="text-lg font-bold tracking-tight text-emerald-950 whitespace-nowrap shrink-0"
          >
            ระบบจัดเก็บสถิติและปัญหากอไผ่
          </a>

          <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setNotification(null);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-emerald-700 font-bold underline underline-offset-8 decoration-2 decoration-emerald-600'
                  : 'hover:text-emerald-900'
              }`}
            >
              แดชบอร์ดสถิติ
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('add');
                setNotification(null);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'add'
                  ? 'text-emerald-700 font-bold underline underline-offset-8 decoration-2 decoration-emerald-600'
                  : 'hover:text-emerald-900'
              }`}
            >
              บันทึกข้อมูลใหม่
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('search');
                setNotification(null);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'search'
                  ? 'text-emerald-700 font-bold underline underline-offset-8 decoration-2 decoration-emerald-600'
                  : 'hover:text-emerald-900'
              }`}
            >
              ค้นหาและแก้ไขสถานะ
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setNotification(null);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'settings'
                  ? 'text-emerald-700 font-bold underline underline-offset-8 decoration-2 decoration-emerald-600'
                  : 'hover:text-emerald-900'
              }`}
            >
              ตั้งค่าระบบ
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            {activeTab !== 'add' ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('add');
                  setNotification(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <FilePlus className="w-3.5 h-3.5" />
                เพิ่มข้อมูลใหม่
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('search');
                  setNotification(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-emerald-700" />
                ไปหน้าค้นหา/แก้ไข
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-6">
        {/* Atmospheric Emerald & Bamboo Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white p-6 sm:p-8 shadow-sm">
          <svg
            className="absolute right-0 top-0 h-full w-1/2 opacity-10 pointer-events-none"
            viewBox="0 0 400 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="320" cy="40" r="120" stroke="currentColor" strokeWidth="2" />
            <circle cx="320" cy="40" r="80" stroke="currentColor" strokeWidth="1.5" />
            <path d="M220 0V200M260 0V200M300 0V200" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 6" />
          </svg>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-200/90 font-medium">
                <span>สำนักบริหารแรงงานต่างด้าว (สบต.)</span>
                <span aria-hidden="true">·</span>
                <span>เรียงตามชื่อ-นามสกุลผู้รับผิดชอบอัตโนมัติ</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-amber-300">
                  {isLoadingCsv
                    ? 'กำลังซิงค์ฐานข้อมูล...'
                    : `ฐานข้อมูล ${dbRecords.length.toLocaleString()} รายการ`}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {activeTab === 'dashboard'
                  ? 'แดชบอร์ดสรุปสถิติและติดตามผลการดำเนินงาน'
                  : activeTab === 'add'
                  ? 'บันทึกข้อมูลปัญหาใหม่เข้าสู่ฐานข้อมูล'
                  : activeTab === 'search'
                  ? 'ค้นหาและแก้ไขสถานะการดำเนินการ'
                  : 'ตั้งค่ารายชื่อ ประเภทปัญหา และสถานะการดำเนินการ'}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
                {activeTab === 'dashboard'
                  ? 'ข้อมูลทั้งหมดถูกจัดเรียงตามชื่อ-นามสกุลผู้รับผิดชอบ (ก–ฮ) โดยอัตโนมัติไม่ว่าจะบันทึกเวลาใด พร้อมสรุปสถิติแบบเรียลไทม์'
                  : activeTab === 'add'
                  ? 'เมื่อกดบันทึกข้อมูลใหม่ ระบบจะนำข้อมูลไปจัดเรียงเข้ากลุ่มตามชื่อ-นามสกุลผู้รับผิดชอบในฐานข้อมูลให้อัตโนมัติ'
                  : activeTab === 'search'
                  ? 'ค้นหาด้วยเลขหนังสือ สบต. หรือคำสำคัญ เพื่อตรวจสอบรายละเอียด อัปเดตสถานะการดำเนินการ และบันทึกหมายเหตุเพิ่มเติม'
                  : 'เพิ่มหรือลบรายชื่อผู้รับผิดชอบ ประเภทของปัญหา และสถานะการดำเนินการ เพื่อใช้เป็นตัวเลือกในระบบได้ทันที'}
              </p>
            </div>

            {/* 4-Tab Segmented Switcher on Hero */}
            <div className="grid grid-cols-2 sm:flex items-center gap-1.5 p-1.5 bg-emerald-950/60 backdrop-blur-md border border-white/15 rounded-xl shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  setNotification(null);
                }}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                แดชบอร์ด
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('add');
                  setNotification(null);
                }}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'add'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <FilePlus className="w-4 h-4 text-emerald-600" />
                เพิ่มข้อมูลใหม่
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('search');
                  setNotification(null);
                }}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'search'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Search className="w-4 h-4 text-emerald-600" />
                ค้นหา / แก้ไข
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('settings');
                  setNotification(null);
                }}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Settings className="w-4 h-4 text-emerald-600" />
                ตั้งค่า
              </button>
            </div>
          </div>
        </section>

        {/* Status Notification Alert */}
        {notification && (
          <div
            role="alert"
            className={`p-4 rounded-xl border flex items-start justify-between gap-4 shadow-xs ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300/80 text-emerald-950'
                : 'bg-red-50 border-red-300/80 text-red-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <p className="font-bold">{notification.title}</p>
                <p className="mt-0.5 text-slate-700">{notification.message}</p>
                {notification.docNum && activeTab === 'add' && (
                  <button
                    type="button"
                    onClick={() => {
                      const doc = notification.docNum!;
                      setNotification(null);
                      setActiveTab('search');
                      setSearchDocNumber(doc);
                      executeSearch(doc);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                  >
                    เปิดดูและตรวจสอบเลขหนังสือ "{notification.docNum}" ทันที
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SECTION 0: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Filter Controls Bar */}
            <section className="bg-white border border-emerald-900/10 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="grid sm:grid-cols-3 gap-4 flex-1">
                  <div>
                    <label
                      htmlFor="dash-staff-filter"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      กรองตามผู้รับผิดชอบ
                    </label>
                    <select
                      id="dash-staff-filter"
                      value={dashStaffFilter}
                      onChange={(e) => setDashStaffFilter(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50/70 hover:bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                    >
                      <option value="ALL">ผู้รับผิดชอบทั้งหมด ({allDistinctStaff.length} ท่าน)</option>
                      <optgroup label={`ผู้รับผิดชอบปัจจุบัน (${staffList.length} ท่าน)`}>
                        {staffList.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="ผู้รับผิดชอบเดิมในฐานข้อมูล">
                        {allDistinctStaff
                          .filter((s) => !staffList.includes(s))
                          .map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="dash-type-filter"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      กรองตามประเภทปัญหา
                    </label>
                    <select
                      id="dash-type-filter"
                      value={dashTypeFilter}
                      onChange={(e) => setDashTypeFilter(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50/70 hover:bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                    >
                      <option value="ALL">ประเภทปัญหาทั้งหมด</option>
                      {allDistinctTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="dash-status-filter"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      กรองตามสถานะการดำเนินการ
                    </label>
                    <select
                      id="dash-status-filter"
                      value={dashStatusFilter}
                      onChange={(e) => setDashStatusFilter(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50/70 hover:bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                    >
                      <option value="ALL">สถานะทั้งหมด ({statusOptions.length} สถานะ)</option>
                      {statusOptions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
                  {hasActiveDashFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setDashStaffFilter('ALL');
                        setDashStatusFilter('ALL');
                        setDashTypeFilter('ALL');
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      ล้างตัวกรอง
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSyncingLive}
                    onClick={() => handleManualSyncFromSheet(true)}
                    className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLive ? 'animate-spin' : ''}`} />
                    {isSyncingLive
                      ? 'กำลังซิงค์ข้อมูล...'
                      : liveSyncSource === 'live'
                      ? 'ซิงค์ข้อมูลสดแล้ว'
                      : 'ดึงข้อมูลล่าสุดจาก Google Sheet'}
                  </button>
                </div>
              </div>
            </section>

            {/* 4 Key KPI Summary Strip */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-emerald-900/10 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>จำนวนเรื่องทั้งหมด</span>
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-3xl font-bold text-slate-900 font-mono tabular-nums mt-2">
                  {dashboardMetrics.total.toLocaleString()}
                </p>
                <span className="text-xs text-slate-500 mt-1 block">
                  รายการที่ตรงตามเงื่อนไขตัวกรอง
                </span>
              </div>

              <div className="bg-gradient-to-br from-white to-emerald-50/60 border border-emerald-200/80 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <span>ดำเนินการเสร็จสิ้น / ปิดเคส</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-3xl font-bold text-emerald-700 font-mono tabular-nums">
                    {dashboardMetrics.completed.toLocaleString()}
                  </p>
                  <span className="text-xs font-mono font-bold text-emerald-700 tabular-nums">
                    ({dashboardMetrics.completionRate}%)
                  </span>
                </div>
                <span className="text-xs text-emerald-800/70 mt-1 block">
                  อัตราความสำเร็จของการปิดเคส
                </span>
              </div>

              <div className="bg-gradient-to-br from-white to-amber-50/60 border border-amber-200/80 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                  <span>อยู่ระหว่างดำเนินการ</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-amber-700 font-mono tabular-nums mt-2">
                  {dashboardMetrics.inProgress.toLocaleString()}
                </p>
                <span className="text-xs text-amber-900/70 mt-1 block">
                  รอตรวจสอบ / ประสานงานผู้แจ้งและ OS
                </span>
              </div>

              <div className="bg-gradient-to-br from-white to-teal-50/60 border border-teal-200/80 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-teal-900">
                  <span>เสนอพิจารณา / นำส่ง ผอ.</span>
                  <FolderKanban className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-3xl font-bold text-teal-700 font-mono tabular-nums mt-2">
                  {dashboardMetrics.executive.toLocaleString()}
                </p>
                <span className="text-xs text-teal-900/70 mt-1 block">
                  อยู่ระหว่างเสนอหนังสือและนำส่งผู้อำนวยการ
                </span>
              </div>
            </section>

            {/* 2-Column Breakdown: Status & Problem Type */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Breakdown by Status */}
              <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs">
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-transparent border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      สัดส่วนตามสถานะการดำเนินการ
                    </h2>
                    <p className="text-xs text-slate-500">
                      คลิกที่แถวสถานะเพื่อกรองดูเฉพาะรายการในสถานะนั้น
                    </p>
                  </div>
                  {dashStatusFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setDashStatusFilter('ALL')}
                      className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      แสดงทุกสถานะ
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-2.5">
                  {dashboardMetrics.byStatus.map((item) => {
                    const isSelected = dashStatusFilter === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() =>
                          setDashStatusFilter(isSelected ? 'ALL' : item.name)
                        }
                        className={`w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/90 ring-1 ring-emerald-500/30'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                          <span className={`font-semibold ${getStatusColorClass(item.name)}`}>
                            {item.name}
                          </span>
                          <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
                            <span className="font-bold text-slate-900">
                              {item.count.toLocaleString()} เรื่อง
                            </span>
                            <span className="text-slate-400">
                              ({item.pct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getStatusBarColorClass(
                              item.name
                            )}`}
                            style={{ width: `${Math.max(item.pct, item.count > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Breakdown by Problem Type */}
              <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs">
                <div className="px-6 py-4 bg-gradient-to-r from-teal-50/80 via-sky-50/40 to-transparent border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      สัดส่วนตามประเภทของปัญหา
                    </h2>
                    <p className="text-xs text-slate-500">
                      คลิกที่ประเภทปัญหาเพื่อกรองดูรายการเฉพาะหมวดหมู่นั้น
                    </p>
                  </div>
                  {dashTypeFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setDashTypeFilter('ALL')}
                      className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      แสดงทุกประเภท
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-2.5">
                  {dashboardMetrics.byType.map((item) => {
                    const isSelected = dashTypeFilter === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() =>
                          setDashTypeFilter(isSelected ? 'ALL' : item.name)
                        }
                        className={`w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50/90 ring-1 ring-teal-500/30'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                          <span className="font-semibold text-slate-800">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
                            <span className="font-bold text-slate-900">
                              {item.count.toLocaleString()} เรื่อง
                            </span>
                            <span className="text-slate-400">
                              ({item.pct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getProblemTypeBarColorClass(
                              item.name
                            )}`}
                            style={{ width: `${Math.max(item.pct, item.count > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Staff Workload Table */}
            <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs">
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/70 via-slate-50 to-transparent border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    สรุปปริมาณงานแยกตามผู้รับผิดชอบ (เรียงตามตัวอักษร ก–ฮ)
                  </h2>
                  <p className="text-xs text-slate-500">
                    คลิกชื่อผู้รับผิดชอบเพื่อกรองดูสถิติของเจ้าหน้าที่ท่านนั้น
                  </p>
                </div>
                {dashStaffFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setDashStaffFilter('ALL')}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    แสดงผู้รับผิดชอบทั้งหมด
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50/60">
                      <th className="py-3 px-6 font-semibold">ชื่อ-นามสกุล ผู้รับผิดชอบ</th>
                      <th className="py-3 px-4 font-semibold text-right">ทั้งหมด (เรื่อง)</th>
                      <th className="py-3 px-4 font-semibold text-right">ดำเนินการเสร็จสิ้น</th>
                      <th className="py-3 px-4 font-semibold text-right">อยู่ระหว่างดำเนินการ</th>
                      <th className="py-3 px-6 font-semibold text-right w-44">อัตราปิดเคส</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardMetrics.byStaff.map((person) => {
                      const isSelected = dashStaffFilter === person.name;
                      return (
                        <tr
                          key={person.name}
                          onClick={() =>
                            setDashStaffFilter(isSelected ? 'ALL' : person.name)
                          }
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-50/80' : 'hover:bg-slate-50/90'
                          }`}
                        >
                          <td className="py-3 px-6 font-medium text-slate-900 whitespace-nowrap">
                            <span>{person.name}</span>
                            {!person.isCurrentTeam && (
                              <span className="ml-2 text-xs text-slate-400">
                                (ข้อมูลเดิม)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {person.total.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                            {person.completed.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-700 font-semibold tabular-nums">
                            {person.pending.toLocaleString()}
                          </td>
                          <td className="py-3 px-6">
                            <div className="flex items-center justify-end gap-2.5">
                              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-emerald-600 rounded-full"
                                  style={{ width: `${person.rateNum}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums w-12 text-right">
                                {person.rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* SECTION 1: ADD NEW CASE */}
        {activeTab === 'add' && (
          <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-transparent border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-slate-900">แบบฟอร์มบันทึกข้อมูลปัญหาใหม่</h2>
              </div>
              <span className="text-xs text-emerald-800 font-medium">
                ระบบจะจัดเรียงข้อมูลตามชื่อ-นามสกุลผู้รับผิดชอบให้อัตโนมัติหลังกดบันทึก
              </span>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 sm:p-8 space-y-6">
              {/* Row 1: Document Number & Receive Date */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="doc-number"
                    className="block text-sm font-semibold text-slate-800 mb-2"
                  >
                    <span className="text-red-600 font-bold mr-1">*</span>
                    เลขหนังสือ สบต.
                  </label>
                  <input
                    id="doc-number"
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="กรอกเลขหนังสือรับ เช่น 4389 หรือ 19668"
                    className="w-full px-4 py-2.5 bg-slate-50/60 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all"
                  />
                  {existingDocWarning && (
                    <div className="mt-2 flex items-center justify-between text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span>
                        พบเลขหนังสือ <strong className="font-mono">{docNumber.trim()}</strong> มีอยู่ในฐานข้อมูลแล้ว ({existingDocWarning.length} รายการ)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const target = docNumber.trim();
                          setActiveTab('search');
                          setSearchDocNumber(target);
                          executeSearch(target);
                        }}
                        className="font-semibold underline hover:text-amber-950 ml-2 shrink-0 cursor-pointer"
                      >
                        เปิดดูข้อมูลเดิม
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="receive-date"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      <span className="text-red-600 font-bold mr-1">*</span>
                      วันที่รับตามเลขหนังสือ
                    </label>
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatThaiDate(receiveDate)}
                    </span>
                  </div>
                  <input
                    id="receive-date"
                    type="date"
                    required
                    disabled={isSubmitting}
                    value={receiveDate}
                    onChange={(e) => setReceiveDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/60 focus:bg-white border border-slate-300 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Staff Name & Problem Type */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="staff-name"
                    className="block text-sm font-semibold text-slate-800 mb-2"
                  >
                    <span className="text-red-600 font-bold mr-1">*</span>
                    ชื่อ-นามสกุล ผู้รับผิดชอบ
                  </label>
                  <select
                    id="staff-name"
                    required
                    disabled={isSubmitting}
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/60 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all"
                  >
                    <option value="">-- เลือกผู้รับผิดชอบ --</option>
                    {staffList.map((person) => (
                      <option key={person} value={person}>
                        {person}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="problem-type"
                    className="block text-sm font-semibold text-slate-800 mb-2"
                  >
                    <span className="text-red-600 font-bold mr-1">*</span>
                    ประเภทของปัญหา
                  </label>
                  <select
                    id="problem-type"
                    required
                    disabled={isSubmitting}
                    value={problemType}
                    onChange={(e) => setProblemType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/60 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all"
                  >
                    <option value="">-- เลือกประเภทปัญหา --</option>
                    {problemTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Problem Detail */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="problem-detail"
                    className="block text-sm font-semibold text-slate-800"
                  >
                    <span className="text-red-600 font-bold mr-1">*</span>
                    ปัญหาที่พบ
                  </label>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    {problemDetail.length} ตัวอักษร
                  </span>
                </div>
                <textarea
                  id="problem-detail"
                  required
                  rows={4}
                  disabled={isSubmitting}
                  value={problemDetail}
                  onChange={(e) => setProblemDetail(e.target.value)}
                  placeholder="อธิบายรายละเอียดปัญหาที่พบ..."
                  className="w-full px-4 py-3 bg-slate-50/60 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 resize-y focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all"
                />
              </div>

              {/* Row 4: Status & Remark */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-semibold text-slate-800 mb-2"
                  >
                    <span className="text-red-600 font-bold mr-1">*</span>
                    สถานะการดำเนินการ
                  </label>
                  <select
                    id="status"
                    required
                    disabled={isSubmitting}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/60 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all"
                  >
                    <option value="">-- เลือกสถานะการดำเนินการ --</option>
                    {statusOptions.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="remark"
                    className="block text-sm font-semibold text-slate-800 mb-2"
                  >
                    หมายเหตุ
                  </label>
                  <input
                    id="remark"
                    type="text"
                    disabled={isSubmitting}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                    className="w-full px-4 py-2.5 bg-slate-50/60 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      กำลังบันทึกข้อมูล...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      บันทึกข้อมูล
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    resetForm();
                    setNotification(null);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  ล้างข้อมูล
                </button>
              </div>
            </form>
          </section>
        )}

        {/* SECTION 2: SEARCH & EDIT STATUS */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Box Card */}
            <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs">
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-transparent border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-emerald-700" />
                  <h2 className="font-bold text-slate-900">ค้นหาข้อมูลจากฐานข้อมูล</h2>
                </div>
                <span className="text-xs text-slate-500">
                  ค้นหาด้วยเลขหนังสือ (เช่น 4389) หรือคำสำคัญในปัญหา
                </span>
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                <form onSubmit={handleSearchFormSubmit} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label htmlFor="search-doc-input" className="sr-only">
                      เลขหนังสือ สบต. ที่ต้องการค้นหา
                    </label>
                    <input
                      id="search-doc-input"
                      type="text"
                      disabled={isSearching}
                      value={searchDocNumber}
                      onChange={(e) => setSearchDocNumber(e.target.value)}
                      placeholder="พิมพ์เลขหนังสือ สบต. (เช่น 4389, 2833, 7407) หรือคำค้นหา..."
                      className="w-full px-4 py-2.5 bg-slate-50/60 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isSearching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        กำลังค้นหา...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        ค้นหาข้อมูล
                      </>
                    )}
                  </button>
                </form>

                {/* Recent searched/created items for quick 1-click access */}
                {recentDocNumbers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="text-slate-500">เลขหนังสือล่าสุด / ตัวอย่างในฐานข้อมูล:</span>
                    {recentDocNumbers.map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setSearchDocNumber(num);
                          executeSearch(num);
                        }}
                        className="px-2.5 py-1 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/70 font-mono rounded-md transition-colors cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Multi-record selector when duplicate docNumber or keyword matches exist */}
            {!isSearching && matchedList.length > 1 && (
              <section className="bg-white border border-emerald-900/10 rounded-xl p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    พบข้อมูลที่ตรงกันจำนวน {matchedList.length} รายการ (คลิกเลือกรายการที่ต้องการตรวจสอบ)
                  </h3>
                  <span className="text-xs text-slate-500">
                    ในฐานข้อมูลบางเลขหนังสือมีการบันทึกมากกว่า 1 แถว
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
                  {matchedList.map((item, idx) => {
                    const isSelected =
                      searchResult?.docNumber === item.docNumber &&
                      searchResult?.problemDetail === item.problemDetail &&
                      searchResult?.lastUpdate === item.lastUpdate;
                    return (
                      <button
                        key={`${item.docNumber}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSearchResult(item);
                          setEditStatus(item.status);
                          setEditRemark(item.remark === '-' ? '' : item.remark);
                        }}
                        className={`w-full text-left px-4 py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-50/90' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              เลขหนังสือ {item.docNumber}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-slate-600">{item.receiveDate}</span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-slate-600">{item.staffName}</span>
                          </div>
                          <p className="text-slate-700 line-clamp-1">{item.problemDetail}</p>
                        </div>
                        <span
                          className={`font-semibold shrink-0 ${getStatusColorClass(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Loading Skeleton State */}
            {isSearching && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-4 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3" />
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  <div className="h-16 bg-slate-100 rounded-lg" />
                  <div className="h-16 bg-slate-100 rounded-lg" />
                </div>
                <div className="h-24 bg-slate-100 rounded-lg" />
              </div>
            )}

            {/* Empty / No Results State */}
            {!isSearching && noResultFound && (
              <section className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3 shadow-xs">
                <p className="text-base font-bold text-slate-900">
                  ไม่พบข้อมูลสำหรับ "{searchDocNumber}"
                </p>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  กรุณาตรวจสอบหมายเลขหนังสืออีกครั้ง หรือคลิกปุ่มด้านล่างหากต้องการนำเลขหนังสือนี้ไปบันทึกเป็นรายการใหม่
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDocNumber(searchDocNumber.trim());
                      setActiveTab('add');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <FilePlus className="w-4 h-4" />
                    นำเลขหนังสือนี้ไปบันทึกเป็นข้อมูลใหม่
                  </button>
                </div>
              </section>
            )}

            {/* Search Result & Status Editor */}
            {!isSearching && searchResult && (
              <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs">
                {/* Document Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-transparent border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-900">รายละเอียดข้อมูลหนังสือ</h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">สถานะปัจจุบัน:</span>
                    <span className={`font-bold text-sm ${getStatusColorClass(searchResult.status)}`}>
                      {searchResult.status}
                    </span>
                  </div>
                </div>

                {/* Document Details Grid */}
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">เลขหนังสือ สบต.</span>
                      <p className="text-xl font-bold text-emerald-950 font-mono tabular-nums">
                        {searchResult.docNumber}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        วันที่รับตามเลขหนังสือ
                      </span>
                      <p className="text-base font-semibold text-slate-900">
                        {searchResult.receiveDate}
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                    <div>
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        ผู้รับผิดชอบ
                      </span>
                      <p className="text-base font-semibold text-slate-900">
                        {searchResult.staffName}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                        <FolderKanban className="w-3.5 h-3.5 text-emerald-600" />
                        ประเภทของปัญหา
                      </span>
                      <p className="text-base font-semibold text-slate-900">
                        {searchResult.problemType}
                      </p>
                    </div>
                  </div>

                  <div className="pb-6 border-b border-slate-100">
                    <span className="text-xs text-slate-500 block mb-2">ปัญหาที่พบ</span>
                    <div className="p-4 bg-emerald-50/30 border border-emerald-900/10 rounded-lg text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {searchResult.problemDetail}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                        <MessageSquareText className="w-3.5 h-3.5 text-emerald-600" />
                        หมายเหตุปัจจุบัน
                      </span>
                      <p className="text-sm font-medium text-slate-800">
                        {searchResult.remark || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        วันเวลาที่แจ้งสถานะล่าสุด
                      </span>
                      <p className="text-sm font-mono tabular-nums text-slate-700">
                        {searchResult.lastUpdate}
                      </p>
                    </div>
                  </div>

                  {/* Editable Status & Remark Block */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-slate-900 text-base">
                        แก้ไขสถานะและหมายเหตุเพิ่มเติม
                      </h4>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="edit-status"
                          className="block text-xs font-semibold text-slate-700 mb-1.5"
                        >
                          สถานะการดำเนินการ
                        </label>
                        <select
                          id="edit-status"
                          disabled={isUpdating}
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50/60 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all"
                        >
                          {Array.from(new Set([...statusOptions, ...(searchResult.status ? [searchResult.status] : [])])).map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="edit-remark"
                          className="block text-xs font-semibold text-slate-700 mb-1.5"
                        >
                          หมายเหตุเพิ่มเติม (แก้ไข/ปรับปรุง)
                        </label>
                        <input
                          id="edit-remark"
                          type="text"
                          disabled={isUpdating}
                          value={editRemark}
                          onChange={(e) => setEditRemark(e.target.value)}
                          placeholder="ระบุหมายเหตุเพิ่มเติม เช่น เลขที่คำขอ หรือผลการประสานงาน..."
                          className="w-full px-4 py-2.5 bg-slate-50/60 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all"
                        />
                      </div>
                    </div>

                    {(() => {
                      const currentNormalizedRemark =
                        searchResult.remark === '-' ? '' : searchResult.remark.trim();
                      const hasChanges =
                        editStatus !== searchResult.status ||
                        editRemark.trim() !== currentNormalizedRemark;

                      return (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                          <p className="text-xs text-slate-500">
                            {hasChanges
                              ? 'มีการแก้ไขข้อมูลแล้ว กดปุ่ม "บันทึกการแก้ไข" เพื่ออัปเดตลงฐานข้อมูล'
                              : 'เปลี่ยนสถานะการดำเนินการ หรือพิมพ์หมายเหตุเพิ่มเติมเพื่อบันทึกการแก้ไข'}
                          </p>

                          <button
                            type="button"
                            disabled={isUpdating || !hasChanges}
                            onClick={() => setShowConfirmModal(true)}
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {isUpdating ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                กำลังบันทึกการแก้ไข...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                บันทึกการแก้ไข
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* SECTION 3: SETTINGS (Manage Staff, Problem Types, and Statuses) */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Top summary & Reset bar */}
            <section className="bg-white border border-emerald-900/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  จัดการข้อมูลตัวเลือกของระบบ (บันทึกอัตโนมัติ)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ข้อมูลที่เพิ่มหรือลบจะถูกนำไปใช้ในหน้า "เพิ่มข้อมูลใหม่", "ค้นหา / แก้ไข", และ "แดชบอร์ด" ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStaffList(DEFAULT_STAFF_LIST);
                  setProblemTypes(DEFAULT_PROBLEM_TYPES);
                  setStatusOptions(DEFAULT_STATUS_OPTIONS);
                  setNotification({
                    type: 'success',
                    title: 'คืนค่าเริ่มต้นสำเร็จ',
                    message: 'รีเซ็ตรายชื่อผู้รับผิดชอบ ประเภทปัญหา และสถานะการดำเนินการกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว',
                  });
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                คืนค่าเริ่มต้นทั้งหมด
              </button>
            </section>

            {/* 3-Column Management Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Column 1: Staff List */}
              <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs flex flex-col">
                <div className="px-5 py-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-transparent border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      ชื่อ-นามสกุล ผู้รับผิดชอบ
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 tabular-nums">
                    {staffList.length} รายชื่อ
                  </span>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = newStaffInput.trim();
                      if (!val) return;
                      if (staffList.includes(val)) {
                        setNotification({
                          type: 'error',
                          title: 'รายชื่อซ้ำ',
                          message: `มีชื่อ "${val}" อยู่ในระบบแล้ว`,
                        });
                        return;
                      }
                      setStaffList((prev) => [...prev, val]);
                      setNewStaffInput('');
                      setNotification({
                        type: 'success',
                        title: 'เพิ่มผู้รับผิดชอบสำเร็จ',
                        message: `เพิ่ม "${val}" เข้าสู่รายการผู้รับผิดชอบเรียบร้อยแล้ว`,
                      });
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={newStaffInput}
                      onChange={(e) => setNewStaffInput(e.target.value)}
                      placeholder="พิมพ์ชื่อ-นามสกุลใหม่..."
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-50/70 focus:bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่ม
                    </button>
                  </form>

                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden">
                    {staffList.length === 0 ? (
                      <p className="p-4 text-xs text-slate-400 text-center">
                        ยังไม่มีรายชื่อผู้รับผิดชอบ
                      </p>
                    ) : (
                      staffList.map((person, idx) => (
                        <div
                          key={person}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono text-slate-400 tabular-nums w-5 shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="font-medium text-slate-800 truncate">
                              {person}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStaffList((prev) => prev.filter((item) => item !== person));
                              if (staffName === person) setStaffName('');
                              if (dashStaffFilter === person) setDashStaffFilter('ALL');
                              setNotification({
                                type: 'success',
                                title: 'ลบรายชื่อผู้รับผิดชอบแล้ว',
                                message: `นำ "${person}" ออกจากตัวเลือกผู้รับผิดชอบเรียบร้อยแล้ว`,
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0 cursor-pointer"
                            title={`ลบ ${person}`}
                            aria-label={`ลบ ${person}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* Column 2: Problem Types */}
              <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs flex flex-col">
                <div className="px-5 py-4 bg-gradient-to-r from-teal-50/90 via-sky-50/40 to-transparent border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-teal-700" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      ประเภทของปัญหา
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-teal-800 tabular-nums">
                    {problemTypes.length} ประเภท
                  </span>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = newProblemTypeInput.trim();
                      if (!val) return;
                      if (problemTypes.includes(val)) {
                        setNotification({
                          type: 'error',
                          title: 'ประเภทปัญหาซ้ำ',
                          message: `มีหัวข้อ "${val}" อยู่ในระบบแล้ว`,
                        });
                        return;
                      }
                      setProblemTypes((prev) => [...prev, val]);
                      setNewProblemTypeInput('');
                      setNotification({
                        type: 'success',
                        title: 'เพิ่มประเภทของปัญหาสำเร็จ',
                        message: `เพิ่ม "${val}" เข้าสู่รายการประเภทปัญหาเรียบร้อยแล้ว`,
                      });
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={newProblemTypeInput}
                      onChange={(e) => setNewProblemTypeInput(e.target.value)}
                      placeholder="พิมพ์ประเภทปัญหาใหม่..."
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-50/70 focus:bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่ม
                    </button>
                  </form>

                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden">
                    {problemTypes.length === 0 ? (
                      <p className="p-4 text-xs text-slate-400 text-center">
                        ยังไม่มีรายการประเภทปัญหา
                      </p>
                    ) : (
                      problemTypes.map((type, idx) => (
                        <div
                          key={type}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono text-slate-400 tabular-nums w-5 shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="font-medium text-slate-800 truncate">
                              {type}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setProblemTypes((prev) => prev.filter((item) => item !== type));
                              if (problemType === type) setProblemType('');
                              if (dashTypeFilter === type) setDashTypeFilter('ALL');
                              setNotification({
                                type: 'success',
                                title: 'ลบประเภทของปัญหาแล้ว',
                                message: `นำ "${type}" ออกจากตัวเลือกประเภทปัญหาเรียบร้อยแล้ว`,
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0 cursor-pointer"
                            title={`ลบ ${type}`}
                            aria-label={`ลบ ${type}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* Column 3: Status Options */}
              <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs flex flex-col">
                <div className="px-5 py-4 bg-gradient-to-r from-emerald-50/90 via-amber-50/30 to-transparent border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      สถานะการดำเนินการ
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 tabular-nums">
                    {statusOptions.length} สถานะ
                  </span>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = newStatusInput.trim();
                      if (!val) return;
                      if (statusOptions.includes(val)) {
                        setNotification({
                          type: 'error',
                          title: 'สถานะการดำเนินการซ้ำ',
                          message: `มีสถานะ "${val}" อยู่ในระบบแล้ว`,
                        });
                        return;
                      }
                      setStatusOptions((prev) => [...prev, val]);
                      setNewStatusInput('');
                      setNotification({
                        type: 'success',
                        title: 'เพิ่มสถานะการดำเนินการสำเร็จ',
                        message: `เพิ่ม "${val}" เข้าสู่รายการสถานะเรียบร้อยแล้ว`,
                      });
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={newStatusInput}
                      onChange={(e) => setNewStatusInput(e.target.value)}
                      placeholder="พิมพ์สถานะการดำเนินการใหม่..."
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-50/70 focus:bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่ม
                    </button>
                  </form>

                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden">
                    {statusOptions.length === 0 ? (
                      <p className="p-4 text-xs text-slate-400 text-center">
                        ยังไม่มีรายการสถานะการดำเนินการ
                      </p>
                    ) : (
                      statusOptions.map((st, idx) => (
                        <div
                          key={st}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono text-slate-400 tabular-nums w-5 shrink-0">
                              {idx + 1}.
                            </span>
                            <span className={`font-semibold truncate ${getStatusColorClass(st)}`}>
                              {st}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusOptions((prev) => prev.filter((item) => item !== st));
                              if (status === st) setStatus('');
                              if (dashStatusFilter === st) setDashStatusFilter('ALL');
                              setNotification({
                                type: 'success',
                                title: 'ลบสถานะการดำเนินการแล้ว',
                                message: `นำ "${st}" ออกจากตัวเลือกสถานะเรียบร้อยแล้ว`,
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0 cursor-pointer"
                            title={`ลบ ${st}`}
                            aria-label={`ลบ ${st}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Modal for Google Apps Script Auto-Sort Setup */}
      {showScriptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="script-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="script-modal-title" className="text-lg font-bold text-slate-900">
                  โค้ดจัดเรียงข้อมูลตาม "ชื่อ-นามสกุลผู้รับผิดชอบ" อัตโนมัติใน Google Sheet
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  ในหน้าเว็บระบบได้จัดเรียงตามชื่อผู้รับผิดชอบให้อัตโนมัติแล้ว ส่วนในไฟล์ Google Sheet หากต้องการให้แถวเรียงตามคอลัมน์ C (ผู้รับผิดชอบ) อัตโนมัติทุกครั้งที่กดบันทึก สามารถนำคำสั่ง <code className="font-mono text-emerald-700">.sort(&#123; column: 3, ascending: true &#125;)</code> นี้ไปใส่ในเมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong> ได้เลยครับ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-emerald-400">
                <span>Code.gs (รองรับเรียงตามผู้รับผิดชอบอัตโนมัติ + บันทึกหมายเหตุ)</span>
                <button
                  type="button"
                  onClick={handleCopyGasScript}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-sans font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      คัดลอกโค้ดแล้ว
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      คัดลอกโค้ดทั้งหมด
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words text-slate-200">
                <code>{GAS_AUTO_SORT_SCRIPT}</code>
              </pre>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Updating Status & Remark */}
      {showConfirmModal && searchResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-lg">
            <div className="space-y-2">
              <h3 id="confirm-modal-title" className="text-lg font-bold text-slate-900">
                ยืนยันการแก้ไขข้อมูล
              </h3>
              <p className="text-sm text-slate-600">
                คุณต้องการบันทึกการแก้ไขของเลขหนังสือ{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {searchResult.docNumber}
                </span>{' '}
                ใช่หรือไม่?
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 shrink-0">สถานะเดิม:</span>
                <span className="font-medium text-slate-700 text-right">{searchResult.status}</span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80">
                <span className="text-slate-500 shrink-0">สถานะใหม่:</span>
                <span className={`font-bold text-sm text-right ${getStatusColorClass(editStatus)}`}>
                  {editStatus}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 pt-1.5 border-t border-slate-200/80">
                <span className="text-slate-500 shrink-0">หมายเหตุ:</span>
                <span className="font-medium text-slate-900 text-right break-words">
                  {editRemark.trim() || '-'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdateStatus}
                className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg transition-all cursor-pointer"
              >
                ยืนยันการบันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-emerald-900/10 py-5 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© ระบบจัดเก็บสถิติและปัญหากอไผ่ — สำนักบริหารแรงงานต่างด้าว (สบต.)</p>
          <div className="flex flex-wrap items-center gap-3">
            <span>ฐานข้อมูลจัดเรียงตามชื่อ-นามสกุลผู้รับผิดชอบอัตโนมัติ ({dbRecords.length.toLocaleString()} รายการ)</span>
            <button
              type="button"
              onClick={() => setShowScriptModal(true)}
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              โค้ด Apps Script
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
