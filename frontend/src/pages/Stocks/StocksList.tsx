import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { stockService, accountService } from '../../services/api';
import { StockItem, Account } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Plus, Eye, AlertTriangle, Package } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  accountId: z.string().min(1),
  category: z.enum(['HARVEST', 'LIVESTOCK', 'CONSUMABLE']),
  currentQuantity: z.number().min(0).default(0),
  unit: z.string().min(1, 'L\'unité est requise'),
  unitValue: z.number().min(0).default(0),
  minimumThreshold: z.number().min(0).optional(),
  location: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORY_LABELS = { HARVEST: 'Récolte', LIVESTOCK: 'Cheptel', CONSUMABLE: 'Consommable' };

export default function StocksList() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [data, setData] = useState<{ stocks: StockItem[]; totalValue: number; lowStock: number } | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'CONSUMABLE', currentQuantity: 0, unitValue: 0 },
  });

  const load = async () => {
    if (!projectId) return;
    try {
      const [stocksRes, accountsRes] = await Promise.all([
        stockService.getByProject(projectId),
        accountService.getAll(),
      ]);
      setData(stocksRes.data);
      setAccounts(accountsRes.data.filter((a: Account) => a.type === 'STOCK'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const onSubmit = async (formData: FormData) => {
    await stockService.create({ ...formData, projectId });
    await load();
    setShowForm(false);
    reset();
  };

  return (
    <div>
      <PageHeader
        title="Stocks"
        description={data ? `Valeur totale : ${formatCurrency(data.totalValue, currentProject?.currency)} • ${data.lowStock} article(s) en alerte` : ''}
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
            <Plus className="h-4 w-4" />Nouvel article
          </button>
        }
      />

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">Nouvel article en stock</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input {...register('name')} placeholder="Ex: Blé dur saison 2024" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select {...register('category')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compte comptable</label>
              <select {...register('accountId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Sélectionner...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité initiale</label>
              <input {...register('currentQuantity', { valueAsNumber: true })} type="number" step="0.001" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unité *</label>
              <input {...register('unit')} placeholder="kg, L, sac..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur unitaire</label>
              <input {...register('unitValue', { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seuil d'alerte</label>
              <input {...register('minimumThreshold', { valueAsNumber: true })} type="number" step="0.001" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
                {isSubmitting ? 'Enregistrement...' : 'Créer'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : !data || data.stocks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucun article en stock</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Article</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Catégorie</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Quantité</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valeur unit.</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valeur totale</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Alerte</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.stocks.map(stock => {
                const isLow = stock.minimumThreshold && stock.currentQuantity <= stock.minimumThreshold;
                return (
                  <tr key={stock.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{stock.name}</p>
                      {stock.location && <p className="text-xs text-gray-500">{stock.location}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{CATEGORY_LABELS[stock.category]}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={isLow ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                        {formatNumber(stock.currentQuantity, 2)} {stock.unit}
                      </span>
                      {stock.minimumThreshold && (
                        <p className="text-xs text-gray-500">min: {stock.minimumThreshold}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(stock.unitValue, currentProject?.currency)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700">{formatCurrency(stock.totalValue, currentProject?.currency)}</td>
                    <td className="px-4 py-3 text-center">
                      {isLow && <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => navigate(`/projects/${projectId}/stocks/${stock.id}`)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
