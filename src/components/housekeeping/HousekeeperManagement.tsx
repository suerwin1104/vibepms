
import React, { useState } from 'react';
import { Housekeeper, HousekeeperStatus, Room, RoomStatus } from '../../types';
import Modal from '../common/Modal';
import Pagination from '../common/Pagination';

interface HousekeeperManagementProps {
  hotelId: string;
  housekeepers: Housekeeper[];
  setHousekeepers: (h: Housekeeper[]) => void;
  rooms: Room[];
}

const HousekeeperManagement: React.FC<HousekeeperManagementProps> = ({ hotelId, housekeepers, setHousekeepers, rooms }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHousekeeper, setEditingHousekeeper] = useState<Housekeeper | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const totalPages = Math.ceil(housekeepers.length / ITEMS_PER_PAGE);
  const displayedHousekeepers = housekeepers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


  const handleDelete = (id: string, name: string) => {
    // 防錯檢查：如果該房務員目前負責 VD (空髒) 房間
    const isAssignedToVDRoom = rooms.some(r => r.housekeeper === name && r.status === RoomStatus.VD);

    if (isAssignedToVDRoom) {
      alert(`⚠️ 無法刪除：${name} 目前正負責待清掃房間。請先轉移任務後再行刪除。`);
      return;
    }

    if (confirm(`確定要刪除房務員 ${name} 嗎？此操作不可還原。`)) {
      setHousekeepers(housekeepers.filter(h => h.id !== id));
    }
  };

  const handleFormSubmit = (data: Partial<Housekeeper>) => {
    if (editingHousekeeper) {
      setHousekeepers(housekeepers.map(h => h.id === editingHousekeeper.id ? { ...h, ...data } : h));
    } else {
      // Fix: Included missing hotelId property from the props to satisfy Housekeeper type
      const newH: Housekeeper = {
        id: `h-${Date.now()}`,
        hotelId: hotelId,
        employeeId: data.employeeId || `HK${Math.floor(100 + Math.random() * 900)}`,
        name: data.name || '',
        phone: data.phone || '',
        status: data.status || 'Active',
        assignedFloor: data.assignedFloor || '',
        cleanedToday: 0
      };
      setHousekeepers([...housekeepers, newH]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">房務員管理</h1>
          <p className="text-slate-500 text-sm">管理房務人員編制、排班狀態及任務統計。</p>
        </div>
        <button
          onClick={() => { setEditingHousekeeper(null); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700"
        >
          + 新增房務員
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <th className="px-6 py-4">工號 / 姓名</th>
              <th className="px-6 py-4">聯絡電話</th>
              <th className="px-6 py-4">負責樓層</th>
              <th className="px-6 py-4">今日已清掃</th>
              <th className="px-6 py-4">狀態</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {displayedHousekeepers.map(hk => (
              <tr key={hk.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{hk.name}</div>
                  <div className="text-[10px] text-slate-400 font-bold">{hk.employeeId}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">{hk.phone}</td>
                <td className="px-6 py-4 text-slate-600 font-medium">{hk.assignedFloor}</td>
                <td className="px-6 py-4">
                  <span className="font-black text-blue-600">{hk.cleanedToday} </span>
                  <span className="text-[10px] text-slate-400 uppercase">Rooms</span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={hk.status} />
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => { setEditingHousekeeper(hk); setIsModalOpen(true); }}
                    className="text-blue-500 hover:underline font-bold text-xs"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(hk.id, hk.name)}
                    className="text-rose-500 hover:underline font-bold text-xs"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingHousekeeper ? `修改房務員：${editingHousekeeper.name}` : "新增房務人員"}
      >
        <HousekeeperForm
          housekeeper={editingHousekeeper}
          onSubmit={handleFormSubmit}
        />
      </Modal>
    </div>
  );
};

const StatusBadge = ({ status }: { status: HousekeeperStatus }) => {
  const styles = {
    Active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    OnLeave: 'bg-amber-50 text-amber-600 border-amber-100',
    Resigned: 'bg-rose-50 text-rose-600 border-rose-100',
  };
  const labels = {
    Active: '在勤中',
    OnLeave: '休假中',
    Resigned: '已離職',
  };
  return <span className={`px-2 py-1 rounded text-[10px] font-black border uppercase ${styles[status]}`}>{labels[status]}</span>;
};

const HousekeeperForm = ({ housekeeper, onSubmit }: { housekeeper: Housekeeper | null, onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    name: housekeeper?.name || '',
    phone: housekeeper?.phone || '',
    employeeId: housekeeper?.employeeId || '',
    status: housekeeper?.status || 'Active',
    assignedFloor: housekeeper?.assignedFloor || '',
  });

  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSubmit(formData); }}>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">人員姓名</label>
        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="輸入全名" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">員工編號 (ID)</label>
          <input value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="HK001" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">聯絡電話</label>
          <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="09XX-XXX-XXX" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">當前狀態</label>
          <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as HousekeeperStatus })} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm">
            <option value="Active">在勤 (Active)</option>
            <option value="OnLeave">休假 (On-Leave)</option>
            <option value="Resigned">離職 (Resigned)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">負責樓層</label>
          <input value={formData.assignedFloor} onChange={e => setFormData({ ...formData, assignedFloor: e.target.value })} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="如: 1F, 2F" />
        </div>
      </div>
      <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-900/10">
        儲存人員資料
      </button>
    </form>
  );
};

export default HousekeeperManagement;
