import React, { useState, useEffect } from 'react';
import { CustomForm, CustomFormField, Staff } from '../../types';
import { supabase } from '../../config/supabase';
import { CustomFormService } from '../../services/CustomFormService';
import { Save, Plus, FileSpreadsheet, Key, Calendar, User } from 'lucide-react';

interface Props {
    formId: string;
    currentUser: Staff | null;
}

const GenericCustomFormPage: React.FC<Props> = ({ formId, currentUser }) => {
    const [definition, setDefinition] = useState<CustomForm | null>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [formId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch definition
            const { data: defData, error: defError } = await supabase
                .from('custom_forms')
                .select('*')
                .eq('id', formId)
                .single();

            if (defError) throw defError;
            setDefinition({
                id: defData.id,
                code: defData.code,
                title: defData.title,
                description: defData.description,
                fields: defData.fields,
                isActive: defData.is_active,
                createdBy: defData.created_by,
                createdAt: defData.created_at
            });

            // Fetch submissions
            const subData = await CustomFormService.getSubmissions(formId);
            setSubmissions(subData || []);
        } catch (error) {
            console.error('Error fetching custom form data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!definition) return;

        try {
            // System generate entry key/number
            const timestamp = Date.now();
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const documentNumber = `${definition.code}-${timestamp}-${randomSuffix}`;

            const submission = {
                id: crypto.randomUUID(),
                form_id: formId,
                form_title: definition.title,
                data: formData,
                submitted_by: currentUser?.id,
                submitted_by_name: currentUser?.name || 'Unknown',
                submitted_at: new Date().toISOString(),
                status: 'Approved', // Default to approved if no workflow
                document_number: documentNumber
            };

            const { error } = await supabase.from('custom_form_submissions').insert(submission);
            if (error) throw error;

            alert(`資料已儲存！單號: ${documentNumber}`);
            setIsAdding(false);
            setFormData({});
            fetchData();
        } catch (error: any) {
            alert('儲存失敗: ' + error.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 italic">載入中...</div>;
    if (!definition) return <div className="p-8 text-center text-red-500 font-bold">找不到表單定義</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-blue-600 text-white rounded-xl shadow-lg ring-4 ring-blue-50">
                            <FileSpreadsheet size={24} />
                        </span>
                        {definition.title}
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {definition.code}
                        </span>
                    </h2>
                    <p className="text-slate-500 mt-2 text-sm font-medium">{definition.description || '自定義單據管理'}</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black transition-all shadow-md active:scale-95 ${isAdding ? 'bg-slate-200 text-slate-600' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'
                        }`}
                >
                    {isAdding ? '取消' : <><Plus size={20} /> 新增資料</>}
                </button>
            </div>

            {isAdding && (
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {definition.fields.map(field => (
                                <div key={field.id} className="space-y-1.5">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                                    </label>
                                    {field.type === 'Text' && (
                                        <input
                                            type="text"
                                            required={field.required}
                                            onChange={e => handleInputChange(field.id, e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        />
                                    )}
                                    {field.type === 'Number' && (
                                        <input
                                            type="number"
                                            required={field.required}
                                            onChange={e => handleInputChange(field.id, e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        />
                                    )}
                                    {field.type === 'Date' && (
                                        <input
                                            type="date"
                                            required={field.required}
                                            onChange={e => handleInputChange(field.id, e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm"
                                        />
                                    )}
                                    {field.type === 'Textarea' && (
                                        <textarea
                                            required={field.required}
                                            rows={3}
                                            onChange={e => handleInputChange(field.id, e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        />
                                    )}
                                    {field.type === 'Select' && (
                                        <select
                                            required={field.required}
                                            onChange={e => handleInputChange(field.id, e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm appearance-none"
                                        >
                                            <option value="">-- 請選擇 --</option>
                                            {field.options?.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:-translate-y-1 active:translate-y-0"
                            >
                                儲存資料
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">系統編號 (Key)</th>
                                {definition.fields.slice(0, 5).map(f => (
                                    <th key={f.id} className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</th>
                                ))}
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">提交人</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">提交日期</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {submissions.map(sub => (
                                <tr key={sub.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <Key size={14} className="text-slate-300" />
                                            <span className="text-xs font-mono font-bold text-slate-600">{sub.document_number}</span>
                                        </div>
                                    </td>
                                    {definition.fields.slice(0, 5).map(f => (
                                        <td key={f.id} className="px-6 py-5 text-sm text-slate-600 font-medium">{sub.data[f.id] || '-'}</td>
                                    ))}
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600 uppercase">
                                                {sub.submitted_by_name?.[0]}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{sub.submitted_by_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-xs text-slate-400 font-bold whitespace-nowrap">
                                        {new Date(sub.submitted_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {submissions.length === 0 && (
                                <tr>
                                    <td colSpan={definition.fields.length + 3} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                        尚無數據記錄
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GenericCustomFormPage;
