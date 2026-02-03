
import React from 'react';
import { Room, RoomStatus, Housekeeper, Hotel } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';

interface CleaningInfo {
  taskId: string;
  status: 'Unassigned' | 'InProgress' | 'Completed' | 'Inspected';
  housekeeperName?: string;
  housekeeperId?: string;
  taskType?: 'VD' | 'SO' | 'DND';
}

interface RoomCardProps {
  room: Room;
  hotel?: Hotel;  // 新增：飯店參數用於延滯計算
  onClick: (room: Room) => void;
  cleaningInfo?: CleaningInfo;
  housekeepers?: Housekeeper[];
  onAssignHousekeeper?: (taskId: string, housekeeperId: string, housekeeperName: string) => void;
  onUnassignHousekeeper?: (taskId: string) => void;
  onCheckIn?: (reservationId: string) => void;
  onCancelCheckIn?: (reservationId: string) => void;
  isUpdated?: boolean; // 即時更新標記
}

const SourceIcon: React.FC<{ source: string }> = ({ source }) => {
  switch (source) {
    case 'Booking.com': return <span className="bg-blue-800 text-white text-[9px] px-1 rounded mr-1 font-bold">B.</span>;
    case 'Agoda': return <span className="bg-orange-500 text-white text-[9px] px-1 rounded mr-1 font-bold">A.</span>;
    case '官網': return <span className="text-blue-500 mr-1 text-[10px]">🏠</span>;
    default: return <span className="text-gray-400 mr-1">🌐</span>;
  }
};

interface CleaningStatusBadgeProps {
  cleaningInfo: CleaningInfo;
  housekeepers?: Housekeeper[];
  onAssign?: (taskId: string, housekeeperId: string, housekeeperName: string) => void;
  onUnassign?: (taskId: string) => void;
}

