import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { ConsumptionItem, ChartOfAccount, DocumentType, DocumentCategory, CustomForm } from '../../types';
import { CustomFormService } from '../../services/CustomFormService';

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  'PURCHASE_REQUISITION': '請購單',
  'PURCHASE_ORDER': '採購單',
  'GOODS_RECEIPT': '進貨單',
  'GOODS_ISSUE': '出貨/領用單',
  'STOCK_TRANSFER': '調撥單',
  'PETTY_CASH': '零用金',
  'CUSTOM_FORM': '自定義單據'
};

interface Props {
  hotelId: string;
  accounts: ChartOfAccount[];
  documentTypes: DocumentType[];
  onAddDocType: (dt: Omit<DocumentType, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateDocType: (id: string, dt: Partial<DocumentType>) => Promise<void>;
  onDeleteDocType: (id: string) => Promise<void>;
}

const DocumentSubjectMapping: React.FC<Props> = ({
  hotelId,
  accounts,
  documentTypes,
  onAddDocType,
  onUpdateDocType,
  onDeleteDocType
}) => {
  const [items, setItems] = useState<ConsumptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Document Type Management State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'PURCHASE_ORDER' as DocumentCategory,
    description: '',
    accountingCode: '',
    customFormId: '',
    isActive: true
  });

  const [customForms, setCustomForms] = useState<CustomForm[]>([]);

  useEffect(() => {
    fetchItems();
    fetchCustomForms();
  }, [hotelId]);

  const fetchCustomForms = async () => {
    const { data, error } = await supabase.from('custom_forms').select('*').eq('is_active', true);
    if (!error) setCustomForms(data || []);
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      let query = supabase.from('consumption_items').select('*');

      if (hotelId) {
        query = query.or(`hotel_id.eq.${hotelId},hotel_id.is.null`);
      } else {
        query = query.is('hotel_id', null);
      }

      const { data, error } = await query.order('category');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching consumption items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCreateForm = async () => {
    if (!formData.name) return alert('請先輸入單據名稱作為表單標題');
    try {
      const defaultFields = Array.from({ length: 10 }).map((_, i) => ({
        id: crypto.randomUUID(),
        label: `欄位 ${i + 1}`,
        type: 'Text' as const,
        required: false
      }));

      const { id } = await CustomFormService.createForm({
        title: formData.name,
        description: '由單據對應快速建立',
        fields: defaultFields,
        isActive: true,
        createdBy: 'system'
      });

      await fetchCustomForms();
      setFormData(p => ({ ...p, customFormId: id }));
      alert('已建立標準模板（含10個預設欄位）');
    } catch (e: any) {
      alert('建立失敗: ' + e.message);
    }
  };

  const handleUpdateItemMapping = async (itemId: string, accountCode: string) => {
    try {
      setSaving(`item-${itemId}`);
      const { error } = await supabase
        .from('consumption_items')
        .update({ accounting_code: accountCode })
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, accounting_code: accountCode } : item
      ));
    } catch (error) {
      console.error('Error updating item mapping:', error);
      alert('更新失敗');
    } finally {
      setSaving(null);
    }
  };


  if (loading) return <div className="p-8 text-center text-slate-500">載入中...</div>;

  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ConsumptionItem[]>);

  // Filter only Revenue or related accounts to make selection easier
  const revenueAccounts = accounts.filter(a => a.type === 'Revenue' || a.type === 'Asset' || a.type === 'Liability');

  const renderForm = () => (
    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
      <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
        {editingId ? <Pencil size={18} /> : <Plus size={18} />}
        {editingId ? '編輯單據類別' : '新增單據類別'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">代碼 (系統產生)</label>
          <input
            type="text"
            value={formData.code}
            readOnly
            disabled
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
            placeholder="系統自動產生"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">名稱 *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="例: 一般採購"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">對應單據</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as DocumentCategory }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">會計科目</label>
          <select
            value={formData.accountingCode}
            onChange={(e) => setFormData(p => ({ ...p, accountingCode: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">未設定</option>
            {revenueAccounts.map(acc => (
              <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
            ))}
          </select>
        </div>

        {formData.category === 'CUSTOM_FORM' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">綁定自定義表單</label>
            <select
              value={formData.customFormId}
              onChange={(e) => setFormData(p => ({ ...p, customFormId: e.target.value }))}
              className="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg text-sm"
            >
              <option value="">-- 請選擇模板 --</option>
              {customForms.map(cf => (
                <option key={cf.id} value={cf.id}>{cf.title}</option>
              ))}
            </select>
            <button
              onClick={handleQuickCreateForm}
              className="mt-2 text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              <Plus size={10} /> 快速建立新模板 (自動配置10欄位)
            </button>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => { setIsAdding(false); setEditingId(null); }}
          className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors text-sm font-bold"
        >
          取消
        </button>
        <button
          onClick={async () => {
            if (!formData.code || !formData.name) return alert('請填寫代碼與名稱');
            if (editingId) {
              await onUpdateDocType(editingId, formData);
            } else {
              await onAddDocType(formData);
            }
            setIsAdding(false);
            setEditingId(null);
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-md flex items-center gap-2"
        >
          <Check size={18} />
          儲存設定
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. System Document Mapping Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">系統單據對應科目</h2>
            <p className="text-sm text-slate-500">設定採購、進貨、零用金等系統單據對應的會計科目</p>
          </div>
          <button
            onClick={() => {
              const newCode = `DOC-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
              setIsAdding(true);
              setEditingId(null);
              setFormData({
                code: newCode,
                name: '',
                category: 'PURCHASE_ORDER',
                description: '',
                accountingCode: '',
                isActive: true
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-bold shadow-sm"
          >
            <Plus size={18} />
            新增單據類別
          </button>
        </div>

        {/* Add Form (only if isAdding) */}
        {isAdding && (
          <div className="mb-6">
            {renderForm()}
          </div>
        )}

        <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* List Header */}
          <div className="grid grid-cols-[1fr_100px_120px_200px_100px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div>單據名稱 / 類別</div>
            <div>代碼</div>
            <div>對應單據</div>
            <div>會計科目映射</div>
            <div className="text-right">操作</div>
          </div>

          {documentTypes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white italic">
              尚無單據類別。請點擊「新增單據類別」開始。
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white">
              {documentTypes.map(dt => (
                <React.Fragment key={dt.id}>
                  {/* Data Row */}
                  <div
                    className={`grid grid-cols-[1fr_100px_120px_200px_100px] gap-4 px-6 py-4 items-center transition-colors group ${editingId === dt.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      } ${!dt.isActive ? 'grayscale opacity-60 bg-slate-50' : ''}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{dt.name}</span>
                        {!dt.isActive && (
                          <span className="text-[10px] px-2 py-0.5 bg-slate-300 text-slate-600 rounded-full font-bold">
                            已停用
                          </span>
                        )}
                      </div>
                      {dt.description && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{dt.description}</div>}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-500">{dt.code}</div>
                    <div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-md text-[10px] font-bold uppercase whitespace-nowrap">
                        {CATEGORY_LABELS[dt.category]}
                      </span>
                    </div>
                    <div>
                      <select
                        value={dt.accountingCode || ''}
                        onChange={(e) => onUpdateDocType(dt.id, { accountingCode: e.target.value })}
                        disabled={saving === `doc-${dt.id}`}
                        className="w-full text-xs border-slate-200 rounded-lg py-1.5 pl-2 pr-8 bg-white focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">未設定</option>
                        {revenueAccounts.map(acc => (
                          <option key={acc.id} value={acc.code}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          if (editingId === dt.id) {
                            setEditingId(null);
                          } else {
                            setEditingId(dt.id);
                            setFormData({
                              code: dt.code,
                              name: dt.name,
                              category: dt.category,
                              description: dt.description || '',
                              accountingCode: dt.accountingCode || '',
                              customFormId: dt.customFormId || '',
                              isActive: dt.isActive
                            });
                            setIsAdding(false);
                          }
                        }}
                        className={`p-2 rounded-lg transition-colors ${editingId === dt.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        title="編輯"
                      >
                        {editingId === dt.id ? <X size={16} /> : <Pencil size={16} />}
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('確定要刪除此單據類別嗎？')) {
                            await onDeleteDocType(dt.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="刪除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Inline Edit Form */}
                  {editingId === dt.id && (
                    <div className="p-6 bg-blue-50/30 border-y border-blue-100 animate-in slide-in-from-top-2 duration-200">
                      {renderForm()}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Consumption Item Mapping Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">消費品項對應科目</h2>
          <p className="text-sm text-slate-500">設定房客消費品項（如餐飲、耗材）對應的會計科目</p>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedItems).length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              尚無房客消費品項。請先至「房務管理 &gt; 消費品項」新增。
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="border-b last:border-0 pb-6 last:pb-0 border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group hover:bg-white hover:shadow-md transition-all border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-700">{item.name}</div>
                        <div className="text-xs text-slate-400 font-mono">${item.price}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={item.accounting_code || ''}
                          onChange={(e) => handleUpdateItemMapping(item.id, e.target.value)}
                          disabled={saving === `item-${item.id}`}
                          className="text-sm border-slate-200 rounded-md py-1 pl-2 pr-8 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">未設定</option>
                          {revenueAccounts.map(acc => (
                            <option key={acc.id} value={acc.code}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                        {saving === `item-${item.id}` && (
                          <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentSubjectMapping;
