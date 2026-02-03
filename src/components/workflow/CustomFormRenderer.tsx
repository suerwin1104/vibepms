import React, { useState, useEffect } from 'react';
import { CustomForm, CustomFormField, CustomFormSubmission, Staff } from '../../types';
import { supabase } from '../../config/supabase';
import { Save, Send } from 'lucide-react';

interface Props {
    formId: string;
    currentUser: Staff | null;
    onSuccess: () => void;
    onCancel: () => void;
}

const CustomFormRenderer: React.FC<Props> = ({ formId, currentUser, onSuccess, onCancel }) => {
    const [formDef, setFormDef] = useState<CustomForm | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchFormDef();
    }, [formId]);

    const fetchFormDef = async () => {
        const { data, error } = await supabase.from('custom_forms').select('*').eq('id', formId).single();
        if (data) {
            setFormDef(data);
            // Initialize default values
            const initialData: Record<string, any> = {};
            data.fields?.forEach((f: CustomFormField) => {
                initialData[f.id] = '';
            });
            setFormData(initialData);
        }
        setLoading(false);
    };

    const handleChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async () => {
        if (!formDef || !currentUser) return;

        // Validation
        const errors: string[] = [];
        formDef.fields.forEach(field => {
            if (field.required && !formData[field.id]) {
                errors.push(`${field.label} 為必填`);
            }
        });

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }

        setSubmitting(true);

        try {
            // 1. Create Submission Record
            const submissionId = crypto.randomUUID();
            const documentNumber = `FORM-${Date.now().toString().slice(-6)}`; // Simple generation

            const { error: submitError } = await supabase.from('custom_form_submissions').insert({
                id: submissionId,
                form_id: formDef.id,
                data: formData,
                submitted_by: currentUser.id,
                submitted_by_name: currentUser.name,
                status: 'Pending',
                document_number: documentNumber
            });

            if (submitError) throw submitError;

            // 2. Find Workflow Definition for 'CUSTOM_FORM'
            // Ideally we match specific workflow, for now simply find ANY active workflow for CUSTOM_FORM
            // In a real app, we'd filter by some subtype or form ID mapping
            const { data: wfs } = await supabase
                .from('workflow_definitions')
                .select('*')
                .eq('document_category', 'CUSTOM_FORM')
                .eq('is_active', true);

            // Basic matching logic: try to find one with substring match in name, or default to first
            const matchedWf = wfs?.find(w => w.name.includes(formDef.title)) || wfs?.[0];

            if (matchedWf) {
                // 3. Create Workflow Instance
                const { error: wfError } = await supabase.from('workflow_instances').insert({
                    id: crypto.randomUUID(),
                    workflow_id: matchedWf.id,
                    workflow_name: matchedWf.name,
                    document_id: submissionId,
                    document_type: 'CUSTOM_FORM',
                    document_number: documentNumber,
                    current_step: 1,
                    status: 'Pending',
                    initiated_by: currentUser.name,
                    initiated_at: new Date().toISOString()
                });
                if (wfError) console.error('Workflow creation failed', wfError);
            } else {
                alert('注意: 尚未設定此類表單的簽核流程，單據已儲存但未進入簽核。');
            }

            alert('提交成功！');
            onSuccess();
        } catch (e: any) {
            alert('提交失敗: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>載入中...</div>;
    if (!formDef) return <div>找不到表單定義</div>;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-2">{formDef.title}</h2>
            <p className="text-slate-500 mb-6">{formDef.description}</p>

            <div className="space-y-6">
                {formDef.fields.map(field => (
                    <div key={field.id}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>

                        {field.type === 'Text' && (
                            <input
                                type="text"
                                value={formData[field.id]}
                                onChange={e => handleChange(field.id, e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        )}

                        {field.type === 'Number' && (
                            <input
                                type="number"
                                value={formData[field.id]}
                                onChange={e => handleChange(field.id, parseFloat(e.target.value))}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        )}

                        {field.type === 'Date' && (
                            <input
                                type="date"
                                value={formData[field.id]}
                                onChange={e => handleChange(field.id, e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        )}

                        {field.type === 'Textarea' && (
                            <textarea
                                value={formData[field.id]}
                                onChange={e => handleChange(field.id, e.target.value)}
                                rows={4}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            />
                        )}

                        {field.type === 'Select' && (
                            <select
                                value={formData[field.id]}
                                onChange={e => handleChange(field.id, e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="">請選擇</option>
                                {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
                <button onClick={onCancel} className="px-6 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                    取消
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {submitting ? '提交中...' : <><Send className="w-4 h-4 mr-2" /> 提交申請</>}
                </button>
            </div>
        </div>
    );
};

export default CustomFormRenderer;
