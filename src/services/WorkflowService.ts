
import { supabase } from '../config/supabase';
import { WorkflowDefinition, WorkflowStep, WorkflowInstance, ApprovalRecord, WorkflowStatus } from '../types/workflow.types';
import { DocumentCategory } from '../types/inventory.types';
import { Staff } from '../types/staff.types';

export class WorkflowService {

    // 模擬寄送 Email 通知
    static async sendNotification(toUserId: string, toEmail: string, subject: string, message: string) {
        console.log(`[Email Notification] To User: ${toUserId} | Email: ${toEmail} | Subject: ${subject} | Message: ${message}`);
        // 實際專案可在此整合 SendGrid / AWS SES
    }

    // Helper: Resolve Approver ID based on approval type
    // Serial: strictly use supervisor_id from staff table
    // Parallel: use both supervisor_id and delegate_id
    static async resolveApprover(step: any, requesterId: string): Promise<{ assignedTo: string | null; delegates: string[] }> {
        console.log(`[resolveApprover] Step:`, step, `RequesterId: ${requesterId}`);

        const approvalType = step.approval_type || 'Serial'; // Default to Serial

        // Handle empty requesterId - fallback to any HotelAdmin
        if (!requesterId) {
            console.warn(`[resolveApprover] Empty requesterId, falling back to HotelAdmin`);
            const { data: fallbackAdmin } = await supabase
                .from('staff')
                .select('id, name')
                .eq('role', 'HotelAdmin')
                .limit(1);

            if (fallbackAdmin?.[0]) {
                console.log(`[resolveApprover] Fallback to HotelAdmin: ${fallbackAdmin[0].name}`);
                return { assignedTo: fallbackAdmin[0].id, delegates: [] };
            }
            return { assignedTo: null, delegates: [] };
        }

        // Get requester's supervisor and delegate from staff table
        const { data: requester, error: reqError } = await supabase
            .from('staff')
            .select('supervisor_id, delegate_id')
            .eq('id', requesterId)
            .single();

        console.log(`[resolveApprover] Requester data:`, requester, 'Error:', reqError);

        if (!requester) {
            console.error(`[resolveApprover] Could not find requester: ${requesterId}`);
            // Fallback to HotelAdmin
            const { data: fallbackAdmin } = await supabase
                .from('staff')
                .select('id, name')
                .eq('role', 'HotelAdmin')
                .limit(1);

            if (fallbackAdmin?.[0]) {
                console.log(`[resolveApprover] Fallback to HotelAdmin: ${fallbackAdmin[0].name}`);
                return { assignedTo: fallbackAdmin[0].id, delegates: [] };
            }
            return { assignedTo: null, delegates: [] };
        }

        // Serial (串簽): STRICTLY use supervisor_id only
        if (approvalType === 'Serial') {
            if (requester.supervisor_id) {
                console.log(`[resolveApprover] Serial: Using supervisor_id = ${requester.supervisor_id}`);
                return { assignedTo: requester.supervisor_id, delegates: [] };
            }

            // Fallback: No supervisor assigned - try HotelAdmin
            console.warn(`[resolveApprover] No supervisor assigned for ${requesterId}, falling back to HotelAdmin`);
            const { data: fallbackAdmin } = await supabase
                .from('staff')
                .select('id, name')
                .eq('role', 'HotelAdmin')
                .neq('id', requesterId)
                .limit(1);

            if (fallbackAdmin?.[0]) {
                console.log(`[resolveApprover] Fallback to HotelAdmin: ${fallbackAdmin[0].name}`);
                return { assignedTo: fallbackAdmin[0].id, delegates: [] };
            }
            return { assignedTo: null, delegates: [] };
        }

        // Parallel (會簽): Use both supervisor_id and delegate_id
        if (approvalType === 'Parallel') {
            const delegates: string[] = [];

            if (requester.supervisor_id) {
                delegates.push(requester.supervisor_id);
            }

            if (requester.delegate_id && requester.delegate_id !== requester.supervisor_id) {
                delegates.push(requester.delegate_id);
            }

            console.log(`[resolveApprover] Parallel: Delegates = ${delegates.join(', ')}`);

            // For Parallel, we assign to first approver but track all delegates
            return {
                assignedTo: delegates.length > 0 ? delegates[0] : null,
                delegates
            };
        }

        // Fallback for unknown approval type
        console.warn(`[resolveApprover] Unknown approval type: ${approvalType}`);
        return { assignedTo: requester.supervisor_id || null, delegates: [] };
    }

