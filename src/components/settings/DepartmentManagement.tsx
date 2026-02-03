import React, { useState } from 'react';
import { Department, Staff } from '../../types';
import { supabase } from '../../config/supabase';
import Modal from '../common/Modal';

interface DepartmentManagementProps {
    departments: Department[];
    setDepartments: (departments: Department[]) => void;
    staff: Staff[];
}

const DepartmentManagement: React.FC<DepartmentManagementProps> = ({ departments, setDepartments, staff }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFormSubmit = async (data: Partial<Department>) => {
        setIsProcessing(true);
        try {
            if (editingDepartment) {
                // Update existing department
                const { error } = await supabase
                    .from('departments')
                    .update({
                        name: data.name,
                        code: data.code,
                        manager_id: data.managerId || null,
                        parent_id: data.parentId || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingDepartment.id);

                if (error) throw error;

                // Get manager name
                const manager = staff.find(s => s.id === data.managerId);
                const parent = departments.find(d => d.id === data.parentId);

                setDepartments(departments.map(d =>
                    d.id === editingDepartment.id
                        ? {
                            ...d,
                            name: data.name!,
                            code: data.code!,
                            managerId: data.managerId,
                            managerName: manager?.name,
                            parentId: data.parentId
                        }
                        : d
                ));
            } else {
                // Create new department
                const newId = crypto.randomUUID();
                const { error } = await supabase
                    .from('departments')
                    .insert({
                        id: newId,
                        name: data.name,
                        code: data.code,
                        manager_id: data.managerId || null,
                        parent_id: data.parentId || null,
                        created_at: new Date().toISOString()
                    });

                if (error) throw error;

                const manager = staff.find(s => s.id === data.managerId);

                setDepartments([...departments, {
                    id: newId,
                    name: data.name!,
                    code: data.code!,
                    managerId: data.managerId,
                    managerName: manager?.name,
                    parentId: data.parentId,
                    createdAt: new Date().toISOString()
                }]);
            }

            setShowModal(false);
            setEditingDepartment(null);
        } catch (error: any) {
            alert(`操作失敗: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (department: Department) => {
        // Check if department has sub-departments
        const hasChildren = departments.some(d => d.parentId === department.id);
        if (hasChildren) {
            alert('該部門有子部門，無法刪除。請先刪除或移動子部門。');
            return;
        }

        // Check if staff are assigned to this department
        const hasStaff = staff.some(s => s.departmentId === department.id);
        if (hasStaff) {
            alert('該部門有員工，無法刪除。請先將員工移至其他部門。');
            return;
        }

        if (!confirm(`確定要刪除「${department.name}」部門嗎？此操作無法復原。`)) return;

        try {
            const { error } = await supabase.from('departments').delete().eq('id', department.id);
            if (error) throw error;
            setDepartments(departments.filter(d => d.id !== department.id));
        } catch (error: any) {
            alert(`刪除失敗: ${error.message}`);
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: 0 }}>🏢 部門管理</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>管理公司部門架構</p>
                </div>
                <button
                    onClick={() => { setEditingDepartment(null); setShowModal(true); }}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    ➕ 新增部門
                </button>
            </div>

            {/* Department Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>部門代碼</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>部門名稱</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>主管</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>上級部門</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>員工數</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departments.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                    尚無部門資料，請新增第一個部門
                                </td>
                            </tr>
                        ) : (
                            departments.map(dept => {
                                const parentDept = departments.find(d => d.id === dept.parentId);
                                const staffCount = staff.filter(s => s.departmentId === dept.id).length;

                                return (
                                    <tr key={dept.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                backgroundColor: '#e0e7ff',
                                                color: '#3730a3',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 600
                                            }}>
                                                {dept.code}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>{dept.name}</td>
                                        <td style={{ padding: '14px 16px', color: '#6b7280' }}>{dept.managerName || '-'}</td>
                                        <td style={{ padding: '14px 16px', color: '#6b7280' }}>{parentDept?.name || '-'}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                backgroundColor: staffCount > 0 ? '#dcfce7' : '#f1f5f9',
                                                color: staffCount > 0 ? '#166534' : '#9ca3af',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12px'
                                            }}>
                                                {staffCount} 人
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => { setEditingDepartment(dept); setShowModal(true); }}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        color: '#475569'
                                                    }}
                                                >
                                                    編輯
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dept)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#fef2f2',
                                                        border: '1px solid #fecaca',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        color: '#dc2626'
                                                    }}
                                                >
                                                    刪除
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingDepartment(null); }}
                title={editingDepartment ? '編輯部門' : '新增部門'}
            >
                <DepartmentForm
                    department={editingDepartment}
                    departments={departments}
                    staff={staff}
                    isProcessing={isProcessing}
                    onSubmit={handleFormSubmit}
                />
            </Modal>
        </div>
    );
};

// Department Form Component
interface DepartmentFormProps {
    department: Department | null;
    departments: Department[];
    staff: Staff[];
    isProcessing: boolean;
    onSubmit: (data: Partial<Department>) => void;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({ department, departments, staff, isProcessing, onSubmit }) => {
    const [formData, setFormData] = useState({
        code: department?.code || '',
        name: department?.name || '',
        managerId: department?.managerId || '',
        parentId: department?.parentId || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code.trim() || !formData.name.trim()) {
            alert('請填寫部門代碼和名稱');
            return;
        }
        onSubmit(formData);
    };

    // Filter out current department from parent options to prevent circular reference
    const availableParents = departments.filter(d => d.id !== department?.id);

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                    部門代碼 *
                </label>
                <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="例如: FIN, HR, IT"
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                    }}
                />
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                    部門名稱 *
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如: 財務部"
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                    }}
                />
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                    部門主管
                </label>
                <select
                    value={formData.managerId}
                    onChange={e => setFormData({ ...formData, managerId: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                    }}
                >
                    <option value="">-- 選擇主管 --</option>
                    {staff.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.title || s.role})</option>
                    ))}
                </select>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                    上級部門
                </label>
                <select
                    value={formData.parentId}
                    onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                    }}
                >
                    <option value="">-- 無上級部門 (根部門) --</option>
                    {availableParents.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>

            <button
                type="submit"
                disabled={isProcessing}
                style={{
                    marginTop: '8px',
                    padding: '12px 20px',
                    backgroundColor: isProcessing ? '#94a3b8' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
            >
                {isProcessing ? '處理中...' : (department ? '更新部門' : '建立部門')}
            </button>
        </form>
    );
};

export default DepartmentManagement;
