/**
 * 會計相關類型定義
 */

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
    sourceType?: 'Invoice' | 'PettyCash' | 'Procurement' | 'Manual' | 'Payment' | 'System'; // 來源類型
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
