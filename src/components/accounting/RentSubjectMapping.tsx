import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { ChartOfAccount, RoomType } from '../../types';

interface Props {
    hotelId: string;
    accounts: ChartOfAccount[];
}

interface Mapping {
    id: string;
    hotel_id: string;
    category: string;
    type_id: string | null;
    account_code: string;
}

const CATEGORIES = [
    { key: 'RENT_DEFAULT', label: '房租收入 (預設)', description: '所有房型的預設房租收入科目' },
    { key: 'LATE_FEE', label: '加時費用', description: '延遲退房產生的加時費' },
    { key: 'CLEANING_FEE', label: '清潔費用', description: '額外收取的清潔費' },
    { key: 'DEPOSIT', label: '預收訂金', description: '收取的訂金 (負債類)' },
    { key: 'PETTY_CASH', label: '零用金 (預設)', description: '從零用金支出時的貸方科目' },
];

const RentSubjectMapping: React.FC<Props> = ({ hotelId, accounts }) => {
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [hotelId]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Mappings
            const { data: mappingsData, error: mapError } = await supabase
                .from('accounting_mappings')
                .select('*')
                .eq('hotel_id', hotelId);

            if (mapError) throw mapError;
            setMappings(mappingsData || []);

            // Fetch Room Types (if we want per-room-type mapping later)
            // For now, let's keep it simple with global settings, but built-in support for Room Type Specifics
            const { data: rtData } = await supabase.from('room_types').select('*').eq('hotel_id', hotelId);
            setRoomTypes(rtData || []);

        } catch (error) {
            console.error('Error fetching mappings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMapping = async (category: string, typeId: string | null, accountCode: string) => {
        const key = `${category}-${typeId || 'global'}`;
        setSaving(key);
        try {
            // Upsert
            const existing = mappings.find(m => m.category === category && m.type_id === typeId);

            if (existing) {
                if (!accountCode) {
                    // Delete if cleared
                    await supabase.from('accounting_mappings').delete().eq('id', existing.id);
                    setMappings(prev => prev.filter(m => m.id !== existing.id));
                } else {
                    const { error } = await supabase
                        .from('accounting_mappings')
                        .update({ account_code: accountCode })
                        .eq('id', existing.id);
                    if (error) throw error;
                    setMappings(prev => prev.map(m => m.id === existing.id ? { ...m, account_code: accountCode } : m));
                }
            } else {
                if (!accountCode) return; // Don't create empty
                const { data, error } = await supabase
                    .from('accounting_mappings')
                    .insert({
                        hotel_id: hotelId,
                        category,
                        type_id: typeId,
                        account_code: accountCode
                    })
                    .select()
                    .single();

                if (error) throw error;
                setMappings(prev => [...prev, data]);
            }

        } catch (error) {
            console.error('Error saving mapping:', error);
            alert('儲存失敗');
        } finally {
            setSaving(null);
        }
    };

    const getMappingValue = (category: string, typeId: string | null) => {
        return mappings.find(m => m.category === category && m.type_id === typeId)?.account_code || '';
    };

    const relevantAccounts = accounts; // Allow all accounts, though typically Revenue/Liabilities

    if (loading) return <div className="p-8 text-center text-slate-500">載入中...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">房租與費用相關科目設定</h2>
                <p className="text-sm text-slate-500">設定房租收入、加時費及其他自動產生費用的對應科目</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">

                {/* Global Settings */}
                <div className="space-y-6">
                    <h3 className="font-bold text-slate-700 border-b pb-2">通用設定</h3>

                    {CATEGORIES.map(cat => (
                        <div key={cat.key} className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">
                                {cat.label}
                                <span className="block text-xs text-slate-400 font-normal">{cat.description}</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={getMappingValue(cat.key, null)}
                                    onChange={(e) => handleUpdateMapping(cat.key, null, e.target.value)}
                                    disabled={saving === `${cat.key}-global`}
                                    className="w-full text-sm border-slate-200 rounded-md py-2 pl-3 pr-8 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                                >
                                    <option value="">請選擇科目 (未設定則使用系統預設)</option>
                                    {relevantAccounts.map(acc => (
                                        <option key={acc.id} value={acc.code}>
                                            {acc.code} - {acc.name}
                                        </option>
                                    ))}
                                </select>
                                {saving === `${cat.key}-global` && (
                                    <div className="absolute right-8 top-2.5 w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Room Type Specific Settings (Optional) */}
                <div className="space-y-6">
                    <h3 className="font-bold text-slate-700 border-b pb-2 flex justify-between items-center">
                        <span>個別房型房租收入 (選填)</span>
                        <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded">若未設定則使用通用房租設定</span>
                    </h3>

                    {roomTypes.map(rt => (
                        <div key={rt.id} className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">{rt.name}</label>
                            <div className="relative">
                                <select
                                    value={getMappingValue('RENT_ROOM_TYPE', rt.id)}
                                    onChange={(e) => handleUpdateMapping('RENT_ROOM_TYPE', rt.id, e.target.value)}
                                    disabled={saving === `RENT_ROOM_TYPE-${rt.id}`}
                                    className="w-full text-sm border-slate-200 rounded-md py-2 pl-3 pr-8 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                                >
                                    <option value="">使用通用設定</option>
                                    {relevantAccounts.map(acc => (
                                        <option key={acc.id} value={acc.code}>
                                            {acc.code} - {acc.name}
                                        </option>
                                    ))}
                                </select>
                                {saving === `RENT_ROOM_TYPE-${rt.id}` && (
                                    <div className="absolute right-8 top-2.5 w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default RentSubjectMapping;
