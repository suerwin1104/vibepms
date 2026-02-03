
import React, { useState, useMemo } from 'react';
import { Room, Building, RoomStatus, Housekeeper, Hotel, RoomTypeDefinition } from '../../types';
import RoomCard from './RoomCard';

interface CleaningTaskInfo {
  id: string;
  roomId: string;
  status: 'Unassigned' | 'InProgress' | 'Completed' | 'Inspected';
  housekeeperName?: string;
  housekeeperId?: string;
  taskType?: 'VD' | 'SO' | 'DND';
}

interface RoomGridProps {
  rooms: Room[];
  buildings: Building[];
  hotel?: Hotel;  // 新增：飯店參數用於延滯計算
  roomTypes?: RoomTypeDefinition[]; // 新增：房型定義用於顯示詳細名稱
  onRoomClick: (r: Room) => void;
  cleaningTasks?: CleaningTaskInfo[];
  housekeepers?: Housekeeper[];
  onAssignHousekeeper?: (taskId: string, housekeeperId: string, housekeeperName: string) => void;
  onUnassignHousekeeper?: (taskId: string) => void;
  onCheckIn?: (reservationId: string) => void;
  onCancelCheckIn?: (reservationId: string) => void;
  recentlyUpdatedRooms?: Set<string>; // 即時更新標記
}

const RoomGrid: React.FC<RoomGridProps> = ({
  rooms,
  buildings,
  hotel,
  roomTypes,
  onRoomClick,
  cleaningTasks = [],
  housekeepers = [],
  onAssignHousekeeper,
  onUnassignHousekeeper,
  onCheckIn,
  onCancelCheckIn,
  recentlyUpdatedRooms = new Set()
}) => {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('All');

  const filtered = useMemo(() => {
    let result = selectedBuildingId === 'All' ? [...rooms] : rooms.filter(r => r.buildingId === selectedBuildingId);

    // Create a map for fast building name lookup
    const buildingMap = new Map(buildings.map(b => [b.id, b.name]));

    // Sort by Hotel -> Building Name -> Room Number
    return result.sort((a, b) => {
      // 1. Hotel
      if (a.hotelId !== b.hotelId) {
        return a.hotelId.localeCompare(b.hotelId);
      }
      // 2. Building Name
      const bNameA = buildingMap.get(a.buildingId) || '';
      const bNameB = buildingMap.get(b.buildingId) || '';
      if (bNameA !== bNameB) {
        return bNameA.localeCompare(bNameB);
      }
      // 3. Room Number (Numeric sort)
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    });
  }, [rooms, buildings, selectedBuildingId]);

  // Create a map of roomId -> cleaningTask for quick lookup
  // Priority: Unassigned > InProgress > Completed/Inspected (show pending tasks first)
  const tasksByRoomId = useMemo(() => {
    const map: Record<string, CleaningTaskInfo> = {};
    const priorityOrder = { 'Unassigned': 0, 'InProgress': 1, 'Completed': 2, 'Inspected': 3 };

    cleaningTasks.forEach(t => {
      const existing = map[t.roomId];
      if (!existing) {
        // No task for this room yet, use this one
        map[t.roomId] = t;
      } else {
        // Compare priority - prefer uncompleted tasks
        const existingPriority = priorityOrder[existing.status] ?? 99;
        const newPriority = priorityOrder[t.status] ?? 99;
        if (newPriority < existingPriority) {
          map[t.roomId] = t;
        }
      }
    });
    return map;
  }, [cleaningTasks]);


  return (
    <div className="space-y-6">
      {/* 館別標籤切換 (下拉選單化以節省空間) */}
      <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 w-fit shadow-sm">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">📍 區域篩選:</span>
        <select
          value={selectedBuildingId}
          onChange={(e) => setSelectedBuildingId(e.target.value)}
          className="bg-slate-50 border border-slate-100 text-slate-900 text-sm font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-white transition-colors min-w-[160px]"
        >
          <option value="All">🏙️ 所有區域 (All Buildings)</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>
              🏢 {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filtered.map(r => {
          const task = tasksByRoomId[r.id];
          // Only show cleaning info if room is not clean (VC)
          const shouldShowCleaningInfo = task && r.status !== RoomStatus.VC;
          const cleaningInfo = shouldShowCleaningInfo ? {
            taskId: task.id,
            status: task.status,
            housekeeperName: task.housekeeperName,
            housekeeperId: task.housekeeperId,
            taskType: task.taskType
          } : undefined;

          return (
            <RoomCard
              key={r.id}
              room={r}
              hotel={hotel}
              roomTypes={roomTypes}
              onClick={onRoomClick}
              cleaningInfo={cleaningInfo}
              housekeepers={housekeepers}
              onAssignHousekeeper={onAssignHousekeeper}
              onUnassignHousekeeper={onUnassignHousekeeper}
              onCheckIn={onCheckIn}
              onCancelCheckIn={onCancelCheckIn}
              isUpdated={recentlyUpdatedRooms.has(r.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RoomGrid;
