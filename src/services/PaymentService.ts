import { supabase } from '../config/supabase';
import { AccountingService } from './AccountingService';
import {
    Reservation, Hotel, Invoice, BillableItem, ChartOfAccount, JournalEntry,
    PaymentMethod, Staff
} from '@/types';

export class PaymentService {
    /**
     * 按支付方式決定借方科目
     */
    private static getPaymentAccountCode(payMethod: PaymentMethod): string {
        switch (payMethod) {
            case 'Cash': return '1101';
            case 'CreditCard': return '1102';
            case 'Transfer': return '1102';
            default: return '1101';
        }
    }

    /**
     * 收入科目對照表
     */
    private static readonly revenueAccountMap: Record<string, string> = {
        '房租': '4101', '房費': '4101', '住宿': '4101',
        '餐飲': '4102', '餐費': '4102', '伙食': '4102',
        '電話': '4103', '電話費': '4103',
        '零食': '4102', '飲料': '4102', '迷你吧': '4102',
        '洗衣': '4103', '其他': '4103',
        '延滯費': '4101', '溢收': '4103',
    };

    /**
     * 執行收款邏輯
     */
    static async collectPayment(params: {
        resId: string;
        amount: number;
        method: PaymentMethod;
        currentUser: Staff;
        reservations: Reservation[];
        hotels: Hotel[];
        invoices: Invoice[];
        billableItems: BillableItem[];
        chartOfAccounts: ChartOfAccount[];
        journalEntries: JournalEntry[];
    }) {
        const {
            resId, amount, method, currentUser, reservations, hotels,
            invoices, billableItems, chartOfAccounts, journalEntries
        } = params;

        const res = reservations.find(r => r.id === resId);
        if (!res) throw new Error(`找不到訂單資料 (Reservation not found: ${resId})`);

        const hotel = hotels.find(h => h.id === res.hotelId);
        const hotelCode = hotel?.code || hotel?.name || '未知飯店';

        const activeInvoice = invoices.find(i => i.reservationId === resId && i.status === 'Active');
        const invoiceNumber = activeInvoice?.invoiceNumber || '尚未開票';

        const resBillableItems = billableItems.filter(b => b.reservationId === resId);
        const txId = `TX-${Date.now()}`;
        const newPaidAmount = (res.paidAmount || 0) + amount;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // 1. 插入交易記錄
        const { error: txError } = await supabase.from('transactions').insert({
            id: txId,
            hotel_id: res.hotelId,
            reservation_id: resId,
            amount,
            type: 'Payment',
            method,
            description: '櫃檯收款',
            created_at: now.toLocaleString(),
            staff_name: currentUser.name
        });
        if (txError) throw txError;

        // 2. 更新訂單已付金額
        const { error: resError } = await supabase.from('reservations').update({ paid_amount: newPaidAmount }).eq('id', resId);
        if (resError) throw resError;

        // 3. 處理傳票
        const paymentAccountCode = this.getPaymentAccountCode(method);
        const paymentAcc = chartOfAccounts.find(a => a.code === paymentAccountCode);

        // 計算各科目金額
        const creditEntries: { accountCode: string; accountName: string; amount: number; description: string }[] = [];
        const totalBillable = resBillableItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
        const roomRent = res.totalPrice || 0;
        const totalDue = roomRent + totalBillable;
        const previouslyPaid = res.paidAmount || 0;
        const balance = totalDue - previouslyPaid;

        const isOverpayment = amount > balance && balance >= 0;
        const overpaymentAmount = isOverpayment ? (amount - balance) : (balance < 0 ? amount : 0);
        const actualPaymentAmount = isOverpayment ? balance : (balance > 0 ? amount : 0);

        if (actualPaymentAmount > 0 && totalDue > 0) {
            const roomRentRatio = roomRent / totalDue;
            const roomRentAmount = Math.round(actualPaymentAmount * roomRentRatio);
            if (roomRentAmount > 0) {
                creditEntries.push({ accountCode: '4101', accountName: '房租收入', amount: roomRentAmount, description: `房租收入 - ${res.roomNumber}房` });
            }

            resBillableItems.forEach(item => {
                const itemTotal = item.amount * item.quantity;
                const itemRatio = itemTotal / totalDue;
                const itemAmount = Math.round(actualPaymentAmount * itemRatio);
                if (itemAmount > 0) {
                    let accountCode = '4103';
                    for (const [keyword, code] of Object.entries(this.revenueAccountMap)) {
                        if (item.description.includes(keyword)) { accountCode = code; break; }
                    }
                    const existingEntry = creditEntries.find(e => e.accountCode === accountCode);
                    if (existingEntry) {
                        existingEntry.amount += itemAmount;
                        if (!existingEntry.description.includes(item.description)) existingEntry.description += `, ${item.description}`;
                    } else {
                        const acc = chartOfAccounts.find(a => a.code === accountCode);
                        creditEntries.push({ accountCode, accountName: acc?.name || '其他營業收入', amount: itemAmount, description: item.description });
                    }
                }
            });
        } else if (actualPaymentAmount > 0 && totalDue <= 0) {
            creditEntries.push({ accountCode: '4101', accountName: '房租收入', amount: actualPaymentAmount, description: `房租收入 - ${res.roomNumber}房` });
        }

        if (overpaymentAmount > 0) {
            creditEntries.push({ accountCode: '4103', accountName: '其他營業收入', amount: overpaymentAmount, description: `溢收款項 - ${res.roomNumber}房` });
        }

        // 確保借貸平衡
        const totalCredits = creditEntries.reduce((sum, e) => sum + e.amount, 0);
        if (Math.abs(amount - totalCredits) > 0 && creditEntries.length > 0) {
            creditEntries[creditEntries.length - 1].amount += (amount - totalCredits);
        } else if (creditEntries.length === 0 && amount > 0) {
            creditEntries.push({ accountCode: '4103', accountName: '其他營業收入', amount: amount, description: `收款 - ${res.roomNumber}房` });
        }

        // 尋找現有草稿傳票
        const existingDraftEntry = journalEntries.find(e =>
            String(e.hotelId) === String(res.hotelId) && e.status === 'Draft' && e.entryDate === dateStr &&
            ((e.sourceType as any) === 'Payment' || (e.sourceType as any) === 'System') &&
            (e.description?.includes(`訂單: ${resId}`) || e.description?.includes(`房號: ${res.roomNumber}`) || e.description?.includes(`${res.roomNumber}房`))
        );

        if (existingDraftEntry) {
            // 更新傳票
            const existingLines = existingDraftEntry.lines || [];
            const updatedDebitLines: { accountId: string; amount: number }[] = existingLines.filter(l => l.debitAmount > 0).map(l => ({ accountId: l.accountId, amount: l.debitAmount }));
            if (paymentAcc) {
                const line = updatedDebitLines.find(l => l.accountId === paymentAcc.id);
                if (line) line.amount += amount;
                else updatedDebitLines.push({ accountId: paymentAcc.id, amount: amount });
            }

            const updatedCreditLines: { accountId: string; accountCode: string; amount: number; description: string }[] = existingLines.filter(l => l.creditAmount > 0).map(l => ({
                accountId: l.accountId, accountCode: l.accountCode || '', amount: l.creditAmount, description: l.description || ''
            }));

            creditEntries.forEach(entry => {
                if (entry.amount <= 0) return;
                const existingCredit = updatedCreditLines.find(l => l.accountCode === entry.accountCode);
                if (existingCredit) {
                    existingCredit.amount += entry.amount;
                    const newItems = entry.description.split(', ').filter(item => !existingCredit.description.includes(item));
                    if (newItems.length > 0) existingCredit.description += `, ${newItems.join(', ')}`;
                } else {
                    const acc = chartOfAccounts.find(a => a.code === entry.accountCode) || chartOfAccounts.find(a => a.code === '4101');
                    if (acc) updatedCreditLines.push({ accountId: acc.id, accountCode: acc.code, amount: entry.amount, description: entry.description });
                }
            });

            const newTotalDebit = updatedDebitLines.reduce((sum, l) => sum + l.amount, 0);
            const newTotalCredit = updatedCreditLines.reduce((sum, l) => sum + l.amount, 0);
            const updatedDescription = [existingDraftEntry.description, `➕ ${timeStr} 追加收款: $${amount.toLocaleString()} (${method})`].join('\n');

            await supabase.from('journal_entry_lines').delete().eq('entry_id', existingDraftEntry.id);
            const newLines = [
                ...updatedDebitLines.map((l, i) => ({ entry_id: existingDraftEntry.id, line_number: i + 1, account_id: l.accountId, debit_amount: l.amount, credit_amount: 0, description: '收款 (Collection)' })),
                ...updatedCreditLines.map((l, i) => ({ entry_id: existingDraftEntry.id, line_number: i + updatedDebitLines.length + 1, account_id: l.accountId, debit_amount: 0, credit_amount: l.amount, description: l.description }))
            ];
            await supabase.from('journal_entry_lines').insert(newLines);
            await supabase.from('journal_entries').update({ description: updatedDescription, total_debit: newTotalDebit, total_credit: newTotalCredit, updated_at: new Date().toISOString() }).eq('id', existingDraftEntry.id);
        } else {
            // 建立新傳票
            const journalDescription = [
                `📅 ${dateStr} ${timeStr}`, `🏨 飯店: ${hotelCode} | 房號: ${res.roomNumber}`,
                `🔢 訂單: ${resId}`, `📋 發票: ${invoiceNumber}`,
                `💰 收款: $${amount.toLocaleString()} (${method})`
            ].join('\n');

            const journalLines: { accountId: string; description: string; debit: number; credit: number }[] = [];
            if (paymentAcc) journalLines.push({ accountId: paymentAcc.id, description: `${method}收款 - ${res.roomNumber}房 ${res.guestName}`, debit: amount, credit: 0 });
            creditEntries.forEach(entry => {
                const acc = chartOfAccounts.find(a => a.code === entry.accountCode);
                if (acc) journalLines.push({ accountId: acc.id, description: entry.description, debit: 0, credit: entry.amount });
            });

            if (journalLines.length < 2 && paymentAcc) {
                const defAcc = chartOfAccounts.find(a => a.code === '4101');
                if (defAcc) journalLines.push({ accountId: defAcc.id, description: `房租收入 - ${res.roomNumber}房`, debit: 0, credit: amount });
            }

            if (journalLines.length >= 2) {
                await AccountingService.createJournalEntry({
                    hotelId: res.hotelId!, date: dateStr, description: journalDescription, referenceId: txId,
                    type: 'Payment', lines: journalLines, status: 'Draft', createdBy: currentUser.id
                });
            }
        }

        return { txId, newPaidAmount };
    }
}
