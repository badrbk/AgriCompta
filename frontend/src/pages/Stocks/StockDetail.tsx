import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { stockService } from '../../services/api';
import { StockItem } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { ArrowLeft, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

const movementSchema = z.object({
  date: z.string().min(1),
  type: z.enum(['IN', 'OUT']),
  source: z.enum(['HARVEST', 'PURCHASE', 'SALE', 'LOSS', 'CONSUMPTION']),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type MovementForm = z.infer<typeof movementSchema>;

const SOURCE_LABELS = { HARVEST: 'Récolte', PURCHASE: 'Achat', SALE: 'Vente', LOSS: 'Perte', CONSUMPTION: 'Consommation' };

export default function StockDetail() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [stock, setStock] = useState<StockItem & { movements?: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], type: 'IN', source: 'PURCHASE' },
  });

  const movType = watch('type');

  const load = async () => {
    if (!id) return;
    stockService.getById(id).then(res => setStock(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const onSubmit = async (data: MovementForm) => {
    await stockService.addMovement(id!, data);
    await load();
    setShowForm(false);
    reset();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>;
  if (!stock) return null;

  return (
    <div>
      <PageHeader
        title={stock.name}
        description={`${formatNumber(stock.currentQuantity, 2)} ${stock.unit} • CUMP : ${formatCurrency(stock.unitValue, currentProject?.currency)}/${stock.unit}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
              <Plus className="h-4 w-4" />Mouvement
            </button>
            <button onClick={() => navigate(`/projects/${projectId}/stocks`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />Retour
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Quantité en stock', value: `${formatNumber(stock.currentQuantity)} ${stock.unit}` },
          { label: 'Valeur unitaire (CUMP)', value: formatCurrency(stock.unitValue, currentProject?.currency) },
          { label: 'Valeur totale', value: formatCurrency(stock.totalValue, currentProject?.currency) },
          { label: 'Seuil alerte', value: stock.minimumThreshold ? `${stock.minimumThreshold} ${stock.unit}` : 'Non défini' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Historique mouvements */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Historique des mouvements</div>
        <div className="divide-y divide-gray-50">
          {!stock.movements || (stock.movements as { id: string; type: string; source: string; quantity: number; unitCost?: number; date: string; notes?: string }[]).length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">Aucun mouvement enregistré</p>
          ) : (
            (stock.movements as { id: string; type: string; source: string; quantity: number; unitCost?: number; date: string; notes?: string }[]).map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {m.type === 'IN'
                    ? <TrendingUp className="h-4 w-4 text-green-600" />
                    : <TrendingDown className="h-4 w-4 text-red-600" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{SOURCE_LABELS[m.source as keyof typeof SOURCE_LABELS]}</p>
                    <p className="text-xs text-gray-500">{formatDate(m.date)}{m.notes && ` • ${m.notes}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${m.type === 'IN' ? 'text-green-700' : 'text-red-600'}`}>
                    {m.type === 'IN' ? '+' : '-'}{formatNumber(m.quantity)} {stock.unit}
                  </p>
                  {m.unitCost && <p className="text-xs text-gray-500">{formatCurrency(m.unitCost, currentProject?.currency)}/{stock.unit}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal mouvement */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Enregistrer un mouvement</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input {...register('date')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select {...register('type')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="IN">Entrée</option><option value="OUT">Sortie</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select {...register('source')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantité ({stock.unit})</label><input {...register('quantity', { valueAsNumber: true })} type="number" step="0.001" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                {movType === 'IN' && (
                  <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Coût unitaire (pour calcul CUMP)</label><input {...register('unitCost', { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                )}
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><input {...register('notes')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="flex gap-3">
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">Enregistrer</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
