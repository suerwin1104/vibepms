/**
 * 房間相關類型定義
 */

export enum RoomStatus {
    VC = 'VC', // Vacant Clean
    VD = 'VD', // Vacant Dirty
    OC = 'OC', // Occupied
    OOO = 'OOO', // Out of Order
    SO = 'SO'  // Stay Over Cleaning
}

// export type RoomType = 'Single' | 'Double' | 'Deluxe' | 'Suite';
export type RoomType = string;

export interface RoomTypeDefinition {
    id: string;
    hotelId: string; // 歸屬飯店
    name: string;    // e.g. "豪華房 (Deluxe)"
    code: string;    // e.g. "DLX"
    description?: string;
    isActive?: boolean;
    createdAt?: string;
}

export interface Hotel {
    id: string;
    name: string;
    code: string;
    address: string;
    phone: string;
    checkoutTime?: string;  // 退房時間 (HH:MM)，預設 "11:00"
    checkinTime?: string;   // 入住時間 (HH:MM)，預設 "15:00"
    lateFeeThresholdHours?: number; // 延滯門檻小時數，預設 6
    isActive?: boolean; // 館別啟用狀態，預設 true
}

export interface Country {
    code: string;
    name_en: string;
    name_zh: string;
    sort_order: number;
}

export interface Building {
    id: string;
    hotelId: string;
    name: string;
    code: string;
    isActive?: boolean; // 大樓啟用狀態，預設 true
}

export interface Room {
    id: string;
    hotelId: string;
    buildingId: string;
    number: string;
    type: RoomType;
    status: RoomStatus;
    floor: number;
    housekeeper: string;
    basePrice: number;
    lateFeePerHour?: number; // 每小時超時費用（例如 $500）
    lateFeePerDay?: number; // 每日延滯費用（滿6小時改收這個）
    description: string;
    current_order_id?: string;
    current_order?: import('./reservation.types').Reservation;
    latest_note?: RoomNote; // 新增：最新房間註記
}

export interface RoomNote {
    id: string;
    roomId: string;
    hotelId: string;
    content: string;
    staffName: string;
    createdAt: string;
}

export interface CleaningTask {
    id: string;
    roomNumber: string;
    type: 'VD' | 'SO';
    priority: 'High' | 'Normal';
    status: 'Unassigned' | 'InProgress' | 'Completed';
    housekeeperName?: string;
    startTime?: string;
    duration?: number;
    auditScore?: number;
    exceptions?: string[];
    notes?: string;
}

export type HousekeeperStatus = 'Active' | 'OnLeave' | 'Resigned';

export interface Housekeeper {
    id: string;
    hotelId: string;
    employeeId: string;
    name: string;
    phone: string;
    status: HousekeeperStatus;
    assignedFloor: string;
    cleanedToday: number;
    authorizedBuildings?: string[];
}
