'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface TreatmentItem {
  id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface TreatmentItemsTableProps {
  caseId: string;
  items: TreatmentItem[];
  isOpen: boolean;
  onAddItem: (item: { description: string; quantity: number; unit_cost: number }) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
}

export function TreatmentItemsTable({
  items,
  isOpen,
  onAddItem,
  onDeleteItem,
}: TreatmentItemsTableProps) {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    const cost = parseFloat(unitCost);

    if (!description || isNaN(qty) || qty <= 0 || isNaN(cost) || cost <= 0) {
      alert('Please fill out all fields with valid positive values');
      return;
    }

    setAdding(true);
    try {
      await onAddItem({ description, quantity: qty, unit_cost: cost });
      setDescription('');
      setQuantity('1');
      setUnitCost('');
    } finally {
      setAdding(false);
    }
  };

  const totalBill = items.reduce((acc, curr) => acc + Number(curr.total_cost), 0);

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
            <tr>
              <th className="px-4 py-3">Treatment / Procedure Description</th>
              <th className="px-4 py-3 w-20 text-center">Qty</th>
              <th className="px-4 py-3 w-32 text-right">Unit Price</th>
              <th className="px-4 py-3 w-32 text-right">Total</th>
              {isOpen && <th className="px-4 py-3 w-16 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={isOpen ? 5 : 4} className="px-4 py-6 text-center text-slate-400 text-xs">
                  No treatment or medication items billed yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.description}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    ${Number(item.unit_cost).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    ${Number(item.total_cost).toFixed(2)}
                  </td>
                  {isOpen && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold"
                        title="Delete item"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-sm">
                Case Total Billed Amount:
              </td>
              <td className="px-4 py-3 text-right text-base text-emerald-600">
                ${totalBill.toFixed(2)}
              </td>
              {isOpen && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {isOpen && (
        <form onSubmit={handleAdd} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Procedure / Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Chest X-Ray / Amoxicillin 500mg"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-center"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Cost ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="120.00"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
            />
          </div>
          <Button type="submit" size="sm" loading={adding}>
            + Add Billed Item
          </Button>
        </form>
      )}
    </div>
  );
}
