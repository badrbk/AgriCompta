import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saleService } from '../../services/api';
import { Sale } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import ConfirmDialog from '../../components/Modals/ConfirmDialog';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../utils/formatters';
import { Plus, Eye, Trash2, ShoppingCart } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

export default function SalesList() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [data, setData] = useState<{ data: Sale[]; summary: { totalRevenue: number; totalPaid: number; totalUnpaid: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!projectId) return;
    try {
      const res = await saleService.getByProject(projectId);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  return (
    <div>
      <PageHeader
        title="Ventes"
        description={data ? `CA Total : ${formatCurrency(data.summary.totalRevenue, currentProject?.currency)} • Impayé : ${formatCurrency(data.summary.totalUnpaid, currentProject?.currency)}` : ''}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate(`/projects/${projectId}/customers`)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Clients
            </button>
            <button onClick={() => navigate(`/projects/${projectId}/sales/new`)} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
              <Plus className="h-4 w-4" />Nouvelle vente
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucune vente enregistrée</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Montant total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Payé</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut paiement</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(sale.saleDate)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{sale.customer?.name || 'Client comptant'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(sale.totalAmount, currentProject?.currency)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{formatCurrency(sale.paidAmount, currentProject?.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(sale.paymentStatus)}`}>
                      {getStatusLabel(sale.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => navigate(`/projects/${projectId}/sales/${sale.id}/edit`)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(sale.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
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

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Supprimer la vente"
        message="Cette vente sera définitivement supprimée."
        confirmLabel="Supprimer"
        onConfirm={async () => { await saleService.delete(deleteId!); setDeleteId(null); load(); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
