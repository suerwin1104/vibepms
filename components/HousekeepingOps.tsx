
import React, { useState, useMemo } from 'react';
import { CleaningTask, Housekeeper, Room, RoomStatus } from '../types';
import HousekeeperManagement from './HousekeeperManagement';
import Pagination from './Pagination';

interface DailyCleaningTask {
  id: string;
  hotelId: string;
  roomId: string;
  roomNumber: string;
  taskDate: string;
  taskType: 'VD' | 'SO' | 'DND';
  priority: 'High' | 'Normal' | 'Low';
  status: 'Unassigned' | 'InProgress' | 'Completed' | 'Inspected';
  housekeeperId?: string;
  housekeeperName?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  inspectorId?: string;
  inspectionScore?: number;
  notes?: string;
  exceptions?: string[];
}

interface HousekeepingOpsProps {
  cleaningTasks: DailyCleaningTask[];
  onAssign: (taskId: string, housekeeperId: string, housekeeperName: string) => void;
  onUnassign: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: DailyCleaningTask['status']) => void;
  onGenerateTasks: () => void;
  onManualAssign: (roomId: string, roomNumber: string, housekeeperId: string, housekeeperName: string, taskType: 'VD' | 'SO') => void;
  housekeepers: Housekeeper[];
  rooms: Room[];
  hotelId: string;
  onAddHousekeeper: (hk: Partial<Housekeeper>) => void;
  onUpdateHousekeeper: (id: string, data: Partial<Housekeeper>) => void;
  onDeleteHousekeeper: (id: string) => void;
  onDeleteTask: (taskId: string) => void;
}

