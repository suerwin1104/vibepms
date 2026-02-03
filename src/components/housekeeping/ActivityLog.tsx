
import React, { useState } from 'react';
import { AuditLogEntry } from '../../types';
import Pagination from '../common/Pagination';

interface ActivityLogProps {
  logs: AuditLogEntry[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
  const displayedLogs = logs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">系統操作稽核日誌</h1>
        <p className="text-slate-500 text-sm">詳細紀錄每一筆涉及數據異動的操作人員與時間，不可修改。</p>
      </header>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200"></div>

        <div className="space-y-8">
          {displayedLogs.map(log => (
            <div key={log.id} className="relative flex gap-10 items-start pl-14 animate-in slide-in-from-left duration-500">
              {/* Timeline Dot */}
              <div className="absolute left-[21px] top-1.5 w-2.5 h-2.5 bg-blue-600 rounded-full border-4 border-slate-50 shadow-sm z-10"></div>

              <div className="flex-shrink-0 w-32 pt-0.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{log.timestamp?.split(' ')[0] || '-'}</p>
                <p className="text-xs font-bold text-slate-800">{log.timestamp?.split(' ')[1] || '-'}</p>
              </div>

              <div className="flex-1 bg-white border border-slate-200 p-5 rounded-3xl shadow-sm hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{log.action}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-bold">經辦：{log.staffName}</span>
                </div>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">{log.impact}</p>
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 ml-14">
              <p className="text-slate-400 italic">目前尚無操作紀錄數據</p>
            </div>
          )}
        </div>
      </div>

      {logs.length > 0 && (
        <div className="pl-14">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
