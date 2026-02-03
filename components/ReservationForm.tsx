import React, { useState, useMemo, useEffect } from 'react';
import { Reservation, RoomType, Room, RoomStatus } from '../types';

interface ReservationFormProps {
    hotelId: string;
    onSubmit: (res: Reservation, billableItems?: any[], initialPayment?: any) => void;
    rooms?: Room[];
    initialData?: Partial<Reservation>;
    buildings?: { id: string; name: string }[];
    mode?: 'Stay' | 'Rest';
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

const ReservationForm: React.FC<ReservationFormProps> = ({ hotelId, onSubmit, rooms = [], initialData, buildings, mode = 'Stay' }) => {
    const [restExtraHours, setRestExtraHours] = useState(0);
    const [hourlyRate, setHourlyRate] = useState(300);

    // Time state with defaults: Check-in = current time, Check-out = 11:00
    const [checkInTime, setCheckInTime] = useState(
        initialData?.checkIn?.includes(' ')
            ? initialData.checkIn.split(' ')[1]?.slice(0, 5) || getCurrentTime()
            : getCurrentTime()
    );
    const [checkOutTime, setCheckOutTime] = useState(
        initialData?.checkOut?.includes(' ')
            ? initialData.checkOut.split(' ')[1]?.slice(0, 5) || '11:00'
            : '11:00'
    );

    // New Payment States
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [creditCardNumber, setCreditCardNumber] = useState('');
    const [paymentNote, setPaymentNote] = useState('');

    const [formData, setFormData] = useState({
        guestName: initialData?.guestName || '',
        phone: initialData?.phone || '',
        idNumber: initialData?.idNumber || '',
        roomType: (initialData?.roomType || 'Single') as RoomType,
        checkIn: initialData?.checkIn?.split(' ')[0] || new Date().toISOString().split('T')[0],
        checkOut: initialData?.checkOut?.split(' ')[0] || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        roomNumber: initialData?.roomNumber || '',
        source: initialData?.source || '櫃檯直接',
        totalPrice: initialData?.totalPrice || 0,
        paidAmount: initialData?.paidAmount || 0,
        discount: initialData?.discount || 0,
        note: initialData?.note || '',
        adults: 1,
        children: 0,
        licensePlate: '',
        companyName: '',
        bookingAgent: '',
        depositAmount: 0
    });

    // Calculate nights
    const nights = useMemo(() => {
        if (formData.checkIn && formData.checkOut) {
            const checkIn = new Date(formData.checkIn.split(' ')[0]);
            const checkOut = new Date(formData.checkOut.split(' ')[0]);
            const diff = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            return diff > 0 ? diff : 1;
        }
        return 1;
    }, [formData.checkIn, formData.checkOut]);

    // Get selected room and its price
    const selectedRoom = useMemo(() => {
        return rooms.find(r => r.number === formData.roomNumber);
    }, [rooms, formData.roomNumber]);

    // Auto-update total price when room selection, nights, or rest hours change
    useEffect(() => {
        if (selectedRoom) {
            const basePrice = selectedRoom.basePrice || 1500;
            if (mode === 'Stay') {
                setFormData(prev => ({
                    ...prev,
                    totalPrice: basePrice * nights
                }));
            } else {
                // Rest mode calculation
                const extensionCharge = restExtraHours * hourlyRate;
                const totalHours = 2 + restExtraHours;

                setFormData(prev => {
                    const checkInDateTime = `${prev.checkIn} ${checkInTime}`;
                    const checkInDate = new Date(checkInDateTime.replace(' ', 'T'));
                    const validCheckIn = isNaN(checkInDate.getTime()) ? new Date() : checkInDate;
                    const checkOutDate = new Date(validCheckIn.getTime() + totalHours * 3600000);

                    return {
                        ...prev,
                        totalPrice: basePrice + extensionCharge,
                        checkOut: checkOutDate.toISOString().slice(0, 10)
                    };
                });
                // Also update checkout time for rest mode
                const checkInDateTime = `${formData.checkIn} ${checkInTime}`;
                const checkInDate = new Date(checkInDateTime.replace(' ', 'T'));
                if (!isNaN(checkInDate.getTime())) {
                    const checkOutDate = new Date(checkInDate.getTime() + (2 + restExtraHours) * 3600000);
                    setCheckOutTime(checkOutDate.toTimeString().slice(0, 5));
                }
            }
        }
    }, [selectedRoom, nights, restExtraHours, hourlyRate, mode, checkInTime]);

    // Calculate balance
    const balance = formData.totalPrice - formData.paidAmount - formData.discount;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedRoom = rooms.find(r => r.number === formData.roomNumber);

        // Combine date and time for final submission
        const fullCheckIn = `${formData.checkIn} ${checkInTime}`;
        const fullCheckOut = `${formData.checkOut} ${checkOutTime}`;

        const newRes: Reservation = {
            id: `RES-${Math.floor(1000 + Math.random() * 9000)}`,
            status: 'Confirmed',
            hotelId: hotelId,
            buildingId: selectedRoom?.buildingId || '',
            guestId: 'new',
            lastEditedBy: 'Front Desk',
            ...formData,
            checkIn: fullCheckIn,
            checkOut: fullCheckOut
        };

        // Auto-generate Billable Item for Room Rent
        const roomChargeItem = {
            description: mode === 'Rest' ? `休息費 (Resting Charge - ${2 + restExtraHours}h)` : `住宿費 (Room Charge - ${nights}晚)`,
            amount: formData.totalPrice,
            quantity: 1,
            paymentMethod: 'Room Charge',
            note: mode === 'Rest' ? `房號 ${formData.roomNumber} - 休息 ${2 + restExtraHours} 小時` : `房號 ${formData.roomNumber} - ${nights} 晚`
        };

        // Prepare Initial Payment Info if any
        let initialPayment = null;
        if (formData.paidAmount > 0) {
            initialPayment = {
                amount: formData.paidAmount,
                method: paymentMethod,
                description: `訂金/預付 (Deposit) - ${paymentNote}`,
            };
        }

        // Add payment info to reservation object
        newRes.paymentMethod = paymentMethod;
        newRes.creditCard = creditCardNumber;
        // Append payment note to main note if exists
        if (paymentNote) {
            newRes.note = newRes.note ? `${newRes.note}\n[Payment]: ${paymentNote}` : `[Payment]: ${paymentNote}`;
        }

        onSubmit(newRes, [roomChargeItem], initialPayment);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Guest Info */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">賓客姓名 *</label>
                    <input
                        required
                        type="text"
                        value={formData.guestName}
                        onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                        placeholder="請輸入完整姓名"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">聯絡電話</label>
                    <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                        placeholder="請輸入聯絡電話"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">身分證 / 護照號碼</label>
                    <input
                        type="text"
                        value={formData.idNumber}
                        onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                        placeholder="證件號碼"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">車牌號碼</label>
                    <input
                        type="text"
                        value={formData.licensePlate}
                        onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                        placeholder="AB-1234"
                    />
                </div>
            </div>

            {/* Room Selection */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-emerald-800">選擇房間 (空淨房)</p>
                    <span className="text-xs bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        {rooms.filter(r => r.status === RoomStatus.VC).length} 間可用
                    </span>
                </div>
                {formData.roomNumber && selectedRoom && (
                    <div className="mb-3 p-2 bg-emerald-500 text-white rounded-lg text-center">
                        <span className="text-xs font-bold">已選擇: </span>
                        <span className="text-lg font-black">{formData.roomNumber}</span>
                        <span className="text-xs ml-2">({formData.roomType})</span>
                        <span className="text-xs ml-2">- ${selectedRoom.basePrice || 0}/晚</span>
                    </div>
                )}
                <div className="flex flex-wrap gap-2">
                    {rooms.filter(r => r.status === RoomStatus.VC).length === 0 ? (
                        <p className="text-sm text-rose-500 font-bold">目前沒有空淨房可供選擇</p>
                    ) : (
                        rooms.filter(r => r.status === RoomStatus.VC).map(room => (
                            <button
                                key={room.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, roomNumber: room.number, roomType: room.type })}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${formData.roomNumber === room.number
                                    ? 'bg-emerald-600 text-white shadow-lg scale-105'
                                    : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400'
                                    }`}
                            >
                                <span className="text-base font-black">{room.number}</span>
                                <br />
                                <span className="text-[9px] opacity-80">{room.type} ${room.basePrice || 0}</span>
                            </button>
                        ))
                    )}
                </div>
                {!formData.roomNumber && rooms.filter(r => r.status === RoomStatus.VC).length > 0 && (
                    <p className="text-xs text-rose-500 mt-2 font-bold">* 請點選上方房間完成選擇</p>
                )}
            </div>

            {/* Dates and Times / Rest Hours */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                {mode === 'Stay' ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Check-in Date & Time */}
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-slate-700">入住日期時間</label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="date"
                                        value={formData.checkIn?.split(' ')[0] || ''}
                                        onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                                    />
                                    <input
                                        type="time"
                                        value={checkInTime}
                                        onChange={(e) => setCheckInTime(e.target.value)}
                                        className="w-24 bg-blue-50 border border-blue-200 rounded-xl px-2 py-2.5 text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400">預設入住時間: 15:00 (下午3點後)</p>
                            </div>

                            {/* Check-out Date & Time */}
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-slate-700">退房日期時間</label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="date"
                                        value={formData.checkOut?.split(' ')[0] || ''}
                                        onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                                    />
                                    <input
                                        type="time"
                                        value={checkOutTime}
                                        onChange={(e) => setCheckOutTime(e.target.value)}
                                        className="w-24 bg-amber-50 border border-amber-200 rounded-xl px-2 py-2.5 text-sm font-bold text-amber-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400">預設退房時間: 11:00 (上午11點前)</p>
                            </div>
                        </div>

                        {/* Nights Display */}
                        <div className="bg-blue-100 border border-blue-200 rounded-xl px-4 py-2.5 text-center">
                            <span className="text-sm font-bold text-blue-700">入住 {nights} 晚</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Rest Mode: Date and Time Selection */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-slate-700">入住日期時間</label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="date"
                                        value={formData.checkIn?.split(' ')[0] || ''}
                                        onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                                        className="w-7/12 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                    />
                                    <input
                                        type="time"
                                        value={checkInTime}
                                        onChange={(e) => setCheckInTime(e.target.value)}
                                        className="w-5/12 bg-rose-50 border border-rose-200 rounded-xl px-2 py-2.5 text-sm font-bold text-rose-700 focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-slate-700">退房日期時間</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={formData.checkOut?.split(' ')[0] || ''}
                                        onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                                        className="w-7/12 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                    />
                                    <input
                                        type="time"
                                        value={checkOutTime}
                                        onChange={(e) => setCheckOutTime(e.target.value)}
                                        className="w-5/12 bg-rose-50 border border-rose-200 rounded-xl px-2 py-2.5 text-sm font-bold text-rose-700 focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700">休息時數 (Base 2h + Extension)</label>
                            <span className="text-lg font-black text-rose-600">{2 + restExtraHours} 小時</span>
                        </div>
                        <div className="space-y-2">
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="1"
                                value={restExtraHours}
                                onChange={(e) => setRestExtraHours(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                <span>Base (2h)</span>
                                <span>+1h</span>
                                <span>+2h</span>
                                <span>+3h</span>
                                <span>+4h</span>
                                <span>+5h</span>
                                <span>+6h (Max)</span>
                                <span className="text-rose-400">Over Limit</span>
                            </div>
                        </div>


                        {restExtraHours > 0 && (
                            <div className="flex items-center gap-4 bg-rose-50 p-3 rounded-xl border border-rose-100">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-rose-600 uppercase mb-1">每小時延時費用</label>
                                    <input
                                        type="number"
                                        value={hourlyRate}
                                        onChange={(e) => setHourlyRate(parseInt(e.target.value) || 0)}
                                        className="w-full bg-white border border-rose-200 rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                                    />
                                </div>
                                <div className="text-right">
                                    <label className="block text-[10px] font-black text-rose-400 uppercase mb-1">延時總計</label>
                                    <p className="text-lg font-black text-rose-600">${(restExtraHours * hourlyRate).toLocaleString()}</p>
                                </div>
                            </div>
                        )}

                        {restExtraHours > 6 && (
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3">
                                <span className="text-xl">⚠️</span>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-amber-800">建議轉為住宿</p>
                                    <p className="text-[10px] text-amber-700">延時超過 6 小時（共 8 小時），建議直接轉為 1 天住宿方案較划算。</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => alert('請手動調整上方模式為住宿')}
                                    className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-sm"
                                >
                                    變更模式
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">預計退房</label>
                                <p className="text-sm font-black text-slate-800">{formData.checkOut}</p>
                            </div>
                            <div className="text-right">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">計算模型</label>
                                <p className="text-xs font-bold text-slate-500">2h Base + {restExtraHours}h Ext.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Billing Section */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">💰 消費明細</p>

                {/* Room charge */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">房租 ({formData.roomType} x {nights}晚)</span>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">${selectedRoom?.basePrice || 0} x {nights}</span>
                        <input
                            type="number"
                            value={formData.totalPrice}
                            onChange={(e) => setFormData({ ...formData, totalPrice: parseInt(e.target.value) || 0 })}
                            className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right text-sm font-bold"
                        />
                    </div>
                </div>

                {/* Discount */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">折扣優惠</span>
                    <div className="flex items-center gap-1">
                        <span className="text-rose-500">-</span>
                        <input
                            type="number"
                            value={formData.discount}
                            onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
                            className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right text-sm font-bold text-rose-500"
                        />
                    </div>
                </div>

                {/* Paid amount */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">已收金額</span>
                    <div className="flex items-center gap-1">
                        <span className="text-emerald-500">-</span>
                        <input
                            type="number"
                            value={formData.paidAmount}
                            onChange={(e) => setFormData({ ...formData, paidAmount: parseInt(e.target.value) || 0 })}
                            className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right text-sm font-bold text-emerald-500"
                        />
                    </div>
                </div>

                {/* Payment Options - Only show if paidAmount > 0 */}
                {formData.paidAmount > 0 && (
                    <div className="bg-slate-50 p-3 rounded-lg space-y-3 border border-slate-200 mt-2">
                        {/* Payment Method */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">收款方式 (Payment Method)</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Cash">現金 (Cash)</option>
                                <option value="CreditCard">信用卡 (Credit Card)</option>
                                <option value="LinePay">Line Pay</option>
                                <option value="JkoPay">街口支付 (JKOPay)</option>
                                <option value="Transfer">銀行轉帳 (Transfer)</option>
                                <option value="Other">其他 (Other)</option>
                            </select>
                        </div>

                        {/* Credit Card Number */}
                        {paymentMethod === 'CreditCard' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">信用卡卡號 (Card Number)</label>
                                <input
                                    type="text"
                                    value={creditCardNumber}
                                    onChange={(e) => setCreditCardNumber(e.target.value)}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        {/* Payment Note */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">收款備註 (Payment Note)</label>
                            <input
                                type="text"
                                value={paymentNote}
                                onChange={(e) => setPaymentNote(e.target.value)}
                                placeholder="例如：交易序號、統一編號..."
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                )}

                {/* Balance */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                    <span className="font-bold text-slate-800">尚欠餘額</span>
                    <span className={`text-xl font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ${balance.toLocaleString()}
                    </span>
                </div>

                {/* Quick payment buttons */}
                <div className="flex gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paidAmount: formData.totalPrice - formData.discount })}
                        className="flex-1 bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                        全額收款
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paidAmount: 0, discount: 0 })}
                        className="flex-1 bg-slate-400 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-500 transition-colors"
                    >
                        清除收款
                    </button>
                </div>
            </div>

            {/* Note */}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">備註</label>
                <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                    rows={2}
                    placeholder="其他備註事項..."
                />
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    type="submit"
                    disabled={!formData.roomNumber}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
                >
                    確認建立訂單
                </button>
            </div>
        </form>
    );
};

export default ReservationForm;
