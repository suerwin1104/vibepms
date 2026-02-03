
import React, { useRef, useEffect } from 'react';
import { TabType, Staff } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  currentUser: Staff;
  isOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, isOpen = true }) => {
  const isGroupAdmin = currentUser.role === 'GroupAdmin';
  const isHotelAdmin = currentUser.role === 'HotelAdmin';

  // Ref to preserve scroll position
  const navRef = useRef<HTMLElement>(null);
  const scrollPosRef = useRef<number>(0);

  // Save scroll position before re-render
  useEffect(() => {
    const nav = navRef.current;
    if (nav) {
      // Restore scroll position after re-render
      nav.scrollTop = scrollPosRef.current;
    }
  }, [activeTab]);

  const handleTabClick = (value: TabType) => {
    // Save current scroll position before changing tab
    if (navRef.current) {
      scrollPosRef.current = navRef.current.scrollTop;
    }
    setActiveTab(value);
  };

  // Refactored Menu Structure
  const categories = [
    {
      title: '櫃檯作業 (Operations)',
      items: [
        { label: '房態看板', value: 'Dashboard', icon: '📊' },
        { label: '單據查詢', value: 'DocumentSearch', icon: '🔍' },
        { label: '每日入住', value: 'DailyArrivals', icon: '🧳' },
        { label: '訂單管理', value: 'Reservations', icon: '📅' },
        { label: '交班管理', value: 'Handover', icon: '📝' },
        { label: '房務清掃', value: 'Housekeeping', icon: '🧹' },
      ]
    },
    {
      title: '營運管理 (Management)',
      items: [
        { label: '財務會計', value: 'Accounting', icon: '💰' },
        { label: '發票字軌', value: 'InvoiceSequence', icon: '🧾', hidden: !(isGroupAdmin || isHotelAdmin) },
        { label: '客戶大數據', value: 'Guests', icon: '👥' },
        { label: '人員與授權', value: 'Staff', icon: '👮', hidden: !isGroupAdmin },
      ]
    },
    {
      title: '系統設定 (System)',
      items: [
        { label: '集團連鎖店', value: 'HotelManagement', icon: '🏢', hidden: !isGroupAdmin },
        { label: '館別大樓', value: 'BuildingManagement', icon: '🏗️', hidden: !(isGroupAdmin || isHotelAdmin) },
        { label: '客房主檔', value: 'RoomSettings', icon: '⚙️' },
        { label: '角色管理', value: 'RoleManagement', icon: '🔐', hidden: !isGroupAdmin },
        { label: '部門管理', value: 'DepartmentManagement', icon: '🏢', hidden: !isGroupAdmin },
        { label: '稽核日誌', value: 'ActivityLog', icon: '📜' },
        { label: '資料庫管理', value: 'DatabaseManagement', icon: '☁️', hidden: !isGroupAdmin },
        { label: '單據類別', value: 'DocumentTypes', icon: '📄', hidden: !(isGroupAdmin || isHotelAdmin) },
      ]
    },
    {
      title: '進銷存 (Inventory)',
      items: [
        { label: '庫存管理', value: 'Inventory', icon: '📦' },
        { label: '採購管理', value: 'Procurement', icon: '🛒' },
        { label: '進出貨', value: 'GoodsManagement', icon: '📥' },
        { label: '調撥管理', value: 'StockTransfer', icon: '🔄' },
        { label: '零用金', value: 'PettyCash', icon: '💰' },
        { label: '流程簽核', value: 'Workflow', icon: '✅' },
      ]
    },
    {
      title: 'AI 任務中心 (Mission Control)',
      items: [
        { label: '任務儀表板', value: 'MissionControl', icon: '🚀' },
      ]
    }
  ];

  // State for collapsible sections (default all true)
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({
    '櫃檯作業 (Operations)': true,
    '營運管理 (Management)': true,
    '系統設定 (System)': true,
    '進銷存 (Inventory)': true,
    '進銷存 (Inventory)': true,
    'AI 任務中心 (Mission Control)': true
  });

  const toggleCategory = (title: string) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      className={`
        bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shadow-xl z-20 
        transition-all duration-300 ease-in-out h-full
        ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}
        hidden lg:flex
      `}
    >
      <nav ref={navRef} className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        <div className="px-2 mb-6">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="bg-blue-600 rounded-lg p-1">⚡</span>
            HotelMS
          </h2>
        </div>

        {categories.map((category) => {
          // Filter hidden items first
          const visibleItems = category.items.filter((i: any) => !i.hidden);
          if (visibleItems.length === 0) return null;

          return (
            <div key={category.title} className="space-y-2">
              <button
                onClick={() => toggleCategory(category.title)}
                className="w-full flex items-center justify-between px-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] hover:text-slate-300 transition-colors group"
              >
                {category.title}
                <span className={`transform transition-transform ${expanded[category.title] ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {expanded[category.title] && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {visibleItems.map((item: any) => (
                    <button
                      key={item.value}
                      onClick={() => handleTabClick(item.value as TabType)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${activeTab === item.value
                        ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/20 backdrop-blur-sm'
                        : 'hover:bg-slate-800/80 hover:text-white text-slate-400'
                        }`}
                    >
                      <span className="text-lg opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                      <span className="font-bold text-sm tracking-wide">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-6 bg-slate-900/50 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-blue-500 border border-blue-500/30">
            {currentUser.name[0]}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