    // 啟動簽核流程
    static async startWorkflow(
        documentId: string,
        documentType: DocumentCategory,
        documentNumber: string,
        requesterId: string,
        requesterName: string,
        amount?: number,
        nextApproverId?: string // Explicit override
    ): Promise<{ success: boolean; message: string; instanceId?: string }> {
        try {
            console.log(`[StartWorkflow] Called with:`, { documentId, documentType, documentNumber, requesterId, requesterName, amount });

            // 1. 找尋對應的流程定義
            const { data: defs, error: defError } = await supabase
                .from('workflow_definitions')
                .select('*, steps:workflow_steps(*)')
                .eq('document_category', documentType)
                .eq('is_active', true)
                .limit(1);

            console.log(`[StartWorkflow] Found definitions:`, defs, 'Error:', defError);

            if (defError || !defs || defs.length === 0) {
                console.error(`[StartWorkflow] No workflow definition found for ${documentType}`);
                return { success: false, message: '找不到對應的簽核流程定義' };
            }

            const definition = defs[0];
            const firstStep = definition.steps.find((s: any) => s.step_sequence === 1);

            console.log(`[StartWorkflow] Definition:`, definition.id, definition.name);
            console.log(`[StartWorkflow] First Step:`, firstStep);

            if (!firstStep) {
                return { success: false, message: '流程定義異常：無第一關簽核步驟' };
            }

            // Resolve Step 1 Approver
            let assignedTo = nextApproverId || null;
            if (!assignedTo) {
                console.log(`[StartWorkflow] Resolving approver for step, requesterId: ${requesterId}`);
                const { assignedTo: resolvedApprover } = await this.resolveApprover(firstStep, requesterId);
                assignedTo = resolvedApprover;
            }

            console.log(`[StartWorkflow] Final assignedTo: ${assignedTo}`);

            // 2. 建立流程實例
            const instanceId = crypto.randomUUID();
            const { error: insertError } = await supabase.from('workflow_instances').insert({
                id: instanceId,
                workflow_id: definition.id,
                document_id: documentId,
                document_type: documentType,
                document_number: documentNumber,
                current_step: 1,
                status: 'Pending',
                initiated_by: requesterName,
                initiated_by_id: requesterId,  // Store userId directly
                initiated_at: new Date().toISOString(),
                assigned_to: assignedTo // Updated logic
            });

            if (insertError) throw insertError;

            // 3. 更新單據狀態
            await this.updateDocumentStatus(documentType, documentId, 'Pending', instanceId);

            // 4. 通知第一關審核者
            if (assignedTo) {
                const { data: approver } = await supabase.from('staff').select('email, name').eq('id', assignedTo).single();
                const email = approver?.email || '';
                await this.sendNotification(assignedTo, email, '待簽核通知', `來自 ${requesterName} 的單據 ${documentNumber} 指派給您簽核。`);
            } else {
                // Broadcast to Role
                await this.notifyApprovers(firstStep, documentNumber, requesterName);
            }

            return { success: true, message: '已送出簽核申請', instanceId };

        } catch (error: any) {
            console.error('Start Workflow Error:', error);
            return { success: false, message: error.message };
        }
    }

