import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../config/supabase';
import {
  Hotel, Building, Guest, Country, Room, Reservation, Transaction, Invoice,
  Staff, RoomNote, BillableItem, ConsumptionItem, AuditLogEntry, RoomTypeDefinition,
  Housekeeper, DocumentType, Warehouse, InventoryItem, InventoryRecord, Supplier,
  PurchaseRequisition, PurchaseOrder, GoodsReceipt, GoodsIssue, StockTransfer,
  PettyCashAccount, PettyCashTransaction, Department, WorkflowDefinition,
  WorkflowInstance, ApprovalRecord, PendingApproval, SystemRole, ChartOfAccount,
  JournalEntry, GeneralLedger
} from '../types';
import { realtimeService, RealtimeConnectionStatus } from '../services/RealtimeService';

export const useInitialData = (selectedHotelId: string, currentUser: Staff | null) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roomNotes, setRoomNotes] = useState<RoomNote[]>([]);
  const [billableItems, setBillableItems] = useState<BillableItem[]>([]);
  const [consumptionItems, setConsumptionItems] = useState<ConsumptionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDefinition[]>([]);
  const [tableHousekeepers, setTableHousekeepers] = useState<Housekeeper[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseRequisitions, setPurchaseRequisitions] = useState<PurchaseRequisition[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [goodsIssues, setGoodsIssues] = useState<GoodsIssue[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [pettyCashAccounts, setPettyCashAccounts] = useState<PettyCashAccount[]>([]);
  const [pettyCashTransactions, setPettyCashTransactions] = useState<PettyCashTransaction[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [workflowDefinitions, setWorkflowDefinitions] = useState<WorkflowDefinition[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<WorkflowInstance[]>([]);
  const [approvalRecords, setApprovalRecords] = useState<ApprovalRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [generalLedgers, setGeneralLedgers] = useState<GeneralLedger[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [recentlyUpdatedRooms, setRecentlyUpdatedRooms] = useState<Set<string>>(new Set());
  const [recentlyUpdatedWorkflows, setRecentlyUpdatedWorkflows] = useState<Set<string>>(new Set());

  // Derived state: Housekeepers
  const housekeepers = useMemo(() => {
    const staffHousekeepers = staff
      .filter(s =>
        s.role?.toUpperCase() === 'HOUSEKEEPER' &&
        (s.hotelId === selectedHotelId || s.authorizedHotels?.includes(selectedHotelId))
      )
      .map(s => ({
        id: s.id,
        hotelId: s.hotelId,
        employeeId: s.employeeId,
        name: s.name,
        phone: '',
        status: 'Active' as const,
        assignedFloor: '',
        cleanedToday: 0,
        authorizedBuildings: s.authorizedBuildings
      }));

    const hotelTableHousekeepers = tableHousekeepers.filter(h => h.hotelId === selectedHotelId);
    const staffIds = new Set(staffHousekeepers.map(h => h.id));
    return [
      ...staffHousekeepers,
      ...hotelTableHousekeepers.filter(h => !staffIds.has(h.id))
    ];
  }, [staff, selectedHotelId, tableHousekeepers]);

  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch Hotels first
      const { data: hData } = await supabase.from('hotels').select('*');
      const mappedHotels = (hData || []).map(h => ({
        id: h.id,
        name: h.name,
        code: h.code,
        address: h.address,
        phone: h.phone,
        checkoutTime: h.checkout_time || '11:00',
        checkinTime: h.checkin_time || '15:00',
        lateFeeThresholdHours: h.late_fee_threshold_hours || 6,
        isActive: h.is_active ?? true
      }));
      setHotels(mappedHotels);

      // Fetch all other data in parallel
      const results = await Promise.all([
        supabase.from('buildings').select('*'),
        supabase.from('rooms').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('guests').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('staff').select('*'),
        supabase.from('countries').select('*').order('sort_order', { ascending: true }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50),
        supabase.from('billable_items').select('*'),
        supabase.from('consumption_items').select('*').eq('is_active', true),
        supabase.from('suppliers').select('*'),
        supabase.from('warehouses').select('*'),
        supabase.from('inventory_items').select('*'),
        supabase.from('document_types').select('*'),
        supabase.from('purchase_requisitions').select('*'),
        supabase.from('purchase_orders').select('*'),
        supabase.from('inventory_records').select('*'),
        supabase.from('goods_receipts').select('*'),
        supabase.from('goods_issues').select('*'),
        supabase.from('stock_transfers').select('*'),
        supabase.from('departments').select('*'),
        supabase.from('system_roles').select('*'),
        supabase.from('journal_entries').select('*, lines:journal_entry_lines(*, account:chart_of_accounts(code, name))'),
        supabase.from('general_ledgers').select('*'),
        supabase.from('chart_of_accounts').select('*'),
        supabase.from('room_types').select('*'),
        supabase.from('room_notes').select('*').eq('hotel_id', selectedHotelId).order('created_at', { ascending: false }),
        supabase.from('housekeepers').select('*'),
        supabase.from('daily_cleaning_tasks').select('*').eq('task_date', new Date().toISOString().split('T')[0]),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('workflow_definitions').select('*, steps:workflow_steps(*)'),
        supabase.from('workflow_instances').select('*, definition:workflow_definitions(*, steps:workflow_steps(*))'),
        supabase.from('approval_records').select('*').order('acted_at', { ascending: false })
      ]);

      const [
        bRes, rRes, resRes, gRes, txRes, sRes, cntRes, auditRes, billItemRes, consumeRes,
        suppliersRes, warehousesRes, invItemsRes, docTypesRes, prRes, poRes, invRecordsRes,
        grRes, giRes, stRes, deptRes, rolesRes, jeRes, glRes, coaRes, rtRes, noteRes,
        hkRes, ctRes, invRes, wfDefs, wfInsts, approvalRecs
      ] = results;

      // Map and set data
      if (bRes.data) setBuildings(bRes.data.map(b => ({
        id: b.id, hotelId: b.hotel_id, name: b.name, code: b.code, isActive: b.is_active ?? true
      })));

      if (rRes.data) setRooms(rRes.data.map(r => ({
        id: r.id, hotelId: r.hotel_id, buildingId: r.building_id, number: r.number,
        type: r.type, status: r.status, floor: r.floor, housekeeper: r.housekeeper || '未指派',
        basePrice: r.base_price, lateFeePerHour: r.late_fee_per_hour || 0,
        lateFeePerDay: r.late_fee_per_day || 0, description: r.description || ''
      })));

      if (resRes.data) setReservations(resRes.data.map(r => ({
        id: r.id, hotelId: r.hotel_id, buildingId: r.building_id, guestId: r.guest_id,
        guestName: r.guest_name, phone: r.phone || '', idNumber: r.id_number,
        checkIn: r.check_in, checkOut: r.check_out, roomNumber: r.room_number,
        roomType: r.room_type, status: r.status, source: r.source || '未知',
        totalPrice: r.total_price, paidAmount: r.paid_amount, lastEditedBy: r.last_edited_by,
        createdAt: r.created_at, updatedAt: r.updated_at, discount: r.discount || 0,
        note: r.note || '', licensePlate: r.license_plate, companyName: r.company_name,
        bookingAgent: r.booking_agent, depositAmount: r.deposit_amount, roomRent: r.room_rent,
        extraItems: r.extra_items, addBed: r.add_bed, paymentMethod: r.payment_method,
        creditCard: r.credit_card, petType: r.pet_type, petCount: r.pet_count, petNote: r.pet_note
      })));

      if (gRes.data) setGuests(gRes.data.map(g => ({
        id: g.id, name: g.name, idNumber: g.id_number, phone: g.phone || '',
        vipLevel: g.vip_level || 'Normal', isBlacklisted: g.is_blacklisted || false,
        preferences: g.preferences || '', gender: g.gender || 'Other',
        nationality: g.nationality || '', blacklistReason: g.blacklist_reason,
        modificationLogs: g.modification_logs || [], taxId: g.tax_id,
        companyName: g.company_name, idCardFront: g.id_card_front, idCardBack: g.id_card_back,
        healthInsuranceCard: g.health_insurance_card, passportOrPermit: g.passport_or_permit
      })));

      if (txRes.data) setTransactions(txRes.data.map(t => ({
        id: t.id, hotelId: t.hotel_id, reservationId: t.reservation_id, amount: t.amount,
        type: t.type, method: t.method, description: t.description || '',
        createdAt: t.created_at, staffName: t.staff_name
      })));

      if (sRes.data) setStaff(sRes.data.map(s => ({
        id: s.id, hotelId: s.hotel_id, employeeId: s.employee_id, name: s.name,
        role: s.role, title: s.title, authorizedHotels: s.authorized_hotels || [],
        authorizedBuildings: s.authorized_buildings || [], featurePermissions: s.feature_permissions || [],
        email: s.email, lineId: s.line_id, telegramId: s.telegram_id, wechatId: s.wechat_id,
        departmentId: s.department_id, supervisorId: s.supervisor_id, delegateId: s.delegate_id
      })));

      if (cntRes.data) setCountries(cntRes.data);

      if (auditRes.data) setAuditLogs(auditRes.data.map(l => ({
        id: l.id, timestamp: l.timestamp, action: l.action, staffName: l.staff_name,
        staff: l.staff_name, hotel: l.hotel_id, impact: l.impact
      })));

      if (billItemRes.data) setBillableItems(billItemRes.data.map(b => ({
        id: b.id, reservationId: b.reservation_id, description: b.description,
        amount: b.amount, quantity: b.quantity, paymentMethod: b.payment_method,
        note: b.note, createdAt: b.created_at, createdBy: b.created_by
      })));

      if (consumeRes.data) setConsumptionItems(consumeRes.data);
      if (suppliersRes.data) setSuppliers(suppliersRes.data.map(s => ({
        id: s.id, code: s.code, name: s.name, contactPerson: s.contact_person,
        phone: s.phone, email: s.email, address: s.address, taxId: s.tax_id,
        paymentTerms: s.payment_terms, bankAccount: s.bank_account, bankName: s.bank_name,
        notes: s.notes, isActive: s.is_active
      })));

      if (warehousesRes.data) setWarehouses(warehousesRes.data.map(w => ({
        id: w.id, hotelId: w.hotel_id, code: w.code, name: w.name, location: w.location,
        managerId: w.manager_id, managerName: w.manager_name, isActive: w.is_active
      })));

      if (invItemsRes.data) setInventoryItems(invItemsRes.data.map(i => ({
        id: i.id, code: i.code, name: i.name, category: i.category, unit: i.unit,
        specification: i.specification, barcode: i.barcode, safetyStock: i.safety_stock,
        reorderPoint: i.reorder_point, defaultSupplierId: i.default_supplier_id,
        defaultUnitPrice: i.default_unit_price, accountingCode: i.accounting_code,
        isActive: i.is_active
      })));

      if (docTypesRes.data) setDocumentTypes(docTypesRes.data.map(dt => ({
        id: dt.id || '', code: dt.code || '', name: dt.name || '', category: dt.category || '',
        description: dt.description || '', accountingCode: dt.accounting_code || '',
        isActive: dt.is_active || false, customFormId: dt.custom_form_id
      })));

      if (prRes.data) setPurchaseRequisitions(prRes.data.map(pr => ({
        id: pr.id || '', prNumber: pr.pr_number || '', hotelId: pr.hotel_id || '',
        documentTypeId: pr.document_type_id || '', requesterId: pr.requester_id || '',
        requesterName: pr.requester_name || '', department: pr.department || '',
        requestDate: pr.request_date || '', requiredDate: pr.required_date || '',
        status: pr.status || 'Draft', priority: pr.priority || 'Normal',
        totalAmount: pr.total_amount || 0, notes: pr.notes || ''
      })));

      if (poRes.data) setPurchaseOrders(poRes.data.map(po => ({
        id: po.id || '', poNumber: po.po_number || '', hotelId: po.hotel_id || '',
        documentTypeId: po.document_type_id || '', prId: po.pr_id || '',
        supplierId: po.supplier_id || '', supplierName: po.supplier_name || '',
        buyerId: po.buyer_id || '', buyerName: po.buyer_name || '', orderDate: po.order_date || '',
        expectedDeliveryDate: po.expected_delivery_date || '', status: po.status || 'Draft',
        priority: po.priority || 'Normal', subtotal: po.subtotal || 0, taxRate: po.tax_rate || 0,
        taxAmount: po.tax_amount || 0, totalAmount: po.total_amount || 0,
        paymentTerms: po.payment_terms || '', notes: po.notes || ''
      })));

      if (invRecordsRes.data) setInventoryRecords(invRecordsRes.data.map(r => ({
        id: r.id, warehouseId: r.warehouse_id || '', itemId: r.item_id || '',
        quantity: r.quantity || 0, reservedQuantity: r.reserved_quantity || 0,
        lastReceiptDate: r.last_receipt_date || '', lastIssueDate: r.last_issue_date || '',
        createdAt: r.created_at || '', updatedAt: r.updated_at || ''
      })));

      if (grRes.data) setGoodsReceipts(grRes.data.map(g => ({
        id: g.id, grNumber: g.gr_number || '', hotelId: g.hotel_id || '',
        documentTypeId: g.document_type_id || '', poId: g.po_id || undefined,
        warehouseId: g.warehouse_id || '', supplierId: g.supplier_id || undefined,
        supplierName: g.supplier_name || '', receiptDate: g.receipt_date || '',
        receiverId: g.receiver_id || '', receiverName: g.receiver_name || '',
        status: g.status || 'Draft', totalAmount: g.total_amount || 0,
        invoiceNumber: g.invoice_number || '', notes: g.notes || '',
        createdAt: g.created_at || '', updatedAt: g.updated_at || ''
      })));

      if (giRes.data) setGoodsIssues(giRes.data.map(g => ({
        id: g.id, giNumber: g.gi_number || '', hotelId: g.hotel_id || '',
        documentTypeId: g.document_type_id || '', warehouseId: g.warehouse_id || '',
        issueDate: g.issue_date || '', issuerId: g.issuer_id || '',
        issuerName: g.issuer_name || '', requesterId: g.requester_id || '',
        requesterName: g.requester_name || '', department: g.department || '',
        purpose: g.purpose || '', status: g.status || 'Draft', totalAmount: g.total_amount || 0,
        notes: g.notes || '', createdAt: g.created_at || '', updatedAt: g.updated_at || ''
      })));

      if (stRes.data) setStockTransfers(stRes.data.map(st => ({
        id: st.id, stNumber: st.st_number || '', documentTypeId: st.document_type_id || '',
        fromHotelId: st.from_hotel_id || '', fromWarehouseId: st.from_warehouse_id || '',
        toHotelId: st.to_hotel_id || '', toWarehouseId: st.to_warehouse_id || '',
        transferDate: st.transfer_date || '', requesterId: st.requester_id || '',
        requesterName: st.requester_name || '', status: st.status || 'Draft',
        priority: st.priority || 'Normal', reason: st.reason || '', totalAmount: st.total_amount || 0,
        notes: st.notes || '', createdAt: st.created_at || '', updatedAt: st.updated_at || ''
      })));

      if (deptRes.data) setDepartments(deptRes.data.map(d => ({
        id: d.id, name: d.name, code: d.code, managerId: d.manager_id, parentId: d.parent_id, createdAt: d.created_at
      })));

      if (jeRes.data) setJournalEntries(jeRes.data.map(je => ({
        id: je.id, entryNumber: je.entry_number, hotelId: je.hotel_id, entryDate: je.entry_date,
        postingDate: je.posting_date, period: je.period, status: je.status, description: je.description,
        totalDebit: je.total_debit, totalCredit: je.total_credit, sourceType: je.source_type,
        sourceId: je.source_id, createdBy: je.created_by, approvedBy: je.approved_by, createdAt: je.created_at,
        lines: je.lines?.map((l: any) => ({
          id: l.id, entryId: l.entry_id, lineNumber: l.line_number, accountId: l.account_id,
          accountCode: l.account?.code, accountName: l.account?.name, debitAmount: l.debit_amount,
          creditAmount: l.credit_amount, description: l.description, createdAt: l.created_at
        })) || []
      })));

      if (glRes.data) setGeneralLedgers(glRes.data.map(gl => ({
        id: gl.id, hotelId: gl.hotel_id, accountId: gl.account_id, period: gl.period,
        openingBalance: gl.opening_balance, totalDebit: gl.total_debit, totalCredit: gl.total_credit,
        closingBalance: gl.closing_balance, updatedAt: gl.updated_at
      })));

      if (coaRes.data) setChartOfAccounts(coaRes.data.map(a => ({
        id: a.id, code: a.code, name: a.name, type: a.type, level: a.level,
        isActive: a.is_active, normalBalance: a.normal_balance
      })));

      if (noteRes.data) setRoomNotes(noteRes.data.map(n => ({
        id: n.id, roomId: n.room_id, hotelId: n.hotel_id, content: n.content,
        staffName: n.staff_name, createdAt: n.created_at
      })));

      if (hkRes.data) setTableHousekeepers(hkRes.data.map(h => ({
        id: h.id, hotelId: h.hotel_id, employeeId: h.employee_id, name: h.name,
        phone: h.phone || '', status: h.status, assignedFloor: h.assigned_floor || '',
        cleanedToday: h.cleaned_today || 0
      })));

      if (ctRes.data) setCleaningTasks(ctRes.data.map(t => ({
        id: t.id, hotelId: t.hotel_id, roomId: t.room_id, roomNumber: t.room_number,
        taskDate: t.task_date, taskType: t.task_type, priority: t.priority, status: t.status,
        housekeeperId: t.housekeeper_id, housekeeperName: t.housekeeper_name,
        assignedAt: t.assigned_at, startedAt: t.started_at, completedAt: t.completed_at,
        notes: t.notes, exceptions: t.exceptions
      })));

      if (invRes.data) setInvoices(invRes.data.map(i => ({
        id: i.id, hotelId: i.hotel_id, reservationId: i.reservation_id, invoiceNumber: i.invoice_number,
        amount: i.amount, tax: i.tax, netAmount: i.net_amount, status: i.status,
        createdAt: i.created_at, createdBy: i.created_by
      })));

      if (rtRes.data) setRoomTypes(rtRes.data.map(rt => ({
        id: rt.id, hotelId: rt.hotel_id, name: rt.name, code: rt.code,
        description: rt.description, isActive: rt.is_active, createdAt: rt.created_at
      })));

      if (rolesRes.data) setSystemRoles(rolesRes.data.map(r => ({
        id: r.id, code: r.code, name: r.name, description: r.description,
        level: r.level, isSystem: r.is_system, permissions: r.permissions, createdAt: r.created_at
      })));

      if (wfDefs.data) {
        setWorkflowDefinitions(wfDefs.data.map((d: any) => ({
          id: d.id, name: d.name, code: d.code, documentCategory: d.document_category,
          description: d.description, isActive: d.is_active, createdAt: d.created_at,
          steps: (d.steps || []).map((s: any) => ({
            id: s.id, workflowId: s.workflow_id, stepSequence: s.step_sequence,
            stepName: s.step_name, approvalType: s.approval_type || 'Serial',
            approverRole: s.approver_role || 'HotelAdmin', approverIds: s.approver_ids,
            requiredApprovals: s.required_approvals || 1, canSkip: s.can_skip || false,
            skipCondition: s.skip_condition, timeoutHours: s.timeout_hours || 24, createdAt: s.created_at
          }))
        })));
      }

      if (wfInsts.data) {
        const instances = wfInsts.data.map((i: any) => ({
          id: i.id, workflowId: i.workflow_id, workflowName: i.definition?.name,
          documentId: i.document_id, documentType: i.document_type, documentNumber: i.document_number,
          currentStep: i.current_step, status: i.status, initiatedBy: i.initiated_by,
          initiatedAt: i.initiated_at, completedAt: i.completed_at, notes: i.notes
        }));
        setWorkflowInstances(instances);

        // Handle Pending Approvals
        if (currentUser) {
          const pendings = wfInsts.data.filter((i: any) => {
            if (i.status !== 'Pending') return false;
            if (i.assigned_to === currentUser.id) return true;

            // Self-approval check
            let requesterId = '';
            if (i.document_type === 'PURCHASE_REQUISITION') requesterId = prRes.data?.find(d => d.id === i.document_id)?.requester_id;
            else if (i.document_type === 'PURCHASE_ORDER') requesterId = poRes.data?.find(d => d.id === i.document_id)?.buyer_id;
            else if (i.document_type === 'GOODS_ISSUE') requesterId = giRes.data?.find(d => d.id === i.document_id)?.requester_id || giRes.data?.find(d => d.id === i.document_id)?.issuer_id;
            else if (i.document_type === 'STOCK_TRANSFER') requesterId = stRes.data?.find(d => d.id === i.document_id)?.requester_id;

            if (requesterId && requesterId === currentUser.id) return false;

            const currentStepDef = i.definition?.steps?.find((s: any) => s.step_sequence === i.current_step);
            if (!currentStepDef) return false;
            if (currentStepDef.approver_role && currentUser.role === currentStepDef.approver_role) return true;
            if (currentStepDef.approver_ids && currentStepDef.approver_ids.includes(currentUser.id)) return true;
            return false;
          }).map((i: any) => {
            const currentStepDef = i.definition?.steps?.find((s: any) => s.step_sequence === i.current_step);
            let amount = 0;
            let priority = 'Normal';
            let requesterName = i.initiated_by;

            if (i.document_type === 'PURCHASE_REQUISITION') {
              const doc = prRes.data?.find(d => d.id === i.document_id);
              if (doc) { amount = doc.total_amount || 0; priority = doc.priority || 'Normal'; requesterName = doc.requester_name || i.initiated_by; }
            } else if (i.document_type === 'PURCHASE_ORDER') {
              amount = poRes.data?.find(d => d.id === i.document_id)?.total_amount || 0;
            } else if (i.document_type === 'GOODS_RECEIPT') {
              amount = grRes.data?.find(d => d.id === i.document_id)?.total_amount || 0;
            } else if (i.document_type === 'STOCK_TRANSFER') {
              const doc = stRes.data?.find(d => d.id === i.document_id);
              if (doc) { amount = doc.total_amount || 0; priority = doc.priority || 'Normal'; requesterName = doc.requester_name || i.initiated_by; }
            }

            return {
              workflowInstanceId: i.id, documentId: i.document_id, documentType: i.document_type,
              documentNumber: i.document_number, requesterId: '', requesterName: requesterName,
              requestedAt: i.initiated_at, currentStepName: currentStepDef?.step_name || `步驟 ${i.current_step}`,
              priority: priority, amount: amount
            };
          });
          setPendingApprovals(pendings);
        }
      }

      if (approvalRecs.data) setApprovalRecords(approvalRecs.data.map((r: any) => ({
        id: r.id, workflowInstanceId: r.workflow_instance_id, stepId: r.step_id,
        stepSequence: r.step_sequence, stepName: r.step_name, approverId: r.approver_id,
        approverName: r.approver_name, action: r.action, comments: r.comments, actedAt: r.acted_at
      })));

    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedHotelId, currentUser]);

  const refreshInvoices = useCallback(async () => {
    try {
      const { data: invoiceData, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (invoiceData) setInvoices(invoiceData.map(i => ({
        id: i.id, hotelId: i.hotel_id, reservationId: i.reservation_id, invoiceNumber: i.invoice_number,
        amount: i.amount, tax: i.tax, netAmount: i.net_amount, status: i.status,
        createdAt: i.created_at, createdBy: i.created_by
      })));
    } catch (err) {
      console.error('[refreshInvoices] Exception:', err);
    }
  }, []);

  const refreshJournalEntries = useCallback(async () => {
    try {
      const { data: jeRes, error } = await supabase.from('journal_entries')
        .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(code, name))')
        .order('entry_date', { ascending: false });
      if (error) throw error;
      if (jeRes) setJournalEntries(jeRes.map(je => ({
        id: je.id, entryNumber: je.entry_number, hotelId: je.hotel_id, entryDate: je.entry_date,
        postingDate: je.posting_date, period: je.period, status: je.status, description: je.description,
        totalDebit: je.total_debit, totalCredit: je.total_credit, sourceType: je.source_type,
        sourceId: je.source_id, createdBy: je.created_by, approvedBy: je.approved_by, createdAt: je.created_at,
        lines: je.lines?.map((l: any) => ({
          id: l.id, entryId: l.entry_id, lineNumber: l.line_number, accountId: l.account_id,
          accountCode: l.account?.code, accountName: l.account?.name, debitAmount: l.debit_amount,
          creditAmount: l.credit_amount, description: l.description, createdAt: l.created_at
        })) || []
      })));
    } catch (err) {
      console.error('Error in refreshJournalEntries:', err);
    }
  }, []);

  // Realtime Subscriptions
  useEffect(() => {
    if (!selectedHotelId) return;

    realtimeService.initialize(selectedHotelId);
    const unsubStatus = realtimeService.onStatusChange(setRealtimeStatus);
    const unsubSync = realtimeService.onSyncTimeChange(setLastSyncTime);

    const roomSubId = realtimeService.subscribe<Room>('rooms', (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const nr: any = payload.new;
        setRooms(prev => {
          const exists = prev.find(r => r.id === nr.id);
          if (exists) return prev.map(r => r.id === nr.id ? { ...r, status: nr.status, housekeeper: nr.housekeeper || '未指派' } : r);
          return [...prev, {
            id: nr.id, hotelId: nr.hotel_id, buildingId: nr.building_id, number: nr.number, type: nr.type,
            status: nr.status, floor: nr.floor, housekeeper: nr.housekeeper || '未指派',
            basePrice: nr.base_price, lateFeePerHour: nr.late_fee_per_hour || 0,
            lateFeePerDay: nr.late_fee_per_day || 0, description: nr.description || ''
          }];
        });
        setRecentlyUpdatedRooms(prev => new Set(prev).add(nr.id));
        setTimeout(() => setRecentlyUpdatedRooms(prev => { const next = new Set(prev); next.delete(nr.id); return next; }), 2000);
      } else if (payload.eventType === 'DELETE') {
        setRooms(prev => prev.filter(r => r.id !== payload.old.id));
      }
    });

    const resSubId = realtimeService.subscribe<Reservation>('reservations', (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const res: any = payload.new;
        setReservations(prev => {
          const exists = prev.find(r => r.id === res.id);
          if (exists) return prev.map(r => r.id === res.id ? {
            ...r, status: res.status, paidAmount: res.paid_amount, totalPrice: res.total_price,
            discount: res.discount || 0, checkOut: res.check_out, note: res.note,
            guestName: res.guest_name, roomNumber: res.room_number, lastEditedBy: res.last_edited_by,
            createdAt: res.created_at, updatedAt: res.updated_at
          } : r);
          return [...prev, {
            id: res.id, hotelId: res.hotel_id, buildingId: res.building_id, guestId: res.guest_id,
            guestName: res.guest_name, phone: res.phone || '', idNumber: res.id_number,
            checkIn: res.check_in, checkOut: res.check_out, roomNumber: res.room_number,
            roomType: res.room_type, status: res.status, source: res.source || '未知',
            totalPrice: res.total_price, paidAmount: res.paid_amount, lastEditedBy: res.last_edited_by,
            discount: res.discount || 0, note: res.note || '', licensePlate: res.license_plate,
            companyName: res.company_name, bookingAgent: res.booking_agent, depositAmount: res.deposit_amount,
            roomRent: res.room_rent, extraItems: res.extra_items, addBed: res.add_bed,
            paymentMethod: res.payment_method, creditCard: res.credit_card, petType: res.pet_type,
            petCount: res.pet_count, petNote: res.pet_note
          }];
        });
      } else if (payload.eventType === 'DELETE') {
        setReservations(prev => prev.filter(r => r.id !== payload.old.id));
      }
    });

    const taskSubId = realtimeService.subscribe('daily_cleaning_tasks', (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const task = payload.new;
        setCleaningTasks(prev => {
          const exists = prev.find(t => t.id === task.id);
          if (exists) return prev.map(t => t.id === task.id ? task : t);
          return [...prev, task];
        });
      } else if (payload.eventType === 'DELETE') {
        setCleaningTasks(prev => prev.filter(t => t.id !== payload.old.id));
      }
    });

    const workflowSubId = realtimeService.subscribe('workflow_instances', (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const inst = payload.new;
        setWorkflowInstances(prev => {
          const exists = prev.find(w => w.id === inst.id);
          if (exists) return prev.map(w => w.id === inst.id ? { ...w, ...inst } : w);
          return [...prev, inst];
        });
        setRecentlyUpdatedWorkflows(prev => new Set(prev).add(inst.id));
        setTimeout(() => setRecentlyUpdatedWorkflows(prev => { const next = new Set(prev); next.delete(inst.id); return next; }), 2000);
      } else if (payload.eventType === 'DELETE') {
        setWorkflowInstances(prev => prev.filter(w => w.id !== payload.old.id));
      }
    });

    const approvalSubId = realtimeService.subscribe('approval_records', (payload) => {
      if (payload.eventType === 'INSERT') {
        const record = payload.new;
        setApprovalRecords(prev => [record, ...prev]);
      }
    });

    const noteSubId = realtimeService.subscribe('room_notes', (payload) => {
      if (payload.eventType === 'INSERT') {
        const note = payload.new;
        if (note.hotel_id === selectedHotelId) setRoomNotes(prev => [note, ...prev]);
      } else if (payload.eventType === 'DELETE') {
        setRoomNotes(prev => prev.filter(n => n.id !== payload.old.id));
      }
    });

    const prSubId = realtimeService.subscribe('purchase_requisitions', (payload) => {
      if (payload.eventType === 'UPDATE') {
        const pr = payload.new;
        setPurchaseRequisitions(prev => prev.map(p => p.id === pr.id ? { ...p, status: pr.status } : p));
      }
    });

    const poSubId = realtimeService.subscribe('purchase_orders', (payload) => {
      if (payload.eventType === 'UPDATE') {
        const po = payload.new;
        setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status: po.status } : p));
      }
    });

    return () => {
      unsubStatus();
      unsubSync();
      realtimeService.unsubscribe(roomSubId);
      realtimeService.unsubscribe(resSubId);
      realtimeService.unsubscribe(taskSubId);
      realtimeService.unsubscribe(workflowSubId);
      realtimeService.unsubscribe(approvalSubId);
      realtimeService.unsubscribe(noteSubId);
      realtimeService.unsubscribe(prSubId);
      realtimeService.unsubscribe(poSubId);
    };
  }, [selectedHotelId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return {
    isLoading, hotels, buildings, guests, countries, rooms, reservations, transactions,
    invoices, staff, roomNotes, billableItems, consumptionItems, auditLogs, roomTypes,
    housekeepers, cleaningTasks, documentTypes, warehouses, inventoryItems, inventoryRecords,
    suppliers, purchaseRequisitions, purchaseOrders, goodsReceipts, goodsIssues, stockTransfers,
    pettyCashAccounts, pettyCashTransactions, departments, workflowDefinitions, workflowInstances,
    approvalRecords, pendingApprovals, systemRoles, chartOfAccounts, journalEntries, generalLedgers,
    realtimeStatus, lastSyncTime, recentlyUpdatedRooms, recentlyUpdatedWorkflows,
    setRooms, setReservations, setInvoices, setRoomNotes, setJournalEntries,
    setTransactions, setGuests, setStaff, setBuildings, setBillableItems,
    setConsumptionItems, setAuditLogs, setRoomTypes, setDepartments,
    setSystemRoles, setChartOfAccounts, setGeneralLedgers, setWarehouses,
    setInventoryItems, setInventoryRecords, setSuppliers, setPurchaseRequisitions,
    setPurchaseOrders, setGoodsReceipts, setGoodsIssues, setStockTransfers,
    setPettyCashAccounts, setPettyCashTransactions, setWorkflowDefinitions,
    setWorkflowInstances, setApprovalRecords, setPendingApprovals,
    setHotels, setCleaningTasks, setDocumentTypes, setTableHousekeepers,
    tableHousekeepers, fetchInitialData, refreshInvoices, refreshJournalEntries, refreshDocumentTypes
  };
};
