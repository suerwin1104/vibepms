
export enum RoomStatus {
  VC = 'VC', // Vacant Clean
  VD = 'VD', // Vacant Dirty
  OC = 'OC', // Occupied
  OOO = 'OOO', // Out of Order
  SO = 'SO'  // Stay Over Cleaning
}

export type RoomType = 'Single' | 'Double' | 'Deluxe' | 'Suite';

export interface Hotel {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  checkoutTime?: string;  // 退房時間 (HH:MM)，預設 "11:00"
  checkinTime?: string;   // 入住時間 (HH:MM)，預設 "15:00"
  lateFeeThresholdHours?: number; // 延滯門檻小時數，預設 6
}

export interface Country {
  code: string;
  name_en: string;
  name_zh: string;
  sort_order: number;
}

export interface Building {
  id: string;
  hotelId: string;
  name: string;
  code: string;
}

export interface Room {
  id: string;
  hotelId: string;
  buildingId: string;
  number: string;
  type: RoomType;
  status: RoomStatus;
  floor: number;
  housekeeper: string;
  basePrice: number;
  lateFeePerHour?: number; // 每小時超時費用（例如 $500）
  lateFeePerDay?: number; // 每日延滯費用（滿6小時改收這個）
  description: string;
  current_order_id?: string;
  current_order?: Reservation;
  latest_note?: RoomNote; // 新增：最新房間註記
}

export type ReservationStatus = 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled' | 'Pending';

export interface Reservation {
  id: string;
  hotelId: string;
  buildingId: string;
  guestId: string;
  guestName: string;
  phone: string;
  idNumber: string;
  checkIn: string;
  checkOut: string;
  roomNumber: string;
  roomType: RoomType;
  status: ReservationStatus;
  source: string;
  totalPrice: number;
  paidAmount: number;
  discount: number;
  note: string;
  lastEditedBy: string;
  createdAt?: string;
  updatedAt?: string; // Add updatedAt for sorting by recently modified
  // 新增 Legacy Fields
  licensePlate?: string;
  companyName?: string;
  groupBookingId?: string;
  purposeOfVisit?: string;
  bookingAgent?: string;
  adults?: number;
  children?: number;
  /** @deprecated handled as BillableItem now */
  depositAmount?: number;
  carModel?: string;
  // Late Stage Legacy Fields
  roomRent?: number;
  extraItems?: number;
  addBed?: number;
  /** @deprecated handled as BillableItem now */
  paymentMethod?: string;
  /** @deprecated handled as BillableItem now */
  creditCard?: string;
  petType?: string;
  petCount?: number;
  petNote?: string;
}

export interface Invoice {
  id: string;
  hotelId: string;
  reservationId: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  netAmount: number;
  status: 'Active' | 'Voided';
  buyerId?: string; // 統一編號 (Business Tax ID)
  createdAt: string;
  createdBy: string;
}

export interface ConsumptionItem {
  id: string;
  name: string;
  price: number;
  category: string;
  accounting_code: string;
  is_active: boolean;
}

export interface BillableItem {

  id: string;
  reservationId: string;
  description: string;
  amount: number;
  quantity: number;
  paymentMethod?: string; // 新增：每筆消費的付款方式
  note?: string; // 新增：每筆消費的個別備註
  createdAt: string;
  createdBy: string;
}

export interface InvoiceSequence {
  hotelId: string;
  prefix: string;
  currentNumber: number;
}

// 系統角色定義
export interface SystemRole {
  id: string;
  code: string;           // 角色代碼 (例如: 'GroupAdmin')
  name: string;           // 顯示名稱 (例如: '集團總管')
  description?: string;   // 角色說明
  level: number;          // 權限等級 (數字越小權限越大)
  isSystem: boolean;      // 是否為系統內建角色 (不可刪除)
  permissions?: string[]; // 權限列表 (未來擴充)
  createdAt?: string;
}

// StaffRole 改為 string 以支援動態角色
export type StaffRole = string;

// 預設系統角色代碼常量
export const DEFAULT_ROLES = {
  GROUP_ADMIN: 'GroupAdmin',
  HOTEL_ADMIN: 'HotelAdmin',
  DEPARTMENT_MANAGER: 'DepartmentManager',
  FINANCE: 'Finance',
  FRONT_DESK: 'FrontDesk'
} as const;

export interface Department {
  id: string;
  name: string;
  code: string;
  managerId?: string;
  managerName?: string;
  parentId?: string;
  createdAt?: string;
}

