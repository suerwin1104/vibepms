/**
 * 模擬數據常數
 */

import { Hotel, Building, Room, Guest, Transaction, Reservation, Invoice } from '../types';
import { InvoiceSequence } from '../types/reservation.types';
import { Staff } from '../types/staff.types';

// 基礎飯店定義 (範本)
export const MOCK_HOTELS: Hotel[] = [
    { id: 'H1', name: 'VibeChain 台北信義館', code: 'TPE', address: '台北市信義區 7 號', phone: '02-1111-2222' },
    { id: 'H2', name: 'VibeChain 台中旗艦店', code: 'TXG', address: '台中市西屯區 9 號', phone: '04-3333-4444' },
    { id: 'H3', name: 'VibeChain 高雄駁二店', code: 'KHH', address: '高雄市鹽埕區 1 號', phone: '07-5555-6666' },
];

export const MOCK_STAFF: Staff[] = [
    { id: 's0', hotelId: '', employeeId: 'CEO01', name: '集團總管-蘇菲', role: 'GroupAdmin', title: '執行長', authorizedHotels: ['H1', 'H2', 'H3'] },
    { id: 's1', hotelId: 'H1', employeeId: 'FD101', name: '台北櫃檯-阿強', role: 'FrontDesk', title: '資深專員', authorizedHotels: ['H1'] },
    { id: 's2', hotelId: 'H1', employeeId: 'FD102', name: '台北櫃檯-小玲', role: 'FrontDesk', title: '櫃檯專員', authorizedHotels: ['H1'] },
    { id: 's3', hotelId: 'H2', employeeId: 'FD201', name: '台中櫃檯-小美', role: 'FrontDesk', title: '資深專員', authorizedHotels: ['H2'] },
    { id: 's4', hotelId: 'H2', employeeId: 'FD202', name: '台中櫃檯-阿明', role: 'FrontDesk', title: '櫃檯專員', authorizedHotels: ['H2'] },
    { id: 's5', hotelId: 'H3', employeeId: 'FD301', name: '高雄櫃檯-老王', role: 'FrontDesk', title: '資深專員', authorizedHotels: ['H3'] },
    { id: 's6', hotelId: 'H3', employeeId: 'FD302', name: '高雄櫃檯-阿傑', role: 'FrontDesk', title: '櫃檯專員', authorizedHotels: ['H3'] },
];

// 其餘動態數據將由 DatabaseManagement 引擎產生
export const MOCK_BUILDINGS: Building[] = [];
export const MOCK_ROOMS: Room[] = [];
export const MOCK_GUESTS: Guest[] = [];
export const MOCK_RESERVATIONS: Reservation[] = [];
export const MOCK_TRANSACTIONS: Transaction[] = [];
export const MOCK_INVOICES: Invoice[] = [];
export const MOCK_INVOICE_SEQUENCES: InvoiceSequence[] = [];
