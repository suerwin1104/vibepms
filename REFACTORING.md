# VibePMS 專案重構說明

## 專案結構

```
c:\vibepms\
├── src\                           # 主要源碼目錄
│   ├── components\                # React 元件
│   │   ├── common\                # 共用元件 (Modal, Pagination, etc.)
│   │   ├── layout\                # 佈局元件 (Sidebar, Navbar, LoginScreen)
│   │   ├── dashboard\             # 房態看板相關 (RoomGrid, RoomCard, etc.)
│   │   ├── reservation\           # 訂房相關 (ReservationForm, OrderDetailsModal, etc.)
│   │   ├── accounting\            # 會計相關 (Accounting, ChartOfAccounts, etc.)
│   │   ├── housekeeping\          # 房務相關 (HousekeepingOps, HandoverManagement, etc.)
│   │   ├── procurement\           # 採購相關 (ProcurementManagement, DocumentDetailsModal)
│   │   ├── inventory\             # 庫存相關 (InventoryManagement, GoodsManagement, etc.)
│   │   ├── workflow\              # 流程相關 (WorkflowManagement)
│   │   ├── settings\              # 設定相關 (HotelManagement, StaffManagement, etc.)
│   │   └── index.ts               # 元件總索引
│   ├── services\                  # 服務層
│   │   ├── AccountingService.ts   # 會計服務
│   │   ├── RealtimeService.ts     # 即時更新服務
│   │   ├── WorkflowService.ts     # 流程簽核服務
│   │   └── index.ts               # 服務索引
│   ├── utils\                     # 工具函數
│   │   ├── documentPermissions.ts # 文件權限工具
│   │   └── index.ts               # 工具索引
│   ├── types\                     # 類型定義
│   │   ├── room.types.ts          # 房間相關類型
│   │   ├── reservation.types.ts   # 訂房相關類型
│   │   ├── accounting.types.ts    # 會計相關類型
│   │   ├── staff.types.ts         # 員工相關類型
│   │   ├── inventory.types.ts     # 庫存相關類型
│   │   ├── procurement.types.ts   # 採購相關類型
│   │   ├── workflow.types.ts      # 流程相關類型
│   │   ├── common.types.ts        # 通用類型
│   │   └── index.ts               # 類型索引
│   ├── constants\                 # 常數定義
│   │   ├── mock-data.ts           # 模擬數據
│   │   ├── status-config.ts       # 狀態配置
│   │   └── index.ts               # 常數索引
│   ├── config\                    # 配置
│   │   ├── supabase.ts            # Supabase 配置
│   │   └── index.ts               # 配置索引
│   ├── hooks\                     # 自訂 Hooks (待擴充)
│   ├── App.tsx                    # 主應用程式
│   ├── index.tsx                  # 入口點 (唯一)
│   └── index.css                  # 全域樣式
├── index.html                     # HTML 模板 (指向 src/index.tsx)
├── vite.config.ts                 # Vite 配置
├── package.json                   # 專案配置
└── tsconfig.json                  # TypeScript 配置
```

## 入口點

**專案唯一入口點**：`src/index.tsx`

此檔案負責：
1. 掛載 React 應用程式到 DOM
2. 渲染 `<App />` 元件

## Import 路徑別名

在 `vite.config.ts` 中配置了路徑別名：
- `@` -> `src/`

使用範例：
```typescript
import { supabase } from '@/config/supabase';
import { Staff } from '@/types';
```

## 模組化結構說明

### 元件 (Components)
每個子目錄都有一個 `index.ts` 索引檔案，方便統一導出：

```typescript
// 從 common 目錄導入
import { Modal, Pagination } from '@/components/common';

// 從 layout 目錄導入
import { Sidebar, Navbar } from '@/components/layout';
```

### 類型 (Types)
類型按功能領域拆分，並透過索引統一導出：

```typescript
// 統一導入所有類型
import { Hotel, Room, Reservation, Staff } from '@/types';

// 或指定模組導入
import { JournalEntry } from '@/types/accounting.types';
```

### 服務 (Services)
服務層處理與後端的通訊和業務邏輯：

```typescript
import { AccountingService, WorkflowService, realtimeService } from '@/services';
```

## 開發指令

- `npm run dev` - 啟動開發伺服器 (http://localhost:3000)
- `npm run build` - 建置生產版本
- `npm run preview` - 預覽生產版本

## 備註

- 原有的根目錄元件檔案 (`/components/*.tsx`) 仍保留作為備份
- 原有的服務檔案 (`/services/*.ts`) 仍保留作為備份
- 重構後所有 import 路徑已更新，請使用 `src/` 目錄下的新結構
