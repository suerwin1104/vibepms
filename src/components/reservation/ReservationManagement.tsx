import React, { useState, useMemo, useEffect } from 'react';
import { Reservation, Room, Building, Guest, Staff, RoomStatus, BillableItem, Transaction, ConsumptionItem } from '../../types';
import { supabase } from '../../config/supabase';
import Modal from '../common/Modal';
import Pagination from '../common/Pagination';

interface Props {
  reservations: Reservation[];
  // Fix: changed onComplexSave to allow Promise<boolean> for async operations
  onComplexSave: (payload: any) => boolean | Promise<boolean>;
  rooms: Room[];
  buildings: Building[];
  guests: Guest[];
  currentUser: Staff;
  hotelId: string;
  onCancel: (id: string) => Promise<void>;
  billableItems: BillableItem[];
  consumptionItems: ConsumptionItem[];
  transactions: Transaction[];
  onUpdateBillableItems: (items: BillableItem[], reservationId?: string) => Promise<void>;
}

// Time options in 30-minute intervals
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, '0');
  const minute = (i % 2 === 0 ? '00' : '30');
  return `${hour}:${minute}`;
});

// Get current time in HH:mm format, rounded to nearest 30 minutes
const getCurrentTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes() < 30 ? '00' : '30';
  return `${hours}:${minutes}`;
};

