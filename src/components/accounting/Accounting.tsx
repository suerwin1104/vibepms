import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Invoice, ChartOfAccount, JournalEntry, JournalEntryLine, GeneralLedger, Hotel } from '../../types';
import ChartOfAccounts from './ChartOfAccounts';
import JournalEntryManagement from './JournalEntryManagement';
import GeneralLedgerView from './GeneralLedgerView';
import InvoiceOverview from './InvoiceOverview';

import FinancialReports from './FinancialReports';
import AccountingPeriodManagement from './AccountingPeriodManagement';
import DocumentSubjectMapping from './DocumentSubjectMapping';
import RentSubjectMapping from './RentSubjectMapping';

interface Props {
  invoices?: Invoice[]; // Deprecated, fetched internally by InvoiceOverview
  hotels: Hotel[];
  hotelId: string;
  currentUserName: string;
  currentUserRole: string;
  accounts: ChartOfAccount[];
  documentTypes: DocumentType[];
  journalEntries: JournalEntry[];
  generalLedgers: GeneralLedger[];
  onAddAccount: (account: Omit<ChartOfAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateAccount: (id: string, account: Partial<ChartOfAccount>) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onAddJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>, lines: Omit<JournalEntryLine, 'id' | 'entryId' | 'createdAt'>[]) => Promise<void>;
  onPostJournalEntry: (id: string) => Promise<void>;
  onVoidJournalEntry: (id: string) => Promise<void>;
  onRevertJournalEntry?: (id: string) => Promise<void>;
  onUpdateJournalEntry: (id: string, entry: Partial<JournalEntry>, lines: Omit<JournalEntryLine, 'id' | 'entryId' | 'createdAt'>[]) => Promise<void>;
  onDeleteJournalEntry: (id: string) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  onUpdateInvoiceStatus?: (id: string, status: 'Active' | 'Voided') => Promise<void>;
  onVoid?: (id: string) => void;
  onPrint?: (inv: Invoice, layout: 'A4' | 'POS') => void;
  currentUserId?: string;
  onAddDocType: (dt: Omit<DocumentType, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateDocType: (id: string, dt: Partial<DocumentType>) => Promise<void>;
  onDeleteDocType: (id: string) => Promise<void>;
}

type SubTab = 'invoices' | 'accounts' | 'journals' | 'ledger' | 'reports' | 'periods' | 'doc_mapping' | 'rent_mapping';

// 會計系統允許的角色
const ACCOUNTING_ROLES = ['GroupAdmin', 'FinanceManager', 'Finance', 'Accounting', 'Auditor'];
// 可以過帳的角色
const POSTING_ROLES = ['GroupAdmin', 'FinanceManager'];
// 可以編輯(新增/修改/刪除草稿)的角色
const EDIT_ROLES = ['GroupAdmin', 'FinanceManager', 'Finance', 'Accounting'];

const Accounting: React.FC<Props> = ({
  invoices,
  hotels,
  hotelId,
  currentUserName,
  currentUserRole,
  accounts,
  documentTypes,
  journalEntries,
  generalLedgers,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onAddJournalEntry,
  onPostJournalEntry,
  onVoidJournalEntry,
  onRevertJournalEntry,
  onUpdateJournalEntry,
  onDeleteJournalEntry,
  onDeleteInvoice,
  onUpdateInvoiceStatus,
  onVoid,

  onPrint,
  currentUserId,
  onAddDocType,
  onUpdateDocType,
  onDeleteDocType
}) => {
  const [subTab, setSubTab] = useState<SubTab>('invoices');

  // 權限檢查
  const canAccessAccounting = ACCOUNTING_ROLES.includes(currentUserRole);
  const canPostJournal = POSTING_ROLES.includes(currentUserRole);
  const canEditJournal = EDIT_ROLES.includes(currentUserRole);
  const canManageAccounts = POSTING_ROLES.includes(currentUserRole); // 只有主管可管理科目


  // Invoice filtering logic moved to InvoiceOverview component



  const tabs = [
    { key: 'invoices', label: '📋 發票總覽', icon: '📋' },
    { key: 'accounts', label: '📊 會計科目', icon: '📊' },
    { key: 'journals', label: '📝 傳票管理', icon: '📝' },
    { key: 'ledger', label: '📒 總分類帳', icon: '📒' },
    { key: 'reports', label: '📈 財務報表', icon: '📈' },
    { key: 'periods', label: '📅 期間結算', icon: '📅' },
    { key: 'doc_mapping', label: '🏷️ 單據科目', icon: '🏷️' },
    { key: 'rent_mapping', label: '🏠 房租科目', icon: '🏠' }
  ];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800">💰 財務會計管理</h2>
          <p className="text-sm text-slate-500 font-medium">會計科目、傳票、過帳與財務報表</p>
        </div>
      </header>

      {/* Sub Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        backgroundColor: '#f1f5f9',
        padding: '4px',
        borderRadius: '12px',
        width: 'fit-content'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key as SubTab)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              backgroundColor: subTab === tab.key ? 'white' : 'transparent',
              color: subTab === tab.key ? '#1e40af' : '#64748b',
              boxShadow: subTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices Tab (Original Content) */}
      {subTab === 'invoices' && (
        <InvoiceOverview
          initialHotelId={hotelId}
          hotels={hotels}
          onDeleteInvoice={onDeleteInvoice}
          onUpdateInvoiceStatus={onUpdateInvoiceStatus}
          onPrint={onPrint}
        />
      )}

      {/* Chart of Accounts Tab */}
      {subTab === 'accounts' && (
        <ChartOfAccounts
          accounts={accounts}
          onAdd={onAddAccount}
          onUpdate={onUpdateAccount}
          onDelete={onDeleteAccount}
        />
      )}

      {/* Journal Entries Tab */}
      {subTab === 'journals' && (
        <JournalEntryManagement
          entries={journalEntries}
          accounts={accounts}
          hotelId={hotelId}
          currentUserName={currentUserName}
          canPost={canPostJournal}
          canEdit={canEditJournal}
          onAdd={onAddJournalEntry}
          onPost={onPostJournalEntry}
          onVoid={onVoidJournalEntry}
          onRevert={onRevertJournalEntry}
          onUpdate={onUpdateJournalEntry}
          onDelete={onDeleteJournalEntry}
        />
      )}

      {/* General Ledger Tab */}
      {subTab === 'ledger' && (
        <GeneralLedgerView
          hotelId={hotelId}
          accounts={accounts}
        />
      )}

      {/* Financial Reports Tab */}
      {subTab === 'reports' && (
        <FinancialReports
          ledgers={generalLedgers}
          accounts={accounts}
          hotelId={hotelId}
        />
      )}


      {/* Accounting Period Management Tab */}
      {subTab === 'periods' && (
        <AccountingPeriodManagement
          selectedHotelId={hotelId}
          currentUserId={currentUserId || ''}
        />
      )}

      {/* Document Mapping Tab */}
      {subTab === 'doc_mapping' && (
        <DocumentSubjectMapping
          hotelId={hotelId}
          accounts={accounts}
          documentTypes={documentTypes}
          onAddDocType={onAddDocType}
          onUpdateDocType={onUpdateDocType}
          onDeleteDocType={onDeleteDocType}
        />
      )}

      {/* Rent Mapping Tab */}
      {subTab === 'rent_mapping' && (
        <RentSubjectMapping
          hotelId={hotelId}
          accounts={accounts}
        />
      )}
    </div>
  );
};

export default Accounting;