export interface Staff {
  id: string;
  hotelId: string;
  employeeId: string;
  name: string;
  role: StaffRole;
  title: string;
  authorizedHotels: string[];
  email?: string;
  lineId?: string;
  telegramId?: string;
  wechatId?: string;
  departmentId?: string;
  departmentName?: string;
  supervisorId?: string;
  supervisorName?: string;
  delegateId?: string;
  delegateName?: string;
}

export type VIPLevel = 'Normal' | 'Silver' | 'Gold' | 'Diamond';

export interface Guest {
  id: string;
  name: string;
  idNumber: string;
  phone: string;
  vipLevel: VIPLevel;
  isBlacklisted: boolean;
  preferences: string;
  gender: 'Male' | 'Female' | 'Other';
  nationality: string;
  blacklistReason?: string;
  modificationLogs: any[];
  taxId?: string;
  companyName?: string;
  vehicleInfo?: string; // Legacy
  // 身分證件照片 (Base64 encoded)
  idCardFront?: string;     // 身分證正面
  idCardBack?: string;      // 身分證反面
  healthInsuranceCard?: string; // 健保卡
  passportOrPermit?: string; // 護照或居留證 (外國人)
}

export type HousekeeperStatus = 'Active' | 'OnLeave' | 'Resigned';

export interface Housekeeper {
  id: string;
  hotelId: string;
  employeeId: string;
  name: string;
  phone: string;
  status: HousekeeperStatus;
  assignedFloor: string;
  cleanedToday: number;
}

export type PaymentMethod = 'Cash' | 'CreditCard' | 'Transfer' | 'Other';

export interface Transaction {
  id: string;
  hotelId: string;
  reservationId: string;
  amount: number;
  type: 'Payment' | 'Refund';
  method: PaymentMethod;
  description: string;
  note?: string;
  createdAt: string;
  staffName: string;
}

export interface HandoverRecord {
  id: string;
  hotelId: string;
  staffId: string;
  staffName: string;
  content: string;
  rowCount: number;
  createdAt: string;
}

export interface RoomNote {
  id: string;
  roomId: string;
  hotelId: string;
  content: string;
  staffName: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  action: string;
  staffName: string;
  staff: string;
  hotel: string;
  impact: string;
}

export interface CleaningTask {
  id: string;
  roomNumber: string;
  type: 'VD' | 'SO';
  priority: 'High' | 'Normal';
  status: 'Unassigned' | 'InProgress' | 'Completed';
  housekeeperName?: string;
  startTime?: string;
  duration?: number;
  auditScore?: number;
  exceptions?: string[];
  notes?: string;
}

// =====================================================
// 進銷存與採購系統類型 (Inventory & Procurement Types)
// =====================================================

// 單據類別
export type DocumentCategory =
  | 'PURCHASE_REQUISITION'
  | 'PURCHASE_ORDER'
  | 'GOODS_RECEIPT'
  | 'GOODS_ISSUE'
  | 'STOCK_TRANSFER'
  | 'PETTY_CASH';

export interface DocumentType {
  id: string;
  code: string;
  name: string;
  category: DocumentCategory;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 倉庫
export interface Warehouse {
  id: string;
  hotelId: string;
  code: string;
  name: string;
  location?: string;
  managerId?: string;
  managerName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 庫存品項
export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  unit: string;
  specification?: string;
  barcode?: string;
  safetyStock: number;
  reorderPoint: number;
  defaultSupplierId?: string;
  defaultUnitPrice: number;
  accountingCode?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 庫存記錄
export interface InventoryRecord {
  id: string;
  warehouseId: string;
  itemId: string;
  quantity: number;
  reservedQuantity: number;
  lastReceiptDate?: string;
  lastIssueDate?: string;
  updatedAt?: string;
  itemName?: string;
  itemCode?: string;
  warehouseName?: string;
}

// 供應商
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  bankAccount?: string;
  bankName?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 請購單
export type PRStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Converted';

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  hotelId: string;
  documentTypeId?: string;
  documentTypeName?: string;
  requesterId: string;
  requesterName: string;
  department?: string;
  requestDate: string;
  requiredDate?: string;
  status: PRStatus;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  totalAmount: number;
  notes?: string;
  workflowInstanceId?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: PurchaseRequisitionItem[];
}

export interface PurchaseRequisitionItem {
  id: string;
  prId: string;
  lineNumber: number;
  itemId?: string;
  itemCode?: string;
  itemName: string;
  specification?: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedAmount: number;
  notes?: string;
  createdAt?: string;
}

// 採購單
export type POStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Ordered' | 'PartialReceived' | 'Received' | 'Cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  hotelId: string;
  documentTypeId?: string;
  documentTypeName?: string;
  prId?: string;
  prNumber?: string;
  supplierId?: string;
  supplierName?: string;
  buyerId?: string;
  buyerName?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: POStatus;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  accountingCode?: string;
  costCenter?: string;
  paymentTerms?: string;
  shippingAddress?: string;
  notes?: string;
  workflowInstanceId?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  lineNumber: number;
  itemId?: string;
  itemCode?: string;
  itemName: string;
  specification?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  receivedQuantity: number;
  accountingCode?: string;
  notes?: string;
  createdAt?: string;
}

