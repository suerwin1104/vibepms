import React, { useState } from 'react';
import { SystemRole } from '../types';
import { supabase } from '../supabase';
import Modal from './Modal';

interface RoleManagementProps {
    roles: SystemRole[];
    setRoles: (roles: SystemRole[]) => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ roles, setRoles }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<SystemRole | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const sortedRoles = [...roles].sort((a, b) => a.level - b.level);

    const handleFormSubmit = async (data: Partial<SystemRole>) => {
        setIsProcessing(true);
        try {
            const dbPayload = {
                code: data.code,
                name: data.name,
                description: data.description || null,
                level: data.level || 50,
                is_system: false // 新增的角色都不是系統角色
            };

            if (editingRole) {
                // 系統角色只能修改名稱和說明
                const updatePayload = editingRole.isSystem
                    ? { name: data.name, description: data.description }
                    : dbPayload;

                const { error } = await supabase
                    .from('system_roles')
                    .update(updatePayload)
                    .eq('id', editingRole.id);

                if (error) throw error;

                setRoles(roles.map(r => r.id === editingRole.id ? {
                    ...r,
                    ...data,
                    isSystem: editingRole.isSystem // 保持 isSystem 不變
                } : r));
            } else {
                // 檢查代碼是否重複
                if (roles.some(r => r.code.toLowerCase() === data.code?.toLowerCase())) {
                    throw new Error('角色代碼已存在');
                }

                const newId = crypto.randomUUID();
                const newRole = {
                    id: newId,
                    ...dbPayload
                };

                const { error } = await supabase.from('system_roles').insert(newRole);
                if (error) throw error;

                setRoles([...roles, {
                    id: newId,
                    code: data.code || '',
                    name: data.name || '',
                    description: data.description,
                    level: data.level || 50,
                    isSystem: false
                }]);
            }
            setIsModalOpen(false);
            setEditingRole(null);
        } catch (e: any) {
            console.error("Role Save Error:", e);
            alert(`存檔失敗: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (role: SystemRole) => {
        if (role.isSystem) {
            alert("系統內建角色無法刪除。");
            return;
        }
        if (!confirm(`確定要刪除「${role.name}」角色嗎？\n\n注意：如有員工使用此角色，可能會造成權限問題。`)) return;

        try {
            const { error } = await supabase.from('system_roles').delete().eq('id', role.id);
            if (error) throw error;
            setRoles(roles.filter(r => r.id !== role.id));
        } catch (e: any) {
            alert(`刪除失敗: ${e.message}`);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">系統內建角色無法刪除，僅可修改名稱與說明。</p>
                <button
                    onClick={() => { setEditingRole(null); setIsModalOpen(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow hover:bg-blue-700 transition-all"
                >
                    + 新增角色
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <tr>
                            <th className="px-6 py-4">代碼</th>
                            <th className="px-6 py-4">名稱</th>
                            <th className="px-6 py-4">說明</th>
                            <th className="px-6 py-4 text-center">類型</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {sortedRoles.map(role => (
                            <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-700">
                                        {role.code}
                                    </code>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">{role.name}</td>
                                <td className="px-6 py-4 text-slate-500 text-xs">{role.description || '-'}</td>
                                <td className="px-6 py-4 text-center">
                                    {role.isSystem ? (
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                            🔒 系統內建
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                                            自訂角色
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => { setEditingRole(role); setIsModalOpen(true); }}
                                        className="text-blue-500 font-bold text-xs hover:underline"
                                    >
                                        編輯
                                    </button>
                                    {!role.isSystem && (
                                        <button
                                            onClick={() => handleDelete(role)}
                                            className="text-rose-500 font-bold text-xs hover:underline"
                                        >
                                            刪除
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {roles.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    尚無角色資料
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingRole(null); }}
                title={editingRole ? "編輯角色" : "新增角色"}
            >
                <RoleForm
                    role={editingRole}
                    isProcessing={isProcessing}
                    onSubmit={handleFormSubmit}
                />
            </Modal>
        </div>
    );
};

interface RoleFormProps {
    role: SystemRole | null;
    isProcessing: boolean;
    onSubmit: (data: Partial<SystemRole>) => void;
}

const RoleForm: React.FC<RoleFormProps> = ({ role, isProcessing, onSubmit }) => {
    const [formData, setFormData] = useState({
        code: role?.code || '',
        name: role?.name || '',
        description: role?.description || '',
        level: role?.level || 50
    });

    const isSystemRole = role?.isSystem || false;

    return (
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSubmit(formData); }}>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                    角色代碼 {isSystemRole && <span className="text-amber-500">(系統角色不可修改)</span>}
                </label>
                <input
                    required
                    disabled={isSystemRole}
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                    className={`w-full border border-slate-200 rounded-xl p-3 text-sm font-mono ${isSystemRole ? 'bg-slate-100 text-slate-500' : ''}`}
                    placeholder="例如: CustomManager"
                />
                <p className="text-[10px] text-slate-400 mt-1">僅限英文字母、數字和底線</p>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">顯示名稱</label>
                <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold"
                    placeholder="例如: 自訂管理員"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">角色說明</label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm"
                    placeholder="此角色的職責和權限說明..."
                    rows={2}
                />
            </div>

            <button
                type="submit"
                disabled={isProcessing}
                className={`w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl mt-4 active:scale-95 transition-all flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50' : ''}`}
            >
                {isProcessing && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                {role ? '更新角色' : '建立角色'}
            </button>
        </form>
    );
};

export default RoleManagement;
