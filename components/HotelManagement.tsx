
import React, { useState } from 'react';
import { Hotel } from '../types';
import { supabase } from '../supabase';
import Modal from './Modal';

interface HotelManagementProps {
  hotels: Hotel[];
  setHotels: (h: Hotel[]) => void;
}

const HotelManagement: React.FC<HotelManagementProps> = ({ hotels, setHotels }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);

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
          late_fee_threshold_hours: data.lateFeeThresholdHours
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
          late_fee_threshold_hours: data.lateFeeThresholdHours || 6
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
          lateFeeThresholdHours: data.lateFeeThresholdHours || 6
        };
        setHotels([...hotels, newHotel]);
      }
      setIsModalOpen(false);
    } catch (e: any) {
      alert(`操作失敗: ${e.message}`);
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

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">集團館別主檔</h1>
          <p className="text-slate-500 text-sm">管理連鎖體系中各分館的代碼、通訊電話及地址。</p>
        </div>
        <button
          onClick={() => { setEditingHotel(null); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95"
        >
          + 拓展新館別
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotels.map(h => (
          <div key={h.id} className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{h.code}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditingHotel(h); setIsModalOpen(true); }} className="text-slate-300 hover:text-blue-500 font-bold text-[10px] uppercase">編輯</button>
                <button onClick={() => handleDelete(h.id, h.name)} className="text-slate-300 hover:text-rose-500 font-bold text-[10px] uppercase">刪除</button>
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-1">{h.name}</h3>
            <p className="text-xs text-slate-500 font-medium mb-4">{h.address}</p>
            <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">📞 {h.phone}</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
            </div>
          </div>
        ))}
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
