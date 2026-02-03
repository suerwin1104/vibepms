
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AccountingService } from './services/AccountingService';
import { supabase } from './supabase';
import { TabType, Room, RoomStatus, Reservation, Staff, Hotel, Building, Guest, Invoice, Transaction, PaymentMethod, RoomNote, Country, AuditLogEntry, BillableItem, ConsumptionItem, DocumentType, Warehouse, InventoryItem, InventoryRecord, Supplier, PurchaseRequisition, PurchaseOrder, GoodsReceipt, GoodsIssue, StockTransfer, PettyCashAccount, PettyCashTransaction, WorkflowDefinition, WorkflowInstance, ApprovalRecord, PendingApproval, Department, SystemRole, ChartOfAccount, JournalEntry, JournalEntryLine, GeneralLedger } from './types';

import { MOCK_STAFF } from './constants';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import RoomGrid from './components/RoomGrid';
import ReservationManagement from './components/ReservationManagement';
import Accounting from './components/Accounting';
import GuestManagement from './components/GuestManagement';
import LoginScreen from './components/LoginScreen';
import Modal from './components/Modal';
import OrderDetailsModal from './components/OrderDetailsModal';
import StaffManagement from './components/StaffManagement';
import RoleManagement from './components/RoleManagement';
import DepartmentManagement from './components/DepartmentManagement';
import HotelManagement from './components/HotelManagement';
import BuildingManagement from './components/BuildingManagement';
import RoomSettings from './components/RoomSettings';
import DatabaseManagement from './components/DatabaseManagement';
import InvoiceReceipt from './components/InvoiceReceipt';
import HandoverManagement from './components/HandoverManagement';
import RoomActionMenu from './components/RoomActionMenu';
import ReservationForm from './components/ReservationForm';
import RoomNoteManager from './components/RoomNoteManager';
import DailyArrivals from './components/DailyArrivals';
import ActivityLog from './components/ActivityLog';
import HousekeepingOps from './components/HousekeepingOps';
import DocumentTypeSettings from './components/DocumentTypeSettings';
import InventoryManagement from './components/InventoryManagement';
import ProcurementManagement from './components/ProcurementManagement';
import GoodsManagement from './components/GoodsManagement';
import StockTransferManagement from './components/StockTransferManagement';
import PettyCashManagement from './components/PettyCashManagement';
import { WorkflowService } from './services/WorkflowService';
import WorkflowManagement from './components/WorkflowManagement';
import DocumentSearch from './components/DocumentSearch';
import InvoiceSequenceManagement from './components/InvoiceSequenceManagement';
import { Housekeeper } from './types';
import { realtimeService, RealtimeConnectionStatus, TableName } from './services/RealtimeService';
import RealtimeIndicator from './components/RealtimeIndicator';
import MissionControl from './components/MissionControl';


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('Dashboard');

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roomNotes, setRoomNotes] = useState<RoomNote[]>([]);
  const [billableItems, setBillableItems] = useState<BillableItem[]>([]);
  const [consumptionItems, setConsumptionItems] = useState<ConsumptionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [housekeepers, setHousekeepers] = useState<Housekeeper[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<any[]>([]);

  // 進銷存與採購系統 State
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseRequisitions, setPurchaseRequisitions] = useState<PurchaseRequisition[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [goodsIssues, setGoodsIssues] = useState<GoodsIssue[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [pettyCashAccounts, setPettyCashAccounts] = useState<PettyCashAccount[]>([]);
  const [pettyCashTransactions, setPettyCashTransactions] = useState<PettyCashTransaction[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]); // Added
  const [workflowDefinitions, setWorkflowDefinitions] = useState<WorkflowDefinition[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<WorkflowInstance[]>([]);
  const [approvalRecords, setApprovalRecords] = useState<ApprovalRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);

  // 會計系統 State
  const defaultAccounts: ChartOfAccount[] = [
    { id: 'acc-1101', code: '1101', name: '現金', type: 'Asset', level: 1, isActive: true, normalBalance: 'Debit' },
    { id: 'acc-1102', code: '1102', name: '銀行存款', type: 'Asset', level: 1, isActive: true, normalBalance: 'Debit' },
    { id: 'acc-1103', code: '1103', name: '零用金', type: 'Asset', level: 1, isActive: true, normalBalance: 'Debit' },
    { id: 'acc-1201', code: '1201', name: '應收帳款', type: 'Asset', level: 1, isActive: true, normalBalance: 'Debit' },
    { id: 'acc-1301', code: '1301', name: '存貨', type: 'Asset', level: 1, isActive: true, normalBalance: 'Debit' },
    { id: 'acc-2101', code: '2101', name: '應付帳款', type: 'Liability', level: 1, isActive: true, normalBalance: 'Credit' },
    { id: 'acc-2102', code: '2102', name: '應付費用', type: 'Liability', level: 1, isActive: true, normalBalance: 'Credit' },
    { id: 'acc-3101', code: '3101', name: '股本', type: 'Equity', level: 1, isActive: true, normalBalance: 'Credit' },
    { id: 'acc-3201', code: '3201', name: '保留盈餘', type: 'Equity', level: 1, isActive: true, normalBalance: 'Credit' },
    { id: 'acc-4101', code: '4101', name: '房租收入', type: 'Revenue', level: 1, isActive: true, normalBalance: 'Credit' },
    { id: 'acc-4102', code: '4102', name: '餐飲收入', type: 'Revenue', level: 1, isActive: true, normalBalance: 'Credit' },
    { id: 'acc-4103', code: '4103', name: '其他營業收入', type: 'Revenue', level: 1, isActive: true, normalBalance: 'Credit' },
    { id: 'acc-5101', code: '5101', name: '薪資費用', type: 'Expense', level: 1, isActive: true, normalBalance: 'Debit' },
    { id: 'acc-5102', code: '5102', name: '水電費', type: 'Expense', level: 1, isActive: true, normalBalance: 'Debit' },
    { id: 'acc-5103', code: '5103', name: '維修費', type: 'Expense', level: 1, isActive: true, normalBalance: 'Debit' },
    { id: 'acc-5104', code: '5104', name: '清潔費', type: 'Expense', level: 1, isActive: true, normalBalance: 'Debit' },
    { id: 'acc-6101', code: '6101', name: '進貨成本', type: 'Expense', level: 1, isActive: true, normalBalance: 'Debit' },
    { id: 'acc-6102', code: '6102', name: '耗材費用', type: 'Expense', level: 1, isActive: true, normalBalance: 'Debit' },
  ];
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(defaultAccounts);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [generalLedgers, setGeneralLedgers] = useState<GeneralLedger[]>([]);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedOldReservation, setSelectedOldReservation] = useState<Reservation | null>(null);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isResFormOpen, setIsResFormOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isCheckoutVerifying, setIsCheckoutVerifying] = useState(false);
  const [resFormMode, setResFormMode] = useState<'CheckIn' | 'Stay' | 'Rest'>('Stay');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // 即時更新狀態
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [recentlyUpdatedRooms, setRecentlyUpdatedRooms] = useState<Set<string>>(new Set());
  const [recentlyUpdatedWorkflows, setRecentlyUpdatedWorkflows] = useState<Set<string>>(new Set());

  // Scroll to top when tab changes
  useEffect(() => {
    // Immediate reset
    if (mainContentRef.current) mainContentRef.current.scrollTop = 0;
    window.scrollTo(0, 0);

    // Delayed reset to handle layout shifts or async rendering
    requestAnimationFrame(() => {
      if (mainContentRef.current) mainContentRef.current.scrollTop = 0;
      window.scrollTo(0, 0);
    });
  }, [activeTab]);

  // 列印配置狀態
  const [printConfig, setPrintConfig] = useState<{
    invoice: Invoice;
    hotel: Hotel;
    reservation?: Reservation;
    guest?: Guest;
    layout: 'A4' | 'POS'
  } | null>(null);

  // 核心列印排程器：修復「開發票後 POS 與 A4 按鈕沒有反映」
  useEffect(() => {
    if (printConfig) {
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              window.focus();
              window.print();
            } catch (e) {
              console.error("Print Error:", e);
            } finally {
              // 稍微延遲重置，確保列印對話框彈出時 DOM 還在
              setTimeout(() => setPrintConfig(null), 1000);
            }
          });
        });
      }, 0);
    }
  }, [printConfig]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const { data: hData } = await supabase.from('hotels').select('*');
      setHotels((hData || []).map(h => ({
        id: h.id,
        name: h.name,
        code: h.code,
        address: h.address,
        phone: h.phone,
        checkoutTime: h.checkout_time || '11:00',
        checkinTime: h.checkin_time || '15:00',
        lateFeeThresholdHours: h.late_fee_threshold_hours || 6
      })));

      const [bRes, rRes, resRes, gRes, txRes, sRes, invRes, cntRes, auditRes, billItemRes, _consumeItemsRes, suppliersRes, warehousesRes, invItemsRes, docTypesRes, prRes, poRes, invRecordsRes, grRes, giRes, stRes, deptRes, rolesRes, jeRes, glRes, coaRes] = await Promise.all([
        supabase.from('buildings').select('*'),
        supabase.from('rooms').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('guests').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('staff').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('countries').select('*').order('sort_order', { ascending: true }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50),
        supabase.from('billable_items').select('*'),
        supabase.from('consumption_items').select('*').eq('is_active', true),
        supabase.from('suppliers').select('*'),
        supabase.from('warehouses').select('*'),
        supabase.from('inventory_items').select('*'),
        supabase.from('document_types').select('*'),
        supabase.from('purchase_requisitions').select('*'),
        supabase.from('purchase_orders').select('*'),
        supabase.from('inventory_records').select('*'),
        supabase.from('goods_receipts').select('*'),
        supabase.from('goods_issues').select('*'),
        supabase.from('stock_transfers').select('*'),
        supabase.from('departments').select('*'),
        supabase.from('system_roles').select('*'),
        supabase.from('journal_entries').select('*, lines:journal_entry_lines(*, account:chart_of_accounts(code, name))').order('entry_date', { ascending: false }),
        supabase.from('general_ledgers').select('*'),
        supabase.from('chart_of_accounts').select('*')
      ]);

      if (bRes.error) console.error('Buildings error:', bRes.error);
      if (rRes.error) console.error('Rooms error:', rRes.error);
      if (resRes.error) console.error('Reservations error:', resRes.error);
      if (gRes.error) console.error('Guests error:', gRes.error);
      if (txRes.error) console.error('Transactions error:', txRes.error);
      if (billItemRes.error) console.error('BillableItems error:', billItemRes.error);

      if (coaRes.data && coaRes.data.length > 0) {
        setChartOfAccounts(coaRes.data.map(a => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          level: a.level,
          isActive: a.is_active,
          normalBalance: a.normal_balance
        })));
      } else {


        console.warn('Warning: No Chart of Accounts found in database. Please seed the database manually.');


      }



      // Populate Accounting State
      if (jeRes.data) {
        setJournalEntries(jeRes.data.map(je => ({
          id: je.id,
          entryNumber: je.entry_number, // map snake_case
          hotelId: je.hotel_id,
          entryDate: je.entry_date,
          postingDate: je.posting_date,
          period: je.period,
          status: je.status,
          description: je.description,
          totalDebit: je.total_debit,
          totalCredit: je.total_credit,
          sourceType: je.source_type,
          sourceId: je.source_id,
          createdBy: je.created_by,
          approvedBy: je.approved_by,
          createdAt: je.created_at,
          lines: je.lines?.map((l: any) => ({
            id: l.id,
            entryId: l.entry_id,
            lineNumber: l.line_number,
            accountId: l.account_id,
            accountCode: l.account?.code,
            accountName: l.account?.name,
            debitAmount: l.debit_amount,
            creditAmount: l.credit_amount,
            description: l.description,
            createdAt: l.created_at
          })) || []
        })));
      }

      if (glRes.data) {
        setGeneralLedgers(glRes.data.map(gl => ({
          id: gl.id,
          hotelId: gl.hotel_id,
          accountId: gl.account_id,
          period: gl.period,
          openingBalance: gl.opening_balance,
          totalDebit: gl.total_debit,
          totalCredit: gl.total_credit,
          closingBalance: gl.closing_balance,
          updatedAt: gl.updated_at
        })));
      }
      const consumeRes = txRes; // Placeholder if using index but Promise.all is safer as objects
      // Re-map to ensure we get the last one
      const consumeItemsRes = txRes; // Correcting: Promise.all returns results in order


      if (cntRes.data) {
        setCountries(cntRes.data.map(c => ({
          code: c.code, name_en: c.name_en, name_zh: c.name_zh, sort_order: c.sort_order
        })));
      }

      if (deptRes.data) {
        setDepartments(deptRes.data.map(d => ({
          id: d.id,
          name: d.name,
          code: d.code,
          managerId: d.manager_id,
          parentId: d.parent_id,
          createdAt: d.created_at
        })));
      }

      // 載入系統角色
      if (rolesRes.data && rolesRes.data.length > 0) {
        setSystemRoles(rolesRes.data.map(r => ({
          id: r.id,
          code: r.code,
          name: r.name,
          description: r.description,
          level: r.level,
          isSystem: r.is_system,
          permissions: r.permissions,
          createdAt: r.created_at
        })));
      } else {
        // 如果資料庫沒有角色，使用預設角色（僅供 UI 顯示，建議執行 SQL 腳本建立正式資料）
        const defaultRoles: SystemRole[] = [
          { id: crypto.randomUUID(), code: 'GroupAdmin', name: '集團總管', level: 10, isSystem: true },
          { id: crypto.randomUUID(), code: 'HotelAdmin', name: '分店經理', level: 20, isSystem: true },
          { id: crypto.randomUUID(), code: 'DepartmentManager', name: '部門經理', level: 30, isSystem: true },
          { id: crypto.randomUUID(), code: 'GeneralManager', name: '總經理', level: 15, isSystem: true },
          { id: crypto.randomUUID(), code: 'Finance', name: '財務人員', level: 40, isSystem: true },
          { id: crypto.randomUUID(), code: 'FrontDesk', name: '櫃檯人員', level: 50, isSystem: true }
        ];
        setSystemRoles(defaultRoles);
        console.log('[App] Using default system roles (database table may not exist)');
      }

      setCountries(cntRes.data || []);
      setAuditLogs((auditRes.data || []).map(l => ({
        id: l.id,
        timestamp: l.timestamp,
        action: l.action,
        staffName: l.staff_name,
        staff: l.staff_name, // Map legacy field if needed
        hotel: l.hotel_id, // Assuming hotel_id is stored
        impact: l.impact
      })));

      setBillableItems((billItemRes.data || []).map(b => ({
        id: b.id,
        reservationId: b.reservation_id,
        description: b.description,
        amount: b.amount,
        quantity: b.quantity,
        paymentMethod: b.payment_method, // Added in recent migrations
        note: b.note, // 新增：消費個別備註
        createdAt: b.created_at,
        createdBy: b.created_by
      })));

      const cItemsRes = await supabase.from('consumption_items').select('*').eq('is_active', true);
      setConsumptionItems(cItemsRes.data || []);

      setBuildings((bRes.data || []).map(b => ({
        id: b.id,
        hotelId: b.hotel_id,
        name: b.name,
        code: b.code
      })));
      setStaff((sRes.data || []).map(s => ({
        id: s.id,
        hotelId: s.hotel_id,
        employeeId: s.employee_id,
        name: s.name,
        role: s.role,
        title: s.title,
        authorizedHotels: s.authorized_hotels || [],
        email: s.email,
        lineId: s.line_id,
        telegramId: s.telegram_id,
        wechatId: s.wechat_id,
        departmentId: s.department_id,
        supervisorId: s.supervisor_id,
        delegateId: s.delegate_id
      })));
      setRooms((rRes.data || []).map(r => ({
        id: r.id,
        hotelId: r.hotel_id,
        buildingId: r.building_id,
        number: r.number,
        type: r.type,
        status: r.status,
        floor: r.floor,
        housekeeper: r.housekeeper || '未指派',
        basePrice: r.base_price,
        lateFeePerHour: r.late_fee_per_hour || 0,
        lateFeePerDay: r.late_fee_per_day || 0,
        description: r.description || ''
      })));
      setReservations((resRes.data || []).map(r => ({
        id: r.id,
        hotelId: r.hotel_id,
        buildingId: r.building_id,
        guestId: r.guest_id,
        guestName: r.guest_name,
        phone: r.phone || '',
        idNumber: r.id_number,
        checkIn: r.check_in,
        checkOut: r.check_out,
        roomNumber: r.room_number,
        roomType: r.room_type,
        status: r.status,
        source: r.source || '未知',
        totalPrice: r.total_price,
        paidAmount: r.paid_amount,
        lastEditedBy: r.last_edited_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at, // Map updatedAt
        discount: r.discount || 0,
        note: r.note || '',
        // Mapped Legacy Fields
        licensePlate: r.license_plate,
        companyName: r.company_name,
        bookingAgent: r.booking_agent,
        depositAmount: r.deposit_amount,
        roomRent: r.room_rent,
        extraItems: r.extra_items,
        addBed: r.add_bed,
        paymentMethod: r.payment_method,
        creditCard: r.credit_card,
        // Mapped Pet Fields
        petType: r.pet_type,
        petCount: r.pet_count,
        petNote: r.pet_note
      })));
      setGuests((gRes.data || []).map(g => ({
        id: g.id,
        name: g.name,
        idNumber: g.id_number,
        phone: g.phone || '',
        vipLevel: g.vip_level || 'Normal',
        isBlacklisted: g.is_blacklisted || false,
        preferences: g.preferences || '',
        gender: g.gender || 'Other',
        nationality: g.nationality || '',
        blacklistReason: g.blacklist_reason,
        modificationLogs: g.modification_logs || [],
        taxId: g.tax_id,
        companyName: g.company_name,
        // 身分證件照片
        idCardFront: g.id_card_front,
        idCardBack: g.id_card_back,
        healthInsuranceCard: g.health_insurance_card,
        passportOrPermit: g.passport_or_permit
      })));

      // Mock Data for Petty Cash (Test Data) - 為所有飯店建立測試資料
      let currentPettyCashAccounts = pettyCashAccounts;
      let currentPettyCashTransactions = pettyCashTransactions;

      if (pettyCashAccounts.length === 0 && hotels.length > 0) {
        // 為每個飯店建立零用金帳戶
        const mockAccounts: PettyCashAccount[] = [];
        hotels.forEach((hotel, idx) => {
          mockAccounts.push(
            { id: `pca-${hotel.id}-001`, hotelId: hotel.id, accountName: '櫃檯零用金 (Front Desk)', balance: 5000 + idx * 1000, creditLimit: 10000, isActive: true, custodianName: '陳經理', createdAt: new Date().toISOString() },
            { id: `pca-${hotel.id}-002`, hotelId: hotel.id, accountName: '房務零用金 (Housekeeping)', balance: 2000 + idx * 500, creditLimit: 5000, isActive: true, custodianName: '林房務', createdAt: new Date().toISOString() },
            { id: `pca-${hotel.id}-003`, hotelId: hotel.id, accountName: '行政零用金 (Admin)', balance: 15000 + idx * 2000, creditLimit: 50000, isActive: true, custodianName: '王會計', createdAt: new Date().toISOString() },
            { id: `pca-${hotel.id}-004`, hotelId: hotel.id, accountName: '餐飲部零用金 (F&B)', balance: 3000 + idx * 800, creditLimit: 8000, isActive: true, custodianName: '張主廚', createdAt: new Date().toISOString() },
          );
        });
        setPettyCashAccounts(mockAccounts);
        currentPettyCashAccounts = mockAccounts;

        // 為第一個飯店建立範例交易
        const firstHotelId = hotels[0]?.id || selectedHotelId;
        const mockTransactions: PettyCashTransaction[] = [
          { id: 'ctx-001', accountId: `pca-${firstHotelId}-001`, transactionNumber: 'PC-20231225-01', transactionDate: '2023-12-25', transactionType: 'REPLENISH', amount: 5000, balanceAfter: 5000, description: '月初撥補', handlerName: '王會計', status: 'Approved' },
          { id: 'ctx-002', accountId: `pca-${firstHotelId}-001`, transactionNumber: 'PC-20231226-01', transactionDate: '2023-12-26', transactionType: 'EXPENSE', amount: 150, balanceAfter: 4850, description: '購買原子筆', expenseCategory: '文具用品', handlerName: '陳經理', status: 'Approved' },
          { id: 'ctx-003', accountId: `pca-${firstHotelId}-002`, transactionNumber: 'PC-20231226-02', transactionDate: '2023-12-26', transactionType: 'EXPENSE', amount: 500, balanceAfter: 1500, description: '購買清潔劑', expenseCategory: '清潔用品', handlerName: '林房務', status: 'Approved' },
          { id: 'ctx-004', accountId: `pca-${firstHotelId}-003`, transactionNumber: 'PC-20231227-01', transactionDate: '2023-12-27', transactionType: 'EXPENSE', amount: 1200, balanceAfter: 13800, description: '計程車資 (拜訪客戶)', expenseCategory: '差旅費', handlerName: '王會計', status: 'Approved' },
          { id: 'ctx-005', accountId: `pca-${firstHotelId}-001`, transactionNumber: 'PC-20231228-01', transactionDate: '2023-12-28', transactionType: 'EXPENSE', amount: 300, balanceAfter: 4550, description: '下午茶點心', expenseCategory: '交際費', handlerName: '陳經理', status: 'Pending' },
          { id: 'ctx-006', accountId: `pca-${firstHotelId}-004`, transactionNumber: 'PC-20231228-02', transactionDate: '2023-12-28', transactionType: 'EXPENSE', amount: 2500, balanceAfter: 500, description: '臨時採購食材', expenseCategory: '食材成本', handlerName: '張主廚', status: 'Approved' },
          { id: 'ctx-007', accountId: `pca-${firstHotelId}-004`, transactionNumber: 'PC-20231229-01', transactionDate: '2023-12-29', transactionType: 'REPLENISH', amount: 5000, balanceAfter: 5500, description: '緊急撥補', handlerName: '王會計', status: 'Pending' },
        ];
        setPettyCashTransactions(mockTransactions);
        currentPettyCashTransactions = mockTransactions;
      }

      setTransactions((txRes.data || []).map(t => ({
        id: t.id,
        hotelId: t.hotel_id,
        reservationId: t.reservation_id,
        amount: t.amount,
        type: t.type,
        method: t.method,
        description: t.description || '',
        createdAt: t.created_at,
        staffName: t.staff_name
      })));
      setInvoices((invRes.data || []).map(i => ({
        id: i.id,
        hotelId: i.hotel_id,
        reservationId: i.reservation_id,
        invoiceNumber: i.invoice_number,
        amount: i.amount,
        tax: i.tax,
        netAmount: i.net_amount,
        status: i.status,
        createdAt: i.created_at,
        createdBy: i.created_by
      })));

      // 載入供應商
      setSuppliers((suppliersRes.data || []).map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        contactPerson: s.contact_person,
        phone: s.phone,
        email: s.email,
        address: s.address,
        taxId: s.tax_id,
        paymentTerms: s.payment_terms,
        bankAccount: s.bank_account,
        bankName: s.bank_name,
        notes: s.notes,
        isActive: s.is_active
      })));

      // 載入倉庫
      setWarehouses((warehousesRes.data || []).map(w => ({
        id: w.id,
        hotelId: w.hotel_id,
        code: w.code,
        name: w.name,
        location: w.location,
        managerId: w.manager_id,
        managerName: w.manager_name,
        isActive: w.is_active
      })));

      // 載入庫存品項
      setInventoryItems((invItemsRes.data || []).map(i => ({
        id: i.id,
        code: i.code,
        name: i.name,
        category: i.category,
        unit: i.unit,
        specification: i.specification,
        barcode: i.barcode,
        safetyStock: i.safety_stock,
        reorderPoint: i.reorder_point,
        defaultSupplierId: i.default_supplier_id,
        defaultUnitPrice: i.default_unit_price,
        accountingCode: i.accounting_code,
        isActive: i.is_active
      })));

      // 載入文件類型
      setDocumentTypes((docTypesRes.data || []).map(dt => ({
        id: dt.id || '',
        code: dt.code || '',
        name: dt.name || '',
        category: dt.category || '',
        description: dt.description || '',
        isActive: dt.is_active || false
      })));

      // 載入請購單
      setPurchaseRequisitions((prRes.data || []).map(pr => ({
        id: pr.id || '',
        prNumber: pr.pr_number || '',
        hotelId: pr.hotel_id || '',
        documentTypeId: pr.document_type_id || '',
        requesterId: pr.requester_id || '',
        requesterName: pr.requester_name || '',
        department: pr.department || '',
        requestDate: pr.request_date || '',
        requiredDate: pr.required_date || '',
        status: pr.status || 'Draft',
        priority: pr.priority || 'Normal',
        totalAmount: pr.total_amount || 0,
        notes: pr.notes || ''
      })));

      // 載入採購單
      setPurchaseOrders((poRes.data || []).map(po => ({
        id: po.id || '',
        poNumber: po.po_number || '',
        hotelId: po.hotel_id || '',
        documentTypeId: po.document_type_id || '',
        prId: po.pr_id || '',
        supplierId: po.supplier_id || '',
        supplierName: po.supplier_name || '',
        buyerId: po.buyer_id || '',
        buyerName: po.buyer_name || '',
        orderDate: po.order_date || '',
        expectedDeliveryDate: po.expected_delivery_date || '',
        status: po.status || 'Draft',
        priority: po.priority || 'Normal',
        subtotal: po.subtotal || 0,
        taxRate: po.tax_rate || 0,
        taxAmount: po.tax_amount || 0,
        totalAmount: po.total_amount || 0,
        paymentTerms: po.payment_terms || '',
        notes: po.notes || ''
      })));

      // 載入庫存記錄
      if (invRecordsRes.data) {
        setInventoryRecords(invRecordsRes.data.map(r => ({
          id: r.id,
          warehouseId: r.warehouse_id || '',
          itemId: r.item_id || '',
          quantity: r.quantity || 0,
          reservedQuantity: r.reserved_quantity || 0,
          lastReceiptDate: r.last_receipt_date || '',
          lastIssueDate: r.last_issue_date || '',
          createdAt: r.created_at || '',
          updatedAt: r.updated_at || ''
        })));
      }

      if (grRes.data) {
        setGoodsReceipts(grRes.data.map(g => ({
          id: g.id,
          grNumber: g.gr_number || '',
          hotelId: g.hotel_id || '',
          documentTypeId: g.document_type_id || '',
          poId: g.po_id || undefined,
          warehouseId: g.warehouse_id || '',
          supplierId: g.supplier_id || undefined,
          supplierName: g.supplier_name || '',
          receiptDate: g.receipt_date || '',
          receiverId: g.receiver_id || '',
          receiverName: g.receiver_name || '',
          status: g.status || 'Draft',
          totalAmount: g.total_amount || 0,
          invoiceNumber: g.invoice_number || '',
          notes: g.notes || '',
          createdAt: g.created_at || '',
          updatedAt: g.updated_at || ''
        })));
      }

      if (giRes.data) {
        setGoodsIssues(giRes.data.map(g => ({
          id: g.id,
          giNumber: g.gi_number || '',
          hotelId: g.hotel_id || '',
          documentTypeId: g.document_type_id || '',
          warehouseId: g.warehouse_id || '',
          issueDate: g.issue_date || '',
          issuerId: g.issuer_id || '',
          issuerName: g.issuer_name || '',
          requesterId: g.requester_id || '',
          requesterName: g.requester_name || '',
          department: g.department || '',
          purpose: g.purpose || '',
          status: g.status || 'Draft',
          totalAmount: g.total_amount || 0,
          notes: g.notes || '',
          createdAt: g.created_at || '',
          updatedAt: g.updated_at || ''
        })));
      }

      if (stRes.data) {
        setStockTransfers(stRes.data.map(st => ({
          id: st.id,
          stNumber: st.st_number || '',
          documentTypeId: st.document_type_id || '',
          fromHotelId: st.from_hotel_id || '',
          fromWarehouseId: st.from_warehouse_id || '',
          toHotelId: st.to_hotel_id || '',
          toWarehouseId: st.to_warehouse_id || '',
          transferDate: st.transfer_date || '',
          requesterId: st.requester_id || '',
          requesterName: st.requester_name || '',
          status: st.status || 'Draft',
          priority: st.priority || 'Normal',
          reason: st.reason || '',
          totalAmount: st.total_amount || 0,
          notes: st.notes || '',
          createdAt: st.created_at || '',
          updatedAt: st.updated_at || ''
        })));
      }

      // 抓取房間註記
      const { data: noteRes } = await supabase.from('room_notes').select('*').eq('hotel_id', selectedHotelId).order('created_at', { ascending: false });
      if (noteRes) setRoomNotes(noteRes.map(n => ({
        id: n.id,
        roomId: n.room_id,
        hotelId: n.hotel_id,
        content: n.content,
        staffName: n.staff_name,
        createdAt: n.created_at
      })));

      // 新增：抓取房務員資料
      const { data: hkRes } = await supabase.from('housekeepers').select('*');
      if (hkRes) setHousekeepers(hkRes.map(h => ({
        id: h.id,
        hotelId: h.hotel_id,
        employeeId: h.employee_id,
        name: h.name,
        phone: h.phone || '',
        status: h.status,
        assignedFloor: h.assigned_floor || '',
        cleanedToday: h.cleaned_today || 0
      })));

      // 新增：抓取今日清掃任務
      const today = new Date().toISOString().split('T')[0];
      const { data: ctRes } = await supabase.from('daily_cleaning_tasks').select('*').eq('task_date', today);
      if (ctRes) setCleaningTasks(ctRes.map(t => ({
        id: t.id,
        hotelId: t.hotel_id,
        roomId: t.room_id,
        roomNumber: t.room_number,
        taskDate: t.task_date,
        taskType: t.task_type,
        priority: t.priority,
        status: t.status,
        housekeeperId: t.housekeeper_id,
        housekeeperName: t.housekeeper_name,
        assignedAt: t.assigned_at,
        startedAt: t.started_at,
        completedAt: t.completed_at,
        notes: t.notes,
        exceptions: t.exceptions
      })));

      // Workflow Data
      const { data: wfDefs } = await supabase.from('workflow_definitions').select('*, steps:workflow_steps(*)');
      if (wfDefs) {
        let definitions = wfDefs as any[];
        // Mock Petty Cash Workflow if missing - INSERT TO DB so WorkflowService can find it
        if (!definitions.some(d => d.document_category === 'PETTY_CASH')) {
          const pcWorkflowId = 'wf-pc-001';
          const pcStepId = 'step-pc-01';

          // Insert workflow definition
          await supabase.from('workflow_definitions').insert({
            id: pcWorkflowId,
            name: '一般零用金簽核流程',
            code: 'WF-PC-STD',
            document_category: 'PETTY_CASH',
            is_active: true
          });

          // Insert workflow step
          await supabase.from('workflow_steps').insert({
            id: pcStepId,
            workflow_id: pcWorkflowId,
            step_sequence: 1,
            step_name: '直屬主管審核',
            approval_type: 'Serial',
            approver_role: 'DirectSupervisor',
            required_approvals: 1,
            can_skip: false,
            timeout_hours: 24
          });

          // Re-fetch to get the inserted data
          const { data: updatedDefs } = await supabase.from('workflow_definitions').select('*, steps:workflow_steps(*)');
          if (updatedDefs) {
            definitions = updatedDefs;
          }
        }
        // 正確映射 snake_case 到 camelCase
        const mappedDefinitions = definitions.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          documentCategory: d.document_category,
          description: d.description,
          isActive: d.is_active,
          createdAt: d.created_at,
          steps: (d.steps || []).map((s: any) => ({
            id: s.id,
            workflowId: s.workflow_id,
            stepSequence: s.step_sequence,
            stepName: s.step_name,
            approvalType: s.approval_type || 'Serial',
            approverRole: s.approver_role || 'HotelAdmin',
            approverIds: s.approver_ids,
            requiredApprovals: s.required_approvals || 1,
            canSkip: s.can_skip || false,
            skipCondition: s.skip_condition,
            timeoutHours: s.timeout_hours || 24,
            createdAt: s.created_at
          }))
        }));
        setWorkflowDefinitions(mappedDefinitions);
      }

      const { data: wfInsts } = await supabase.from('workflow_instances').select('*, definition:workflow_definitions(*, steps:workflow_steps(*))');
      if (wfInsts) {
        setWorkflowInstances(wfInsts.map((i: any) => ({
          id: i.id,
          workflowId: i.workflow_id,
          workflowName: i.definition?.name,
          documentId: i.document_id,
          documentType: i.document_type,
          documentNumber: i.document_number,
          currentStep: i.current_step,
          status: i.status,
          initiatedBy: i.initiated_by,
          initiatedAt: i.initiated_at,
          completedAt: i.completed_at,
          notes: i.notes
        })));

        // Calculate Pending Approvals
        const pendings = wfInsts.filter((i: any) => {
          if (i.status !== 'Pending') return false;

          // Visibility Filter
          if (!currentUser) {
            console.log('[Filter] No currentUser');
            return false;
          }
          console.log(`[Filter] Checking ${i.document_number}: assigned_to=${i.assigned_to}, currentUser.id=${currentUser.id}, currentUser.name=${currentUser.name}`);

          // 1. Check if assigned directly
          if (i.assigned_to === currentUser.id) {
            console.log(`[Filter] MATCHED: assigned_to === currentUser.id`);
            return true;
          }

          // Self-Approval Check: Prevent requester from approving their own doc
          let requesterId = '';
          if (i.document_type === 'PURCHASE_REQUISITION') {
            const doc = prRes.data?.find((d: any) => d.id === i.document_id);
            requesterId = doc?.requester_id;
          } else if (i.document_type === 'PURCHASE_ORDER') {
            const doc = poRes.data?.find((d: any) => d.id === i.document_id);
            requesterId = doc?.buyer_id;
          } else if (i.document_type === 'GOODS_ISSUE') {
            const doc = giRes.data?.find((d: any) => d.id === i.document_id);
            requesterId = doc?.requester_id || doc?.issuer_id;
          } else if (i.document_type === 'STOCK_TRANSFER') {
            const doc = stRes.data?.find((d: any) => d.id === i.document_id);
            requesterId = doc?.requester_id;
          } else if (i.document_type === 'PETTY_CASH') {
            if (typeof currentPettyCashTransactions !== 'undefined' && Array.isArray(currentPettyCashTransactions)) {
              const doc = currentPettyCashTransactions.find((d: any) => d.id === i.document_id);
              requesterId = doc?.handlerId || (doc as any)?.handler_id;
            }
          }

          if (requesterId && requesterId === currentUser.id) {
            console.log(`[Filter] Self-Approval Prohibited for ${i.document_number}`);
            return false;
          }

          // 2. Check current step definition
          const currentStepDef = i.definition?.steps?.find((s: any) => s.step_sequence === i.current_step);
          if (!currentStepDef) {
            console.log('[Filter] No step def');
            return false;
          }



          // 3. Check role
          if (currentStepDef.approver_role && currentUser.role === currentStepDef.approver_role) {
            // console.log(`[Filter] Role Match: ${currentStepDef.approver_role}`);
            return true;
          }



          // 4. Check IDs list
          if (currentStepDef.approver_ids && currentStepDef.approver_ids.includes(currentUser.id)) return true;

          console.log(`[Filter] BLOCKED: ${i.document_number}. StepRole: ${currentStepDef.approver_role}, UserRole: ${currentUser.role}`);
          return false;
        }).map((i: any) => {
          const currentStepDef = i.definition?.steps?.find((s: any) => s.step_sequence === i.current_step);
          // Fetch Amount and Priority from original document
          let amount = 0;
          let priority = 'Normal';
          let requesterName = i.initiated_by;

          if (i.document_type === 'PURCHASE_REQUISITION') {
            const doc = prRes.data?.find((d: any) => d.id === i.document_id);
            if (doc) {
              amount = doc.total_amount || 0;
              priority = doc.priority || 'Normal';
              requesterName = doc.requester_name || i.initiated_by;
            }
          } else if (i.document_type === 'PURCHASE_ORDER') {
            const doc = poRes.data?.find((d: any) => d.id === i.document_id);
            amount = doc?.total_amount || 0;
          } else if (i.document_type === 'GOODS_RECEIPT') {
            const doc = grRes.data?.find((d: any) => d.id === i.document_id);
            amount = doc?.total_amount || 0;
          } else if (i.document_type === 'GOODS_ISSUE') {
            const doc = giRes.data?.find((d: any) => d.id === i.document_id);
            amount = doc?.total_amount || 0;
          } else if (i.document_type === 'STOCK_TRANSFER') {
            const doc = stRes.data?.find((d: any) => d.id === i.document_id);
            if (doc) {
              amount = doc.total_amount || 0;
              priority = doc.priority || 'Normal';
              requesterName = doc.requester_name || i.initiated_by;
            }
          } else if (i.document_type === 'PETTY_CASH') {
            // For Petty Cash, check transactions
            if (typeof currentPettyCashTransactions !== 'undefined' && Array.isArray(currentPettyCashTransactions)) {
              const doc = currentPettyCashTransactions.find((d: any) => d.id === i.document_id);
              amount = doc?.amount || 0;
            }
          }

          return {
            workflowInstanceId: i.id,
            documentId: i.document_id,
            documentType: i.document_type,
            documentNumber: i.document_number,
            requesterId: '', // Ideally fetch from doc
            requesterName: requesterName,
            requestedAt: i.initiated_at,
            currentStepName: currentStepDef?.step_name || `步驟 ${i.current_step}`,
            priority: priority,
            amount: amount // Fetched from doc
          };
        });
        setPendingApprovals(pendings);
      }

      const { data: approvalRecs } = await supabase.from('approval_records').select('*').order('acted_at', { ascending: false });
      if (approvalRecs) setApprovalRecords(approvalRecs.map((r: any) => ({
        id: r.id,
        workflowInstanceId: r.workflow_instance_id,
        stepId: r.step_id,
        stepSequence: r.step_sequence,
        stepName: r.step_name,
        approverId: r.approver_id,
        approverName: r.approver_name,
        action: r.action,
        comments: r.comments,
        actedAt: r.acted_at
      })));

    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [selectedHotelId]);

  // Global Lock for Save Operations to prevent double submission
  const isSavingRef = useRef(false);

  // 即時更新訂閱
  useEffect(() => {
    if (!selectedHotelId) return;

    console.log('[Realtime] Initializing realtime subscriptions...');

    // 初始化 Realtime 服務
    realtimeService.initialize(selectedHotelId);

    // 訂閱連線狀態變更
    const unsubStatus = realtimeService.onStatusChange((status) => {
      console.log('[Realtime] Status changed:', status);
      setRealtimeStatus(status);
    });

    // 訂閱同步時間變更
    const unsubSync = realtimeService.onSyncTimeChange((time) => {
      setLastSyncTime(time);
    });

    // 訂閱房間變更
    const roomSubId = realtimeService.subscribe<Room>('rooms', (payload) => {
      console.log('[Realtime] Room change:', payload.eventType, payload.new);

      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const newRoom: any = payload.new;
        setRooms(prev => {
          const exists = prev.find(r => r.id === newRoom.id);
          if (exists) {
            return prev.map(r => r.id === newRoom.id ? {
              ...r,
              status: newRoom.status,
              housekeeper: newRoom.housekeeper || '未指派'
            } : r);
          }
          return [...prev, {
            id: newRoom.id,
            hotelId: newRoom.hotel_id,
            buildingId: newRoom.building_id,
            number: newRoom.number,
            type: newRoom.type,
            status: newRoom.status,
            floor: newRoom.floor,
            housekeeper: newRoom.housekeeper || '未指派',
            basePrice: newRoom.base_price,
            lateFeePerHour: newRoom.late_fee_per_hour || 0,
            lateFeePerDay: newRoom.late_fee_per_day || 0,
            description: newRoom.description || ''
          }];
        });

        // 標記為最近更新
        setRecentlyUpdatedRooms(prev => new Set(prev).add(newRoom.id));
        setTimeout(() => {
          setRecentlyUpdatedRooms(prev => {
            const next = new Set(prev);
            next.delete(newRoom.id);
            return next;
          });
        }, 2000);
      } else if (payload.eventType === 'DELETE') {
        setRooms(prev => prev.filter(r => r.id !== payload.old.id));
      }
    });

    // 訂閱清掃任務變更
    const taskSubId = realtimeService.subscribe('daily_cleaning_tasks', (payload) => {
      console.log('[Realtime] Cleaning task change:', payload.eventType);

      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const task = payload.new;
        setCleaningTasks(prev => {
          const exists = prev.find(t => t.id === task.id);
          if (exists) {
            return prev.map(t => t.id === task.id ? {
              id: task.id,
              hotelId: task.hotel_id,
              roomId: task.room_id,
              roomNumber: task.room_number,
              taskDate: task.task_date,
              taskType: task.task_type,
              priority: task.priority,
              status: task.status,
              housekeeperId: task.housekeeper_id,
              housekeeperName: task.housekeeper_name,
              assignedAt: task.assigned_at,
              startedAt: task.started_at,
              completedAt: task.completed_at,
              notes: task.notes,
              exceptions: task.exceptions
            } : t);
          }
          return [...prev, {
            id: task.id,
            hotelId: task.hotel_id,
            roomId: task.room_id,
            roomNumber: task.room_number,
            taskDate: task.task_date,
            taskType: task.task_type,
            priority: task.priority,
            status: task.status,
            housekeeperId: task.housekeeper_id,
            housekeeperName: task.housekeeper_name,
            assignedAt: task.assigned_at,
            startedAt: task.started_at,
            completedAt: task.completed_at,
            notes: task.notes,
            exceptions: task.exceptions
          }];
        });
      } else if (payload.eventType === 'DELETE') {
        setCleaningTasks(prev => prev.filter(t => t.id !== payload.old.id));
      }
    });

    // 訂閱流程實例變更
    const workflowSubId = realtimeService.subscribe('workflow_instances', (payload) => {
      console.log('[Realtime] Workflow instance change:', payload.eventType);

      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const inst = payload.new;
        setWorkflowInstances(prev => {
          const exists = prev.find(w => w.id === inst.id);
          if (exists) {
            return prev.map(w => w.id === inst.id ? {
              ...w,
              currentStep: inst.current_step,
              status: inst.status,
              completedAt: inst.completed_at
            } : w);
          }
          return [...prev, {
            id: inst.id,
            workflowId: inst.workflow_id,
            documentId: inst.document_id,
            documentType: inst.document_type,
            documentNumber: inst.document_number,
            currentStep: inst.current_step,
            status: inst.status,
            initiatedBy: inst.initiated_by,
            initiatedAt: inst.initiated_at,
            completedAt: inst.completed_at,
            notes: inst.notes
          }];
        });

        // 標記為最近更新
        setRecentlyUpdatedWorkflows(prev => new Set(prev).add(inst.id));
        setTimeout(() => {
          setRecentlyUpdatedWorkflows(prev => {
            const next = new Set(prev);
            next.delete(inst.id);
            return next;
          });
        }, 2000);
      } else if (payload.eventType === 'DELETE') {
        setWorkflowInstances(prev => prev.filter(w => w.id !== payload.old.id));
      }
    });

    // 訂閱簽核記錄變更
    const approvalSubId = realtimeService.subscribe('approval_records', (payload) => {
      console.log('[Realtime] Approval record change:', payload.eventType);

      if (payload.eventType === 'INSERT') {
        const record = payload.new;
        setApprovalRecords(prev => [{
          id: record.id,
          workflowInstanceId: record.workflow_instance_id,
          stepId: record.step_id,
          stepSequence: record.step_sequence,
          stepName: record.step_name,
          approverId: record.approver_id,
          approverName: record.approver_name,
          action: record.action,
          comments: record.comments,
          actedAt: record.acted_at
        }, ...prev]);
      }
    });

    // 訂閱訂房變更
    const reservationSubId = realtimeService.subscribe('reservations', (payload) => {
      console.log('[Realtime] Reservation change:', payload.eventType, payload.new?.id || payload.old?.id);

      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const res = payload.new;
        console.log('[Realtime] Updating reservation:', res.id, 'paidAmount:', res.paid_amount, 'totalPrice:', res.total_price, 'discount:', res.discount);

        setReservations(prev => {
          const exists = prev.find(r => r.id === res.id);
          if (exists) {
            // 更新現有訂房 - 包含所有影響餘額計算的欄位
            const updated = prev.map(r => r.id === res.id ? {
              ...r,
              status: res.status,
              paidAmount: res.paid_amount,
              totalPrice: res.total_price,
              discount: res.discount || 0,
              checkOut: res.check_out,
              note: res.note,
              guestName: res.guest_name,
              roomNumber: res.room_number,
              lastEditedBy: res.last_edited_by,
              createdAt: res.created_at, // Map createdAt
              updatedAt: res.updated_at // Map updatedAt
            } : r);
            console.log('[Realtime] Reservations updated. New count:', updated.length);
            return updated;
          }
          // 新增訂房
          return [...prev, {
            id: res.id,
            hotelId: res.hotel_id,
            buildingId: res.building_id,
            guestId: res.guest_id,
            guestName: res.guest_name,
            phone: res.phone || '',
            idNumber: res.id_number,
            checkIn: res.check_in,
            checkOut: res.check_out,
            roomNumber: res.room_number,
            roomType: res.room_type,
            status: res.status,
            source: res.source || '未知',
            totalPrice: res.total_price,
            paidAmount: res.paid_amount,
            lastEditedBy: res.last_edited_by,
            discount: res.discount || 0,
            note: res.note || '',
            licensePlate: res.license_plate,
            companyName: res.company_name,
            bookingAgent: res.booking_agent,
            depositAmount: res.deposit_amount,
            roomRent: res.room_rent,
            extraItems: res.extra_items,
            addBed: res.add_bed,
            paymentMethod: res.payment_method,
            creditCard: res.credit_card,
            petType: res.pet_type,
            petCount: res.pet_count,
            petNote: res.pet_note
          }];
        });
      } else if (payload.eventType === 'DELETE') {
        setReservations(prev => prev.filter(r => r.id !== payload.old.id));
      }
    });

    // 訂閱房間註記變更
    const noteSubId = realtimeService.subscribe('room_notes', (payload) => {
      console.log('[Realtime] Room note change:', payload.eventType);

      if (payload.eventType === 'INSERT') {
        const note = payload.new;
        if (note.hotel_id === selectedHotelId) {
          setRoomNotes(prev => [{
            id: note.id,
            roomId: note.room_id,
            hotelId: note.hotel_id,
            content: note.content,
            staffName: note.staff_name,
            createdAt: note.created_at
          }, ...prev]);
        }
      } else if (payload.eventType === 'DELETE') {
        setRoomNotes(prev => prev.filter(n => n.id !== payload.old.id));
      }
    });

    // 訂閱請購單變更
    const prSubId = realtimeService.subscribe('purchase_requisitions', (payload) => {
      console.log('[Realtime] PR change:', payload.eventType);
      if (payload.eventType === 'UPDATE') {
        const pr = payload.new;
        setPurchaseRequisitions(prev => prev.map(p => p.id === pr.id ? {
          ...p,
          status: pr.status
        } : p));
      }
    });

    // 訂閱採購單變更
    const poSubId = realtimeService.subscribe('purchase_orders', (payload) => {
      console.log('[Realtime] PO change:', payload.eventType);
      if (payload.eventType === 'UPDATE') {
        const po = payload.new;
        setPurchaseOrders(prev => prev.map(p => p.id === po.id ? {
          ...p,
          status: po.status
        } : p));
      }
    });

    // 清理函數
    return () => {
      console.log('[Realtime] Cleaning up subscriptions...');
      unsubStatus();
      unsubSync();
      realtimeService.unsubscribe(roomSubId);
      realtimeService.unsubscribe(taskSubId);
      realtimeService.unsubscribe(workflowSubId);
      realtimeService.unsubscribe(approvalSubId);
      realtimeService.unsubscribe(reservationSubId);
      realtimeService.unsubscribe(noteSubId);
      realtimeService.unsubscribe(prSubId);
      realtimeService.unsubscribe(poSubId);
      realtimeService.cleanup();
    };
  }, [selectedHotelId]);

  // Recalculate pending approvals when currentUser or workflowInstances change
  useEffect(() => {
    if (!currentUser || workflowInstances.length === 0) {
      return;
    }

    console.log(`[PendingCalc] Recalculating for user: ${currentUser.name} (ID: ${currentUser.id})`);

    // We need to re-filter workflowInstances for this user
    // This runs after login and whenever workflowInstances are updated
    const fetchAndFilterPending = async () => {
      const { data: wfInsts } = await supabase
        .from('workflow_instances')
        .select('*, definition:workflow_definitions(*, steps:workflow_steps(*))')
        .eq('status', 'Pending');

      if (!wfInsts) return;

      const pendings = wfInsts.filter((i: any) => {
        console.log(`[PendingCalc] Checking ${i.document_number}: assigned_to=${i.assigned_to}, currentUser.id=${currentUser.id}`);

        // 1. Check if assigned directly
        if (i.assigned_to === currentUser.id) {
          console.log(`[PendingCalc] MATCHED: assigned_to === currentUser.id`);
          return true;
        }

        // 2. Check current step definition for role match
        const currentStepDef = i.definition?.steps?.find((s: any) => s.step_sequence === i.current_step);
        if (currentStepDef?.approver_role && currentUser.role === currentStepDef.approver_role) {
          return true;
        }

        // 3. Check IDs list
        if (currentStepDef?.approver_ids?.includes(currentUser.id)) {
          return true;
        }

        return false;
      }).map((i: any) => {
        const currentStepDef = i.definition?.steps?.find((s: any) => s.step_sequence === i.current_step);
        return {
          workflowInstanceId: i.id,
          documentId: i.document_id,
          documentType: i.document_type,
          documentNumber: i.document_number,
          requesterId: '',
          requesterName: i.initiated_by,
          requestedAt: i.initiated_at,
          currentStepName: currentStepDef?.step_name || `步驟 ${i.current_step}`,
          priority: 'Normal',
          amount: 0
        };
      });

      console.log(`[PendingCalc] Found ${pendings.length} pending approvals for ${currentUser.name}`);
      setPendingApprovals(pendings);
    };

    fetchAndFilterPending();
  }, [currentUser?.id, workflowInstances.length]);

  const refreshGlobalRoomNotes = async () => {
    if (!selectedHotelId) return;
    const { data: noteRes } = await supabase
      .from('room_notes')
      .select('*')
      .eq('hotel_id', selectedHotelId)
      .order('created_at', { ascending: false });

    if (noteRes) setRoomNotes(noteRes.map(n => ({
      id: n.id,
      roomId: n.room_id,
      hotelId: n.hotel_id,
      content: n.content,
      staffName: n.staff_name,
      createdAt: n.created_at
    })));
  };

  const handleUpdateRoomStatus = async (roomId: string, newStatus: RoomStatus) => {
    try {
      await supabase.from('rooms').update({ status: newStatus }).eq('id', roomId);
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: newStatus } : r));
    } catch (e) {
      console.error('Update room status failed:', e);
      alert('房態更新失敗');
    }
  };

  const handleComplexSave = async (payload: any): Promise<boolean> => {
    // 1. 同步鎖檢查：防止連點 (Prevent Double Submission)
    if (isSavingRef.current) {
      console.warn('⚠️ 阻擋重複提交 (Duplicate submission blocked)');
      return false;
    }
    isSavingRef.current = true;

    const { reservation, guestData, isNewGuest, roomId, isUpdate } = payload;
    try {
      let finalGuestId = reservation.guestId;
      let finalSavedRes: Reservation | null = null;

      // 0. 防呆檢查：確認是否已有重複的有效訂單 (Same Room, Same Date, Active Status)
      // 排除掉正在編輯的自己 (isUpdate)
      if (reservation.status === 'Confirmed' || reservation.status === 'CheckedIn') {
        const checkInDate = reservation.checkIn.split(' ')[0].split('T')[0];
        const conflictingRes = reservations.find(r =>
          r.roomNumber === reservation.roomNumber &&
          (r.checkIn.startsWith(checkInDate)) &&
          (r.status === 'Confirmed' || r.status === 'CheckedIn') &&
          (!isUpdate || r.id !== reservation.id)
        );

        if (conflictingRes) {
          alert(`衝突警告：房間 ${reservation.roomNumber} 在 ${checkInDate} 已有有效訂單 (住客: ${conflictingRes.guestName})。無法重複建立。`);
          return false;
        }
      }

      // 1. 如果是新客，先新增賓客
      if (isNewGuest) {
        let guestId = `g-${Date.now()}`;
        let existingGuest = null;

        const safeIdNumber = guestData.idNumber && guestData.idNumber.trim() !== '' ? guestData.idNumber.trim() : null;

        if (safeIdNumber) {
          const { data: found } = await supabase
            .from('guests')
            .select('*')
            .eq('id_number', safeIdNumber)
            .maybeSingle();

          if (found) {
            existingGuest = found;
            guestId = found.id;
          }
        }

        if (!existingGuest) {
          const { error: guestError } = await supabase.from('guests').insert({
            id: guestId,
            name: guestData.name,
            id_number: safeIdNumber,
            phone: guestData.phone,
            vip_level: 'Normal',
            is_blacklisted: false
          });
          if (guestError) throw guestError;
        }

        finalGuestId = guestId;

        if (!guests.find(g => g.id === guestId)) {
          const newGuest: Guest = {
            id: guestId,
            name: guestData.name,
            idNumber: guestData.idNumber,
            phone: guestData.phone,
            vipLevel: existingGuest?.vip_level || 'Normal',
            isBlacklisted: existingGuest?.is_blacklisted || false,
            preferences: existingGuest?.preferences || '',
            gender: 'Other',
            nationality: '',
            modificationLogs: []
          };
          setGuests(prev => [...prev, newGuest]);
        }
      }

      // 2. 新增或更新預約
      if (isUpdate && reservation.id) {
        const { error: updateError } = await supabase.from('reservations').update({
          guest_id: finalGuestId,
          guest_name: reservation.guestName,
          phone: reservation.phone,
          id_number: reservation.idNumber,
          check_in: reservation.checkIn,
          check_out: reservation.checkOut,
          room_number: reservation.roomNumber,
          room_type: reservation.roomType,
          total_price: reservation.totalPrice,
          paid_amount: reservation.paidAmount,
          discount: reservation.discount,
          note: reservation.note,
          status: reservation.status, // Add status to persist during update
          source: reservation.source,
          last_edited_by: currentUser?.name || 'System',
          updated_at: new Date().toISOString(),
          pet_type: reservation.petType,
          pet_count: reservation.petCount,
          pet_note: reservation.petNote,
          license_plate: reservation.licensePlate,
          company_name: reservation.companyName,
          booking_agent: reservation.bookingAgent,
          room_rent: reservation.roomRent,
          extra_items: reservation.extraItems,
          add_bed: reservation.addBed
        }).eq('id', reservation.id);

        if (updateError) throw updateError;

        // FIX: Preserve hotelId and other fields from original reservation
        const originalRes = reservations.find(r => r.id === reservation.id);
        finalSavedRes = {
          ...originalRes,  // Start with original reservation to preserve hotelId, etc.
          ...reservation,  // Overlay with updated fields from form
          guestId: finalGuestId,
          updatedAt: new Date().toISOString()
        } as Reservation;

        setReservations(prev => prev.map(r => r.id === reservation.id ? finalSavedRes! : r));
      } else {
        const resId = `RSV-${Date.now()}`;
        const { error: resError } = await supabase.from('reservations').insert({
          id: resId,
          hotel_id: selectedHotelId,
          building_id: reservation.buildingId,
          guest_id: finalGuestId,
          guest_name: reservation.guestName,
          phone: reservation.phone,
          id_number: reservation.idNumber,
          check_in: reservation.checkIn,
          check_out: reservation.checkOut,
          room_number: reservation.roomNumber,
          room_type: reservation.roomType,
          total_price: reservation.totalPrice,
          paid_amount: reservation.paidAmount || 0,
          discount: reservation.discount || 0,
          status: 'Confirmed',
          source: reservation.source,
          note: reservation.note,
          last_edited_by: currentUser?.name || 'System',
          license_plate: reservation.licensePlate,
          company_name: reservation.companyName,
          booking_agent: reservation.bookingAgent,
          room_rent: reservation.roomRent,
          extra_items: reservation.extraItems,
          add_bed: reservation.addBed,
          pet_type: reservation.petType,
          pet_count: reservation.petCount,
          pet_note: reservation.petNote
        });
        if (resError) throw resError;

        finalSavedRes = {
          id: resId,
          hotelId: selectedHotelId,
          buildingId: reservation.buildingId,
          guestId: finalGuestId,
          guestName: reservation.guestName,
          phone: reservation.phone,
          idNumber: reservation.idNumber,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          roomNumber: reservation.roomNumber,
          roomType: reservation.roomType,
          totalPrice: reservation.totalPrice,
          paidAmount: reservation.paidAmount,
          discount: reservation.discount,
          source: reservation.source,
          note: reservation.note,
          lastEditedBy: currentUser?.name || 'System',
          createdAt: new Date().toISOString(), // Set local createdAt
          status: 'Confirmed',
          licensePlate: reservation.licensePlate,
          companyName: reservation.companyName,
          bookingAgent: reservation.bookingAgent,
          roomRent: reservation.roomRent,
          extraItems: reservation.extraItems,
          addBed: reservation.addBed,
          paymentMethod: reservation.paymentMethod,
          creditCard: reservation.creditCard,
          petType: reservation.petType,
          petCount: reservation.petCount,
          petNote: reservation.petNote
        };

        // Removed automatic OC transition during save.
        // Room status should only change to OC during the explicit Check-In action.
        setReservations(prev => [...prev, finalSavedRes!]);
        if (payload.billableItems) payload.reservationId = resId;
      }


      // 4. Persistence of Billable Items
      if (payload.billableItems) {
        const targetResId = isUpdate ? reservation.id : payload.reservationId;
        const itemsToSave = payload.billableItems.map((item: BillableItem) => ({
          id: (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) ? self.crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          reservation_id: targetResId,
          description: item.description,
          amount: item.amount,
          quantity: item.quantity,
          payment_method: item.paymentMethod || 'Room Charge',
          note: item.note || '',
          created_by: currentUser?.name || 'System'
        }));

        await supabase.from('billable_items').delete().eq('reservation_id', targetResId);
        if (itemsToSave.length > 0) {
          const { error: itemError } = await supabase.from('billable_items').insert(itemsToSave);
          if (itemError) throw itemError;
        }

        const { data: newItems } = await supabase.from('billable_items').select('*').eq('reservation_id', targetResId);
        if (newItems) {
          const mappedItems = newItems.map(b => ({
            id: b.id,
            reservationId: b.reservation_id,
            description: b.description,
            amount: b.amount,
            quantity: b.quantity,
            paymentMethod: b.payment_method,
            note: b.note,
            createdAt: b.created_at,
            createdBy: b.created_by
          }));
          setBillableItems(prev => [...prev.filter(i => i.reservationId !== targetResId), ...mappedItems]);
        }
      }

      // 4.5 Handle Initial Payment
      if (payload.initialPayment) {
        const targetResId = isUpdate ? reservation.id : payload.reservationId;
        const txId = `TX-${Date.now()}`;
        const { error: txError } = await supabase.from('transactions').insert({
          id: txId,
          hotel_id: selectedHotelId,
          reservation_id: targetResId,
          amount: payload.initialPayment.amount,
          type: 'Payment',
          method: payload.initialPayment.method || 'Cash',
          description: payload.initialPayment.description || '訂金',
          created_at: new Date().toISOString(),
          staff_name: currentUser?.name || 'System'
        });

        if (!txError) {
          setTransactions(prev => [{
            id: txId,
            hotelId: selectedHotelId,
            reservationId: targetResId,
            amount: payload.initialPayment.amount,
            type: 'Payment',
            method: payload.initialPayment.method || 'Cash',
            description: payload.initialPayment.description || '訂金',
            createdAt: new Date().toISOString(),
            staffName: currentUser?.name || 'System'
          }, ...prev]);
        }
      }

      // Update room state for real-time display in modal
      if (finalSavedRes && roomId) {
        setRooms(prev => prev.map(r => r.id === roomId ? {
          ...r,
          // Only update status to OC if the reservation is actually CheckedIn
          status: finalSavedRes.status === 'CheckedIn' ? RoomStatus.OC : r.status,
          current_order: finalSavedRes
        } : r));
      }

      return true;

    } catch (error: any) {
      console.error('Atomic Booking Failed:', error);
      alert(`儲存失敗 (Save Failed): ${error.message || 'Unknown Error'}`);
      return false;
    } finally {
      // 釋放鎖 (Release Lock)
      isSavingRef.current = false;
    }
  };



  const handleCheckout = async (resId: string) => {
    try {
      const res = reservations.find(r => r.id === resId);
      if (!res) return;



      // 1. Update Reservation Status
      const { error: resError } = await supabase
        .from('reservations')
        .update({ status: 'CheckedOut', last_edited_by: currentUser?.name || 'System' })
        .eq('id', resId);
      if (resError) throw resError;

      // 2. Update Room Status to VD (Dirty)
      const targetRoom = rooms.find(r => r.hotelId === selectedHotelId && r.number === res.roomNumber);
      if (res.roomNumber && targetRoom) {
        const { error: roomError } = await supabase
          .from('rooms')
          .update({ status: RoomStatus.VD })
          .eq('number', res.roomNumber)
          .eq('hotel_id', selectedHotelId);
        if (roomError) throw roomError;

        // 3. Create a new cleaning task for this checkout
        // Each checkout creates a separate task for audit/tracking purposes
        const today = new Date().toISOString().split('T')[0];
        const newTaskId = `ct-${Date.now()}-${targetRoom.id}`;

        const { error: taskError } = await supabase.from('daily_cleaning_tasks').insert({
          id: newTaskId,
          hotel_id: selectedHotelId,
          room_id: targetRoom.id,
          room_number: res.roomNumber,
          task_date: today,
          task_type: 'VD',
          priority: 'Normal',
          status: 'Unassigned',
          reservation_id: resId  // Link to checkout for audit trail
        });

        if (taskError) {
          console.warn('Failed to create cleaning task:', taskError);
        } else {
          setCleaningTasks(prev => [...prev, {
            id: newTaskId,
            hotelId: selectedHotelId,
            roomId: targetRoom.id,
            roomNumber: res.roomNumber,
            taskDate: today,
            taskType: 'VD',
            priority: 'Normal',
            status: 'Unassigned'
          }]);
        }
      }


      // 4. Sync Local State
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, status: 'CheckedOut' } : r));
      setRooms(prev => prev.map(r => (r.hotelId === selectedHotelId && r.number === res.roomNumber) ? { ...r, status: RoomStatus.VD } : r));

      // 5. 關閉房態明細 Modal（不顯示 alert）
      setIsOrderOpen(false);
      setSelectedOldReservation(null);
      setIsCheckoutVerifying(false);
    } catch (e: any) {
      console.error('Checkout failed:', e);
      alert(`退房失敗: ${e.message}`);
    }
  };

  const handleCollectPayment = async (resId: string, amount: number, method: PaymentMethod) => {
    if (!currentUser) return;
    try {
      const res = reservations.find(r => r.id === resId);
      if (!res) return;
      const txId = `TX-${Date.now()}`;
      const newPaidAmount = res.paidAmount + amount;
      await supabase.from('transactions').insert({
        id: txId, hotel_id: res.hotelId, reservation_id: resId, amount, type: 'Payment', method, description: '櫃檯收款', created_at: new Date().toLocaleString(), staff_name: currentUser.name
      });
      await supabase.from('reservations').update({ paid_amount: newPaidAmount }).eq('id', resId);
      setTransactions(prev => [{
        id: txId, hotelId: res.hotelId, reservationId: resId, amount, type: 'Payment', method, description: '櫃檯收款', createdAt: new Date().toISOString(), staffName: currentUser.name
      }, ...prev]);
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, paidAmount: newPaidAmount } : r));

      // Auto Journal (Payment)
      // Debit Cash (1101) / Credit Room Revenue (4101) - User requested Draft status
      const cashAcc = chartOfAccounts.find(a => a.code === '1101');
      const revenueAcc = chartOfAccounts.find(a => a.code === '4101');

      if (cashAcc && revenueAcc) {
        const result = await AccountingService.createJournalEntry({
          hotelId: res.hotelId!,
          date: new Date().toISOString().split('T')[0],
          description: `房租收款 Payment: ${res.guestName}`,
          referenceId: txId,
          type: 'Payment',
          lines: [
            { accountId: cashAcc.id, description: 'Cash Receipt', debit: amount, credit: 0 },
            { accountId: revenueAcc.id, description: 'Room Revenue', debit: 0, credit: amount }
          ],
          status: 'Draft', // Maintain as Draft
          createdBy: currentUser.id
        });

        if (result.success && result.entryId) {
          const { data: newEntry } = await supabase
            .from('journal_entries')
            .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(code, name))')
            .eq('id', result.entryId)
            .single();

          if (newEntry) {
            const mappedEntry: JournalEntry = {
              id: newEntry.id,
              entryNumber: newEntry.entry_number,
              hotelId: newEntry.hotel_id,
              entryDate: newEntry.entry_date,
              postingDate: newEntry.posting_date,
              period: newEntry.period,
              status: newEntry.status,
              description: newEntry.description,
              totalDebit: newEntry.total_debit,
              totalCredit: newEntry.total_credit,
              sourceType: newEntry.source_type,
              sourceId: newEntry.source_id,
              createdBy: newEntry.created_by,
              approvedBy: newEntry.approved_by,
              createdAt: newEntry.created_at,
              lines: newEntry.lines?.map((l: any) => ({
                id: l.id,
                entryId: l.entry_id,
                lineNumber: l.line_number,
                accountId: l.account_id,
                accountCode: l.account?.code,
                accountName: l.account?.name,
                debitAmount: l.debit_amount,
                creditAmount: l.credit_amount,
                description: l.description,
                createdAt: l.created_at
              })) || []
            };
            setJournalEntries(prev => [mappedEntry, ...prev]);

          }
        } else {
          console.error('Journal Entry Creation Failed:', result.message);
          alert(`收款成功，但傳票建立失敗 (Journal Error): ${result.message}`);
        }
      } else {
        console.error('Missing Accounts: Auto-Journal skipped', { cashAcc, arAcc });
      }
    } catch (e: any) {
      console.error('Payment Error:', e);
      alert(`收款失敗: ${e.message}`);
    }
  };


  const handleUpdateJournalEntry = async (id: string, entry: Partial<JournalEntry>, lines: Partial<JournalEntryLine>[]) => {
    try {
      const result = await AccountingService.updateManualJournal(id, entry, lines);
      if (result.success) {
        // Refresh entries
        const { data: jeData, error: jeError } = await supabase
          .from('journal_entries')
          .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(code, name))')
          .eq('hotel_id', selectedHotelId)
          .order('entry_date', { ascending: false })
          .limit(100);

        if (jeData) {
          const mappedEntries = jeData.map((e: any) => ({
            id: e.id,
            entryNumber: e.entry_number,
            hotelId: e.hotel_id,
            entryDate: e.entry_date,
            period: e.period,
            status: e.status,
            description: e.description,
            totalDebit: e.total_debit,
            totalCredit: e.total_credit,
            lines: e.lines?.map((l: any) => ({
              id: l.id,
              entryId: l.entry_id,
              lineNumber: l.line_number,
              accountId: l.account_id,
              accountCode: l.account?.code, // might be null if not joined
              accountName: l.account?.name, // might be null
              debitAmount: l.debit_amount,
              creditAmount: l.credit_amount,
              description: l.description,
              createdAt: l.created_at
            })) || []
          }));
          setJournalEntries(mappedEntries);
          // Also re-fetch ledger if needed, but GL view fetches on demand usually
        }
        alert('傳票更新成功');
      } else {
        alert('更新失敗: ' + result.message);
      }
    } catch (e: any) {
      alert('更新錯誤: ' + e.message);
    }
  };

  const handleDeleteJournalEntry = async (id: string) => {
    try {
      const result = await AccountingService.deleteManualJournal(id);
      if (result.success) {
        setJournalEntries(prev => prev.filter(e => e.id !== id));
        alert('傳票已刪除');
      } else {
        alert('刪除失敗: ' + result.message);
      }
    } catch (e: any) {
      alert('刪除錯誤: ' + e.message);
    }
  };

  const handleRevertJournalEntry = async (id: string) => {
    try {
      const result = await AccountingService.revertJournalEntry(id);
      if (result.success) {
        // Refresh entries
        const { data: jeData } = await supabase
          .from('journal_entries')
          .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(code, name))')
          .eq('hotel_id', selectedHotelId)
          .order('entry_date', { ascending: false })
          .limit(100);

        if (jeData) {
          const mappedEntries = jeData.map((e: any) => ({
            id: e.id,
            entryNumber: e.entry_number,
            hotelId: e.hotel_id,
            entryDate: e.entry_date,
            period: e.period,
            status: e.status,
            description: e.description,
            totalDebit: e.total_debit,
            totalCredit: e.total_credit,
            lines: e.lines?.map((l: any) => ({
              id: l.id,
              entryId: l.entry_id,
              lineNumber: l.line_number,
              accountId: l.account_id,
              accountCode: l.account?.code,
              accountName: l.account?.name,
              debitAmount: l.debit_amount,
              creditAmount: l.credit_amount,
              description: l.description,
              createdAt: l.created_at
            })) || []
          }));
          setJournalEntries(mappedEntries);
        }
        alert('傳票已退回為草稿');
      } else {
        alert('退回失敗: ' + result.message);
      }
    } catch (e: any) {
      alert('退回錯誤: ' + e.message);
    }
  };

  const handleAddBillableItem = async (item: Partial<BillableItem>) => {
    if (!currentUser) return;
    try {
      const id = item.id || `bi-${Date.now()}`;
      const { data, error } = await supabase.from('billable_items').insert({
        id,
        reservation_id: item.reservationId,
        description: item.description,
        amount: item.amount,
        quantity: item.quantity,
        payment_method: item.paymentMethod || 'Room Charge',
        note: item.note, // 新增：存儲備註
        created_by: currentUser.name
      }).select().single();

      if (error) throw error;

      const newItem: BillableItem = {
        id: data.id,
        reservationId: data.reservation_id,
        description: data.description,
        amount: data.amount,
        quantity: data.quantity,
        paymentMethod: data.payment_method,
        note: data.note, // 新增：映射回傳值
        createdAt: data.created_at,
        createdBy: data.created_by
      };

      setBillableItems(prev => [...prev, newItem]);

      // Update reservation price if needed? 
      // Actually, totalPrice in DB is usually calculated on save or is legacy. 
      // Let's keep it in sync if it exists.
      const res = reservations.find(r => r.id === item.reservationId);
      if (res) {
        const newTotal = res.totalPrice + (newItem.amount * newItem.quantity);
        await supabase.from('reservations').update({ total_price: newTotal }).eq('id', res.id);
        setReservations(prev => prev.map(r => r.id === res.id ? { ...r, totalPrice: newTotal } : r));
      }
    } catch (e: any) {
      alert(`新增項目失敗: ${e.message}`);
    }
  };

  const handleDeleteBillableItem = async (id: string) => {
    try {
      const itemToDelete = billableItems.find(i => i.id === id);
      if (!itemToDelete) return;

      const { error } = await supabase.from('billable_items').delete().eq('id', id);
      if (error) throw error;

      setBillableItems(prev => prev.filter(i => i.id !== id));

      const res = reservations.find(r => r.id === itemToDelete.reservationId);
      if (res) {
        const newTotal = Math.max(0, res.totalPrice - (itemToDelete.amount * itemToDelete.quantity));
        await supabase.from('reservations').update({ total_price: newTotal }).eq('id', res.id);
        setReservations(prev => prev.map(r => r.id === res.id ? { ...r, totalPrice: newTotal } : r));
      }
    } catch (e: any) {
      alert(`刪除項目失敗: ${e.message}`);
    }
  };

  const handleIssueInvoice = async (amount: number, reservationId?: string, buyerId?: string): Promise<string | undefined> => {
    if (!selectedHotelId) return undefined;

    // 嘗試多種方式取得訂單資訊
    let res: Reservation | undefined;

    // 1. 如果直接傳入 reservationId，從 reservations 陣列查找
    if (reservationId) {
      res = reservations.find(r => r.id === reservationId);
    }

    // 2. 如果沒有，嘗試從 selectedOldReservation 取得
    if (!res && selectedOldReservation) {
      res = selectedOldReservation;
    }

    // 3. 最後嘗試從 selectedRoomId 的 current_order 取得
    if (!res && selectedRoomId) {
      res = hotelRooms.find(r => r.id === selectedRoomId)?.current_order;
    }

    if (!res) {
      alert("無法確認訂單資訊");
      return undefined;
    }

    try {
      // 1. Get Sequence
      const { data: seqData, error: seqError } = await supabase.from('invoice_sequences').select('*').eq('hotel_id', res.hotelId).single();
      if (seqError || !seqData) {
        alert('開票失敗: 尚未配置發票字軌');
        return undefined;
      }
      const seq = { hotelId: seqData.hotel_id, prefix: seqData.prefix, current_number: seqData.current_number }; // map db to local

      // 2. Create Invoice
      const invNo = `${seq.prefix}-${seq.current_number.toString().padStart(8, '0')}`;
      const invId = `INV-${Date.now()}`;
      const tax = Math.round(amount * 0.05);
      const netAmount = amount - tax;

      await supabase.from('invoices').insert({
        id: invId,
        hotel_id: res.hotelId,
        reservation_id: res.id,
        invoice_number: invNo,
        amount,
        tax,
        net_amount: netAmount,
        status: 'Active',
        created_at: new Date().toISOString(),
        created_by: currentUser.name,
        buyer_id: buyerId
      });

      await supabase.from('invoice_sequences').update({ current_number: seq.current_number + 1 }).eq('hotel_id', res.hotelId);

      const newInv: Invoice = {
        id: invId, hotelId: res.hotelId, reservationId: res.id, invoiceNumber: invNo, amount, tax, netAmount, status: 'Active', createdAt: new Date().toLocaleString(), createdBy: currentUser.name, buyerId
      };
      setInvoices(prev => [newInv, ...prev]);

      // Auto Journal (Invoice)
      if (currentUser && res.hotelId) {
        await AccountingService.createJournalFromInvoice(newInv, res.hotelId, currentUser.id);
      }

      return invId;
    } catch (e: any) {
      alert(`開票失敗: ${e.message}`);
      return undefined;
    }
  };

  const handleVoidInvoice = async (invoiceId: string, reason: string): Promise<void> => {
    try {
      // 1. Update Invoice Status
      const { error: invError } = await supabase.from('invoices').update({ status: 'Voided' }).eq('id', invoiceId);
      if (invError) throw new Error(invError.message);

      // 2. Local State Update
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'Voided' } : inv));

      // 3. Void Journal Entry (Accounting)
      await AccountingService.voidJournalEntryBySource(invoiceId, reason);

      // alert('發票已作廢成功 (Invoice Voided)');
    } catch (e: any) {
      alert(`作廢失敗: ${e.message}`);
    }
  };

  const handleRefund = async (resId: string, amount: number, method: PaymentMethod, note?: string): Promise<void> => {
    if (!currentUser) return;
    try {
      const res = reservations.find(r => r.id === resId) || rooms.find(r => r.current_order?.id === resId)?.current_order;
      if (!res) throw new Error("Reservation not found");

      // 1. Create Transaction (Negative Amount)
      const tx: Transaction = {
        id: `TX-${Date.now()}`,
        reservationId: resId,
        hotelId: res.hotelId!,
        amount: -amount,
        method: method,
        date: new Date().toISOString().split('T')[0], // for logic
        type: 'Refund',
        description: `溢收退款${note ? `: ${note}` : ''}`,
        note: note, // Save note separately
        createdAt: new Date().toISOString(),
        staffName: currentUser.name
      };

      const { error: txError } = await supabase.from('transactions').insert({
        id: tx.id,
        hotel_id: tx.hotelId,
        reservation_id: tx.reservationId,
        amount: tx.amount,
        method: tx.method,
        created_at: tx.createdAt, // DB uses created_at
        type: tx.type,
        description: tx.description,
        note: tx.note, // Save note to DB
        staff_name: currentUser.name
      });
      if (txError) throw new Error(txError.message);

      // 2. Update Local State
      const localTx = { ...tx, createdAt: tx.createdAt, staffName: currentUser.name };
      setTransactions(prev => [...prev, localTx]);
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, paidAmount: (r.paidAmount || 0) - amount } : r));

      // 3. Update related room's current_order if needed
      setRooms(prev => prev.map(room => {
        if (room.current_order?.id === resId) {
          return { ...room, current_order: { ...room.current_order, paidAmount: (room.current_order.paidAmount || 0) - amount } };
        }
        return room;
      }));

      // 3.1 Update selectedOldReservation if it matches
      if (selectedOldReservation?.id === resId) {
        setSelectedOldReservation(prev => prev ? ({ ...prev, paidAmount: (prev.paidAmount || 0) - amount }) : null);
      }

      // 4. Accounting Entry (Refund: Credit Asset/Cash, Debit Liability/AR)
      // Simplified: We treat it as reducing Cash and reducing Guest Ledger (which was negative)
      const accountingDesc = `退款 Refund: ${res.guestName}${note ? ` (${note})` : ''}`;

      await AccountingService.createJournalEntry({
        hotelId: res.hotelId!,
        date: new Date().toISOString().split('T')[0],
        description: accountingDesc,
        referenceId: tx.id,
        type: 'Payment', // or Refund
        lines: [
          { accountId: '1101', description: `Cash Refund (${method})`, debit: 0, credit: amount }, // Cash Out
          { accountId: '1103', description: 'Guest Ledger Adjustment', debit: amount, credit: 0 } // AR Adjustment
        ],
        status: 'Posted',
        createdBy: currentUser.id
      });

      alert('退款成功 (Refund Processed)');
    } catch (e: any) {
      alert(`退款失敗: ${e.message}`);
    }
  };

  const handleOverpaymentTransfer = async (resId: string, amount: number, note?: string): Promise<void> => {
    if (!currentUser) return;
    try {
      const res = reservations.find(r => r.id === resId) || rooms.find(r => r.current_order?.id === resId)?.current_order;
      if (!res) throw new Error("Reservation not found");

      // 1. Create Transaction (Negative Amount to zero out balance)
      const tx: Transaction = {
        id: `TX-${Date.now()}`,
        reservationId: resId,
        hotelId: res.hotelId!,
        amount: -amount,
        method: 'Deposit', // Special method indicating transfer
        date: new Date().toISOString().split('T')[0],
        type: 'Adjustment',
        description: `轉公帳/保留款${note ? `: ${note}` : ''}`,
        note: note,
        createdAt: new Date().toISOString(),
        staffName: currentUser.name
      };

      const { error: txError } = await supabase.from('transactions').insert({
        id: tx.id,
        hotel_id: tx.hotelId,
        reservation_id: tx.reservationId,
        amount: tx.amount,
        method: tx.method,
        created_at: tx.createdAt,
        type: tx.type,
        description: tx.description,
        note: tx.note,
        staff_name: currentUser.name
      });
      if (txError) throw new Error(txError.message);

      // 2. Update Local State
      const localTx = { ...tx, createdAt: tx.createdAt, staffName: currentUser.name };
      setTransactions(prev => [...prev, localTx]);
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, paidAmount: (r.paidAmount || 0) - amount } : r));

      // 3. Update related room's current_order
      setRooms(prev => prev.map(room => {
        if (room.current_order?.id === resId) {
          return { ...room, current_order: { ...room.current_order, paidAmount: (room.current_order.paidAmount || 0) - amount } };
        }
        return room;
      }));

      // 3.1 Update selectedOldReservation if it matches
      if (selectedOldReservation?.id === resId) {
        setSelectedOldReservation(prev => prev ? ({ ...prev, paidAmount: (prev.paidAmount || 0) - amount }) : null);
      }

      // 4. Accounting Entry (Transfer: Debit Guest Ledger, Credit Advance Deposit/Liability)
      const accountingDesc = `轉公帳 Transfer: ${res.guestName}${note ? ` (${note})` : ''}`;

      await AccountingService.createJournalEntry({
        hotelId: res.hotelId!,
        date: new Date().toISOString().split('T')[0],
        description: accountingDesc,
        referenceId: tx.id,
        type: 'General',
        lines: [
          { accountId: '1201', description: 'Guest Ledger Transfer', debit: amount, credit: 0 }, // Clear AR/Guest Ledger
          { accountId: '2101', description: 'Advance Deposit', debit: 0, credit: amount } // Increase Liability
        ],
        status: 'Posted',
        createdBy: currentUser.id
      });

      alert('已成功轉入公帳/保留款 (Transferred to Public Account)');
    } catch (e: any) {
      alert(`轉帳失敗: ${e.message}`);
    }
  };
  const handleCancelCheckout = async (roomId: string) => {
    const room = hotelRooms.find(r => r.id === roomId); // reading derived state is fine
    if (!room) return;

    try {
      // 1. 尋找該房間最近一筆已退房的訂單
      const { data: lastRes, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .eq('hotel_id', selectedHotelId)
        .eq('room_number', room.number)
        .eq('status', 'CheckedOut')
        .order('check_out', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !lastRes) {
        alert('找不到該房間的前一筆房客紀錄');
        return;
      }
      setSelectedOldReservation(lastRes);
      setIsOrderOpen(true);
    } catch (e: any) {
      console.error(e);
      alert('無法載入前一房客紀錄');
    }
  };

  const handleCancelTransaction = async (txId: string): Promise<void> => {
    if (!currentUser) return;
    try {
      const tx = transactions.find(t => t.id === txId);
      if (!tx) throw new Error("Transaction not found");

      const resId = tx.reservationId;
      const res = reservations.find(r => r.id === resId) || rooms.find(r => r.current_order?.id === resId)?.current_order;
      if (!res) throw new Error("Reservation not found");

      if (tx.amount >= 0) throw new Error("Only negative transactions (Refunds/Transfers) can be cancelled this way.");

      // 1. Create Compensatory Transaction (Positive Amount)
      const reversalTx: Transaction = {
        id: `TX-REV-${Date.now()}`,
        reservationId: resId,
        hotelId: res.hotelId!,
        amount: Math.abs(tx.amount), // Positive amount to offset
        method: 'Adjustment',
        date: new Date().toISOString().split('T')[0], // For logic only
        type: 'Payment',
        description: `取消/回轉: ${tx.description}`,
        createdAt: new Date().toISOString(), // For TS local object
        staffName: currentUser.name
      };

      // Correct insertion properties
      const { error: revError } = await supabase.from('transactions').insert({
        id: reversalTx.id,
        hotel_id: reversalTx.hotelId,
        reservation_id: reversalTx.reservationId,
        amount: reversalTx.amount,
        method: reversalTx.method,
        created_at: reversalTx.createdAt,
        type: reversalTx.type,
        description: reversalTx.description,
        staff_name: currentUser.name
      });
      if (revError) throw new Error(revError.message);

      // 2. Update Local State
      setTransactions(prev => [...prev, reversalTx]);
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, paidAmount: (r.paidAmount || 0) + reversalTx.amount } : r));

      // 2.1 Update selectedOldReservation
      if (selectedOldReservation?.id === resId) {
        setSelectedOldReservation(prev => prev ? ({ ...prev, paidAmount: (prev.paidAmount || 0) + reversalTx.amount }) : null);
      }

      // 3. Update related room
      setRooms(prev => prev.map(room => {
        if (room.current_order?.id === resId) {
          return { ...room, current_order: { ...room.current_order, paidAmount: (room.current_order.paidAmount || 0) + reversalTx.amount } };
        }
        return room;
      }));

      // 4. Accounting Entry (Reversal: Debit Cash, Credit Guest Ledger)
      await AccountingService.createJournalEntry({
        hotelId: res.hotelId!,
        date: new Date().toISOString().split('T')[0],
        description: `取消交易 Reversal: ${tx.description}`,
        referenceId: reversalTx.id,
        type: 'Payment', // or Reversal
        lines: [
          { accountId: '1101', description: 'Cash Reversal', debit: reversalTx.amount, credit: 0 }, // Cash In
          { accountId: '1201', description: 'Guest Ledger Reversal', debit: 0, credit: reversalTx.amount } // AR Reversal
        ],
        status: 'Posted',
        createdBy: currentUser.id
      });

      alert('交易已成功取消/回轉 (Transaction Reversed)');
    } catch (e: any) {
      alert(`取消交易失敗: ${e.message}`);
    }
  };

  // Handle converting PR to PO
  const handleConvertPRtoPO = async (prId: string) => {
    try {
      if (!selectedHotelId) throw new Error('No hotel selected');

      // 1. Fetch PR details
      const pr = purchaseRequisitions.find(p => p.id === prId);
      if (!pr) throw new Error('Purchase Requisition not found');

      // 2. Fetch PR Items
      const { data: prItems, error: itemsError } = await supabase
        .from('purchase_requisition_items')
        .select('*')
        .eq('pr_id', prId);

      if (itemsError) throw itemsError;
      if (!prItems || prItems.length === 0) throw new Error('No items in this PR');

      // 3. Create PO
      const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const newPO: any = {
        hotel_id: selectedHotelId,
        po_number: poNumber,
        pr_id: prId,
        pr_number: pr.prNumber, // Save PR number for reference
        status: 'Draft',
        priority: pr.priority,
        total_amount: pr.totalAmount, // Copy total amount
        order_date: new Date().toISOString().split('T')[0],
        notes: `Converted from PR ${pr.prNumber}. ${pr.notes || ''}`
      };

      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert(newPO)
        .select()
        .single();

      if (poError) throw poError;
      if (!poData) throw new Error('Failed to create PO');

      // 4. Create PO Items from PR Items
      const poItems = prItems.map(item => ({
        po_id: poData.id,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        specification: item.specification,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.estimated_unit_price || 0, // Map estimated price to unit price
        amount: item.estimated_amount || 0,
        received_quantity: 0,
        notes: item.notes
      }));

      const { error: itemsInsertError } = await supabase
        .from('purchase_order_items')
        .insert(poItems);

      if (itemsInsertError) throw itemsInsertError;

      alert(`已成功轉為採購單: ${poNumber}`);

      // Refresh data
      await fetchInitialData();

    } catch (error: any) {
      console.error('Error converting PR to PO:', error);
      alert(`轉單失敗: ${error.message}`);
    }
  };

  const hotelRooms = useMemo(() => {
    return rooms
      .filter(r => r.hotelId === selectedHotelId)
      .sort((a, b) => {
        // Sort by Building Code/Name first
        const buildA = buildings.find(bg => bg.id === a.buildingId)?.code || '';
        const buildB = buildings.find(bg => bg.id === b.buildingId)?.code || '';
        if (buildA !== buildB) return buildA.localeCompare(buildB);

        // Then by Room Number
        return a.number.localeCompare(b.number, undefined, { numeric: true });
      })
      .map((room, index) => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentOrder = reservations.find(res => {
          if (res.hotelId !== selectedHotelId || res.roomNumber !== room.number) return false;

          // CheckedIn status always shows
          if (res.status === 'CheckedIn') return true;

          // Confirmed status shows if:
          // 1. Check-in date is today (upcoming check-in), OR
          // 2. Check-in date has passed AND check-out date is in the future or today (guest should still be here)
          if (res.status === 'Confirmed') {
            const checkInDate = res.checkIn?.substring(0, 10);
            const checkOutDate = res.checkOut?.substring(0, 10);

            // Today's check-in
            if (checkInDate === today) return true;

            // Past check-in but not yet checked out (checkIn <= today < checkOut)
            if (checkInDate && checkOutDate && checkInDate <= today && checkOutDate > today) return true;
          }

          return false;
        });
        const latestNote = roomNotes.find(n => String(n.roomId) === String(room.id));

        // DEBUG: Log first room's check to allow analysis without flooding
        if (index === 0) {
          console.log('[App Debug] Checking Room:', room.id, room.number);
          console.log('[App Debug] Available Notes:', roomNotes.length, roomNotes.map(n => ({ id: n.id, roomId: n.roomId })));
          console.log('[App Debug] Match Found?', latestNote);
        }
        return { ...room, current_order: currentOrder, latest_note: latestNote };
      });
  }, [rooms, reservations, selectedHotelId, roomNotes]);

  if (!currentUser) return <LoginScreen staffList={staff.length > 0 ? staff : MOCK_STAFF} onLogin={(s) => { setCurrentUser(s); if (s.authorizedHotels.length > 0) setSelectedHotelId(s.authorizedHotels[0]); }} />;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <Navbar
        hotels={hotels.filter(h => currentUser.role === 'GroupAdmin' || currentUser.authorizedHotels.includes(h.id))}
        selectedHotelId={selectedHotelId}
        setSelectedHotelId={setSelectedHotelId}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        realtimeStatus={realtimeStatus}
        lastSyncTime={lastSyncTime}
        pendingApprovalCount={pendingApprovals.length}
        onPendingApprovalClick={() => setActiveTab('Workflow')}
      />
      <div className="flex flex-1 pt-16 no-print overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} isOpen={isSidebarOpen} />
        <main ref={mainContentRef} className="flex-1 p-6 lg:p-10 overflow-y-auto transition-all duration-300">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="font-black uppercase tracking-widest text-[10px]">Security Syncing...</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              {activeTab === 'Dashboard' && <RoomGrid
                rooms={hotelRooms as Room[]}
                buildings={buildings.filter(b => b.hotelId === selectedHotelId)}
                hotel={hotels.find(h => h.id === selectedHotelId)}
                onRoomClick={(r) => { setSelectedRoomId(r.id); setIsActionMenuOpen(true); }}
                cleaningTasks={cleaningTasks.filter(t => t.hotelId === selectedHotelId)}
                housekeepers={housekeepers.filter(h => h.hotelId === selectedHotelId)}
                onAssignHousekeeper={async (taskId, housekeeperId, housekeeperName) => {
                  try {
                    await supabase.from('daily_cleaning_tasks').update({
                      housekeeper_id: housekeeperId,
                      housekeeper_name: housekeeperName,
                      status: 'InProgress',
                      assigned_at: new Date().toISOString(),
                      started_at: new Date().toISOString()
                    }).eq('id', taskId);
                    setCleaningTasks(prev => prev.map(t => t.id === taskId ? {
                      ...t,
                      housekeeperId,
                      housekeeperName,
                      status: 'InProgress',
                      assignedAt: new Date().toISOString(),
                      startedAt: new Date().toISOString()
                    } : t));
                  } catch (e: any) {
                    alert(`指派失敗: ${e.message}`);
                  }
                }}
                onUnassignHousekeeper={async (taskId) => {
                  try {
                    await supabase.from('daily_cleaning_tasks').update({
                      housekeeper_id: null,
                      housekeeper_name: null,
                      status: 'Unassigned',
                      assigned_at: null,
                      started_at: null
                    }).eq('id', taskId);
                    setCleaningTasks(prev => prev.map(t => t.id === taskId ? {
                      ...t,
                      housekeeperId: undefined,
                      housekeeperName: undefined,
                      status: 'Unassigned',
                      assignedAt: undefined,
                      startedAt: undefined
                    } : t));
                  } catch (e: any) {
                    alert(`取消分派失敗: ${e.message}`);
                  }
                }}
                onCheckIn={async (resId) => {
                  try {
                    const res = reservations.find(r => r.id === resId);
                    if (!res) {
                      alert('找不到該預約訂單');
                      return;
                    }

                    // Calculate balance due
                    const balanceDue = (res.totalPrice || 0) - (res.paidAmount || 0) - (res.discount || 0);

                    // If there's an outstanding balance, open order details modal for payment
                    if (balanceDue > 0) {
                      // Find the room ID for this reservation
                      const targetRoom = rooms.find(r => r.hotelId === selectedHotelId && r.number === res.roomNumber);
                      if (targetRoom) {
                        setSelectedRoomId(targetRoom.id);
                        setIsOrderOpen(true);
                        alert(`尚有餘額 $${balanceDue.toLocaleString()} 未繳清，請先完成收款後再辦理入住。`);
                      }
                      return;
                    }

                    // Balance is clear, proceed with check-in
                    // Update reservation status to CheckedIn
                    await supabase.from('reservations').update({
                      status: 'CheckedIn',
                      last_edited_by: currentUser?.name || 'System'
                    }).eq('id', resId);

                    // Update room status to OC
                    await supabase.from('rooms').update({ status: 'OC' })
                      .eq('number', res.roomNumber)
                      .eq('hotel_id', selectedHotelId);

                    // Update local state
                    setReservations(prev => prev.map(r => r.id === resId ? { ...r, status: 'CheckedIn' } : r));
                    setRooms(prev => prev.map(r =>
                      r.hotelId === selectedHotelId && r.number === res.roomNumber
                        ? { ...r, status: RoomStatus.OC }
                        : r
                    ));

                    alert(`${res.guestName} 已成功入住房間 ${res.roomNumber}！`);
                  } catch (e: any) {
                    alert(`入住失敗: ${e.message}`);
                  }
                }}
                onCancelCheckIn={async (resId) => {
                  try {
                    const res = reservations.find(r => r.id === resId);
                    if (!res) {
                      alert('找不到該預約訂單');
                      return;
                    }

                    // Update reservation status back to Confirmed
                    await supabase.from('reservations').update({
                      status: 'Confirmed',
                      last_edited_by: currentUser?.name || 'System'
                    }).eq('id', resId);

                    // Update room status back to VC
                    await supabase.from('rooms').update({ status: 'VC' })
                      .eq('number', res.roomNumber)
                      .eq('hotel_id', selectedHotelId);

                    // Update local state
                    setReservations(prev => prev.map(r => r.id === resId ? { ...r, status: 'Confirmed' } : r));
                    setRooms(prev => prev.map(r =>
                      r.hotelId === selectedHotelId && r.number === res.roomNumber
                        ? { ...r, status: RoomStatus.VC }
                        : r
                    ));

                    alert(`${res.guestName} 的入住已取消，房間 ${res.roomNumber} 已恢復為預約狀態。`);
                  } catch (e: any) {
                    alert(`取消入住失敗: ${e.message}`);
                  }
                }}
                recentlyUpdatedRooms={recentlyUpdatedRooms}
              />}
              {activeTab === 'Staff' && (
                <StaffManagement staff={staff} setStaff={setStaff} currentUser={currentUser} hotels={hotels} departments={departments} systemRoles={systemRoles} />
              )}
              {activeTab === 'RoleManagement' && (
                <div className="space-y-6">
                  <header>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">系統角色管理</h1>
                    <p className="text-slate-500 text-sm">管理系統中可使用的角色類型與權限等級。</p>
                  </header>
                  <RoleManagement roles={systemRoles} setRoles={setSystemRoles} />
                </div>
              )}
              {activeTab === 'DepartmentManagement' && (
                <DepartmentManagement departments={departments} setDepartments={setDepartments} staff={staff} />
              )}
              {activeTab === 'HotelManagement' && <HotelManagement hotels={hotels} setHotels={async (newHotels) => {
                // 這裡簡化處理，實際開發中應對應到具體的新增/刪除 Action
                setHotels(newHotels);
              }} />}
              {activeTab === 'BuildingManagement' && <BuildingManagement
                buildings={buildings}
                setBuildings={async (newBuildings) => {
                  // 判斷是新增還是刪除 (此處僅為 state 同步，DB 操作已在 BuildingManagement 中被呼叫嗎？)
                  // 不，原組件只是呼叫 setBuildings。我們需要在這裡或組件內補齊 DB 操作。
                  setBuildings(newBuildings);
                }}
                selectedHotelId={selectedHotelId}
                currentHotelName={hotels.find(h => h.id === selectedHotelId)?.name || ''}
              />}
              {activeTab === 'RoomSettings' && <RoomSettings
                rooms={rooms}
                setRooms={async (newRooms) => {
                  setRooms(newRooms);
                }}
                selectedHotelId={selectedHotelId}
                hotels={hotels}
                buildings={buildings}
              />}
              {activeTab === 'DatabaseManagement' && <DatabaseManagement />}
              {activeTab === 'ActivityLog' && <ActivityLog logs={auditLogs} />}
              {activeTab === 'DailyArrivals' && <DailyArrivals
                reservations={reservations.filter(r => r.hotelId === selectedHotelId)}
                rooms={rooms.filter(r => r.hotelId === selectedHotelId)}
                onCheckIn={async (resId) => {
                  const res = reservations.find(r => r.id === resId);
                  if (!res) return;

                  // Check payment status first
                  const balanceDue = (res.totalPrice || 0) - (res.paidAmount || 0) - (res.discount || 0);
                  if (balanceDue > 0) {
                    // Open Order Details Modal for Payment
                    const room = rooms.find(r => r.number === res.roomNumber && r.hotelId === selectedHotelId);
                    if (room) {
                      setSelectedRoomId(room.id);
                      setSelectedOldReservation(res); // Pass the reservation
                      setIsOrderOpen(true);
                    } else {
                      alert(`找不到房號 ${res.roomNumber} 的房間資料`);
                    }
                    return;
                  }

                  // 0. Auto-Fix: 如果是當日休息訂單且退房時間已過 (例如預設 11:00 但現在是 18:00)，自動延後 3 小時
                  const now = new Date();
                  // Parse dates robustly (replace space with T for ISO compatibility)
                  const checkInTimeStr = res.checkIn.replace(' ', 'T');
                  const checkOutTimeStr = res.checkOut.replace(' ', 'T');

                  const checkInDateObj = new Date(checkInTimeStr);
                  const checkOutDateObj = new Date(checkOutTimeStr);

                  // 檢查是否為同一天 (忽略時間)
                  const isSameDay = checkInDateObj.toDateString() === checkOutDateObj.toDateString();

                  // 判斷是否需要自動修正退房時間：
                  // 1. 同一天 且 退房時間 <= 入住時間 (不合理的設定，例如入住 18:00，退房 11:00)
                  // 2. 或者 同一天 且 退房時間已過 (例如現在 19:00，但退房設定 15:00)
                  const isCheckoutBeforeCheckin = checkOutDateObj <= checkInDateObj;
                  const isCheckoutAlreadyPassed = checkOutDateObj < now;

                  if (isSameDay && (isCheckoutBeforeCheckin || isCheckoutAlreadyPassed)) {
                    const newCheckOutDate = new Date(now.getTime() + 3 * 60 * 60 * 1000); // Now + 3hr

                    // Format to YYYY-MM-DD HH:mm
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const newCheckOutStr = `${newCheckOutDate.getFullYear()}-${pad(newCheckOutDate.getMonth() + 1)}-${pad(newCheckOutDate.getDate())} ${pad(newCheckOutDate.getHours())}:${pad(newCheckOutDate.getMinutes())}`;

                    console.log(`[Auto-Fix] Extending checkout time for Rest booking from ${res.checkOut} to ${newCheckOutStr}`);

                    // Update DB check_out
                    await supabase.from('reservations').update({ check_out: newCheckOutStr }).eq('id', resId);

                    // Update Local res object for subsequent usage
                    res.checkOut = newCheckOutStr;
                  }

                  // 1. Update DB Status
                  await supabase.from('reservations').update({ status: 'CheckedIn' }).eq('id', resId);
                  await supabase.from('rooms').update({ status: 'OC' }).eq('number', res.roomNumber).eq('hotel_id', selectedHotelId);

                  // 2. Update Local State
                  setReservations(prev => prev.map(r => r.id === resId ? { ...r, status: 'CheckedIn', checkOut: res.checkOut } : r));
                  setRooms(prev => prev.map(r => r.hotelId === selectedHotelId && r.number === res.roomNumber ? { ...r, status: RoomStatus.OC } : r));

                  // alert removed for smoother UX
                }}
              />}
              {activeTab === 'Reservations' && <ReservationManagement
                reservations={reservations.filter(r => r.hotelId === selectedHotelId)}
                onComplexSave={handleComplexSave}
                rooms={rooms.filter(r => r.hotelId === selectedHotelId)}
                buildings={buildings.filter(b => b.hotelId === selectedHotelId)}
                guests={guests}
                currentUser={currentUser}
                hotelId={selectedHotelId}
                billableItems={billableItems}
                consumptionItems={consumptionItems}
                transactions={transactions}
                onUpdateBillableItems={async (items, reservationId) => {
                  // This handler will be fully implemented in App.tsx or handled locally in ReservationManagement 
                  // but we should provide state setter or DB logic here.
                  // Actually, let's keep logic inside ReservationManagement or move here.
                  // Ideally ReservationManagement calls DB directly for items? No, better via App props or helper.
                  // Let's rely on onComplexSave or a new handler.
                  // Since billable items might be edited independently, let's add specific handlers.
                  // For now, let's pass state and setter.
                  setBillableItems(items);
                }}
                onCancel={async (id) => {
                  const idStr = String(id);
                  if (!window.confirm(`確定要取消訂單 #${idStr} 嗎？此操作無法復原。\n(Are you sure to cancel #${idStr}?)`)) {
                    return;
                  }

                  try {
                    console.log('Starting cancellation for:', idStr);

                    // 1. Update DB Status and SELECT result to verify
                    const { data, error } = await supabase
                      .from('reservations')
                      .update({
                        status: 'Cancelled',
                        last_edited_by: currentUser?.name || 'System'
                      })
                      .eq('id', idStr)
                      .select();

                    if (error) {
                      console.error('Supabase Error:', error);
                      // Showing exact error for debugging
                      throw new Error(`DB Error: ${error.message} (${error.code})`);
                    }

                    // Check if any row was actually updated
                    const dbUpdated = data && data.length > 0;
                    if (!dbUpdated) {
                      console.warn(`[WARNING] DB update returned 0 rows for ID: ${idStr}. Possible RLS or ID mismatch. Proceeding with local update.`);
                      // We do NOT throw here anymore. We proceed optimistically but warn.
                    }

                    // 2. Find target reservation in local state (use string comparison for ID type safety)
                    const targetRes = reservations.find(r => String(r.id) === idStr);

                    if (targetRes) {
                      // 3. Update Local State (Reservations)
                      setReservations(prev => prev.map(r => String(r.id) === idStr ? { ...r, status: 'Cancelled' } : r));

                      // 4. Update Room Status if a room was assigned
                      if (targetRes.roomNumber) {
                        // Mark room as VD (Vacant Dirty) when order is cancelled
                        // We do this independently of reservation update success to ensure room is freed
                        const { error: roomError } = await supabase.from('rooms')
                          .update({ status: 'VD' })
                          .eq('number', targetRes.roomNumber)
                          .eq('hotel_id', selectedHotelId);

                        if (roomError) console.error('Room update error:', roomError);

                        setRooms(prev => prev.map(r =>
                          r.hotelId === selectedHotelId && r.number === targetRes.roomNumber
                            ? { ...r, status: RoomStatus.VD }
                            : r
                        ));
                      }
                    } else {
                      console.warn('Reservation not found in local state but DB action was attempted');
                    }

                    // Success Message
                    if (dbUpdated) {
                      alert(`訂單 #${idStr} 已成功取消`);
                    } else {
                      alert(`訂單 #${idStr} 已在本機標記為取消 (伺服器端未回傳確認，請重新整理確認)`);
                    }

                  } catch (e: any) {
                    console.error('Cancel failed:', e);
                    alert(`取消失敗: ${e.message || '未知錯誤'}`);
                  }
                }}
              />}
              {activeTab === 'Accounting' && <Accounting
                invoices={invoices}
                hotelId={selectedHotelId}
                currentUserName={currentUser?.name || ''}
                currentUserRole={currentUser?.role || ''}
                currentUserId={currentUser?.id || ''}
                accounts={chartOfAccounts}
                journalEntries={journalEntries}
                generalLedgers={generalLedgers}
                onAddAccount={async (account) => {
                  const id = crypto.randomUUID();
                  const newAccount = { id, ...account, createdAt: new Date().toISOString() } as ChartOfAccount;
                  setChartOfAccounts(prev => [...prev, newAccount]);
                }}
                onUpdateAccount={async (id, account) => {
                  setChartOfAccounts(prev => prev.map(a => a.id === id ? { ...a, ...account, updatedAt: new Date().toISOString() } : a));
                }}
                onDeleteAccount={async (id) => {
                  setChartOfAccounts(prev => prev.filter(a => a.id !== id));
                }}
                onAddJournalEntry={async (entry, lines) => {
                  const { success, message, entryId } = await AccountingService.createManualJournal(entry, lines);
                  if (success && entryId) {
                    const newEntry = { ...entry, id: entryId, createdAt: new Date().toISOString(), lines: lines.map(l => ({ ...l, id: crypto.randomUUID(), entryId })) } as JournalEntry;
                    setJournalEntries(prev => [newEntry, ...prev]);
                  } else {
                    alert(`新增失敗: ${message}`);
                  }
                }}
                onPostJournalEntry={async (id) => {
                  const { success, message } = await AccountingService.postJournalEntry(id);
                  if (success) {
                    setJournalEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'Posted', postingDate: new Date().toISOString().split('T')[0] } : e));
                    // Refresh Ledgers ideally
                  } else {
                    alert(`過帳失敗: ${message}`);
                  }
                }}
                onVoidJournalEntry={async (id) => {
                  const { success, message } = await AccountingService.voidJournalEntry(id);
                  if (success) {
                    setJournalEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'Voided' } : e));
                  } else {
                    alert(`作廢失敗: ${message}`);
                  }
                }}
                onRevertJournalEntry={handleRevertJournalEntry}
                onUpdateJournalEntry={handleUpdateJournalEntry}
                onDeleteJournalEntry={handleDeleteJournalEntry}
              />}
              {activeTab === 'InvoiceSequence' && <InvoiceSequenceManagement hotels={hotels} selectedHotelId={selectedHotelId} />}
              {activeTab === 'Guests' && <GuestManagement guests={guests} setGuests={setGuests} reservations={reservations} hotels={hotels} buildings={buildings} currentHotel={hotels.find(h => h.id === selectedHotelId)!} currentUser={currentUser} countries={countries} />}
              {activeTab === 'Handover' && <HandoverManagement currentUser={currentUser} selectedHotelId={selectedHotelId} hotels={hotels} />}
              {activeTab === 'Housekeeping' && <HousekeepingOps
                cleaningTasks={cleaningTasks.filter(t => t.hotelId === selectedHotelId)}
                housekeepers={housekeepers.filter(h => h.hotelId === selectedHotelId)}
                rooms={rooms.filter(r => r.hotelId === selectedHotelId)}
                hotelId={selectedHotelId}
                onAddHousekeeper={async (hk) => {
                  try {
                    const id = hk.id || `hk-${Date.now()}`;
                    const { error } = await supabase.from('housekeepers').insert({
                      id,
                      hotel_id: selectedHotelId,
                      employee_id: hk.employeeId || `HK${Math.floor(100 + Math.random() * 900)}`,
                      name: hk.name,
                      phone: hk.phone || '',
                      status: hk.status || 'Active',
                      assigned_floor: hk.assignedFloor || '',
                      cleaned_today: 0
                    });
                    if (error) throw error;
                    setHousekeepers(prev => [...prev, {
                      id,
                      hotelId: selectedHotelId,
                      employeeId: hk.employeeId || `HK${Math.floor(100 + Math.random() * 900)}`,
                      name: hk.name || '',
                      phone: hk.phone || '',
                      status: (hk.status as any) || 'Active',
                      assignedFloor: hk.assignedFloor || '',
                      cleanedToday: 0
                    }]);
                  } catch (e: any) {
                    alert(`新增失敗: ${e.message}`);
                  }
                }}
                onUpdateHousekeeper={async (id, data) => {
                  try {
                    const { error } = await supabase.from('housekeepers').update({
                      name: data.name,
                      phone: data.phone,
                      employee_id: data.employeeId,
                      status: data.status,
                      assigned_floor: data.assignedFloor
                    }).eq('id', id);
                    if (error) throw error;
                    setHousekeepers(prev => prev.map(h => h.id === id ? { ...h, ...data } : h));
                  } catch (e: any) {
                    alert(`更新失敗: ${e.message}`);
                  }
                }}
                onDeleteHousekeeper={async (id) => {
                  try {
                    const { error } = await supabase.from('housekeepers').delete().eq('id', id);
                    if (error) throw error;
                    setHousekeepers(prev => prev.filter(h => h.id !== id));
                  } catch (e: any) {
                    alert(`刪除失敗: ${e.message}`);
                  }
                }}
                onManualAssign={async (roomId, roomNumber, housekeeperId, housekeeperName, taskType) => {
                  try {
                    const today = new Date().toISOString().split('T')[0];
                    const newTaskId = `ct-${Date.now()}-${roomId}`;
                    const newTask = {
                      id: newTaskId,
                      hotel_id: selectedHotelId,
                      room_id: roomId,
                      room_number: roomNumber,
                      task_date: today,
                      task_type: taskType,
                      priority: 'Normal',
                      status: 'InProgress',
                      housekeeper_id: housekeeperId,
                      housekeeper_name: housekeeperName,
                      assigned_at: new Date().toISOString(),
                      started_at: new Date().toISOString()
                    };
                    const { error } = await supabase.from('daily_cleaning_tasks').insert(newTask);
                    if (error) {
                      if (error.code === '42P01') {
                        alert('資料庫表格尚未建立。請先在 Supabase 執行 migrations/001_create_cleaning_tasks.sql');
                        return;
                      }
                      throw error;
                    }
                    setCleaningTasks(prev => [...prev, {
                      id: newTaskId,
                      hotelId: selectedHotelId,
                      roomId,
                      roomNumber,
                      taskDate: today,
                      taskType,
                      priority: 'Normal',
                      status: 'InProgress',
                      housekeeperId,
                      housekeeperName,
                      assignedAt: new Date().toISOString(),
                      startedAt: new Date().toISOString()
                    }]);
                    alert(`已將房間 ${roomNumber} 分配給 ${housekeeperName}`);
                  } catch (e: any) {
                    alert(`手動分配失敗: ${e.message}`);
                  }
                }}
                onAssign={async (taskId, housekeeperId, housekeeperName) => {
                  try {
                    await supabase.from('daily_cleaning_tasks').update({
                      housekeeper_id: housekeeperId,
                      housekeeper_name: housekeeperName,
                      status: 'InProgress',
                      assigned_at: new Date().toISOString(),
                      started_at: new Date().toISOString()
                    }).eq('id', taskId);
                    setCleaningTasks(prev => prev.map(t => t.id === taskId ? {
                      ...t,
                      housekeeperId,
                      housekeeperName,
                      status: 'InProgress',
                      assignedAt: new Date().toISOString(),
                      startedAt: new Date().toISOString()
                    } : t));
                  } catch (e: any) {
                    alert(`指派失敗: ${e.message}`);
                  }
                }}
                onUnassign={async (taskId) => {
                  try {
                    await supabase.from('daily_cleaning_tasks').update({
                      housekeeper_id: null,
                      housekeeper_name: null,
                      status: 'Unassigned',
                      assigned_at: null,
                      started_at: null
                    }).eq('id', taskId);
                    setCleaningTasks(prev => prev.map(t => t.id === taskId ? {
                      ...t,
                      housekeeperId: undefined,
                      housekeeperName: undefined,
                      status: 'Unassigned',
                      assignedAt: undefined,
                      startedAt: undefined
                    } : t));
                  } catch (e: any) {
                    alert(`取消分派失敗: ${e.message}`);
                  }
                }}
                onDeleteTask={async (taskId) => {
                  if (!window.confirm("確定要永久刪除此清掃任務嗎？(此操作無法復原)")) return;
                  try {
                    const { error } = await supabase.from('daily_cleaning_tasks').delete().eq('id', taskId);
                    if (error) throw error;
                    setCleaningTasks(prev => prev.filter(t => t.id !== taskId));
                    alert("清掃任務已刪除");
                  } catch (e: any) {
                    alert(`刪除失敗: ${e.message}`);
                  }
                }}
                onUpdateStatus={async (taskId, status) => {
                  try {
                    console.log(`[Housekeeping] Updating task ${taskId} to status: ${status}`);
                    const updateData: any = { status };

                    // 1. Find the task in local state to get roomId and taskType
                    const task = cleaningTasks.find(t => t.id === taskId);

                    if (!task) {
                      console.error(`[Housekeeping] Task ${taskId} not found in local state!`);
                      alert('找不到該清掃任務，請重新整理頁面。');
                      return;
                    }

                    if (status === 'Completed') {
                      updateData.completed_at = new Date().toISOString();

                      // 2. Determine appropriate room status transition
                      // Only VD (Vacant Dirty) should move to VC (Vacant Clean)
                      // SO (Stay Over) tasks should remain OC (Occupied) or similar

                      // Fix: check actual room status in state as well, not just task type snapshot
                      const currentRoom = rooms.find(r => r.id === task.roomId);

                      if (task.taskType === 'VD' || (currentRoom && currentRoom.status === 'VD')) {
                        console.log(`[Housekeeping] Room ${task.roomNumber} (ID: ${task.roomId}) is VD. Moving to VC.`);
                        const { error: roomError } = await supabase.from('rooms').update({ status: 'VC' }).eq('id', task.roomId);
                        if (roomError) {
                          console.error('[Housekeeping] Failed to update room status:', roomError);
                          throw new Error(`Room Update Failed: ${roomError.message}`);
                        }

                        // Update local room state
                        setRooms(prev => prev.map(r => r.id === task.roomId ? { ...r, status: RoomStatus.VC } : r));
                      } else {
                        console.log(`[Housekeeping] Room ${task.roomNumber} (ID: ${task.roomId}) is task type ${task.taskType}, Room Status: ${currentRoom?.status}. Room status remains unchanged.`);
                      }
                    }

                    // 3. Update task status in DB
                    const { error: taskError } = await supabase.from('daily_cleaning_tasks').update(updateData).eq('id', taskId);
                    if (taskError) {
                      console.error('[Housekeeping] Failed to update task status:', taskError);
                      throw new Error(`Task Update Failed: ${taskError.message}`);
                    }

                    // 4. Update local task state
                    setCleaningTasks(prev => prev.map(t => t.id === taskId ? {
                      ...t,
                      status,
                      completedAt: status === 'Completed' ? new Date().toISOString() : t.completedAt
                    } : t));

                    if (status === 'Completed') {
                      // alert(`房間 ${task.roomNumber} 清掃任務已完成！`); // Removed user alert
                    }
                  } catch (e: any) {
                    console.error('[Housekeeping] onUpdateStatus error:', e);
                    alert(`更新狀態失敗: ${e.message}`);
                  }
                }}
                onGenerateTasks={async () => {
                  try {
                    const today = new Date().toISOString().split('T')[0];
                    // Include VD, SO, and OC rooms (OOO needs manual emergency assignment)
                    const hotelRoomsToCheck = rooms.filter(r =>
                      r.hotelId === selectedHotelId &&
                      (r.status === 'VD' || r.status === 'SO' || r.status === 'OC')
                    );

                    // Filter out rooms that already have an uncompleted task today
                    const existingUncompletedRoomIds = new Set(
                      cleaningTasks
                        .filter(t => t.hotelId === selectedHotelId && t.taskDate === today && t.status !== 'Completed' && t.status !== 'Inspected')
                        .map(t => t.roomId)
                    );

                    const newTasks = hotelRoomsToCheck
                      .filter(room => !existingUncompletedRoomIds.has(room.id))
                      .map(room => ({
                        id: `ct-${Date.now()}-${room.id}`,
                        hotel_id: selectedHotelId,
                        room_id: room.id,
                        room_number: room.number,
                        task_date: today,
                        task_type: room.status === 'VD' ? 'VD' : 'SO',
                        priority: 'Normal',
                        status: 'Unassigned'
                      }));

                    if (newTasks.length === 0) {
                      alert('今日沒有需要新增清掃任務的房間（所有需清掃房間已有待處理任務）');
                      return;
                    }

                    const { error } = await supabase.from('daily_cleaning_tasks').insert(newTasks);
                    if (error) {
                      if (error.code === '42P01') {
                        alert('資料庫表格尚未建立。請先在 Supabase 執行 migrations/001_create_cleaning_tasks.sql');
                        return;
                      }
                      throw error;
                    }

                    // Refresh tasks
                    const { data } = await supabase.from('daily_cleaning_tasks').select('*').eq('hotel_id', selectedHotelId).eq('task_date', today);
                    if (data) {
                      setCleaningTasks(prev => [...prev.filter(t => t.hotelId !== selectedHotelId || t.taskDate !== today), ...data.map(t => ({
                        id: t.id,
                        hotelId: t.hotel_id,
                        roomId: t.room_id,
                        roomNumber: t.room_number,
                        taskDate: t.task_date,
                        taskType: t.task_type,
                        priority: t.priority,
                        status: t.status,
                        housekeeperId: t.housekeeper_id,
                        housekeeperName: t.housekeeper_name,
                        assignedAt: t.assigned_at,
                        startedAt: t.started_at,
                        completedAt: t.completed_at,
                        notes: t.notes,
                        exceptions: t.exceptions
                      }))]);
                    }
                    alert(`成功建立 ${newTasks.length} 個清掃任務`);
                  } catch (e: any) {
                    alert(`產生任務失敗: ${e.message}`);
                  }
                }}
              />}

              {/* 進銷存與採購系統 */}
              {activeTab === 'DocumentTypes' && <DocumentTypeSettings
                documentTypes={documentTypes}
                onAdd={async (dt) => {
                  const id = crypto.randomUUID();
                  await supabase.from('document_types').insert({ id, ...dt });
                  setDocumentTypes(prev => [...prev, { id, ...dt } as DocumentType]);
                }}
                onUpdate={async (id, dt) => {
                  await supabase.from('document_types').update(dt).eq('id', id);
                  setDocumentTypes(prev => prev.map(d => d.id === id ? { ...d, ...dt } : d));
                }}
                onDelete={async (id) => {
                  await supabase.from('document_types').delete().eq('id', id);
                  setDocumentTypes(prev => prev.filter(d => d.id !== id));
                }}
              />}

              {activeTab === 'DocumentSearch' && <DocumentSearch
                hotels={hotels}
                selectedHotelId={selectedHotelId}
                currentUser={currentUser}
                reservations={reservations}
                purchaseRequisitions={purchaseRequisitions}
                purchaseOrders={purchaseOrders}
                goodsReceipts={goodsReceipts}
                goodsIssues={goodsIssues}
                stockTransfers={stockTransfers}
                pettyCashTransactions={pettyCashTransactions}
                allStaff={staff}
              />}

              {activeTab === 'Inventory' && <InventoryManagement
                hotels={hotels}
                selectedHotelId={selectedHotelId}
                warehouses={warehouses}
                inventoryItems={inventoryItems}
                inventoryRecords={inventoryRecords}
                accounts={chartOfAccounts}
                onAddWarehouse={async (wh) => {
                  const id = crypto.randomUUID();
                  await supabase.from('warehouses').insert({ id, hotel_id: wh.hotelId, code: wh.code, name: wh.name, location: wh.location, manager_name: wh.managerName, is_active: wh.isActive });
                  setWarehouses(prev => [...prev, { id, ...wh } as Warehouse]);
                }}
                onUpdateWarehouse={async (id, wh) => {
                  await supabase.from('warehouses').update({ name: wh.name, location: wh.location, is_active: wh.isActive }).eq('id', id);
                  setWarehouses(prev => prev.map(w => w.id === id ? { ...w, ...wh } : w));
                }}
                onDeleteWarehouse={async (id) => {
                  await supabase.from('warehouses').delete().eq('id', id);
                  setWarehouses(prev => prev.filter(w => w.id !== id));
                }}
                onAddItem={async (item) => {
                  const id = crypto.randomUUID();
                  await supabase.from('inventory_items').insert({ id, ...item });
                  setInventoryItems(prev => [...prev, { id, ...item } as InventoryItem]);
                }}
                onUpdateItem={async (id, item) => {
                  await supabase.from('inventory_items').update(item).eq('id', id);
                  setInventoryItems(prev => prev.map(i => i.id === id ? { ...i, ...item } : i));
                }}
                onDeleteItem={async (id) => {
                  await supabase.from('inventory_items').delete().eq('id', id);
                  setInventoryItems(prev => prev.filter(i => i.id !== id));
                }}
              />}

              {activeTab === 'Procurement' && <ProcurementManagement
                hotels={hotels}
                selectedHotelId={selectedHotelId}
                currentUser={currentUser}
                allStaff={staff}
                documentTypes={documentTypes}
                suppliers={suppliers}
                inventoryItems={inventoryItems}
                purchaseRequisitions={purchaseRequisitions}
                purchaseOrders={purchaseOrders}
                accounts={chartOfAccounts}
                onAddPR={async (pr, items) => {
                  const id = crypto.randomUUID();
                  const prNumber = `PR-${Date.now()}`;
                  await supabase.from('purchase_requisitions').insert({ id, pr_number: prNumber, ...pr });
                  for (const item of items) await supabase.from('purchase_requisition_items').insert({ id: crypto.randomUUID(), pr_id: id, ...item });
                  setPurchaseRequisitions(prev => [...prev, { id, prNumber, ...pr } as any]);
                }}
                onUpdatePRStatus={async (prId, status) => {
                  await supabase.from('purchase_requisitions').update({ status }).eq('id', prId);
                  setPurchaseRequisitions(prev => prev.map(p => p.id === prId ? { ...p, status } : p));
                }}
                onSubmitForApproval={async (docId, docType, nextApproverId) => {
                  const doc = docType === 'PURCHASE_REQUISITION'
                    ? purchaseRequisitions.find(p => p.id === docId)
                    : purchaseOrders.find(p => p.id === docId);

                  if (!doc || !currentUser) return;

                  const result = await WorkflowService.startWorkflow(
                    docId,
                    docType as any,
                    (doc as any).prNumber || (doc as any).poNumber || '',
                    currentUser.id,
                    currentUser.name,
                    (doc as any).totalAmount,
                    nextApproverId
                  );

                  alert(result.message);
                  if (result.success) {
                    // Update local status to Pending
                    if (docType === 'PURCHASE_REQUISITION') {
                      setPurchaseRequisitions(prev => prev.map(p => p.id === docId ? { ...p, status: 'Pending' } : p));
                    } else {
                      setPurchaseOrders(prev => prev.map(p => p.id === docId ? { ...p, status: 'Pending' } : p));
                    }

                    // Live Update for Workflow Instances & Pending Approvals
                    if (result.instanceId) {
                      const { data: newInst } = await supabase
                        .from('workflow_instances')
                        .select('*, definition:workflow_definitions(*, steps:workflow_steps(*))')
                        .eq('id', result.instanceId)
                        .single();

                      if (newInst) {
                        const mappedInst: any = {
                          id: newInst.id,
                          workflowId: newInst.workflow_id,
                          workflowName: newInst.definition?.name,
                          documentId: newInst.document_id,
                          documentType: newInst.document_type,
                          documentNumber: newInst.document_number,
                          currentStep: newInst.current_step,
                          status: newInst.status,
                          initiatedBy: newInst.initiated_by,
                          initiatedAt: newInst.initiated_at,
                          completedAt: newInst.completed_at,
                          notes: newInst.notes
                        };
                        setWorkflowInstances(prev => [...prev, mappedInst]);

                        if (newInst.status === 'Pending') {
                          const currentStepDef = newInst.definition?.steps?.find((s: any) => s.step_sequence === newInst.current_step);
                          setPendingApprovals(prev => [...prev, {
                            workflowInstanceId: newInst.id,
                            documentId: newInst.document_id,
                            documentType: newInst.document_type,
                            documentNumber: newInst.document_number,
                            requesterId: '',
                            requesterName: newInst.initiated_by,
                            requestedAt: newInst.initiated_at,
                            currentStepName: currentStepDef?.step_name || `步驟 ${newInst.current_step}`,
                            priority: 'Normal',
                            amount: (doc as any).totalAmount || 0
                          }]);
                        }
                      }
                    }
                  }
                }}
                onAddPO={async (po, items) => {
                  const id = crypto.randomUUID();
                  const poNumber = `PO-${Date.now()}`;
                  await supabase.from('purchase_orders').insert({ id, po_number: poNumber, ...po });
                  for (const item of items) await supabase.from('purchase_order_items').insert({ id: crypto.randomUUID(), po_id: id, ...item });
                  setPurchaseOrders(prev => [...prev, { id, poNumber, ...po } as any]);
                }}
                onUpdatePOStatus={async (poId, status) => {
                  await supabase.from('purchase_orders').update({ status }).eq('id', poId);
                  setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status } : p));
                }}
                onAddSupplier={async (s) => {
                  const id = crypto.randomUUID();
                  await supabase.from('suppliers').insert({ id, ...s });
                  setSuppliers(prev => [...prev, { id, ...s } as Supplier]);
                }}

              />}

              {activeTab === 'GoodsManagement' && <GoodsManagement
                selectedHotelId={selectedHotelId}
                currentUser={currentUser}
                documentTypes={documentTypes}
                warehouses={warehouses}
                inventoryItems={inventoryItems}
                purchaseOrders={purchaseOrders}
                goodsReceipts={goodsReceipts}
                goodsIssues={goodsIssues}
                allStaff={staff}
                onAddGR={async (gr, items) => {
                  const id = crypto.randomUUID();
                  const grNumber = `GR-${Date.now()}`;
                  await supabase.from('goods_receipts').insert({ id, gr_number: grNumber, hotel_id: gr.hotelId, warehouse_id: gr.warehouseId, status: 'Received', total_amount: gr.totalAmount });
                  setGoodsReceipts(prev => [...prev, { id, grNumber, ...gr } as any]);

                  // Auto Journal (Goods Receipt)
                  if (currentUser) {
                    await AccountingService.createJournalFromGR(
                      { id, grNumber, totalAmount: gr.totalAmount },
                      gr.hotelId,
                      currentUser.id
                    );
                  }
                }}
                onUpdateGRStatus={async (id, status) => {
                  await supabase.from('goods_receipts').update({ status }).eq('id', id);
                  setGoodsReceipts(prev => prev.map(g => g.id === id ? { ...g, status } : g));
                }}
                onAddGI={async (gi, items) => {
                  const id = crypto.randomUUID();
                  const giNumber = `GI-${Date.now()}`;
                  await supabase.from('goods_issues').insert({ id, gi_number: giNumber, hotel_id: gi.hotelId, warehouse_id: gi.warehouseId, status: 'Draft' });
                  setGoodsIssues(prev => [...prev, { id, giNumber, ...gi } as any]);
                }}
                onUpdateGIStatus={async (id, status) => {
                  await supabase.from('goods_issues').update({ status }).eq('id', id);
                  setGoodsIssues(prev => prev.map(g => g.id === id ? { ...g, status } : g));
                }}
              />}

              {activeTab === 'StockTransfer' && <StockTransferManagement
                hotels={hotels}
                selectedHotelId={selectedHotelId}
                currentUser={currentUser}
                warehouses={warehouses}
                inventoryItems={inventoryItems}
                stockTransfers={stockTransfers}
                onAdd={async (st, items) => {
                  const id = crypto.randomUUID();
                  const stNumber = `ST-${Date.now()}`;
                  await supabase.from('stock_transfers').insert({ id, st_number: stNumber, from_hotel_id: st.fromHotelId, to_hotel_id: st.toHotelId, from_warehouse_id: st.fromWarehouseId, status: 'Draft' });
                  setStockTransfers(prev => [...prev, { id, stNumber, ...st } as any]);
                }}
                onUpdateStatus={async (id, status) => {
                  await supabase.from('stock_transfers').update({ status }).eq('id', id);
                  setStockTransfers(prev => prev.map(s => s.id === id ? { ...s, status } : s));
                }}
                onConfirmReceive={async (id) => {
                  await supabase.from('stock_transfers').update({ status: 'Received', received_at: new Date().toISOString() }).eq('id', id);
                  setStockTransfers(prev => prev.map(s => s.id === id ? { ...s, status: 'Received' } : s));
                }}
              />}

              {activeTab === 'PettyCash' && <PettyCashManagement
                hotels={hotels}
                selectedHotelId={selectedHotelId}
                currentUser={currentUser}
                accounts={pettyCashAccounts}
                chartOfAccounts={chartOfAccounts}
                transactions={pettyCashTransactions}
                allStaff={staff}
                onAddAccount={async (acc) => {
                  const id = crypto.randomUUID();
                  await supabase.from('petty_cash_accounts').insert({ id, hotel_id: acc.hotelId, account_name: acc.accountName, credit_limit: acc.creditLimit, balance: 0, is_active: true });
                  setPettyCashAccounts(prev => [...prev, { id, ...acc, balance: 0, isActive: true } as any]);
                }}
                onUpdateAccount={async (id, updates) => {
                  const { error } = await supabase.from('petty_cash_accounts').update({
                    account_name: updates.accountName,
                    credit_limit: updates.creditLimit
                  }).eq('id', id);
                  if (error) {
                    alert(`更新失敗：${error.message}`);
                    throw error;
                  }
                  setPettyCashAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
                  alert('帳戶已更新');
                }}
                onDeleteAccount={async (id) => {
                  const { error } = await supabase.from('petty_cash_accounts').delete().eq('id', id);
                  if (error) {
                    if (error.message?.includes('foreign key') || error.message?.includes('violates') || error.code === '23503') {
                      alert('無法刪除：此帳戶有相關的交易記錄。');
                    } else {
                      alert(`刪除失敗：${error.message}`);
                    }
                    throw error;
                  }
                  setPettyCashAccounts(prev => prev.filter(a => a.id !== id));
                  alert('帳戶已刪除');
                }}
                onAddTransaction={async (tx) => {
                  const id = crypto.randomUUID();
                  const txNumber = `PC-${Date.now()}`;
                  await supabase.from('petty_cash_transactions').insert({ id, account_id: tx.accountId, transaction_number: txNumber, transaction_date: tx.transactionDate, transaction_type: tx.transactionType, amount: tx.amount, balance_after: tx.balanceAfter, description: tx.description, status: 'Draft' });
                  // Draft transaction usually doesn't affect balance yet in accounting, but here we were affecting it. 
                  // Let's assume balance update happens upon Approval? 
                  // If we change to workflow, balance update should move to approval.
                  // BUT, for now let's keep it simple: Draft doesn't update, we update on Approval.
                  // Wait, original code updated balance immediately. 
                  // User "Add Approval Flow" implies we shouldn't update balance until approved.
                  // So I will REMOVE balance update here for now, or assume Draft doesn't count.
                  // For minimal regression, let's just insert as Draft.
                  setPettyCashTransactions(prev => [...prev, { id, transactionNumber: txNumber, ...tx, status: 'Draft' } as any]);
                }}
                onSubmitForApproval={async (txId) => {
                  const tx = pettyCashTransactions.find(t => t.id === txId);
                  if (!tx || !currentUser) return;

                  const result = await WorkflowService.startWorkflow(
                    txId,
                    'PETTY_CASH',
                    tx.transactionNumber,
                    currentUser.id,
                    currentUser.name,
                    tx.amount
                  );

                  alert(result.message);
                  if (result.success) {
                    setPettyCashTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'Pending' } : t));

                    // Live Update for Workflow Instances & Pending Approvals
                    if (result.instanceId) {
                      const { data: newInst } = await supabase
                        .from('workflow_instances')
                        .select('*, definition:workflow_definitions(*, steps:workflow_steps(*))')
                        .eq('id', result.instanceId)
                        .single();

                      if (newInst) {
                        const mappedInst: any = {
                          id: newInst.id,
                          workflowId: newInst.workflow_id,
                          workflowName: newInst.definition?.name,
                          documentId: newInst.document_id,
                          documentType: newInst.document_type,
                          documentNumber: newInst.document_number,
                          currentStep: newInst.current_step,
                          status: newInst.status,
                          initiatedBy: newInst.initiated_by,
                          initiatedAt: newInst.initiated_at,
                          completedAt: newInst.completed_at,
                          notes: newInst.notes
                        };
                        setWorkflowInstances(prev => [...prev, mappedInst]);

                        if (newInst.status === 'Pending') {
                          const currentStepDef = newInst.definition?.steps?.find((s: any) => s.step_sequence === newInst.current_step);
                          setPendingApprovals(prev => [...prev, {
                            workflowInstanceId: newInst.id,
                            documentId: newInst.document_id,
                            documentType: newInst.document_type,
                            documentNumber: newInst.document_number,
                            requesterId: '',
                            requesterName: newInst.initiated_by,
                            requestedAt: newInst.initiated_at,
                            currentStepName: currentStepDef?.step_name || `步驟 ${newInst.current_step}`,
                            priority: 'Normal',
                            amount: tx.amount
                          }]);
                        }
                      }
                    }
                  }
                }}
              />}

              {activeTab === 'Workflow' && <WorkflowManagement
                currentUser={currentUser}
                staff={staff}
                workflowDefinitions={workflowDefinitions}
                workflowInstances={workflowInstances}
                approvalRecords={approvalRecords}
                pendingApprovals={pendingApprovals}
                onApprove={async (instanceId, comments) => {
                  if (!currentUser) return;
                  const result = await WorkflowService.approve(instanceId, currentUser.id, currentUser.name, comments);
                  if (result.success) {
                    // Refresh data after successful operation
                    const { data: updatedInstance } = await supabase.from('workflow_instances').select('*').eq('id', instanceId).single();
                    if (updatedInstance) {
                      setWorkflowInstances(prev => prev.map(i => i.id === instanceId ? { ...i, ...updatedInstance } : i));
                      if (updatedInstance.status !== 'Pending') {
                        setPendingApprovals(prev => prev.filter(p => p.workflowInstanceId !== instanceId));
                      }

                      // Handling Side Effects for Document Status Updates
                      if (updatedInstance.status === 'Approved') {
                        if (updatedInstance.document_type === 'PURCHASE_REQUISITION') {
                          setPurchaseRequisitions(prev => prev.map(p => p.id === updatedInstance.document_id ? { ...p, status: 'Approved' } : p));
                          await supabase.from('purchase_requisitions').update({ status: 'Approved' }).eq('id', updatedInstance.document_id);
                        } else if (updatedInstance.document_type === 'PURCHASE_ORDER') {
                          setPurchaseOrders(prev => prev.map(p => p.id === updatedInstance.document_id ? { ...p, status: 'Approved' } : p));
                          await supabase.from('purchase_orders').update({ status: 'Approved' }).eq('id', updatedInstance.document_id);
                        } else if (updatedInstance.document_type === 'PETTY_CASH') {
                          // 1. Update Transaction Status
                          setPettyCashTransactions(prev => prev.map(t => t.id === updatedInstance.document_id ? { ...t, status: 'Approved' } : t));
                          await supabase.from('petty_cash_transactions').update({ status: 'Approved' }).eq('id', updatedInstance.document_id);

                          // 2. Update Account Balance
                          const tx = pettyCashTransactions.find(t => t.id === updatedInstance.document_id);
                          if (tx) {
                            // Re-fetch account to get latest balance to be safe, or used cached. 
                            // Ideally transaction processing should be atomic on backend, but here we do frontend logic.
                            const account = pettyCashAccounts.find(a => a.id === tx.account_id || a.id === tx.accountId);
                            if (account) {
                              const newBalance = tx.transactionType === 'REPLENISH'
                                ? account.balance + tx.amount
                                : account.balance - tx.amount;

                              await supabase.from('petty_cash_accounts').update({ balance: newBalance }).eq('id', account.id);
                              setPettyCashAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
                            }

                            // Auto Journal (Petty Cash Expense)
                            if (tx.transactionType === 'EXPENSE') {
                              await AccountingService.createJournalFromPettyCash(
                                tx,
                                selectedHotelId,
                                currentUser.id
                              );
                            }
                          }
                        }
                      }

                      // Also refresh approval records
                      const { data: records } = await supabase.from('approval_records').select('*').order('acted_at', { ascending: false });
                      if (records) setApprovalRecords(records.map((r: any) => ({
                        id: r.id,
                        workflowInstanceId: r.workflow_instance_id,
                        stepId: r.step_id,
                        stepSequence: r.step_sequence,
                        stepName: r.step_name,
                        approverId: r.approver_id,
                        approverName: r.approver_name,
                        action: r.action,
                        comments: r.comments,
                        actedAt: r.acted_at
                      })));
                    }
                    alert(result.message);
                  } else {
                    alert(`核准失敗: ${result.message}`);
                  }
                }}
                onReject={async (instanceId, comments) => {
                  if (!currentUser) return;
                  const result = await WorkflowService.reject(instanceId, currentUser.id, currentUser.name, comments);
                  if (result.success) {
                    setWorkflowInstances(prev => prev.map(i => i.id === instanceId ? { ...i, status: 'Rejected' } : i));
                    setPendingApprovals(prev => prev.filter(p => p.workflowInstanceId !== instanceId));

                    // Fetch instance to know document type
                    const instance = workflowInstances.find(i => i.id === instanceId);
                    if (instance) {
                      if (instance.documentType === 'PURCHASE_REQUISITION') {
                        setPurchaseRequisitions(prev => prev.map(p => p.id === instance.documentId ? { ...p, status: 'Rejected' } : p));
                        await supabase.from('purchase_requisitions').update({ status: 'Rejected' }).eq('id', instance.documentId);
                      } else if (instance.documentType === 'PURCHASE_ORDER') {
                        setPurchaseOrders(prev => prev.map(p => p.id === instance.documentId ? { ...p, status: 'Rejected' } : p));
                        await supabase.from('purchase_orders').update({ status: 'Rejected' }).eq('id', instance.documentId);
                      } else if (instance.documentType === 'PETTY_CASH') {
                        setPettyCashTransactions(prev => prev.map(t => t.id === instance.documentId ? { ...t, status: 'Rejected' } : t));
                        await supabase.from('petty_cash_transactions').update({ status: 'Rejected' }).eq('id', instance.documentId);
                      }
                    }

                    const { data: records } = await supabase.from('approval_records').select('*').order('acted_at', { ascending: false });
                    if (records) setApprovalRecords(records.map((r: any) => ({
                      id: r.id,
                      workflowInstanceId: r.workflow_instance_id,
                      stepId: r.step_id,
                      stepSequence: r.step_sequence,
                      stepName: r.step_name,
                      approverId: r.approver_id,
                      approverName: r.approver_name,
                      action: r.action,
                      comments: r.comments,
                      actedAt: r.acted_at
                    })));
                    alert(result.message);
                  } else {
                    alert(`駁回失敗: ${result.message}`);
                  }
                }}
                onAddWorkflow={async (wf) => {
                  const id = crypto.randomUUID();
                  await supabase.from('workflow_definitions').insert({ id, code: wf.code, name: wf.name, document_category: wf.documentCategory, is_active: true });
                  setWorkflowDefinitions(prev => [...prev, { id, ...wf, isActive: true } as any]);
                }}
                onUpdateWorkflow={async (id, wf) => {
                  await supabase.from('workflow_definitions').update({ name: wf.name, document_category: wf.documentCategory, is_active: wf.isActive }).eq('id', id);
                  setWorkflowDefinitions(prev => prev.map(w => w.id === id ? { ...w, ...wf } as any : w));
                }}
                onDeleteWorkflow={async (id) => {
                  await supabase.from('workflow_definitions').delete().eq('id', id);
                  setWorkflowDefinitions(prev => prev.filter(w => w.id !== id));
                }}
                onAddStep={async (step) => {
                  const id = crypto.randomUUID();
                  await supabase.from('workflow_steps').insert({
                    id,
                    workflow_id: step.workflowId,
                    step_sequence: step.stepSequence,
                    step_name: step.stepName,
                    approval_type: step.approvalType,
                    approver_role: step.approverRole,
                    approver_ids: step.approverIds,
                    required_approvals: step.requiredApprovals,
                    can_skip: step.canSkip,
                    skip_condition: step.skipCondition,
                    timeout_hours: step.timeoutHours
                  });
                  // Ideally re-fetch or update local state deeply
                  fetchInitialData();
                }}
                onUpdateStep={async (id, step) => {
                  await supabase.from('workflow_steps').update({
                    step_sequence: step.stepSequence,
                    step_name: step.stepName,
                    approval_type: step.approvalType,
                    approver_role: step.approverRole,
                    approver_ids: step.approverIds,
                    required_approvals: step.requiredApprovals,
                    can_skip: step.canSkip,
                    skip_condition: step.skipCondition,
                    timeout_hours: step.timeoutHours
                  }).eq('id', id);
                  fetchInitialData();
                }}
                onDeleteStep={async (stepId, wfId) => {
                  await supabase.from('workflow_steps').delete().eq('id', stepId);
                  fetchInitialData();
                }}
                onConvertPRtoPO={handleConvertPRtoPO}
              />}

              {activeTab === 'MissionControl' && <MissionControl />}

            </div>
          )}
        </main>
      </div>

      <Modal isOpen={isOrderOpen} onClose={() => { setIsOrderOpen(false); setSelectedOldReservation(null); setIsCheckoutVerifying(false); }} title={selectedOldReservation ? (selectedOldReservation.status === 'Confirmed' ? "繳費與入住 (Payment & Check-In)" : selectedOldReservation.status === 'CheckedIn' ? "目前客戶訂單" : "前一房客紀錄") : "房態明細"}>
        {selectedRoomId && hotelRooms.find(r => r.id === selectedRoomId) && (
          <OrderDetailsModal
            room={hotelRooms.find(r => r.id === selectedRoomId)!}
            hotel={hotels.find(h => h.id === selectedHotelId)}
            reservation={selectedOldReservation || hotelRooms.find(r => r.id === selectedRoomId)?.current_order}
            onUpdateStatus={(st) => handleUpdateRoomStatus(selectedRoomId, st)}
            onIssueInvoice={handleIssueInvoice}
            onVoidInvoice={handleVoidInvoice}
            onRefund={handleRefund}
            onTransferOverpayment={handleOverpaymentTransfer}
            onCancelTransaction={handleCancelTransaction}
            onPrint={(inv, layout) => {
              const hotel = hotels.find(h => h.id === inv.hotelId);
              const res = reservations.find(r => r.id === inv.reservationId);
              const guest = guests.find(g => g.id === res?.guestId);
              if (hotel) setPrintConfig({ invoice: inv, hotel, reservation: res, guest, layout });
            }}
            onCollectPayment={handleCollectPayment}
            onCancelCheckout={async (resId) => {
              await handleCancelCheckout(selectedRoomId);
              setIsOrderOpen(false);
              setSelectedOldReservation(null);
            }}
            transactions={transactions.filter(t => t.reservationId === (selectedOldReservation?.id || hotelRooms.find(r => r.id === selectedRoomId)?.current_order?.id))}
            billableItems={billableItems.filter(i => i.reservationId === (selectedOldReservation?.id || hotelRooms.find(r => r.id === selectedRoomId)?.current_order?.id))}
            consumptionItems={consumptionItems}
            invoices={invoices.filter(i => i.reservationId === (selectedOldReservation?.id || hotelRooms.find(r => r.id === selectedRoomId)?.current_order?.id))}
            currentUser={currentUser}
            onAddBillableItem={handleAddBillableItem}
            onDeleteBillableItem={handleDeleteBillableItem}
            onCheckout={handleCheckout}
            initialCheckingOut={isCheckoutVerifying}
          />
        )}
      </Modal>

      <Modal isOpen={isActionMenuOpen} onClose={() => setIsActionMenuOpen(false)} title="選擇操作">
        {selectedRoomId && hotelRooms.find(r => r.id === selectedRoomId) && (
          <RoomActionMenu
            room={hotelRooms.find(r => r.id === selectedRoomId)!}
            onClose={() => setIsActionMenuOpen(false)}
            onStatusChange={async (roomId, newStatus) => {
              try {
                await supabase.from('rooms').update({ status: newStatus }).eq('id', roomId);
                setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: newStatus } : r));
                setIsActionMenuOpen(false);
                alert(`房態已更新為 ${newStatus}`);
              } catch (e: any) {
                alert(`更新失敗: ${e.message}`);
              }
            }}
            onAction={async (action) => {
              setIsActionMenuOpen(false);
              const room = hotelRooms.find(r => r.id === selectedRoomId);
              if (!room) return;


              const fetchPrevious = async () => {
                const { data } = await supabase
                  .from('reservations')
                  .select('*')
                  .eq('hotel_id', selectedHotelId)
                  .eq('room_number', room.number)
                  .eq('status', 'CheckedOut')
                  .order('check_out', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (data) {
                  setSelectedOldReservation({
                    id: data.id,
                    hotelId: data.hotel_id,
                    buildingId: data.building_id,
                    guestId: data.guest_id,
                    guestName: data.guest_name,
                    phone: data.phone || '',
                    idNumber: data.id_number,
                    checkIn: data.check_in,
                    checkOut: data.check_out,
                    roomNumber: data.room_number,
                    roomType: data.room_type,
                    status: 'CheckedOut',
                    source: data.source,
                    totalPrice: data.total_price,
                    paidAmount: data.paid_amount,
                    discount: data.discount || 0,
                    note: data.note || '',
                    lastEditedBy: data.last_edited_by
                  });
                  setIsOrderOpen(true);
                  return true;
                }
                alert('找不到可查詢的紀錄');
                return false;
              };

              switch (action) {
                case 'order':
                  if (room.current_order) {
                    setSelectedOldReservation(room.current_order);
                  }
                  setIsOrderOpen(true);
                  break;
                case 'stay':
                  setResFormMode('Stay');
                  setIsResFormOpen(true);
                  break;
                case 'rest':
                  setResFormMode('Rest');
                  setIsResFormOpen(true);
                  break;
                case 'tbc':
                  handleUpdateRoomStatus(selectedRoomId, RoomStatus.OOO);
                  break;
                case 'cancel_checkout':
                case 'history':
                  await fetchPrevious();
                  break;
                case 'checkout':
                  if (room.current_order) {
                    setIsCheckoutVerifying(true);
                    setIsOrderOpen(true);
                  }
                  break;
                case 'note':
                  setIsNoteModalOpen(true);
                  break;
                case 'checkin':
                  if (room.current_order) {
                    const res = room.current_order;
                    const balanceDue = (res.totalPrice || 0) - (res.paidAmount || 0) - (res.discount || 0);

                    if (balanceDue > 0) {
                      setIsOrderOpen(true);
                      alert(`尚有餘額 $${balanceDue.toLocaleString()} 未繳清，請先完成收款後再辦理入住。`);
                      return;
                    }

                    // Proceed with check-in
                    await supabase.from('reservations').update({
                      status: 'CheckedIn',
                      last_edited_by: currentUser?.name || 'System'
                    }).eq('id', res.id);
                    await supabase.from('rooms').update({ status: 'OC' })
                      .eq('number', res.roomNumber)
                      .eq('hotel_id', selectedHotelId);
                    setReservations(prev => prev.map(r => r.id === res.id ? { ...r, status: 'CheckedIn' } : r));
                    setRooms(prev => prev.map(r =>
                      r.hotelId === selectedHotelId && r.number === res.roomNumber
                        ? { ...r, status: RoomStatus.OC }
                        : r
                    ));
                    setIsActionMenuOpen(false);

                  }
                  break;
                case 'cancel_checkin':
                  if (room.current_order) {
                    const res = room.current_order;
                    if (!window.confirm(`確定要取消 ${res.guestName} 的入住嗎？房間狀態將恢復為預約狀態。`)) {
                      return;
                    }
                    await supabase.from('reservations').update({
                      status: 'Confirmed',
                      last_edited_by: currentUser?.name || 'System'
                    }).eq('id', res.id);
                    await supabase.from('rooms').update({ status: 'VC' })
                      .eq('number', res.roomNumber)
                      .eq('hotel_id', selectedHotelId);
                    setReservations(prev => prev.map(r => r.id === res.id ? { ...r, status: 'Confirmed' } : r));
                    setRooms(prev => prev.map(r =>
                      r.hotelId === selectedHotelId && r.number === res.roomNumber
                        ? { ...r, status: RoomStatus.VC }
                        : r
                    ));
                    setIsActionMenuOpen(false);
                    alert(`${res.guestName} 的入住已取消，房間 ${res.roomNumber} 已恢復為預約狀態。`);
                  }
                  break;
              }
            }}
          />
        )}
      </Modal>

      <Modal isOpen={isResFormOpen} onClose={() => setIsResFormOpen(false)} title={resFormMode === 'Rest' ? "快速休息登記" : "快速住宿登記"}>
        {selectedRoomId && (
          <ReservationForm
            onSubmit={async (data, billableItems, initialPayment) => {
              const success = await handleComplexSave({
                reservation: {
                  ...data,
                  roomNumber: hotelRooms.find(r => r.id === selectedRoomId)!.number,
                  roomType: hotelRooms.find(r => r.id === selectedRoomId)!.type,
                  buildingId: hotelRooms.find(r => r.id === selectedRoomId)!.buildingId,
                  status: 'Confirmed'
                },
                guestData: { name: data.guestName, phone: data.phone, idNumber: data.idNumber },
                isNewGuest: true,
                roomId: selectedRoomId,
                billableItems: billableItems, // Pass items (Room Charge)
                initialPayment: initialPayment // Pass payment (Deposit)
              });
              if (success) setIsResFormOpen(false);
            }}
            initialData={{
              roomNumber: hotelRooms.find(r => r.id === selectedRoomId)!.number,
              roomType: hotelRooms.find(r => r.id === selectedRoomId)!.type,
              source: '櫃檯直接',
              checkIn: new Date().toISOString().slice(0, 10),
              checkOut: new Date(Date.now() + (resFormMode === 'Rest' ? 3 * 3600000 : 24 * 3600000)).toISOString().slice(0, 10)
            }}
            mode={resFormMode}
            hotelId={selectedHotelId}
            buildings={buildings.filter(b => b.hotelId === selectedHotelId)}
            rooms={rooms.filter(r => r.hotelId === selectedHotelId)}
          />
        )}
      </Modal>

      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="房間備註與歷史紀錄">
        {selectedRoomId && (
          <RoomNoteManager
            room={hotelRooms.find(r => r.id === selectedRoomId)!}
            currentUser={currentUser!}
            currentHotelId={selectedHotelId}
            onClose={() => setIsNoteModalOpen(false)}
            onNoteChange={refreshGlobalRoomNotes}
          />
        )}
      </Modal>

      {/* 列印內容：僅在列印時透過 CSS 顯示 */}
      {printConfig && (
        <InvoiceReceipt {...printConfig} />
      )}
    </div>
  );
};

export default App;