const ReservationManagement: React.FC<Props> = ({ reservations, onComplexSave, onCancel, rooms, buildings, guests, currentUser, hotelId, billableItems, consumptionItems, transactions, onUpdateBillableItems }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [idLookupStatus, setIdLookupStatus] = useState<'idle' | 'found' | 'none'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null); // Preserve original status when editing
  const [formTab, setFormTab] = useState<'Guest' | 'Billing'>('Guest');
  // 改進：更細緻的狀態分類
  const [filterStatus, setFilterStatus] = useState<'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'NoShow' | 'Cancelled' | 'All'>('Confirmed');
  const [localBillableItems, setLocalBillableItems] = useState<BillableItem[]>([]);
  const [itemMasterOpen, setItemMasterOpen] = useState(false);
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [newItem, setNewItem] = useState({ description: '', amount: 0, quantity: 1, paymentMethod: 'Room Charge', note: '' });

  // Date Filter State
  const [dateFilterMode, setDateFilterMode] = useState<'All' | 'Today' | 'ThreeDays' | 'Custom'>('All');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Dynamic Consumption Items State
  const [dynamicConsumptionItems, setDynamicConsumptionItems] = useState<ConsumptionItem[]>(consumptionItems);
  useEffect(() => {
    setDynamicConsumptionItems(consumptionItems);
  }, [consumptionItems]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Time state with defaults: Check-in = current time, Check-out = 11:00
  const [checkInTime, setCheckInTime] = useState(getCurrentTime());
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    idNumber: '',
    guestName: '',
    phone: '',
    checkIn: '',
    checkOut: '',
    buildingId: '',
    roomId: '',
    totalPrice: 0,
    paidAmount: 0,
    discount: 0,
    note: '',
    // New Legacy Fields
    adults: 1,
    children: 0,
    licensePlate: '',
    companyName: '',
    bookingAgent: '',
    // Latest Legacy Fields
    roomRent: 0,
    extraItems: 0,
    addBed: 0,
    source: 'WalkIn',
    // Pet Fields
    petType: 'None',
    petCount: 0,
    petNote: ''
  });

  const availableRooms = useMemo(() => {
    if (!formData.buildingId || !formData.checkIn || !formData.checkOut) return [];

    // Get rooms for this building
    let buildingRooms = rooms.filter(r => r.buildingId === formData.buildingId);

    // If we have a selected roomId (editing), ensure it's included even if from different building
    if (formData.roomId) {
      const selectedRoom = rooms.find(r => r.id === formData.roomId);
      if (selectedRoom && !buildingRooms.some(r => r.id === selectedRoom.id)) {
        buildingRooms = [selectedRoom, ...buildingRooms];
      }
    }

    return buildingRooms
      .map(r => {
        // 當編輯時，正在編輯的房間永遠可選
        const isCurrentRoom = r.id === formData.roomId && editingId;
        const isOccupied = r.status === RoomStatus.OC || r.status === RoomStatus.SO;
        // 簡易衝突偵測 - 排除正在編輯的訂單本身
        const hasConflict = reservations.some(res =>
          res.roomNumber === r.number &&
          res.id !== editingId && // 排除正在編輯的訂單
          res.status !== 'Cancelled' &&
          res.status !== 'CheckedOut' &&
          ((formData.checkIn >= res.checkIn && formData.checkIn < res.checkOut) ||
            (formData.checkOut > res.checkIn && formData.checkOut <= res.checkOut))
        );

        return {
          ...r,
          // 如果是目前編輯的房間，永遠可選
          isSelectable: isCurrentRoom || (r.status !== RoomStatus.OOO && !isOccupied && !hasConflict),
          statusNote: isCurrentRoom ? '(目前選定)' : r.status === RoomStatus.OOO ? '維修中' : (isOccupied || hasConflict) ? '已售完/衝突' : '可分配'
        };
      })
      .sort((a, b) => a.number.localeCompare(b.number));
  }, [rooms, formData.buildingId, formData.checkIn, formData.checkOut, formData.roomId, reservations, editingId]);

  // Derived filtered reservations with useMemo
  const filteredReservations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return reservations.filter(res => {
      // 計算 No Show：狀態是 Confirmed 但入住日期已過且未入住
      const checkInDate = res.checkIn ? new Date(res.checkIn.split(' ')[0]) : null;
      const isNoShow = res.status === 'Confirmed' && checkInDate && checkInDate < today;

      // Date Filtering Logic
      // Date Filtering Logic
      let matchesDate = true;
      if (checkInDate) {
        const checkInStr = res.checkIn.split(' ')[0]; // YYYY-MM-DD

        // Fix: Use local date string to avoid UTC shift (e.g., UTC+8 midnight is previous day UTC)
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        if (dateFilterMode === 'Today') {
          matchesDate = checkInStr === todayStr;
        } else if (dateFilterMode === 'ThreeDays') {
          const threeDaysLater = new Date(today);
          threeDaysLater.setDate(today.getDate() + 2); // Today + 2 more days

          const tYear = threeDaysLater.getFullYear();
          const tMonth = String(threeDaysLater.getMonth() + 1).padStart(2, '0');
          const tDay = String(threeDaysLater.getDate()).padStart(2, '0');
          const threeDaysLaterStr = `${tYear}-${tMonth}-${tDay}`;

          matchesDate = checkInStr >= todayStr && checkInStr <= threeDaysLaterStr;
        } else if (dateFilterMode === 'Custom') {
          matchesDate = checkInStr >= customDateRange.start && checkInStr <= customDateRange.end;
        }
      } else if (dateFilterMode !== 'All') {
        // If no checkIn date but filter is active, exclude it (except All)
        matchesDate = false;
      }

      if (!matchesDate) return false;

      if (filterStatus === 'Confirmed') return res.status === 'Confirmed' && !isNoShow;
      if (filterStatus === 'CheckedIn') return res.status === 'CheckedIn';
      if (filterStatus === 'CheckedOut') return res.status === 'CheckedOut';
      if (filterStatus === 'NoShow') return isNoShow;
      if (filterStatus === 'Cancelled') return res.status === 'Cancelled';
      return true; // All
    }).sort((a, b) => {
      // Sort by updatedAt (recently modified) or createdAt (newest)
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;

      if (dateA && dateB) {
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      if (dateA) return -1; // A has date, A comes first
      if (dateB) return 1;  // B has date, B comes first

      // Fallback to ID sorting
      return b.id.localeCompare(a.id);
    });
  }, [reservations, filterStatus, dateFilterMode, customDateRange]);

  const totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE);
  const displayedReservations = filteredReservations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, dateFilterMode, customDateRange]);

  const handleIdChange = (id: string) => {
    setFormData(prev => ({ ...prev, idNumber: id }));
    if (id.length >= 8) {
      const guest = guests.find(g => g.idNumber === id);
      if (guest) {
        setFormData(prev => ({ ...prev, guestName: guest.name, phone: guest.phone }));
        setIdLookupStatus('found');
      } else {
        setIdLookupStatus('none');
      }
    } else {
      setIdLookupStatus('idle');
    }
  };

  const handleRoomSelect = (roomId: string) => {
    const selectedRoom = rooms.find(r => r.id === roomId);
    if (selectedRoom) {
      setFormData(prev => ({
        ...prev,
        roomId: roomId,
        roomRent: selectedRoom.basePrice, // Default room rent
        totalPrice: selectedRoom.basePrice
      }));
      // Auto-add room rent item
      addRoomRentItem(selectedRoom.basePrice);
    } else {
      setFormData(prev => ({ ...prev, roomId: '', totalPrice: 0 }));
    }
  };

  // Auto-calculate Total Price based on Billable Items
  React.useEffect(() => {
    // Calculate total from local items
    const total = localBillableItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    if (total !== formData.totalPrice) {
      setFormData(prev => ({ ...prev, totalPrice: total }));
    }
  }, [localBillableItems]);

  // Handle Room Selection -> Auto-add Room Rent Item
  const addRoomRentItem = (price: number) => {
    setLocalBillableItems(prev => {
      // Remove existing Room Rent if exists? Or just append?
      // Let's assume clear and add.
      const others = prev.filter(i => i.description !== '房費 (Room Rate)');
      return [...others, {
        id: `temp-${Date.now()}`,
        reservationId: 'temp',
        description: '房費 (Room Rate)',
        amount: price,
        quantity: 1,
        paymentMethod: 'Room Charge',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.name
      }];
    });
  };

  // Fix: made handleSubmit async and added await for onComplexSave
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);
    setErrorMsg(null);

    // 錯誤阻斷機制：存檔前預檢
    if (!formData.guestName) { setIsSubmitting(false); return setErrorMsg('請輸入賓客姓名 (Guest Name Required)'); }
    if (!formData.buildingId) { setIsSubmitting(false); return setErrorMsg('請先選擇館別大樓 (Building Required)'); }
    if (!formData.roomId) { setIsSubmitting(false); return setErrorMsg('請選擇要分配的房號 (Room Required)'); }
    if (!formData.checkIn || !formData.checkOut) { setIsSubmitting(false); return setErrorMsg('請完整選擇日期區間 (Date Range Required)'); }
    if (new Date(formData.checkIn) >= new Date(formData.checkOut)) { setIsSubmitting(false); return setErrorMsg('退房日期必須晚於入住日期 (Check-out must be after Check-in)'); }

    const selectedRoom = rooms.find(r => r.id === formData.roomId);
    if (!selectedRoom) { setIsSubmitting(false); return setErrorMsg('找不到所選房間資料 (Room Not Found)'); }

    // 衝突檢測機制 (Conflict Detection)
    // 同一房間、同一入住日期，若已有 Confirmed 或 CheckedIn 的訂單，則禁止建立
    // 這樣可以防止：
    // 1. 重複預約 (Double Booking)
    // 2. 重複點擊儲存導致的重複資料 (Double Submission)
    const duplicateRes = reservations.find(r =>
      r.roomNumber === selectedRoom.number &&
      (r.checkIn.split(' ')[0] === formData.checkIn || r.checkIn.split('T')[0] === formData.checkIn) &&
      (r.status === 'Confirmed' || r.status === 'CheckedIn') &&
      r.id !== editingId // 排除自己 (若是編輯模式)
    );

    if (duplicateRes) {
      setIsSubmitting(false);
      alert(`⚠️ 無法建立訂單！\n\n房間 #${selectedRoom.number} 在 ${formData.checkIn} 已有有效訂單。\n狀態: ${duplicateRes.status}\n賓客: ${duplicateRes.guestName}\n\n請檢查日期或選擇其他房間。`);
      return;
    }

    const matchedGuest = guests.find(g => g.idNumber === formData.idNumber);

    // Combine date and time for full datetime
    const fullCheckIn = `${formData.checkIn} ${checkInTime}`;
    let finalCheckOutTime = checkOutTime;

    // Smart Fix: If same day stay and checkout time is before checkin (e.g. default 11:00 vs 18:00 checkin),
    // automatically extend checkout to 3 hours later (Rest assumption) or at least 1 hour later
    if (formData.checkIn === formData.checkOut && checkOutTime <= checkInTime) {
      const [h, m] = checkInTime.split(':').map(Number);
      const newH = (h + 3) % 24; // Default 3 hours for rest
      finalCheckOutTime = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const fullCheckOut = `${formData.checkOut} ${finalCheckOutTime}`;

    try {
      // Fix: await the async call to onComplexSave
      const success = await onComplexSave({
        reservation: {
          id: editingId || undefined,
          guestName: formData.guestName,
          phone: formData.phone,
          idNumber: formData.idNumber,
          checkIn: fullCheckIn,
          checkOut: fullCheckOut,
          roomNumber: selectedRoom.number,
          buildingId: formData.buildingId,
          roomType: selectedRoom.type,
          totalPrice: formData.totalPrice,
          paidAmount: formData.paidAmount,
          discount: formData.discount,
          source: formData.source || '櫃檯手動', // Restored: use form source or default
          // FIX: Preserve original status when updating; only default to 'Confirmed' for new reservations
          status: editingId && editingStatus ? editingStatus : 'Confirmed',
          note: formData.note,
          guestId: matchedGuest?.id || 'new',
          // Legacy Fields
          adults: formData.adults,
          children: formData.children,
          licensePlate: formData.licensePlate,
          companyName: formData.companyName,
          bookingAgent: formData.bookingAgent,
          // Latest Legacy Fields Mapped to 'note' or specific fields if DB supports
          // Combining extras into note or keeping them if DB schema allows.
          // For now, assuming we save them in the reservation object structure implicitly or explicit fields if added.
          // Since DB might not have columns, we add them to note or assume migration.
          // Let's assume user wants UI mostly, so we'll append to note for safety if columns invalid.
          // Actually, previous prompt added legacy columns. Let's assume we can pass them.
          roomRent: formData.roomRent,
          extraItems: formData.extraItems,
          addBed: formData.addBed,
          // Pet Fields
          petType: formData.petType,
          petCount: formData.petCount,
          petNote: formData.petNote
        },
        guestData: {
          name: formData.guestName,
          idNumber: formData.idNumber,
          phone: formData.phone
        },
        isNewGuest: !matchedGuest, // Fix: If no guest matched by ID, treat as new guest
        roomId: formData.roomId,
        isUpdate: !!editingId, // Pass update flag
        billableItems: localBillableItems // Pass the new dynamic items
      });

      if (success) {
        setIsFormOpen(false);
        setEditingId(null); // Reset edit state
        setEditingStatus(null); // Reset status state
        setFormData({
          idNumber: '', guestName: '', phone: '', checkIn: '', checkOut: '',
          buildingId: '', roomId: '', totalPrice: 0, note: '',
          adults: 1, children: 0, licensePlate: '', companyName: '', bookingAgent: '',
          roomRent: 0, extraItems: 0, addBed: 0, source: 'WalkIn',
          petType: 'None', petCount: 0, petNote: ''
        });
        setIdLookupStatus('idle');
      } else {
        setErrorMsg('儲存失敗！請檢查輸入資料或稍後再試 (Save Failed)');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('系統發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (res: Reservation) => {
    setEditingId(res.id);
    setEditingStatus(res.status); // Preserve original status

    // 多重查找策略：先用 buildingId + roomNumber，再用 roomNumber 單獨查找
    let room = rooms.find(r => r.number === res.roomNumber && r.buildingId === res.buildingId);

    // 如果找不到，嘗試只用房號查找（可能 buildingId 不一致）
    if (!room && res.roomNumber) {
      room = rooms.find(r => r.number === res.roomNumber && r.hotelId === res.hotelId);
    }

    // 如果還是找不到，試試全局查找
    if (!room && res.roomNumber) {
      room = rooms.find(r => r.number === res.roomNumber);
    }

    // 使用找到的房間的 buildingId，如果 reservation 的 buildingId 不存在
    const effectiveBuildingId = res.buildingId || room?.buildingId || '';

    // Extract date and time from datetime strings
    const extractDate = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      return dateStr.split(' ')[0].split('T')[0];
    };

    const extractTime = (dateStr: string | undefined, defaultTime: string) => {
      if (!dateStr) return defaultTime;
      const parts = dateStr.split(' ');
      if (parts.length > 1) {
        return parts[1].slice(0, 5); // Get HH:mm
      }
      return defaultTime;
    };

    // Set time state from existing reservation
    setCheckInTime(extractTime(res.checkIn, '15:00'));
    setCheckOutTime(extractTime(res.checkOut, '11:00'));

    setFormData({
      idNumber: res.idNumber || '',
      guestName: res.guestName,
      phone: res.phone,
      checkIn: extractDate(res.checkIn),
      checkOut: extractDate(res.checkOut),
      buildingId: effectiveBuildingId,
      roomId: room?.id || '',
      totalPrice: res.totalPrice || 0,
      paidAmount: res.paidAmount || 0,
      discount: res.discount || 0,
      note: res.note || '',
      adults: res.adults || 1,
      children: res.children || 0,
      licensePlate: res.licensePlate || '',
      companyName: res.companyName || '',
      bookingAgent: res.bookingAgent || '',
      roomRent: res.roomRent || 0,
      extraItems: res.extraItems || 0,
      addBed: res.addBed || 0,
      source: res.source || 'WalkIn',
      petType: res.petType || 'None',
      petCount: res.petCount || 0,
      petNote: res.petNote || ''
    });
    // Load billable items for this reservation
    const items = billableItems.filter(i => i.reservationId === res.id);
    if (items.length > 0) {
      setLocalBillableItems(items);
    } else {
      // Migration fallback: if no items, create from legacy fields
      const legacyItems: BillableItem[] = [];
      if (res.roomRent && res.roomRent > 0) {
        legacyItems.push({
          id: `legacy-rent-${Date.now()}`,
          reservationId: res.id,
          description: '房費 (Room Rate)',
          amount: res.roomRent,
          quantity: 1,
          createdAt: new Date().toISOString(),
          createdBy: 'System'
        });
      }
      if (res.addBed && res.addBed > 0) {
        legacyItems.push({
          id: `legacy-bed-${Date.now()}`,
          reservationId: res.id,
          description: '加床 (Add Bed)',
          amount: res.addBed,
          quantity: 1,
          createdAt: new Date().toISOString(),
          createdBy: 'System'
        });
      }
      if (res.extraItems && res.extraItems > 0) {
        legacyItems.push({
          id: `legacy-extra-${Date.now()}`,
          reservationId: res.id,
          description: '其他 (Extra)',
          amount: res.extraItems,
          quantity: 1,
          createdAt: new Date().toISOString(),
          createdBy: 'System'
        });
      }
      setLocalBillableItems(legacyItems);
    }
    setIsFormOpen(true);
    setIdLookupStatus('found'); // Assuming existing reservation implies known guest, or at least no need to create new.
  };

  // ... inside ReservationManagement component

  // Item Management Modal
  const ItemManagementModal = () => {
    // Use the parent's dynamic state
    const [newItem, setNewItem] = useState({ name: '', price: 0, category: 'Other', accounting_code: '' });

    const handleSaveItem = async () => {
      if (!newItem.name) return;
      const payload = {
        name: newItem.name,
        price: newItem.price,
        category: newItem.category,
        accounting_code: newItem.accounting_code,
        is_active: true
      };
      const { data, error } = await supabase.from('consumption_items').insert(payload).select().single();
      if (data) {
        // Update parent state directly
        setDynamicConsumptionItems(prev => [...prev, data]);
        setNewItem({ name: '', price: 0, category: 'Other', accounting_code: '' });
      }
    };

    const handleDelete = async (id: string) => {
      if (!window.confirm('確定要刪除此項目嗎？ (Delete Item?)')) return;
      await supabase.from('consumption_items').delete().eq('id', id);
      // Update parent state directly
      setDynamicConsumptionItems(prev => prev.filter(i => i.id !== id));
    };

    return (
      <Modal isOpen={itemMasterOpen} onClose={() => setItemMasterOpen(false)} title="費用項目維護 (Item Master)" className="w-[600px] h-[500px]" zIndex="z-[60]">
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-2 bg-slate-100 p-2 rounded-lg text-xs font-bold">
            <div className="col-span-2">項目名稱 (Item Name)</div>
            <div>價格 (Price)</div>
            <div>會計科目 (Code)</div>
            <div>操作 (Action)</div>
          </div>
          <div className="h-64 overflow-y-auto space-y-2">
            {dynamicConsumptionItems.map(item => (
              <div key={item.id || item.name} className="grid grid-cols-5 gap-2 items-center text-xs border-b border-slate-50 pb-1">
                <div className="col-span-2 font-bold">{item.name}</div>
                <div>${item.price}</div>
                <div className="text-slate-400">{item.accounting_code}</div>
                <button onClick={() => handleDelete(item.id)} className="text-rose-500 hover:text-rose-700 font-bold">刪除</button>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <div className="flex gap-2 items-end mb-1">
              <span className="text-[10px] text-slate-400 font-bold">新增標準項目 (Add Standard Item)</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <input placeholder="名稱 (Name)" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="col-span-2 border p-1 rounded text-xs" />
              <input type="number" placeholder="價格 (Price)" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseInt(e.target.value) || 0 })} className="border p-1 rounded text-xs" />
              <input placeholder="科目代碼 (Code)" value={newItem.accounting_code} onChange={e => setNewItem({ ...newItem, accounting_code: e.target.value })} className="border p-1 rounded text-xs" />
              <button onClick={handleSaveItem} className="bg-blue-600 text-white rounded px-2 text-xs font-bold shadow-sm active:scale-95">新增</button>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      {/* Render Item Modal */}
      {itemMasterOpen && <ItemManagementModal />}

      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">全通路訂單管理</h2>
          <p className="text-sm text-slate-500 mt-1">管理所有預約與住房訂單</p>
        </div>
        <button onClick={() => {
          setIsFormOpen(true); setEditingId(null); setFormData({
            idNumber: '', guestName: '', phone: '', checkIn: '', checkOut: '',
            buildingId: '', roomId: '', totalPrice: 0, note: '',
            adults: 1, children: 0, licensePlate: '', companyName: '', bookingAgent: '', paidAmount: 0, discount: 0,
            roomRent: 0, extraItems: 0, addBed: 0, source: 'WalkIn',
            petType: 'None', petCount: 0, petNote: ''
          });
        }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95">建立新預約 (New Booking)</button>
      </header>

      {/* Check-in Date Filter Toolbar */}
      <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl overflow-x-auto">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">入住日期篩選 (Check-in Date)</span>
        <button
          onClick={() => setDateFilterMode('All')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${dateFilterMode === 'All' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          全部 (All)
        </button>
        <button
          onClick={() => setDateFilterMode('Today')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${dateFilterMode === 'Today' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          今日 (Today)
        </button>
        <button
          onClick={() => setDateFilterMode('ThreeDays')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${dateFilterMode === 'ThreeDays' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          3日內 (3 Days)
        </button>
        <button
          onClick={() => setDateFilterMode('Custom')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${dateFilterMode === 'Custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          自訂 (Custom)
        </button>

        {dateFilterMode === 'Custom' && (
          <div className="flex items-center gap-2 pl-4 border-l border-slate-200 animate-fadeIn">
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* 統計卡片 */}
      {(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = {
          confirmed: reservations.filter(r => {
            const checkInDate = r.checkIn ? new Date(r.checkIn.split(' ')[0]) : null;
            return r.status === 'Confirmed' && (!checkInDate || checkInDate >= today);
          }).length,
          checkedIn: reservations.filter(r => r.status === 'CheckedIn').length,
          checkedOut: reservations.filter(r => r.status === 'CheckedOut').length,
          noShow: reservations.filter(r => {
            const checkInDate = r.checkIn ? new Date(r.checkIn.split(' ')[0]) : null;
            return r.status === 'Confirmed' && checkInDate && checkInDate < today;
          }).length,
          cancelled: reservations.filter(r => r.status === 'Cancelled').length,
          all: reservations.length
        };

        const tabs: { key: typeof filterStatus; label: string; count: number; color: string; bgColor: string; icon: string }[] = [
          { key: 'Confirmed', label: '預約單', count: stats.confirmed, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', icon: '📅' },
          { key: 'CheckedIn', label: '已入住', count: stats.checkedIn, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', icon: '🏨' },
          { key: 'CheckedOut', label: '已退房', count: stats.checkedOut, color: 'text-slate-600', bgColor: 'bg-slate-100 border-slate-200', icon: '🚪' },
          { key: 'NoShow', label: '未入住', count: stats.noShow, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', icon: '⚠️' },
          { key: 'Cancelled', label: '已取消', count: stats.cancelled, color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-200', icon: '❌' },
          { key: 'All', label: '全部', count: stats.all, color: 'text-slate-600', bgColor: 'bg-slate-100 border-slate-200', icon: '📋' }
        ];

        return (
          <div className="grid grid-cols-6 gap-4">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left ${filterStatus === tab.key
                  ? `${tab.bgColor} ring-2 ring-offset-2 ring-blue-400 shadow-lg scale-[1.02]`
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{tab.icon}</span>
                  <span className={`text-3xl font-black ${filterStatus === tab.key ? tab.color : 'text-slate-700'}`}>
                    {tab.count}
                  </span>
                </div>
                <div className={`text-sm font-bold ${filterStatus === tab.key ? tab.color : 'text-slate-500'}`}>
                  {tab.label}
                </div>
              </button>
            ))}
          </div>
        );
      })()}

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="px-6 py-5">訂單編號 / 賓客 (ID / Guest)</th>
              <th className="px-6 py-5">房號 / 房型 (Room)</th>
              <th className="px-6 py-5">住房期間 (Dates)</th>
              <th className="px-6 py-5">待付餘額 (Balance)</th>
              <th className="px-6 py-5">狀態 (Status)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-bold">
            {displayedReservations.map(res => {
              const balance = (res.totalPrice || 0) - (res.paidAmount || 0) - (res.discount || 0);
              return (
                <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-[10px] text-blue-600 font-mono mb-1">{res.id}</div>
                    <div>{res.guestName}</div>
                  </td>
                  <td className="px-6 py-4">#{res.roomNumber} <span className="text-[10px] bg-slate-100 px-1 rounded">{res.roomType}</span></td>
                  <td className="px-6 py-4 text-xs text-slate-500">{res.checkIn} → {res.checkOut}</td>
                  <td className={`px-6 py-4 font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>${balance.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {(() => {
                      // 計算是否為 No Show
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const checkInDate = res.checkIn ? new Date(res.checkIn.split(' ')[0]) : null;
                      const isNoShow = res.status === 'Confirmed' && checkInDate && checkInDate < today;

                      let statusClass = 'bg-blue-50 text-blue-600';
                      let statusLabel = res.status;

                      if (isNoShow) {
                        statusClass = 'bg-amber-50 text-amber-600';
                        statusLabel = '未入住';
                      } else if (res.status === 'CheckedIn') {
                        statusClass = 'bg-emerald-50 text-emerald-600';
                        statusLabel = '已入住';
                      } else if (res.status === 'CheckedOut') {
                        statusClass = 'bg-slate-100 text-slate-600';
                        statusLabel = '已退房';
                      } else if (res.status === 'Confirmed') {
                        statusClass = 'bg-blue-50 text-blue-600';
                        statusLabel = '已確認';
                      } else if (res.status === 'Cancelled') {
                        statusClass = 'bg-rose-50 text-rose-600';
                        statusLabel = '已取消';
                      }

                      return (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${statusClass}`}>
                          {statusLabel}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 space-x-2 text-right">
                    <button onClick={() => handleEdit(res)} className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors">
                      編輯 (Edit)
                    </button>
                    {res.status !== 'Cancelled' && res.status !== 'CheckedOut' && (
                      <button
                        type="button"
                        onClick={() => onCancel(res.id)}
                        className="p-1.5 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        title="取消訂單 (Cancel)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayedReservations.length === 0 && <div className="p-20 text-center text-slate-400 italic font-bold">目前無任何預約紀錄 (No Reservations Found)</div>}
        <div className="p-4">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? `編輯訂單 #${editingId}` : "建立新住房預約 (Atomic Booking)"}
        className="w-[640px] h-[480px] max-w-full"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-black border border-rose-100 animate-pulse">⚠️ 錯誤：{errorMsg}</div>}

          {/* Tab Navigation */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-4">
            <button type="button" onClick={() => setFormTab('Guest')} className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${formTab === 'Guest' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>1. 住房資訊 (Guest & Stay)</button>
            <button type="button" onClick={() => setFormTab('Billing')} className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${formTab === 'Billing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>2. 帳務與備註 (Billing)</button>
          </div>

          <div className={formTab === 'Guest' ? 'block' : 'hidden'}>
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 mb-3">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">1. 賓客身份檢索 (Smart CRM)</label>
              <div className="flex items-center gap-2">
                <input required value={formData.idNumber} onChange={e => handleIdChange(e.target.value)} className="flex-1 border-none bg-transparent p-0 text-lg font-black focus:ring-0 placeholder:text-slate-300" placeholder="輸入證件號碼檢索..." />
                <div className="text-[10px] font-bold">
                  {idLookupStatus === 'found' && <span className="text-emerald-500">✨ 舊客回流</span>}
                  {idLookupStatus === 'none' && <span className="text-blue-400">📝 新客註冊</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-3">
              <input required placeholder="姓名" value={formData.guestName} onChange={e => setFormData({ ...formData, guestName: e.target.value })} className="col-span-1 w-full border border-slate-200 p-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
              <input required placeholder="電話" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="col-span-1 w-full border border-slate-200 p-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
              <input placeholder="公司名稱" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="col-span-1 w-full border border-slate-200 p-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
              <input placeholder="車牌號碼" value={formData.licensePlate} onChange={e => setFormData({ ...formData, licensePlate: e.target.value })} className="col-span-1 w-full border border-slate-200 p-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 mb-3">
              <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest">2. 住房與房間分配</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Check-in Date & Time */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 px-1">入住日期 (Check-in)</label>
                  <div className="flex gap-2">
                    <input type="date" required value={formData.checkIn} onChange={e => setFormData({ ...formData, checkIn: e.target.value, roomId: '' })} className="flex-1 border border-slate-200 p-3 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500" />
                    <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} className="w-28 bg-blue-50 border border-blue-200 p-3 rounded-xl text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                {/* Check-out Date & Time */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 px-1">退房日期 (Check-out)</label>
                  <div className="flex gap-2">
                    <input type="date" required value={formData.checkOut} onChange={e => setFormData({ ...formData, checkOut: e.target.value, roomId: '' })} className="flex-1 border border-slate-200 p-3 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500" />
                    <input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} className="w-28 bg-amber-50 border border-amber-200 p-3 rounded-xl text-sm font-bold text-amber-700 focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
              </div>


              {/* Quick Duration Buttons */}
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => {
                  const baseDate = formData.checkIn || new Date().toISOString().split('T')[0];
                  const inDate = new Date(`${baseDate}T${checkInTime}`);
                  const outDate = new Date(inDate.getTime() + 2 * 60 * 60 * 1000);
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  setFormData(prev => ({ ...prev, checkOut: `${outDate.getFullYear()}-${pad(outDate.getMonth() + 1)}-${pad(outDate.getDate())}` }));
                  setCheckOutTime(`${pad(outDate.getHours())}:${pad(outDate.getMinutes())}`);
                }} className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-100 text-slate-600">
                  ⚡ 2H 休息
                </button>
                <button type="button" onClick={() => {
                  const baseDate = formData.checkIn || new Date().toISOString().split('T')[0];
                  const inDate = new Date(`${baseDate}T${checkInTime}`);
                  const outDate = new Date(inDate.getTime() + 3 * 60 * 60 * 1000);
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  setFormData(prev => ({ ...prev, checkOut: `${outDate.getFullYear()}-${pad(outDate.getMonth() + 1)}-${pad(outDate.getDate())}` }));
                  setCheckOutTime(`${pad(outDate.getHours())}:${pad(outDate.getMinutes())}`);
                }} className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-100 text-slate-600">
                  ⚡ 3H 休息
                </button>
                <button type="button" onClick={() => {
                  const baseDate = formData.checkIn || new Date().toISOString().split('T')[0];
                  const inDate = new Date(`${baseDate}T${checkInTime}`);
                  const outDate = new Date(inDate);
                  outDate.setDate(outDate.getDate() + 1); // Next day
                  // Set to standard checkout time 11:00
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  setFormData(prev => ({ ...prev, checkOut: `${outDate.getFullYear()}-${pad(outDate.getMonth() + 1)}-${pad(outDate.getDate())}` }));
                  setCheckOutTime('11:00');
                }} className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-100 text-slate-600">
                  🌙 住宿 (Overnight)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 px-1">選擇館別 (Building)</label>
                  <select required value={formData.buildingId} onChange={e => setFormData({ ...formData, buildingId: e.target.value, roomId: '' })} className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="">選館別...</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 px-1">選擇房號 (Room)</label>
                  <select required value={formData.roomId} onChange={e => handleRoomSelect(e.target.value)} className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="">選房號...</option>
                    {availableRooms.map(r => (
                      <option key={r.id} value={r.id} disabled={!r.isSelectable}>{`#${r.number}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200">
              <div className="grid grid-cols-4 gap-3 items-center">
                <label className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">3. 入住人數</label>
                <div className="relative col-span-1">
                  <label className="absolute -top-2 left-3 bg-slate-50 px-1 text-[10px] font-black text-slate-400">大人</label>
                  <input type="number" min="1" value={formData.adults} onChange={e => setFormData({ ...formData, adults: parseInt(e.target.value) || 1 })} className="w-full border border-slate-200 p-3 rounded-xl text-lg font-black text-center focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="relative col-span-1">
                  <label className="absolute -top-2 left-3 bg-slate-50 px-1 text-[10px] font-black text-slate-400">小孩</label>
                  <input type="number" min="0" value={formData.children} onChange={e => setFormData({ ...formData, children: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 p-3 rounded-xl text-lg font-black text-center focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-3xl border border-orange-200 mt-3">
              <label className="text-[10px] font-black text-orange-600 uppercase mb-2 block tracking-widest">4. 寵物資訊 (Pets)</label>
              <div className="grid grid-cols-4 gap-3">
                <select value={formData.petType} onChange={e => setFormData({ ...formData, petType: e.target.value })} className="col-span-1 border border-orange-200 bg-white p-2 rounded-xl text-sm font-bold text-orange-800">
                  <option value="None">無攜帶寵物</option>
                  <option value="Dog">狗 (Dog)</option>
                  <option value="Cat">貓 (Cat)</option>
                  <option value="Other">其他 (Other)</option>
                </select>
                {formData.petType && formData.petType !== 'None' && (
                  <>
                    <input type="number" min="1" placeholder="數量" value={formData.petCount} onChange={e => setFormData({ ...formData, petCount: parseInt(e.target.value) || 1 })} className="col-span-1 border border-orange-200 p-2 rounded-xl text-sm font-bold" />
                    <input placeholder="寵物備註 (品種/大小)" value={formData.petNote} onChange={e => setFormData({ ...formData, petNote: e.target.value })} className="col-span-2 border border-orange-200 p-2 rounded-xl text-sm font-bold" />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={formTab === 'Billing' ? 'block space-y-5' : 'hidden'}>
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <div className="mb-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">消費明細 (Folio)</label>

                {/* List Header */}
                <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 bg-slate-100 p-2 rounded-t-xl">
                  <div className="col-span-4">項目說明</div>
                  <div className="col-span-2">付款方式</div>
                  <div className="col-span-1 text-right">單價</div>
                  <div className="col-span-1 text-center">數量</div>
                  <div className="col-span-2 text-right">小計</div>
                  <div className="col-span-2">備註</div>
                </div>

                {/* Items List */}
                <div className="border border-slate-200 border-t-0 rounded-b-xl overflow-hidden mb-3">
                  {localBillableItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">尚未新增任何消費項目</div>
                  ) : (
                    localBillableItems.map((item, idx) => (
                      <div key={item.id || idx} className="grid grid-cols-12 gap-2 p-2 border-b border-slate-50 items-center hover:bg-slate-50 group">
                        <div className="col-span-4 text-xs font-bold text-slate-700 flex items-center gap-2">
                          <button type="button" onClick={() => {
                            setLocalBillableItems(prev => prev.filter((_, i) => i !== idx));
                          }} className="text-rose-400 hover:text-rose-600 transition-colors mr-2">
                            ✕
                          </button>
                          {item.description}
                        </div>
                        <div className="col-span-2 text-[10px] text-slate-500">{item.paymentMethod || 'Room Charge'}</div>
                        <div className="col-span-1 text-right text-xs text-slate-600">${item.amount.toLocaleString()}</div>
                        <div className="col-span-1 text-center text-xs text-slate-600">x{item.quantity}</div>
                        <div className="col-span-2 text-right text-xs font-black text-slate-800">${(item.amount * item.quantity).toLocaleString()}</div>
                        <div className="col-span-2 text-[10px] text-slate-400 font-normal truncate" title={item.note}>{item.note}</div>
                      </div>
                    ))
                  )}
                  {/* Total Footer */}
                  <div className="bg-slate-50 p-2 border-t border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">總金額 (Total)</span>
                      <span className="text-xs font-black text-slate-600">${formData.totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">已付 (Paid)</span>
                      <span className="text-xs font-black text-emerald-600">-${(formData.paidAmount || 0).toLocaleString()}</span>
                    </div>
                    {formData.discount > 0 && (
                      <div className="flex justify-between items-center mb-1 text-[10px] font-black text-slate-400">
                        <span>折扣 (Discount)</span>
                        <span>-${formData.discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-black text-slate-800 uppercase">應付餘額 (Balance)</span>
                      <span className="text-lg font-black text-blue-600">
                        ${((formData.totalPrice || 0) - (formData.discount || 0) - (formData.paidAmount || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Add New Item Improved */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">新增消費項目 (Add Item)</label>
                  <div className="grid grid-cols-12 gap-3 items-end">

                    {/* Item Selection - Row 1 */}
                    <div className="col-span-12">
                      <label className="text-[9px] font-bold text-slate-500 mb-1 block">項目名稱 (Item)</label>
                      <div className="flex gap-1">
                        {!isCustomItem ? (
                          <select
                            className="w-full border border-slate-200 p-3 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newItem.description}
                            onChange={(e) => {
                              if (e.target.value === 'custom') {
                                setIsCustomItem(true);
                                setNewItem({ ...newItem, description: '', amount: 0 });
                              } else {
                                const selected = dynamicConsumptionItems.find(i => i.name === e.target.value);
                                if (selected) {
                                  setNewItem({ ...newItem, description: selected.name, amount: selected.price });
                                } else {
                                  setNewItem({ ...newItem, description: e.target.value });
                                }
                              }
                            }}
                          >
                            <option value="">選擇項目...</option>
                            {dynamicConsumptionItems.map(i => (
                              <option key={i.id || i.name} value={i.name}>{i.name} (${i.price})</option>
                            ))}
                            <option value="custom" className="text-blue-600 font-black">＋ 自訂輸入 (Custom)</option>
                          </select>
                        ) : (
                          <div className="flex gap-1 w-full">
                            <input
                              autoFocus
                              placeholder="輸入項目名稱"
                              className="w-full border border-blue-500 ring-1 ring-blue-500 p-3 rounded-xl text-xs font-bold bg-white"
                              value={newItem.description}
                              onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                            />
                            <button
                              onClick={() => { setIsCustomItem(false); setNewItem({ ...newItem, description: '' }); }}
                              className="px-2 text-slate-400 hover:text-slate-600"
                              title="取消自訂"
                            >✕</button>
                          </div>
                        )}
                        <button type="button" onClick={() => setItemMasterOpen(true)} className="bg-slate-100 text-slate-500 px-3 rounded-xl text-xs hover:bg-slate-200" title="管理項目主檔">
                          ⚙️
                        </button>
                      </div>
                    </div>

                    {/* Row 2 Inputs */}
                    {/* Amount */}
                    <div className="col-span-3">
                      <label className="text-[9px] font-bold text-slate-500 mb-1 block">單價 (Price)</label>
                      <input
                        type="number"
                        placeholder="$"
                        value={newItem.amount}
                        onChange={e => setNewItem({ ...newItem, amount: parseInt(e.target.value) || 0 })}
                        className="w-full border border-slate-200 p-3 rounded-xl text-sm font-black text-right focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-3">
                      <label className="text-[9px] font-bold text-slate-500 mb-1 block">數量 (Qty)</label>
                      <input
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full border border-slate-200 p-3 rounded-xl text-sm font-black text-center focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Payment Method */}
                    <div className="col-span-4">
                      <label className="text-[9px] font-bold text-slate-500 mb-1 block">支付 (Method)</label>
                      <select
                        className="w-full border border-slate-200 p-3 rounded-xl text-[10px] font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newItem.paymentMethod}
                        onChange={e => setNewItem({ ...newItem, paymentMethod: e.target.value })}
                      >
                        <option value="Room Charge">房帳 (Room Hash)</option>
                        <option value="Cash">現金 (Cash)</option>
                        <option value="CreditCard">信用卡 (Card)</option>
                        <option value="E-Payment">電子支付 (E-Pay)</option>
                        <option value="Transfer">轉帳 (Transfer)</option>
                      </select>
                    </div>

                    {/* Add Button */}
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-transparent mb-1 block">.</label>
                      <button type="button" onClick={() => {
                        if (!newItem.description) {
                          alert('請輸入項目名稱');
                          return;
                        }
                        setLocalBillableItems(prev => [...prev, {
                          id: `new-${Date.now()}`,
                          reservationId: editingId || 'temp',
                          description: newItem.description,
                          amount: newItem.amount,
                          quantity: newItem.quantity,
                          paymentMethod: newItem.paymentMethod,
                          note: newItem.note,
                          createdAt: new Date().toISOString(),
                          createdBy: currentUser?.name || 'System'
                        }]);
                        setNewItem({ description: '', amount: 0, quantity: 1, paymentMethod: 'Room Charge', note: '' });
                        setIsCustomItem(false);
                      }} className="w-full bg-slate-800 text-white py-3 rounded-xl text-lg font-black shadow-lg hover:bg-black transition-all active:scale-95 flex items-center justify-center">
                        ＋
                      </button>
                    </div>
                    {/* Note row for clarity */}
                    <div className="col-span-12 mt-1">
                      <input
                        placeholder="備註說明 (Optional Note)"
                        value={newItem.note}
                        onChange={e => setNewItem({ ...newItem, note: e.target.value })}
                        className="w-full border border-slate-200 p-2 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>


                {/* Removed separate Deposit field as requested - handle as line item */}
              </div>

              {/* Payment History Log */}
              {editingId && (
                <div className="bg-slate-100 p-4 rounded-2xl mb-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">繳款歷程 (Payments)</label>
                  <div className="space-y-2">
                    {transactions.filter(t => t.reservationId === editingId).length === 0 ? (
                      <div className="text-xs text-slate-400 italic">無繳款紀錄</div>
                    ) : (
                      transactions.filter(t => t.reservationId === editingId).map(t => (
                        <div key={t.id} className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm">
                          <span className="text-xs font-bold text-slate-600">{new Date(t.createdAt).toLocaleDateString()}</span>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{t.method}</span>
                          <span className={`text-xs font-black ${t.type === 'Refund' ? 'text-rose-500' : 'text-emerald-600'}`}>
                            {t.type === 'Refund' ? '-' : '+'}${t.amount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400">業務來源 (Source)</label>
                  <select value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} className="w-full border border-slate-200 p-2 rounded-xl text-xs font-bold">
                    <option value="WalkIn">Walk-In</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="Agoda">Agoda</option>
                    <option value="Expedia">Expedia</option>
                    <option value="Phone">Telephone</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <textarea placeholder="訂單特殊備註..." value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold h-20 resize-none" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white font-black py-4 rounded-2xl shadow-xl mt-4 active:scale-95 transition-all ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-black'}`}
          >
            {isSubmitting ? '處理中...' : (editingId ? '確認更新訂單內容' : '執行原子化存檔並同步房態')}
          </button>
        </form>
      </Modal>
    </div >
  );
};

export default ReservationManagement;
