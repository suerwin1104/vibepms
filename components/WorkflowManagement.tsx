
import React, { useState, useEffect } from 'react';
import { WorkflowDefinition, WorkflowStep, WorkflowInstance, ApprovalRecord, PendingApproval, Staff, ApprovalType, DocumentCategory } from '../types';
import Pagination from './Pagination';
import { supabase } from '../supabase';

interface Props {
    currentUser: Staff | null;
    staff: Staff[];  // For access control and requester filter
    workflowDefinitions: WorkflowDefinition[];
    workflowInstances: WorkflowInstance[];
    approvalRecords: ApprovalRecord[];
    pendingApprovals: PendingApproval[];
    onApprove: (instanceId: string, comments: string) => Promise<void>;
    onReject: (instanceId: string, comments: string) => Promise<void>;
    onAddWorkflow: (wf: Partial<WorkflowDefinition>) => Promise<void>;
    onUpdateWorkflow: (id: string, wf: Partial<WorkflowDefinition>) => Promise<void>;
    onDeleteWorkflow: (id: string) => Promise<void>;
    onAddStep: (step: Partial<WorkflowStep>) => Promise<void>;
    onUpdateStep: (stepId: string, step: Partial<WorkflowStep>) => Promise<void>;
    onDeleteStep: (stepId: string, workflowId: string) => Promise<void>;
    onConvertPRtoPO: (prId: string) => Promise<void>;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
    'PURCHASE_REQUISITION': '請購單', 'PURCHASE_ORDER': '採購單', 'GOODS_RECEIPT': '進貨單',
    'GOODS_ISSUE': '領用單', 'STOCK_TRANSFER': '調撥單', 'PETTY_CASH': '零用金'
};

