import React, { useState, useMemo } from 'react';
import { Staff, FeaturePermission } from '../../types';
import { supabase } from '../../config/supabase';

interface Props {
    staff: Staff[];
    setStaff: (s: Staff[]) => void;
    hotels: { id: string; name: string }[];
    buildings: { id: string; name: string; hotelId: string }[];
    currentUser: Staff;
}

// 功能權限定義（對應 Sidebar 選單）
const FEATURE_PERMISSIONS: FeaturePermission[] = [
    // 櫃檯作業
    { code: 'Dashboard', name: '房態看板', category: '櫃檯作業', icon: '📊', sortOrder: 1 },
    { code: 'DocumentSearch', name: '單據查詢', category: '櫃檯作業', icon: '🔍', sortOrder: 2 },
    { code: 'DailyArrivals', name: '每日入住', category: '櫃檯作業', icon: '🧳', sortOrder: 3 },
    { code: 'Reservations', name: '訂單管理', category: '櫃檯作業', icon: '📅', sortOrder: 4 },
    { code: 'Handover', name: '交班管理', category: '櫃檯作業', icon: '📝', sortOrder: 5 },
    { code: 'Housekeeping', name: '房務清掃', category: '櫃檯作業', icon: '🧹', sortOrder: 6 },
    // 營運管理
    { code: 'Accounting', name: '財務會計', category: '營運管理', icon: '💰', sortOrder: 10 },
    { code: 'InvoiceSequence', name: '發票字軌', category: '營運管理', icon: '🧾', sortOrder: 11 },
    { code: 'Guests', name: '客戶大數據', category: '營運管理', icon: '👥', sortOrder: 12 },
    { code: 'Staff', name: '人員與授權', category: '營運管理', icon: '👮', sortOrder: 13 },
    // 系統設定
    { code: 'HotelManagement', name: '集團連鎖店', category: '系統設定', icon: '🏢', sortOrder: 20 },
    { code: 'BuildingManagement', name: '館別大樓', category: '系統設定', icon: '🏗️', sortOrder: 21 },
    { code: 'RoomSettings', name: '客房主檔', category: '系統設定', icon: '⚙️', sortOrder: 22 },
    { code: 'RoleManagement', name: '角色管理', category: '系統設定', icon: '🔐', sortOrder: 23 },
    { code: 'DepartmentManagement', name: '部門管理', category: '系統設定', icon: '🏢', sortOrder: 24 },
    { code: 'PermissionManagement', name: '權限管理', category: '系統設定', icon: '🔑', sortOrder: 25 },
    { code: 'ActivityLog', name: '稽核日誌', category: '系統設定', icon: '📜', sortOrder: 26 },
    { code: 'DatabaseManagement', name: '資料庫管理', category: '系統設定', icon: '☁️', sortOrder: 27 },
    { code: 'DocumentTypes', name: '單據類別', category: '系統設定', icon: '📄', sortOrder: 28 },
    // 進銷存
    { code: 'Inventory', name: '庫存管理', category: '進銷存', icon: '📦', sortOrder: 30 },
    { code: 'Procurement', name: '採購管理', category: '進銷存', icon: '🛒', sortOrder: 31 },
    { code: 'GoodsManagement', name: '進出貨', category: '進銷存', icon: '📥', sortOrder: 32 },
    { code: 'StockTransfer', name: '調撥管理', category: '進銷存', icon: '🔄', sortOrder: 33 },
    { code: 'PettyCash', name: '零用金', category: '進銷存', icon: '💰', sortOrder: 34 },
    { code: 'Workflow', name: '流程簽核', category: '進銷存', icon: '✅', sortOrder: 35 },
];

const CATEGORIES = ['櫃檯作業', '營運管理', '系統設定', '進銷存'];

