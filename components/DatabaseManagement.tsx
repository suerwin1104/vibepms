
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { MOCK_HOTELS, MOCK_STAFF } from '../constants';
import { RoomStatus, ReservationStatus } from '../types';

const DatabaseManagement: React.FC = () => {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [showSql, setShowSql] = useState(false);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [`[${timestamp}] ${msg}`, ...prev]);
    console.log(`[PMS-Sync] ${msg}`);
  };

  const fetchStats = async () => {
    const tables = ['hotels', 'buildings', 'rooms', 'guests', 'reservations', 'staff', 'transactions', 'invoices', 'invoice_sequences', 'housekeepers'];
    const newStats: Record<string, number> = {};
    for (const table of tables) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
          newStats[table] = -1;
        } else {
          newStats[table] = count || 0;
        }
      } catch (e) {
        newStats[table] = -1;
      }
    }
    setStats(newStats);
    return newStats;
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSync = async () => {
    if (confirmStep === 0) {
      setConfirmStep(1);
      addLog("⚠️ 安全鎖已解鎖。準備重構資料庫結構並注入電子發票字軌...");
      return;
    }

    setLog(["[00:00:00] 🔄 啟動資料重構引擎..."]);
    setIsSyncing(true);
    setConfirmStep(0);

    try {
      // 依序清理所有表格
      const tablesToClear = ['invoice_sequences', 'invoices', 'transactions', 'reservations', 'rooms', 'buildings', 'housekeepers', 'staff', 'hotels', 'guests'];
      addLog("Step 1: 清空雲端舊資料內容...");
      for (const table of tablesToClear) {
        const { error } = await supabase.from(table).delete().neq('id', '_root_');
        if (error) {
          addLog(`⚠️ 清除 ${table} 失敗: ${error.message}`);
          // Don't throw, try to proceed, but warn.
        }
      }

      // 1. Hotels & Buildings
      addLog("Step 2: 注入集團基礎設施...");
      const { error: hError } = await supabase.from('hotels').insert(MOCK_HOTELS);
      if (hError) console.error("Hotels insert error:", hError);

      const defaultPrefixes = [['A', 'B'], ['M', 'N'], ['K', 'L']];

      // Use map().flat() for absolute index safety
      const bData = MOCK_HOTELS.map((h, i) => {
        const [prefix1, prefix2] = defaultPrefixes[i % 3];
        addLog(`Building Gen: ${h.name} (${i}) -> ${prefix1}/${prefix2}`);
        return [
          { id: `B-${h.id}-${prefix1}`, hotel_id: h.id, name: `${h.name} ${prefix1}棟`, code: prefix1 },
          { id: `B-${h.id}-${prefix2}`, hotel_id: h.id, name: `${h.name} ${prefix2}棟`, code: prefix2 }
        ];
      }).flat();

      const { error: bError } = await supabase.from('buildings').insert(bData);
      if (bError) {
        addLog(`❌ Buildings Insert Failed: ${bError.message}`);
        throw bError; // Stop here if buildings fail
      }

      // 2. Staff
      addLog("Step 3: 配置各店權限人員...");
      const sData = MOCK_STAFF.map(s => ({
        id: s.id, hotel_id: s.hotelId || null, employee_id: s.employeeId,
        name: s.name, role: s.role, title: s.title, authorized_hotels: s.authorizedHotels
      }));
      await supabase.from('staff').insert(sData);

      // 3. Invoice Sequences
      addLog("Step 4: 配置連鎖發票電子字軌...");
      const prefixes = ['VB', 'VC', 'VD'];
      const seqData = MOCK_HOTELS.map((h, i) => ({
        hotel_id: h.id,
        prefix: prefixes[i % 3], // Index safe
        current_number: 10000001
      }));
      await supabase.from('invoice_sequences').insert(seqData);

      // 4. Guests
      addLog("Step 5: 注入模擬賓客檔案...");
      const guestNames = ['王小明', '陳美玲', '林志偉', '張雅婷', '黃建宏', '李佳穎', '吳俊傑', '周芳如', '鄭明哲', '蔡雅雯'];
      const vipLevels = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
      const gData = guestNames.map((name, i) => ({
        id: `g${i + 1}`,
        name: name,
        id_number: `${String.fromCharCode(65 + i)}${123456780 + i}`,
        phone: `09${10 + i}-${100 + i * 111}-${200 + i * 222}`,
        vip_level: vipLevels[i % vipLevels.length],
        is_blacklisted: i === 7,
        preferences: ['高樓層', '需要蕎麥枕', '對花粉過敏', '需要加床', '靠窗房間', '安靜樓層', '無煙房', '需要嬰兒床', '需要輪椅無障礙', '早餐升級'][i]
      }));
      await supabase.from('guests').insert(gData);

      // 5. Housekeepers
      addLog("Step 6: 注入清潔人員資料...");
      const hkNames = ['阿花', '小英', '美珠', '金枝', '秀蓮', '玉華', '淑芬', '麗娟', '雅芳', '惠美'];
      const hkData: any[] = [];
      MOCK_HOTELS.forEach((h, hIdx) => {
        for (let i = 0; i < 10; i++) {
          hkData.push({
            id: `HK-${h.id}-${i + 1}`,
            hotel_id: h.id,
            employee_id: `HK${hIdx + 1}0${i + 1}`,
            name: `${h.name.slice(10, 12)}-${hkNames[i]}`,
            phone: `09${20 + hIdx}-${300 + i * 111}-${400 + i * 222}`,
            status: i < 8 ? 'Active' : 'Inactive',
            assigned_floor: `${(i % 3) + 1}F`,
            cleaned_today: Math.floor(Math.random() * 6)
          });
        }
      });
      await supabase.from('housekeepers').insert(hkData);

      // 6. Rooms & Reservations
      addLog("Step 7: 生成客房並安插即時訂單...");
      const rData: any[] = [];
      const resData: any[] = [];
      const txData: any[] = [];
      const invData: any[] = [];
      const sources = ['Booking.com', 'Agoda', '官網', '櫃檯直接', '電話預約'];
      const roomTypes = ['Double', 'Deluxe', 'Suite', 'Family', 'Twin'];
      const statuses: ReservationStatus[] = ['Confirmed', 'CheckedIn', 'Confirmed', 'CheckedIn', 'Confirmed', 'CheckedOut', 'Confirmed', 'CheckedIn', 'Cancelled', 'Confirmed'];
      const paymentMethods = ['Cash', 'CreditCard', 'Transfer', 'Cash', 'CreditCard'];
      const today = new Date();
      const formatDate = (d: Date) => d.toISOString().slice(0, 10);
      let invoiceNum = 10000001;

      // Note: bData is flat array: [H1-A, H1-B, H2-M, H2-N, ...]. 
      // We process each building.
      bData.forEach((b, bIdx) => {
        // b has 'code' (A, B, M, N...) correctly now.

        // Generate 5 rooms per building (10 per hotel)
        for (let roomNum = 1; roomNum <= 5; roomNum++) {
          const floor = Math.ceil(roomNum / 2);
          const roomOnFloor = ((roomNum - 1) % 3) + 1;
          const roomNo = `${b.code}${floor}0${roomOnFloor}`;
          const roomId = `R-${b.hotel_id}-${b.code}-${roomNum}`; // Uses Unique Code
          const roomTypeIdx = roomNum % roomTypes.length;
          const basePrice = [2600, 3400, 4800, 3800, 2800][roomTypeIdx];
          rData.push({
            id: roomId, hotel_id: b.hotel_id, building_id: b.id,
            number: roomNo, type: roomTypes[roomTypeIdx],
            status: RoomStatus.VC, floor: floor, housekeeper: '未指派',
            base_price: basePrice, description: 'PMS 初始化房'
          });
        }

        // Generate 5 reservations
        for (let i = 0; i < 5; i++) {
          const guestIdx = (bIdx * 5 + i) % 10;
          const resStatus = statuses[(bIdx * 5 + i) % statuses.length];
          // Same room number logic
          const roomNum = (i % 5) + 1;
          const floor = Math.ceil(roomNum / 2);
          const roomOnFloor = ((roomNum - 1) % 3) + 1;
          const roomNo = `${b.code}${floor}0${roomOnFloor}`;
          const roomId = `R-${b.hotel_id}-${b.code}-${roomNum}`;
          const checkInDate = new Date(today);
          checkInDate.setDate(today.getDate() + (i - 2));
          const checkOutDate = new Date(checkInDate);
          checkOutDate.setDate(checkInDate.getDate() + 1 + (i % 3));
          const totalPrice = [2600, 3400, 4800, 3800, 2800][i % 5] * (1 + (i % 3));
          const paidAmount = (resStatus === 'CheckedOut' || resStatus === 'CheckedIn') ? totalPrice : (i % 2 === 0 ? totalPrice : Math.floor(totalPrice * 0.5));
          const resId = `RES-${b.hotel_id}-${b.code}-${i}`; // Uses Unique Code

          resData.push({
            id: resId,
            hotel_id: b.hotel_id,
            building_id: b.id,
            guest_id: `g${guestIdx + 1}`,
            guest_name: guestNames[guestIdx],
            phone: `09${10 + guestIdx}-${100 + i * 111}-${200 + i * 222}`,
            id_number: `${String.fromCharCode(65 + guestIdx)}${123456780 + guestIdx}`,
            check_in: formatDate(checkInDate),
            check_out: formatDate(checkOutDate),
            room_number: roomNo,
            room_type: roomTypes[i % roomTypes.length],
            status: resStatus,
            source: sources[i % sources.length],
            total_price: totalPrice,
            paid_amount: paidAmount,
            discount: i * 50,
            note: resStatus === 'CheckedOut' ? '已結清退房' : (i % 2 === 0 ? '已預付訂金' : '待收款'),
            last_edited_by: 'System'
          });


          // Generate transaction for each reservation
          if (paidAmount > 0) {
            txData.push({
              id: `TX-${resId}`,
              hotel_id: b.hotel_id,
              reservation_id: resId,
              amount: paidAmount,
              type: 'Payment',
              method: paymentMethods[i % paymentMethods.length],
              description: resStatus === 'CheckedOut' ? '退房結帳' : '預付訂金',
              created_at: formatDate(checkInDate),
              staff_name: MOCK_STAFF[(bIdx % MOCK_STAFF.length)].name
            });
          }

          // Generate invoice for checked-out reservations
          if (resStatus === 'CheckedOut') {
            const prefix = ['VB', 'VC', 'VD'][MOCK_HOTELS.findIndex(h => h.id === b.hotel_id) % 3];
            invData.push({
              id: `INV-${resId}`,
              hotel_id: b.hotel_id,
              reservation_id: resId,
              invoice_number: `${prefix}-${invoiceNum++}`,
              amount: totalPrice,
              tax: Math.round(totalPrice * 0.05),
              net_amount: Math.round(totalPrice * 0.95),
              status: 'Issued',
              created_at: formatDate(checkOutDate),
              created_by: MOCK_STAFF[(bIdx % MOCK_STAFF.length)].name
            });
          }

          // Update room status for CheckedIn reservations
          if (resStatus === 'CheckedIn') {
            const roomToUpdate = rData.find(r => r.id === roomId);
            if (roomToUpdate) {
              roomToUpdate.status = RoomStatus.OC;
            }
          }
        }
      });
      await supabase.from('rooms').insert(rData);
      await supabase.from('reservations').insert(resData);

      addLog("Step 8: 注入交易與發票記錄...");
      if (txData.length > 0) await supabase.from('transactions').insert(txData);
      if (invData.length > 0) await supabase.from('invoices').insert(invData);

      addLog("🎊 測試環境與發票系統初始化成功！");
      addLog(`✅ 已生成: ${gData.length} 賓客, ${hkData.length} 清潔員, ${rData.length} 房間, ${resData.length} 預約, ${txData.length} 交易, ${invData.length} 發票`);
      await fetchStats();

      alert(
        "✅ 資料重構成功！(Data Regeneration Complete)\n\n" +
        "請確認以下棟別代碼 (Prefixes):\n" +
        "1. 台北 (Taipei): [A, B]\n" +
        "2. 台中 (Taichung): [M, N]\n" +
        "3. 高雄 (Kaohsiung): [K, L]\n\n" +
        "系統將在按下確定後自動刷新頁面。"
      );
      window.location.reload();

    } catch (err: any) {
      addLog(`❌ 致命報錯: ${err.message}`);
      alert(`重構失敗：${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl relative overflow-hidden">
        {isSyncing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="font-black text-slate-900 animate-bounce uppercase tracking-widest text-xs">Finalizing Logic...</p>
          </div>
        )}

        <h2 className="text-3xl font-black text-slate-900 mb-2">雲端維護中心</h2>
        <p className="text-slate-500 text-sm mb-10">請複製下方的 SQL 到 Supabase SQL Editor 執行一次，以修復 CASCADE 依賴錯誤。</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{k}</p>
              <p className={`text-2xl font-black ${v === -1 ? 'text-rose-500' : 'text-slate-900'}`}>
                {v === -1 ? 'OFFLINE' : v}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex-1 py-6 rounded-[24px] font-black text-white transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 ${confirmStep === 1 ? 'bg-amber-500 shadow-amber-500/30' : 'bg-blue-600 shadow-blue-600/30 hover:bg-blue-700'
              }`}
          >
            {confirmStep === 1 ? '🔥 確定重構資料內容' : '🚀 重新生成測試環境數據'}
          </button>

          <button onClick={() => setShowSql(!showSql)} className={`px-8 rounded-[24px] font-black border-2 ${showSql ? 'bg-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}>SQL</button>
        </div>
      </div>

      {showSql && (
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 animate-in slide-in-from-bottom-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black uppercase">電子發票兼容 DDL (請在 SQL Editor 執行)</h3>
            <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded font-black">含 CASCADE 修正</span>
          </div>
          <pre className="text-[10px] bg-slate-50 p-6 rounded-3xl overflow-x-auto text-slate-600 leading-relaxed font-mono">
            {`-- 強制刪除所有舊表 (CASCADE)
DROP TABLE IF EXISTS billable_items CASCADE;
DROP TABLE IF EXISTS consumption_items CASCADE;
DROP TABLE IF EXISTS housekeepers CASCADE;
DROP TABLE IF EXISTS invoice_sequences CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;
DROP TABLE IF EXISTS guests CASCADE;

-- 重新建立結構
CREATE TABLE hotels (id TEXT PRIMARY KEY, name TEXT, code TEXT, address TEXT, phone TEXT);
CREATE TABLE buildings (id TEXT PRIMARY KEY, hotel_id TEXT REFERENCES hotels(id), name TEXT, code TEXT);
CREATE TABLE staff (id TEXT PRIMARY KEY, hotel_id TEXT, employee_id TEXT UNIQUE, name TEXT, role TEXT, title TEXT, authorized_hotels TEXT[]);
CREATE TABLE housekeepers (id TEXT PRIMARY KEY, hotel_id TEXT REFERENCES hotels(id), employee_id TEXT, name TEXT, phone TEXT, status TEXT, assigned_floor TEXT, cleaned_today INTEGER);
CREATE TABLE rooms (id TEXT PRIMARY KEY, hotel_id TEXT REFERENCES hotels(id), building_id TEXT REFERENCES buildings(id), number TEXT, type TEXT, status TEXT, floor INTEGER, housekeeper TEXT, base_price INTEGER, description TEXT);
CREATE TABLE guests (id TEXT PRIMARY KEY, name TEXT, id_number TEXT UNIQUE, phone TEXT, vip_level TEXT, is_blacklisted BOOLEAN, preferences TEXT, modification_logs JSONB);
CREATE TABLE reservations (id TEXT PRIMARY KEY, hotel_id TEXT REFERENCES hotels(id), building_id TEXT, guest_id TEXT, guest_name TEXT, phone TEXT, id_number TEXT, check_in TEXT, check_out TEXT, room_number TEXT, room_type TEXT, status TEXT, source TEXT, total_price INTEGER, paid_amount INTEGER, discount INTEGER, note TEXT, last_edited_by TEXT, license_plate TEXT, company_name TEXT, booking_agent TEXT, deposit_amount INTEGER, room_rent INTEGER, extra_items JSONB, add_bed BOOLEAN, payment_method TEXT, credit_card TEXT, pet_type TEXT, pet_count INTEGER, pet_note TEXT);
CREATE TABLE transactions (id TEXT PRIMARY KEY, hotel_id TEXT, reservation_id TEXT REFERENCES reservations(id), amount INTEGER, type TEXT, method TEXT, description TEXT, created_at TEXT, staff_name TEXT);
CREATE TABLE invoices (id TEXT PRIMARY KEY, hotel_id TEXT, reservation_id TEXT, invoice_number TEXT, amount INTEGER, tax INTEGER, net_amount INTEGER, status TEXT, created_at TEXT, created_by TEXT);
CREATE TABLE invoice_sequences (hotel_id TEXT PRIMARY KEY REFERENCES hotels(id), prefix TEXT, current_number INTEGER);
CREATE TABLE billable_items (id TEXT PRIMARY KEY, reservation_id TEXT REFERENCES reservations(id), description TEXT, amount INTEGER, quantity INTEGER, payment_method TEXT, note TEXT, created_at TEXT, created_by TEXT);
CREATE TABLE consumption_items (id TEXT PRIMARY KEY, hotel_id TEXT, reservation_id TEXT, item_id TEXT, quantity INTEGER, amount INTEGER, added_at TEXT, added_by TEXT);`}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseManagement;
