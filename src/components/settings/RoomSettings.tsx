
import React, { useState } from 'react';
import { Room, RoomType, RoomStatus, Hotel, Building, RoomTypeDefinition } from '../../types';
import { supabase } from '../../config/supabase';
import Modal from '../common/Modal';

interface RoomSettingsProps {
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  selectedHotelId: string;
  hotels: Hotel[];
  buildings: Building[];
}

const RoomSettings: React.FC<RoomSettingsProps> = ({ rooms, setRooms, selectedHotelId, hotels, buildings }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTypeManageModalOpen, setIsTypeManageModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDefinition[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);

  // Fetch Room Types (Global/Shared)
  const fetchRoomTypes = React.useCallback(async () => {
    setIsLoadingTypes(true);
    try {
      // Remove .eq('hotel_id') to fetch ALL types (Shared across all hotels)
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .order('created_at', { ascending: true }); // Optional: consistent ordering

      if (error) {
        console.warn('Could not fetch room_types:', error.message);
      } else {
        const mappedData = data?.map((d: any) => ({
          id: d.id,
          hotelId: d.hotel_id,
          name: d.name,
          code: d.code,
          description: d.description,
          isActive: d.is_active,
          createdAt: d.created_at
        })) || [];
        setRoomTypes(mappedData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTypes(false);
    }
  }, []); // Remove dependency on selectedHotelId

  React.useEffect(() => {
    fetchRoomTypes();
  }, [fetchRoomTypes]);



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
        <div className="flex gap-2">
          <button
            onClick={() => setIsTypeManageModalOpen(true)}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-bold shadow-sm hover:bg-slate-50 transition-all"
          >
            ⚙️ 管理房型參數
          </button>
          <button
            onClick={() => { setSelectedRoom(null); setIsEditModalOpen(true); }}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all"
          >
            + 擴增新房間
          </button>
        </div>
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
              // Try to find the dynamic type name, fallback to raw string
              const typeName = roomTypes.find(t => t.code === room.type || t.name === room.type)?.name || room.type;

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
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">{typeName}</span>
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
          roomTypes={roomTypes}
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

      <Modal isOpen={isTypeManageModalOpen} onClose={() => setIsTypeManageModalOpen(false)} title="房型規格參數管理">
        <RoomTypeManager
          hotelId={selectedHotelId}
          roomTypes={roomTypes}
          onUpdate={fetchRoomTypes} // Refresh on change
        />
      </Modal>

    </div>
  );
};

const RoomEditForm = ({ room, hotelBuildings, roomTypes, onSubmit }: { room: Room | null, hotelBuildings: Building[], roomTypes: RoomTypeDefinition[], onSubmit: (data: any) => void }) => {
  // Helper to get valid type
  const getValidType = () => {
    if (!room?.type) return roomTypes[0]?.code || 'Single';
    const exists = roomTypes.some(rt => rt.code === room.type);
    return exists ? room.type : (roomTypes[0]?.code || 'Single');
  };

  const [formData, setFormData] = useState({
    buildingId: room?.buildingId || (hotelBuildings[0]?.id || ''),
    number: room?.number || '',
    floor: room?.floor || 1,
    type: getValidType(),
    basePrice: room?.basePrice || 2000,
    lateFeePerHour: room?.lateFeePerHour || 500,
    lateFeePerDay: room?.lateFeePerDay || 0,
    description: room?.description || '',
  });

  // Sync state with props when room changes
  React.useEffect(() => {
    // Re-calculate valid type inside effect to ensure it uses latest props
    const currentType = room?.type;
    const isValid = roomTypes.some(rt => rt.code === currentType);
    const resolvedType = isValid ? currentType! : (roomTypes[0]?.code || 'Single');

    setFormData({
      buildingId: room?.buildingId || (hotelBuildings[0]?.id || ''),
      number: room?.number || '',
      floor: room?.floor || 1,
      type: resolvedType,
      basePrice: room?.basePrice || 2000,
      lateFeePerHour: room?.lateFeePerHour || 500,
      lateFeePerDay: room?.lateFeePerDay || 0,
      description: room?.description || '',
    });
  }, [room, hotelBuildings, roomTypes]);

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
          {roomTypes.length > 0 ? (
            roomTypes.map(rt => (
              <option key={rt.id} value={rt.code}>{rt.name}</option>
            ))
          ) : (
            // Fallback hardcoded if no DB connection
            <>
              <option value="Single">單人房 (Single)</option>
              <option value="Double">雙人房 (Double)</option>
              <option value="Deluxe">豪華房 (Deluxe)</option>
              <option value="Suite">頂級套房 (Suite)</option>
            </>
          )}
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

// Sub-component for managing room types
const RoomTypeManager = ({ hotelId, roomTypes, onUpdate }: { hotelId: string, roomTypes: RoomTypeDefinition[], onUpdate: () => void }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', code: '' });

  // Add Form State
  const [addForm, setAddForm] = useState({ name: '', code: '' });

  // Handle Add New
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('room_types').insert({
        hotel_id: 'SHARED',
        name: addForm.name,
        code: addForm.code,
        is_active: true
      });
      if (error) throw error;
      setAddForm({ name: '', code: '' });
      onUpdate();
    } catch (e: any) {
      if (e.code === '42P01') {
        alert('請先建立 room_types 資料表');
      } else {
        alert(`新增失敗: ${e.message}`);
      }
    }
  };

  // Handle Edit Save
  const handleEditSave = async (id: string) => {
    try {
      const { error } = await supabase.from('room_types').update({
        name: editForm.name,
        code: editForm.code
      }).eq('id', id);
      if (error) throw error;

      setEditingId(null);
      setEditForm({ name: '', code: '' });
      onUpdate();
    } catch (e: any) {
      alert(`更新失敗: ${e.message}`);
    }
  };

  const startEditing = (rt: RoomTypeDefinition) => {
    setEditingId(rt.id);
    setEditForm({ name: rt.name, code: rt.code });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除此房型？')) return;
    try {
      const { error } = await supabase.from('room_types').delete().eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch (e: any) {
      alert(`刪除失敗: ${e.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Add New Form */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">新增房型</h4>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">房型名稱 (如: 豪華房 Deluxe)</label>
              <input required value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold placeholder:font-normal" placeholder="輸入房型名稱" />
            </div>
            <div className="w-full md:w-1/3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">房型代碼 (如: DLX)</label>
              <input required value={addForm.code} onChange={e => setAddForm({ ...addForm, code: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono uppercase bg-white" placeholder="代碼" />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="bg-slate-900 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-md hover:bg-slate-800 transition-all active:scale-95">
              + 新增房型
            </button>
          </div>
        </form>
      </div>

      {/* 2. Existing List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">現有房型列表 ({roomTypes.length})</h4>
        </div>

        <div className="space-y-3">
          {roomTypes.map(rt => {
            const isEditing = editingId === rt.id;

            return (
              <div key={rt.id} className={`bg-white border rounded-2xl transition-all ${isEditing ? 'border-blue-200 shadow-md ring-2 ring-blue-50' : 'border-slate-100 hover:border-slate-300'}`}>
                {/* Row Content */}
                <div className="p-4 flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{rt.code}</span>
                      <h5 className="font-bold text-slate-800 text-sm break-words whitespace-normal leading-relaxed">{rt.name}</h5>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!isEditing && (
                      <button onClick={() => startEditing(rt)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="編輯">
                        ✎
                      </button>
                    )}
                    <button onClick={() => handleDelete(rt.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="刪除">
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Inline Edit Form */}
                {isEditing && (
                  <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-slate-50 p-4 rounded-xl border border-blue-100 grid gap-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">編輯名稱</label>
                          <input
                            autoFocus
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full p-2 border border-blue-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">編輯代碼</label>
                          <input
                            value={editForm.code}
                            onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                            className="w-full p-2 border border-blue-200 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingId(null)} className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">取消</button>
                        <button onClick={() => handleEditSave(rt.id)} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">儲存變更</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {roomTypes.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-xs text-slate-400 font-medium">尚無任何房型，請從上方新增。</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 p-3 rounded-xl text-[10px] text-amber-600 flex items-start gap-2">
        <span>⚠️</span>
        <p>注意：若資料庫尚未建立 `room_types` 表格，此功能將無法運作。請聯絡管理員執行 Database Migration。</p>
      </div>
    </div>
  );
}

export default RoomSettings;


