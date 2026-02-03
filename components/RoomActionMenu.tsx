
import React, { useState } from 'react';
import { Room, RoomStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';

interface RoomActionMenuProps {
    room: Room;
    onAction: (action: string) => void;
    onStatusChange: (roomId: string, newStatus: RoomStatus) => void;
    onClose: () => void;
}

const RoomActionMenu: React.FC<RoomActionMenuProps> = ({ room, onAction, onStatusChange, onClose }) => {
    const [showStatusPanel, setShowStatusPanel] = useState(false);
    const isOccupied = room.status === RoomStatus.OC;
    const isVacant = room.status === RoomStatus.VC || room.status === RoomStatus.VD;
    const hasConfirmedReservation = room.current_order && room.current_order.status === 'Confirmed';
    const hasCheckedInReservation = room.current_order && room.current_order.status === 'CheckedIn';

    const actions = [
        { id: 'checkin', label: '辦理入住 (C)', icon: '🔑', sub: 'Check-in Guest', color: 'text-emerald-600', enabled: isVacant && hasConfirmedReservation },
        { id: 'cancel_checkin', label: '取消入住 (X)', icon: '↩️', sub: 'Revert Check-in', color: 'text-rose-600', enabled: isOccupied && hasCheckedInReservation },
        { id: 'rest', label: '休息 (1)', icon: '☕', sub: 'Short Stay', color: 'text-rose-600', enabled: isVacant },
        { id: 'stay', label: '住宿 (2)', icon: '🏠', sub: 'New Check-in', color: 'text-blue-600', enabled: isVacant },
        { id: 'checkout', label: '辦理退房 (Checkout)', icon: '🚪', sub: 'Check-out guest', color: 'text-amber-600', enabled: isOccupied },
        { id: 'cancel_checkout', label: '取消遷出 (取消退房) (9)', icon: '🔄', sub: 'Revert Checkout', color: 'text-rose-600', enabled: isVacant },
        { id: 'note', label: '房間註記 (M)', icon: '📝', sub: 'Room Note', color: 'text-amber-600', enabled: true },
        { id: 'status', label: '調整房態 (S)', icon: '🔧', sub: 'Change Status', color: 'text-purple-600', enabled: true },
        { id: 'order', label: '叫出此房間本日訂房之訂單 (O)', icon: '📋', sub: 'Current Order', color: 'text-slate-800', enabled: !!room.current_order },
        { id: 'history', label: '前一房客查詢', icon: '🔍', sub: 'Previous Guest', color: 'text-slate-500', enabled: true },
    ];

    const statusOptions: { status: RoomStatus; label: string; icon: string; description: string }[] = [
        { status: RoomStatus.VC, label: '空淨房', icon: '✨', description: '房間已清潔可售' },
        { status: RoomStatus.VD, label: '空髒房', icon: '🧹', description: '房間待清掃' },
        { status: RoomStatus.OC, label: '住客房', icon: '👥', description: '有客人入住' },
        { status: RoomStatus.OOO, label: '故障房', icon: '🚧', description: '維修中/無法使用' },
        { status: RoomStatus.SO, label: '續住房', icon: '🔄', description: '房客續住待整理' },
    ];

    const handleActionClick = (actionId: string) => {
        if (actionId === 'status') {
            setShowStatusPanel(true);
        } else {
            onAction(actionId);
        }
    };

    const handleStatusSelect = (newStatus: RoomStatus) => {
        if (newStatus !== room.status) {
            onStatusChange(room.id, newStatus);
        }
        setShowStatusPanel(false);
    };

    if (showStatusPanel) {
        return (
            <div className="p-2 space-y-1 w-full max-w-[320px] mx-auto">
                <div className="px-4 py-3 bg-purple-900 text-white rounded-2xl mb-4 flex justify-between items-center shadow-lg">
                    <div>
                        <span className="text-[10px] font-black uppercase opacity-60">調整房態</span>
                        <p className="text-2xl font-black">#{room.number}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-black uppercase opacity-60">目前狀態</span>
                        <p className={`text-xs font-black`}>{STATUS_LABELS[room.status]}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                    {statusOptions.map(opt => {
                        const isCurrentStatus = opt.status === room.status;
                        const colorClass = STATUS_COLORS[opt.status];
                        return (
                            <button
                                key={opt.status}
                                onClick={() => handleStatusSelect(opt.status)}
                                className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all text-left border-2 group ${isCurrentStatus
                                    ? `${colorClass} border-current ring-2 ring-offset-2`
                                    : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md active:scale-95'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${colorClass}`}>
                                    {opt.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-sm text-slate-800">{opt.label}</p>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">({opt.status})</span>
                                        {isCurrentStatus && (
                                            <span className="bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black">目前</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500">{opt.description}</p>
                                </div>
                                {!isCurrentStatus && <span className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">→</span>}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => setShowStatusPanel(false)}
                    className="w-full mt-4 py-3 text-purple-500 font-black text-xs uppercase tracking-[0.2em] hover:text-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                    ← 返回選單
                </button>
            </div>
        );
    }

    return (
        <div className="p-2 space-y-1 w-full max-w-[320px] mx-auto">
            <div className="px-4 py-3 bg-slate-900 text-white rounded-2xl mb-4 flex justify-between items-center shadow-lg">
                <div>
                    <span className="text-[10px] font-black uppercase opacity-60">Room Number</span>
                    <p className="text-2xl font-black">#{room.number}</p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black uppercase opacity-60">Status</span>
                    <p className={`text-xs font-black`}>{room.status}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-1">
                {actions.map(action => (
                    <button
                        key={action.id}
                        disabled={!action.enabled}
                        onClick={() => handleActionClick(action.id)}
                        className={`flex items-center gap-4 w-full p-3 rounded-2xl transition-all text-left border-2 group ${action.enabled
                            ? 'bg-white border-transparent hover:border-slate-200 hover:shadow-md active:scale-95'
                            : 'bg-slate-50 border-transparent opacity-40 cursor-not-allowed grayscale'
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110 bg-slate-50 ${action.color}`}>
                            {action.icon}
                        </div>
                        <div className="flex-1">
                            <p className={`font-black text-sm ${action.color}`}>{action.label}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{action.sub}</p>
                        </div>
                        {action.enabled && <span className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">→</span>}
                    </button>
                ))}
            </div>

            <button
                onClick={onClose}
                className="w-full mt-4 py-3 text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
            >
                Close Menu
            </button>
        </div>
    );
};

export default RoomActionMenu;
