import React, { useState, useMemo } from 'react';
import { Guest, Reservation, VIPLevel, Hotel, Building, Transaction, Staff, Country } from '../../types';
import { MOCK_TRANSACTIONS } from '../../constants';
import { supabase } from '../../config/supabase';
import Modal from '../common/Modal';
import Pagination from '../common/Pagination';

interface GuestManagementProps {
  guests: Guest[];
  setGuests: (g: Guest[]) => void;
  reservations: Reservation[];
  hotels: Hotel[];
  buildings: Building[];
  currentHotel: Hotel;
  currentUser: Staff;
  countries: Country[];
}

const GuestManagement: React.FC<GuestManagementProps> = ({ guests, setGuests, reservations, hotels, buildings, currentHotel, currentUser, countries }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [viewHistoryGuest, setViewHistoryGuest] = useState<Guest | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Reservation | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const filtered = useMemo(() => {
    return guests.filter(g =>
      g.name.includes(searchTerm) ||
      g.phone.includes(searchTerm) ||
      g.idNumber.includes(searchTerm)
    );
  }, [guests, searchTerm]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const displayedGuests = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFormSubmit = async (data: Partial<Guest>) => {
    const logEntry = {
      timestamp: new Date().toLocaleString(),
      hotelName: currentHotel.name,
      staffName: currentUser.name,
      action: editingGuest ? '修改賓客資料' : '建立新賓客檔案'
    };

    try {
      if (editingGuest) {
        // Update existing guest in database
        const { error } = await supabase.from('guests').update({
          name: data.name,
          id_number: data.idNumber,
          phone: data.phone,
          vip_level: data.vipLevel,
          preferences: data.preferences,
          nationality: data.nationality,
          is_blacklisted: data.isBlacklisted,
          blacklist_reason: data.blacklistReason,
          company_name: data.companyName,
          tax_id: data.taxId,
          vehicle_info: data.vehicleInfo,
          // Photo fields
          id_card_front: data.idCardFront || null,
          id_card_back: data.idCardBack || null,
          health_insurance_card: data.healthInsuranceCard || null,
          passport_or_permit: data.passportOrPermit || null,
          modification_logs: [logEntry, ...(editingGuest.modificationLogs || [])]
        }).eq('id', editingGuest.id);

        if (error) throw error;

        setGuests(guests.map(g => g.id === editingGuest.id ? {
          ...g,
          ...data,
          modificationLogs: [logEntry, ...(g.modificationLogs || [])]
        } : g));
      } else {
        // Create new guest
        const newGuestId = `g-${Date.now()}`;
        const { error } = await supabase.from('guests').insert({
          id: newGuestId,
          name: data.name,
          id_number: data.idNumber,
          phone: data.phone,
          vip_level: data.vipLevel || 'Normal',
          preferences: data.preferences,
          nationality: data.nationality || 'Taiwan',
          is_blacklisted: data.isBlacklisted || false,
          blacklist_reason: data.blacklistReason,
          company_name: data.companyName,
          tax_id: data.taxId,
          vehicle_info: data.vehicleInfo,
          // Photo fields
          id_card_front: data.idCardFront || null,
          id_card_back: data.idCardBack || null,
          health_insurance_card: data.healthInsuranceCard || null,
          passport_or_permit: data.passportOrPermit || null,
          modification_logs: [logEntry]
        });

        if (error) throw error;

        const newG: Guest = {
          id: newGuestId,
          name: data.name || '',
          idNumber: data.idNumber || '',
          phone: data.phone || '',
          gender: data.gender || 'Male',
          vipLevel: data.vipLevel || 'Normal',
          isBlacklisted: data.isBlacklisted || false,
          nationality: data.nationality || 'Taiwan',
          preferences: data.preferences || '',
          modificationLogs: [logEntry],
          ...data as any
        };
        setGuests([...guests, newG]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving guest:', error);
      alert('儲存失敗，請稍後再試');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">集團賓客中心 (Group CRM)</h1>
          <p className="text-slate-500 text-sm italic">此處顯示之賓客資料為全集團共享，修改後所有分店將同步更新。</p>
        </div>
        <button
          onClick={() => { setEditingGuest(null); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95"
        >
          + 建立全域賓客主檔
        </button>
      </header>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="搜尋姓名、手機、證件號碼檢索全集團資料庫..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} // Reset to page 1 on search
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all"
          />
          <span className="absolute left-3 top-3.5 opacity-40">🔍</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <th className="px-6 py-5">賓客身份 / 等級</th>
              <th className="px-6 py-5">識別編碼 (證件)</th>
              <th className="px-6 py-5">全域喜好備註</th>
              <th className="px-6 py-5">跨店狀態</th>
              <th className="px-6 py-5 text-right">管理</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {displayedGuests.map(guest => (
              <tr key={guest.id} className={`hover:bg-slate-50 transition-colors ${guest.isBlacklisted ? 'bg-rose-50/50' : ''}`}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${guest.isBlacklisted ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>
                      {guest.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800">{guest.name}</span>
                        <VIPBadge level={guest.vipLevel} />
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{guest.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 font-mono text-xs font-bold text-slate-500">{guest.idNumber}</td>
                <td className="px-6 py-5">
                  <p className="text-xs text-slate-500 line-clamp-1 italic max-w-xs">
                    {guest.preferences || '無特殊偏好備註'}
                  </p>
                </td>
                <td className="px-6 py-5">
                  {guest.isBlacklisted ? (
                    <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase animate-pulse">🚩 集團黑名單</span>
                  ) : (
                    <span className="text-slate-400 text-[9px] font-black uppercase">✅ 信用良好</span>
                  )}
                </td>
                <td className="px-6 py-5 text-right space-x-3">
                  <button onClick={() => setViewHistoryGuest(guest)} className="text-blue-600 font-black text-[10px] uppercase hover:underline">歷史軌跡</button>
                  <button onClick={() => { setEditingGuest(guest); setIsModalOpen(true); }} className="text-slate-400 font-black text-[10px] uppercase hover:underline">資料維護</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* 修改/新增 Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGuest ? "賓客主檔維護 (Group-Level)" : "建立新賓客主檔"}>
        <GuestForm
          guest={editingGuest}
          hotelCode={currentHotel.code}
          onSubmit={handleFormSubmit}
          countries={countries}
        />
      </Modal>

      {/* 住房歷史軌跡 Modal (全域檢索) */}
      <Modal isOpen={!!viewHistoryGuest} onClose={() => setViewHistoryGuest(null)} title={viewHistoryGuest ? `全集團活動軌跡：${viewHistoryGuest.name}` : ""}>
        {viewHistoryGuest && (
          <div className="space-y-6">
            <GuestHistoryTable
              guest={viewHistoryGuest}
              reservations={reservations}
              hotels={hotels}
              buildings={buildings}
              onViewDetail={(res) => setSelectedOrderDetails(res)}
            />
            {/* Audit Logs for Guest Object */}
            <div className="mt-8 pt-8 border-t border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">主檔修改稽核紀錄 (CRM Audit)</h4>
              <div className="space-y-3 max-h-[150px] overflow-y-auto">
                {(viewHistoryGuest.modificationLogs || []).map((log, i) => (
                  <div key={i} className="flex justify-between text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-bold">{log.timestamp}</span>
                    <span className="font-black text-blue-600 uppercase">[{log.hotelName}] {log.staffName}: {log.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 訂單詳情彈窗 */}
      {selectedOrderDetails && (
        <Modal isOpen={true} onClose={() => setSelectedOrderDetails(null)} title="住房訂單明細稽核">
          <OrderNestedDetail
            reservation={selectedOrderDetails}
            hotel={hotels.find(h => h.id === selectedOrderDetails.hotelId)!}
            building={buildings.find(b => b.id === selectedOrderDetails.buildingId)!}
            transactions={MOCK_TRANSACTIONS.filter(tx => tx.reservationId === selectedOrderDetails.id)}
          />
        </Modal>
      )}
    </div>
  );
};

const VIPBadge = ({ level }: { level: VIPLevel }) => {
  const styles = {
    Normal: 'bg-slate-100 text-slate-400 border-slate-200',
    Silver: 'bg-zinc-100 text-zinc-500 border-zinc-300',
    Gold: 'bg-amber-50 text-amber-600 border-amber-200',
    Diamond: 'bg-blue-50 text-blue-600 border-blue-200',
  };
  return <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border uppercase ${styles[level]}`}>{level}</span>;
};

const GuestHistoryTable = ({ guest, reservations, hotels, buildings, onViewDetail }: { guest: Guest, reservations: Reservation[], hotels: Hotel[], buildings: Building[], onViewDetail: (res: Reservation) => void }) => {
  const history = reservations.filter(r => r.idNumber === guest.idNumber);

  return (
    <div className="space-y-4">
      {guest.isBlacklisted && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-4 text-rose-700">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest">集團警告紀錄</p>
            <p className="text-sm font-bold">原因：{guest.blacklistReason || '未註明具體原因'}</p>
          </div>
        </div>
      )}

      <div className="bg-slate-900 p-6 rounded-3xl text-white flex justify-between items-center shadow-xl">
        <div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">集團累計住次</p>
          <p className="text-4xl font-black">{history.length} <span className="text-sm text-slate-500">STAYS</span></p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-black uppercase mb-1">目前 VIP 級別</p>
          <VIPBadge level={guest.vipLevel} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">入住日期</th>
              <th className="px-4 py-3">飯店分店</th>
              <th className="px-4 py-3">房號</th>
              <th className="px-4 py-3 text-right">動作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {history.map(res => {
              const hotel = hotels.find(h => h.id === res.hotelId);
              const building = buildings.find(b => b.id === res.buildingId);
              return (
                <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-600">{res.checkIn}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-white text-[8px] px-1 rounded font-black">{hotel?.code}</span>
                      <span className="font-black text-slate-800">{hotel?.name}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold">{building?.name}</div>
                  </td>
                  <td className="px-4 py-4 font-black text-slate-900">#{res.roomNumber}</td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => onViewDetail(res)} className="text-blue-500 font-black text-[10px] uppercase hover:underline">查看詳情</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {history.length === 0 && <div className="py-20 text-center text-slate-400 italic font-bold">此賓客目前在集團內無任何歷史紀錄。</div>}
      </div>
    </div>
  );
};

const OrderNestedDetail = ({ reservation, hotel, building, transactions }: { reservation: Reservation, hotel: Hotel, building: Building, transactions: Transaction[] }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">受理分店</span>
            <h4 className="text-lg font-black text-slate-800">{hotel?.name}</h4>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">受理人</span>
            <p className="text-xs font-black text-blue-600">{reservation.lastEditedBy || 'SYSTEM'}</p>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-[10px] font-black text-slate-500 uppercase">
          <div>館別：{building?.name}</div>
          <div>房號：#{reservation.roomNumber}</div>
        </div>
      </div>

      <div className="bg-white p-4 border border-slate-200 rounded-2xl flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">交易總額</p>
          <p className="text-xl font-black text-slate-900">${reservation.totalPrice.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">狀態</p>
          <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">{reservation.status}</span>
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
        <p className="text-[10px] font-black text-amber-700 uppercase mb-2">當時住房備註</p>
        <p className="text-xs font-medium text-amber-900 italic">"{reservation.note || '此筆訂單無特殊備註。'}"</p>
      </div>
    </div>
  );
};

// Photo Upload Field Component
const PhotoUploadField = ({ label, value, onChange, placeholder }: {
  label: string;
  value: string | undefined;
  onChange: (base64: string | undefined) => void;
  placeholder?: string;
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('圖片大小不得超過 10MB');
      return;
    }

    // Convert to Base64
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt={label}
            className="w-full h-32 object-cover rounded-xl border border-slate-200 bg-slate-50"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all rounded-xl flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="bg-white text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-slate-100"
            >
              更換
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-rose-600"
            >
              刪除
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
        >
          <span className="text-2xl mb-1">📷</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">{placeholder || '點擊上傳照片'}</span>
          <span className="text-[8px] text-slate-300 mt-1">最大 10MB</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

const GuestForm = ({ guest, hotelCode, onSubmit, countries }: { guest: Guest | null, hotelCode: string, onSubmit: (data: any) => void, countries: Country[] }) => {
  const [formData, setFormData] = useState({
    name: guest?.name || '',
    idNumber: guest?.idNumber || '',
    phone: guest?.phone || '',
    vipLevel: guest?.vipLevel || 'Normal',
    preferences: guest?.preferences || '',
    nationality: guest?.nationality || 'Taiwan',
    isBlacklisted: guest?.isBlacklisted || false,
    blacklistReason: guest?.blacklistReason || '',
    // Legacy Fields
    companyName: guest?.companyName || '',
    taxId: guest?.taxId || '',
    vehicleInfo: guest?.vehicleInfo || '',
    // Photo Fields
    idCardFront: guest?.idCardFront,
    idCardBack: guest?.idCardBack,
    healthInsuranceCard: guest?.healthInsuranceCard,
    passportOrPermit: guest?.passportOrPermit
  });

  const appendHotelTag = () => {
    const tag = `[${hotelCode}] `;
    if (!formData.preferences.includes(tag)) {
      setFormData({ ...formData, preferences: tag + formData.preferences });
    }
  };

  return (
    <form className="space-y-4 max-h-[70vh] overflow-y-auto pr-2" onSubmit={e => { e.preventDefault(); onSubmit(formData); }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">身份證/護照號碼 (全域唯一碼)</label>
          <input required value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono focus:ring-4 focus:ring-blue-100 transition-all outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">賓客姓名</label>
          <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-black focus:ring-4 focus:ring-blue-100 transition-all outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">公司/抬頭 (Company/Title)</label>
          <input value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">統一編號 (Tax ID)</label>
          <input value={formData.taxId} onChange={e => setFormData({ ...formData, taxId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">國籍 (Nationality)</label>
          <select
            value={formData.nationality}
            onChange={e => setFormData({ ...formData, nationality: e.target.value })}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
          >
            {countries.map(c => (
              <option key={c.code} value={c.name_zh}>{c.name_zh} ({c.name_en})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">車輛資訊 (Vehicle Info)</label>
          <input value={formData.vehicleInfo} onChange={e => setFormData({ ...formData, vehicleInfo: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none" placeholder="車型/車號" />
        </div>
      </div>

      {/* 身分證件照片區塊 */}
      <div className="pt-4 border-t border-slate-100">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span>📄</span> 身分證件照片 (Identity Documents)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <PhotoUploadField
            label="身分證正面 (ID Front)"
            value={formData.idCardFront}
            onChange={(v) => setFormData({ ...formData, idCardFront: v })}
            placeholder="上傳身分證正面"
          />
          <PhotoUploadField
            label="身分證反面 (ID Back)"
            value={formData.idCardBack}
            onChange={(v) => setFormData({ ...formData, idCardBack: v })}
            placeholder="上傳身分證反面"
          />
          <PhotoUploadField
            label="健保卡 (Health Card)"
            value={formData.healthInsuranceCard}
            onChange={(v) => setFormData({ ...formData, healthInsuranceCard: v })}
            placeholder="上傳健保卡"
          />
          <PhotoUploadField
            label="護照/居留證 (Passport/Permit)"
            value={formData.passportOrPermit}
            onChange={(v) => setFormData({ ...formData, passportOrPermit: v })}
            placeholder="外國人適用"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">跨店共用備註 (服務喜好紀錄)</label>
          <button type="button" onClick={appendHotelTag} className="text-[9px] font-black text-blue-600 uppercase hover:underline">加入本分店標記</button>
        </div>
        <textarea
          value={formData.preferences}
          onChange={e => setFormData({ ...formData, preferences: e.target.value })}
          rows={3}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm italic bg-slate-50 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
          placeholder="例如：[TPE] 對花粉過敏、[TC] 需要高樓層房型"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">VIP 等級</label>
          <select value={formData.vipLevel} onChange={e => setFormData({ ...formData, vipLevel: e.target.value as any })} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold">
            <option value="Normal">Normal</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
            <option value="Diamond">Diamond</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">手機號碼</label>
          <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" checked={formData.isBlacklisted} onChange={e => setFormData({ ...formData, isBlacklisted: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
          <span className="text-sm font-black text-rose-600 uppercase group-hover:underline">列入集團黑名單 (Global Blacklist)</span>
        </label>
        {formData.isBlacklisted && (
          <div className="mt-3 animate-in slide-in-from-top-2">
            <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">黑名單原因描述</label>
            <textarea required value={formData.blacklistReason} onChange={e => setFormData({ ...formData, blacklistReason: e.target.value })} className="w-full border border-rose-200 bg-rose-50/30 rounded-xl p-3 text-sm text-rose-900" rows={2} placeholder="請描述原因，此訊息將在所有分店顯示..." />
          </div>
        )}
      </div>

      <button className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl mt-4 active:scale-95 transition-all">儲存至集團中心資料庫</button>
    </form>
  );
};

export default GuestManagement;