    // 核准動作
    static async approve(
        instanceId: string,
        approverId: string,
        approverName: string,
        comments: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            // 1. 取得實例與流程定義
            const { data: instance, error: instError } = await supabase
                .from('workflow_instances')
                .select('*, definition:workflow_definitions(*, steps:workflow_steps(*))')
                .eq('id', instanceId)
                .single();

            if (instError || !instance) throw new Error('找不到流程實例');

            // Use initiated_by_id directly - no need for name lookup
            const requesterId = instance.initiated_by_id || '';

            if (!requesterId) {
                console.warn(`[Approve] No initiated_by_id on instance, falling back to name lookup for: ${instance.initiated_by}`);
                // Fallback for old records without initiated_by_id
                const { data: requesterData } = await supabase
                    .from('staff')
                    .select('id')
                    .eq('name', instance.initiated_by)
                    .limit(1);
                if (requesterData?.[0]) {
                    console.log(`[Approve] Found requester by name fallback: ${requesterData[0].id}`);
                }
            } else {
                console.log(`[Approve] Using initiated_by_id directly: ${requesterId}`);
            }

            const currentStepSeq = instance.current_step;
            const steps = instance.definition.steps.sort((a: any, b: any) => a.step_sequence - b.step_sequence);
            const currentStep = steps.find((s: any) => s.step_sequence === currentStepSeq);
            const nextStep = steps.find((s: any) => s.step_sequence === currentStepSeq + 1);

            // 2. 寫入簽核紀錄
            const { error: recError } = await supabase.from('approval_records').insert({
                id: crypto.randomUUID(),
                workflow_instance_id: instanceId,
                step_id: currentStep?.id,
                step_sequence: currentStepSeq,
                step_name: currentStep?.step_name,
                approver_id: approverId,
                approver_name: approverName,
                action: 'Approve',
                comments,
                acted_at: new Date().toISOString()
            });

            if (recError) throw recError;

            // 3. 判斷是否還有下一關
            if (nextStep) {
                // Resolve Next Approver
                const { assignedTo: nextAssignedTo } = await this.resolveApprover(nextStep, requesterId);

                // 有下一關 -> 更新步驟
                await supabase.from('workflow_instances')
                    .update({
                        current_step: nextStep.step_sequence,
                        assigned_to: nextAssignedTo // Update assignment
                    })
                    .eq('id', instanceId);

                if (nextAssignedTo) {
                    const { data: approver } = await supabase.from('staff').select('email, name').eq('id', nextAssignedTo).single();
                    if (approver) {
                        await this.sendNotification(nextAssignedTo, approver.email || '', '待簽核通知', `來自 ${instance.initiated_by} 的單據 ${instance.document_number} 目前在您的簽核關卡：${nextStep.step_name}。`);
                    }
                } else {
                    await this.notifyApprovers(nextStep, instance.document_number, instance.initiated_by);
                }

                return { success: true, message: '已核准，進入下一關' };
            } else {
                // 無下一關 -> 流程結束 (Approved)
                await supabase.from('workflow_instances')
                    .update({ status: 'Approved', completed_at: new Date().toISOString(), assigned_to: null })
                    .eq('id', instanceId);

                // 更新單據狀態為 Approved
                await this.updateDocumentStatus(instance.document_type, instance.document_id, 'Approved', instanceId);

                // 通知申請人 - 查詢 requester 資料
                const { data: requester } = await supabase.from('staff').select('email, id').eq('id', requesterId).maybeSingle();
                const requesterEmail = requester?.email || '';
                const reqId = requesterId || instance.initiated_by;

                await this.sendNotification(reqId, requesterEmail, '簽核完成通知', `您的單據 ${instance.document_number} 已完成所有簽核程序。`);

                return { success: true, message: '流程已完成結案' };
            }

        } catch (error: any) {
            console.error('Approve Error:', error);
            return { success: false, message: error.message };
        }
    }

    // 駁回動作
    static async reject(
        instanceId: string,
        approverId: string,
        approverName: string,
        comments: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            // 1. 取得實例
            const { data: instance, error: instError } = await supabase
                .from('workflow_instances')
                .select('*, definition:workflow_definitions(*, steps:workflow_steps(*))')
                .eq('id', instanceId)
                .single();

            if (instError || !instance) throw new Error('找不到流程實例');

            const currentStepSeq = instance.current_step;
            const steps = instance.definition.steps;
            const currentStep = steps.find((s: any) => s.step_sequence === currentStepSeq);

            // 2. 寫入簽核紀錄
            const { error: recError } = await supabase.from('approval_records').insert({
                id: crypto.randomUUID(),
                workflow_instance_id: instanceId,
                step_id: currentStep?.id,
                step_sequence: currentStepSeq,
                step_name: currentStep?.step_name,
                approver_id: approverId,
                approver_name: approverName,
                action: 'Reject',
                comments,
                acted_at: new Date().toISOString()
            });

            if (recError) throw recError;

            // 3. 更新實例狀態 -> Rejected
            await supabase.from('workflow_instances')
                .update({ status: 'Rejected', completed_at: new Date().toISOString(), assigned_to: null })
                .eq('id', instanceId);

            // 4. 更新單據狀態 -> Rejected
            await this.updateDocumentStatus(instance.document_type, instance.document_id, 'Rejected', instanceId);

            // 5. 通知申請人
            const { data: requester } = await supabase.from('staff').select('email, id').eq('name', instance.initiated_by).maybeSingle();
            const requesterEmail = requester?.email || '';
            const requesterId = requester?.id || instance.initiated_by;

            await this.sendNotification(requesterId, requesterEmail, '簽核駁回通知', `您的單據 ${instance.document_number} 已被駁回。原因: ${comments}`);

            return { success: true, message: '已駁回' };

        } catch (error: any) {
            console.error('Reject Error:', error);
            return { success: false, message: error.message };
        }
    }

    // 輔助: 更新各類單據狀態
    private static async updateDocumentStatus(type: string, id: string, status: string, instanceId: string) {
        let table = '';
        switch (type) {
            case 'PURCHASE_REQUISITION': table = 'purchase_requisitions'; break;
            case 'PURCHASE_ORDER': table = 'purchase_orders'; break;
            case 'GOODS_RECEIPT': table = 'goods_receipts'; break;
            case 'GOODS_ISSUE': table = 'goods_issues'; break;
            case 'STOCK_TRANSFER': table = 'stock_transfers'; break;
            case 'PETTY_CASH': table = 'petty_cash_transactions'; break;
        }

        if (table) {
            await supabase.from(table)
                .update({ status, workflow_instance_id: instanceId })
                .eq('id', id);
        }
    }

    // 輔助: 通知審核者
    private static async notifyApprovers(step: any, docNumber: string, requester: string) {
        let recipientId = '';
        let recipientEmail = '';

        if (step.approver_role) {
            // Find staff with this role
            const { data: staff } = await supabase
                .from('staff')
                .select('id, email, name')
                .eq('role', step.approver_role)
                .limit(1)
                .maybeSingle();

            if (staff) {
                recipientId = staff.id;
                recipientEmail = staff.email || '';
                console.log(`[Notification] Found staff for role ${step.approver_role}: ${staff.name} (${recipientEmail})`);
            }
        } else if (step.approverIds && step.approverIds.length > 0) {
            // For simplicity, just take the first one for the mock
            recipientId = step.approverIds[0];
            const { data: staff } = await supabase.from('staff').select('email').eq('id', recipientId).single();
            if (staff) recipientEmail = staff.email;
        }

        const message = `來自 ${requester} 的單據 ${docNumber} 目前在您的簽核關卡：${step.step_name}，請儘速處理。`;
        await this.sendNotification(recipientId, recipientEmail, '待簽核通知', message);
    }
}
