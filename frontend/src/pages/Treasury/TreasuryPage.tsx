import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { treasuryService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  Plus, Wallet, Building2, Smartphone, TrendingUp, TrendingDown,
  X, ChevronRight, ArrowDownLeft, ArrowUpRight, Pencil, Trash2, Eye,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface CashFlow {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  amount: number;
  balanceAfter: number;
  transaction?: { type: string; description: string; documentReference?: string } | null;
}

interface CashAccount {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'MOBILE_MONEY';
  balance: number;
  currency: string;
  isActive: boolean;
  flows: CashFlow[];
  _count: { flows: number };
}

// ─── Schemas ─────────────────────────────────────────────────────────────────
const accountSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  type: z.enum(['CASH', 'BANK', 'MOBILE_MONEY']),
  balance: z.coerce.number().min(0).default(0),
  currency: z.string().default('MAD'),
});

const flowSchema = z.object({
  date: z.string().min(1, 'La date est requise'),
  type: z.enum(['IN', 'OUT']),
  amount: z.coerce.number().positive('Le montant doit être positif'),
  description: z.string().min(1, 'La description est requise'),
});

type AccountForm = z.infer<typeof accountSchema>;
type FlowForm = z.infer<typeof flowSchema>;

// ─── Icons par type de compte ────────────────────────────────────────────────
const AccountIcon = ({ type, className }: { type: string; className?: string }) => {
  if (type === 'BANK') return <Building2 className={className} />;
  if (type === 'MOBILE_MONEY') return <Smartphone className={className} />;
  return <Wallet className={className} />;
};

const accountTypeLabel: Record<string, string> = {
  CASH: 'Caisse',
  BANK: 'Banque',
  MOBILE_MONEY: 'Mobile Money',
};

const accountTypeColors: Record<string, string> = {
  CASH: 'bg-amber-50 border-amber-200 text-amber-700',
  BANK: 'bg-blue-50 border-blue-200 text-blue-700',
  MOBILE_MONEY: 'bg-purple-50 border-purple-200 text-purple-700',
};

