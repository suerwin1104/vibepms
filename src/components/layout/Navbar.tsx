
import React from 'react';
import { Hotel, Staff } from '../../types';
import RealtimeIndicator from '../common/RealtimeIndicator';
import { RealtimeConnectionStatus } from '../../services/RealtimeService';

interface NavbarProps {
  hotels: Hotel[];
  selectedHotelId: string;
  setSelectedHotelId: (id: string) => void;
  currentUser: Staff;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  realtimeStatus?: RealtimeConnectionStatus;
  lastSyncTime?: Date | null;
  pendingApprovalCount?: number;
  onPendingApprovalClick?: () => void;
  onReconnect?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  hotels,
  selectedHotelId,
  setSelectedHotelId,
  currentUser,
  onLogout,
  onToggleSidebar,
  realtimeStatus = 'disconnected',
  lastSyncTime = null,
  pendingApprovalCount = 0,
  onPendingApprovalClick,
  onReconnect
}) => {
  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-6 shadow-sm">
      {/* ... (existing jsx) */}
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Toggle Sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">H</div>
          <div className="flex flex-col">
            <span className="text-slate-900 font-black tracking-tighter leading-none text-base">HotelGroup</span>
            <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">Group HQ</span>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2"></div>

        {/* 安全飯店切換器：僅顯示 authorizedHotels 且已啟用的館別 */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">授權分店:</span>
          {hotels.filter(h => h.isActive !== false).length > 0 ? (
            <select
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-white transition-colors"
            >
              {hotels.filter(h => h.isActive !== false).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          ) : (
            <span className="text-sm font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-xl border border-rose-100">無授權飯店</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* 待簽核徽章按鈕 */}
        {onPendingApprovalClick && (
          <button
            onClick={onPendingApprovalClick}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${pendingApprovalCount > 0
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            title={`待簽核文件: ${pendingApprovalCount} 件`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-bold">待簽核</span>
            {pendingApprovalCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full px-1 shadow-lg shadow-rose-500/30">
                {pendingApprovalCount > 99 ? '99+' : pendingApprovalCount}
              </span>
            )}
          </button>
        )}

        {/* 即時連線狀態指示器 */}
        <RealtimeIndicator status={realtimeStatus} lastSyncTime={lastSyncTime} onReconnect={onReconnect} />

        <div className="h-8 w-px bg-slate-200"></div>

        <div className="text-right">
          <p className="text-slate-900 font-black text-sm leading-none">{currentUser.name}</p>
          <p className="text-[11px] text-blue-600 font-bold uppercase mt-1">{currentUser.role}</p>
        </div>
        <button onClick={onLogout} className="text-slate-400 hover:text-rose-600 transition-colors p-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