const WorkflowManagement: React.FC<Props> = ({
    currentUser, staff, workflowDefinitions, workflowInstances, approvalRecords, pendingApprovals,
    onApprove, onReject, onAddWorkflow, onUpdateWorkflow, onDeleteWorkflow, onAddStep, onUpdateStep, onDeleteStep, onConvertPRtoPO
}) => {
    // ... (existing state)
    const [subTab, setSubTab] = useState<'pending' | 'definitions' | 'history' | 'allDocs'>('pending');
    const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);  // For allDocs detail view
    const [comments, setComments] = useState('');
    const [requesterFilter, setRequesterFilter] = useState<string>('all');  // New: filter by requester

    // Workflow Definition Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [wfForm, setWfForm] = useState({ name: '', code: '', documentCategory: 'PURCHASE_ORDER' as DocumentCategory, description: '' });

    // Step Management State
    const [managingStepsWfId, setManagingStepsWfId] = useState<string | null>(null);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [stepForm, setStepForm] = useState({ stepName: '', approverRole: 'HotelAdmin', approvalType: 'Serial' as ApprovalType });

    // ... (Pagination remains)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Document items for detail view
    const [documentItems, setDocumentItems] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [currentStepInfo, setCurrentStepInfo] = useState<{ stepName?: string, roleName?: string, approverName?: string, approvers?: string[] } | null>(null);

    // Reset pagination when tab changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedInstanceId(null);
        setSelectedDocId(null);
    }, [subTab]);

    // Fetch document items and step info when a document is selected
    useEffect(() => {
        const fetchDocumentDetails = async () => {
            const activeId = selectedDocId || selectedInstanceId;
            if (!activeId) {
                setDocumentItems([]);
                setCurrentStepInfo(null);
                return;
            }

            const selectedInstance = workflowInstances.find(i => i.id === activeId);
            if (!selectedInstance) return;

            setLoadingItems(true);

            // 1. Fetch Items
            let tableName = '';
            let foreignKey = '';
            switch (selectedInstance.documentType) {
                case 'PURCHASE_REQUISITION': tableName = 'purchase_requisition_items'; foreignKey = 'pr_id'; break;
                case 'PURCHASE_ORDER': tableName = 'purchase_order_items'; foreignKey = 'po_id'; break;
                case 'GOODS_RECEIPT': tableName = 'goods_receipt_items'; foreignKey = 'gr_id'; break;
                case 'GOODS_ISSUE': tableName = 'goods_issue_items'; foreignKey = 'gi_id'; break;
                case 'STOCK_TRANSFER': tableName = 'stock_transfer_items'; foreignKey = 'st_id'; break;
            }

            if (tableName) {
                const { data: itemsData, error: itemsError } = await supabase.from(tableName).select('*').eq(foreignKey, selectedInstance.documentId);
                if (itemsError) console.error('Error fetching items:', itemsError);
                else setDocumentItems(itemsData || []);
            }

            // 2. Fetch Current Step Info
            // Always fetch step info to display descriptive names even for Approved/Rejected items
            const { data: stepData, error: stepError } = await supabase
                .from('workflow_steps')
                .select('*')
                .eq('workflow_id', selectedInstance.workflowId)
                .eq('step_sequence', selectedInstance.currentStep)
                .single();

            if (!stepError && stepData) {
                let roleLabel = stepData.approverRole;
                let specificApprover = '';

                // Logic to find specific approver
                if (stepData.approverRole === 'DepartmentManager') {
                    const requesterName = selectedInstance.initiatedBy;
                    const requester = staff.find(s => s.name === requesterName);
                    if (requester) {
                        // Try supervisor first
                        if (requester.supervisorName) specificApprover = requester.supervisorName;
                    }
                } else if (stepData.approverIds && stepData.approverIds.length > 0) {
                    // Resolve names from IDs
                    const approverNames = staff.filter(s => stepData.approverIds!.includes(s.id)).map(s => s.name);
                    if (approverNames.length > 0) specificApprover = approverNames.join(', ');
                }

                // Map English role names to Chinese labels
                const roleMap: any = {
                    'HotelAdmin': '飯店總經理',
                    'GroupAdmin': '集團管理者',
                    'Finance': '財務部',
                    'DepartmentManager': '部門主管',
                    'FrontDesk': '櫃檯人員'
                };
                setCurrentStepInfo({
                    stepName: stepData.stepName, // Fixed case from snake_case to camelCase as per typical Supabase JS client if configured or adjusted manually, actually checking raw data first might be safer but stepData usually returns object matching DB columns. Let's assume snake_case if DB is snake_case, but types say camelCase. Wait, the original code used stepData.approver_role (snake) AND stepData.approverRole (camel)?
                    // Original code used: roleName: roleMap[stepData.approver_role] || stepData.approver_role || roleLabel
                    // Supabase normally returns snake_case columns.
                    // Let's stick safe with snake_case checks too.
                    roleName: roleMap[stepData.approverRole] || roleMap[stepData.approver_role] || stepData.approverRole || stepData.approver_role || roleLabel,
                    approverName: specificApprover
                });
            } else {
                setCurrentStepInfo(null);
            }

            setLoadingItems(false);
        };

        fetchDocumentDetails();
    }, [selectedDocId, selectedInstanceId, workflowInstances]);

    const handleApprove = async () => {
        if (!selectedInstanceId) return;
        await onApprove(selectedInstanceId, comments);
        setSelectedInstanceId(null); setComments('');
    };

    const handleReject = async () => {
        if (!selectedInstanceId || !comments.trim()) { alert('請填寫駁回原因'); return; }
        await onReject(selectedInstanceId, comments);
        setSelectedInstanceId(null); setComments('');
    };

    const handleSaveWorkflow = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wfForm.name || !wfForm.code) { alert('請填寫名稱與代碼'); return; }

        if (editingId) {
            await onUpdateWorkflow(editingId, wfForm);
        } else {
            await onAddWorkflow({ ...wfForm, isActive: true });
        }

        setIsFormOpen(false);
        setEditingId(null);
        setWfForm({ name: '', code: '', documentCategory: 'PURCHASE_ORDER', description: '' });
    };

    const handleEditClick = (wf: WorkflowDefinition) => {
        setEditingId(wf.id);
        const descriptionValue = wf.description || '';
        setWfForm({ name: wf.name, code: wf.code, documentCategory: wf.documentCategory, description: descriptionValue });
        setIsFormOpen(true);
    };

    const handleDeleteClick = async (id: string, name: string) => {
        if (window.confirm(`確定要刪除流程 "${name}" 嗎？ 此操作無法復原。`)) {
            await onDeleteWorkflow(id);
        }
    };

    const handleAddStepSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!managingStepsWfId || !stepForm.stepName) return;

        const wf = workflowDefinitions.find(w => w.id === managingStepsWfId);
        if (!wf) return;

        if (editingStepId) {
            await onUpdateStep(editingStepId, {
                stepName: stepForm.stepName,
                approverRole: stepForm.approverRole,
                approvalType: stepForm.approvalType,
                workflowId: managingStepsWfId
            });
            setEditingStepId(null);
        } else {
            const nextSequence = (wf.steps?.length || 0) + 1;
            await onAddStep({
                workflowId: managingStepsWfId,
                stepName: stepForm.stepName,
                stepSequence: nextSequence,
                approverRole: stepForm.approverRole,
                approvalType: stepForm.approvalType,
                isLastStep: false
            });
        }
        setStepForm({ stepName: '', approverRole: 'HotelAdmin', approvalType: 'Serial' });
    };

    const handleEditStep = (step: WorkflowStep) => {
        setEditingStepId(step.id);
        setStepForm({
            stepName: step.stepName,
            approverRole: step.approverRole || 'HotelAdmin',
            approvalType: step.approvalType
        });
    };

    const handleDeleteStep = async (stepId: string) => {
        if (!managingStepsWfId) return;
        if (window.confirm('確定要刪除此步驟嗎？')) {
            await onDeleteStep(stepId, managingStepsWfId);
        }
    };

    // ... (Pagination data calculation remains the same)
    const getPaginationData = () => {
        let items: any[] = [];
        if (subTab === 'pending') items = pendingApprovals;
        else if (subTab === 'history') {
            // 修正: 顯示當前使用者已審核的文件 (而非提交的)
            items = approvalRecords.filter(r => r.approverId === currentUser?.id);
        }
        else if (subTab === 'allDocs') {
            // Role-based access control
            let visibleInstances = workflowInstances;
            if (currentUser) {
                if (currentUser.role === 'GroupAdmin') {
                    // GroupAdmin sees all
                    visibleInstances = workflowInstances;
                } else if (currentUser.role === 'HotelAdmin' || currentUser.role === 'GeneralManager') {
                    // HotelAdmin/GeneralManager sees their subordinates' documents
                    const subordinateNames = staff
                        .filter(s => s.supervisorId === currentUser.id)
                        .map(s => s.name);
                    visibleInstances = workflowInstances.filter(i =>
                        subordinateNames.includes(i.initiatedBy) || i.initiatedBy === currentUser.name
                    );
                } else if (currentUser.role === 'Finance' || currentUser.role === 'DepartmentManager') {
                    // Finance/DepartmentManager 可以看到需要他們審核的文件或自己提交的
                    const myPendingInstanceIds = pendingApprovals.map(p => p.workflowInstanceId);
                    const myApprovedInstanceIds = approvalRecords.filter(r => r.approverId === currentUser.id).map(r => r.workflowInstanceId);
                    visibleInstances = workflowInstances.filter(i =>
                        myPendingInstanceIds.includes(i.id) ||
                        myApprovedInstanceIds.includes(i.id) ||
                        i.initiatedBy === currentUser.name
                    );
                } else {
                    // FrontDesk sees only their own
                    visibleInstances = workflowInstances.filter(i => i.initiatedBy === currentUser.name);
                }
            }
            // Apply requester filter
            if (requesterFilter !== 'all') {
                visibleInstances = visibleInstances.filter(i => i.initiatedBy === requesterFilter);
            }
            items = visibleInstances;
        }
        else return { displayedItems: [], totalPages: 0 };

        const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
        const displayedItems = items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        return { displayedItems, totalPages };
    };

    const renderDocumentItems = () => {
        if (loadingItems) return <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>載入中...</div>;
        if (documentItems.length === 0) return (
            <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#9ca3af', fontSize: '13px' }}>
                無明細項目
            </div>
        );

        return (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>品項</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>數量</th>
                            <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>單位</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>單價</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documentItems.map((item, idx) => (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px' }}>{item.item_name}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{item.unit}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>${(item.estimated_unit_price || item.unit_price || item.unit_cost || 0).toLocaleString()}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500 }}>${(item.estimated_amount || item.amount || 0).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 600 }}>
                            <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>總計:</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#0369a1' }}>
                                ${documentItems.reduce((sum, item) => sum + (item.estimated_amount || item.amount || 0), 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    const { displayedItems, totalPages } = getPaginationData();
    const managingWf = workflowDefinitions.find(w => w.id === managingStepsWfId);

    return (
        <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>✅ 流程簽核</h2>
            <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px' }}>審核待辦與流程管理</p>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
                {[{ key: 'pending', label: `📋 待簽核 (${pendingApprovals.length})` }, { key: 'definitions', label: '⚙️ 流程設定' }, { key: 'history', label: '📜 我的簽核記錄' }, { key: 'allDocs', label: '📂 全部文件' }].map(tab => (
                    <button key={tab.key} onClick={() => setSubTab(tab.key as any)}
                        style={{
                            padding: '10px 20px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                            backgroundColor: subTab === tab.key ? 'white' : 'transparent', color: subTab === tab.key ? '#1e40af' : '#64748b'
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Pending Approvals */}
            {subTab === 'pending' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'flex-start' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>單據類型</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>單號</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>申請人</th>
                                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>金額</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>目前步驟</th>
                            </tr></thead>
                            <tbody>
                                {pendingApprovals.length === 0 ? <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>無待簽核項目 🎉</td></tr> : displayedItems.map((item: PendingApproval) => (
                                    <tr key={item.workflowInstanceId} onClick={() => setSelectedInstanceId(item.workflowInstanceId)}
                                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: selectedInstanceId === item.workflowInstanceId ? '#eff6ff' : 'transparent' }}>
                                        <td style={{ padding: '14px 16px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>{CATEGORY_LABELS[item.documentType]}</span></td>
                                        <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>{item.documentNumber}</td>
                                        <td style={{ padding: '14px 16px' }}>{item.requesterName}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>{item.amount ? `$${item.amount.toLocaleString()}` : '-'}</td>
                                        <td style={{ padding: '14px 16px', color: '#6b7280' }}>{item.currentStepName}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ padding: '16px' }}>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    </div>
                    {selectedInstanceId && (() => {
                        const selectedItem = pendingApprovals.find(p => p.workflowInstanceId === selectedInstanceId);
                        if (!selectedItem) return null;
                        return (
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content', position: 'sticky', top: '24px' }}>
                                {/* Header */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: '#e0f2fe', color: '#0369a1', marginRight: '8px' }}>
                                            {CATEGORY_LABELS[selectedItem.documentType]}
                                        </span>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '15px' }}>{selectedItem.documentNumber}</span>
                                    </div>
                                    <button onClick={() => setSelectedInstanceId(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
                                </div>

                                {/* Document Details */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 單據資訊</h4>
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#6b7280' }}>申請人</span>
                                            <span style={{ fontWeight: 500 }}>{selectedItem.requesterName || '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#6b7280' }}>送出時間</span>
                                            <span style={{ fontWeight: 500 }}>{selectedItem.requestedAt ? new Date(selectedItem.requestedAt).toLocaleString('zh-TW') : '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#6b7280' }}>優先順序</span>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                                                backgroundColor: selectedItem.priority === 'Urgent' ? '#fee2e2' : selectedItem.priority === 'High' ? '#fef3c7' : '#f1f5f9',
                                                color: selectedItem.priority === 'Urgent' ? '#991b1b' : selectedItem.priority === 'High' ? '#92400e' : '#64748b'
                                            }}>
                                                {selectedItem.priority === 'Urgent' ? '🔴 緊急' : selectedItem.priority === 'High' ? '🟡 高' : '⚪ 一般'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#6b7280' }}>目前步驟</span>
                                            <span style={{ fontWeight: 500, color: '#0369a1' }}>
                                                {currentStepInfo ? (
                                                    `${currentStepInfo.stepName} (${currentStepInfo.roleName}${currentStepInfo.approverName ? ' - ' + currentStepInfo.approverName : ''})`
                                                ) : (
                                                    selectedItem.currentStepName
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Document Items */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📦 單據明細</h4>
                                    {renderDocumentItems()}
                                </div>

                                {/* Amount */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '14px', color: '#6b7280' }}>💰 簽核金額</span>
                                        <span style={{ fontSize: '24px', fontWeight: 700, color: '#1e40af' }}>
                                            {documentItems.length > 0
                                                ? `$${documentItems.reduce((sum, item) => sum + (item.estimated_amount || item.amount || 0), 0).toLocaleString()}`
                                                : selectedItem.amount ? `$${selectedItem.amount.toLocaleString()}` : '-'}
                                        </span>
                                    </div>
                                </div>

                                {/* Approval Actions */}
                                <div style={{ padding: '16px 20px' }}>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✏️ 簽核意見</h4>
                                    <textarea
                                        placeholder="輸入簽核意見 (駁回時必填)"
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        rows={3}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', resize: 'none', marginBottom: '16px', fontSize: '14px' }}
                                    />
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button onClick={handleApprove} style={{ flex: 1, padding: '14px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            ✓ 核准
                                        </button>
                                        <button onClick={handleReject} style={{ flex: 1, padding: '14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            ✗ 駁回
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Workflow Definitions */}
            {subTab === 'definitions' && (
                <div>
                    {!managingStepsWfId ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                                <button onClick={() => { setIsFormOpen(true); setEditingId(null); setWfForm({ name: '', code: '', documentCategory: 'PURCHASE_ORDER', description: '' }); }} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>➕ 新增流程</button>
                            </div>
                            {isFormOpen && (
                                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                                    <form onSubmit={handleSaveWorkflow} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                        <input placeholder="流程名稱 *" value={wfForm.name} onChange={(e) => setWfForm(p => ({ ...p, name: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                        <input placeholder="代碼 *" value={wfForm.code} onChange={(e) => setWfForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                        <select value={wfForm.documentCategory} onChange={(e) => setWfForm(p => ({ ...p, documentCategory: e.target.value as DocumentCategory }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{editingId ? '儲存' : '新增'}</button>
                                            <button type="button" onClick={() => { setIsFormOpen(false); setEditingId(null); }} style={{ flex: 1, padding: '10px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>取消</button>
                                        </div>
                                    </form>
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                {workflowDefinitions.map(wf => (
                                    <div key={wf.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '8px' }}>
                                            <button onClick={() => setManagingStepsWfId(wf.id)} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#4b5563' }}>管理步驟</button>
                                            <button onClick={() => handleEditClick(wf)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
                                            <button onClick={() => handleDeleteClick(wf.id, wf.name)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingRight: '120px' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>{wf.code}</div>
                                                <div style={{ fontSize: '18px', fontWeight: 600 }}>{wf.name}</div>
                                            </div>
                                            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: '#e0f2fe', color: '#0369a1', height: 'fit-content' }}>{CATEGORY_LABELS[wf.documentCategory]}</span>
                                        </div>
                                        {wf.description && <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px' }}>{wf.description}</p>}
                                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>簽核步驟 ({wf.steps?.length || 0}):</div>
                                            {wf.steps && wf.steps.length > 0 ? (
                                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                    {wf.steps.slice().sort((a, b) => a.stepSequence - b.stepSequence).map((step, idx) => (
                                                        <div key={step.id} style={{ flexShrink: 0, padding: '4px 8px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#64748b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{idx + 1}</span>
                                                            <span>{step.stepName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <div style={{ fontSize: '13px', color: '#9ca3af' }}>尚未設定步驟</div>}
                                        </div>
                                    </div>
                                ))}
                                {workflowDefinitions.length === 0 && <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: '#9ca3af' }}>無流程定義</div>}
                            </div>
                        </>
                    ) : (
                        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                                <div>
                                    <button onClick={() => { setManagingStepsWfId(null); setEditingStepId(null); setStepForm({ stepName: '', approverRole: 'HotelAdmin', approvalType: 'Serial' }); }} style={{ marginRight: '16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>⬅️ 返回</button>
                                    <span style={{ fontSize: '20px', fontWeight: 600 }}>管理步驟: {managingWf?.name}</span>
                                </div>
                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: '#f1f5f9', color: '#64748b' }}>{managingWf?.code}</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>{editingStepId ? '編輯步驟' : '新增步驟'}</h3>
                                    <form onSubmit={handleAddStepSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>步驟名稱 *</label>
                                            <input value={stepForm.stepName} onChange={(e) => setStepForm(p => ({ ...p, stepName: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} placeholder="例如: 經理審核" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>簽核角色</label>
                                            <select value={stepForm.approverRole} onChange={(e) => setStepForm(p => ({ ...p, approverRole: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                                <option value="HotelAdmin">飯店管理員 (HotelAdmin)</option>
                                                <option value="DepartmentManager">部門經理 (DepartmentManager)</option>
                                                <option value="Finance">財務 (Finance)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px' }}>簽核方式</label>
                                            <div style={{ display: 'flex', gap: '16px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                    <input type="radio" name="approvalType" value="Serial" checked={stepForm.approvalType === 'Serial'} onChange={() => setStepForm(p => ({ ...p, approvalType: 'Serial' }))} />
                                                    <span>⬇️ 串簽 (Serial)</span>
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                    <input type="radio" name="approvalType" value="Parallel" checked={stepForm.approvalType === 'Parallel'} onChange={() => setStepForm(p => ({ ...p, approvalType: 'Parallel' }))} />
                                                    <span>⚡ 會簽 (Parallel)</span>
                                                </label>
                                            </div>
                                            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>串簽: 需按順序簽核; 會簽: 平行處理。</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '8px' }}>
                                                {editingStepId ? '儲存變更' : '➕ 加入步驟'}
                                            </button>
                                            {editingStepId && (
                                                <button type="button" onClick={() => { setEditingStepId(null); setStepForm({ stepName: '', approverRole: 'HotelAdmin', approvalType: 'Serial' }); }} style={{ flex: 1, padding: '12px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '8px' }}>
                                                    取消
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>

                                <div>
                                    <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>現有步驟</h3>
                                    {!managingWf?.steps || managingWf.steps.length === 0 ? (
                                        <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#9ca3af' }}>尚未此流程新增步驟</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {managingWf.steps.slice().sort((a, b) => a.stepSequence - b.stepSequence).map((step, idx) => (
                                                <div key={step.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{idx + 1}</span>
                                                        <div>
                                                            <div style={{ fontWeight: 500 }}>{step.stepName}</div>
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                {step.approverRole} • <span style={{ color: step.approvalType === 'Parallel' ? '#b45309' : '#0369a1', fontWeight: 500 }}>{step.approvalType === 'Parallel' ? '會簽' : '串簽'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button onClick={() => handleEditStep(step)} style={{ padding: '6px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                                                        <button onClick={() => handleDeleteStep(step.id)} style={{ padding: '6px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* History */}
            {subTab === 'history' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'flex-start' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>時間</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>簽核人</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>步驟</th>
                                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>動作</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>意見</th>
                            </tr></thead>
                            <tbody>
                                {displayedItems.length === 0 ? <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>無簽核歷史</td></tr> : displayedItems.map((record: ApprovalRecord) => (
                                    <tr key={record.id}
                                        onClick={() => setSelectedDocId(record.workflowInstanceId)}
                                        style={{
                                            borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                            backgroundColor: selectedDocId === record.workflowInstanceId ? '#eff6ff' : 'transparent'
                                        }}>
                                        <td style={{ padding: '14px 16px', fontSize: '13px' }}>{new Date(record.actedAt).toLocaleString('zh-TW')}</td>
                                        <td style={{ padding: '14px 16px' }}>{record.approverName}</td>
                                        <td style={{ padding: '14px 16px', color: '#6b7280' }}>{record.stepName || `步驟 ${record.stepSequence}`}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: record.action === 'Approve' ? '#dcfce7' : '#fee2e2', color: record.action === 'Approve' ? '#166534' : '#991b1b' }}>
                                                {record.action === 'Approve' ? '核准' : record.action === 'Reject' ? '駁回' : record.action}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.comments || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ padding: '16px' }}>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    </div>

                    {/* Reuse Detail Panel for History */}
                    {selectedDocId && (() => {
                        const selectedInstance = workflowInstances.find(i => i.id === selectedDocId);
                        if (!selectedInstance) return null;
                        const instanceRecords = approvalRecords.filter(r => r.workflowInstanceId === selectedDocId).sort((a, b) => a.stepSequence - b.stepSequence);

                        // If the instance exists, render the same detail panel as All Docs
                        return (
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content', position: 'sticky', top: '24px' }}>
                                {/* Header */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: '#e0e7ff', color: '#3730a3', marginRight: '8px' }}>
                                            {CATEGORY_LABELS[selectedInstance.documentType as DocumentCategory] || selectedInstance.documentType}
                                        </span>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '15px' }}>{selectedInstance.documentNumber}</span>
                                    </div>
                                    <button onClick={() => setSelectedDocId(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
                                </div>

                                {/* Document Info */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 單據資訊</h4>
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#6b7280' }}>申請人</span>
                                            <span style={{ fontWeight: 500 }}>{selectedInstance.initiatedBy || '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#6b7280' }}>送出時間</span>
                                            <span style={{ fontWeight: 500 }}>{selectedInstance.initiatedAt ? new Date(selectedInstance.initiatedAt).toLocaleString('zh-TW') : '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#6b7280' }}>目前步驟</span>
                                            <span style={{ fontWeight: 500, color: '#0369a1' }}>
                                                {currentStepInfo ? (
                                                    `${currentStepInfo.stepName} (${currentStepInfo.roleName}${currentStepInfo.approverName ? ' - ' + currentStepInfo.approverName : ''})`
                                                ) : (
                                                    `步驟 ${selectedInstance.currentStep}`
                                                )}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#6b7280' }}>狀態</span>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                                                backgroundColor: selectedInstance.status === 'Approved' ? '#dcfce7' : selectedInstance.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                                                color: selectedInstance.status === 'Approved' ? '#166534' : selectedInstance.status === 'Pending' ? '#92400e' : '#991b1b'
                                            }}>
                                                {selectedInstance.status === 'Approved' ? '已核准' : selectedInstance.status === 'Pending' ? '待簽核' : selectedInstance.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Document Items */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📦 單據明細</h4>
                                    {renderDocumentItems()}
                                </div>

                                {/* Approval History Timeline */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📝 簽核歷程</h4>
                                    {instanceRecords.length === 0 ? (
                                        <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#9ca3af', fontSize: '13px' }}>
                                            尚無簽核記錄
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {instanceRecords.map((record, idx) => (
                                                <div key={record.id} style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{
                                                            width: '24px', height: '24px', borderRadius: '50%',
                                                            backgroundColor: record.action === 'Approve' ? '#10b981' : '#ef4444',
                                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '11px', fontWeight: 600
                                                        }}>
                                                            {record.action === 'Approve' ? '✓' : '✗'}
                                                        </span>
                                                        {idx < instanceRecords.length - 1 && (
                                                            <div style={{ width: '2px', height: '32px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 500, marginBottom: '2px' }}>
                                                            {record.stepName || `步驟 ${record.stepSequence}`}
                                                            <span style={{ color: record.action === 'Approve' ? '#10b981' : '#ef4444', marginLeft: '8px' }}>
                                                                {record.action === 'Approve' ? '核准' : '駁回'}
                                                            </span>
                                                        </div>
                                                        <div style={{ color: '#6b7280', fontSize: '12px' }}>
                                                            {record.approverName} • {record.actedAt ? new Date(record.actedAt).toLocaleString('zh-TW') : '-'}
                                                        </div>
                                                        {record.comments && (
                                                            <div style={{ marginTop: '6px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', color: '#374151', fontStyle: 'italic', borderLeft: '3px solid #d1d5db' }}>
                                                                「{record.comments}」
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {selectedInstance.status === 'Pending' && (
                                                <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#fbbf24', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600 }}>⋯</span>
                                                    </div>
                                                    <div style={{ flex: 1, color: '#9ca3af', fontStyle: 'italic', paddingTop: '4px' }}>
                                                        等待簽核中...
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* PR to PO Conversion Button */}
                                {selectedInstance.documentType === 'PURCHASE_REQUISITION' && selectedInstance.status === 'Approved' && (
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f0fdf4' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#166534' }}>🔄 轉採購單</h4>
                                                <p style={{ margin: 0, fontSize: '12px', color: '#15803d' }}>此請購單已核准，可直接轉為採購單。</p>
                                            </div>
                                            <button
                                                onClick={() => onConvertPRtoPO(selectedInstance.documentId)}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: '#166534',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                📝 拋轉採購單
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                {selectedInstance.notes && (
                                    <div style={{ padding: '16px 20px', backgroundColor: '#fffbeb' }}>
                                        <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#92400e' }}>💬 備註</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#b45309' }}>{selectedInstance.notes}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* All Documents - Role-based access with Detail Panel */}
            {subTab === 'allDocs' && (
                <div>
                    {/* Requester filter dropdown */}
                    <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>依申請人篩選：</label>
                        <select
                            value={requesterFilter}
                            onChange={(e) => { setRequesterFilter(e.target.value); setCurrentPage(1); }}
                            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                        >
                            <option value="all">全部</option>
                            {Array.from(new Set(workflowInstances.map(i => i.initiatedBy))).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            {currentUser?.role === 'GroupAdmin' ? '(集團管理員：可查看所有文件)' :
                                currentUser?.role === 'HotelAdmin' ? '(主管：可查看下屬文件)' : '(僅顯示個人文件)'}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: selectedDocId ? '1fr 420px' : '1fr', gap: '24px', alignItems: 'flex-start', height: 'calc(100vh - 280px)' }}>
                        {/* Document List - Scrollable */}
                        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr style={{ backgroundColor: '#f8fafc' }}>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>單據類型</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>單號</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>申請人</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>送審時間</th>
                                    </tr></thead>
                                    <tbody>
                                        {displayedItems.length === 0 ? <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>無文件記錄</td></tr> : displayedItems.map((instance: WorkflowInstance) => (
                                            <tr key={instance.id}
                                                onClick={() => setSelectedDocId(instance.id)}
                                                style={{
                                                    borderBottom: '1px solid #f1f5f9',
                                                    cursor: 'pointer',
                                                    backgroundColor: selectedDocId === instance.id ? '#eff6ff' : 'transparent'
                                                }}>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                                        {CATEGORY_LABELS[instance.documentType as DocumentCategory] || instance.documentType}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px', fontWeight: 500, fontFamily: 'monospace' }}>{instance.documentNumber}</td>
                                                <td style={{ padding: '14px 16px' }}>{instance.initiatedBy}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                                                        backgroundColor: instance.status === 'Approved' ? '#dcfce7' : instance.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                                                        color: instance.status === 'Approved' ? '#166534' : instance.status === 'Pending' ? '#92400e' : '#991b1b'
                                                    }}>
                                                        {instance.status === 'Approved' ? '已核准' : instance.status === 'Pending' ? '待簽核' : instance.status === 'Rejected' ? '已駁回' : instance.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                                                    {instance.initiatedAt ? new Date(instance.initiatedAt).toLocaleString('zh-TW') : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                            </div>
                        </div>

                        {/* Document Detail Panel */}
                        {selectedDocId && (() => {
                            const selectedInstance = workflowInstances.find(i => i.id === selectedDocId);
                            if (!selectedInstance) return null;
                            const instanceRecords = approvalRecords.filter(r => r.workflowInstanceId === selectedDocId).sort((a, b) => a.stepSequence - b.stepSequence);

                            return (
                                <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content', position: 'sticky', top: '24px' }}>
                                    {/* Header */}
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: '#e0e7ff', color: '#3730a3', marginRight: '8px' }}>
                                                {CATEGORY_LABELS[selectedInstance.documentType as DocumentCategory] || selectedInstance.documentType}
                                            </span>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '15px' }}>{selectedInstance.documentNumber}</span>
                                        </div>
                                        <button onClick={() => setSelectedDocId(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
                                    </div>

                                    {/* Document Info */}
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                        <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 單據資訊</h4>
                                        <div style={{ display: 'grid', gap: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                <span style={{ color: '#6b7280' }}>申請人</span>
                                                <span style={{ fontWeight: 500 }}>{selectedInstance.initiatedBy || '-'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                <span style={{ color: '#6b7280' }}>送出時間</span>
                                                <span style={{ fontWeight: 500 }}>{selectedInstance.initiatedAt ? new Date(selectedInstance.initiatedAt).toLocaleString('zh-TW') : '-'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                <span style={{ color: '#6b7280' }}>目前步驟</span>
                                                <span style={{ fontWeight: 500, color: '#0369a1' }}>
                                                    {currentStepInfo ? (
                                                        `${currentStepInfo.stepName} (${currentStepInfo.roleName})`
                                                    ) : (
                                                        `步驟 ${selectedInstance.currentStep}`
                                                    )}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                <span style={{ color: '#6b7280' }}>狀態</span>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                                                    backgroundColor: selectedInstance.status === 'Approved' ? '#dcfce7' : selectedInstance.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                                                    color: selectedInstance.status === 'Approved' ? '#166534' : selectedInstance.status === 'Pending' ? '#92400e' : '#991b1b'
                                                }}>
                                                    {selectedInstance.status === 'Approved' ? '已核准' : selectedInstance.status === 'Pending' ? '待簽核' : '已駁回'}
                                                </span>
                                            </div>
                                            {selectedInstance.completedAt && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                    <span style={{ color: '#6b7280' }}>完成時間</span>
                                                    <span style={{ fontWeight: 500 }}>{new Date(selectedInstance.completedAt).toLocaleString('zh-TW')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Document Items */}
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                        <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📦 單據明細</h4>
                                        {renderDocumentItems()}
                                    </div>

                                    {/* Approval History Timeline */}
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                        <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📝 簽核歷程</h4>
                                        {instanceRecords.length === 0 ? (
                                            <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#9ca3af', fontSize: '13px' }}>
                                                尚無簽核記錄
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {instanceRecords.map((record, idx) => (
                                                    <div key={record.id} style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <span style={{
                                                                width: '24px', height: '24px', borderRadius: '50%',
                                                                backgroundColor: record.action === 'Approve' ? '#10b981' : '#ef4444',
                                                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '11px', fontWeight: 600
                                                            }}>
                                                                {record.action === 'Approve' ? '✓' : '✗'}
                                                            </span>
                                                            {idx < instanceRecords.length - 1 && (
                                                                <div style={{ width: '2px', height: '32px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />
                                                            )}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 500, marginBottom: '2px' }}>
                                                                {record.stepName || `步驟 ${record.stepSequence}`}
                                                                <span style={{ color: record.action === 'Approve' ? '#10b981' : '#ef4444', marginLeft: '8px' }}>
                                                                    {record.action === 'Approve' ? '核准' : '駁回'}
                                                                </span>
                                                            </div>
                                                            <div style={{ color: '#6b7280', fontSize: '12px' }}>
                                                                {record.approverName} • {record.actedAt ? new Date(record.actedAt).toLocaleString('zh-TW') : '-'}
                                                            </div>
                                                            {record.comments && (
                                                                <div style={{ marginTop: '6px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', color: '#374151', fontStyle: 'italic', borderLeft: '3px solid #d1d5db' }}>
                                                                    「{record.comments}」
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {selectedInstance.status === 'Pending' && (
                                                    <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <span style={{
                                                                width: '24px', height: '24px', borderRadius: '50%',
                                                                backgroundColor: '#fef3c7', border: '2px dashed #f59e0b',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '11px'
                                                            }}>⏳</span>
                                                        </div>
                                                        <div style={{ flex: 1, color: '#f59e0b', fontWeight: 500 }}>
                                                            步驟 {selectedInstance.currentStep} (待簽核)
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* PR to PO Conversion Button */}
                                    {selectedInstance.documentType === 'PURCHASE_REQUISITION' && selectedInstance.status === 'Approved' && (
                                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f0fdf4' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#166534' }}>🔄 轉採購單</h4>
                                                    <p style={{ margin: 0, fontSize: '12px', color: '#15803d' }}>此請購單已核准，可直接轉為採購單。</p>
                                                </div>
                                                <button
                                                    onClick={() => onConvertPRtoPO(selectedInstance.documentId)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: '#166534',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    📝 拋轉採購單
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    {selectedInstance.notes && (
                                        <div style={{ padding: '16px 20px' }}>
                                            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💬 備註</h4>
                                            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#374151', fontSize: '14px', lineHeight: 1.6 }}>
                                                {selectedInstance.notes}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkflowManagement;
