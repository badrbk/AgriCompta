import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { livestockService } from '../../services/api';
import { LivestockGroup } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate, getStatusLabel } from '../../utils/formatters';
import { ArrowLeft, Plus } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

const movementSchema = z.object({
  date: z.string().min(1),
  type: z.enum(['BIRTH', 'PURCHASE', 'SALE', 'DEATH', 'TRANSFER']),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0).optional(),
  weight: z.number().positive().optional(),
  notes: z.string().optional(),
});

const expenseSchema = z.object({
  date: z.string().min(1),
  type: z.enum(['FEED', 'VETERINARY', 'LABOR', 'OTHER']),
  amount: z.number().positive(),
  description: z.string().min(1),
});

type MovementForm = z.infer<typeof movementSchema>;
type ExpenseForm = z.infer<typeof expenseSchema>;

const MOVEMENT_LABELS = { BIRTH: 'Naissance', PURCHASE: 'Achat', SALE: 'Vente', DEATH: 'Mort', TRANSFER: 'Transfert' };
const EXPENSE_LABELS = { FEED: 'Alimentation', VETERINARY: 'Vétérinaire', LABOR: 'Main d\'œuvre', OTHER: 'Autre' };

export default function LivestockDetail() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [group, setGroup] = useState<LivestockGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMovement, setShowMovement] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  const movForm = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], type: 'BIRTH' },
  });

  const expForm = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], type: 'FEED' },
  });

  const load = async () => {
    if (!id) return;
    try {
      const res = await livestockService.getById(id);
      setGroup(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const onMovement = async (data: MovementForm) => {
    await livestockService.addMovement(id!, data);
    await load();
    setShowMovement(false);
    movForm.reset();
  };

  const onExpense = async (data: ExpenseForm) => {
    await livestockService.addExpense(id!, data);
    await load();
    setShowExpense(false);
    expForm.reset();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>;
  if (!group) return null;

  const totalExpenses = group.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

  return (
    <div>
      <PageHeader
        title={`${group.species} ${group.breed ? `(${group.breed})` : ''}`}
        description={`${group.currentCount} têtes • ${getStatusLabel(group.status)}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowMovement(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="h-4 w-4" />Mouvement
            </button>
            <button onClick={() => setShowExpense(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
              <Plus className="h-4 w-4" />Charge
            </button>
            <button onClick={() => navigate(`/projects/${projectId}/livestock`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />Retour
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Effectif initial', value: group.initialCount.toString() },
          { label: 'Effectif actuel', value: group.currentCount.toString() },
          { label: 'Valeur totale', value: formatCurrency(group.currentCount * group.unitValue, currentProject?.currency) },
          { label: 'Total charges', value: formatCurrency(totalExpenses, currentProject?.currency) },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mouvements */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Mouvements</div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {(!group.movements || group.movements.length === 0) ? (
              <p className="text-center py-6 text-gray-500 text-sm">Aucun mouvement</p>
            ) : (
              group.movements.map(m => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{MOVEMENT_LABELS[m.type]}</p>
                    <p className="text-xs text-gray-500">{formatDate(m.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${['BIRTH', 'PURCHASE'].includes(m.type) ? 'text-green-700' : 'text-red-600'}`}>
                      {['BIRTH', 'PURCHASE'].includes(m.type) ? '+' : '-'}{m.quantity}
                    </p>
                    {m.totalValue && <p className="text-xs text-gray-500">{formatCurrency(m.totalValue, currentProject?.currency)}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Charges */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Charges</div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {(!group.expenses || group.expenses.length === 0) ? (
              <p className="text-center py-6 text-gray-500 text-sm">Aucune charge</p>
            ) : (
              group.expenses.map(e => (
                <div key={e.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{e.description}</p>
                    <p className="text-xs text-gray-500">{EXPENSE_LABELS[e.type]} • {formatDate(e.date)}</p>
                  </div>
                  <p className="text-sm font-semibold text-red-600">{formatCurrency(e.amount, currentProject?.currency)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Mouvement */}
      {showMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMovement(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Enregistrer un mouvement</h3>
            <form onSubmit={movForm.handleSubmit(onMovement)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input {...movForm.register('date')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select {...movForm.register('type')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {Object.entries(MOVEMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                  <input {...movForm.register('quantity', { valueAsNumber: true })} type="number" min="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire</label>
                  <input {...movForm.register('unitPrice', { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input {...movForm.register('notes')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Enregistrer</button>
                <button type="button" onClick={() => setShowMovement(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
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
            <form onSubmit={expForm.handleSubmit(onExpense)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input {...expForm.register('date')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select {...expForm.register('type')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {Object.entries(EXPENSE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input {...expForm.register('description')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant *</label>
                <input {...expForm.register('amount', { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
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
