import React, { useRef, useEffect } from 'react';
import { TabType, Staff, DocumentType } from '../../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  currentUser: Staff;
  isOpen?: boolean;
  documentTypes: DocumentType[];
  onSelectCustomForm?: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, isOpen = true, documentTypes, onSelectCustomForm }) => {
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

  const handleTabClick = (value: string) => {
    // Save current scroll position before changing tab
    if (navRef.current) {
      scrollPosRef.current = navRef.current.scrollTop;
    }

    if (value.startsWith('CF_')) {
      const formId = value.replace('CF_', '');
      onSelectCustomForm?.(formId);
      setActiveTab('CustomFormView');
    } else {
      setActiveTab(value as TabType);
    }
  };

  // 動態權限檢查
  const hasPermission = (featureCode: string): boolean => {
    // GroupAdmin 有所有權限
    if (isGroupAdmin) return true;

    // 如果有設定 featurePermissions，則使用嚴格檢查 (Whitelist 模式)
    if (currentUser.featurePermissions && currentUser.featurePermissions.length > 0) {
      return currentUser.featurePermissions.includes(featureCode);
    }

    // 向後相容：若沒有設定 featurePermissions，使用舊的角色邏輯 (Blacklist 模式)
    // 這些是需要特定權限的功能，其他預設開放
    const adminOnlyFeatures = ['HotelManagement', 'RoleManagement', 'DepartmentManagement', 'DatabaseManagement', 'Staff', 'PermissionManagement'];
    const managerFeatures = ['InvoiceSequence', 'BuildingManagement'];

    if (adminOnlyFeatures.includes(featureCode)) {
      return isGroupAdmin;
    }
    if (managerFeatures.includes(featureCode)) {
      return isGroupAdmin || isHotelAdmin;
    }

    return true; // 其他功能預設開放
  };

  // Refactored Menu Structure
  const categories = [
    {
      title: '櫃檯作業 (Operations)',
      items: [
        { label: '房態看板', value: 'Dashboard', icon: '📊', hidden: !hasPermission('Dashboard') },
        { label: '單據查詢', value: 'DocumentSearch', icon: '🔍', hidden: !hasPermission('DocumentSearch') },
        { label: '每日入住', value: 'DailyArrivals', icon: '🧳', hidden: !hasPermission('DailyArrivals') },
        { label: '訂單管理', value: 'Reservations', icon: '📅', hidden: !hasPermission('Reservations') },
        { label: '交班管理', value: 'Handover', icon: '📝', hidden: !hasPermission('Handover') },
        { label: '房務清掃', value: 'Housekeeping', icon: '🧹', hidden: !hasPermission('Housekeeping') },
      ]
    },
    {
      title: '營運管理 (Management)',
      items: [
        { label: '財務會計', value: 'Accounting', icon: '💰', hidden: !hasPermission('Accounting') },
        { label: '發票字軌', value: 'InvoiceSequence', icon: '🧾', hidden: !hasPermission('InvoiceSequence') },
        { label: '客戶大數據', value: 'Guests', icon: '👥', hidden: !hasPermission('Guests') },
        { label: '員工基本資料', value: 'Staff', icon: '👮', hidden: !hasPermission('Staff') },
      ]
    },
    {
      title: '系統設定 (System)',
      items: [
        { label: '集團連鎖店', value: 'HotelManagement', icon: '🏢', hidden: !hasPermission('HotelManagement') },
        { label: '館別大樓', value: 'BuildingManagement', icon: '🏗️', hidden: !hasPermission('BuildingManagement') },
        { label: '客房主檔', value: 'RoomSettings', icon: '⚙️', hidden: !hasPermission('RoomSettings') },
        { label: '角色管理', value: 'RoleManagement', icon: '🔐', hidden: !hasPermission('RoleManagement') },
        { label: '部門管理', value: 'DepartmentManagement', icon: '🏢', hidden: !hasPermission('DepartmentManagement') },
        { label: '員工權限管控', value: 'PermissionManagement', icon: '🔑', hidden: !hasPermission('PermissionManagement') },
        { label: '稽核日誌', value: 'ActivityLog', icon: '📜', hidden: !hasPermission('ActivityLog') },
        { label: '資料庫管理', value: 'DatabaseManagement', icon: '☁️', hidden: !hasPermission('DatabaseManagement') },
      ]
    },
    {
      title: '進銷存 (Inventory)',
      items: [
        { label: '庫存管理', value: 'Inventory', icon: '📦', hidden: !hasPermission('Inventory') },
        { label: '採購管理', value: 'Procurement', icon: '🛒', hidden: !hasPermission('Procurement') },
        { label: '進出貨', value: 'GoodsManagement', icon: '📥', hidden: !hasPermission('GoodsManagement') },
        { label: '調撥管理', value: 'StockTransfer', icon: '🔄', hidden: !hasPermission('StockTransfer') },
        { label: '零用金', value: 'PettyCash', icon: '💰', hidden: !hasPermission('PettyCash') },
        { label: '流程簽核', value: 'Workflow', icon: '✅', hidden: !hasPermission('Workflow') },
      ]
    },
    {
      title: '自定義單據 (Custom Forms)',
      items: documentTypes
        .filter(dt => dt.category === 'CUSTOM_FORM' && dt.isActive && dt.customFormId)
        .map(dt => ({
          label: dt.name,
          value: `CF_${dt.customFormId}`,
          icon: '📄',
          hidden: false
        }))
    }
  ];

  // State for collapsible sections (default only Operations true)
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({
    '櫃檯作業 (Operations)': true,
    '營運管理 (Management)': false,
    '系統設定 (System)': false,
    '進銷存 (Inventory)': false,
    '自定義單據 (Custom Forms)': true
    // 'AI 任務中心 (Mission Control)': true
  });

  const toggleCategory = (title: string) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      className={`
        bg-white text-slate-600 flex flex-col border-r border-slate-200 shadow-sm z-20 
        transition-all duration-300 ease-in-out h-full
        ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}
        hidden lg:flex
      `}
    >
      <nav ref={navRef} className="flex-1 px-4 py-8 space-y-8 overflow-y-auto">

        {categories.map((category) => {
          // Filter hidden items first
          const visibleItems = category.items.filter((i: any) => !i.hidden);
          if (visibleItems.length === 0) return null;

          return (
            <div key={category.title} className="space-y-2">
              <button
                onClick={() => toggleCategory(category.title)}
                className="w-full flex items-center justify-between px-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] hover:text-slate-600 transition-colors group"
              >
                {category.title}
                <span className={`transform transition-transform text-[8px] ${expanded[category.title] ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {expanded[category.title] && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {visibleItems.map((item: any) => (
                    <button
                      key={item.value}
                      onClick={() => handleTabClick(item.value as TabType)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${activeTab === item.value
                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                        : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'
                        }`}
                    >
                      <span className="text-xl opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                      <span className="font-bold text-sm tracking-wide">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-6 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-blue-600 border border-slate-200 shadow-sm">
            {currentUser.name[0]}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
