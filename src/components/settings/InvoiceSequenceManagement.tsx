import React, { useState, useEffect } from 'react';
import { Hotel, InvoiceSequence } from '../../types';
import { supabase } from '../../config/supabase';

interface Props {
  hotels: Hotel[];
  selectedHotelId: string;
}

const InvoiceSequenceManagement: React.FC<Props> = ({ hotels }) => {
  const [sequences, setSequences] = useState<InvoiceSequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<InvoiceSequence | null>(null);
  const [formData, setFormData] = useState({ hotelId: '', prefix: '', currentNumber: 10000001 });

  useEffect(() => { loadSequences(); }, []);

  const loadSequences = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('invoice_sequences').select('*');
      if (error) throw error;
      setSequences((data || []).map((s: { hotel_id: string; prefix: string; current_number: number }) => ({
        hotelId: s.hotel_id,
        prefix: s.prefix,
        currentNumber: s.current_number
      })));
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSequence) {
        await supabase.from('invoice_sequences').update({ prefix: formData.prefix, current_number: formData.currentNumber }).eq('hotel_id', editingSequence.hotelId);
        setSequences(prev => prev.map(s => s.hotelId === editingSequence.hotelId ? { ...s, prefix: formData.prefix, currentNumber: formData.currentNumber } : s));
      } else {
        if (sequences.find(s => s.hotelId === formData.hotelId)) { alert('Already exists'); return; }
        await supabase.from('invoice_sequences').insert({ hotel_id: formData.hotelId, prefix: formData.prefix, current_number: formData.currentNumber });
        setSequences(prev => [...prev, { hotelId: formData.hotelId, prefix: formData.prefix, currentNumber: formData.currentNumber }]);
      }
      setIsFormOpen(false);
      setEditingSequence(null);
      setFormData({ hotelId: '', prefix: '', currentNumber: 10000001 });
    } catch (e) {
      alert('Save failed');
    }
  };

  const handleDelete = async (hotelId: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from('invoice_sequences').delete().eq('hotel_id', hotelId);
    setSequences(prev => prev.filter(s => s.hotelId !== hotelId));
  };

  const getHotelName = (hid: string) => hotels.find(h => h.id === hid)?.name || hid;
  const getHotelCode = (hid: string) => hotels.find(h => h.id === hid)?.code || '';
  const unconfiguredHotels = hotels.filter(h => !sequences.find(s => s.hotelId === h.id));

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Invoice Sequence Management</h1>
          <p className="text-slate-500 text-sm">Configure invoice track prefixes for each hotel</p>
        </div>
        <button onClick={() => { setEditingSequence(null); setFormData({ hotelId: unconfiguredHotels[0]?.id || '', prefix: '', currentNumber: 10000001 }); setIsFormOpen(true); }} disabled={unconfiguredHotels.length === 0} className={`${unconfiguredHotels.length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'} px-6 py-2.5 rounded-2xl font-black shadow-lg`}>+ Add Track</button>
      </header>

      {unconfiguredHotels.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
          <span className="text-2xl">Warning</span>
          <p className="text-xs text-amber-600">Hotels without invoice sequences: {unconfiguredHotels.map(h => h.name).join(', ')}</p>
        </div>
      )}

      {isLoading ? (<div className="py-20 text-center">Loading...</div>) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-black uppercase text-slate-400">
              <tr><th className="px-6 py-4">Hotel</th><th className="px-6 py-4">Prefix</th><th className="px-6 py-4">Current #</th><th className="px-6 py-4">Example</th><th className="px-6 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sequences.map(seq => (
                <tr key={seq.hotelId} className="hover:bg-slate-50">
                  <td className="px-6 py-4"><span className="bg-slate-900 text-white text-xs font-black px-2 py-0.5 rounded mr-2">{getHotelCode(seq.hotelId)}</span>{getHotelName(seq.hotelId)}</td>
                  <td className="px-6 py-4 font-mono font-black text-blue-700">{seq.prefix}</td>
                  <td className="px-6 py-4 font-mono">{seq.currentNumber}</td>
                  <td className="px-6 py-4"><span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-mono text-xs">{seq.prefix}-{seq.currentNumber.toString().padStart(8, '0')}</span></td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => { setEditingSequence(seq); setFormData({ hotelId: seq.hotelId, prefix: seq.prefix, currentNumber: seq.currentNumber }); setIsFormOpen(true); }} className="text-blue-500 text-xs font-black hover:underline">Edit</button>
                    <button onClick={() => handleDelete(seq.hotelId)} className="text-rose-500 text-xs font-black hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {sequences.length === 0 && <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400">No invoice sequences configured</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black text-slate-800 mb-6">{editingSequence ? 'Edit Sequence' : 'Add Sequence'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Hotel</label>
                {editingSequence ? (<div className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-bold">{getHotelName(editingSequence.hotelId)}</div>) : (
                  <select required value={formData.hotelId} onChange={e => setFormData({ ...formData, hotelId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 font-bold text-sm">
                    <option value="">-- Select Hotel --</option>
                    {unconfiguredHotels.map(h => (<option key={h.id} value={h.id}>{h.name} ({h.code})</option>))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Prefix (2-3 chars)</label>
                <input required maxLength={3} value={formData.prefix} onChange={e => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })} className="w-full border border-slate-200 rounded-xl p-3 font-mono font-black text-lg uppercase" placeholder="VB" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Starting Number</label>
                <input required type="number" min={1} value={formData.currentNumber} onChange={e => setFormData({ ...formData, currentNumber: parseInt(e.target.value) || 1 })} className="w-full border border-slate-200 rounded-xl p-3 font-mono font-bold" />
              </div>
              {formData.prefix && (<div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><p className="text-xs font-black text-slate-400 uppercase mb-2">Preview</p><p className="font-mono font-black text-xl text-slate-800">{formData.prefix}-{formData.currentNumber.toString().padStart(8, '0')}</p></div>)}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setIsFormOpen(false); setEditingSequence(null); }} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-sm shadow-lg hover:bg-blue-700">{editingSequence ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceSequenceManagement;
