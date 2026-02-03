/**
 * 流程簽核相關類型定義
 */

import { DocumentCategory } from './inventory.types';

export type ApprovalType = 'Serial' | 'Parallel'; // 串簽 / 會簽

export interface WorkflowDefinition {
    id: string;
    name: string;
    code: string;
    documentCategory: DocumentCategory;
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    steps?: WorkflowStep[];
}

export interface WorkflowStep {
    id: string;
    workflowId: string;
    stepSequence: number;
    stepName: string;
    approvalType: ApprovalType;
    approverRole?: string;
    approverIds?: string[];
    requiredApprovals: number;
    canSkip: boolean;
    skipCondition?: string;
    timeoutHours: number;
    createdAt?: string;
}

export type WorkflowStatus = 'Pending' | 'InProgress' | 'Approved' | 'Rejected' | 'Cancelled';

export interface WorkflowInstance {
    id: string;
    workflowId: string;
    workflowName?: string;
    documentId: string;
    documentType: string;
    documentNumber?: string;
    currentStep: number;
    status: WorkflowStatus;
    initiatedBy?: string;
    initiatedAt?: string;
    completedAt?: string;
    notes?: string;
}

export type ApprovalAction = 'Approve' | 'Reject' | 'Return' | 'Delegate';

export interface ApprovalRecord {
    id: string;
    workflowInstanceId: string;
    stepId?: string;
    stepSequence: number;
    stepName?: string;
    approverId: string;
    approverName: string;
    action: ApprovalAction;
    comments?: string;
    delegatedTo?: string;
    actedAt: string;
}

export interface PendingApproval {
    workflowInstanceId: string;
    documentId: string;
    documentType: DocumentCategory;
    documentNumber: string;
    documentTitle?: string;
    requesterId: string;
    requesterName: string;
    requestedAt: string;
    currentStepName: string;
    priority: string;
    amount?: number;
}

// Custom Forms
export type FormFieldType = 'Text' | 'Number' | 'Date' | 'Textarea' | 'Select';

export interface CustomFormField {
    id: string;
    label: string;
    type: FormFieldType;
    required: boolean;
    options?: string[]; // For Select type
}

export interface CustomForm {
    id: string;
    code: string; // CF-001 etc.
    title: string;
    description?: string;
    fields: CustomFormField[];
    isActive: boolean;
    createdBy: string;
    createdAt: string;
}

export interface CustomFormSubmission {
    id: string;
    formId: string;
    formTitle: string;
    data: Record<string, any>;
    submittedBy: string;
    submittedByName: string;
    submittedAt: string;
    status: WorkflowStatus;
    documentNumber: string;
    workflowInstanceId?: string;
}
