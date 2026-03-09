import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';

interface ProfitLossData {
  period: { start: string; end: string };
  revenues: { accountCode: string; accountName: string; amount: number }[];
  expenses: { accountCode: string; accountName: string; amount: number }[];
  depreciation: number;
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
}

export default function ProfitLoss() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(0, 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getProfitLoss(projectId, dateFrom, dateTo);
      const d = res.data;
      setData({
        period: d.period || { start: null, end: null },
        revenues: Array.isArray(d.revenues) ? d.revenues : [],
        expenses: Array.isArray(d.expenses) ? d.expenses : [],
        depreciation: d.depreciation ?? 0,
        totalRevenue: d.totalRevenue ?? 0,
        totalExpenses: d.totalExpenses ?? 0,
        grossProfit: d.grossProfit ?? 0,
        netProfit: d.netProfit ?? 0,
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erreur lors du chargement des données');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ['COMPTE DE RÉSULTAT'],
      [`Période du ${formatDate(dateFrom)} au ${formatDate(dateTo)}`],
      [],
      ['PRODUITS', '', ''],
      ...data.revenues.map(r => [r.accountCode, r.accountName, r.amount]),
      ['', 'Total Produits', data.totalRevenue],
      [],
      ['CHARGES', '', ''],
      ...data.expenses.map(e => [e.accountCode, e.accountName, e.amount]),
      ['', 'Amortissements', data.depreciation],
      ['', 'Total Charges', data.totalExpenses + data.depreciation],
      [],
      ['', 'RÉSULTAT NET', data.netProfit],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compte-resultat-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Compte de Résultat"
        description="Analyse des produits et charges sur une période"
        actions={
          <button onClick={handleExport} disabled={!data} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
            <Download className="h-4 w-4" />Exporter CSV
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date de début</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <button onClick={load} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error}</div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total Produits</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="h-5 w-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total Charges</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(data.totalExpenses + data.depreciation)}</p>
                </div>
              </div>
            </div>
            <div className={`rounded-xl border p-5 shadow-sm ${data.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${data.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Minus className={`h-5 w-5 ${data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Résultat Net</p>
                  <p className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(data.netProfit)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenues */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-blue-50">
                <h3 className="font-semibold text-blue-900">Produits (Classe 7)</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Code</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Compte</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.revenues.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs">{r.accountCode}</td>
                      <td className="px-4 py-2 text-gray-700">{r.accountName}</td>
                      <td className="px-4 py-2 text-right font-medium text-blue-700">{formatCurrency(r.amount)}</td>
                    </tr>
                  ))}
                  {data.revenues.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Aucun produit</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 border-t border-blue-200">
                    <td colSpan={2} className="px-4 py-3 font-semibold text-blue-900">Total Produits</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-900">{formatCurrency(data.totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-red-50">
                <h3 className="font-semibold text-red-900">Charges (Classe 6)</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Code</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Compte</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.expenses.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs">{e.accountCode}</td>
                      <td className="px-4 py-2 text-gray-700">{e.accountName}</td>
                      <td className="px-4 py-2 text-right font-medium text-red-700">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                  {data.expenses.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Aucune charge</td></tr>
                  )}
                  {data.depreciation > 0 && (
                    <tr className="hover:bg-gray-50 bg-orange-50">
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs">28xx</td>
                      <td className="px-4 py-2 text-gray-700 italic">Dotations aux amortissements</td>
                      <td className="px-4 py-2 text-right font-medium text-orange-700">{formatCurrency(data.depreciation)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-red-50 border-t border-red-200">
                    <td colSpan={2} className="px-4 py-3 font-semibold text-red-900">Total Charges</td>
                    <td className="px-4 py-3 text-right font-bold text-red-900">{formatCurrency(data.totalExpenses + data.depreciation)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Result */}
          <div className={`rounded-xl border p-6 shadow-sm ${data.netProfit >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Résultat Brut: {formatCurrency(data.grossProfit)}</p>
                <p className="text-sm text-gray-600">Amortissements: - {formatCurrency(data.depreciation)}</p>
                <p className={`text-2xl font-bold mt-2 ${data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Résultat Net: {formatCurrency(data.netProfit)}
                </p>
              </div>
              <div className={`text-6xl font-light ${data.netProfit >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {data.netProfit >= 0 ? '+' : '-'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">Aucune donnée disponible</div>
      )}
    </div>
  );
}
