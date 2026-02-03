
import React, { useState } from 'react';
import { Hotel } from '../../types';
import { supabase } from '../../config/supabase';
import Modal from '../common/Modal';

interface HotelManagementProps {
  hotels: Hotel[];
  setHotels: (h: Hotel[]) => void;
}

const HotelManagement: React.FC<HotelManagementProps> = ({ hotels, setHotels }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleFormSubmit = async (data: Partial<Hotel>) => {
    try {
      if (editingHotel) {
        const { error } = await supabase.from('hotels').update({
          name: data.name,
          code: data.code,
          address: data.address,
          phone: data.phone,
          checkout_time: data.checkoutTime,
          checkin_time: data.checkinTime,
          late_fee_threshold_hours: data.lateFeeThresholdHours,
          is_active: data.isActive ?? true
        }).eq('id', editingHotel.id);
        if (error) throw error;
        setHotels(hotels.map(h => h.id === editingHotel.id ? { ...h, ...data as Hotel } : h));
      } else {
        const newId = `h-${Date.now()}`;
        const { error } = await supabase.from('hotels').insert({
          id: newId,
          name: data.name || '',
          code: data.code || '',
          address: data.address || '',
          phone: data.phone || '',
          checkout_time: data.checkoutTime || '11:00',
          checkin_time: data.checkinTime || '15:00',
          late_fee_threshold_hours: data.lateFeeThresholdHours || 6,
          is_active: data.isActive ?? true
        });
        if (error) throw error;
        const newHotel: Hotel = {
          id: newId,
          name: data.name || '',
          code: data.code || '',
          address: data.address || '',
          phone: data.phone || '',
          checkoutTime: data.checkoutTime || '11:00',
          checkinTime: data.checkinTime || '15:00',
          lateFeeThresholdHours: data.lateFeeThresholdHours || 6,
          isActive: data.isActive ?? true
        };
        setHotels([...hotels, newHotel]);
      }
      setIsModalOpen(false);
    } catch (e: any) {
      alert(`操作失敗: ${e.message}`);
    }
  };

  const handleToggleActive = async (hotel: Hotel) => {
    const newStatus = !(hotel.isActive ?? true);
    try {
      const { error } = await supabase.from('hotels').update({ is_active: newStatus }).eq('id', hotel.id);
      if (error) throw error;
      setHotels(hotels.map(h => h.id === hotel.id ? { ...h, isActive: newStatus } : h));
    } catch (e: any) {
      alert(`更新狀態失敗: ${e.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (hotels.length <= 1) {
      alert("系統必須至少保留一個館別。");
      return;
    }
    if (confirm(`確定要刪除「${name}」嗎？該館所有房間與訂單將失去歸屬。`)) {
      try {
        const { error } = await supabase.from('hotels').delete().eq('id', id);
        if (error) throw error;
        setHotels(hotels.filter(h => h.id !== id));
      } catch (e: any) {
        alert(`刪除失敗: ${e.message}`);
      }
    }
  };

  const filteredHotels = hotels.filter(h => {
    const isActive = h.isActive ?? true;
    if (statusFilter === 'active') return isActive;
    if (statusFilter === 'inactive') return !isActive;
    return true;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">集團館別主檔</h1>
          <p className="text-slate-500 text-sm">管理連鎖體系中各分館的代碼、通訊電話及地址。</p>
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
            onClick={() => { setEditingHotel(null); setIsModalOpen(true); }}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95"
          >
            + 拓展新館別
          </button>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">代碼</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[150px]">館別名稱</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">地址</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px]">電話</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[150px]">時間設定</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">狀態</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredHotels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                    無符合條件的館別資料
                  </td>
                </tr>
              ) : filteredHotels.map(h => {
                const isActive = h.isActive ?? true;
                return (
                  <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest ${isActive ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {h.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm break-words whitespace-normal leading-snug max-w-[200px]">
                        {h.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500 break-words whitespace-normal leading-relaxed max-w-[250px]">
                        {h.address}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-mono text-slate-600 whitespace-nowrap">
                        {h.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="w-8 text-right font-bold text-slate-400">IN</span>
                          <span className="font-mono bg-emerald-50 text-emerald-600 px-1 rounded">{h.checkinTime || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="w-8 text-right font-bold text-slate-400">OUT</span>
                          <span className="font-mono bg-rose-50 text-rose-500 px-1 rounded">{h.checkoutTime || 'N/A'}</span>
                        </div>
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
                          onClick={() => { setEditingHotel(h); setIsModalOpen(true); }}
                          className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleToggleActive(h)}
                          className={`px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-sm ${isActive
                              ? 'text-orange-500 hover:text-orange-600 hover:border-orange-200'
                              : 'text-emerald-500 hover:text-emerald-600 hover:border-emerald-200'
                            }`}
                        >
                          {isActive ? '停用' : '啟用'}
                        </button>
                        <button
                          onClick={() => handleDelete(h.id, h.name)}
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingHotel ? "編輯館別資訊" : "拓展新館別"}>
        <HotelForm hotel={editingHotel} onSubmit={handleFormSubmit} />
      </Modal>
    </div>
  );
};

const HotelForm = ({ hotel, onSubmit }: { hotel: Hotel | null, onSubmit: (d: any) => void }) => {
  const [formData, setFormData] = useState({
    name: hotel?.name || '',
    code: hotel?.code || '',
    address: hotel?.address || '',
    phone: hotel?.phone || '',
    checkoutTime: hotel?.checkoutTime || '11:00',
    checkinTime: hotel?.checkinTime || '15:00',
    lateFeeThresholdHours: hotel?.lateFeeThresholdHours || 6,
  });

  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSubmit(formData); }}>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">飯店名稱</label>
        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="例如：Vibe 台北信義館" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">館別代碼 (用於訂單前綴)</label>
        <input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono uppercase" placeholder="如：TPE-01" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">通訊電話</label>
        <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="02-XXXX-XXXX" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">物理地址</label>
        <textarea required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" rows={2} placeholder="請輸入詳細地址" />
      </div>

      {/* 時間參數設定 */}
      <div className="pt-4 border-t border-slate-200">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">⏰ 時間參數設定</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">退房時間</label>
            <input
              type="time"
              value={formData.checkoutTime}
              onChange={e => setFormData({ ...formData, checkoutTime: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">入住時間</label>
            <input
              type="time"
              value={formData.checkinTime}
              onChange={e => setFormData({ ...formData, checkinTime: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">延滯門檻(小時)</label>
            <input
              type="number"
              min="0"
              max="24"
              value={formData.lateFeeThresholdHours}
              onChange={e => setFormData({ ...formData, lateFeeThresholdHours: parseInt(e.target.value) || 6 })}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono"
            />
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">超過門檻小時數後，以一天延滯費用計算</p>
      </div>

      <button className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl mt-4 active:scale-95 transition-all">確認儲存館別設定</button>
    </form>
  );
};

export default HotelManagement;