const HousekeepingOps: React.FC<HousekeepingOpsProps> = ({
  cleaningTasks,
  onAssign,
  onUnassign,
  onUpdateStatus,
  onGenerateTasks,
  onManualAssign,
  housekeepers,
  rooms,
  hotelId,
  onAddHousekeeper,
  onUpdateHousekeeper,
  onDeleteHousekeeper,
  onDeleteTask
}) => {
  const [subTab, setSubTab] = useState<'DailyStatus' | 'Assignment' | 'Performance' | 'Staff' | 'History' | 'MonthlyStats' | 'DailyTrack'>('DailyStatus');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = cleaningTasks.filter(t => t.taskDate === today);

  // Summary counts
  const summaryStats = useMemo(() => ({
    total: todayTasks.length,
    unassigned: todayTasks.filter(t => t.status === 'Unassigned').length,
    inProgress: todayTasks.filter(t => t.status === 'InProgress').length,
    completed: todayTasks.filter(t => t.status === 'Completed' || t.status === 'Inspected').length,
  }), [todayTasks]);

  // Helper function to sort by building prefix then room number
  const sortByRoomNumber = (a: { roomNumber: string }, b: { roomNumber: string }) => {
    // Extract building prefix (letters) and room number (digits)
    const aMatch = a.roomNumber.match(/^([A-Za-z]*)(\d+)$/);
    const bMatch = b.roomNumber.match(/^([A-Za-z]*)(\d+)$/);

    const aPrefix = aMatch?.[1] || '';
    const bPrefix = bMatch?.[1] || '';
    const aNum = parseInt(aMatch?.[2] || '0', 10);
    const bNum = parseInt(bMatch?.[2] || '0', 10);

    // Compare by prefix first, then by number
    if (aPrefix !== bPrefix) {
      return aPrefix.localeCompare(bPrefix);
    }
    return aNum - bNum;
  };

  const filteredTasks = (filterStatus === 'all'
    ? todayTasks
    : todayTasks.filter(t => t.status === filterStatus)
  ).sort(sortByRoomNumber);


  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">房務作業中心</h1>
          <p className="text-slate-500 text-sm">今日清掃任務分配、執行狀況監控與房務績效報表。</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={onGenerateTasks}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
          >
            🔄 自動產生今日任務
          </button>
          <div className="bg-slate-200 p-1 rounded-xl flex gap-1 flex-wrap">
            <button
              onClick={() => setSubTab('DailyStatus')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'DailyStatus' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              今日房況
            </button>
            <button
              onClick={() => setSubTab('Assignment')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'Assignment' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              分配清單
            </button>
            <button
              onClick={() => setSubTab('History')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'History' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📋 歷史記錄
            </button>
            <button
              onClick={() => setSubTab('MonthlyStats')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'MonthlyStats' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📊 月統計
            </button>
            <button
              onClick={() => setSubTab('DailyTrack')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'DailyTrack' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              🗓️ 每日蹤跡
            </button>
            <button
              onClick={() => setSubTab('Performance')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'Performance' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              績效報表
            </button>
            <button
              onClick={() => setSubTab('Staff')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === 'Staff' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              人員管理
            </button>
          </div>
        </div>
      </header>

      {subTab === 'DailyStatus' && (
        <DailyStatusView
          tasks={filteredTasks}
          summaryStats={summaryStats}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onAssign={onAssign}
          onUnassign={onUnassign}
          onUpdateStatus={onUpdateStatus}
          onDeleteTask={onDeleteTask}
          housekeepers={housekeepers}
          rooms={rooms}
        />
      )}

      {subTab === 'Assignment' && (
        <AssignmentSheet
          tasks={todayTasks}
          onAssign={onAssign}
          onManualAssign={onManualAssign}
          housekeepers={housekeepers}
          rooms={rooms}
        />
      )}

      {subTab === 'History' && (
        <HistoryReport tasks={cleaningTasks} housekeepers={housekeepers} />
      )}

      {subTab === 'MonthlyStats' && (
        <MonthlyStatsReport tasks={cleaningTasks} housekeepers={housekeepers} />
      )}

      {subTab === 'DailyTrack' && (
        <DailyTrackReport tasks={cleaningTasks} housekeepers={housekeepers} />
      )}

      {subTab === 'Performance' && (
        <PerformanceReport tasks={todayTasks} housekeepers={housekeepers} />
      )}

      {subTab === 'Staff' && (
        <HousekeeperManagement
          hotelId={hotelId}
          housekeepers={housekeepers}
          setHousekeepers={(newList) => {
            // Handle add/update/delete through the new handlers
            // For now, we'll detect changes and call appropriate handlers
            const currentIds = housekeepers.map(h => h.id);
            const newIds = newList.map(h => h.id);

            // Find deleted
            const deleted = housekeepers.filter(h => !newIds.includes(h.id));
            deleted.forEach(d => onDeleteHousekeeper(d.id));

            // Find added
            const added = newList.filter(h => !currentIds.includes(h.id));
            added.forEach(a => onAddHousekeeper(a));

            // Find updated
            const updated = newList.filter(h => {
              const old = housekeepers.find(o => o.id === h.id);
              return old && JSON.stringify(old) !== JSON.stringify(h);
            });
            updated.forEach(u => onUpdateHousekeeper(u.id, u));
          }}
          rooms={rooms}
        />
      )}
    </div>
  );
};

// 今日房況總覽
const DailyStatusView = ({
  tasks,
  summaryStats,
  filterStatus,
  setFilterStatus,
  onAssign,
  onUpdateStatus,
  housekeepers,
  rooms,
  onUnassign,
  onDeleteTask
}: {

  tasks: DailyCleaningTask[],
  summaryStats: { total: number, unassigned: number, inProgress: number, completed: number },
  filterStatus: string,
  setFilterStatus: (s: string) => void,
  onAssign: (taskId: string, housekeeperId: string, housekeeperName: string) => void,
  onUnassign: (taskId: string) => void,
  onDeleteTask: (taskId: string) => void,
  onUpdateStatus: (taskId: string, status: DailyCleaningTask['status']) => void,
  housekeepers: Housekeeper[],
  rooms: Room[]
}) => {
  // Calculate real-time room status counts from Dashboard
  const roomStatusCounts = {
    VC: rooms.filter(r => r.status === RoomStatus.VC).length,
    VD: rooms.filter(r => r.status === RoomStatus.VD).length,
    OC: rooms.filter(r => r.status === RoomStatus.OC).length,
    SO: rooms.filter(r => r.status === RoomStatus.SO).length,
    OOO: rooms.filter(r => r.status === RoomStatus.OOO).length,
  };

  // Rooms that need cleaning but don't have tasks yet
  const roomsNeedingTasks = rooms.filter(r =>
    (r.status === RoomStatus.VD || r.status === RoomStatus.SO) &&
    !tasks.some(t => t.roomId === r.id)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Real-time Room Status from Dashboard */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-slate-200 rounded-2xl p-4">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">📊 即時房態 (同步自房態看板)</h2>
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-3 border border-emerald-200">
            <p className="text-[9px] font-black text-emerald-500 uppercase">空淨 VC</p>
            <p className="text-2xl font-black text-emerald-600">{roomStatusCounts.VC}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-amber-200">
            <p className="text-[9px] font-black text-amber-500 uppercase">空髒 VD</p>
            <p className="text-2xl font-black text-amber-600">{roomStatusCounts.VD}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-blue-200">
            <p className="text-[9px] font-black text-blue-500 uppercase">住客 OC</p>
            <p className="text-2xl font-black text-blue-600">{roomStatusCounts.OC}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-purple-200">
            <p className="text-[9px] font-black text-purple-500 uppercase">續住 SO</p>
            <p className="text-2xl font-black text-purple-600">{roomStatusCounts.SO}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-rose-200">
            <p className="text-[9px] font-black text-rose-500 uppercase">故障 OOO</p>
            <p className="text-2xl font-black text-rose-600">{roomStatusCounts.OOO}</p>
          </div>
        </div>
        {roomsNeedingTasks.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
            ⚠️ 有 <strong>{roomsNeedingTasks.length}</strong> 間房間 (VD/SO) 尚未建立清掃任務：
            <span className="font-bold ml-1">{roomsNeedingTasks.map(r => r.number).join(', ')}</span>
            <span className="ml-2 text-amber-500">（點擊上方「自動產生今日任務」按鈕來建立）</span>
          </div>
        )}
      </div>

      {/* Task Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div
          onClick={() => setFilterStatus('all')}
          className={`bg-white border-2 p-4 rounded-2xl cursor-pointer transition-all ${filterStatus === 'all' ? 'border-blue-500 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日任務</p>
          <p className="text-3xl font-black text-slate-800">{summaryStats.total}</p>
        </div>
        <div
          onClick={() => setFilterStatus('Unassigned')}
          className={`bg-white border-2 p-4 rounded-2xl cursor-pointer transition-all ${filterStatus === 'Unassigned' ? 'border-rose-500 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">待分配</p>
          <p className="text-3xl font-black text-rose-600">{summaryStats.unassigned}</p>
        </div>
        <div
          onClick={() => setFilterStatus('InProgress')}
          className={`bg-white border-2 p-4 rounded-2xl cursor-pointer transition-all ${filterStatus === 'InProgress' ? 'border-amber-500 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">進行中</p>
          <p className="text-3xl font-black text-amber-600">{summaryStats.inProgress}</p>
        </div>
        <div
          onClick={() => setFilterStatus('Completed')}
          className={`bg-white border-2 p-4 rounded-2xl cursor-pointer transition-all ${filterStatus === 'Completed' ? 'border-emerald-500 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">已完成</p>
          <p className="text-3xl font-black text-emerald-600">{summaryStats.completed}</p>
        </div>
      </div>

      {/* Task Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tasks.map(task => {
          const room = rooms.find(r => r.id === task.roomId);
          const currentRoomStatus = room?.status;
          const statusMismatch = currentRoomStatus && currentRoomStatus !== task.taskType && task.status !== 'Completed';

          return (
            <div
              key={task.id}
              className={`bg-white border-2 rounded-2xl p-4 transition-all hover:shadow-lg ${task.status === 'Unassigned' ? 'border-rose-200' :
                task.status === 'InProgress' ? 'border-amber-200' :
                  task.status === 'Completed' ? 'border-emerald-200' : 'border-slate-200'
                }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-black text-slate-800">#{task.roomNumber}</h3>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${task.taskType === 'VD' ? 'bg-amber-100 text-amber-700' :
                      task.taskType === 'SO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                      {task.taskType === 'VD' ? '空髒' : task.taskType === 'SO' ? '續住' : 'DND'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task.id);
                      }}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title="刪除任務"
                    >
                      🗑️
                    </button>
                  </div>
                  {statusMismatch && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">
                      現況: {currentRoomStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {/* Status Badge */}
                <div className={`text-center py-1.5 rounded-lg text-[10px] font-black uppercase ${task.status === 'Unassigned' ? 'bg-rose-50 text-rose-600' :
                  task.status === 'InProgress' ? 'bg-amber-50 text-amber-600' :
                    task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                  {task.status === 'Unassigned' ? '待分配' :
                    task.status === 'InProgress' ? '清掃中' :
                      task.status === 'Completed' ? '已完成' : '已稽核'}
                </div>

                {/* Housekeeper - show dropdown for reassignment */}
                {task.housekeeperName && task.status !== 'Unassigned' ? (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 text-center">
                      🧹 {task.housekeeperName}
                    </p>
                    <div className="flex gap-1">
                      <select
                        value=""
                        onChange={(e) => {
                          const hk = housekeepers.find(h => h.id === e.target.value);
                          if (hk) onAssign(task.id, hk.id, hk.name);
                        }}
                        className="flex-1 text-[10px] border border-slate-200 rounded-lg py-1 px-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-400"
                      >
                        <option value="">🔄 更換</option>
                        {housekeepers.filter(h => h.status === 'Active' && h.name !== task.housekeeperName).map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => onUnassign(task.id)}
                        className="px-2 py-1 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg hover:bg-rose-200 transition-colors"
                        title="取消分派"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    onChange={(e) => {
                      const hk = housekeepers.find(h => h.id === e.target.value);
                      if (hk) onAssign(task.id, hk.id, hk.name);
                    }}
                    className="w-full text-xs border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">指派房務員</option>
                    {housekeepers.filter(h => h.status === 'Active').map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                )}

                {/* Action Buttons */}
                {task.status === 'Unassigned' && task.housekeeperName && (
                  <button
                    onClick={() => onUpdateStatus(task.id, 'InProgress')}
                    className="w-full bg-amber-500 text-white text-[10px] font-bold py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    開始清掃
                  </button>
                )}
                {task.status === 'InProgress' && (
                  <button
                    onClick={() => onUpdateStatus(task.id, 'Completed')}
                    className="w-full bg-emerald-500 text-white text-[10px] font-bold py-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    ✓ 完成清掃
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed rounded-3xl">
            今日暫無清掃任務。點擊「自動產生今日任務」來建立任務。
          </div>
        )}
      </div>
    </div>
  );
};

// 分配清單
const AssignmentSheet = ({ tasks, onAssign, onManualAssign, housekeepers, rooms }: {
  tasks: DailyCleaningTask[],
  onAssign: (taskId: string, housekeeperId: string, housekeeperName: string) => void,
  onManualAssign: (roomId: string, roomNumber: string, housekeeperId: string, housekeeperName: string, taskType: 'VD' | 'SO') => void,
  housekeepers: Housekeeper[],
  rooms: Room[]
}) => {
  // Helper function to sort by building prefix then room number
  const sortByRoomNumber = <T extends { roomNumber?: string; number?: string }>(a: T, b: T): number => {
    const aRoom = a.roomNumber || a.number || '';
    const bRoom = b.roomNumber || b.number || '';
    const aMatch = aRoom.match(/^([A-Za-z]*)(\d+)$/);
    const bMatch = bRoom.match(/^([A-Za-z]*)(\d+)$/);
    const aPrefix = aMatch?.[1] || '';
    const bPrefix = bMatch?.[1] || '';
    const aNum = parseInt(aMatch?.[2] || '0', 10);
    const bNum = parseInt(bMatch?.[2] || '0', 10);
    if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix);
    return aNum - bNum;
  };

  // A task is truly unassigned only if status is Unassigned AND no housekeeper is assigned
  const unassigned = tasks.filter(t => t.status === 'Unassigned' && !t.housekeeperName).sort(sortByRoomNumber);
  // Tasks that have been assigned (either have a housekeeper OR are not in Unassigned status)
  const assigned = tasks.filter(t => t.status !== 'Unassigned' || t.housekeeperName).sort(sortByRoomNumber);

  // Rooms that need cleaning but don't have tasks yet (all except VC)
  const roomsWithoutTasks = rooms.filter(r =>
    r.status !== RoomStatus.VC &&
    !tasks.some(t => t.roomId === r.id)
  ).sort((a, b) => sortByRoomNumber({ roomNumber: a.number }, { roomNumber: b.number }));


  const handlePrint = () => {
    const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const allTasks = [...assigned, ...unassigned];

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>清掃派工單 - ${today}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 5px; }
          .date { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .status-unassigned { color: #dc2626; }
          .status-inprogress { color: #d97706; }
          .status-completed { color: #059669; }
          .summary { margin-top: 20px; padding: 10px; background: #f5f5f5; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>🧹 清掃派工單</h1>
        <p class="date">日期: ${today}</p>
        
        <table>
          <thead>
            <tr>
              <th>房號</th>
              <th>類型</th>
              <th>優先級</th>
              <th>負責房務員</th>
              <th>狀態</th>
              <th>開始時間</th>
              <th>備註</th>
            </tr>
          </thead>
          <tbody>
            ${allTasks.map(task => `
              <tr>
                <td><strong>${task.roomNumber}</strong></td>
                <td>${task.taskType === 'VD' ? '空髒清掃' : task.taskType === 'SO' ? '續住整理' : 'DND'}</td>
                <td>${task.priority === 'High' ? '⚡ 優先' : '一般'}</td>
                <td>${task.housekeeperName || '<span class="status-unassigned">未指派</span>'}</td>
                <td class="${task.status === 'Unassigned' ? 'status-unassigned' :
        task.status === 'InProgress' ? 'status-inprogress' : 'status-completed'}">
                  ${task.status === 'Unassigned' ? '待分配' :
        task.status === 'InProgress' ? '進行中' :
          task.status === 'Completed' ? '已完成' : '已稽核'}
                </td>
                <td>${task.startedAt ? new Date(task.startedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td>${task.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <strong>統計:</strong> 
          總任務 ${allTasks.length} | 
          待分配 ${unassigned.length} | 
          已指派/進行中 ${assigned.filter(t => t.status === 'InProgress').length} | 
          已完成 ${assigned.filter(t => t.status === 'Completed' || t.status === 'Inspected').length}
        </div>
        
        <div style="text-align: center; margin-top: 30px;" class="no-print">
          <button onclick="window.print()" style="padding: 12px 40px; font-size: 16px; font-weight: bold; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer;">
            🖨️ 列印派工單
          </button>
        </div>
        
        <style>
          @media print { .no-print { display: none !important; } }
        </style>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Manual Room Assignment Section */}
      {roomsWithoutTasks.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-4 bg-purple-500 rounded-full"></span>
              手動分配房間 ({roomsWithoutTasks.length})
            </h3>
          </div>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
            <p className="text-xs text-purple-600 mb-4">以下房間尚未建立清掃任務，可直接指派給房務員：</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roomsWithoutTasks.map(room => {
                const getStatusLabel = () => {
                  switch (room.status) {
                    case RoomStatus.VD: return { label: '空髒', bg: 'bg-amber-100 text-amber-700', taskType: 'VD' as const };
                    case RoomStatus.SO: return { label: '續住', bg: 'bg-blue-100 text-blue-700', taskType: 'SO' as const };
                    case RoomStatus.OC: return { label: '住客', bg: 'bg-green-100 text-green-700', taskType: 'SO' as const };
                    case RoomStatus.OOO: return { label: '故障-緊急', bg: 'bg-rose-100 text-rose-700', taskType: 'VD' as const };
                    default: return { label: '其他', bg: 'bg-slate-100 text-slate-700', taskType: 'VD' as const };
                  }
                };
                const statusInfo = getStatusLabel();
                const isEmergency = room.status === RoomStatus.OOO;

                return (
                  <div key={room.id} className={`bg-white border ${isEmergency ? 'border-rose-300' : 'border-purple-200'} p-4 rounded-xl shadow-sm`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex gap-3 items-center">
                        <div className="text-xl font-black text-slate-800">#{room.number}</div>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    {isEmergency && (
                      <p className="text-[10px] text-rose-500 mb-2">⚠️ 緊急清掃後將自動變更為空淨房</p>
                    )}
                    <select
                      onChange={(e) => {
                        const hk = housekeepers.find(h => h.id === e.target.value);
                        if (hk) {
                          onManualAssign(
                            room.id,
                            room.number,
                            hk.id,
                            hk.name,
                            statusInfo.taskType
                          );
                        }
                      }}
                      className={`w-full ${isEmergency ? 'bg-rose-50 border-rose-200' : 'bg-purple-50 border-purple-200'} border rounded-lg text-xs font-bold py-1.5 px-3 outline-none focus:ring-2 ${isEmergency ? 'focus:ring-rose-500' : 'focus:ring-purple-500'}`}
                    >
                      <option value="">{isEmergency ? '🚨 指派緊急清掃' : '指派房務員'}</option>
                      {housekeepers.filter(h => h.status === 'Active').map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 待分配列表 */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-4 bg-rose-500 rounded-full"></span>
              待分配房間 ({unassigned.length})
            </h3>
            <button onClick={handlePrint} className="text-[10px] font-black bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-black uppercase tracking-wider">🖨️ 列印派工單</button>
          </div>
          <div className="space-y-3">
            {unassigned.map(task => (
              <div key={task.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:border-rose-300 transition-colors flex justify-between items-center group">
                <div className="flex gap-4 items-center">
                  <div className="text-2xl font-black text-slate-800">#{task.roomNumber}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${task.taskType === 'VD' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {task.taskType === 'VD' ? '空髒清掃' : '續住整理'}
                      </span>
                      {task.priority === 'High' && <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black animate-pulse">HIGH</span>}
                    </div>
                    {task.notes && <p className="text-xs text-slate-500 mt-1 font-medium italic">註: {task.notes}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[9px] text-slate-400 font-bold text-right uppercase">指派給</p>
                  <select
                    onChange={(e) => {
                      const hk = housekeepers.find(h => h.id === e.target.value);
                      if (hk) onAssign(task.id, hk.id, hk.name);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold py-1.5 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選擇房務員</option>
                    {housekeepers.filter(h => h.status === 'Active').map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
              </div>
            ))}
            {unassigned.length === 0 && <div className="py-20 text-center text-slate-400 border-2 border-dashed rounded-3xl">今日任務已全數指派完畢 ✨</div>}
          </div>
        </section>

        {/* 已指派/執行中 */}
        <section className="space-y-4">
          <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 px-1">
            <span className="w-2 h-4 bg-emerald-500 rounded-full"></span>
            執行狀態 ({assigned.length})
          </h3>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">房號</th>
                  <th className="px-4 py-3">負責人員</th>
                  <th className="px-4 py-3">開始時間</th>
                  <th className="px-4 py-3">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {assigned.map(task => (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-black text-slate-800">#{task.roomNumber}</td>
                    <td className="px-4 py-4">{task.housekeeperName || '-'}</td>
                    <td className="px-4 py-4 text-slate-400">{task.startedAt ? new Date(task.startedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '尚未開始'}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${task.status === 'Completed' || task.status === 'Inspected'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                        {task.status === 'Completed' ? '已完成' : task.status === 'Inspected' ? '已稽核' : '進行中'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

// 績效報表
const PerformanceReport = ({ tasks, housekeepers }: { tasks: DailyCleaningTask[], housekeepers: Housekeeper[] }) => {
  const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'Inspected');

  const performanceData = housekeepers.map(hk => {
    const hkTasks = completedTasks.filter(t => t.housekeeperId === hk.id);
    const totalTimeMs = hkTasks.reduce((acc, curr) => {
      if (curr.startedAt && curr.completedAt) {
        return acc + (new Date(curr.completedAt).getTime() - new Date(curr.startedAt).getTime());
      }
      return acc;
    }, 0);
    const avgTimeMin = hkTasks.length > 0 ? Math.round(totalTimeMs / hkTasks.length / 60000) : 0;
    const avgScore = hkTasks.length > 0
      ? (hkTasks.reduce((acc, curr) => acc + (curr.inspectionScore || 0), 0) / hkTasks.length).toFixed(1)
      : '-';
    return {
      id: hk.id,
      name: hk.name,
      count: hkTasks.length,
      avgTime: avgTimeMin,
      score: avgScore,
      exceptions: hkTasks.flatMap(t => t.exceptions || []).length
    };
  });

  const maxTasks = Math.max(...performanceData.map(d => d.count), 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 工作量分佈 - 數字顯示 */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">今日清掃件數</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {performanceData.map(data => (
            <div key={data.id} className="bg-slate-800 rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-blue-400">{data.count}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">{data.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 績效明細表格 */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <th className="px-6 py-4">房務人員</th>
              <th className="px-6 py-4 text-center">已完成間數</th>
              <th className="px-6 py-4 text-center">平均清掃時長</th>
              <th className="px-6 py-4 text-center">稽核均分</th>
              <th className="px-6 py-4 text-center">異常回報</th>
              <th className="px-6 py-4 text-right">績效判定</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
            {performanceData.map(data => (
              <tr key={data.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-black text-slate-800">{data.name}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-blue-600 font-black">{data.count}</span>
                  <span className="text-[10px] ml-1 uppercase text-slate-400">間</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="font-bold">{data.avgTime}</span>
                  <span className="text-[10px] ml-1 text-slate-400">分/間</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center items-center gap-1">
                    <span className="text-amber-500">★</span>
                    <span className="font-black text-slate-800">{data.score}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  {data.exceptions > 0 ? (
                    <span className="text-rose-500 font-bold">{data.exceptions} 件</span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${data.count > 3 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                    {data.count > 3 ? '優異' : '正常'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 歷史記錄表
const HistoryReport = ({ tasks, housekeepers }: { tasks: DailyCleaningTask[], housekeepers: Housekeeper[] }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const filteredTasks = tasks.filter(t => t.taskDate === selectedDate);
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed' || t.status === 'Inspected');

  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
  const displayedTasks = filteredTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold text-slate-800">📋 每日清掃歷史記錄</h3>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">房號</th>
              <th className="px-4 py-3">類型</th>
              <th className="px-4 py-3">房務員</th>
              <th className="px-4 py-3">開始時間</th>
              <th className="px-4 py-3">完成時間</th>
              <th className="px-4 py-3">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedTasks.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">該日期無清掃記錄</td></tr>
            ) : displayedTasks.map(task => (
              <tr key={task.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold">#{task.roomNumber}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${task.taskType === 'VD' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {task.taskType === 'VD' ? '空髒' : '續住'}
                  </span>
                </td>
                <td className="px-4 py-3">{task.status !== 'Unassigned' && task.housekeeperName ? task.housekeeperName : '-'}</td>
                <td className="px-4 py-3 text-slate-500">{task.startedAt ? new Date(task.startedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td className="px-4 py-3 text-slate-500">{task.completedAt ? new Date(task.completedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                    task.status === 'InProgress' ? 'bg-amber-100 text-amber-700' :
                      task.status === 'Inspected' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                    {task.status === 'Completed' ? '已完成' : task.status === 'InProgress' ? '進行中' : task.status === 'Inspected' ? '已稽核' : '待分配'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      <div className="bg-slate-100 rounded-xl p-4 text-sm">
        <span className="font-bold">當日統計：</span>
        總任務 {filteredTasks.length} | 已完成 {completedTasks.length} | 完成率 {filteredTasks.length > 0 ? Math.round(completedTasks.length / filteredTasks.length * 100) : 0}%
      </div>
    </div>
  );
};

// 月統計表
const MonthlyStatsReport = ({ tasks, housekeepers }: { tasks: DailyCleaningTask[], housekeepers: Housekeeper[] }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const monthTasks = tasks.filter(t => t.taskDate?.startsWith(selectedMonth));
  const completedTasks = monthTasks.filter(t => t.status === 'Completed' || t.status === 'Inspected');

  const statsPerHousekeeper = housekeepers.map(hk => {
    const hkTasks = completedTasks.filter(t => t.housekeeperId === hk.id);
    const totalTimeMs = hkTasks.reduce((acc, t) => {
      if (t.startedAt && t.completedAt) {
        return acc + (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime());
      }
      return acc;
    }, 0);
    return {
      id: hk.id,
      name: hk.name,
      totalRooms: hkTasks.length,
      avgTimeMin: hkTasks.length > 0 ? Math.round(totalTimeMs / hkTasks.length / 60000) : 0,
      vdCount: hkTasks.filter(t => t.taskType === 'VD').length,
      soCount: hkTasks.filter(t => t.taskType === 'SO').length,
    };
  }).sort((a, b) => b.totalRooms - a.totalRooms);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold text-slate-800">📊 月份清掃統計</h3>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-blue-600">{monthTasks.length}</div>
          <div className="text-xs text-blue-500 font-bold">總任務數</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-emerald-600">{completedTasks.length}</div>
          <div className="text-xs text-emerald-500 font-bold">已完成</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-amber-600">{completedTasks.filter(t => t.taskType === 'VD').length}</div>
          <div className="text-xs text-amber-500 font-bold">空髒清掃</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-purple-600">{completedTasks.filter(t => t.taskType === 'SO').length}</div>
          <div className="text-xs text-purple-500 font-bold">續住整理</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">房務員</th>
              <th className="px-4 py-3 text-center">總清掃間數</th>
              <th className="px-4 py-3 text-center">空髒 (VD)</th>
              <th className="px-4 py-3 text-center">續住 (SO)</th>
              <th className="px-4 py-3 text-center">平均時長</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {statsPerHousekeeper.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold">{s.name}</td>
                <td className="px-4 py-3 text-center text-blue-600 font-bold">{s.totalRooms}</td>
                <td className="px-4 py-3 text-center">{s.vdCount}</td>
                <td className="px-4 py-3 text-center">{s.soCount}</td>
                <td className="px-4 py-3 text-center">{s.avgTimeMin} 分</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 每日蹤跡表
const DailyTrackReport = ({ tasks, housekeepers }: { tasks: DailyCleaningTask[], housekeepers: Housekeeper[] }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHousekeeper, setSelectedHousekeeper] = useState<string>('all');

  const dayTasks = tasks.filter(t => t.taskDate === selectedDate);
  const filteredTasks = selectedHousekeeper === 'all'
    ? dayTasks
    : dayTasks.filter(t => t.housekeeperId === selectedHousekeeper);

  // Sort by start time
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (!a.startedAt) return 1;
    if (!b.startedAt) return -1;
    return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 flex-wrap">
        <h3 className="text-lg font-bold text-slate-800">🗓️ 每日清掃蹤跡</h3>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={selectedHousekeeper}
          onChange={(e) => setSelectedHousekeeper(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">所有房務員</option>
          {housekeepers.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {sortedTasks.length === 0 ? (
          <div className="bg-slate-100 rounded-xl p-8 text-center text-slate-400">無清掃記錄</div>
        ) : sortedTasks.map((task, index) => (
          <div key={task.id} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${task.status === 'Completed' || task.status === 'Inspected' ? 'bg-emerald-500' :
                task.status === 'InProgress' ? 'bg-amber-500' : 'bg-rose-500'
                }`}></div>
              {index < sortedTasks.length - 1 && <div className="w-0.5 h-12 bg-slate-200"></div>}
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-lg font-bold text-slate-800">#{task.roomNumber}</span>
                  <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${task.taskType === 'VD' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {task.taskType === 'VD' ? '空髒' : '續住'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {task.housekeeperName || '未指派'}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex gap-4">
                <span>開始: {task.startedAt ? new Date(task.startedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                <span>完成: {task.completedAt ? new Date(task.completedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                {task.startedAt && task.completedAt && (
                  <span className="text-emerald-600">
                    耗時: {Math.round((new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 60000)} 分
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HousekeepingOps;