const PermissionManagement: React.FC<Props> = ({ staff, setStaff, hotels, buildings, currentUser }) => {
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
    const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // 篩選員工
    const filteredStaff = useMemo(() => {
        if (!searchTerm) return staff;
        return staff.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [staff, searchTerm]);

    // 切換員工選擇
    const toggleStaff = (id: string) => {
        setSelectedStaffIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // 全選/取消全選員工
    const toggleAllStaff = () => {
        if (selectedStaffIds.length === filteredStaff.length) {
            setSelectedStaffIds([]);
        } else {
            setSelectedStaffIds(filteredStaff.map(s => s.id));
        }
    };

    // 切換飯店
    const toggleHotel = (id: string) => {
        setSelectedHotels(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // 切換館別
    const toggleBuilding = (id: string) => {
        setSelectedBuildings(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // 切換功能
    const toggleFeature = (code: string) => {
        setSelectedFeatures(prev =>
            prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]
        );
    };

    // 選擇整個分類
    const toggleCategory = (category: string) => {
        const categoryCodes = FEATURE_PERMISSIONS.filter(f => f.category === category).map(f => f.code);
        const allSelected = categoryCodes.every(code => selectedFeatures.includes(code));

        if (allSelected) {
            setSelectedFeatures(prev => prev.filter(x => !categoryCodes.includes(x)));
        } else {
            setSelectedFeatures(prev => [...new Set([...prev, ...categoryCodes])]);
        }
    };

    // 載入選中員工的權限
    const loadSelectedStaffPermissions = () => {
        if (selectedStaffIds.length === 1) {
            const staffMember = staff.find(s => s.id === selectedStaffIds[0]);
            if (staffMember) {
                setSelectedHotels(staffMember.authorizedHotels || []);
                setSelectedBuildings(staffMember.authorizedBuildings || []);
                setSelectedFeatures(staffMember.featurePermissions || []);
            }
        }
    };

    // 當選擇單個員工時自動載入權限
    React.useEffect(() => {
        if (selectedStaffIds.length === 1) {
            loadSelectedStaffPermissions();
        }
    }, [selectedStaffIds]);

    // 儲存權限
    const handleSave = async () => {
        if (selectedStaffIds.length === 0) {
            alert('請先選擇至少一位員工');
            return;
        }

        setIsSaving(true);
        try {
            // 批次更新所有選中的員工
            for (const staffId of selectedStaffIds) {
                const { error } = await supabase
                    .from('staff')
                    .update({
                        authorized_hotels: selectedHotels,
                        authorized_buildings: selectedBuildings,
                        feature_permissions: selectedFeatures
                    })
                    .eq('id', staffId);

                if (error) throw error;
            }

            // 更新本地狀態
            setStaff(staff.map(s =>
                selectedStaffIds.includes(s.id)
                    ? {
                        ...s,
                        authorizedHotels: selectedHotels,
                        authorizedBuildings: selectedBuildings,
                        featurePermissions: selectedFeatures
                    }
                    : s
            ));

            alert(`已成功更新 ${selectedStaffIds.length} 位員工的權限設定`);
        } catch (e: any) {
            alert(`儲存失敗: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // 篩選的館別（根據選中的飯店）
    const filteredBuildings = useMemo(() => {
        if (selectedHotels.length === 0) return []; // 未選擇飯店時不顯示任何館別
        return buildings
            .filter(b => selectedHotels.includes(b.hotelId))
            .sort((a, b) => {
                // 先依飯店排序，再依館別名稱排序
                if (a.hotelId !== b.hotelId) return a.hotelId.localeCompare(b.hotelId);
                return a.name.localeCompare(b.name);
            });
    }, [buildings, selectedHotels]);

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">🔑 員工權限管控中心</h1>
                    <p className="text-slate-500 text-sm">批次設定員工的飯店、館別、功能存取權限。</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving || selectedStaffIds.length === 0}
                    className={`px-6 py-3 rounded-2xl font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 ${selectedStaffIds.length > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            儲存中...
                        </>
                    ) : (
                        <>💾 儲存權限設定 ({selectedStaffIds.length}人)</>
                    )}
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左側：員工選擇 */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-black text-slate-800">👥 選擇員工</h2>
                        <button
                            onClick={toggleAllStaff}
                            className="text-[10px] font-bold text-blue-600 hover:underline uppercase"
                        >
                            {selectedStaffIds.length === filteredStaff.length ? '取消全選' : '全選'}
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder="搜尋員工姓名或工號..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2 text-sm mb-3"
                    />

                    <div className="max-h-[400px] overflow-y-auto space-y-1">
                        {filteredStaff.map(s => (
                            <label
                                key={s.id}
                                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${selectedStaffIds.includes(s.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedStaffIds.includes(s.id)}
                                    onChange={() => toggleStaff(s.id)}
                                    className="w-4 h-4 rounded text-blue-600"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 text-sm truncate">{s.name}</p>
                                    <p className="text-[10px] text-slate-400">{s.employeeId} • {s.title}</p>
                                </div>
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${s.role === 'GroupAdmin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {s.role}
                                </span>
                            </label>
                        ))}
                    </div>

                    {selectedStaffIds.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                已選擇 {selectedStaffIds.length} 位員工
                            </p>
                        </div>
                    )}
                </div>

                {/* 中間：飯店與館別 */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-full">
                    <h2 className="text-lg font-black text-slate-800 mb-4 flex-none">🏨 飯店與館別權限</h2>

                    <div className="flex-1 min-h-0 flex flex-col gap-4">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex-none">授權飯店</h3>
                            <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-1 min-h-[120px]">
                                {hotels.map(h => (
                                    <button
                                        key={h.id}
                                        onClick={() => toggleHotel(h.id)}
                                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-left flex items-center justify-between gap-2 transition-all group shrink-0 ${selectedHotels.includes(h.id)
                                            ? 'bg-blue-600 border-transparent text-white shadow-md shadow-blue-200'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="whitespace-normal leading-tight">{h.name}</span>
                                        {selectedHotels.includes(h.id) && (
                                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm flex-none">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 flex-none mx-2" />

                        <div className="flex-1 min-h-0 flex flex-col">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex-none">授權館別</h3>
                            <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-1 min-h-[120px]">
                                {filteredBuildings.map(b => {
                                    const hotelName = hotels.find(h => h.id === b.hotelId)?.name || '';
                                    return (
                                        <button
                                            key={b.id}
                                            onClick={() => toggleBuilding(b.id)}
                                            className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-left flex items-center justify-between gap-2 transition-all group shrink-0 ${selectedBuildings.includes(b.id)
                                                ? 'bg-emerald-600 border-transparent text-white shadow-md shadow-emerald-200'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex flex-col min-w-0">
                                                {selectedHotels.length > 1 && (
                                                    <span className={`text-[9px] mb-0.5 truncate ${selectedBuildings.includes(b.id) ? 'text-emerald-100' : 'text-slate-400'}`}>
                                                        {hotelName}
                                                    </span>
                                                )}
                                                <span className="whitespace-normal leading-tight">{b.name}</span>
                                            </div>
                                            {selectedBuildings.includes(b.id) && (
                                                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm flex-none">✓</span>
                                            )}
                                        </button>
                                    )
                                })}
                                {filteredBuildings.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50 text-slate-400">
                                        <span className="text-2xl mb-2">🏨</span>
                                        <span className="text-xs">請先選擇上方的飯店</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 右側：功能權限 */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h2 className="text-lg font-black text-slate-800 mb-4">📋 功能權限</h2>

                    <div className="max-h-[450px] overflow-y-auto space-y-4">
                        {CATEGORIES.map(category => {
                            const features = FEATURE_PERMISSIONS.filter(f => f.category === category);
                            const allSelected = features.every(f => selectedFeatures.includes(f.code));
                            const someSelected = features.some(f => selectedFeatures.includes(f.code));

                            return (
                                <div key={category} className="border border-slate-100 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleCategory(category)}
                                        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        <span className="text-xs font-black text-slate-600 uppercase">{category}</span>
                                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] ${allSelected
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : someSelected
                                                ? 'bg-blue-100 border-blue-300 text-blue-600'
                                                : 'border-slate-300'
                                            }`}>
                                            {allSelected ? '✓' : someSelected ? '−' : ''}
                                        </span>
                                    </button>
                                    <div className="p-2 space-y-1">
                                        {features.map(f => (
                                            <label
                                                key={f.code}
                                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${selectedFeatures.includes(f.code) ? 'bg-blue-50' : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFeatures.includes(f.code)}
                                                    onChange={() => toggleFeature(f.code)}
                                                    className="w-3.5 h-3.5 rounded text-blue-600"
                                                />
                                                <span className="text-sm">{f.icon}</span>
                                                <span className="text-xs font-bold text-slate-700">{f.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {selectedFeatures.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                已選擇 {selectedFeatures.length} 項功能
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 快速操作提示 */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-amber-700">
                    💡 提示：選擇多位員工後，設定的權限將同時套用到所有選中的員工。
                    若只選擇一位員工，會自動載入該員工目前的權限設定。
                </p>
            </div>
        </div>
    );
};

export default PermissionManagement;
