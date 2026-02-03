import { supabase } from '../config/supabase';
import { AccountingService } from './AccountingService';
import {
    Invoice, Reservation, Hotel, JournalEntry, Staff, Room
} from '@/types';

export class InvoiceService {
    /**
     * 開立發票
     */
    static async issueInvoice(params: {
        amount: number;
        reservationId?: string;
        buyerId?: string;
        selectedHotelId: string;
        reservations: Reservation[];
        selectedOldReservation: Reservation | null;
        selectedRoomId: string | null;
        hotelRooms: Room[];
        invoices: Invoice[];
        currentUser: Staff;
        journalEntries: JournalEntry[];
    }) {
        const {
            amount, reservationId, buyerId, selectedHotelId, reservations,
            selectedOldReservation, selectedRoomId, hotelRooms, currentUser, journalEntries
        } = params;

        if (!selectedHotelId) throw new Error("未選擇飯店");

        let res: Reservation | undefined;
        if (reservationId) res = reservations.find(r => r.id === reservationId);
        if (!res && selectedOldReservation) res = selectedOldReservation;
        if (!res && selectedRoomId) res = hotelRooms.find(r => r.id === selectedRoomId)?.current_order;

        if (!res) throw new Error("無法確認訂單資訊");

        // 1. Get Sequence
        const { data: seqData, error: seqError } = await supabase.from('invoice_sequences').select('*').eq('hotel_id', res.hotelId).single();
        if (seqError || !seqData) throw new Error('尚未配置發票字軌');

        // 2. Create Invoice
        const currentNumber = seqData.current_number;
        const invNo = `${seqData.prefix}-${currentNumber.toString().padStart(8, '0')}`;
        const invId = `INV-${Date.now()}`;
        const tax = Math.round(amount * 0.05);
        const netAmount = amount - tax;

        const { error: insertError } = await supabase.from('invoices').insert({
            id: invId,
            hotel_id: res.hotelId,
            reservation_id: res.id,
            invoice_number: invNo,
            amount,
            tax,
            net_amount: netAmount,
            status: 'Active',
            created_at: new Date().toISOString(),
            created_by: currentUser.name
        });
        if (insertError) throw insertError;

        // 3. Update Sequence
        await supabase.from('invoice_sequences').update({ current_number: currentNumber + 1 }).eq('hotel_id', res.hotelId);

        const newInv: Invoice = {
            id: invId, hotelId: res.hotelId!, reservationId: res.id, invoiceNumber: invNo, amount, tax, netAmount,
            status: 'Active', createdAt: new Date().toISOString(), createdBy: currentUser.name, buyerId
        };

        // 4. Auto Journal From Invoice
        await AccountingService.createJournalFromInvoice(newInv, res.hotelId!, currentUser.id);

        // 5. Update related transaction journal entries description
        try {
            const { data: txData } = await supabase.from('transactions').select('id').eq('reservation_id', res.id);
            const txIds = txData?.map(t => t.id) || [];
            if (txIds.length > 0) {
                const { data: relatedEntries } = await supabase.from('journal_entries').select('*').eq('hotel_id', res.hotelId).eq('status', 'Draft').in('source_id', txIds);
                if (relatedEntries) {
                    for (const entry of relatedEntries) {
                        let updatedDescription = (entry.description || '').replace(/(📋 )?發票:\s*尚未開票/g, `$1發票: ${invNo}`);
                        if (updatedDescription === entry.description && !updatedDescription.includes(invNo)) updatedDescription += `\n發票: ${invNo}`;
                        if (updatedDescription !== entry.description) {
                            await supabase.from('journal_entries').update({ description: updatedDescription }).eq('id', entry.id);
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Update related journals description failed:', err);
        }

        return newInv;
    }

    /**
     * 作廢發票
     */
    static async voidInvoice(params: {
        invoiceId: string;
        reason: string;
        invoices: Invoice[];
    }) {
        const { invoiceId, reason, invoices } = params;
        const voidedInvoice = invoices.find(inv => inv.id === invoiceId);
        if (!voidedInvoice) throw new Error("找不到發票");

        // 1. Update Invoice Status
        const { error: invError } = await supabase.from('invoices').update({ status: 'Voided' }).eq('id', invoiceId);
        if (invError) throw invError;

        // 2. Void Journal Entry
        await AccountingService.voidJournalEntryBySource(invoiceId, reason);

        // 3. Update related transaction journal entries
        if (voidedInvoice.reservationId) {
            try {
                const { data: txData } = await supabase.from('transactions').select('id').eq('reservation_id', voidedInvoice.reservationId);
                const txIds = txData?.map(t => t.id) || [];
                if (txIds.length > 0) {
                    const { data: relatedEntries } = await supabase.from('journal_entries').select('*').eq('status', 'Draft').in('source_id', txIds);
                    if (relatedEntries) {
                        for (const entry of relatedEntries) {
                            let updatedDesc = entry.description || '';
                            if (updatedDesc.includes('已作廢')) continue;

                            const invNo = voidedInvoice.invoiceNumber;
                            if (updatedDesc.includes(invNo)) {
                                updatedDesc = updatedDesc.replace(new RegExp(`(發票[:：]\\s*${invNo})`, 'g'), `$1 (已作廢)`);
                            } else if (/發票[:：]\s*尚未開票/.test(updatedDesc.replace(/：/g, ':'))) {
                                updatedDesc = updatedDesc.replace(/發票[:：]\s*尚未開票/g, `發票: ${invNo} (已作廢)`);
                            } else {
                                updatedDesc += `\n發票: ${invNo} (已作廢)`;
                            }

                            if (updatedDesc !== entry.description) {
                                await supabase.from('journal_entries').update({ description: updatedDesc }).eq('id', entry.id);
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('Update related journals on void failed:', err);
            }
        }
    }

    /**
     * 刪除發票
     */
    static async deleteInvoice(invoiceId: string) {
        const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
        if (error) throw error;
    }
}