// 進貨驗收單
export type GRStatus = 'Draft' | 'Received' | 'Inspecting' | 'Completed' | 'Rejected';

export interface GoodsReceipt {
  id: string;
  grNumber: string;
  hotelId: string;
  documentTypeId?: string;
  documentTypeName?: string;
  poId?: string;
  poNumber?: string;
  warehouseId?: string;
  warehouseName?: string;
  supplierId?: string;
  supplierName?: string;
  receiptDate: string;
  receiverId?: string;
  receiverName?: string;
  status: GRStatus;
  totalAmount: number;
  invoiceNumber?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: GoodsReceiptItem[];
}

export interface GoodsReceiptItem {
  id: string;
  grId: string;
  lineNumber: number;
  poItemId?: string;
  itemId?: string;
  itemCode?: string;
  itemName: string;
  orderedQuantity?: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  rejectionReason?: string;
  storageLocation?: string;
  notes?: string;
  createdAt?: string;
}

// 出貨/領用單
export type GIStatus = 'Draft' | 'Pending' | 'Approved' | 'Issued' | 'Cancelled';

export interface GoodsIssue {
  id: string;
  giNumber: string;
  hotelId: string;
  documentTypeId?: string;
  documentTypeName?: string;
  warehouseId?: string;
  warehouseName?: string;
  issueDate: string;
  issuerId?: string;
  issuerName?: string;
  requesterId?: string;
  requesterName?: string;
  department?: string;
  purpose?: string;
  status: GIStatus;
  totalAmount: number;
  notes?: string;
  workflowInstanceId?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: GoodsIssueItem[];
}

export interface GoodsIssueItem {
  id: string;
  giId: string;
  lineNumber: number;
  itemId?: string;
  itemCode?: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  amount: number;
  storageLocation?: string;
  notes?: string;
  createdAt?: string;
}

// 調撥單
export type STStatus = 'Draft' | 'Pending' | 'Approved' | 'InTransit' | 'Received' | 'Cancelled';

export interface StockTransfer {
  id: string;
  stNumber: string;
  documentTypeId?: string;
  documentTypeName?: string;
  fromHotelId: string;
  fromHotelName?: string;
  toHotelId: string;
  toHotelName?: string;
  fromWarehouseId?: string;
  fromWarehouseName?: string;
  toWarehouseId?: string;
  toWarehouseName?: string;
  transferDate: string;
  requesterId?: string;
  requesterName?: string;
  status: STStatus;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  reason?: string;
  totalAmount: number;
  notes?: string;
  shippedAt?: string;
  receivedAt?: string;
  workflowInstanceId?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: StockTransferItem[];
}

export interface StockTransferItem {
  id: string;
  stId: string;
  lineNumber: number;
  itemId?: string;
  itemCode?: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  amount: number;
  receivedQuantity: number;
  notes?: string;
  createdAt?: string;
}

