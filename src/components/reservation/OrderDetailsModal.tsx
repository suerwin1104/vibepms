
import React, { useState } from 'react';
import { Room, Reservation, RoomStatus, Staff, Transaction, PaymentMethod, Invoice, BillableItem, ConsumptionItem, Hotel } from '../../types';

interface Props {
  room: Room;
  hotel?: Hotel;  // 新增：飯店參數用於計算延滯費
  reservation?: Reservation;
  onUpdateStatus: (st: RoomStatus) => void;
  onIssueInvoice: (amount: number, reservationId?: string, buyerId?: string) => Promise<string | undefined>;
  onVoidInvoice?: (invoiceId: string, reason: string) => Promise<void>;
  onPrint: (inv: Invoice, layout: 'A4' | 'POS') => void;
  onCollectPayment: (resId: string, amount: number, method: PaymentMethod) => void;
  transactions: Transaction[];
  billableItems: BillableItem[];
  consumptionItems: ConsumptionItem[];
  invoices: Invoice[];
  currentUser: Staff;
  onCancelCheckout?: (resId: string) => void;
  onAddBillableItem: (item: Partial<BillableItem>) => void;
  onDeleteBillableItem: (id: string) => void;
  onCheckout?: (resId: string) => void;
  initialCheckingOut?: boolean;
  onRefund?: (resId: string, amount: number, method: PaymentMethod, note?: string) => Promise<void>;
  onTransferOverpayment?: (resId: string, amount: number, note?: string) => Promise<void>;
  onCancelTransaction?: (txId: string) => Promise<void>;
}

