
import React, { useState } from 'react';
import { Room, RoomType, RoomStatus, Hotel, Building } from '../types';
import { supabase } from '../supabase';
import Modal from './Modal';

interface RoomSettingsProps {
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  selectedHotelId: string;
  hotels: Hotel[];
  buildings: Building[];
}

const RoomSettings: React.FC<RoomSettingsProps> = ({ rooms, setRooms, selectedHotelId, hotels, buildings }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const hotelBuildings = buildings.filter(b => b.hotelId === selectedHotelId);

  // 排序邏輯：飯店 → 館別 → 樓層 → 房號
  const currentRooms = rooms
    .filter(r => r.hotelId === selectedHotelId)
    .sort((a, b) => {
      // 1. 按館別名稱排序
      const buildingA = buildings.find(bd => bd.id === a.buildingId);
      const buildingB = buildings.find(bd => bd.id === b.buildingId);
      const buildingNameA = buildingA?.name || '';
      const buildingNameB = buildingB?.name || '';
      if (buildingNameA !== buildingNameB) {
        return buildingNameA.localeCompare(buildingNameB, 'zh-TW');
      }
      // 2. 按樓層排序
      if (a.floor !== b.floor) {
        return a.floor - b.floor;
      }
      // 3. 按房號排序（自然排序，處理數字和字母混合）
      return a.number.localeCompare(b.number, 'zh-TW', { numeric: true });
    });

  const handleDelete = async (id: string) => {
    if (confirm("確定要刪除此房間嗎？此操作無法還原。")) {
      try {
        const { error } = await supabase.from('rooms').delete().eq('id', id);
        if (error) throw error;
        setRooms(rooms.filter(r => r.id !== id));
      } catch (e: any) {
        alert(`刪除失敗: ${e.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">客房主檔管理</h1>
          <p className="text-slate-500 text-sm">設定目前飯店內的建築大樓、房號與房價規則。</p>
        </div>
        <button
          onClick={() => { setSelectedRoom(null); setIsEditModalOpen(true); }}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all"
        >
          + 擴增新房間
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <th className="px-6 py-4">所屬館別</th>
              <th className="px-6 py-4">完整房號辨識</th>
              <th className="px-6 py-4">樓層</th>
              <th className="px-6 py-4">房型</th>
              <th className="px-6 py-4">基礎定價</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium">
            {currentRooms.map(room => {
              const hotel = hotels.find(h => h.id === room.hotelId);
              const building = buildings.find(b => b.id === room.buildingId);
              return (
                <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-black uppercase tracking-tighter border border-slate-200">
                      {building?.name || '未指派'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-300 font-mono text-[10px]">{hotel?.code}-{building?.code}-</span>
                      <span className="font-black text-slate-800">#{room.number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{room.floor}F</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">{room.type}</span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">${room.basePrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => { setSelectedRoom(room); setIsEditModalOpen(true); }} className="text-blue-500 hover:underline font-black text-xs uppercase">編輯</button>
                    <button onClick={() => handleDelete(room.id)} className="text-rose-500 hover:underline font-black text-xs uppercase">移除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {currentRooms.length === 0 && (
          <div className="py-20 text-center text-slate-400 italic">此飯店目前尚未建立任何客房資料</div>
        )}
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={selectedRoom ? "修改客房參數" : "擴增新客房"}>
        <RoomEditForm
          room={selectedRoom}
          hotelBuildings={hotelBuildings}
          onSubmit={async (data) => {
            try {
              if (selectedRoom) {
                const { error } = await supabase.from('rooms').update({
                  building_id: data.buildingId,
                  number: data.number,
                  floor: data.floor,
                  type: data.type,
                  base_price: data.basePrice,
                  late_fee_per_hour: data.lateFeePerHour,
                  late_fee_per_day: data.lateFeePerDay,
                  description: data.description
                }).eq('id', selectedRoom.id);
                if (error) throw error;
                setRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, ...data } : r));
              } else {
                const newId = `r-${Date.now()}`;
                const { error } = await supabase.from('rooms').insert({
                  id: newId,
                  hotel_id: selectedHotelId,
                  building_id: data.buildingId,
                  number: data.number,
                  floor: data.floor,
                  type: data.type,
                  base_price: data.basePrice,
                  late_fee_per_hour: data.lateFeePerHour,
                  late_fee_per_day: data.lateFeePerDay,
                  description: data.description,
                  status: RoomStatus.VC,
                  housekeeper: '未指派'
                });
                if (error) throw error;
                setRooms([...rooms, {
                  id: newId,
                  hotelId: selectedHotelId,
                  status: RoomStatus.VC,
                  housekeeper: '未指派',
                  ...data
                }]);
              }
              setIsEditModalOpen(false);
            } catch (e: any) {
              alert(`儲存失敗: ${e.message}`);
            }
          }}
        />
      </Modal>
    </div>
  );
};

const RoomEditForm = ({ room, hotelBuildings, onSubmit }: { room: Room | null, hotelBuildings: Building[], onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    buildingId: room?.buildingId || (hotelBuildings[0]?.id || ''),
    number: room?.number || '',
    floor: room?.floor || 1,
    type: room?.type || 'Single',
    basePrice: room?.basePrice || 2000,
    lateFeePerHour: room?.lateFeePerHour || 500,
    lateFeePerDay: room?.lateFeePerDay || 0,
    description: room?.description || '',
  });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">所屬館別大樓</label>
        <select
          required
          value={formData.buildingId}
          onChange={e => setFormData({ ...formData, buildingId: e.target.value })}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold bg-slate-50"
        >
          {hotelBuildings.map(b => (
            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
          ))}
          {hotelBuildings.length === 0 && <option value="">-- 請先建立館別大樓 --</option>}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">房號</label>
          <input required type="text" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-black" placeholder="如: 101" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">所在樓層</label>
          <input required type="number" value={formData.floor} onChange={e => setFormData({ ...formData, floor: parseInt(e.target.value) })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">房型規格</label>
        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as RoomType })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold">
          <option value="Single">單人房 (Single)</option>
          <option value="Double">雙人房 (Double)</option>
          <option value="Deluxe">豪華房 (Deluxe)</option>
          <option value="Suite">頂級套房 (Suite)</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">基礎定價</label>
          <input required type="number" value={formData.basePrice} onChange={e => setFormData({ ...formData, basePrice: parseInt(e.target.value) })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">每小時超時費</label>
          <input type="number" value={formData.lateFeePerHour} onChange={e => setFormData({ ...formData, lateFeePerHour: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono" placeholder="500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">每日延滯費</label>
          <input type="number" value={formData.lateFeePerDay} onChange={e => setFormData({ ...formData, lateFeePerDay: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono" placeholder="0=使用房價" />
        </div>
      </div>
      <p className="text-[10px] text-slate-400 -mt-2">超時 1-5 小時按小時費用累積，滿 6 小時改算一天延滯費（若未設定則使用房價）</p>
      <button
        disabled={hotelBuildings.length === 0}
        className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl mt-4 active:scale-95 transition-all disabled:opacity-50"
      >
        儲存客房設定
      </button>
    </form>
  );
};

export default RoomSettings;