const CleaningStatusBadge: React.FC<CleaningStatusBadgeProps> = ({
  cleaningInfo,
  housekeepers = [],
  onAssign,
  onUnassign
}) => {
  const { taskId, status, housekeeperName, taskType } = cleaningInfo;

  const statusConfig = {
    Unassigned: { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200', label: '待分配', icon: '⏳' },
    InProgress: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200', label: '清掃中', icon: '🧹' },
    Completed: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200', label: '已清潔', icon: '✓' },
    Inspected: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', label: '已稽核', icon: '✔️' },
  };

  const config = statusConfig[status];
  const activeHousekeepers = housekeepers.filter(h => h.status === 'Active');
  const hasAssignment = housekeeperName && status !== 'Unassigned';

  const handleAssign = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const hk = housekeepers.find(h => h.id === e.target.value);
    if (hk && onAssign) {
      onAssign(taskId, hk.id, hk.name);
    }
  };

  const handleUnassign = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnassign) {
      onUnassign(taskId);
    }
  };

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-lg p-2 space-y-1`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-black uppercase ${config.text}`}>
          {config.icon} {config.label}
        </span>
        {taskType && (
          <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${taskType === 'VD' ? 'bg-amber-200 text-amber-700' :
            taskType === 'SO' ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-500'
            }`}>
            {taskType === 'VD' ? '空髒' : taskType === 'SO' ? '續住' : 'DND'}
          </span>
        )}
      </div>

      {/* Housekeeper display and controls */}
      {hasAssignment ? (
        <div className="space-y-1">
          <p className={`text-[10px] font-bold ${config.text}`}>
            👤 {housekeeperName}
          </p>
          {onAssign && onUnassign && (
            <div className="flex gap-1">
              <select
                value=""
                onChange={handleAssign}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-[9px] border border-slate-200 rounded py-0.5 px-1 outline-none focus:ring-1 focus:ring-blue-500 text-slate-400 bg-white"
              >
                <option value="">🔄 更換</option>
                {activeHousekeepers.filter(h => h.name !== housekeeperName).map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              <button
                onClick={handleUnassign}
                className="px-1.5 py-0.5 bg-rose-200 text-rose-600 text-[9px] font-bold rounded hover:bg-rose-300 transition-colors"
                title="取消分派"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ) : (
        onAssign && activeHousekeepers.length > 0 && (
          <select
            value=""
            onChange={handleAssign}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-[9px] border border-slate-200 rounded py-0.5 px-1 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">指派房務員</option>
            {activeHousekeepers.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        )
      )}
    </div>
  );
};

const RoomCard: React.FC<RoomCardProps> = ({
  room,
  hotel,
  onClick,
  cleaningInfo,
  housekeepers,
  onAssignHousekeeper,
  onUnassignHousekeeper,
  onCheckIn,
  onCancelCheckIn,
  isUpdated = false
}) => {
  const order = room.current_order;
  const isReserved = order && order.status === 'Confirmed';
  const isCheckedIn = order && order.status === 'CheckedIn';

  return (
    <div
      onClick={() => onClick(room)}
      className={`bg-white border-2 rounded-xl hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full ${isReserved ? 'border-blue-200' : 'border-slate-200'} ${isUpdated ? 'animate-pulse ring-2 ring-yellow-400 ring-opacity-75' : ''}`}
      style={isUpdated ? { animation: 'realtimeUpdate 1.5s ease-out' } : undefined}
    >
      {/* Header */}
      <div className={`p-3 border-b flex justify-between items-center ${isReserved ? 'bg-blue-50/30' : 'bg-slate-50'}`}>
        <h3 className="text-xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">{room.number}</h3>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[room.status]}`}>
            {STATUS_LABELS[room.status]?.split(' ')[0] || 'Unknown'}
          </span>
          {isReserved && (
            <span className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black animate-pulse">
              今日預約
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        {order ? (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-800 flex items-center">
                <span className="mr-1">👤</span> {order.guestName}
              </span>
              <div className="flex items-center text-slate-400">
                <SourceIcon source={order.source} />
                <span className="italic scale-90 origin-right">{order.source}</span>
              </div>
            </div>

            <div className="text-slate-500 flex items-center gap-1">
              <span>📅</span>
              <span className="scale-90 origin-left truncate font-bold">
                {order.checkIn?.split(' ')[0]?.slice(5) || '??-??'} - {order.checkOut?.split(' ')[0]?.slice(5) || '??-??'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 mt-1 border-t border-slate-50">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{room.type}</span>
              {(() => {
                const balanceDue = (order.totalPrice || 0) - (order.paidAmount || 0) - (order.discount || 0);
                return (
                  <span className={balanceDue > 0 ? "text-rose-600 font-black text-xs" : "text-emerald-500 font-bold text-xs"}>
                    {balanceDue > 0 ? `$${balanceDue.toLocaleString()}` : '已結清'}
                  </span>
                );
              })()}
            </div>

            {/* 延滯費用顯示 - 超時1-5小時按小時收費，超過6小時算一天房租 */}
            {order.status === 'CheckedIn' && (() => {
              // 直接使用訂單的退房時間 (支援休息訂單的動態退房時間)
              // 格式: "YYYY-MM-DD HH:mm" 或 "YYYY-MM-DDTHH:mm"
              const checkOutStr = order.checkOut?.replace(' ', 'T');
              const checkOutDateTime = new Date(checkOutStr);

              // 當前時間
              const now = new Date();

              // 計算超時小時數 (以訂單上設定的退房時間為準)
              const diffMs = now.getTime() - checkOutDateTime.getTime();
              const overdueHours = Math.floor(diffMs / (1000 * 60 * 60));

              // 延滯費率門檻 (預設 6 小時)
              const thresholdHours = hotel?.lateFeeThresholdHours || 6;

              // 如果沒有超時，不顯示
              if (overdueHours <= 0) return null;

              // 延滯費率計算 - 優先使用設定的每小時費率
              const hourlyRate = room.lateFeePerHour || Math.ceil((room.lateFeePerDay || room.basePrice || 0) / thresholdHours);
              const dailyRate = room.lateFeePerDay || room.basePrice || 0;

              // 新邏輯：超時1-5小時按小時收費累積，滿6小時改算一天房租
              let totalLateFee = 0;
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
                totalLateFee = (overdueDays * dailyRate) + (billableHours * hourlyRate);
              } else {
                // 未超過門檻，按小時累積計費
                billableHours = overdueHours;
                totalLateFee = billableHours * hourlyRate;
              }

              // 計算總應收與未結餘額
              const totalAmountDue = (order.totalPrice || 0) + totalLateFee;
              const paidAmount = order.paidAmount || 0;
              const discount = order.discount || 0;
              const balanceDue = totalAmountDue - paidAmount - discount;

              // 如果已經繳清（含延滯費），顯示綠色提示
              if (balanceDue <= 0) {
                return (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-700 font-black text-[10px] uppercase">
                        ✅ 超時 {overdueHours} 小時
                      </span>
                      <span className="text-emerald-600 font-bold text-[10px]">
                        ${totalLateFee.toLocaleString()} 已繳清
                      </span>
                    </div>
                  </div>
                );
              }

              // 顯示未繳清的延滯費
              return (
                <div className="mt-2 p-2 bg-rose-100 border border-rose-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-rose-700 font-black text-[10px] uppercase">
                      ⚠️ 超時 {overdueHours} 小時
                    </span>
                    <span className="text-rose-600 font-bold text-[10px]">
                      {overdueDays > 0 ? `${overdueDays}天` : ''}{billableHours > 0 ? `${billableHours}hr` : ''}
                    </span>
                  </div>
                  <div className="text-rose-700 font-black text-sm mt-1">
                    💰 延滯費: ${totalLateFee.toLocaleString()}
                  </div>
                  <div className="text-rose-600 font-bold text-[10px] mt-0.5">
                    待收總計: ${balanceDue.toLocaleString()}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-200">
            <span className="text-2xl mb-1 opacity-20">🛏️</span>
            <p className="text-[10px] font-black uppercase tracking-widest italic">空房 (VACANT)</p>
          </div>
        )}

        {/* Cleaning Status Display with Controls */}
        {/* Hide completed cleaning tasks when room is re-occupied (OC/SO) */}
        {cleaningInfo && !(
          (room.status === RoomStatus.OC || room.status === RoomStatus.SO) &&
          (cleaningInfo.status === 'Completed' || cleaningInfo.status === 'Inspected')
        ) && (
            <div className="pt-2 border-t border-slate-100">
              <CleaningStatusBadge
                cleaningInfo={cleaningInfo}
                housekeepers={housekeepers}
                onAssign={onAssignHousekeeper}
                onUnassign={onUnassignHousekeeper}
              />
            </div>
          )}

        {/* 房間註記顯示 */}
        {room.latest_note && new Date(room.latest_note.createdAt).toDateString() === new Date().toDateString() && (
          <div className="pt-2 border-t border-slate-100">
            <div className="bg-yellow-100 p-2 rounded-lg border border-yellow-300 shadow-sm">
              <p className="text-xs text-slate-900 font-bold leading-snug break-words">
                {room.latest_note.content}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-1 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-400 text-center font-bold tracking-wider opacity-0 group-hover:opacity-100 transition-opacity uppercase">
        點擊查看詳情 (Details)
      </div>

      {/* 即時更新動畫樣式 */}
      <style>{`
        @keyframes realtimeUpdate {
          0% { background-color: #fef08a; transform: scale(1.02); }
          50% { background-color: #fefce8; }
          100% { background-color: white; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default RoomCard;
