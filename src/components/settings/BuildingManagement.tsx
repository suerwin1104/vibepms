
import React, { useState } from 'react';
import { Building } from '../../types';
import { supabase } from '../../config/supabase';
import Modal from '../common/Modal';

interface BuildingManagementProps {
  buildings: Building[];
  setBuildings: (b: Building[]) => void;
  selectedHotelId: string;
  currentHotelName: string;
}

const BuildingManagement: React.FC<BuildingManagementProps> = ({ buildings, setBuildings, selectedHotelId, currentHotelName }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const hotelBuildings = buildings.filter(b => b.hotelId === selectedHotelId);

  const filteredBuildings = hotelBuildings.filter(b => {
    const isActive = b.isActive ?? true;
    if (statusFilter === 'active') return isActive;
    if (statusFilter === 'inactive') return !isActive;
    return true;
  });

  const handleFormSubmit = async (data: Partial<Building>) => {
    try {
      if (editingBuilding) {
        const { error } = await supabase.from('buildings').update({
          name: data.name,
          code: data.code,
          is_active: data.isActive ?? true
        }).eq('id', editingBuilding.id);
        if (error) throw error;
        setBuildings(buildings.map(b => b.id === editingBuilding.id ? { ...b, ...data as Building } : b));
      } else {
        const newId = `b-${Date.now()}`;
        const { error } = await supabase.from('buildings').insert({
          id: newId,
          hotel_id: selectedHotelId,
          name: data.name || '',
          code: data.code || '',
          is_active: data.isActive ?? true
        });
        if (error) throw error;
        const newBuilding: Building = {
          id: newId,
          hotelId: selectedHotelId,
          name: data.name || '',
          code: data.code || '',
          isActive: data.isActive ?? true
        };
        setBuildings([...buildings, newBuilding]);
      }
      setIsModalOpen(false);
    } catch (e: any) {
      alert(`操作失敗: ${e.message}`);
    }
  };

  const handleToggleActive = async (building: Building) => {
    const newStatus = !(building.isActive ?? true);
    try {
      const { error } = await supabase.from('buildings').update({ is_active: newStatus }).eq('id', building.id);
      if (error) throw error;
      setBuildings(buildings.map(b => b.id === building.id ? { ...b, isActive: newStatus } : b));
    } catch (e: any) {
      alert(`更新狀態失敗: ${e.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`確定要刪除「${name}」嗎？該大樓下的房間將失去關聯。`)) {
      try {
        const { error } = await supabase.from('buildings').delete().eq('id', id);
        if (error) throw error;
        setBuildings(buildings.filter(b => b.id !== id));
      } catch (e: any) {
        alert(`刪除失敗: ${e.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">館別大樓管理</h1>
          <p className="text-slate-500 text-sm">設定 <span className="text-blue-600 font-bold">{currentHotelName}</span> 內的建築物分類 (如：A棟、豪華館)。</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            {(['all', 'active', 'inactive'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === status
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {status === 'all' ? '全部' : status === 'active' ? '已啟用' : '已停用'}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setEditingBuilding(null); setIsModalOpen(true); }}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95"
          >
            + 新增館別大樓
          </button>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">代碼</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">大樓名稱</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">所屬飯店</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">狀態</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBuildings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                    此飯店目前尚未設定大樓
                  </td>
                </tr>
              ) : filteredBuildings.map(b => {
                const isActive = b.isActive ?? true;
                return (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest ${isActive ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {b.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm break-words whitespace-normal leading-snug max-w-[300px]">
                        {b.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-500 break-words whitespace-normal">
                        {currentHotelName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded text-[10px] font-black uppercase ${isActive
                          ? 'bg-green-50 text-green-600'
                          : 'bg-slate-100 text-slate-400'
                        }`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => { setEditingBuilding(b); setIsModalOpen(true); }}
                          className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleToggleActive(b)}
                          className={`px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-sm ${isActive
                              ? 'text-orange-500 hover:text-orange-600 hover:border-orange-200'
                              : 'text-emerald-500 hover:text-emerald-600 hover:border-emerald-200'
                            }`}
                        >
                          {isActive ? '停用' : '啟用'}
                        </button>
                        <button
                          onClick={() => handleDelete(b.id, b.name)}
                          className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                          title="刪除"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBuilding ? "編輯大樓資訊" : "新增大樓資訊"}>
        <BuildingForm building={editingBuilding} onSubmit={handleFormSubmit} />
      </Modal>
    </div>
  );
};

const BuildingForm = ({ building, onSubmit }: { building: Building | null, onSubmit: (d: any) => void }) => {
  const [formData, setFormData] = useState({
    name: building?.name || '',
    code: building?.code || '',
  });

  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSubmit(formData); }}>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">大樓名稱</label>
        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="例如：A棟 - 景觀樓" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">大樓簡碼 (Room ID 前綴參考)</label>
        <input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono uppercase" placeholder="如：A" />
      </div>
      <button className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl mt-4 active:scale-95 transition-all">確認儲存</button>
    </form>
  );
};

export default BuildingManagement;
