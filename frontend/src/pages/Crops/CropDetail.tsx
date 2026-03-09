import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cropService } from '../../services/api';
import { Crop } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Plus } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

const harvestSchema = z.object({
  date: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(['KG', 'TON', 'QUINTAL']).default('KG'),
  qualityGrade: z.enum(['A', 'B', 'C']).default('A'),
  destination: z.enum(['STOCK', 'DIRECT_SALE', 'LOSS']).default('STOCK'),
  notes: z.string().optional(),
});

const expenseSchema = z.object({
  expenseType: z.enum(['SEED', 'FERTILIZER', 'PESTICIDE', 'IRRIGATION', 'LABOR', 'OTHER']),
  amount: z.number().positive(),
  date: z.string().min(1),
});

type HarvestForm = z.infer<typeof harvestSchema>;
type ExpenseForm = z.infer<typeof expenseSchema>;

const EXPENSE_LABELS = { SEED: 'Semences', FERTILIZER: 'Engrais', PESTICIDE: 'Pesticides', IRRIGATION: 'Irrigation', LABOR: 'Main d\'œuvre', OTHER: 'Autre' };
const DESTINATION_LABELS = { STOCK: 'Stockage', DIRECT_SALE: 'Vente directe', LOSS: 'Perte' };

export default function CropDetail() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [crop, setCrop] = useState<Crop | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHarvest, setShowHarvest] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  const hForm = useForm<HarvestForm>({ resolver: zodResolver(harvestSchema), defaultValues: { date: new Date().toISOString().split('T')[0], unit: 'KG', qualityGrade: 'A', destination: 'STOCK' } });
  const eForm = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema), defaultValues: { date: new Date().toISOString().split('T')[0], expenseType: 'SEED' } });

  const load = async () => {
    if (!id) return;
    cropService.getById(id).then(res => setCrop(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const onHarvest = async (data: HarvestForm) => {
    await cropService.addHarvest(id!, data);
    await load();
    setShowHarvest(false);
    hForm.reset();
  };

  const onExpense = async (data: ExpenseForm) => {
    await cropService.addExpense(id!, data);
    await load();
    setShowExpense(false);
    eForm.reset();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>;
  if (!crop) return null;

  return (
    <div>
      <PageHeader
        title={`${crop.cropType} ${crop.variety ? `(${crop.variety})` : ''}`}
        description={`Parcelle : ${crop.plot?.name} • ${crop.areaPlanted} ha`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowHarvest(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"><Plus className="h-4 w-4" />Récolte</button>
            <button onClick={() => setShowExpense(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"><Plus className="h-4 w-4" />Charge</button>
            <button onClick={() => navigate(`/projects/${projectId}/crops`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"><ArrowLeft className="h-4 w-4" />Retour</button>
          </div>
        }
      />

      {/* Analytics */}
      {crop.analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total charges', value: formatCurrency(crop.analytics.totalExpenses, currentProject?.currency) },
            { label: 'Récolte totale', value: `${crop.analytics.totalHarvestKg.toFixed(0)} kg` },
            { label: 'Coût / kg', value: crop.analytics.costPerKg ? formatCurrency(crop.analytics.costPerKg, currentProject?.currency) : '-' },
            { label: 'Rendement (kg/ha)', value: crop.analytics.yieldPerHa ? `${crop.analytics.yieldPerHa.toFixed(0)} kg/ha` : '-' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Récoltes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Récoltes</div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {(!crop.harvests || crop.harvests.length === 0) ? (
              <p className="text-center py-6 text-gray-500 text-sm">Aucune récolte enregistrée</p>
            ) : crop.harvests.map(h => (
              <div key={h.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{h.quantity} {h.unit}</p>
                  <p className="text-xs text-gray-500">{formatDate(h.date)} • Grade {h.qualityGrade} • {DESTINATION_LABELS[h.destination]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charges */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Charges</div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {(!crop.expenses || crop.expenses.length === 0) ? (
              <p className="text-center py-6 text-gray-500 text-sm">Aucune charge enregistrée</p>
            ) : crop.expenses.map(e => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{EXPENSE_LABELS[e.expenseType]}</p>
                  <p className="text-xs text-gray-500">{formatDate(e.date)}</p>
                </div>
                <p className="text-sm font-semibold text-red-600">{formatCurrency(e.amount, currentProject?.currency)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Récolte */}
      {showHarvest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowHarvest(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Enregistrer une récolte</h3>
            <form onSubmit={hForm.handleSubmit(onHarvest)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input {...hForm.register('date')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                  <div className="flex gap-2">
                    <input {...hForm.register('quantity', { valueAsNumber: true })} type="number" step="0.1" min="0" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <select {...hForm.register('unit')} className="px-2 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="KG">kg</option>
                      <option value="TON">T</option>
                      <option value="QUINTAL">Q</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <select {...hForm.register('qualityGrade')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="A">A - Premium</option><option value="B">B - Standard</option><option value="C">C - Bas grade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <select {...hForm.register('destination')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {Object.entries(DESTINATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Enregistrer</button>
                <button type="button" onClick={() => setShowHarvest(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Charge */}
      {showExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowExpense(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Enregistrer une charge</h3>
            <form onSubmit={eForm.handleSubmit(onExpense)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input {...eForm.register('date')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select {...eForm.register('expenseType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {Object.entries(EXPENSE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Montant *</label><input {...eForm.register('amount', { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">Enregistrer</button>
                <button type="button" onClick={() => setShowExpense(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