// 零用金帳戶
export interface PettyCashAccount {
  id: string;
  hotelId: string;
  hotelName?: string;
  accountName: string;
  custodianId?: string;
  custodianName?: string;
  balance: number;
  creditLimit: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 零用金異動
export type PCTransactionType = 'REPLENISH' | 'EXPENSE' | 'ADJUSTMENT';
export type PCStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected';

export interface PettyCashTransaction {
  id: string;
  accountId: string;
  accountName?: string;
  documentTypeId?: string;
  documentTypeName?: string;
  transactionNumber: string;
  transactionDate: string;
  transactionType: PCTransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  vendorName?: string;
  receiptNumber?: string;
  expenseCategory?: string;
  accountingCode?: string;
  handlerId?: string;
  handlerName?: string;
  approvedBy?: string;
  status: PCStatus;
  notes?: string;
  workflowInstanceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// =====================================================
// 流程簽核類型 (Workflow Types)
// =====================================================

export type ApprovalType = 'Serial' | 'Parallel'; // 串簽 / 會簽

export interface WorkflowDefinition {
  id: string;
  name: string;
  code: string;
  documentCategory: DocumentCategory;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  steps?: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepSequence: number;
  stepName: string;
  approvalType: ApprovalType;
  approverRole?: string;
  approverIds?: string[];
  requiredApprovals: number;
  canSkip: boolean;
  skipCondition?: string;
  timeoutHours: number;
  createdAt?: string;
}

export type WorkflowStatus = 'Pending' | 'InProgress' | 'Approved' | 'Rejected' | 'Cancelled';

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName?: string;
  documentId: string;
  documentType: string;
  documentNumber?: string;
  currentStep: number;
  status: WorkflowStatus;
  initiatedBy?: string;
  initiatedAt?: string;
  completedAt?: string;
  notes?: string;
}

export type ApprovalAction = 'Approve' | 'Reject' | 'Return' | 'Delegate';

export interface ApprovalRecord {
  id: string;
  workflowInstanceId: string;
  stepId?: string;
  stepSequence: number;
  stepName?: string;
  approverId: string;
  approverName: string;
  action: ApprovalAction;
  comments?: string;
  delegatedTo?: string;
  actedAt: string;
}

export interface PendingApproval {
  workflowInstanceId: string;
  documentId: string;
  documentType: DocumentCategory;
  documentNumber: string;
  documentTitle?: string;
  requesterId: string;
  requesterName: string;
  requestedAt: string;
  currentStepName: string;
  priority: string;
  amount?: number;
}

export type TabType =
  | 'Dashboard'
  | 'DailyArrivals'
  | 'Reservations'
  | 'Accounting'
  | 'Guests'
  | 'HotelSettings'
  | 'Staff'
  | 'RoleManagement'       // 角色管理
  | 'DepartmentManagement' // 部門管理
  | 'ActivityLog'
  | 'HotelManagement'
  | 'BuildingManagement'
  | 'RoomSettings'
  | 'DatabaseManagement'
  | 'Handover'
  | 'Housekeeping'
  | 'Inventory'        // 庫存管理
  | 'Procurement'      // 採購管理
  | 'GoodsManagement'  // 進出貨管理
  | 'StockTransfer'    // 調撥管理
  | 'PettyCash'        // 零用金管理
  | 'Workflow'         // 流程簽核
  | 'DocumentTypes'    // 單據類別設定
  | 'DocumentSearch'   // 單據查詢
  | 'InvoiceSequence' // 發票字軌管理
  | 'MissionControl'; // 任務控制中心

// ==================== 會計系統類型 ====================

// 會計科目類型
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

// 會計科目 (Chart of Accounts)
export interface ChartOfAccount {
  id: string;
  code: string;           // 科目代碼，如 "1101", "6101"
  name: string;           // 科目名稱
  type: AccountType;      // 資產/負債/權益/收入/費用
  parentId?: string;      // 父科目 ID (樹狀結構)
  level: number;          // 層級 (1-4)
  isActive: boolean;
  hotelId?: string;       // 可選：特定飯店專用科目（null 表示集團通用）
  description?: string;
  normalBalance: 'Debit' | 'Credit'; // 正常餘額方向
  createdAt?: string;
  updatedAt?: string;
}

// 傳票狀態
export type JournalStatus = 'Draft' | 'Pending' | 'Posted' | 'Voided';

// 傳票 (Journal Entry)
export interface JournalEntry {
  id: string;
  entryNumber: string;    // 傳票編號
  hotelId: string;
  entryDate: string;      // 傳票日期
  postingDate?: string;   // 過帳日期
  period: string;         // 會計期間 "2026-01"
  status: JournalStatus;
  description: string;
  totalDebit: number;
  totalCredit: number;
  sourceType?: 'Invoice' | 'PettyCash' | 'Procurement' | 'Manual'; // 來源類型
  sourceId?: string;      // 來源單據 ID
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  createdAt?: string;
  updatedAt?: string;
  lines?: JournalEntryLine[];
}

// 傳票明細
export interface JournalEntryLine {
  id: string;
  entryId: string;
  lineNumber: number;
  accountId: string;      // 會計科目 ID
  accountCode?: string;   // 會計科目代碼 (冗餘欄位方便顯示)
  accountName?: string;   // 會計科目名稱 (冗餘欄位方便顯示)
  debitAmount: number;
  creditAmount: number;
  description?: string;
  createdAt?: string;
}

// 總帳 (General Ledger) - 科目期間餘額
export interface GeneralLedger {
  id: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  hotelId: string;
  period: string;         // 會計期間 "2026-01"
  openingBalance: number; // 期初餘額
  totalDebit: number;     // 本期借方合計
  totalCredit: number;    // 本期貸方合計
  closingBalance: number; // 期末餘額
  updatedAt?: string;
}

// 會計期間
export interface AccountingPeriod {
  id: string;
  hotelId: string;
  period: string;         // "2026-01"
  year: number;
  month: number;
  status: 'Open' | 'Closed' | 'Locked';
  closedBy?: string;
  closedAt?: string;
  createdAt?: string;
}



