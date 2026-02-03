import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import { Invoice, Hotel, Reservation, BillableItem, Transaction, Room } from '../../types';
import { Trash2, Filter, RefreshCw, Printer, X, Ban, RotateCcw } from 'lucide-react';

interface Props {
    initialHotelId?: string; // Default selected hotel filter, can be 'all' or empty
    hotels: Hotel[];
    onDeleteInvoice: (id: string) => Promise<void>;
    onUpdateInvoiceStatus?: (id: string, status: 'Active' | 'Voided') => Promise<void>;
    onPrint?: (inv: Invoice, layout: 'A4' | 'POS') => void;
}

type DateFilter = 'today' | '3days' | 'custom';
type StatusFilter = 'all' | 'Active' | 'Voided';



const PAGE_SIZE = 20;

const InvoiceOverview: React.FC<Props> = ({
    initialHotelId,
    hotels,
    onDeleteInvoice,
    onUpdateInvoiceStatus,
    onPrint
}) => {
    // State
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    // Filters
    const [dateFilter, setDateFilter] = useState<DateFilter>('today'); // Default optional? User asked for sorting by date, but logic? "日期篩選條件為，今日、三日內、自訂日期"
    // Default to today or all? Requirement says "List all invoices... sorted by date". Usually implies All time unless filtered?
    // User said "加入篩選條件... 今日、三日內、自訂日期". I will default to 'today' as it's common or maybe '3days'. 
    // Let's stick with 'today' as default for performance, or user might want to see everything by default?
    // "所有發票... 加入篩選條件". Maybe default is NO date filter? Or 'today'?
    // Let's make "All" an option or default to no filter if not specified.
    // Actually, standard practice for "Overview" is often "Today" or "Recent".
    // Let's add a "all" to date filter or just handle it.
    // The user prompt lists specific date filters: "今日、三日內、自訂日期". It didn't explicitly say "All Time".
    // I'll default to 'today' as it's safe and fast.
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    const [hotelFilter, setHotelFilter] = useState<string>('all'); // Requirement: Default to 'all'
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    // Source Data Modal State
    const [selectedInvoiceData, setSelectedInvoiceData] = useState<{
        reservation: Reservation | null;
        billableItems: BillableItem[];
        transactions: Transaction[];
        room: Room | null;
    } | null>(null);
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [loadingSource, setLoadingSource] = useState(false);

    // Fetch Logic
    const fetchInvoices = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            let query = supabase
                .from('invoices')
                .select('*', { count: 'exact' });

            // Apply Filters

            // Date Filter
            const now = new Date();
            let start: Date | null = null;
            let end: Date | null = null;

            if (dateFilter === 'today') {
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            } else if (dateFilter === '3days') {
                start = new Date();
                start.setDate(start.getDate() - 2); // Today + previous 2 days = 3 days range roughly? Or just strict 72h? usually beginning of day.
                start.setHours(0, 0, 0, 0);
                end = new Date();
                end.setHours(23, 59, 59, 999);
            } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
                start = new Date(customStartDate);
                start.setHours(0, 0, 0, 0);
                end = new Date(customEndDate);
                end.setHours(23, 59, 59, 999);
            }

            if (start) query = query.gte('created_at', start.toISOString());
            if (end) query = query.lte('created_at', end.toISOString());

            // Hotel Filter
            if (hotelFilter !== 'all') {
                query = query.eq('hotel_id', hotelFilter);
            }

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // Pagination
            const from = (page - 1) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            query = query
                .order('created_at', { ascending: false })
                .range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            if (data) {
                setInvoices(data.map(i => ({
                    id: i.id,
                    hotelId: i.hotel_id,
                    reservationId: i.reservation_id,
                    invoiceNumber: i.invoice_number,
                    amount: i.amount,
                    tax: i.tax,
                    netAmount: i.net_amount,
                    status: i.status,
                    createdAt: i.created_at,
                    createdBy: i.created_by
                })));

                if (count !== null) {
                    setHasMore(from + PAGE_SIZE < count);
                }
            }

        } catch (err) {
            console.error('Error fetching invoices:', err);
            alert('無法載入發票資料');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, dateFilter, customStartDate, customEndDate, hotelFilter, statusFilter]);

    // Initial Fetch & Filter Change
    useEffect(() => {
        setPage(1); // Reset page on filter change
        fetchInvoices();
    }, [dateFilter, customStartDate, customEndDate, hotelFilter, statusFilter]);

    // Page Change
    useEffect(() => {
        if (page > 1) { // Skip initial load as the above effect handles it
            fetchInvoices();
        }
    }, [page]); // Missing fetchInvoices dep, but it's useCallback

    const handleInvoiceClick = async (invoice: Invoice) => {
        if (!invoice.reservationId) {
            alert('此發票無關聯訂單資料');
            return;
        }
        setLoadingSource(true);
        setIsSourceModalOpen(true);
        try {
            // Fetch Reservation
            const { data: resData, error: resError } = await supabase
                .from('reservations')
                .select('*')
                .eq('id', invoice.reservationId)
                .single();

            if (resError) throw resError;

            // Map Reservation
            const reservation: Reservation = {
                id: resData.id,
                hotelId: resData.hotel_id,
                buildingId: resData.building_id,
                guestId: resData.guest_id,
                guestName: resData.guest_name,
                phone: resData.phone || '',
                idNumber: resData.id_number,
                checkIn: resData.check_in,
                checkOut: resData.check_out,
                roomNumber: resData.room_number,
                roomType: resData.room_type,
                status: resData.status,
                source: resData.source || '未知',
                totalPrice: resData.total_price,
                paidAmount: resData.paid_amount,
                lastEditedBy: resData.last_edited_by,
                createdAt: resData.created_at,
                updatedAt: resData.updated_at,
                discount: resData.discount || 0,
                note: resData.note || '',
                // Legacy & Other Fields (Optional mapping)
                depositAmount: resData.deposit_amount,
                paymentMethod: resData.payment_method
            };

            // Fetch Room
            let room: Room | null = null;
            if (resData.room_number && resData.hotel_id) {
                // Try to find room by number and hotel
                const { data: rData } = await supabase.from('rooms')
                    .select('*')
                    .eq('hotel_id', resData.hotel_id)
                    .eq('number', resData.room_number)
                    .single();

                if (rData) {
                    room = {
                        id: rData.id,
                        hotelId: rData.hotel_id,
                        buildingId: rData.building_id,
                        number: rData.number,
                        type: rData.type,
                        status: rData.status,
                        floor: rData.floor,
                        housekeeper: rData.housekeeper || '未指派',
                        basePrice: rData.base_price,
                        description: rData.description || ''
                    };
                }
            }

            // Fetch Billable Items
            const { data: billData } = await supabase.from('billable_items').select('*').eq('reservation_id', invoice.reservationId);
            const billableItems: BillableItem[] = (billData || []).map(b => ({
                id: b.id,
                reservationId: b.reservation_id,
                description: b.description,
                amount: b.amount,
                quantity: b.quantity,
                paymentMethod: b.payment_method,
                note: b.note,
                createdAt: b.created_at,
                createdBy: b.created_by
            }));

            // Fetch Transactions
            const { data: txData } = await supabase.from('transactions').select('*').eq('reservation_id', invoice.reservationId).order('created_at', { ascending: false });
            const transactions: Transaction[] = (txData || []).map(t => ({
                id: t.id,
                hotelId: t.hotel_id,
                reservationId: t.reservation_id,
                amount: t.amount,
                type: t.type,
                method: t.method,
                description: t.description || '',
                createdAt: t.created_at,
                staffName: t.staff_name
            }));

            setSelectedInvoiceData({
                reservation,
                billableItems,
                transactions,
                room
            });

        } catch (err) {
            console.error('Error fetching source data:', err);
            alert('無法載入原始單據資料或資料不完整');
            setIsSourceModalOpen(false);
        } finally {
            setLoadingSource(false);
        }
    };


    // Realtime Subscription
    useEffect(() => {
        console.log('[InvoiceOverview] Subscribing to realtime updates...');
        const channel = supabase
            .channel('invoice_overview_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'invoices'
                },
                (payload) => {
                    console.log('[InvoiceOverview] Realtime change detected:', payload);
                    // Simplified: Refresh list on any change
                    fetchInvoices(true);
                    fetchInvoices(true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchInvoices]);

    const handlePrevPage = () => {
        if (page > 1) setPage(p => p - 1);
    };

    const handleNextPage = () => {
        if (hasMore) setPage(p => p + 1);
    };

    return (
        <div className="space-y-6">
            {/* Filters & Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                        <Filter size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase">篩選</span>
                    </div>

                    {/* Date Filter */}
                    <select
                        className="p-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                    >
                        <option value="today">📅 今日</option>
                        <option value="3days">📅 近三日</option>
                        <option value="custom">📅 自訂日期</option>
                    </select>

                    {dateFilter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                className="p-2 border border-slate-200 rounded-lg text-sm"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="date"
                                className="p-2 border border-slate-200 rounded-lg text-sm"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Hotel Filter */}
                    <select
                        className="p-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={hotelFilter}
                        onChange={(e) => setHotelFilter(e.target.value)}
                    >
                        <option value="all">🏨 所有飯店</option>
                        {hotels.map(h => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        className="p-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    >
                        <option value="all">📝 所有狀態</option>
                        <option value="Active">已開立 (Active)</option>
                        <option value="Voided">已作廢 (Voided)</option>
                    </select>
                </div>

                <button
                    onClick={() => fetchInvoices(true)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="重新整理"
                >
                    <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Invoice List */}
                <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900 text-amber-500 text-[10px] uppercase font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-5">發票號碼</th>
                                    <th className="px-6 py-5">開立日期</th>
                                    <th className="px-6 py-5 text-right">金額</th>
                                    <th className="px-6 py-5 text-center">狀態</th>
                                    <th className="px-6 py-5">飯店</th>
                                    <th className="px-6 py-5">開立人</th>
                                    <th className="px-6 py-5 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && invoices.length === 0 ? (
                                    <tr><td colSpan={7} className="p-12 text-center text-slate-400">載入中...</td></tr>
                                ) : invoices.map(inv => {
                                    // Find hotel name
                                    const hotelName = hotels.find(h => h.id === inv.hotelId)?.name || 'Unknown';
                                    return (
                                        <tr key={inv.id} className="text-sm font-bold group hover:bg-slate-50 transition-colors">
                                            <td
                                                onClick={() => handleInvoiceClick(inv)}
                                                className="px-6 py-4 font-mono cursor-pointer text-blue-600 hover:underline hover:text-blue-800"
                                            >
                                                {inv.invoiceNumber}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(inv.createdAt).toLocaleString('zh-TW')}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black">${inv.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${inv.status === 'Voided' ? 'bg-red-50 text-red-600' :
                                                    'bg-green-50 text-green-600'
                                                    }`}>
                                                    {inv.status === 'Active' ? '已開立' : '已作廢'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs truncate max-w-[150px]" title={hotelName}>
                                                {hotelName}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 font-medium text-xs">{inv.createdBy}</td>
                                            <td className="px-6 py-4 text-center flex justify-center gap-2">
                                                {/* Print Button */}
                                                {onPrint && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onPrint(inv, 'A4'); // Default to A4 or provide option
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                                        title="列印發票"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                )}

                                                {/* Void / Restore Button */}
                                                {onUpdateInvoiceStatus && inv.status === 'Active' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`確定要作廢發票 ${inv.invoiceNumber} 嗎？`)) {
                                                                onUpdateInvoiceStatus(inv.id, 'Voided').then(() => fetchInvoices(true));
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                                                        title="作廢發票"
                                                    >
                                                        <Ban size={16} />
                                                    </button>
                                                )}

                                                {onUpdateInvoiceStatus && inv.status === 'Voided' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`確定要回復/重新開立發票 ${inv.invoiceNumber} 嗎？`)) {
                                                                onUpdateInvoiceStatus(inv.id, 'Active').then(() => fetchInvoices(true));
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                                        title="回復發票"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </button>
                                                )}

                                                {/* Delete Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm(`確定要刪除發票 ${inv.invoiceNumber} 嗎？此操作無法復原。`)) {
                                                            onDeleteInvoice(inv.id).then(() => {
                                                                fetchInvoices(true);
                                                            });
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                    title="刪除發票"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {!loading && invoices.length === 0 && (
                        <div className="p-24 text-center text-slate-300 italic">無符合條件的發票</div>
                    )}

                    {/* Pagination Controls */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">
                            第 {page} 頁
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={page === 1}
                                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                                上一頁
                            </button>
                            <button
                                onClick={handleNextPage}
                                disabled={!hasMore}
                                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                                下一頁
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Source Data Modal */}
            {isSourceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsSourceModalOpen(false)}>
                    <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">原始單據資料 (Source Data)</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">關聯訂單 ID:</span>
                                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                        {loadingSource ? 'Loading...' : selectedInvoiceData?.reservation?.id}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsSourceModalOpen(false)}
                                className="p-3 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto p-8 space-y-8 bg-slate-50/30 flex-1">
                            {loadingSource ? (
                                <div className="flex flex-col items-center justify-center h-40 space-y-3">
                                    <RefreshCw className="animate-spin text-blue-500" size={32} />
                                    <p className="text-sm font-bold text-slate-400">正在載入原始資料...</p>
                                </div>
                            ) : selectedInvoiceData ? (
                                <>
                                    {/* 1. Reservation Info */}
                                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                        <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            👤 訂房與房客資訊 (Reservation Info)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">房客姓名 (Guest)</p>
                                                <p className="text-lg font-black text-slate-800">{selectedInvoiceData.reservation?.guestName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">房號 (Room)</p>
                                                <p className="text-lg font-black text-slate-800">
                                                    {selectedInvoiceData.reservation?.roomNumber}
                                                    <span className="text-xs text-slate-400 font-medium ml-2">({selectedInvoiceData.reservation?.roomType})</span>
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">入住期間 (Stay Period)</p>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-emerald-600">In: {selectedInvoiceData.reservation?.checkIn.split(' ')[0]}</span>
                                                    <span className="text-sm font-bold text-rose-500">Out: {selectedInvoiceData.reservation?.checkOut.split(' ')[0]}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">所屬飯店 (Hotel)</p>
                                                <p className="text-lg font-black text-slate-800 break-words whitespace-normal leading-tight" title={hotels.find(h => h.id === selectedInvoiceData.reservation?.hotelId)?.name}>
                                                    {hotels.find(h => h.id === selectedInvoiceData.reservation?.hotelId)?.name || 'Unknown'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">訂單來源 (Source)</p>
                                                <p className="text-sm font-bold text-slate-700">{selectedInvoiceData.reservation?.source}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* 2. Billable Items */}
                                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-full">
                                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                                    🛒 消費明細 (Billable Items)
                                                </h4>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                                                        <tr>
                                                            <th className="px-4 py-3">項目</th>
                                                            <th className="px-4 py-3 text-right">數量</th>
                                                            <th className="px-4 py-3 text-right">單價</th>
                                                            <th className="px-4 py-3 text-right">總價</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {selectedInvoiceData.billableItems.length === 0 ? (
                                                            <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">無消費項目</td></tr>
                                                        ) : selectedInvoiceData.billableItems.map(item => (
                                                            <tr key={item.id} className="hover:bg-slate-50">
                                                                <td className="px-4 py-3 font-medium text-slate-700">
                                                                    {item.description}
                                                                    {item.note && <div className="text-[9px] text-slate-400">{item.note}</div>}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-mono">{item.quantity}</td>
                                                                <td className="px-4 py-3 text-right font-mono text-slate-500">${item.amount.toLocaleString()}</td>
                                                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">${(item.amount * item.quantity).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-slate-50 font-black">
                                                        <tr>
                                                            <td colSpan={3} className="px-4 py-3 text-right text-slate-500 uppercase text-[10px]">Total</td>
                                                            <td className="px-4 py-3 text-right text-slate-900 border-t-2 border-slate-200">
                                                                ${selectedInvoiceData.billableItems.reduce((sum, i) => sum + (i.amount * i.quantity), 0).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>

                                        {/* 3. Transactions */}
                                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-full">
                                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest">
                                                    💰 收款紀錄 (Transactions)
                                                </h4>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                                                        <tr>
                                                            <th className="px-4 py-3">日期</th>
                                                            <th className="px-4 py-3">方式</th>
                                                            <th className="px-4 py-3 text-right">金額</th>
                                                            <th className="px-4 py-3">經手人</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {selectedInvoiceData.transactions.length === 0 ? (
                                                            <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">無收款紀錄</td></tr>
                                                        ) : selectedInvoiceData.transactions.map(tx => (
                                                            <tr key={tx.id} className="hover:bg-emerald-50/30">
                                                                <td className="px-4 py-3 text-slate-500">
                                                                    {new Date(tx.createdAt).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-slate-700">
                                                                    {tx.method}
                                                                    <span className="text-[9px] bg-slate-100 px-1 rounded ml-1 text-slate-400">{tx.type}</span>
                                                                </td>
                                                                <td className={`px-4 py-3 text-right font-mono font-black ${tx.type === 'Refund' ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                                    {tx.type === 'Refund' ? '-' : '+'}${tx.amount.toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-500">{tx.staffName}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-emerald-50 font-black">
                                                        <tr>
                                                            <td colSpan={2} className="px-4 py-3 text-right text-emerald-600 uppercase text-[10px]">Total Paid</td>
                                                            <td className="px-4 py-3 text-right text-emerald-800 border-t-2 border-emerald-200">
                                                                ${selectedInvoiceData.transactions.reduce((sum, t) => sum + (t.type === 'Refund' ? -t.amount : t.amount), 0).toLocaleString()}
                                                            </td>
                                                            <td></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-12 text-slate-400">無法顯示資料</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceOverview;
