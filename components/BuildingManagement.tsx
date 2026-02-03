
import React, { useState } from 'react';
import { Building } from '../types';
import { supabase } from '../supabase';
import Modal from './Modal';

interface BuildingManagementProps {
  buildings: Building[];
  setBuildings: (b: Building[]) => void;
  selectedHotelId: string;
  currentHotelName: string;
}

const BuildingManagement: React.FC<BuildingManagementProps> = ({ buildings, setBuildings, selectedHotelId, currentHotelName }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);

  const hotelBuildings = buildings.filter(b => b.hotelId === selectedHotelId);

  const handleFormSubmit = async (data: Partial<Building>) => {
    try {
      if (editingBuilding) {
        const { error } = await supabase.from('buildings').update({
          name: data.name,
          code: data.code
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
        });
        if (error) throw error;
        const newBuilding: Building = {
          id: newId,
          hotelId: selectedHotelId,
          name: data.name || '',
          code: data.code || '',
        };
        setBuildings([...buildings, newBuilding]);
      }
      setIsModalOpen(false);
    } catch (e: any) {
      alert(`操作失敗: ${e.message}`);
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
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">館別大樓管理</h1>
          <p className="text-slate-500 text-sm">設定 <span className="text-blue-600 font-bold">{currentHotelName}</span> 內的建築物分類 (如：A棟、豪華館)。</p>
        </div>
        <button
          onClick={() => { setEditingBuilding(null); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95"
        >
          + 新增館別大樓
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotelBuildings.map(b => (
          <div key={b.id} className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button onClick={() => { setEditingBuilding(b); setIsModalOpen(true); }} className="text-blue-500 font-black text-[10px] uppercase">編輯</button>
              <button onClick={() => handleDelete(b.id, b.name)} className="text-rose-500 font-black text-[10px] uppercase">刪除</button>
            </div>
            <div className="mb-4">
              <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{b.code}</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-1">{b.name}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">所屬飯店：{currentHotelName}</p>
          </div>
        ))}
        {hotelBuildings.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px]">
            <p className="text-slate-400 font-bold italic">此飯店目前尚未設定館別大樓</p>
          </div>
        )}
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
