import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { accountService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { Plus, ChevronRight, ChevronDown, BookOpen } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  classCode: string;
  type: 'ASSET' | 'STOCK' | 'EXPENSE' | 'REVENUE';
  isActive: boolean;
  children?: Account[];
}

const schema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  name: z.string().min(1, 'Le nom est requis'),
  classCode: z.string().min(1, 'La classe est requise'),
  type: z.enum(['ASSET', 'STOCK', 'EXPENSE', 'REVENUE']),
  parentAccountId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TYPE_LABELS: Record<string, string> = {
  ASSET: 'Immobilisation',
  STOCK: 'Stock',
  EXPENSE: 'Charge',
  REVENUE: 'Produit',
};

const TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-purple-100 text-purple-800',
  STOCK: 'bg-blue-100 text-blue-800',
  EXPENSE: 'bg-red-100 text-red-800',
  REVENUE: 'bg-green-100 text-green-800',
};

const CLASS_DESCRIPTIONS: Record<string, string> = {
  '1': 'Classe 1 - Comptes de financement permanent',
  '2': 'Classe 2 - Comptes d\'immobilisations',
  '3': 'Classe 3 - Comptes de stocks',
  '4': 'Classe 4 - Comptes de tiers',
  '5': 'Classe 5 - Comptes de trésorerie',
  '6': 'Classe 6 - Comptes de charges',
  '7': 'Classe 7 - Comptes de produits',
};

function AccountNode({ account, level = 0 }: { account: Account; level?: number }) {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = account.children && account.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-default ${!account.isActive ? 'opacity-50' : ''}`}
        style={{ paddingLeft: `${(level * 20) + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        <span className="font-mono text-xs text-gray-400 w-12 flex-shrink-0">{account.code}</span>
        <span className={`text-sm flex-1 ${level === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{account.name}</span>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[account.type]}`}>
          {TYPE_LABELS[account.type]}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {account.children!.map(child => (
            <AccountNode key={child.id} account={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'EXPENSE', classCode: '6' },
  });

  const watchType = watch('type');

  const load = async () => {
    accountService.getTree().then(res => setAccounts(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Set class code based on type
  useEffect(() => {
    const typeToClass: Record<string, string> = { ASSET: '2', STOCK: '3', EXPENSE: '6', REVENUE: '7' };
  }, [watchType]);

  const onSubmit = async (data: FormData) => {
    await accountService.create(data);
    await load();
    setShowForm(false);
    reset();
  };

  const flatAccounts = (accs: Account[]): Account[] => {
    return accs.reduce<Account[]>((all, a) => [...all, a, ...flatAccounts(a.children || [])], []);
  };

  const allFlat = flatAccounts(accounts);
  const filteredFlat = filter
    ? allFlat.filter(a => a.code.includes(filter) || a.name.toLowerCase().includes(filter.toLowerCase()))
    : [];

  // Group root accounts by class
  const grouped = accounts.reduce<Record<string, Account[]>>((g, a) => {
    const cls = a.classCode || a.code[0] || 'X';
    if (!g[cls]) g[cls] = [];
    g[cls].push(a);
    return g;
  }, {});

  return (
    <div>
      <PageHeader
        title="Plan Comptable"
        description="Gestion des comptes du plan comptable marocain agricole"
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
            <Plus className="h-4 w-4" />Nouveau compte
          </button>
        }
      />

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Rechercher par code ou libellé..."
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">Nouveau compte</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                {...register('code')}
                placeholder="Ex: 6112"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classe comptable *</label>
              <select
                {...register('classCode')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {Object.entries(CLASS_DESCRIPTIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Libellé *</label>
              <input
                {...register('name')}
                placeholder="Ex: Achat de semences"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="ASSET">Immobilisation</option>
                <option value="STOCK">Stock</option>
                <option value="EXPENSE">Charge</option>
                <option value="REVENUE">Produit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compte parent (optionnel)</label>
              <select
                {...register('parentAccountId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Aucun (compte racine)</option>
                {allFlat.map(a => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
                {isSubmitting ? 'Création...' : 'Créer'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : filter ? (
        /* Search results */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">{filteredFlat.length} résultat(s) pour "{filter}"</p>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredFlat.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <span className="font-mono text-xs text-gray-400 w-14">{a.code}</span>
                <span className="text-sm text-gray-800 flex-1">{a.name}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[a.type]}`}>
                  {TYPE_LABELS[a.type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Plan comptable vide</p>
          <p className="text-gray-400 text-sm mt-1">Initialisez le plan comptable avec les données de démonstration</p>
        </div>
      ) : (
        /* Tree view grouped by class */
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cls, accs]) => (
            <div key={cls} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-800 text-sm">{CLASS_DESCRIPTIONS[cls] || `Classe ${cls}`}</h3>
              </div>
              <div className="p-2">
                {accs.map(a => <AccountNode key={a.id} account={a} />)}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 text-center">{allFlat.length} compte(s) au total</p>
        </div>
      )}
    </div>
  );
}
