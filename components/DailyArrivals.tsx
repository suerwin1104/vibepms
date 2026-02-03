
import React from 'react';
import { Reservation, Room, RoomStatus } from '../types';

interface Props {
  reservations: Reservation[];
  rooms: Room[];
  onCheckIn: (id: string) => void;
}

const DailyArrivals: React.FC<Props> = ({ reservations, rooms, onCheckIn }) => {
  // 取得今日日期 (使用本地時區)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`; // YYYY-MM-DD (本地時區)

  // 篩選條件：今日入住 + 狀態為「已確認」
  const arrivals = reservations.filter(r => {
    if (r.status !== 'Confirmed') return false;
    // 解析 checkIn 日期 (支援 'YYYY-MM-DD' 或 'YYYY-MM-DD HH:mm' 格式)
    const checkInDate = r.checkIn?.split(' ')[0] || r.checkIn?.split('T')[0];
    return checkInDate === todayStr;
  }).sort((a, b) => {
    // 按房號排序
    const roomA = a.roomNumber || '';
    const roomB = b.roomNumber || '';
    return roomA.localeCompare(roomB, undefined, { numeric: true });
  });

  // 列印功能
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* 列印用樣式 */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            padding: 20px;
          }
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f0f0f0 !important; font-weight: bold; }
        }
        .print-header { display: none; }
      `}</style>

      <div className="print-area">
        {/* 列印用標題 */}
        <div className="print-header">
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>今日抵達名單</h1>
          <p style={{ fontSize: '12px', color: '#666' }}>
            列印日期：{new Date().toLocaleDateString('zh-TW')} {new Date().toLocaleTimeString('zh-TW')}
          </p>
        </div>

        <header className="flex justify-between items-center no-print">
          <div>
            <h2 className="text-xl font-black text-slate-800">今日抵達名單 (Arrivals)</h2>
            <p className="text-xs text-slate-500 font-medium">
              {todayStr} • 系統自動檢測分配房間是否已清潔 (VC)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-slate-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-slate-700 transition-colors no-print"
            >
              🖨️ 列印名單
            </button>
            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg">
              待處理: {arrivals.length} 筆
            </div>
          </div>
        </header>

        {arrivals.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] font-black uppercase text-slate-500">
                  <th className="px-4 py-3">房號</th>
                  <th className="px-4 py-3">賓客姓名</th>
                  <th className="px-4 py-3">電話</th>
                  <th className="px-4 py-3">房型</th>
                  <th className="px-4 py-3">入住時間</th>
                  <th className="px-4 py-3">來源</th>
                  <th className="px-4 py-3">房態</th>
                  <th className="px-4 py-3 no-print text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {arrivals.map(res => {
                  const assignedRoom = rooms.find(r => r.number === res.roomNumber);
                  const isReady = assignedRoom?.status === RoomStatus.VC;
                  const checkInTime = res.checkIn?.split(' ')[1] || '15:00';

                  return (
                    <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="bg-slate-900 text-white px-2 py-1 rounded-lg text-xs font-black">
                          #{res.roomNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {res.guestName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {res.phone || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          {res.roomType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {checkInTime}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {res.source || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${isReady
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}>
                          {assignedRoom?.status || 'N/A'} {isReady ? '✓' : '⏳'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center no-print">
                        <button
                          disabled={!isReady}
                          onClick={() => onCheckIn(res.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isReady
                            ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                        >
                          辦理入住
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="text-4xl mb-3 grayscale opacity-30">🧳</div>
            <p className="text-slate-400 font-bold text-sm">今日暫無待處理之抵達名單</p>
            <p className="text-slate-300 text-xs mt-1">所有賓客已妥善安置或尚未有今日入住預約</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyArrivals;
