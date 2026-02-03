/**
 * 訂房與交易相關類型定義
 */

import { RoomType } from './room.types';

export type ReservationStatus = 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled' | 'Pending';

export interface Reservation {
    id: string;
    hotelId: string;
    buildingId: string;
    guestId: string;
    guestName: string;
    phone: string;
    idNumber: string;
    checkIn: string;
    checkOut: string;
    roomNumber: string;
    roomType: RoomType;
    status: ReservationStatus;
    source: string;
    totalPrice: number;
    paidAmount: number;
    discount: number;
    note: string;
    lastEditedBy: string;
    createdAt?: string;
    updatedAt?: string; // Add updatedAt for sorting by recently modified
    // 新增 Legacy Fields
    licensePlate?: string;
    companyName?: string;
    groupBookingId?: string;
    purposeOfVisit?: string;
    bookingAgent?: string;
    adults?: number;
    children?: number;
    /** @deprecated handled as BillableItem now */
    depositAmount?: number;
    carModel?: string;
    // Late Stage Legacy Fields
    roomRent?: number;
    extraItems?: number;
    addBed?: number;
    /** @deprecated handled as BillableItem now */
    paymentMethod?: string;
    /** @deprecated handled as BillableItem now */
    creditCard?: string;
    petType?: string;
    petCount?: number;
    petNote?: string;
}

export interface Invoice {
    id: string;
    hotelId: string;
    reservationId: string;
    invoiceNumber: string;
    amount: number;
    tax: number;
    netAmount: number;
    status: 'Active' | 'Voided';
    buyerId?: string; // 統一編號 (Business Tax ID)
    createdAt: string;
    createdBy: string;
}

export interface ConsumptionItem {
    id: string;
    name: string;
    price: number;
    category: string;
    accounting_code: string;
    is_active: boolean;
}

export interface BillableItem {
    id: string;
    reservationId: string;
    description: string;
    amount: number;
    quantity: number;
    paymentMethod?: string; // 新增：每筆消費的付款方式
    note?: string; // 新增：每筆消費的個別備註
    createdAt: string;
    createdBy: string;
}

export interface InvoiceSequence {
    hotelId: string;
    prefix: string;
    currentNumber: number;
}

export type PaymentMethod = 'Cash' | 'CreditCard' | 'Transfer' | 'Other' | 'BankTransfer' | 'Deposit' | 'Adjustment';

export interface Transaction {
    id: string;
    hotelId: string;
    reservationId: string;
    amount: number;
    type: 'Payment' | 'Refund' | 'Adjustment';
    method: PaymentMethod;
    description: string;
    date?: string; // Logic date (YYYY-MM-DD)
    note?: string;
    createdAt: string;
    staffName: string;
}

export interface HandoverRecord {
    id: string;
    hotelId: string;
    staffId: string;
    staffName: string;
    content: string;
    rowCount: number;
    createdAt: string;
}