// ─── Composant principal ─────────────────────────────────────────────────────
export default function TreasuryPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<CashAccount | null>(null);
  const [showFlowModal, setShowFlowModal] = useState(false);

  // Flows du compte sélectionné
  const [flows, setFlows] = useState<CashFlow[]>([]);
  const [flowsTotal, setFlowsTotal] = useState(0);
  const [flowsLoading, setFlowsLoading] = useState(false);
  const [flowsPage, setFlowsPage] = useState(1);
  const [flowsTotalPages, setFlowsTotalPages] = useState(1);

  // Erreurs
  const [accountError, setAccountError] = useState('');
  const [flowError, setFlowError] = useState('');

  // Forms
  const accountForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { type: 'CASH', balance: 0, currency: 'MAD' },
  });

  const flowForm = useForm<FlowForm>({
    resolver: zodResolver(flowSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'IN',
    },
  });

  // ─── Chargement ────────────────────────────────────────────────────────────
  const load = async () => {
    if (!projectId) return;
    try {
      const res = await treasuryService.getAccounts(projectId);
      setAccounts(res.data.accounts);
      setTotalBalance(res.data.totalBalance);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadFlows = async (accountId: string, page = 1) => {
    setFlowsLoading(true);
    try {
      const res = await treasuryService.getFlows(accountId, { page, limit: 20 });
      setFlows(res.data.flows);
      setFlowsTotal(res.data.pagination.total);
      setFlowsTotalPages(res.data.pagination.totalPages);
      setFlowsPage(page);
    } catch {
      // ignore
    } finally {
      setFlowsLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  // ─── Actions comptes ────────────────────────────────────────────────────────
  const openCreateAccount = () => {
    setEditingAccount(null);
    accountForm.reset({ type: 'CASH', balance: 0, currency: 'MAD' });
    setAccountError('');
    setShowAccountModal(true);
  };

  const openEditAccount = (a: CashAccount) => {
    setEditingAccount(a);
    accountForm.reset({ name: a.name, type: a.type, balance: a.balance, currency: a.currency });
    setAccountError('');
    setShowAccountModal(true);
  };

  const onAccountSubmit = async (data: AccountForm) => {
    setAccountError('');
    try {
      if (editingAccount) {
        await treasuryService.updateAccount(editingAccount.id, data);
      } else {
        await treasuryService.createAccount({ ...data, projectId });
      }
      await load();
      setShowAccountModal(false);
      accountForm.reset();
    } catch (err: any) {
      setAccountError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('Désactiver ce compte ? Les mouvements existants seront conservés.')) return;
    try {
      await treasuryService.deleteAccount(id);
      await load();
      if (selectedAccount?.id === id) setSelectedAccount(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  // ─── Actions mouvements ─────────────────────────────────────────────────────
  const openFlowModal = () => {
    flowForm.reset({ date: new Date().toISOString().split('T')[0], type: 'IN' });
    setFlowError('');
    setShowFlowModal(true);
  };

  const onFlowSubmit = async (data: FlowForm) => {
    if (!selectedAccount) return;
    setFlowError('');
    try {
      await treasuryService.addFlow(selectedAccount.id, data);
      await load();
      await loadFlows(selectedAccount.id, 1);
      // Mettre à jour le solde du compte sélectionné dans l'état local
      const updated = await treasuryService.getAccounts(projectId!);
      const refreshed = updated.data.accounts.find((a: CashAccount) => a.id === selectedAccount.id);
      if (refreshed) setSelectedAccount(refreshed);
      setShowFlowModal(false);
    } catch (err: any) {
      setFlowError(err.response?.data?.message || 'Erreur lors de l\'ajout du mouvement');
    }
  };

  const selectAccount = (account: CashAccount) => {
    setSelectedAccount(account);
    loadFlows(account.id, 1);
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Trésorerie"
        description="Gestion des comptes de caisse, banques et mobile money"
        actions={
          <button
            onClick={openCreateAccount}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
          >
            <Plus className="h-4 w-4" /> Ajouter un compte
          </button>
        }
      />

      {/* Solde total */}
      <div className="mb-6 bg-gradient-to-r from-green-700 to-green-600 rounded-xl p-5 text-white shadow">
        <p className="text-green-100 text-sm font-medium">Trésorerie totale</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        <p className="text-green-200 text-xs mt-1">{accounts.length} compte(s) actif(s)</p>
      </div>

      <div className="flex gap-6">
        {/* Liste des comptes */}
        <div className="w-80 flex-shrink-0 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
              <Wallet className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Aucun compte de trésorerie</p>
              <button onClick={openCreateAccount} className="mt-2 text-green-700 text-sm underline">
                Ajouter le premier compte
              </button>
            </div>
          ) : (
            accounts.map(account => (
              <div
                key={account.id}
                onClick={() => selectAccount(account)}
                className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedAccount?.id === account.id
                    ? 'border-green-500 shadow-md'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg border ${accountTypeColors[account.type]}`}>
                      <AccountIcon type={account.type} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{account.name}</p>
                      <p className="text-xs text-gray-400">{accountTypeLabel[account.type]}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); openEditAccount(account); }}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteAccount(account.id); }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-lg font-bold ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    {formatCurrency(account.balance)}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Eye className="h-3 w-3" />
                    {account._count.flows} mvt(s)
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Panneau des mouvements */}
        <div className="flex-1 min-w-0">
          {selectedAccount ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header du panneau */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${accountTypeColors[selectedAccount.type]}`}>
                    <AccountIcon type={selectedAccount.type} className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedAccount.name}</h3>
                    <p className="text-xs text-gray-500">
                      Solde : <span className="font-bold text-gray-800">{formatCurrency(selectedAccount.balance)}</span>
                      {' · '}{flowsTotal} mouvement(s)
                    </p>
                  </div>
                </div>
                <button
                  onClick={openFlowModal}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
                >
                  <Plus className="h-3.5 w-3.5" /> Mouvement
                </button>
              </div>

              {/* Tableau des mouvements */}
              {flowsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-700" />
                </div>
              ) : flows.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">Aucun mouvement enregistré</p>
                  <button onClick={openFlowModal} className="mt-2 text-green-700 text-sm underline">
                    Ajouter le premier mouvement
                  </button>
                </div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-left">
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider text-right">Montant</th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider text-right">Solde après</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {flows.map(flow => (
                        <tr key={flow.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {formatDate(flow.date)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {flow.type === 'IN' ? (
                                <ArrowDownLeft className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-red-500 flex-shrink-0" />
                              )}
                              <span className="text-gray-700 truncate max-w-xs">
                                {flow.transaction?.description || '—'}
                              </span>
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                            flow.type === 'IN' ? 'text-green-700' : 'text-red-600'
                          }`}>
                            {flow.type === 'IN' ? '+' : '-'}{formatCurrency(flow.amount)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                            {formatCurrency(flow.balanceAfter)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {flowsTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-3 border-t border-gray-100">
                      <button
                        disabled={flowsPage <= 1}
                        onClick={() => loadFlows(selectedAccount.id, flowsPage - 1)}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                      >
                        ← Précédent
                      </button>
                      <span className="text-sm text-gray-500">Page {flowsPage} / {flowsTotalPages}</span>
                      <button
                        disabled={flowsPage >= flowsTotalPages}
                        onClick={() => loadFlows(selectedAccount.id, flowsPage + 1)}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                      >
                        Suivant →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              <Wallet className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-sm">Sélectionner un compte pour voir ses mouvements</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal : créer / modifier un compte ─────────────────────────────── */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {editingAccount ? 'Modifier le compte' : 'Nouveau compte de trésorerie'}
              </h3>
              <button onClick={() => setShowAccountModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {accountError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {accountError}
              </div>
            )}

            <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du compte *</label>
                <input
                  {...accountForm.register('name')}
                  placeholder="Ex: Caisse principale, Compte CIH..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                {accountForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-red-600">{accountForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  {...accountForm.register('type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                >
                  <option value="CASH">💵 Caisse (espèces)</option>
                  <option value="BANK">🏦 Compte bancaire</option>
                  <option value="MOBILE_MONEY">📱 Mobile Money</option>
                </select>
              </div>

              {!editingAccount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solde initial (MAD)</label>
                  <input
                    {...accountForm.register('balance')}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={accountForm.formState.isSubmitting}
                  className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
                >
                  {accountForm.formState.isSubmitting
                    ? 'Enregistrement...'
                    : editingAccount ? 'Modifier' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal : ajouter un mouvement ────────────────────────────────────── */}
      {showFlowModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Nouveau mouvement — {selectedAccount.name}
              </h3>
              <button onClick={() => setShowFlowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {flowError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {flowError}
              </div>
            )}

            <form onSubmit={flowForm.handleSubmit(onFlowSubmit)} className="space-y-4">
              {/* Type IN/OUT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de mouvement *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['IN', 'OUT'] as const).map(t => (
                    <label
                      key={t}
                      className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        flowForm.watch('type') === t
                          ? t === 'IN'
                            ? 'border-green-500 bg-green-50'
                            : 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={t}
                        {...flowForm.register('type')}
                        className="sr-only"
                      />
                      {t === 'IN' ? (
                        <><TrendingUp className="h-4 w-4 text-green-600" /><span className="text-sm font-medium text-green-700">Entrée</span></>
                      ) : (
                        <><TrendingDown className="h-4 w-4 text-red-500" /><span className="text-sm font-medium text-red-600">Sortie</span></>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (MAD) *</label>
                <input
                  {...flowForm.register('amount')}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                {flowForm.formState.errors.amount && (
                  <p className="mt-1 text-xs text-red-600">{flowForm.formState.errors.amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  {...flowForm.register('date')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  {...flowForm.register('description')}
                  placeholder="Ex: Achat carburant, Vente récolte..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                {flowForm.formState.errors.description && (
                  <p className="mt-1 text-xs text-red-600">{flowForm.formState.errors.description.message}</p>
                )}
              </div>

              {/* Solde prévu */}
              {flowForm.watch('amount') > 0 && (
                <div className={`p-3 rounded-lg text-sm ${
                  flowForm.watch('type') === 'IN' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  Solde après : <span className="font-bold">
                    {formatCurrency(
                      flowForm.watch('type') === 'IN'
                        ? selectedAccount.balance + (flowForm.watch('amount') || 0)
                        : selectedAccount.balance - (flowForm.watch('amount') || 0)
                    )}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={flowForm.formState.isSubmitting}
                  className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
                >
                  {flowForm.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFlowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
