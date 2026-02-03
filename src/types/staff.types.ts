/**
 * 員工與系統相關類型定義
 */

// 系統角色定義
export interface SystemRole {
    id: string;
    code: string;           // 角色代碼 (例如: 'GroupAdmin')
    name: string;           // 顯示名稱 (例如: '集團總管')
    description?: string;   // 角色說明
    level: number;          // 權限等級 (數字越小權限越大)
    isSystem: boolean;      // 是否為系統內建角色 (不可刪除)
    permissions?: string[]; // 權限列表 (未來擴充)
    createdAt?: string;
}

// StaffRole 改為 string 以支援動態角色
export type StaffRole = string;

// 預設系統角色代碼常量
export const DEFAULT_ROLES = {
    GROUP_ADMIN: 'GroupAdmin',
    HOTEL_ADMIN: 'HotelAdmin',
    DEPARTMENT_MANAGER: 'DepartmentManager',
    FINANCE: 'Finance',
    FRONT_DESK: 'FrontDesk'
} as const;

export interface Department {
    id: string;
    name: string;
    code: string;
    managerId?: string;
    managerName?: string;
    parentId?: string;
    createdAt?: string;
}

export interface Staff {
    id: string;
    hotelId: string;
    employeeId: string;
    name: string;
    role: StaffRole;
    title: string;
    authorizedHotels: string[];
    authorizedBuildings?: string[];  // 新增：授權館別
    featurePermissions?: string[];   // 新增：功能權限列表
    email?: string;
    lineId?: string;
    telegramId?: string;
    wechatId?: string;
    departmentId?: string;
    departmentName?: string;
    supervisorId?: string;
    supervisorName?: string;
    delegateId?: string;
    delegateName?: string;
}

// 功能權限定義
export interface FeaturePermission {
    code: string;           // 功能代碼 (對應 TabType)
    name: string;           // 功能名稱
    category: string;       // 分類
    icon: string;           // 圖示
    sortOrder: number;      // 排序
}

// 員工功能權限
export interface StaffFeaturePermission {
    staffId: string;
    featureCode: string;
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

export type VIPLevel = 'Normal' | 'Silver' | 'Gold' | 'Diamond';

export interface Guest {
    id: string;
    name: string;
    idNumber: string;
    phone: string;
    vipLevel: VIPLevel;
    isBlacklisted: boolean;
    preferences: string;
    gender: 'Male' | 'Female' | 'Other';
    nationality: string;
    blacklistReason?: string;
    modificationLogs: any[];
    taxId?: string;
    companyName?: string;
    vehicleInfo?: string; // Legacy
    // 身分證件照片 (Base64 encoded)
    idCardFront?: string;     // 身分證正面
    idCardBack?: string;      // 身分證反面
    healthInsuranceCard?: string; // 健保卡
    passportOrPermit?: string; // 護照或居留證 (外國人)
}

export interface AuditLogEntry {
    id: number;
    timestamp: string;
    action: string;
    staffName: string;
    staff: string;
    hotel: string;
    impact: string;
}
