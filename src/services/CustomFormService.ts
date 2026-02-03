import { supabase } from '../config/supabase';
import { CustomForm, CustomFormField } from '../types';

export const CustomFormService = {
    async getForms() {
        const { data, error } = await supabase
            .from('custom_forms')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map DB fields to camelCase if needed
        return (data || []).map(f => ({
            id: f.id,
            code: f.code,
            title: f.title,
            description: f.description,
            fields: f.fields,
            isActive: f.is_active,
            createdBy: f.created_by,
            createdAt: f.created_at
        })) as CustomForm[];
    },

    async generateNextCode(): Promise<string> {
        const { data, error } = await supabase
            .from('custom_forms')
            .select('code')
            .order('code', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) return 'CF-001';

        const lastCode = data[0].code;
        const match = lastCode.match(/CF-(\d+)/);
        if (!match) return 'CF-001';

        const nextNum = parseInt(match[1]) + 1;
        return `CF-${nextNum.toString().padStart(3, '0')}`;
    },

    async createForm(form: Omit<CustomForm, 'id' | 'createdAt' | 'code'>) {
        const code = await this.generateNextCode();
        const id = crypto.randomUUID();

        // 1. Create the Custom Form
        const { error: formError } = await supabase.from('custom_forms').insert({
            id,
            code,
            title: form.title,
            description: form.description,
            fields: form.fields,
            is_active: form.isActive,
            created_by: form.createdBy
        });

        if (formError) throw formError;

        // 2. Create corresponding Document Type for sidebar visibility
        const { error: dtError } = await supabase.from('document_types').insert({
            id: crypto.randomUUID(),
            code: code,
            name: form.title,
            category: 'CUSTOM_FORM',
            description: form.description || '自定義表單',
            is_active: form.isActive,
            custom_form_id: id
        });

        if (dtError) {
            console.error('Error creating document type for custom form:', dtError);
            // We don't throw here to avoid failing form creation, but ideally they should be in a transaction
        }

        return { id, code };
    },

    async updateForm(id: string, updates: Partial<CustomForm>) {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.fields !== undefined) dbUpdates.fields = updates.fields;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

        // 1. Update Custom Form
        const { error: formError } = await supabase
            .from('custom_forms')
            .update(dbUpdates)
            .eq('id', id);

        if (formError) throw formError;

        // 2. Sync title/status to Document Type
        const docUpdates: any = {};
        if (updates.title !== undefined) docUpdates.name = updates.title;
        if (updates.isActive !== undefined) docUpdates.is_active = updates.isActive;

        if (Object.keys(docUpdates).length > 0) {
            await supabase
                .from('document_types')
                .update(docUpdates)
                .eq('custom_form_id', id);
        }
    },

    async deleteForm(id: string) {
        // 1. Delete associated Document Type first
        await supabase
            .from('document_types')
            .delete()
            .eq('custom_form_id', id);

        // 2. Delete Custom Form
        const { error: formError } = await supabase
            .from('custom_forms')
            .delete()
            .eq('id', id);

        if (formError) throw formError;
    },

    async getSubmissions(formId: string) {
        const { data, error } = await supabase
            .from('custom_form_submissions')
            .select('*')
            .eq('form_id', formId)
            .order('submitted_at', { ascending: false });

        if (error) throw error;
        return data;
    }
};
