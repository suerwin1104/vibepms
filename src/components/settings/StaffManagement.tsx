import React, { useState, useMemo, useCallback } from 'react';
import { Staff, StaffRole, Hotel, Department, SystemRole } from '../../types';
import { supabase } from '../../config/supabase';
import Modal from '../common/Modal';
import Pagination from '../common/Pagination';
import SortableHeader, { SortConfig, sortData } from '../common/SortableHeader';

interface StaffManagementProps {
  staff: Staff[];
  setStaff: (s: Staff[]) => void;
  currentUser: Staff;
  hotels: Hotel[];
  departments: Department[];
  systemRoles: SystemRole[];
}

const StaffManagement: React.FC<StaffManagementProps> = ({ staff, setStaff, currentUser, hotels, departments, systemRoles }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Sort handler
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev?.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return null;
      return { key, direction: 'asc' };
    });
  }, []);

  // Custom field value getter for sorting
  const getFieldValue = useCallback((item: Staff, key: string) => {
    switch (key) {
      case 'name': return item.name;
      case 'hotelName': return hotels.find(h => h.id === item.hotelId)?.name || '';
      case 'authorizedCount': return item.authorizedHotels.length;
      case 'role': return item.role;
      default: return (item as any)[key];
    }
  }, [hotels]);

  // Apply sorting then pagination
  const sortedStaff = useMemo(() => sortData(staff, sortConfig, getFieldValue), [staff, sortConfig, getFieldValue]);
  const totalPages = Math.ceil(sortedStaff.length / ITEMS_PER_PAGE);
  const displayedStaff = sortedStaff.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFormSubmit = async (data: any) => {
    setIsProcessing(true);
    try {
      const dbPayload = {
        name: data.name,
        title: data.title,
        role: data.role,
        hotel_id: data.hotelId,
        authorized_hotels: data.authorizedHotels,
        email: data.email,
        line_id: data.lineId,
        telegram_id: data.telegramId,
        wechat_id: data.wechatId,
        department_id: data.departmentId || null,
        supervisor_id: data.supervisorId || null,
        delegate_id: data.delegateId || null
      };

      if (editingStaff) {
        const { error } = await supabase
          .from('staff')
          .update(dbPayload)
          .eq('id', editingStaff.id);

        if (error) throw error;
        setStaff(staff.map(s => s.id === editingStaff.id ? { ...s, ...data } : s));
      } else {
        const newId = `s-${Date.now()}`;
        const newStaff = {
          id: newId,
          employee_id: `FD${Math.floor(100 + Math.random() * 900)}`,
          ...dbPayload
        };

        const { error } = await supabase.from('staff').insert(newStaff);
        if (error) throw error;

        setStaff([...staff, {
          id: newId,
          employeeId: newStaff.employee_id,
          ...data
        }]);
      }
      setIsModalOpen(false);
    } catch (e: any) {
      console.error("Staff Save Error:", e);
      alert(`存檔失敗: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser.id) {
      alert("無法刪除當前登入的帳號。");
      return;
    }
    if (!confirm(`確定要取消「${name}」的所有系統授權嗎？\n\n注意：如果該員工有相關的單據或記錄，可能無法刪除。`)) return;

    try {
      const { error, status } = await supabase.from('staff').delete().eq('id', id);

      console.log('Delete response:', { error, status, id });

      // Check for any error
      if (error) {
        console.error('Supabase delete error:', error);

        // Check for foreign key constraint error (code 23503 or HTTP 409)
        if (error.code === '23503' ||
          error.message?.toLowerCase().includes('foreign key') ||
          error.message?.toLowerCase().includes('violates') ||
          error.message?.toLowerCase().includes('referenced') ||
          error.message?.toLowerCase().includes('conflict')) {
          alert(`無法刪除「${name}」：\n\n此員工有相關的單據或記錄（如：採購單、簽核記錄等）。\n\n建議：請先處理相關記錄，或考慮停用此帳號而非刪除。`);
        } else {
          alert(`刪除失敗：${error.message || JSON.stringify(error)}`);
        }
        return;
      }

      // Success
      setStaff(staff.filter(s => s.id !== id));
      alert(`已成功撤銷「${name}」的系統授權。`);
    } catch (e: any) {
      console.error("Delete Error (catch):", e);
      // Check if it's a network or HTTP error
      if (e.message?.includes('409') || e.message?.includes('Conflict')) {
        alert(`無法刪除「${name}」：\n\n此員工有相關的單據或記錄。`);
      } else {
        alert(`刪除失敗: ${e.message || '未知錯誤'}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">員工基本資料中心</h1>
          <p className="text-slate-500 text-sm">管理全連鎖分店的員工帳號與基本資料。</p>
        </div>
        <button
          onClick={() => {
            setEditingStaff(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
        >
          <span>+</span>
          新增員工
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <SortableHeader label="員工資訊" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="主要所屬飯店" sortKey="hotelName" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="授權館別" sortKey="authorizedCount" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="系統角色" sortKey="role" currentSort={sortConfig} onSort={handleSort} />
              <th className="px-6 py-5 text-right">管理操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {displayedStaff.map(s => {
              const hotel = hotels.find(h => h.id === s.hotelId);
              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-800">{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{s.employeeId} • {s.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-600">
                      {s.role === 'GroupAdmin' ? '🌍 集團總部' : hotel?.name || '未指派'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {s.authorizedHotels.length === 0 ? (
                        <span className="text-slate-400 text-xs">無授權</span>
                      ) : (
                        s.authorizedHotels.map(hId => {
                          const h = hotels.find(hotel => hotel.id === hId);
                          return h ? (
                            <span key={hId} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                              {h.name}
                            </span>
                          ) : null;
                        })
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase ${s.role === 'GroupAdmin' ? 'text-amber-600' : 'text-slate-400'}`}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => { setEditingStaff(s); setIsModalOpen(true); }} className="text-blue-500 font-black text-xs hover:underline uppercase">編輯</button>
                    {currentUser.role === 'GroupAdmin' && (
                      <button onClick={() => handleDelete(s.id, s.name)} className="text-rose-500 font-black text-xs hover:underline uppercase">刪除</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="p-4">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStaff ? "修改員工資料" : "新增員工"}>
        <StaffForm
          staff={editingStaff}
          hotels={hotels}
          isProcessing={isProcessing}
          onSubmit={handleFormSubmit}
          departments={departments}
          allStaff={staff}
          systemRoles={systemRoles}
        />
      </Modal>
    </div>
  );
};

const StaffForm = ({ staff, hotels, isProcessing, onSubmit, departments, allStaff, systemRoles }: { staff: Staff | null, hotels: Hotel[], isProcessing: boolean, onSubmit: (data: any) => void, departments: Department[], allStaff: Staff[], systemRoles: SystemRole[] }) => {
  const [formData, setFormData] = useState({
    name: staff?.name || '',
    title: staff?.title || '',
    role: staff?.role || 'FrontDesk' as StaffRole,
    hotelId: staff?.hotelId || hotels[0]?.id || '',
    authorizedHotels: staff?.authorizedHotels || [],
    email: staff?.email || '',
    lineId: staff?.lineId || '',
    telegramId: staff?.telegramId || '',
    wechatId: staff?.wechatId || '',
    departmentId: staff?.departmentId || '',
    supervisorId: staff?.supervisorId || '',
    delegateId: staff?.delegateId || ''
  });

  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSubmit(formData); }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">部門</label>
          <select value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold">
            <option value="">選擇部門...</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">直屬主管</label>
          <select value={formData.supervisorId} onChange={e => setFormData({ ...formData, supervisorId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold">
            <option value="">選擇主管 (選填)...</option>
            {allStaff.filter(s => s.id !== staff?.id).map(s => <option key={s.id} value={s.id}>{s.name} ({s.title})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">代理人 (會簽用)</label>
          <select value={formData.delegateId} onChange={e => setFormData({ ...formData, delegateId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold">
            <option value="">選擇代理人 (選填)...</option>
            <option value={staff?.id || ''}>自己</option>
            {allStaff.filter(s => s.id !== staff?.id).map(s => <option key={s.id} value={s.id}>{s.name} ({s.title})</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">姓名</label>
          <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-black" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">職稱</label>
          <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Email (通知用)</label>
          <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="user@example.com" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">LINE ID</label>
          <input value={formData.lineId} onChange={e => setFormData({ ...formData, lineId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Telegram ID</label>
          <input value={formData.telegramId} onChange={e => setFormData({ ...formData, telegramId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">WeChat ID</label>
          <input value={formData.wechatId} onChange={e => setFormData({ ...formData, wechatId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="Optional" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">系統角色</label>
        <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as StaffRole })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold">
          {systemRoles.length > 0 ? (
            systemRoles.sort((a, b) => a.level - b.level).map(role => (
              <option key={role.id} value={role.code}>
                {role.name} ({role.code})
              </option>
            ))
          ) : (
            <>
              <option value="FrontDesk">櫃檯人員 (FrontDesk)</option>
              <option value="HotelAdmin">分店經理 (HotelAdmin)</option>
              <option value="GroupAdmin">集團總管 (GroupAdmin)</option>
            </>
          )}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">主要所屬飯店</label>
        <select
          value={formData.hotelId}
          onChange={e => setFormData({ ...formData, hotelId: e.target.value })}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold"
        >
          <option value="">選擇主要飯店...</option>
          {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <p className="text-[10px] text-slate-400 mt-1 pl-1">
          提示：若要設定更多授權飯店或館別權限，請前往「員工權限管控中心」。
        </p>
      </div>

      <button
        disabled={isProcessing}
        className={`w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl mt-4 active:scale-95 transition-all flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50' : ''}`}
      >
        {isProcessing && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
        {staff ? '更新員工資料' : '建立員工帳號'}
      </button>
    </form>
  );
};

export default StaffManagement;
