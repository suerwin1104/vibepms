
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from './config/supabase';
import { AccountingService, WorkflowService, realtimeService, PaymentService, InvoiceService, RealtimeConnectionStatus } from './services';
import { useInitialData } from './hooks';
import {
  TabType, Room, RoomStatus, Reservation, Staff, Hotel, Building, Guest, Invoice,
  Transaction, PaymentMethod, RoomNote, Country, AuditLogEntry, BillableItem,
  ConsumptionItem, DocumentType, Warehouse, InventoryItem, InventoryRecord,
  Supplier, PurchaseRequisition, PurchaseOrder, GoodsReceipt, GoodsIssue,
  StockTransfer, PettyCashAccount, PettyCashTransaction, WorkflowDefinition,
  WorkflowInstance, ApprovalRecord, PendingApproval, Department, SystemRole,
  ChartOfAccount, JournalEntry, JournalEntryLine, GeneralLedger, Housekeeper,
  RoomTypeDefinition
} from './types';

import { MOCK_STAFF } from './constants';

// 佈局元件
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import LoginScreen from './components/layout/LoginScreen';

// 共用元件
import Modal from './components/common/Modal';
import RealtimeIndicator from './components/common/RealtimeIndicator';

// 房態看板元件
import RoomGrid from './components/dashboard/RoomGrid';
import RoomActionMenu from './components/dashboard/RoomActionMenu';
import RoomNoteManager from './components/dashboard/RoomNoteManager';
import DailyArrivals from './components/dashboard/DailyArrivals';

// 訂房元件
import ReservationManagement from './components/reservation/ReservationManagement';
import ReservationForm from './components/reservation/ReservationForm';
import OrderDetailsModal from './components/reservation/OrderDetailsModal';
import InvoiceReceipt from './components/reservation/InvoiceReceipt';
import GuestManagement from './components/reservation/GuestManagement';

// 會計元件
import Accounting from './components/accounting/Accounting';

// 房務元件
import HousekeepingOps from './components/housekeeping/HousekeepingOps';
import HandoverManagement from './components/housekeeping/HandoverManagement';
import ActivityLog from './components/housekeeping/ActivityLog';

// 採購元件
import ProcurementManagement from './components/procurement/ProcurementManagement';

// 庫存元件
import InventoryManagement from './components/inventory/InventoryManagement';
import GoodsManagement from './components/inventory/GoodsManagement';
import StockTransferManagement from './components/inventory/StockTransferManagement';
import PettyCashManagement from './components/inventory/PettyCashManagement';

// 流程元件
import WorkflowManagement from './components/workflow/WorkflowManagement';
import GenericCustomFormPage from './components/workflow/GenericCustomFormPage';

// 設定元件
import StaffManagement from './components/settings/StaffManagement';
import MissionControl from './components/agents/MissionControl';
import RoleManagement from './components/settings/RoleManagement';
import DepartmentManagement from './components/settings/DepartmentManagement';
import HotelManagement from './components/settings/HotelManagement';
import BuildingManagement from './components/settings/BuildingManagement';
import RoomSettings from './components/settings/RoomSettings';
import DatabaseManagement from './components/settings/DatabaseManagement';
import DocumentSearch from './components/settings/DocumentSearch';
import InvoiceSequenceManagement from './components/settings/InvoiceSequenceManagement';
import PermissionManagement from './components/settings/PermissionManagement';

// 服務
// (Moved to top-level imports)



