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
  ArrowUpRight,
  Calendar,
  MessageSquareText
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

const STAFF_LIST = [
  'นายศุภกิตติ์ บุญแก้ว',
  'นางสาวจีรนันท์ เอกวรรณัง',
  'นางสาวสุภารักษ์ สุทธิ',
  'นายสุเมธ ยิ้มพงษ์',
  'นางสาวภาณุมาศ สาลีนาค',
  'นางสุมาลี รักไทย',
];

const PROBLEM_TYPES = [
  'ข้อมูลแก้ไขข้อมูล',
  'ระบบ eworkpermit',
  'ขอคืนสถานะ',
  'ร้องเรียน/เสนอแนะ',
  'อื่น ๆ',
];

const STATUS_OPTIONS = [
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
  if (THAI_MONTHS.some((m) => dateStr.includes(m))) return dateStr;

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
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
  return dateStr;
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'search'>('dashboard');

  // Preloaded records from the attached CSV database (818 records)
  const [dbRecords, setDbRecords] = useState<CaseRecord[]>([]);
  const [isLoadingCsv, setIsLoadingCsv] = useState(true);

  // Dashboard filter states
  const [dashStaffFilter, setDashStaffFilter] = useState<string>('ALL');
  const [dashStatusFilter, setDashStatusFilter] = useState<string>('ALL');
  const [dashTypeFilter, setDashTypeFilter] = useState<string>('ALL');
  const [dashTableLimit, setDashTableLimit] = useState<number>(15);

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

  // Load the attached 818-row CSV database on mount
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
          setDbRecords(parsed);
        }
      })
      .catch(() => {
        // Fallback silently to online-only search if local CSV unavailable
      })
      .finally(() => {
        if (mounted) setIsLoadingCsv(false);
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

  // Dashboard Computed Analytics
  const filteredDashboardRecords = useMemo(() => {
    return dbRecords.filter((r) => {
      if (dashStaffFilter !== 'ALL' && r.staffName !== dashStaffFilter) return false;
      if (dashStatusFilter !== 'ALL' && r.status !== dashStatusFilter) return false;
      if (dashTypeFilter !== 'ALL' && r.problemType !== dashTypeFilter) return false;
      return true;
    });
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
    STATUS_OPTIONS.forEach((st) => statusMap.set(st, 0));
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
    PROBLEM_TYPES.forEach((pt) => typeMap.set(pt, 0));
    filteredDashboardRecords.forEach((r) => {
      if (r.problemType) {
        typeMap.set(r.problemType, (typeMap.get(r.problemType) || 0) + 1);
      }
    });
    const byType = Array.from(typeMap.entries())
      .filter(([name, count]) => count > 0 || PROBLEM_TYPES.includes(name))
      .map(([name, count]) => ({
        name,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Staff workload matrix
    const staffStatsMap = new Map<
      string,
      { total: number; completed: number; pending: number }
    >();
    STAFF_LIST.forEach((s) => staffStatsMap.set(s, { total: 0, completed: 0, pending: 0 }));

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
        isCurrentTeam: STAFF_LIST.includes(name),
        rateNum: stat.total > 0 ? (stat.completed / stat.total) * 100 : 0,
        rate: stat.total > 0 ? ((stat.completed / stat.total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.total - a.total);

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
  }, [filteredDashboardRecords, dbRecords, dashStatusFilter, dashTypeFilter]);

  const allDistinctStaff = useMemo(() => {
    const set = new Set<string>(STAFF_LIST);
    dbRecords.forEach((r) => {
      if (r.staffName && r.staffName !== '-') set.add(r.staffName);
    });
    return Array.from(set);
  }, [dbRecords]);

  const allDistinctTypes = useMemo(() => {
    const set = new Set<string>(PROBLEM_TYPES);
    dbRecords.forEach((r) => {
      if (r.problemType && r.problemType !== '-') set.add(r.problemType);
    });
    return Array.from(set);
  }, [dbRecords]);

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

  const handleOpenRecordInSearch = (record: CaseRecord) => {
    setSearchDocNumber(record.docNumber);
    setSearchResult(record);
    setEditStatus(record.status);
    setEditRemark(record.remark === '-' ? '' : record.remark);
    const sameDocMatches = dbRecords.filter((r) => r.docNumber === record.docNumber);
    setMatchedList(sameDocMatches.length > 1 ? sameDocMatches : []);
    setNoResultFound(false);
    setNotification(null);
    rememberDocNumber(record.docNumber);
    setActiveTab('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    };

    try {
      const response = await sendJsonp<{ success: boolean; error?: string }>(SCRIPT_URL, formData);
      if (response && response.success) {
        const newRecord: CaseRecord = {
          rowIndex: dbRecords.length + 2,
          ...formData,
          lastUpdate: nowTime,
        };
        setDbRecords((prev) => [newRecord, ...prev]);
        rememberDocNumber(trimmedDoc);
        setNotification({
          type: 'success',
          title: 'บันทึกสำเร็จ!',
          message: `ข้อมูลเลขหนังสือ "${trimmedDoc}" ถูกบันทึกลง Google Sheets เรียบร้อยแล้ว`,
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
      const response = await sendJsonp<{ success: boolean; data?: any; error?: string }>(
        SCRIPT_URL,
        {
          action: 'search',
          docNumber: trimmed,
        }
      );

      if (response && response.success && response.data) {
        const liveRecord: CaseRecord = {
          docNumber: String(response.data.docNumber || trimmed),
          receiveDate: formatThaiDate(String(response.data.receiveDate || '-')),
          staffName: String(response.data.staffName || '-'),
          problemType: String(response.data.problemType || '-'),
          problemDetail: String(response.data.problemDetail || '-'),
          status: String(response.data.status || 'อยู่ระหว่างตรวจสอบข้อมูล'),
          remark: String(response.data.remark || '-'),
          lastUpdate: String(response.data.lastUpdate || getCurrentThaiDateTime()),
        };
        setSearchResult(liveRecord);
        setEditStatus(liveRecord.status);
        setEditRemark(liveRecord.remark === '-' ? '' : liveRecord.remark);
        if (exactMatches.length > 1) {
          setMatchedList(exactMatches);
        }
        setNoResultFound(false);
        rememberDocNumber(liveRecord.docNumber);
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
          prev.map((r) => (r.docNumber === updated.docNumber ? updated : r))
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
          {/* Subtle decorative organic bamboo/geometric SVG background */}
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
                <span>กรมการจัดหางาน</span>
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
                  : 'ค้นหาและแก้ไขสถานะการดำเนินการ'}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
                {activeTab === 'dashboard'
                  ? 'ภาพรวมสถิติการรับเรื่องและสถานะการแก้ไขปัญหาของสำนักบริหารแรงงานต่างด้าว เชื่อมโยงข้อมูลกับ Google Sheets แบบเรียลไทม์'
                  : activeTab === 'add'
                  ? 'กรอกข้อมูลหนังสือรับและรายละเอียดปัญหาเพื่อบันทึกลงใน Google Sheets พร้อมระบบตรวจสอบเลขหนังสือซ้ำอัตโนมัติ'
                  : 'ค้นหาด้วยเลขหนังสือ สบต. หรือคำสำคัญ เพื่อตรวจสอบรายละเอียด อัปเดตสถานะการดำเนินการ และบันทึกหมายเหตุเพิ่มเติม'}
              </p>
            </div>

            {/* 3-Tab Segmented Switcher on Hero */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1.5 p-1.5 bg-emerald-950/60 backdrop-blur-md border border-white/15 rounded-xl shrink-0 self-start lg:self-center">
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
                      <optgroup label="ผู้รับผิดชอบปัจจุบัน (6 ท่าน)">
                        {STAFF_LIST.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="ผู้รับผิดชอบเดิมในฐานข้อมูล">
                        {allDistinctStaff
                          .filter((s) => !STAFF_LIST.includes(s))
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
                      <option value="ALL">สถานะทั้งหมด (7 สถานะ)</option>
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {hasActiveDashFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setDashStaffFilter('ALL');
                      setDashStatusFilter('ALL');
                      setDashTypeFilter('ALL');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer self-start lg:self-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    ล้างตัวกรองทั้งหมด
                  </button>
                )}
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
                    สรุปปริมาณงานแยกตามผู้รับผิดชอบ
                  </h2>
                  <p className="text-xs text-slate-500">
                    คลิกชื่อผู้รับผิดชอบเพื่อกรองดูรายการเคสของเจ้าหน้าที่ท่านนั้น
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

            {/* Filtered Case List Explorer */}
            <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs">
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/70 via-slate-50 to-transparent border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    รายการหนังสือในระบบ ({filteredDashboardRecords.length.toLocaleString()} รายการ)
                  </h2>
                  <p className="text-xs text-slate-500">
                    คลิกปุ่ม "แก้ไข / ดูรายละเอียด" ท้ายแถวเพื่อเปิดแก้ไขสถานะหรือหมายเหตุได้ทันที
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50/60">
                      <th className="py-3 px-6 font-semibold whitespace-nowrap">เลขหนังสือ</th>
                      <th className="py-3 px-4 font-semibold whitespace-nowrap">วันที่รับ</th>
                      <th className="py-3 px-4 font-semibold whitespace-nowrap">ผู้รับผิดชอบ</th>
                      <th className="py-3 px-4 font-semibold whitespace-nowrap">ประเภทปัญหา</th>
                      <th className="py-3 px-4 font-semibold">ปัญหาที่พบ / หมายเหตุ</th>
                      <th className="py-3 px-4 font-semibold whitespace-nowrap">สถานะ</th>
                      <th className="py-3 px-6 font-semibold text-right whitespace-nowrap">
                        การจัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDashboardRecords.slice(0, dashTableLimit).map((item, idx) => (
                      <tr
                        key={`${item.docNumber}-${idx}`}
                        className="hover:bg-emerald-50/30 transition-colors"
                      >
                        <td className="py-3 px-6 font-mono font-bold text-emerald-950 tabular-nums whitespace-nowrap">
                          {item.docNumber}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {item.receiveDate}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-800 whitespace-nowrap">
                          {item.staffName}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                          {item.problemType}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 max-w-xs">
                          <p className="line-clamp-1 font-medium text-slate-900">
                            {item.problemDetail}
                          </p>
                          {item.remark && item.remark !== '-' && (
                            <p className="line-clamp-1 text-slate-500 mt-0.5">
                              หมายเหตุ: {item.remark}
                            </p>
                          )}
                        </td>
                        <td
                          className={`py-3 px-4 text-xs font-semibold whitespace-nowrap ${getStatusColorClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </td>
                        <td className="py-3 px-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenRecordInSearch(item)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                          >
                            แก้ไข / ดูรายละเอียด
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredDashboardRecords.length > dashTableLimit && (
                <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-200 text-center">
                  <button
                    type="button"
                    onClick={() => setDashTableLimit((prev) => prev + 25)}
                    className="px-5 py-2 text-xs font-semibold text-emerald-900 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    แสดงเพิ่มอีก 25 รายการ (แสดงอยู่ {dashTableLimit} จาก{' '}
                    {filteredDashboardRecords.length.toLocaleString()} รายการ)
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* SECTION 1: ADD NEW CASE */}
        {activeTab === 'add' && (
          <section className="bg-white border border-emerald-900/10 rounded-xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-transparent border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-slate-900">แบบฟอร์มบันทึกข้อมูลปัญหาใหม่</h2>
              </div>
              <span className="text-xs text-slate-500">
                ช่องที่มีเครื่องหมาย <span className="text-red-600 font-bold">*</span> จำเป็นต้องกรอก
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
                    {STAFF_LIST.map((person) => (
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
                    {PROBLEM_TYPES.map((type) => (
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
                    {STATUS_OPTIONS.map((st) => (
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
                          {STATUS_OPTIONS.map((st) => (
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
      </main>

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
          <p>ฐานข้อมูลออนไลน์ Google Sheets ({dbRecords.length.toLocaleString()} รายการ)</p>
        </div>
      </footer>
    </div>
  );
}
