import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Download, Scale } from 'lucide-react';

interface BalanceSheetData {
  date: string;
  assets: {
    fixedAssets: { name: string; acquisitionValue: number; accumulated: number; bookValue: number }[];
    stocks: { name: string; quantity: number; unit: string; unitValue: number; totalValue: number }[];
    cash: { name: string; type: string; balance: number }[];
    totalFixed: number;
    totalStocks: number;
    totalCash: number;
    total: number;
  };
  liabilities: {
    capital: number;
    profit: number;
    total: number;
  };
}

export default function BalanceSheet() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState(() => new Date().toISOString().split('T')[0]);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getBalanceSheet(projectId, asOf);
      const d = res.data;
      setData({
        date: d.date || asOf,
        assets: {
          fixedAssets: Array.isArray(d.assets?.fixedAssets) ? d.assets.fixedAssets : [],
          stocks: Array.isArray(d.assets?.stocks) ? d.assets.stocks : [],
          cash: Array.isArray(d.assets?.cash) ? d.assets.cash : [],
          totalFixed: d.assets?.totalFixed ?? 0,
          totalStocks: d.assets?.totalStocks ?? 0,
          totalCash: d.assets?.totalCash ?? 0,
          total: d.assets?.total ?? 0,
        },
        liabilities: {
          capital: d.liabilities?.capital ?? 0,
          profit: d.liabilities?.profit ?? 0,
          total: d.liabilities?.total ?? 0,
        },
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
      ['BILAN'],
      [`Au ${formatDate(asOf)}`],
      [],
      ['ACTIF'],
      ['Immobilisations'],
      ...(data.assets.fixedAssets.map(a => [a.name, `Brut: ${a.acquisitionValue}`, `Amort: ${a.accumulated}`, `Net: ${a.bookValue}`])),
      ['Total Immobilisations', '', '', data.assets.totalFixed],
      [],
      ['Stocks'],
      ...(data.assets.stocks.map(s => [s.name, `${s.quantity} ${s.unit}`, `${s.unitValue}/u`, s.totalValue])),
      ['Total Stocks', '', '', data.assets.totalStocks],
      [],
      ['Trésorerie'],
      ...(data.assets.cash.map(c => [c.name, c.type, '', c.balance])),
      ['Total Trésorerie', '', '', data.assets.totalCash],
      [],
      ['TOTAL ACTIF', '', '', data.assets.total],
      [],
      ['PASSIF'],
      ['Capital des associés', '', '', data.liabilities.capital],
      ['Résultat', '', '', data.liabilities.profit],
      ['TOTAL PASSIF', '', '', data.liabilities.total],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilan-${asOf}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isBalanced = data ? Math.abs(data.assets.total - data.liabilities.total) < 0.01 : false;

  return (
    <div>
      <PageHeader
        title="Bilan"
        description="État du patrimoine de l'exploitation"
        actions={
          <button onClick={handleExport} disabled={!data} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
            <Download className="h-4 w-4" />Exporter CSV
          </button>
        }
      />

      {/* Date filter */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">À la date du</label>
          <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
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
          {/* Balance indicator */}
          {!isBalanced && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800 text-sm">
              Attention: L'actif ({formatCurrency(data.assets.total)}) ne correspond pas au passif ({formatCurrency(data.liabilities.total)}). Vérifiez les contributions en capital.
            </div>
          )}
          {isBalanced && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm flex items-center gap-2">
              <Scale className="h-4 w-4" />Bilan équilibré: Actif = Passif = {formatCurrency(data.assets.total)}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ACTIF */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 px-1">ACTIF</h2>

              {/* Fixed Assets */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Immobilisations</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Bien</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Brut</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Amort.</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.assets.fixedAssets.map((a, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">{a.name}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(a.acquisitionValue)}</td>
                        <td className="px-4 py-2 text-right text-red-500">-{formatCurrency(a.accumulated)}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(a.bookValue)}</td>
                      </tr>
                    ))}
                    {data.assets.fixedAssets.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400">Aucune immobilisation</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t border-gray-200">
                      <td colSpan={3} className="px-4 py-3 font-semibold text-gray-800">Total Immobilisations</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(data.assets.totalFixed)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Stocks */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Stocks</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Article</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Qté</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">CUMP</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Valeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.assets.stocks.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">{s.name}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{s.quantity} {s.unit}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(s.unitValue)}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(s.totalValue)}</td>
                      </tr>
                    ))}
                    {data.assets.stocks.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400">Aucun stock</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t border-gray-200">
                      <td colSpan={3} className="px-4 py-3 font-semibold text-gray-800">Total Stocks</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(data.assets.totalStocks)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Cash */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Trésorerie</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {data.assets.cash.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{c.name}</td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">{c.type}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.balance)}</td>
                      </tr>
                    ))}
                    {data.assets.cash.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">Aucun compte de trésorerie</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t border-gray-200">
                      <td colSpan={2} className="px-4 py-3 font-semibold text-gray-800">Total Trésorerie</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(data.assets.totalCash)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Total Actif */}
              <div className="bg-blue-700 text-white rounded-xl p-4 flex justify-between items-center">
                <span className="font-bold text-lg">TOTAL ACTIF</span>
                <span className="font-bold text-xl">{formatCurrency(data.assets.total)}</span>
              </div>
            </div>

            {/* PASSIF */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 px-1">PASSIF</h2>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Capitaux Propres</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">Capital des associés</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(data.liabilities.capital)}</td>
                    </tr>
                    <tr className={`hover:bg-gray-50 ${data.liabilities.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      <td className="px-4 py-3">{data.liabilities.profit >= 0 ? 'Résultat (bénéfice)' : 'Résultat (déficit)'}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(data.liabilities.profit)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t border-gray-200">
                      <td className="px-4 py-3 font-semibold text-gray-800">Total Capitaux Propres</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(data.liabilities.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Note */}
              <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                <p className="font-medium text-gray-700 mb-1">Note</p>
                <p>Le passif est constitué uniquement des capitaux propres (capital + résultat). Les dettes fournisseurs et emprunts ne sont pas encore gérés dans cette version.</p>
              </div>

              {/* Total Passif */}
              <div className="bg-green-700 text-white rounded-xl p-4 flex justify-between items-center">
                <span className="font-bold text-lg">TOTAL PASSIF</span>
                <span className="font-bold text-xl">{formatCurrency(data.liabilities.total)}</span>
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