const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    try {
      const saved = sessionStorage.getItem('vibe_pms_user');
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      // Basic validation to prevent crashes
      if (parsed && typeof parsed === 'object' && parsed.id && Array.isArray(parsed.authorizedHotels)) {
        return parsed;
      }
      // Clear invalid data
      sessionStorage.removeItem('vibe_pms_user');
      return null;
    } catch (e) {
      sessionStorage.removeItem('vibe_pms_user');
      return null;
    }
  });
  const [selectedHotelId, setSelectedHotelId] = useState<string>(() => {
    return sessionStorage.getItem('vibe_pms_hotel_id') || '';
  });
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (sessionStorage.getItem('vibe_pms_active_tab') as TabType) || 'Dashboard';
  });
  const [selectedCustomFormId, setSelectedCustomFormId] = useState<string | null>(null);

  const {
    hotels, buildings, guests, countries, rooms, reservations, transactions,
    invoices, staff, roomNotes, billableItems, consumptionItems, auditLogs,
    roomTypes, tableHousekeepers, housekeepers, cleaningTasks, documentTypes,
    warehouses, inventoryItems, inventoryRecords, suppliers, purchaseRequisitions,
    purchaseOrders, goodsReceipts, goodsIssues, stockTransfers, pettyCashAccounts,
    pettyCashTransactions, departments, workflowDefinitions, workflowInstances,
    approvalRecords, pendingApprovals, systemRoles, chartOfAccounts, journalEntries,
    generalLedgers, realtimeStatus, lastSyncTime, recentlyUpdatedRooms,
    recentlyUpdatedWorkflows, isLoading, fetchInitialData, refreshInvoices, refreshJournalEntries,
    setRooms, setReservations, setInvoices, setRoomNotes, setJournalEntries,
    setTransactions, setGuests, setStaff, setBuildings, setBillableItems,
    setConsumptionItems, setAuditLogs, setRoomTypes, setDepartments,
    setSystemRoles, setChartOfAccounts, setGeneralLedgers, setWarehouses,
    setInventoryItems, setInventoryRecords, setSuppliers, setPurchaseRequisitions,
    setPurchaseOrders, setGoodsReceipts, setGoodsIssues, setStockTransfers,
    setPettyCashAccounts, setPettyCashTransactions, setWorkflowDefinitions,
    setWorkflowInstances, setApprovalRecords, setPendingApprovals,
    setHotels, setCleaningTasks, setDocumentTypes, setTableHousekeepers,
    refreshDocumentTypes
  } = useInitialData(selectedHotelId, currentUser);

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


  useEffect(() => {
    // Reset selection when hotel changes
    setSelectedRoomId(null);
    setSelectedOldReservation(null);
  }, [selectedHotelId]);


  // Global Lock for Save Operations to prevent double submission
  const isSavingRef = useRef(false);




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
        const isCheckIn = finalSavedRes?.status === 'CheckedIn';
        const paymentLabel = isCheckIn ? '房租' : '訂金';

        const txId = `TX-${Date.now()}`;
        const { error: txError } = await supabase.from('transactions').insert({
          id: txId,
          hotel_id: selectedHotelId,
          reservation_id: targetResId,
          amount: payload.initialPayment.amount,
          type: 'Payment',
          method: payload.initialPayment.method || 'Cash',
          description: payload.initialPayment.description || paymentLabel,
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
            description: payload.initialPayment.description || paymentLabel,
            createdAt: new Date().toISOString(),
            staffName: currentUser?.name || 'System'
          }, ...prev]);

          // ============================================================
          // 自動產生傳票 (Auto-Journal for Initial Payment)
          // ============================================================
          try {
            const dateStr = new Date().toISOString().split('T')[0];
            const method = payload.initialPayment.method || 'Cash';
            const amount = payload.initialPayment.amount;

            // 1. 查找科目
            let paymentAcc = chartOfAccounts.find(a => a.code === '1101'); // 預設現金
            if (method === 'CreditCard') paymentAcc = chartOfAccounts.find(a => a.code === '1102');
            else if (method === 'Transfer') paymentAcc = chartOfAccounts.find(a => a.code === '1103');

            // 2. 收入科目 (預設房租收入)
            const revenueAcc = chartOfAccounts.find(a => a.code === '4101');

            if (paymentAcc && revenueAcc) {
              const journalLines = [
                {
                  accountId: paymentAcc.id,
                  description: `${method === 'Cash' ? '現金' : '其他'}收款 - ${reservation.roomNumber}房`,
                  debit: amount,
                  credit: 0
                },
                {
                  accountId: revenueAcc.id,
                  description: `${paymentLabel}收入 - ${reservation.roomNumber}房`,
                  debit: 0,
                  credit: amount
                }
              ];

              const result = await AccountingService.createJournalEntry({
                hotelId: selectedHotelId,
                date: dateStr,
                description: [
                  `📅 ${dateStr} ${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
                  `🏨 飯店: ${hotels.find(h => h.id === selectedHotelId)?.code || '未知'} | 房號: ${reservation.roomNumber}`,
                  `🔢 訂單: ${targetResId}`,
                  `📋 發票: 尚未開票`,
                  `💰 收款: $${amount.toLocaleString()} (${method === 'Cash' ? '現金' : method === 'CreditCard' ? '信用卡' : '銀行轉帳'})`
                ].join('\n'),
                referenceId: txId,
                type: 'Payment',
                lines: journalLines,
                status: 'Draft',
                createdBy: currentUser?.id || 'System'
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
                  console.log(`[自動傳票] 建立成功: ${newEntry.entry_number}`);
                }
              }
            }
          } catch (journalError) {
            console.error('Failed to create auto-journal for initial payment', journalError);
          }

          // Ensure journal entries are refreshed
          await refreshJournalEntries();
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
    if (!currentUser) {
      alert('錯誤: 未登入系統 (User not logged in)');
      return;
    }

    try {
      const { newPaidAmount } = await PaymentService.collectPayment({
        resId, amount, method, currentUser, reservations, hotels,
        invoices, billableItems, chartOfAccounts, journalEntries
      });

      // Update local state for immediate feedback
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, paidAmount: newPaidAmount } : r));
      setTransactions(prev => [{
        id: `TX-${Date.now()}`, hotelId: reservations.find(r => r.id === resId)?.hotelId || '',
        reservationId: resId, amount, type: 'Payment', method, description: '櫃檯收款',
        createdAt: new Date().toISOString(), staffName: currentUser.name
      } as Transaction, ...prev]);

      await refreshJournalEntries();
      alert('收款成功');
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
        // Refresh entries - 不過濾 hotel_id，確保取得所有傳票
        const { data: jeData } = await supabase
          .from('journal_entries')
          .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(code, name))')
          .order('entry_date', { ascending: false })
          .limit(200);

        if (jeData) {
          const mappedEntries = jeData.map((e: any) => ({
            id: e.id,
            entryNumber: e.entry_number,
            hotelId: e.hotel_id,
            entryDate: e.entry_date,
            postingDate: e.posting_date,
            period: e.period,
            status: e.status,
            description: e.description,
            totalDebit: e.total_debit,
            totalCredit: e.total_credit,
            sourceType: e.source_type,
            sourceId: e.source_id,
            createdBy: e.created_by,
            approvedBy: e.approved_by,
            createdAt: e.created_at,
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

      // 消費項目新增時不產生傳票
      // 傳票只在收款時產生，包含所有消費明細
      // 避免重複請款問題
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

      // 作廢對應的消費傳票
      const relatedEntry = journalEntries.find(je => je.sourceId === id && je.sourceType === 'Consumption');
      if (relatedEntry && relatedEntry.status !== 'Voided') {
        const voidResult = await AccountingService.voidJournalEntry(relatedEntry.id);
        if (voidResult.success) {
          // 更新本地傳票狀態
          setJournalEntries(prev => prev.map(je =>
            je.id === relatedEntry.id ? { ...je, status: 'Voided' } : je
          ));
        }
      }
    } catch (e: any) {
      alert(`刪除項目失敗: ${e.message}`);
    }
  };

  const handleIssueInvoice = async (amount: number, reservationId?: string, buyerId?: string): Promise<string | undefined> => {
    if (!currentUser) return undefined;
    try {
      const hotelRooms = rooms.filter(r => r.hotelId === selectedHotelId);
      const newInv = await InvoiceService.issueInvoice({
        amount, reservationId, buyerId, selectedHotelId, reservations,
        selectedOldReservation, selectedRoomId, hotelRooms,
        invoices, currentUser, journalEntries
      });

      if (newInv) {
        setInvoices(prev => [newInv, ...prev]);
        await refreshJournalEntries();
        return newInv.id;
      }
      return undefined;
    } catch (e: any) {
      alert(`開票失敗: ${e.message}`);
      return undefined;
    }
  };

  const handleVoidInvoice = async (invoiceId: string, reason: string): Promise<void> => {
    try {
      await InvoiceService.voidInvoice({ invoiceId, reason, invoices });
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'Voided' } : inv));
      await refreshJournalEntries();
      alert('發票已作廢');
    } catch (err: any) {
      console.error(err);
      alert(`作廢失敗: ${err.message}`);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string): Promise<void> => {
    try {
      await InvoiceService.deleteInvoice(invoiceId);
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      alert('發票已刪除');
    } catch (e: any) {
      console.error('Delete Invoice Failed:', e);
      alert(`刪除失敗: ${e.message}`);
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

      // 4. Accounting Entry: 嘗試合併到現有訂單傳票
      const dateStr = new Date().toISOString().split('T')[0];

      // 查找現有的同訂單草稿傳票
      const existingDraftEntry = journalEntries.find(e =>
        String(e.hotelId) === String(res.hotelId) &&
        (e.sourceType === 'Payment' || e.sourceType === 'System') &&
        e.status === 'Draft' &&
        // 匹配該訂單的傳票
        (e.description?.includes(`訂單: ${resId}`) ||
          (e.description?.includes(`房號: ${res.roomNumber}`) || e.description?.includes(`${res.roomNumber}房`)))
      );

      if (existingDraftEntry) {
        // console.log('[退款傳票] 找到現有草稿傳票，正在執行「淨額法」更新...', existingDraftEntry.id);
        const entryId = existingDraftEntry.id;

        // 獲取付款方式對應的借方科目 (Asset) UUID
        const refundCode = method === 'Cash' ? '1101' : method === 'CreditCard' ? '1102' : method === 'BankTransfer' ? '1102' : '1101';
        const refundDebitAccount = chartOfAccounts.find(a => a.code === refundCode);
        const refundDebitAccountId = refundDebitAccount?.id;

        if (!refundDebitAccountId) {
          // console.error('[Refund] Cannot find account ID for code:', refundCode);
          alert('系統錯誤：找不到對應的會計科目 ID');
          return;
        }

        // 獲取現有分錄
        const { data: existingLines } = await supabase
          .from('journal_entry_lines')
          .select('*')
          .eq('entry_id', entryId)
          .order('line_number');

        if (existingLines) {
          // 策略：
          // 1. 減少 資產科目 (Cash/Bank) 的 借方金額 (Debit)
          // 2. 減少 收入科目 (Revenue) 的 貸方金額 (Credit)

          let remainingRefundAmount = amount; // 待扣減金額

          // 1. 處理借方 (Asset): 扣減現金/銀行存款
          // 優先找同科目的借方
          const targetDebitLine = existingLines.find((l: any) => l.account_id === refundDebitAccountId && l.debit_amount > 0);

          if (targetDebitLine) {
            if (targetDebitLine.debit_amount >= amount) {
              // 金額足夠，直接扣減
              await supabase.from('journal_entry_lines').update({
                debit_amount: targetDebitLine.debit_amount - amount
              }).eq('id', targetDebitLine.id);
            } else {
              // 金額不足，扣減至0，剩餘的新增貸方
              const deduct = targetDebitLine.debit_amount;
              const remainder = amount - deduct;
              await supabase.from('journal_entry_lines').update({ debit_amount: 0 }).eq('id', targetDebitLine.id);
              // 剩餘部分新增貸方 (Credit Cash)
              await supabase.from('journal_entry_lines').insert({
                id: crypto.randomUUID(),
                entry_id: entryId,
                line_number: 999, // 暫時給大號碼
                account_id: refundDebitAccountId,
                debit_amount: 0,
                credit_amount: remainder,
                description: `退款支出 (${method}) - 餘額`
              });
            }
          } else {
            // 找不到同科目借方，直接新增貸方 (Credit Cash)
            await supabase.from('journal_entry_lines').insert({
              id: crypto.randomUUID(),
              entry_id: entryId,
              line_number: 998,
              account_id: refundDebitAccountId,
              debit_amount: 0,
              credit_amount: amount,
              description: `退款支出 (${method})`
            });
          }

          // 2. 處理貸方 (Revenue): 扣減收入
          // 優先扣減 '4101' (房租收入) 或 '4103' (其他收入)
          const creditLines = existingLines.filter((l: any) => l.credit_amount > 0).sort((a: any, b: any) => b.credit_amount - a.credit_amount);
          let revenueToDeduct = amount;

          for (const line of creditLines) {
            if (revenueToDeduct <= 0) break;

            if (line.credit_amount >= revenueToDeduct) {
              await supabase.from('journal_entry_lines').update({
                credit_amount: line.credit_amount - revenueToDeduct
              }).eq('id', line.id);
              revenueToDeduct = 0;
            } else {
              const deduct = line.credit_amount;
              await supabase.from('journal_entry_lines').update({ credit_amount: 0 }).eq('id', line.id);
              revenueToDeduct -= deduct;
            }
          }

          if (revenueToDeduct > 0) {
            // 如果所有收入都不夠扣，新增借方 (Debit Revenue)
            await supabase.from('journal_entry_lines').insert({
              id: crypto.randomUUID(),
              entry_id: entryId,
              line_number: 997,
              account_id: '4101', // 預設扣房租
              debit_amount: revenueToDeduct,
              credit_amount: 0,
              description: `退款沖銷 - 餘額`
            });
          }

          // 更新 Header 總額
          const { data: updatedLines } = await supabase.from('journal_entry_lines').select('debit_amount, credit_amount').eq('entry_id', entryId);
          const finalTotalDebit = updatedLines?.reduce((sum, l) => sum + l.debit_amount, 0) || 0;
          const finalTotalCredit = updatedLines?.reduce((sum, l) => sum + l.credit_amount, 0) || 0;

          const refundTimeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const updatedDescription = existingDraftEntry.description + `\n➖ ${refundTimeStr} 退款: $${amount} (${method})${note ? ` - ${note}` : ''}`;

          await supabase.from('journal_entries').update({
            description: updatedDescription,
            total_debit: finalTotalDebit,
            total_credit: finalTotalCredit
          }).eq('id', entryId);

          // console.log(`[退款傳票] 更新完成: 借方 $${finalTotalDebit}`);
        }
      } else {
        // ============================================
        // 沒有找到現有傳票，創建新的退款傳票
        // ============================================
        // console.log('[退款傳票] 找不到現有傳票，創建新傳票');

        const refundCode = method === 'Cash' ? '1101' : method === 'CreditCard' ? '1102' : method === 'BankTransfer' ? '1102' : '1101';
        const refundDebitAccount = chartOfAccounts.find(a => a.code === refundCode);
        const revenueAccount = chartOfAccounts.find(a => a.code === '4101');

        if (!refundDebitAccount || !revenueAccount) {
          alert('系統錯誤：找不到對應的會計科目 ID');
          return;
        }

        const accountingDesc = `退款 Refund: ${res.guestName}${note ? ` (${note})` : ''}\n📋 訂單: ${resId}\n🏨 飯店: ${hotels.find(h => h.id === res.hotelId)?.code || ''} | 房號: ${res.roomNumber}`;

        await AccountingService.createJournalEntry({
          hotelId: res.hotelId!,
          date: dateStr,
          description: accountingDesc,
          referenceId: tx.id,
          type: 'Payment',
          lines: [
            { accountId: revenueAccount.id, description: `退款 - ${res.guestName}`, debit: amount, credit: 0 }, // 減少收入
            { accountId: refundDebitAccount.id, description: `退款支出 (${method})`, debit: 0, credit: amount } // 減少現金
          ],
          status: 'Draft',
          createdBy: currentUser.id
        });
      }

      // 重新載入傳票以即時顯示
      await refreshJournalEntries();

      alert('退款成功 (Refund Processed)');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert(`退款失敗: ${errorMessage}`);
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

      // 4. Accounting Entry: 嘗試合併到現有訂單傳票
      const dateStr = new Date().toISOString().split('T')[0];

      // Resolve Account IDs
      const otherRevenueAcc = chartOfAccounts.find(a => a.code === '4103');
      const advanceDepositAcc = chartOfAccounts.find(a => a.code === '2101');
      const arAcc = chartOfAccounts.find(a => a.code === '1201');

      if (!otherRevenueAcc || !advanceDepositAcc || !arAcc) {
        alert('系統錯誤：找不到對應的會計科目 ID');
        return;
      }


      // 查找現有的同訂單草稿傳票
      const existingDraftEntry = journalEntries.find(e =>
        String(e.hotelId) === String(res.hotelId) &&
        (e.sourceType === 'Payment' || e.sourceType === 'System') &&
        e.status === 'Draft' &&
        // 匹配該訂單的傳票
        (e.description?.includes(`訂單: ${resId}`) ||
          (e.description?.includes(`房號: ${res.roomNumber}`) || e.description?.includes(`${res.roomNumber}房`)))
      );

      if (existingDraftEntry) {
        console.log('[轉公帳傳票] 找到現有草稿傳票，正在執行「淨額法」更新...', existingDraftEntry.id);
        const entryId = existingDraftEntry.id;

        // 獲取現有分錄
        const { data: existingLines } = await supabase
          .from('journal_entry_lines')
          .select('*')
          .eq('entry_id', entryId)
          .order('line_number');

        if (existingLines) {
          // 策略：轉公帳意味著將溢收款項 (Credit Other Revenue) 轉為 預收訂金/保留款 (Credit Advance Deposit)
          // 1. 減少 其他營業收入 (4103) 的 貸方金額 (Credit)
          // 2. 增加/新增 預收訂金 (2101) 的 貸方金額 (Credit)

          // 1. 優先找 '4103' (其他營業收入/溢收) 進行扣減
          let targetCreditLine = existingLines.find(l => l.account_id === otherRevenueAcc.id && l.credit_amount > 0);

          if (!targetCreditLine) {
            targetCreditLine = existingLines.find(l => l.credit_amount > 0);
          }

          if (targetCreditLine) {
            if (targetCreditLine.credit_amount >= amount) {
              await supabase.from('journal_entry_lines').update({
                credit_amount: targetCreditLine.credit_amount - amount
              }).eq('id', targetCreditLine.id);
            } else {
              await supabase.from('journal_entry_lines').update({ credit_amount: 0 }).eq('id', targetCreditLine.id);
            }
          }

          // 2. 新增 預收訂金 (2101) 貸方分錄
          const existingDepositLine = existingLines.find(l => l.account_id === advanceDepositAcc.id);
          if (existingDepositLine) {
            await supabase.from('journal_entry_lines').update({
              credit_amount: existingDepositLine.credit_amount + amount
            }).eq('id', existingDepositLine.id);
          } else {
            await supabase.from('journal_entry_lines').insert({
              id: crypto.randomUUID(),
              entry_id: entryId,
              line_number: 996,
              account_id: advanceDepositAcc.id,
              debit_amount: 0,
              credit_amount: amount,
              description: `轉公帳/保留款 (${note || 'Transfer'})`
            });
          }

          // 更新傳票 (總額理論上不變，但為了更新描述)
          const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const updatedDescription = existingDraftEntry.description + `\n➡️ ${timeStr} 轉公帳: $${amount}${note ? ` (${note})` : ''}`;

          await supabase.from('journal_entries').update({
            description: updatedDescription
          }).eq('id', existingDraftEntry.id);
        }

      } else {
        const accountingDesc = `轉公帳 Transfer: ${res.guestName}${note ? ` (${note})` : ''}\n📋 訂單: ${resId}\n🏨 飯店: ${hotels.find(h => h.id === res.hotelId)?.code || ''} | 房號: ${res.roomNumber}`;

        await AccountingService.createJournalEntry({
          hotelId: res.hotelId!,
          date: dateStr,
          description: accountingDesc,
          referenceId: tx.id,
          type: 'General',
          lines: [
            { accountId: arAcc.id, description: 'Guest Ledger Transfer', debit: amount, credit: 0 }, // Clear AR/Guest Ledger
            { accountId: advanceDepositAcc.id, description: 'Advance Deposit', debit: 0, credit: amount } // Increase Liability
          ],
          status: 'Draft', // 所有傳票都需要手動過帳
          createdBy: currentUser.id
        });
      }

      // 重新載入傳票以即時顯示
      await refreshJournalEntries();

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

      // 4. Accounting Entry: 嘗試合併到現有訂單傳票
      const dateStr = new Date().toISOString().split('T')[0];

      // 查找現有的同訂單草稿傳票
      const existingDraftEntry = journalEntries.find(e =>
        String(e.hotelId) === String(res.hotelId) &&
        (e.sourceType === 'Payment' || e.sourceType === 'System') &&
        e.status === 'Draft' &&
        // 匹配該訂單的傳票
        (e.description?.includes(`訂單: ${resId}`) ||
          (e.description?.includes(`房號: ${res.roomNumber}`) || e.description?.includes(`${res.roomNumber}房`)))
      );

      if (existingDraftEntry) {
        console.log('[取消交易傳票] 找到現有草稿傳票，正在執行「淨額法」更新...', existingDraftEntry.id);
        const entryId = existingDraftEntry.id;
        const amountToAdd = reversalTx.amount; // 這是正數 (因為是取消負數交易)

        // 獲取現有分錄
        const { data: existingLines } = await supabase
          .from('journal_entry_lines')
          .select('*')
          .eq('entry_id', entryId)
          .order('line_number');

        if (existingLines) {
          // 策略：取消退款(負數) = 恢復收款(正數)
          // 1. 增加 資產科目 (Cash/Bank) 的 借方金額 (Debit)
          // 2. 增加 收入科目 (Revenue) 的 貸方金額 (Credit)

          // 1. 增加借方 (Asset)
          // 假設取消的是 '1101' (Cash) 或 '1102' (Credit Card)
          // 這裡我們沒有原始退款的 method，只能猜測或預設 Cash
          // *更好的做法*是看 tx.method，如果 tx.method 是 'Cash' 表示當初是 Cash 退款
          const method = tx.method;
          const targetCode = method === 'CreditCard' ? '1102' : method === 'BankTransfer' ? '1102' : '1101';
          const targetAccount = chartOfAccounts.find(a => a.code === targetCode);
          const rentRevenueAcc = chartOfAccounts.find(a => a.code === '4101');

          const targetAccountId = targetAccount?.id;
          const rentRevenueAccId = rentRevenueAcc?.id;

          if (!targetAccountId || !rentRevenueAccId) {
            console.error('Account ID not found');
            return;
          }

          const targetDebitLine = existingLines.find(l => l.account_id === targetAccountId && l.debit_amount > 0);

          if (targetDebitLine) {
            await supabase.from('journal_entry_lines').update({
              debit_amount: targetDebitLine.debit_amount + amountToAdd
            }).eq('id', targetDebitLine.id);
          } else {
            // 找不到就新增
            await supabase.from('journal_entry_lines').insert({
              id: crypto.randomUUID(),
              entry_id: entryId,
              line_number: 995,
              account_id: targetAccountId,
              debit_amount: amountToAdd,
              credit_amount: 0,
              description: `取消退款 - ${tx.description}`
            });
          }

          // 2. 增加貸方 (Revenue)
          // 優先找 '4101'
          const targetCreditLine = existingLines.find(l => l.account_id === rentRevenueAccId && l.credit_amount > 0);
          if (targetCreditLine) {
            await supabase.from('journal_entry_lines').update({
              credit_amount: targetCreditLine.credit_amount + amountToAdd
            }).eq('id', targetCreditLine.id);
          } else {
            // 找任意貸方
            const anyCredit = existingLines.find(l => l.credit_amount > 0);
            if (anyCredit) {
              await supabase.from('journal_entry_lines').update({
                credit_amount: anyCredit.credit_amount + amountToAdd
              }).eq('id', anyCredit.id);
            } else {
              await supabase.from('journal_entry_lines').insert({
                id: crypto.randomUUID(),
                entry_id: entryId,
                line_number: 994,
                account_id: rentRevenueAccId,
                debit_amount: 0,
                credit_amount: amountToAdd,
                description: `取消退款 - 恢復收入`
              });
            }
          }

          // 更新傳票描述
          const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const updatedDescription = existingDraftEntry.description + `\n❌ ${timeStr} 取消交易: ${tx.description}`;

          await supabase.from('journal_entries').update({
            description: updatedDescription
          }).eq('id', entryId);
        }



      } else {
        await AccountingService.createJournalEntry({
          hotelId: res.hotelId!,
          date: dateStr,
          description: `取消交易 Reversal: ${tx.description}\n📋 訂單: ${resId}`,
          referenceId: reversalTx.id,
          type: 'Payment', // or Reversal
          lines: [
            { accountId: '1101', description: 'Cash Reversal', debit: reversalTx.amount, credit: 0 }, // Cash In (negative)
            { accountId: '1201', description: 'Guest Ledger Reversal', debit: 0, credit: reversalTx.amount } // AR Reversal (negative)
          ],
          status: 'Draft', // 所有傳票都需要手動過帳
          createdBy: currentUser.id
        });
      }

      // 重新載入傳票以即時顯示
      await refreshJournalEntries();

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

  // 計算當前使用者有權限且啟用的大樓列表
  const availableBuildings = useMemo(() => {
    if (!currentUser) return [];

    // 1. 基礎過濾：該飯店且啟用
    let targets = buildings.filter(b => b.hotelId === selectedHotelId && b.isActive !== false);

    // 2. 權限過濾：非管理員需檢查授權館別
    // GroupAdmin 和 HotelAdmin 預設擁有該飯店所有館別權限
    if (currentUser.role !== 'GroupAdmin' && currentUser.role !== 'HotelAdmin') {
      if (currentUser.authorizedBuildings && currentUser.authorizedBuildings.length > 0) {
        targets = targets.filter(b => currentUser.authorizedBuildings.includes(b.id));
      }
      // 若 authorizedBuildings 為空，則維持預設（顯示所有，或視需求改為不顯示）。
      // 目前維持顯示所有以保持向後相容，若要嚴格限制可在此加入 else { targets = []; }
    }
    return targets;
  }, [buildings, selectedHotelId, currentUser]);

  const hotelRooms = useMemo(() => {
    // 取得該飯店下所有啟用且有權限的大樓 ID
    const activeBuildingIds = new Set(availableBuildings.map(b => b.id));

    return rooms
      .filter(r => r.hotelId === selectedHotelId && activeBuildingIds.has(r.buildingId))
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
  }, [rooms, reservations, selectedHotelId, roomNotes, availableBuildings, buildings]);

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: 'Active' | 'Voided') => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;

      // Update local state and allow Realtime to sync others
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: newStatus } : inv));

      alert(`發票狀態已更新為: ${newStatus === 'Active' ? '已開立' : '已作廢'}`);
    } catch (e: any) {
      console.error('Update invoice status failed:', e);
      alert(`更新發票狀態失敗: ${e.message}`);
    }
  };

  if (!currentUser) return (
    <LoginScreen
      staffList={staff.length > 0 ? staff : MOCK_STAFF}
      onLogin={(s) => {
        setCurrentUser(s);
        sessionStorage.setItem('vibe_pms_user', JSON.stringify(s));
        if (s.authorizedHotels.length > 0) {
          const hotelId = s.authorizedHotels[0];
          setSelectedHotelId(hotelId);
          sessionStorage.setItem('vibe_pms_hotel_id', hotelId);
        }
      }}
    />
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <Navbar
        hotels={hotels.filter(h => currentUser.role === 'GroupAdmin' || currentUser.authorizedHotels.includes(h.id))}
        selectedHotelId={selectedHotelId}
        setSelectedHotelId={(id) => {
          setSelectedHotelId(id);
          sessionStorage.setItem('vibe_pms_hotel_id', id);
        }}
        currentUser={currentUser}
        onLogout={() => {
          setCurrentUser(null);
          sessionStorage.removeItem('vibe_pms_user');
          sessionStorage.removeItem('vibe_pms_hotel_id');
          sessionStorage.removeItem('vibe_pms_active_tab');
          setActiveTab('Dashboard');
          // Reset all UI states to prevent leaking specific view state to next user
          setSelectedRoomId(null);
          setSelectedOldReservation(null);
          setIsOrderOpen(false);
          setIsActionMenuOpen(false);
          setIsResFormOpen(false);
          setIsNoteModalOpen(false);
          setIsCheckoutVerifying(false);
          setPrintConfig(null);
        }}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        realtimeStatus={realtimeStatus}
        lastSyncTime={lastSyncTime}
        pendingApprovalCount={pendingApprovals.length}
        onPendingApprovalClick={() => {
          setActiveTab('Workflow');
          sessionStorage.setItem('vibe_pms_active_tab', 'Workflow');
        }}
        onReconnect={() => {
          console.log('[App] Manual reconnect triggered');
          realtimeService.reconnect(selectedHotelId);
        }}
      />
      <div className="flex flex-1 pt-16 no-print overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            sessionStorage.setItem('vibe_pms_active_tab', tab);
          }}
          currentUser={currentUser}
          isOpen={isSidebarOpen}
          documentTypes={documentTypes}
          onSelectCustomForm={(id) => {
            setSelectedCustomFormId(id);
            setActiveTab('CustomFormView');
          }}
        />
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
                buildings={availableBuildings}
                hotel={hotels.find(h => h.id === selectedHotelId)}
                roomTypes={roomTypes}
                onRoomClick={(r) => { setSelectedRoomId(r.id); setIsActionMenuOpen(true); }}
                cleaningTasks={cleaningTasks.filter(t => t.hotelId === selectedHotelId)}
                housekeepers={housekeepers}
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
              {activeTab === 'PermissionManagement' && (
                <PermissionManagement
                  staff={staff}
                  setStaff={setStaff}
                  hotels={hotels}
                  buildings={buildings}
                  currentUser={currentUser}
                />
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
                hotels={hotels}
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
                onDeleteInvoice={handleDeleteInvoice}
                onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
                documentTypes={documentTypes}
                onAddDocType={async (dt) => {
                  const id = crypto.randomUUID();
                  const dbData = {
                    id,
                    code: dt.code,
                    name: dt.name,
                    category: dt.category,
                    description: dt.description,
                    is_active: dt.isActive,
                    accounting_code: dt.accountingCode,
                    custom_form_id: dt.customFormId
                  };
                  await supabase.from('document_types').insert(dbData);
                  setDocumentTypes(prev => [...prev, { id, ...dt } as DocumentType]);
                }}
                onUpdateDocType={async (id, dt) => {
                  const dbData: any = {};
                  if (dt.code !== undefined) dbData.code = dt.code;
                  if (dt.name !== undefined) dbData.name = dt.name;
                  if (dt.category !== undefined) dbData.category = dt.category;
                  if (dt.description !== undefined) dbData.description = dt.description;
                  if (dt.isActive !== undefined) dbData.is_active = dt.isActive;
                  if (dt.accountingCode !== undefined) dbData.accounting_code = dt.accountingCode;
                  if (dt.customFormId !== undefined) dbData.custom_form_id = dt.customFormId;

                  await supabase.from('document_types').update(dbData).eq('id', id);
                  setDocumentTypes(prev => prev.map(d => d.id === id ? { ...d, ...dt } : d));
                }}
                onDeleteDocType={async (id) => {
                  await supabase.from('document_types').delete().eq('id', id);
                  setDocumentTypes(prev => prev.filter(d => d.id !== id));
                }}
              />}
              {activeTab === 'InvoiceSequence' && <InvoiceSequenceManagement hotels={hotels} selectedHotelId={selectedHotelId} />}
              {activeTab === 'Guests' && <GuestManagement guests={guests} setGuests={setGuests} reservations={reservations} hotels={hotels} buildings={buildings} currentHotel={hotels.find(h => h.id === selectedHotelId)!} currentUser={currentUser} countries={countries} />}
              {activeTab === 'Handover' && <HandoverManagement currentUser={currentUser} selectedHotelId={selectedHotelId} hotels={hotels} />}
              {activeTab === 'Housekeeping' && <HousekeepingOps
                cleaningTasks={cleaningTasks.filter(t => t.hotelId === selectedHotelId)}
                housekeepers={housekeepers}
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
                    setTableHousekeepers(prev => [...prev, {
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
                    setTableHousekeepers(prev => prev.map(h => h.id === id ? { ...h, ...data } : h));
                  } catch (e: any) {
                    alert(`更新失敗: ${e.message}`);
                  }
                }}
                onDeleteHousekeeper={async (id) => {
                  try {
                    const { error } = await supabase.from('housekeepers').delete().eq('id', id);
                    if (error) throw error;
                    setTableHousekeepers(prev => prev.filter(h => h.id !== id));
                  } catch (e: any) {
                    alert(`刪除失敗: ${e.message}`);
                  }
                }}
                onManualAssign={async (roomId, roomNumber, housekeeperId, housekeeperName, taskType) => {
                  try {
                    const today = new Date().toISOString().split('T')[0];

                    // Check if there's already an active (uncompleted) task for this room today
                    const existingActiveTask = cleaningTasks.find(t =>
                      t.roomId === roomId &&
                      t.taskDate === today &&
                      t.status !== 'Completed' &&
                      t.status !== 'Inspected'
                    );

                    if (existingActiveTask) {
                      alert(`房間 ${roomNumber} 已有進行中或待分配的任務，請先完成或刪除現有任務。`);
                      return;
                    }

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

                    // Filter out rooms that already have an uncompleted task today (Deduplication Logic)
                    const existingActiveRoomIds = new Set(
                      cleaningTasks
                        .filter(t => t.hotelId === selectedHotelId && t.taskDate === today && t.status !== 'Completed' && t.status !== 'Inspected')
                        .map(t => t.roomId)
                    );

                    const newTasks = hotelRoomsToCheck
                      .filter(room => !existingActiveRoomIds.has(room.id))
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
                onRefreshDocumentTypes={refreshDocumentTypes}
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

              {activeTab === 'CustomFormView' && selectedCustomFormId && (
                <GenericCustomFormPage
                  formId={selectedCustomFormId}
                  currentUser={currentUser}
                />
              )}

              {/* {activeTab === 'MissionControl' && <MissionControl />} */}


            </div>
          )}
        </main>
      </div>

      <Modal isOpen={isOrderOpen} onClose={() => { setIsOrderOpen(false); setSelectedOldReservation(null); setIsCheckoutVerifying(false); }} title={selectedOldReservation ? (selectedOldReservation.status === 'Confirmed' ? "繳費與入住 (Payment & Check-In)" : selectedOldReservation.status === 'CheckedIn' ? "目前客戶訂單" : "前一房客紀錄") : "房態明細"}>
        {selectedRoomId && hotelRooms.find(r => r.id === selectedRoomId) && (() => {
          // Get fresh reservation data from state instead of stale references
          const currentResId = selectedOldReservation?.id || hotelRooms.find(r => r.id === selectedRoomId)?.current_order?.id;
          const freshReservation = currentResId ? reservations.find(r => r.id === currentResId) : undefined;
          return (
            <OrderDetailsModal
              room={hotelRooms.find(r => r.id === selectedRoomId)!}
              hotel={hotels.find(h => h.id === selectedHotelId)}
              reservation={freshReservation || selectedOldReservation || hotelRooms.find(r => r.id === selectedRoomId)?.current_order}
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
          );
        })()}
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
                case 'cancel_order':
                  if (room.current_order) {
                    const res = room.current_order;
                    if (!window.confirm(`確定要取消 ${res.guestName} 的訂單嗎？\n(取消後房間將變為空房號)`)) {
                      return;
                    }
                    try {
                      // Update Reservation
                      await supabase.from('reservations').update({
                        status: 'Cancelled',
                        last_edited_by: currentUser?.name || 'System'
                      }).eq('id', res.id);

                      // Free the room (VC)
                      await supabase.from('rooms').update({ status: 'VC' })
                        .eq('number', res.roomNumber)
                        .eq('hotel_id', selectedHotelId);

                      // Update Local State
                      setReservations(prev => prev.map(r => r.id === res.id ? { ...r, status: 'Cancelled' } : r));
                      setRooms(prev => prev.map(r =>
                        r.hotelId === selectedHotelId && r.number === res.roomNumber
                          ? { ...r, status: RoomStatus.VC }
                          : r
                      ));

                      setIsActionMenuOpen(false);
                      alert(`訂單已取消，房間 ${res.roomNumber} 已釋出。`);
                    } catch (e: any) {
                      alert(`取消失敗: ${e.message}`);
                    }
                  }
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
                  roomNumber: hotelRooms.find(r => r.id === selectedRoomId)?.number || '',
                  roomType: hotelRooms.find(r => r.id === selectedRoomId)?.type || '',
                  buildingId: hotelRooms.find(r => r.id === selectedRoomId)?.buildingId || '',
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
              roomNumber: hotelRooms.find(r => r.id === selectedRoomId)?.number || '',
              roomType: hotelRooms.find(r => r.id === selectedRoomId)?.type || '',
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
            room={hotelRooms.find(r => r.id === selectedRoomId) || rooms.find(r => r.id === selectedRoomId)!}
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
