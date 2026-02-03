/**
 * 狀態配置常數
 */

import { RoomStatus } from '../types/room.types';

export const STATUS_COLORS: Record<RoomStatus, string> = {
    [RoomStatus.VC]: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    [RoomStatus.VD]: 'bg-amber-50 text-amber-600 border-amber-100',
    [RoomStatus.OC]: 'bg-blue-50 text-blue-600 border-blue-100',
    [RoomStatus.OOO]: 'bg-rose-50 text-rose-600 border-rose-100',
    [RoomStatus.SO]: 'bg-purple-50 text-purple-600 border-purple-100',
};

export const STATUS_LABELS: Record<RoomStatus, string> = {
    [RoomStatus.VC]: '空淨房 (VC)',
    [RoomStatus.VD]: '空髒房 (VD)',
    [RoomStatus.OC]: '住客房 (OC)',
    [RoomStatus.OOO]: '維修房 (OOO)',
    [RoomStatus.SO]: '續住房 (SO)',
};
