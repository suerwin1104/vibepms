/**
 * 通用類型定義
 */

export type TabType =
    | 'Dashboard'
    | 'DailyArrivals'
    | 'Reservations'
    | 'Accounting'
    | 'Guests'
    | 'HotelSettings'
    | 'Staff'
    | 'RoleManagement'       // 角色管理
    | 'DepartmentManagement' // 部門管理
    | 'ActivityLog'
    | 'HotelManagement'
    | 'BuildingManagement'
    | 'RoomSettings'
    | 'DatabaseManagement'
    | 'Handover'
    | 'Housekeeping'
    | 'Inventory'        // 庫存管理
    | 'Procurement'      // 採購管理
    | 'GoodsManagement'  // 進出貨管理
    | 'StockTransfer'    // 調撥管理
    | 'PettyCash'        // 零用金管理
    | 'Workflow'         // 流程簽核
    | 'DocumentSearch'   // 單據查詢
    | 'InvoiceSequence' // 發票字軌管理
    | 'PermissionManagement' // 權限管理
    | 'CustomFormView' // 自定義單據檢視
    | 'MissionControl'; // 任務控制中心
