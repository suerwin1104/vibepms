
import React, { useState, useMemo } from 'react';
import { Room, Building, RoomStatus, Housekeeper, Hotel } from '../types';
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
    return selectedBuildingId === 'All' ? rooms : rooms.filter(r => r.buildingId === selectedBuildingId);
  }, [rooms, selectedBuildingId]);

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
      {/* 館別標籤切換 */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setSelectedBuildingId('All')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedBuildingId === 'All' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          🏙️ 所有區域
        </button>
        {buildings.map(b => (
          <button
            key={b.id}
            onClick={() => setSelectedBuildingId(b.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedBuildingId === b.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            🏢 {b.name}
          </button>
        ))}
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
