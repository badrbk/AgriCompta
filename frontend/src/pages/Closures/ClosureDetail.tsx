import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { closureService } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeft, CheckCircle, DollarSign, AlertTriangle, Edit2 } from 'lucide-react';

interface DistributionEdit {
  associateId: string;
  distributionMethod: 'CASH' | 'REINVEST' | 'MIXED';
  cashAmount: number;
  reinvestAmount: number;
  paymentDate: string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  REINVEST: 'Réinvestissement',
  MIXED: 'Mixte',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
};

export default function ClosureDetail() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [closure, setClosure] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [editDist, setEditDist] = useState<DistributionEdit[]>([]);
  const [showDistForm, setShowDistForm] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const res = await closureService.getById(id);
      setClosure(res.data);
      // Initialize distribution form
      if (res.data.distributions?.length > 0) {
        setEditDist(res.data.distributions.map((d: any) => ({
          associateId: d.associateId,
          distributionMethod: d.distributionMethod,
          cashAmount: d.cashAmount || d.profitShare,
          reinvestAmount: d.reinvestAmount || 0,
          paymentDate: d.paymentDate ? d.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0],
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const canValidate = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  const handleValidate = async () => {
    if (!id || !window.confirm('Valider cette clôture ? Cette action calculera les parts de chaque associé et ne pourra pas être annulée.')) return;
    setValidating(true);
    try {
      await closureService.validate(id);
      await load();
    } finally {
      setValidating(false);
    }
  };

  const handleDistribute = async () => {
    if (!id) return;
    setDistributing(true);
    try {
      await closureService.distribute(id, editDist);
      await load();
      setShowDistForm(false);
    } finally {
      setDistributing(false);
    }
  };

  const updateDistMethod = (assocId: string, method: 'CASH' | 'REINVEST' | 'MIXED', profitShare: number) => {
    setEditDist(prev => prev.map(d => d.associateId === assocId
      ? {
          ...d,
          distributionMethod: method,
          cashAmount: method === 'REINVEST' ? 0 : method === 'CASH' ? profitShare : d.cashAmount,
          reinvestAmount: method === 'CASH' ? 0 : method === 'REINVEST' ? profitShare : d.reinvestAmount,
        }
      : d
    ));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>;
  if (!closure) return <div className="text-center py-16 text-gray-500">Clôture introuvable</div>;

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    VALIDATED: 'bg-blue-100 text-blue-800',
    DISTRIBUTED: 'bg-green-100 text-green-800',
  };
  const statusLabels: Record<string, string> = {
    DRAFT: 'Brouillon',
    VALIDATED: 'Validée',
    DISTRIBUTED: 'Distribuée',
  };

  return (
    <div>
      <PageHeader
        title={closure.seasonName}
        description={`Clôturée le ${formatDate(closure.closureDate)}`}
        actions={
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[closure.status]}`}>
              {statusLabels[closure.status]}
            </span>
            {closure.status === 'DRAFT' && canValidate && (
              <button
                onClick={handleValidate}
                disabled={validating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />{validating ? 'Validation...' : 'Valider'}
              </button>
            )}
            {closure.status === 'VALIDATED' && (
              <button
                onClick={() => setShowDistForm(!showDistForm)}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
              >
                <DollarSign className="h-4 w-4" />Distribuer
              </button>
            )}
          </div>
        }
      />

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" />Retour aux clôtures
      </button>

      <div className="space-y-6">
        {/* Status workflow */}
        {closure.status === 'DRAFT' && !canValidate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">Cette clôture est en brouillon. Un administrateur ou comptable doit la valider.</p>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total Produits</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(closure.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total Charges</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(closure.totalExpenses)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">Amortissements</p>
            <p className="text-xl font-bold text-orange-700">{formatCurrency(closure.depreciation)}</p>
          </div>
          <div className={`rounded-xl border p-4 shadow-sm ${closure.netProfit >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <p className="text-xs text-gray-500">Résultat Net</p>
            <p className={`text-xl font-bold ${closure.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(closure.netProfit)}</p>
          </div>
        </div>

        {/* Calculation breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Calcul du Résultat</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Produits (Classe 7)</span>
              <span className="font-medium text-blue-700">+ {formatCurrency(closure.totalRevenue)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Charges (Classe 6)</span>
              <span className="font-medium text-red-700">- {formatCurrency(closure.totalExpenses)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Dotations aux amortissements</span>
              <span className="font-medium text-orange-700">- {formatCurrency(closure.depreciation)}</span>
            </div>
            <div className={`flex justify-between py-3 rounded-lg px-3 font-bold text-base ${closure.netProfit >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <span>{closure.netProfit >= 0 ? 'Bénéfice Net' : 'Déficit Net'}</span>
              <span>= {formatCurrency(closure.netProfit)}</span>
            </div>
          </div>
          {closure.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 italic">{closure.notes}</p>
            </div>
          )}
        </div>

        {/* Distributions */}
        {closure.distributions?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Répartition par Associé</h3>
              {closure.status === 'VALIDATED' && (
                <button
                  onClick={() => setShowDistForm(!showDistForm)}
                  className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800"
                >
                  <Edit2 className="h-3.5 w-3.5" />Modifier distribution
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Associé</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Part (%)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Montant</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Méthode</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">En espèces</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Réinvesti</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {closure.distributions.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {d.associate?.user ? `${d.associate.user.firstName} ${d.associate.user.lastName}` : d.associateId}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{d.sharePercentage.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(d.profitShare)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{METHOD_LABELS[d.distributionMethod]}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{d.cashAmount ? formatCurrency(d.cashAmount) : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{d.reinvestAmount ? formatCurrency(d.reinvestAmount) : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[d.paymentStatus]}`}>
                        {d.paymentStatus === 'PAID' ? 'Payé' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Distribution Form */}
        {showDistForm && closure.status === 'VALIDATED' && closure.distributions?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Configurer la Distribution</h3>
            <div className="space-y-4">
              {closure.distributions.map((d: any, i: number) => {
                const edit = editDist.find(e => e.associateId === d.associateId);
                if (!edit) return null;
                return (
                  <div key={d.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {d.associate?.user ? `${d.associate.user.firstName} ${d.associate.user.lastName}` : d.associateId}
                        </p>
                        <p className="text-sm text-gray-500">Part: {formatCurrency(d.profitShare)} ({d.sharePercentage.toFixed(1)}%)</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Méthode</label>
                        <select
                          value={edit.distributionMethod}
                          onChange={e => updateDistMethod(d.associateId, e.target.value as any, d.profitShare)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="CASH">Espèces</option>
                          <option value="REINVEST">Réinvestissement</option>
                          <option value="MIXED">Mixte</option>
                        </select>
                      </div>
                      {(edit.distributionMethod === 'CASH' || edit.distributionMethod === 'MIXED') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Montant espèces</label>
                          <input
                            type="number"
                            value={edit.cashAmount}
                            onChange={e => setEditDist(prev => prev.map(p => p.associateId === d.associateId ? { ...p, cashAmount: +e.target.value } : p))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      )}
                      {(edit.distributionMethod === 'REINVEST' || edit.distributionMethod === 'MIXED') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Montant réinvesti</label>
                          <input
                            type="number"
                            value={edit.reinvestAmount}
                            onChange={e => setEditDist(prev => prev.map(p => p.associateId === d.associateId ? { ...p, reinvestAmount: +e.target.value } : p))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date de paiement</label>
                        <input
                          type="date"
                          value={edit.paymentDate}
                          onChange={e => setEditDist(prev => prev.map(p => p.associateId === d.associateId ? { ...p, paymentDate: e.target.value } : p))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDistribute}
                  disabled={distributing}
                  className="px-6 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
                >
                  {distributing ? 'Enregistrement...' : 'Enregistrer la distribution'}
                </button>
                <button
                  onClick={() => setShowDistForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
