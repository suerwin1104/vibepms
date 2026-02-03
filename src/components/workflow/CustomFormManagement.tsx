import React, { useState, useEffect } from 'react';
import { CustomForm, CustomFormField, FormFieldType, Staff } from '../../types';
import { supabase } from '../../config/supabase';
import { CustomFormService } from '../../services/CustomFormService';
import { Trash2, Plus, Edit, Save, ArrowLeft, FileText, Settings, Hash } from 'lucide-react';

interface Props {
    currentUser: Staff | null;
    onRefresh?: () => Promise<void>;
}

const CustomFormManagement: React.FC<Props> = ({ currentUser, onRefresh }) => {
    const [forms, setForms] = useState<CustomForm[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentForm, setCurrentForm] = useState<Partial<CustomForm>>({});

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const data = await CustomFormService.getForms();
            setForms(data);
        } catch (error) {
            console.error('Error fetching forms:', error);
        }
    };

    const handleCreateNew = async () => {
        const nextCode = await CustomFormService.generateNextCode();

        // Generate 10 default fields
        const defaultFields: CustomFormField[] = Array.from({ length: 10 }).map((_, i) => ({
            id: crypto.randomUUID(),
            label: `欄位 ${i + 1}`,
            type: 'Text',
            required: false
        }));

        setCurrentForm({
            code: nextCode,
            title: '',
            description: '',
            fields: defaultFields,
            isActive: true,
            createdBy: currentUser?.id
        });
        setIsEditing(true);
    };

    const handleEdit = (form: CustomForm) => {
        setCurrentForm(form);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('確定要刪除此表單嗎？')) return;
        try {
            await CustomFormService.deleteForm(id);
            fetchForms();
            if (onRefresh) await onRefresh();
        } catch (error: any) {
            alert('刪除失敗: ' + error.message);
        }
    };

    const handleSave = async () => {
        if (!currentForm.title) {
            alert('請輸入表單標題');
            return;
        }

        try {
            if (currentForm.id) {
                await CustomFormService.updateForm(currentForm.id, currentForm);
            } else {
                await CustomFormService.createForm({
                    title: currentForm.title!,
                    description: currentForm.description || '',
                    fields: currentForm.fields || [],
                    isActive: currentForm.isActive ?? true,
                    createdBy: currentUser?.id || ''
                });
            }
            setIsEditing(false);
            fetchForms();
            if (onRefresh) await onRefresh();
        } catch (error: any) {
            alert('儲存失敗: ' + error.message);
        }
    };

    const addField = () => {
        const newField: CustomFormField = {
            id: crypto.randomUUID(),
            label: '新欄位',
            type: 'Text',
            required: false
        };
        setCurrentForm(prev => ({ ...prev, fields: [...(prev.fields || []), newField] }));
    };

    const updateField = (id: string, updates: Partial<CustomFormField>) => {
        setCurrentForm(prev => ({
            ...prev,
            fields: prev.fields?.map(f => f.id === id ? { ...f, ...updates } : f)
        }));
    };

    const removeField = (id: string) => {
        setCurrentForm(prev => ({
            ...prev,
            fields: prev.fields?.filter(f => f.id !== id)
        }));
    };

    if (isEditing) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setIsEditing(false)} className="flex items-center text-slate-500 hover:text-slate-700">
                        <ArrowLeft className="w-5 h-5 mr-1" /> 返回列表
                    </button>
                    <h2 className="text-xl font-bold">{currentForm.id ? '編輯表單' : '新增表單'}</h2>
                    <button onClick={handleSave} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" /> 儲存表單
                    </button>
                </div>

                <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-slate-700 mb-1">表單編碼</label>
                        <div className="flex items-center px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono text-sm">
                            <Hash className="w-4 h-4 mr-2 text-slate-400" />
                            {currentForm.code}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">表單標題 *</label>
                        <input
                            value={currentForm.title}
                            onChange={e => setCurrentForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="例如: 出差申請單"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">說明</label>
                        <input
                            value={currentForm.description}
                            onChange={e => setCurrentForm(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="表單用途說明"
                        />
                    </div>

                    <div className="border-t pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">欄位設計</h3>
                            <button onClick={addField} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg flex items-center text-sm font-medium">
                                <Plus className="w-4 h-4 mr-1" /> 新增欄位
                            </button>
                        </div>

                        <div className="space-y-4">
                            {currentForm.fields?.map((field, idx) => (
                                <div key={field.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <span className="mt-2 w-6 h-6 flex items-center justify-center bg-slate-200 rounded-full text-xs font-bold text-slate-600">
                                        {idx + 1}
                                    </span>

                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs text-slate-500 mb-1">欄位名稱</label>
                                            <input
                                                value={field.label}
                                                onChange={e => updateField(field.id, { label: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-md text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">類型</label>
                                            <select
                                                value={field.type}
                                                onChange={e => updateField(field.id, { type: e.target.value as FormFieldType })}
                                                className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                                            >
                                                <option value="Text">文字</option>
                                                <option value="Number">數字</option>
                                                <option value="Textarea">多行文字</option>
                                                <option value="Date">日期</option>
                                                <option value="Select">下拉選單</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center pt-6">
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={e => updateField(field.id, { required: e.target.checked })}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">必填</span>
                                            </label>
                                        </div>

                                        {field.type === 'Select' && (
                                            <div className="md:col-span-4 transition-all">
                                                <label className="block text-xs text-slate-500 mb-1">選項 (用逗號分隔)</label>
                                                <input
                                                    value={field.options?.join(',')}
                                                    onChange={e => updateField(field.id, { options: e.target.value.split(',') })}
                                                    placeholder="例如: 事假,病假,特休"
                                                    className="w-full px-3 py-2 border rounded-md text-sm border-amber-200 bg-amber-50"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={() => removeField(field.id)} className="text-slate-400 hover:text-red-500 p-2 mt-1">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}

                            {(!currentForm.fields || currentForm.fields.length === 0) && (
                                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    尚無欄位，請點擊上方按鈕新增
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">📋 表單設計</h2>
                    <p className="text-slate-500">建立與管理自訂簽核表單</p>
                </div>
                <button onClick={handleCreateNew} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all hover:scale-105 active:scale-95">
                    <Plus className="w-4 h-4 mr-2" /> 新增表單
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {forms.map(form => (
                    <div key={form.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button onClick={() => handleEdit(form)} className="p-2 bg-slate-100 rounded-full hover:bg-blue-50 hover:text-blue-600 text-slate-600" title="編輯">
                                <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(form.id)} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-600 text-slate-600" title="刪除">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{form.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                        {form.code}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${form.isActive ? 'bg-green-100 text-green-700 font-bold' : 'bg-slate-100 text-slate-500'}`}>
                                        {form.isActive ? '啟用中' : '已停用'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p className="text-slate-500 text-sm mb-4 h-10 line-clamp-2">
                            {form.description || '無說明'}
                        </p>

                        <div className="flex items-center text-xs text-slate-400 border-t pt-4">
                            <span className="flex items-center mr-4">
                                <Settings className="w-3 h-3 mr-1" /> {form.fields?.length || 0} 個欄位
                            </span>
                            <span>
                                建立於: {new Date(form.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}

                {forms.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <FileText className="w-10 h-10" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">尚無自訂表單</h3>
                        <p className="text-slate-500 mb-6">點擊上方按鈕開始建立第一個表單</p>
                        <button onClick={handleCreateNew} className="px-6 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-slate-400 hover:bg-slate-50 font-medium">
                            建立新表單
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomFormManagement;
