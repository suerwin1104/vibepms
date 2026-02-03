
import React, { useState } from 'react';
import { Staff } from '../types';

interface LoginScreenProps {
  staffList: Staff[];
  onLogin: (staff: Staff) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ staffList, onLogin }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffList.find(s => s.id === selectedStaffId);
    if (staff) {
      // 這裡僅作模擬，直接進入系統
      onLogin(staff);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden p-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black mb-4 shadow-xl shadow-blue-500/20">V</div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">HotelMS Login</h1>
          <p className="text-slate-400 text-sm mt-1 uppercase font-bold tracking-widest">Enterprise v2.5</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">選擇員工帳號</label>
            <select
              required
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            >
              <option value="">-- 請選擇您的員工帳號 --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.employeeId} - {s.name} ({s.title})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">安全密碼</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-95"
          >
            登入管理介面
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
            此系統受企業安全政策保護。所有操作皆會記錄於稽核日誌。
            <br />若遺忘密碼請聯繫 IT 管理部門。
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
