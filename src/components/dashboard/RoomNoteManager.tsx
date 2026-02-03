
import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Room, RoomNote, Staff } from '../../types';

interface Props {
    room: Room;
    currentUser: Staff;
    currentHotelId: string;
    onClose: () => void;
    onNoteChange?: () => void;
}

const RoomNoteManager: React.FC<Props> = ({ room, currentUser, currentHotelId, onClose, onNoteChange }) => {
    const [notes, setNotes] = useState<RoomNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchNotes();
    }, [room.id]);

    const isToday = (dateString: string) => {
        const d = new Date(dateString);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    };

    const todayNotes = notes.filter(n => isToday(n.createdAt));
    const historyNotes = notes.filter(n => !isToday(n.createdAt));

    const fetchNotes = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('room_notes')
                .select('*')
                .eq('room_id', room.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes((data || []).map(n => ({
                id: n.id,
                roomId: n.room_id,
                hotelId: n.hotel_id,
                content: n.content,
                staffName: n.staff_name,
                createdAt: n.created_at
            })));
        } catch (e) {
            console.error('Fetch notes failed:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        const tempId = `temp-${Date.now()}`;
        const optimisticNote: RoomNote = {
            id: tempId,
            roomId: room.id,
            hotelId: currentHotelId,
            content: newNote,
            staffName: currentUser.name,
            createdAt: new Date().toISOString()
        };

        try {
            // Optimistic update
            setNotes(prev => [optimisticNote, ...prev]);
            setNewNote('');

            const noteId = `note-${Date.now()}`;
            const { error } = await supabase.from('room_notes').insert({
                id: noteId,
                room_id: room.id,
                hotel_id: currentHotelId,
                content: optimisticNote.content,
                staff_name: currentUser.name
            });
            if (error) throw error;

            // Re-fetch to get real ID and server timestamp
            await fetchNotes(true);
            if (onNoteChange) onNoteChange();
        } catch (e: any) {
            // Rollback on error
            setNotes(prev => prev.filter(n => n.id !== tempId));
            alert(`新增失敗: ${e.message}`);
        }
    };

    const handleUpdateNote = async (id: string, content: string) => {
        try {
            const { error } = await supabase.from('room_notes').update({ content }).eq('id', id);
            if (error) throw error;
            setEditingNoteId(null);
            fetchNotes(true);
            if (onNoteChange) onNoteChange();
        } catch (e: any) {
            alert(`更新失敗: ${e.message}`);
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (!confirm('確定要刪除此筆註記嗎？')) return;
        try {
            const { error } = await supabase.from('room_notes').delete().eq('id', id);
            if (error) throw error;
            fetchNotes(true);
            if (onNoteChange) onNoteChange();
        } catch (e: any) {
            alert(`刪除失敗: ${e.message}`);
        }
    };

    const renderNote = (note: RoomNote, isHighlighted = false) => (
        <div key={note.id} className={`${isHighlighted ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'} border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <span className={`${isHighlighted ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'} text-[9px] font-black px-1.5 py-0.5 rounded uppercase`}>{note.staffName}</span>
                    <span className="text-[9px] text-slate-400 font-bold">{new Date(note.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingNoteId(note.id)} className="text-blue-500 text-[10px] font-black hover:underline uppercase">編輯</button>
                    <button onClick={() => handleDeleteNote(note.id)} className="text-rose-500 text-[10px] font-black hover:underline uppercase">刪除</button>
                </div>
            </div>

            {editingNoteId === note.id ? (
                <div className="space-y-2">
                    <textarea
                        defaultValue={note.content}
                        id={`edit-${note.id}`}
                        className="w-full p-2 border-2 border-blue-100 rounded-xl text-sm"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleUpdateNote(note.id, (document.getElementById(`edit-${note.id}`) as HTMLTextAreaElement).value)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black"
                        >更新</button>
                        <button
                            onClick={() => setEditingNoteId(null)}
                            className="bg-slate-200 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black"
                        >取消</button>
                    </div>
                </div>
            ) : (
                <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{note.content}</p>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-[600px] gap-4">
            {/* 頂部房號資訊 */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                    <h4 className="text-xl font-black text-slate-800">#{room.number} 房間註記</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{room.type} • {room.floor}F</p>
                </div>
                <div className="text-right">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">總筆數 ({notes.length})</span>
                </div>
            </div>

            {/* 新增註記區域 */}
            <div className="space-y-2">
                <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="在此輸入新的房務註記或特殊需求..."
                    className="w-full h-24 p-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 text-sm font-medium resize-none transition-all"
                />
                <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                    ➕ 儲存新註記
                </button>
            </div>

            {/* 清單區域 */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {isLoading ? (
                    <div className="flex justify-center py-10 opacity-20 animate-pulse font-black uppercase text-xs tracking-widest text-slate-400">Loading History...</div>
                ) : (
                    <>
                        {/* 當日註記 */}
                        {todayNotes.length > 0 && (
                            <div className="space-y-3">
                                <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                    今日註記
                                </h5>
                                {todayNotes.map(note => renderNote(note, true))}
                            </div>
                        )}

                        {/* 歷史紀錄折疊區域 */}
                        {historyNotes.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-100 transition-colors group"
                                >
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        📜 歷史紀錄 ({historyNotes.length})
                                    </span>
                                    <span className="text-slate-400 group-hover:text-slate-600 transition-transform duration-300" style={{ transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        ▼
                                    </span>
                                </button>

                                {showHistory && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {historyNotes.map(note => renderNote(note))}
                                    </div>
                                )}
                            </div>
                        )}

                        {notes.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                                <span className="text-3xl mb-2 sm:mb-2 opacity-20">📝</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">尚無紀錄</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default RoomNoteManager;