const OrderDetailsModal: React.FC<Props> = ({ room, hotel, reservation, onUpdateStatus, onIssueInvoice, onVoidInvoice, onPrint, onCollectPayment, onRefund, onTransferOverpayment, onCancelTransaction, transactions, billableItems, consumptionItems, invoices, currentUser, onCancelCheckout, onAddBillableItem, onDeleteBillableItem, onCheckout, initialCheckingOut }) => {
  const [activeTab, setActiveTab] = useState<'Control' | 'Accounting' | 'Transactions'>('Control');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isPrinting, setIsPrinting] = useState<'A4' | 'POS' | null>(null);
  const [paymentData, setPaymentData] = useState<{ amount: number; method: PaymentMethod }>({
    amount: 0,
    method: 'Cash'
  });
  // New state for refund
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('Cash');
  const [refundNote, setRefundNote] = useState('');

  const [newItem, setNewItem] = useState({ description: '', amount: 0, quantity: 1, paymentMethod: 'Room Charge', note: '' });
  const [isCheckingOut, setIsCheckingOut] = useState(initialCheckingOut || false);

  React.useEffect(() => {
    if (initialCheckingOut !== undefined) {
      setIsCheckingOut(initialCheckingOut);
    }
  }, [initialCheckingOut]);

  // 計算延滯費用 - 超時1-5小時按小時收費，超過6小時算一天房租
  const calculateLateFee = () => {
    if (!reservation || reservation.status !== 'CheckedIn') return { overdueHours: 0, overdueDays: 0, billableHours: 0, lateFee: 0 };

    const thresholdHours = hotel?.lateFeeThresholdHours || 6;

    // 直接使用訂單的退房時間 (支援休息訂單的動態退房時間)
    const checkOutStr = reservation.checkOut?.replace(' ', 'T');
    const checkOutDateTime = new Date(checkOutStr);

    const now = new Date();
    const diffMs = now.getTime() - checkOutDateTime.getTime();
    const overdueHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (overdueHours <= 0) return { overdueHours: 0, overdueDays: 0, billableHours: 0, lateFee: 0 };

    // 延滯費率計算 - 優先使用設定的每小時費率
    const hourlyRate = room.lateFeePerHour || Math.ceil((room.lateFeePerDay || room.basePrice || 0) / thresholdHours);
    const dailyRate = room.lateFeePerDay || room.basePrice || 0;

    // 新邏輯：超時1-5小時按小時收費累積，滿6小時改算一天房租
    let lateFee = 0;
    let overdueDays = 0;
    let billableHours = 0;

    if (overdueHours >= thresholdHours) {
      // 超過門檻，算一天房租
      overdueDays = 1;
      // 超過門檻後，每額外達到門檻小時數或滿24小時再加一天
      const hoursAfterFirstDay = overdueHours - thresholdHours;
      // 額外天數：每 24 小時加 1 天
      overdueDays += Math.floor(hoursAfterFirstDay / 24);
      // 剩餘不足 24 小時的部分
      const remainingHours = hoursAfterFirstDay % 24;
      if (remainingHours > 0) {
        if (remainingHours >= thresholdHours) {
          // 剩餘小時數也達門檻，再算一天
          overdueDays += 1;
        } else {
          // 剩餘不足門檻，按小時計費
          billableHours = remainingHours;
        }
      }
      lateFee = (overdueDays * dailyRate) + (billableHours * hourlyRate);
    } else {
      // 未超過門檻，按小時累積計費
      billableHours = overdueHours;
      lateFee = billableHours * hourlyRate;
    }

    return { overdueHours, overdueDays, billableHours, lateFee };
  };

  const { overdueHours, overdueDays, billableHours, lateFee } = calculateLateFee();
  const activeInvoice = invoices.find(i => i.reservationId === reservation?.id && i.status === 'Active');

  // NOTE: billableItems are ALREADY included in reservation.totalPrice (updated by handleAddBillableItem)
  // Therefore, we should NOT add them again here. Keep billableItemsTotal for display purposes only.
  const billableItemsTotal = billableItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0);

  // 應收總額 = 房費(已含加購項目) + 延滯費
  // DO NOT add billableItemsTotal again - it's already in totalPrice
  const totalAmountDue = (reservation?.totalPrice || 0) + lateFee;
  const balanceDue = reservation ? (totalAmountDue - (reservation.paidAmount || 0) - (reservation.discount || 0)) : 0;
  const isPaid = reservation && (reservation.paidAmount > 0);
  // Allow issuing invoice if checking out, checked out, OR fully paid (balance <= 0)
  const canIssueInvoice = !!reservation && (isCheckingOut || reservation.status === 'CheckedOut' || balanceDue <= 0) && !isIssuing && !activeInvoice;

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation) return;
    onCollectPayment(reservation.id, paymentData.amount, paymentData.method);
    setShowPaymentForm(false);
    setPaymentData({ ...paymentData, amount: 0 });
  };

  const [buyerId, setBuyerId] = useState(''); // State for Business Tax ID

  const handleIssueInvoiceInternal = async () => {
    if (!reservation || isIssuing) return;
    setIsIssuing(true);
    try {
      // 發票金額使用實際已收款總額，確保與傳票金額一致
      const invoiceAmount = reservation.paidAmount || 0;
      await onIssueInvoice(invoiceAmount, reservation.id, buyerId);
    } finally {
      setIsIssuing(false);
    }
  };

  const handlePrint = (type: 'A4' | 'POS') => {
    if (!activeInvoice) return;

    // 檢查目前餘額是否結清
    if (Math.round(balanceDue) > 0) {
      alert(`目前帳務尚有餘額 $${Math.round(balanceDue).toLocaleString()} 未結清，請完成收款程序後再開發票。`);
      return;
    }

    setIsPrinting(type);
    onPrint(activeInvoice, type);

    // 短暫顯示載入後恢復，實列印由 App.tsx 的副作用控制
    setTimeout(() => setIsPrinting(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-5xl font-black tracking-tighter">#{room.number}</h3>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">{room.type} • {room.floor}F</p>
        </div>
        <div className="flex gap-2 relative z-10">
          <button onClick={() => setActiveTab('Control')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'Control' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>房務管控</button>
          <button onClick={() => setActiveTab('Accounting')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'Accounting' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>帳務結算</button>
          <button onClick={() => setActiveTab('Transactions')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'Transactions' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>交易歷程</button>
        </div>
      </div>

      {activeTab === 'Control' && !isCheckingOut && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">房態手動覆核 (Housekeeping Override)</label>
            <div className="grid grid-cols-5 gap-3 bg-white p-3 rounded-2xl border border-slate-200">
              {[RoomStatus.VC, RoomStatus.VD, RoomStatus.OC, RoomStatus.OOO, RoomStatus.SO].map(s => (
                <button key={s} onClick={() => onUpdateStatus(s)} className={`py-3 rounded-xl text-[10px] font-black transition-all border-2 ${room.status === s ? 'bg-slate-900 text-white border-transparent shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>{s}</button>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${reservation ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>{reservation ? '👤' : '🛏️'}</div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  {reservation?.status === 'CheckedOut' ? '前一房客 (已退房)' : '當前佔用者'}
                </p>
                <p className="text-lg font-black text-slate-800">{reservation ? reservation.guestName : '空房中'}</p>
              </div>
              {reservation?.status === 'CheckedOut' && onCancelCheckout && (
                <button
                  onClick={() => onCancelCheckout(reservation.id)}
                  className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg hover:bg-rose-700 transition-all active:scale-95 flex items-center gap-2"
                >
                  🔄 取消遷出 (取消退房)
                </button>
              )}
              {reservation && (reservation.status === 'CheckedIn' || reservation.status === 'Confirmed') && onCheckout && (
                <button
                  onClick={() => setIsCheckingOut(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
                >
                  🔑 辦理退房 (Check-out)
                </button>
              )}
            </div>

            {/* 完整訂單資訊區塊 (Full Order Details) */}
            {reservation && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 mt-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📋 訂單詳情 (Order Details)</span>
                  <span className="text-[10px] font-mono text-blue-600 font-bold">{reservation.id}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  {/* 賓客資訊 */}
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">姓名:</span>
                    <span className="text-slate-800 font-black">{reservation.guestName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">電話:</span>
                    <span className="text-slate-800 font-bold">{reservation.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">證件:</span>
                    <span className="text-slate-800 font-bold">{reservation.idNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">來源:</span>
                    <span className="text-slate-800 font-bold">{reservation.source || '櫃檯直接'}</span>
                  </div>

                  {/* 時間資訊 */}
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">入住:</span>
                    <span className="text-blue-700 font-black">{reservation.checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">退房:</span>
                    <span className="text-amber-700 font-black">{reservation.checkOut}</span>
                  </div>

                  {/* 金額資訊 */}
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">房價:</span>
                    <span className="text-slate-800 font-black">${(reservation.totalPrice || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">已付:</span>
                    <span className="text-emerald-600 font-black">${(reservation.paidAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">折扣:</span>
                    <span className="text-blue-500 font-bold">${(reservation.discount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">待付:</span>
                    <span className={`font-black ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ${balanceDue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 備註 */}
                {reservation.note && (
                  <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 mt-2">
                    <span className="text-[9px] font-black text-yellow-700 uppercase">📝 備註:</span>
                    <p className="text-xs text-slate-700 mt-1">{reservation.note}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isCheckingOut && reservation && (
        <div className="space-y-6 animate-in zoom-in-95 duration-300">
          <div className="bg-white border-2 border-emerald-500 rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">退房核對中 (Verifying)</span>
            </div>

            <h4 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-3xl">🏁</span> 結算退房核對
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Folio Summary */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">帳務結算摘要 (Settlement Summary)</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-500">原房租金額:</span>
                      <span className="text-slate-800">${(reservation.totalPrice || 0).toLocaleString()}</span>
                    </div>
                    {lateFee > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                        <span className="text-rose-600">⚠️ 延滯費 ({overdueHours}hr{overdueDays > 0 ? ` = ${overdueDays}天` : ''}{billableHours > 0 ? ` + ${billableHours}hr` : ''}):</span>
                        <span className="text-rose-700 font-black">${lateFee.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 pt-2">
                      <span className="text-slate-700 font-black">總計應收:</span>
                      <span className="text-slate-900 font-black text-lg">${totalAmountDue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-500">已收總計:</span>
                      <span className="text-emerald-600">${(reservation.paidAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-500">折扣折讓:</span>
                      <span className="text-blue-500">-${(reservation.discount || 0).toLocaleString()}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-sm font-black text-slate-800">未結餘額 (Owed):</span>
                      <span className={`text-2xl font-black ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ${balanceDue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Consumption List in Checkout View */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden mb-2">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">消費明細核對 (Folio Check)</p>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto p-2">
                    <table className="w-full text-[11px]">
                      <tbody className="divide-y divide-slate-200">
                        {billableItems.map(item => (
                          <tr key={item.id}>
                            <td className="py-2 text-slate-600">{item.description}</td>
                            <td className="py-2 text-right font-bold text-slate-800">-${(item.amount * item.quantity).toLocaleString()}</td>
                          </tr>
                        ))}
                        {transactions.map(tx => (
                          <tr key={tx.id} className="text-emerald-600">
                            <td className="py-2 font-bold">{tx.method} 支付</td>
                            <td className="py-2 text-right font-black">+${tx.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {balanceDue > 0 && (
                  <div className="bg-rose-50 border-2 border-rose-200 p-5 rounded-3xl space-y-4 animate-in shake duration-500">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💵</span>
                      <p className="text-sm font-black text-rose-700 uppercase tracking-tight">需先結清餘額 (Settle Balance First)</p>
                    </div>

                    <form onSubmit={handlePaymentSubmit} className="bg-white p-4 rounded-2xl border border-rose-100 space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">收款金額 (Amount)</label>
                          <input
                            type="number"
                            required
                            max={balanceDue}
                            value={paymentData.amount}
                            onChange={e => setPaymentData({ ...paymentData, amount: parseInt(e.target.value) })}
                            className="w-full border-2 border-slate-100 p-3 rounded-xl text-lg font-black focus:border-emerald-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">支付方式 (Method)</label>
                          <select
                            value={paymentData.method}
                            onChange={e => setPaymentData({ ...paymentData, method: e.target.value as PaymentMethod })}
                            className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold text-sm bg-slate-50"
                          >
                            <option value="Cash">現金 (Cash)</option>
                            <option value="CreditCard">信用卡 (Credit Card)</option>
                            <option value="Transfer">匯款 (Transfer)</option>
                            <option value="Other">其他 (Other)</option>
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-emerald-700 transition-all active:scale-95">
                        確認入帳與更新餘額
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Right: Invoice Status */}
              <div className="space-y-4">
                <div className="bg-white border-2 border-slate-100 p-6 rounded-3xl h-full flex flex-col justify-center text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">發票狀態 (Invoice Status)</p>

                  {activeInvoice ? (
                    <div className="space-y-4">
                      {/* 發票已開立區塊 - 提供列印功能 */}
                      <div className="py-4 border-2 border-emerald-500 rounded-2xl bg-emerald-50">
                        <p className="text-xl font-black text-emerald-600">✅ 發票已開立</p>
                        <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase">Invoice Issued</p>
                        <div className="mt-3 font-mono font-black text-slate-700 bg-white inline-block px-4 py-1 rounded-full border border-emerald-200">
                          {activeInvoice.invoiceNumber}
                        </div>
                      </div>

                      {/* 列印選項 */}
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">列印發票 (Print Invoice)</p>
                        <div className="flex gap-2">
                          <button
                            disabled={!!isPrinting}
                            onClick={() => handlePrint('A4')}
                            className={`flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2 transition-all ${isPrinting === 'A4' ? 'opacity-50' : 'hover:bg-blue-700 active:scale-95'}`}
                          >
                            {isPrinting === 'A4' ? '⏳ 列印中...' : '🖨️ A4 發票'}
                          </button>
                          <button
                            disabled={!!isPrinting}
                            onClick={() => handlePrint('POS')}
                            className={`flex-1 bg-slate-800 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2 transition-all ${isPrinting === 'POS' ? 'opacity-50' : 'hover:bg-black active:scale-95'}`}
                          >
                            {isPrinting === 'POS' ? '⏳ 列印中...' : '📠 POS 收據'}
                          </button>
                        </div>
                        {onVoidInvoice && activeInvoice.status === 'Active' && (
                          <button
                            onClick={async () => {
                              const reason = prompt('請輸入作廢原因 (Reason for Void):');
                              if (reason) {
                                if (confirm(`確定要作廢發票 ${activeInvoice.invoiceNumber} 嗎？此動作無法復原。`)) {
                                  await onVoidInvoice(activeInvoice.id, reason);
                                }
                              }
                            }}
                            className="w-full mt-2 bg-rose-50 border border-rose-200 text-rose-600 py-3 rounded-xl font-black text-xs uppercase shadow-sm flex items-center justify-center gap-2 hover:bg-rose-100 active:scale-95 transition-all"
                          >
                            🗑️ 作廢 Void
                          </button>
                        )}
                      </div>

                      {/* 載具歸戶選項 */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">電子發票載具 (Carrier)</p>
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            placeholder="輸入載具條碼"
                            className="w-full border-2 border-slate-200 p-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all"
                          />
                          <button
                            className="w-full bg-emerald-600 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
                          >
                            📱 歸戶
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 italic">*歸戶後存入客戶帳戶</p>
                      </div>

                    </div>
                  ) : (

                    <div className="space-y-4">
                      <p className="text-sm font-bold text-slate-400 italic">尚未開立發票</p>
                      <button
                        disabled={!canIssueInvoice || balanceDue > 0}
                        onClick={handleIssueInvoiceInternal}
                        className={`w-full py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${canIssueInvoice && balanceDue <= 0 ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-300'}`}
                      >
                        {isIssuing ? '開立中...' : '🧾 立即開立電子發票'}
                      </button>
                      {balanceDue > 0 && <p className="text-[9px] text-rose-500 font-bold italic">需結清帳務後方可開票</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
              <button
                onClick={() => setIsCheckingOut(false)}
                className="flex-1 bg-slate-200 text-slate-600 py-4 rounded-2xl font-black text-sm uppercase transition-all hover:bg-slate-300 active:scale-95"
              >
                取消與返回 (Cancel)
              </button>
              <button
                disabled={balanceDue > 0}
                onClick={() => onCheckout && onCheckout(reservation.id)}
                className={`flex-[2] py-4 rounded-2xl font-black text-sm uppercase transition-all shadow-xl flex items-center justify-center gap-3 ${balanceDue <= 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
              >
                🏁 最終確認退房 (Complete Checkout)
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Accounting' && reservation && !isCheckingOut && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="bg-white border-2 border-slate-100 rounded-[32px] p-6 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">{reservation.guestName}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">訂單: {reservation.id}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">應收總額</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">${totalAmountDue.toLocaleString()}</p>
                {lateFee > 0 && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1">
                    (含延滯費 ${lateFee.toLocaleString()} / {overdueHours}hr{overdueDays > 0 ? ` = ${overdueDays}天` : ''}{billableHours > 0 ? ` + ${billableHours}hr` : ''})
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">已收總計</p>
                <p className="text-xl font-black text-emerald-700">${(reservation.paidAmount || 0).toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">折扣折讓</p>
                <p className="text-xl font-black text-slate-800">${(reservation.discount || 0).toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${balanceDue > 0 ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'}`}>
                <p className={`text-[9px] font-black uppercase mb-1 ${balanceDue > 0 ? 'text-rose-600' : 'text-blue-600'}`}>{balanceDue > 0 ? '待付餘額' : '帳務結清'}</p>
                <p className={`text-xl font-black ${balanceDue > 0 ? 'text-rose-700' : 'text-blue-700'}`}>${balanceDue.toLocaleString()}</p>
              </div>
            </div>

            {/* Refund/Overpayment Handling in Accounting Tab */}
            {balanceDue < 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-3xl space-y-4 animate-in slide-in-from-bottom-2 duration-500 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💰</span>
                  <div>
                    <p className="text-sm font-black text-blue-700 uppercase tracking-tight">溢收/待退款 (Overpayment)</p>
                    <p className="text-[10px] text-blue-500 font-bold">目前餘額為負，需進行退款或轉帳處理</p>
                  </div>
                </div>

                <div className="bg-white/50 p-4 rounded-2xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">退款方式 (Refund Method)</label>
                      <select
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                        className="w-full border border-slate-200 p-2 rounded-xl text-xs font-bold bg-white"
                      >
                        <option value="Cash">現金 (Cash)</option>
                        <option value="CreditCard">信用卡 (Credit Card)</option>
                        <option value="Transfer">匯款 (Transfer)</option>
                        <option value="Other">其他 (Other)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">備註 (Remark)</label>
                      <input
                        placeholder="信用卡末四碼 / 銀行帳號 / 備註..."
                        value={refundNote}
                        onChange={(e) => setRefundNote(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-xl text-xs font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {onRefund && (
                    <button
                      onClick={async () => {
                        const amount = Math.abs(balanceDue);
                        if (confirm(`確定要退款 $${amount} 給房客嗎？\n方式: ${refundMethod}\n備註: ${refundNote}`)) {
                          await onRefund(reservation!.id, amount, refundMethod, refundNote);
                          setRefundNote('');
                        }
                      }}
                      className="bg-white border border-blue-200 text-blue-700 py-3 rounded-xl font-black text-xs shadow-sm hover:bg-blue-100 active:scale-95 transition-all flex flex-col items-center gap-1"
                    >
                      <span>💸 退款 (Refund)</span>
                      <span className="text-[9px] opacity-70">現金/刷退/匯回</span>
                    </button>
                  )}
                  {onTransferOverpayment && (
                    <button
                      onClick={async () => {
                        const amount = Math.abs(balanceDue);
                        if (confirm(`確定要將 $${amount} 轉為保留款(公帳)嗎？\n備註: ${refundNote}`)) {
                          await onTransferOverpayment(reservation!.id, amount, refundNote);
                          setRefundNote('');
                        }
                      }}
                      className="bg-slate-800 text-white py-3 rounded-xl font-black text-xs shadow-lg hover:bg-black active:scale-95 transition-all flex flex-col items-center gap-1"
                    >
                      <span>🏦 轉公帳 (Transfer)</span>
                      <span className="text-[9px] opacity-70">保留至下次使用</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-4">
              {!showPaymentForm ? (
                <button
                  disabled={isIssuing}
                  onClick={() => setShowPaymentForm(true)}
                  className={`w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 transition-all ${isIssuing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black active:scale-95'}`}
                >
                  💵 執行櫃檯收款 (Collect Payment)
                </button>
              ) : (
                <form onSubmit={handlePaymentSubmit} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 animate-in zoom-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">收款金額</label><input type="number" required max={balanceDue} value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: parseInt(e.target.value) })} className="w-full border border-slate-200 p-3 rounded-xl text-lg font-black" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">支付方式</label><select value={paymentData.method} onChange={e => setPaymentData({ ...paymentData, method: e.target.value as PaymentMethod })} className="w-full border border-slate-200 p-3 rounded-xl font-bold text-sm"><option value="Cash">現金 (Cash)</option><option value="CreditCard">信用卡 (Credit Card)</option><option value="Transfer">匯款 (Transfer)</option></select></div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg">確認入帳</button>
                    <button type="button" onClick={() => setShowPaymentForm(false)} className="px-4 bg-slate-200 text-slate-500 py-3 rounded-xl font-black text-xs uppercase">取消</button>
                  </div>
                </form>
              )}

              <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-slate-800">電子發票 Electronic Invoice</h3>
                  {!activeInvoice && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="統一編號 (Tax ID)"
                        value={buyerId}
                        onChange={(e) => setBuyerId(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono w-40"
                        maxLength={8}
                      />
                      <button
                        onClick={handleIssueInvoiceInternal}
                        disabled={!canIssueInvoice}
                        className={`px-4 py-2 rounded-xl font-bold text-sm ${canIssueInvoice
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                      >
                        {isIssuing ? '開立中...' : '開立發票 Issue'}
                      </button>
                    </div>
                  )}
                </div>
                {!activeInvoice ? (
                  <div className="space-y-4">
                    {!isPaid && <p className="text-[9px] text-rose-500 text-center font-bold uppercase animate-pulse italic">⚠️ 財務鎖定：必須先執行收款後，方可解鎖開票功能。</p>}
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-[9px] font-black text-emerald-600 uppercase">發票已開立 (藍燈狀態)</p>
                        <p className="text-xl font-black text-emerald-800 font-mono tracking-tighter">{activeInvoice.invoiceNumber}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={!!isPrinting}
                          onClick={() => handlePrint('A4')}
                          className={`bg-white border border-slate-200 p-2 rounded-xl transition-all shadow-sm font-black text-xs flex items-center gap-1 ${isPrinting === 'A4' ? 'opacity-50' : 'hover:bg-slate-50 active:scale-95'}`}
                        >
                          {isPrinting === 'A4' ? '⏳' : '🖨️'} A4
                        </button>
                        <button
                          disabled={!!isPrinting}
                          onClick={() => handlePrint('POS')}
                          className={`bg-slate-900 border border-slate-900 text-white p-2 rounded-xl transition-all shadow-lg font-black text-xs flex items-center gap-1 ${isPrinting === 'POS' ? 'opacity-50' : 'hover:bg-slate-800 active:scale-95'}`}
                        >
                          {isPrinting === 'POS' ? '⏳' : '🧾'} POS
                        </button>
                        {onVoidInvoice && activeInvoice.status === 'Active' && (
                          <button
                            onClick={async () => {
                              const reason = prompt('請輸入作廢原因 (Reason for Void):');
                              if (reason) {
                                if (confirm(`確定要作廢發票 ${activeInvoice.invoiceNumber} 嗎？此動作無法復原。`)) {
                                  await onVoidInvoice(activeInvoice.id, reason);
                                }
                              }
                            }}
                            className="bg-rose-50 border border-rose-200 text-rose-600 p-2 rounded-xl transition-all shadow-sm font-black text-xs flex items-center gap-1 hover:bg-rose-100 active:scale-95"
                          >
                            🗑️ 作廢 Void
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'Transactions' && !isCheckingOut && (
        <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>消費明細與交易紀錄 (Folio & Transactions)</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4">時間 / 內容</th>
                    <th className="px-6 py-4">項目/支付方式</th>
                    <th className="px-6 py-4 text-right">金額</th>
                    <th className="px-6 py-4 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {/* 合併消費項目與交易紀錄，按時間降冪排序 */}
                  {(() => {
                    // 合併兩類資料並添加類型標記
                    const allItems: Array<{
                      id: string;
                      type: 'billable' | 'transaction';
                      timestamp: Date;
                      data: any;
                    }> = [];

                    // 添加消費項目
                    billableItems.forEach(item => {
                      const ts = item.createdAt ? new Date(item.createdAt) : new Date();
                      // 修正無效日期（1970年問題）
                      const validTs = ts.getFullYear() > 1990 ? ts : new Date();
                      allItems.push({
                        id: item.id,
                        type: 'billable',
                        timestamp: validTs,
                        data: { ...item, validTimestamp: validTs }
                      });
                    });

                    // 添加交易紀錄
                    transactions.forEach(tx => {
                      const ts = tx.createdAt ? new Date(tx.createdAt) : (tx.date ? new Date(tx.date) : new Date());
                      const validTs = ts.getFullYear() > 1990 ? ts : new Date();
                      allItems.push({
                        id: tx.id,
                        type: 'transaction',
                        timestamp: validTs,
                        data: { ...tx, validTimestamp: validTs }
                      });
                    });

                    // 按時間降冪排序（最新在最上面）
                    allItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                    return allItems.map(item => {
                      if (item.type === 'billable') {
                        const billItem = item.data;
                        return (
                          <tr key={billItem.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-slate-400 font-normal">
                              {billItem.validTimestamp.toLocaleDateString('zh-TW')} {billItem.validTimestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-slate-800">{billItem.description}</div>
                              <div className="text-[9px] text-slate-400 font-normal">數量: {billItem.quantity} | 備註: {billItem.note || '-'}</div>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-800">
                              -${(billItem.amount * billItem.quantity).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => {
                                  if (activeInvoice) {
                                    alert(`⚠️ 發票鎖定中\n\n已開立發票 ${activeInvoice.invoiceNumber}，金額為 $${activeInvoice.amount.toLocaleString()}。\n\n若需修改消費項目，請先至「帳務結算」頁籤作廢原發票，再進行修改並重新開立新發票。`);
                                    return;
                                  }
                                  onDeleteBillableItem(billItem.id);
                                }}
                                className={`${activeInvoice ? 'text-slate-300 cursor-not-allowed' : 'text-rose-400 hover:text-rose-600'}`}
                                title={activeInvoice ? '發票已開立，需先作廢才能刪除項目' : '刪除此項目'}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      } else {
                        const tx = item.data;
                        return (
                          <tr key={tx.id} className="bg-emerald-50/20 hover:bg-emerald-50 transition-colors">
                            <td className="px-6 py-4">
                              <div>{tx.validTimestamp.toLocaleDateString('zh-TW')} {tx.validTimestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</div>
                              <div className="text-[9px] text-blue-500 uppercase">{tx.staffName}</div>
                              {tx.type && <div className="text-[9px] text-slate-400 font-bold">{tx.type}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-emerald-700 font-black">支付: {tx.method}</span>
                              <div className="text-[9px] text-slate-500">{tx.description}</div>
                            </td>
                            <td className="px-6 py-4 text-right text-emerald-600 font-black">
                              {tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {onCancelTransaction && (tx.type === 'Refund' || tx.type === 'Adjustment') && tx.amount < 0 && (
                                <button
                                  onClick={async () => {
                                    if (confirm('確定要取消(回轉)此筆交易嗎？這將會產生一筆抵銷紀錄。')) {
                                      await onCancelTransaction(tx.id);
                                    }
                                  }}
                                  className="text-orange-500 hover:text-orange-700 font-bold text-xs px-2 py-1 border border-orange-200 rounded-lg hover:bg-orange-50"
                                  title="取消/回轉交易 (Reverse Transaction)"
                                >
                                  ↺ 取消
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    });
                  })()}
                </tbody>
              </table>
            </div>
            {reservation && (
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                {/* 發票鎖定警告 */}
                {activeInvoice && (
                  <div className="mb-3 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
                    <span className="text-amber-500 text-lg">🔒</span>
                    <div>
                      <p className="text-[10px] font-black text-amber-700 uppercase">發票已開立 - 金額已鎖定</p>
                      <p className="text-[10px] text-amber-600 mt-1">
                        發票號碼: <span className="font-mono font-bold">{activeInvoice.invoiceNumber}</span> |
                        發票金額: <span className="font-bold">${activeInvoice.amount.toLocaleString()}</span>
                      </p>
                      <p className="text-[9px] text-amber-500 mt-1 italic">
                        若需修改消費項目，請先至「帳務結算」頁籤作廢原發票，再進行修改並重新開立新發票。
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">新增消費項目</label>
                    <div className="flex gap-1">
                      <select
                        className={`w-full border p-2 rounded-xl text-xs font-bold ${activeInvoice ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200'}`}
                        value={newItem.description}
                        disabled={!!activeInvoice}
                        onChange={(e) => {
                          const selected = consumptionItems.find(i => i.name === e.target.value);
                          if (selected) {
                            setNewItem({ ...newItem, description: selected.name, amount: selected.price });
                          } else {
                            setNewItem({ ...newItem, description: e.target.value });
                          }
                        }}
                      >
                        <option value="">選擇項目...</option>
                        {consumptionItems.map(i => (
                          <option key={i.id} value={i.name}>{i.name} (${i.price})</option>
                        ))}
                        <option value="custom">-- 自訂輸入 --</option>
                      </select>
                    </div>
                    {newItem.description === 'custom' && !activeInvoice && (
                      <input placeholder="輸入項目名稱" className="w-full border border-slate-200 p-2 rounded-xl text-xs font-bold mt-1"
                        onChange={e => setNewItem({ ...newItem, description: e.target.value, amount: 0 })}
                      />
                    )}
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="$"
                      value={newItem.amount}
                      onChange={e => setNewItem({ ...newItem, amount: parseInt(e.target.value) || 0 })}
                      disabled={!!activeInvoice}
                      className={`w-full border p-2 rounded-xl text-xs font-bold text-right ${activeInvoice ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'}`}
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                      disabled={!!activeInvoice}
                      className={`w-full border p-2 rounded-xl text-xs font-bold text-center ${activeInvoice ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'}`}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      placeholder="備註"
                      value={newItem.note}
                      onChange={e => setNewItem({ ...newItem, note: e.target.value })}
                      disabled={!!activeInvoice}
                      className={`w-full border p-2 rounded-xl text-xs font-bold ${activeInvoice ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200'}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeInvoice) {
                        alert(`⚠️ 發票鎖定中\n\n已開立發票 ${activeInvoice.invoiceNumber}，金額為 $${activeInvoice.amount.toLocaleString()}。\n\n若需新增消費項目，請先至「帳務結算」頁籤作廢原發票，再進行修改並重新開立新發票。`);
                        return;
                      }
                      if (!newItem.description || newItem.description === 'custom') return;
                      onAddBillableItem({
                        reservationId: reservation.id,
                        description: newItem.description,
                        amount: newItem.amount,
                        quantity: newItem.quantity,
                        paymentMethod: newItem.paymentMethod,
                        note: newItem.note
                      });
                      setNewItem({ description: '', amount: 0, quantity: 1, paymentMethod: 'Room Charge', note: '' });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 ${activeInvoice ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-black'}`}
                    title={activeInvoice ? '發票已開立，需先作廢才能新增項目' : '新增消費項目'}
                  >
                    ＋
                  </button>
                </div>
              </div>
            )}
            {(billableItems.length === 0 && transactions.length === 0) && (
              <div className="p-12 text-center text-slate-300 italic">無任何消費或交易紀錄</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsModal;
