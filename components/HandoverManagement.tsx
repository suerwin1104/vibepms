
import React, { useState, useMemo, useEffect } from 'react';
import { HandoverRecord, Staff, Hotel } from '../types';
import { supabase } from '../supabase';
import Pagination from './Pagination';

interface HandoverManagementProps {
    currentUser: Staff;
    selectedHotelId: string;
    hotels: Hotel[];
}

const HandoverManagement: React.FC<HandoverManagementProps> = ({ currentUser, selectedHotelId, hotels }) => {
    const [records, setRecords] = useState<HandoverRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [content, setContent] = useState('');
    const [searchDateStart, setSearchDateStart] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [searchDateEnd, setSearchDateEnd] = useState(new Date().toISOString().split('T')[0]);
    const [searchStaff, setSearchStaff] = useState('全部');
    const [keyword, setKeyword] = useState('');

    const [viewingRecord, setViewingRecord] = useState<HandoverRecord | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('handover_records')
                .select('*')
                .eq('hotel_id', selectedHotelId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setRecords((data || []).map(r => ({
                id: r.id,
                hotelId: r.hotel_id,
                staffId: r.staff_id,
                staffName: r.staff_name,
                content: r.content,
                rowCount: r.row_count,
                createdAt: r.created_at
            })));
        } catch (e) {
            console.error('Fetch handovers failed:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [selectedHotelId]);

    const canEditRecord = useMemo(() => {
        if (!viewingRecord) return true; // 新增模式
        const isSameStaff = viewingRecord.staffId === currentUser.id;
        const isToday = new Date(viewingRecord.createdAt).toDateString() === new Date().toDateString();
        return isSameStaff && isToday;
    }, [viewingRecord, currentUser.id]);

    const handleSave = async () => {
        // 如果是查看模式且不可編輯，則不執行
        if (viewingRecord && !canEditRecord) return;

        // 如果是在查看模式下編輯，我們需要同步正在編輯的內容
        const contentToSave = viewingRecord ? viewingRecord.content : content;

        if (!contentToSave.trim()) {
            alert('請輸入交待事項');
            return;
        }

        const rowCount = contentToSave.split('\n').length;
        const isUpdate = !!viewingRecord;
        const id = isUpdate ? viewingRecord.id : `HO-${Date.now()}`;
        const timestamp = isUpdate ? viewingRecord.createdAt : new Date().toISOString();

        try {
            const { error } = await supabase.from('handover_records').upsert({
                id: id,
                hotel_id: selectedHotelId,
                staff_id: currentUser.id,
                staff_name: currentUser.name,
                content: contentToSave,
                row_count: rowCount,
                created_at: timestamp
            });

            if (error) throw error;

            const savedRecord: HandoverRecord = {
                id,
                hotelId: selectedHotelId,
                staffId: currentUser.id,
                staffName: currentUser.name,
                content: contentToSave,
                rowCount: rowCount,
                createdAt: timestamp
            };

            if (isUpdate) {
                setRecords(prev => prev.map(r => r.id === id ? savedRecord : r));
                setViewingRecord(savedRecord);
                alert('交班紀錄已更新');
            } else {
                setRecords([savedRecord, ...records]);
                setContent('');
                alert('交班紀錄已存檔');
            }
        } catch (e: any) {
            alert(`存檔失敗: ${e.message}`);
        }
    };

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const dateStr = r.createdAt.split('T')[0];
            const matchDate = dateStr >= searchDateStart && dateStr <= searchDateEnd;
            const matchStaff = searchStaff === '全部' || r.staffName === searchStaff;
            const matchKeyword = !keyword || r.content.includes(keyword) || r.staffName.includes(keyword);
            return matchDate && matchStaff && matchKeyword;
        });
    }, [records, searchDateStart, searchDateEnd, searchStaff, keyword]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchDateStart, searchDateEnd, searchStaff, keyword]);

    const displayRecords = useMemo(() => {
        return filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filteredRecords, currentPage]);

    const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);

    const staffNames = useMemo(() => {
        const names = new Set(records.map(r => r.staffName));
        return ['全部', ...Array.from(names)];
    }, [records]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)]">
            {/* 左側：編輯與目前資訊 */}
            <div className="flex-1 bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-slate-800">
                                {viewingRecord ? (canEditRecord ? '修改交班紀錄' : '查看紀錄詳情') : '當前交班資訊'}
                            </h2>
                            {viewingRecord && canEditRecord && (
                                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">編輯模式</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setContent(''); setViewingRecord(null); }} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">新增紀錄</button>
                            {(!viewingRecord || canEditRecord) && (
                                <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                                    {viewingRecord ? '確認修改' : '確認存檔'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">日期時間 (Record Date)</span>
                            <span className="font-mono font-bold text-slate-700">
                                {viewingRecord ? new Date(viewingRecord.createdAt).toLocaleString() : new Date().toLocaleString()}
                            </span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">櫃檯人員 (Staff)</span>
                            <span className="font-bold text-blue-600">
                                {viewingRecord ? viewingRecord.staffName : currentUser.name}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">交待事項 (Handover Content)</label>
                        <span className="text-[10px] font-bold text-slate-400">
                            行數: {viewingRecord ? viewingRecord.rowCount : content.split('\n').length}
                        </span>
                    </div>
                    <textarea
                        readOnly={viewingRecord ? !canEditRecord : false}
                        value={viewingRecord ? viewingRecord.content : content}
                        onChange={(e) => {
                            if (viewingRecord) {
                                setViewingRecord({ ...viewingRecord, content: e.target.value, rowCount: e.target.value.split('\n').length });
                            } else {
                                setContent(e.target.value);
                            }
                        }}
                        placeholder="請輸入需要交接的事項、客訴處理、特殊需求或是設備狀態..."
                        className={`flex-1 w-full p-4 rounded-3xl border-2 ${viewingRecord && !canEditRecord ? 'bg-slate-50 border-transparent text-slate-600 cursor-not-allowed' : 'border-slate-100 focus:border-blue-500 focus:ring-0'} resize-none text-sm font-medium leading-relaxed transition-all`}
                    />
                </div>
            </div>

            {/* 右側：歷史搜尋 */}
            <div className="w-full lg:w-[400px] bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-900 text-white">
                    <h2 className="text-lg font-black mb-4">歷史交班檢索</h2>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 block mb-1">起始日期</label>
                                <input type="date" value={searchDateStart} onChange={e => setSearchDateStart(e.target.value)} className="w-full bg-slate-800 border-none rounded-lg p-2 text-xs text-white" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 block mb-1">結束日期</label>
                                <input type="date" value={searchDateEnd} onChange={e => setSearchDateEnd(e.target.value)} className="w-full bg-slate-800 border-none rounded-lg p-2 text-xs text-white" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">人員篩選</label>
                            <select value={searchStaff} onChange={e => setSearchStaff(e.target.value)} className="w-full bg-slate-800 border-none rounded-lg p-2 text-xs text-white">
                                {staffNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                        <div className="relative">
                            <input
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                placeholder="搜尋關鍵字..."
                                className="w-full bg-slate-800 border-none rounded-lg pl-8 pr-2 py-2 text-xs text-white"
                            />
                            <span className="absolute left-2 top-2.5 opacity-50 text-[10px]">🔍</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto divide-y divide-slate-50">
                    {isLoading ? (
                        <div className="p-10 text-center text-slate-400 text-xs italic">載入中...</div>
                    ) : displayRecords.map(r => (
                        <div
                            key={r.id}
                            onClick={() => setViewingRecord(r)}
                            className={`p-4 hover:bg-blue-50 cursor-pointer transition-colors group ${viewingRecord?.id === r.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-600">{new Date(r.createdAt).toLocaleString()}</span>
                                <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">{r.id.split('-')[0]}</span>
                            </div>
                            <div className="text-sm font-black text-slate-700">{r.staffName}</div>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-snug">{r.content}</p>
                        </div>
                    ))}
                    {!isLoading && displayRecords.length === 0 && (
                        <div className="p-10 text-center text-slate-300 text-xs italic">查無符合條件的紀錄</div>
                    )}
                </div>
                <div style={{ padding: '0 16px 16px 16px' }}>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            </div>
        </div>
    );
};

export default HandoverManagement;
