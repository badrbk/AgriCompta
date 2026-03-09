import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionService } from '../../services/api';
import { Transaction, PaginatedResponse } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import ConfirmDialog from '../../components/Modals/ConfirmDialog';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';
import { Plus, Trash2, Edit, Paperclip, Filter, Search } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { TRANSACTION_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '../../types';

const TYPE_COLORS: Record<string, string> = {
  EXPENSE: 'bg-red-100 text-red-700',
  SALE: 'bg-green-100 text-green-700',
  CAPITAL_ACQUISITION: 'bg-blue-100 text-blue-700',
  STOCK_IN: 'bg-cyan-100 text-cyan-700',
  STOCK_OUT: 'bg-orange-100 text-orange-700',
  CAPITAL_CONTRIBUTION: 'bg-purple-100 text-purple-700',
  DISTRIBUTION: 'bg-amber-100 text-amber-700',
};

export default function TransactionsList() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [response, setResponse] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await transactionService.getByProject(projectId, {
        page, limit: 20, type: typeFilter || undefined,
      });
      setResponse(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [projectId, page, typeFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await transactionService.delete(deleteId);
      await loadData();
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const transactions = response?.data || [];
  const filtered = search
    ? transactions.filter(t => t.description.toLowerCase().includes(search.toLowerCase()))
    : transactions;

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Toutes les opérations comptables du projet"
        actions={
          <button
            onClick={() => navigate(`/projects/${projectId}/transactions/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
          >
            <Plus className="h-4 w-4" />
            Nouvelle transaction
          </button>
        }
      />

      {/* Filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            <option value="">Tous les types</option>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Compte</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Paiement</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Montant</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-medium">{tx.description}</span>
                        {tx.attachmentUrl && <Paperclip className="h-3 w-3 text-gray-400" />}
                      </div>
                      {tx.documentReference && (
                        <p className="text-xs text-gray-400">Réf: {tx.documentReference}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[tx.type] || 'bg-gray-100 text-gray-700'}`}>
                        {TRANSACTION_TYPE_LABELS[tx.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {tx.account && <span>{tx.account.code} - {tx.account.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {PAYMENT_METHOD_LABELS[tx.paymentMethod]}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      ['SALE', 'CAPITAL_CONTRIBUTION'].includes(tx.type) ? 'text-green-700' : 'text-red-600'
                    }`}>
                      {['SALE', 'CAPITAL_CONTRIBUTION'].includes(tx.type) ? '+' : '-'}
                      {formatCurrency(tx.amount, currentProject?.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/projects/${projectId}/transactions/${tx.id}/edit`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(tx.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {response && response.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {response.pagination.total} transaction(s)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Précédent
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-700">
                {page} / {response.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === response.pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Supprimer la transaction"
        message="Cette action est irréversible. La transaction sera définitivement supprimée."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={deleting}
      />
    </div>
  );
}
