
import React, { useState, useMemo } from 'react';
import { Reservation } from '../../types';

interface ReservationTableProps {
  reservations: Reservation[];
}

const ReservationTable: React.FC<ReservationTableProps> = ({ reservations }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return reservations.filter(res => 
      res.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.roomNumber.includes(searchTerm)
    );
  }, [reservations, searchTerm]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input 
            type="text" 
            placeholder="搜尋姓名、訂單號或房號..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">共 {filtered.length} 筆資料</span>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">訂單編號</th>
              <th className="px-6 py-4">賓客姓名</th>
              <th className="px-6 py-4">房型 / 房號</th>
              <th className="px-6 py-4">入住時間</th>
              <th className="px-6 py-4">退房時間</th>
              <th className="px-6 py-4 text-center">狀態</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.map((res) => (
              <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-blue-600 font-bold">{res.id}</td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-800">{res.guestName}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-600 font-medium">{res.roomType}</div>
                  <div className="text-xs text-slate-400">{res.roomNumber === '-' ? '待排房' : `Room ${res.roomNumber}`}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">{res.checkIn}</td>
                <td className="px-6 py-4 text-slate-600">{res.checkOut}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <StatusBadge status={res.status} />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filtered.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            找不到符合的訂單
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    'Confirmed': 'bg-blue-50 text-blue-600 border-blue-100',
    'CheckedIn': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'CheckedOut': 'bg-slate-50 text-slate-500 border-slate-100',
    'Pending': 'bg-amber-50 text-amber-600 border-amber-100',
  };
  
  const labels: Record<string, string> = {
    'Confirmed': '已確認',
    'CheckedIn': '已入住',
    'CheckedOut': '已退房',
    'Pending': '待確認',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles[status] || styles['Pending']}`}>
      {labels[status] || status}
    </span>
  );
};

export default ReservationTable;
