import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Download, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CashFlowEntry {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  amount: number;
  balanceAfter: number;
  cashAccount: { name: string; type: string };
  transaction?: { description: string; type: string };
}

interface CashFlowData {
  entries: CashFlowEntry[];
  totalIn: number;
  totalOut: number;
  netFlow: number;
  openingBalance: number;
  closingBalance: number;
  monthlyData: { month: string; in: number; out: number; balance: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  );
};

export default function CashFlow() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<CashFlowData | null>(null);
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
      const res = await reportService.getCashFlow(projectId, dateFrom, dateTo);
      const d = res.data;
      // Support both old field name (flows/netCashFlow) and new (entries/netFlow)
      setData({
        entries: Array.isArray(d.entries) ? d.entries : Array.isArray(d.flows) ? d.flows : [],
        totalIn: d.totalIn ?? 0,
        totalOut: d.totalOut ?? 0,
        netFlow: d.netFlow ?? d.netCashFlow ?? 0,
        openingBalance: d.openingBalance ?? 0,
        closingBalance: d.closingBalance ?? 0,
        monthlyData: Array.isArray(d.monthlyData) ? d.monthlyData : [],
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
      ['FLUX DE TRÉSORERIE'],
      [`Période du ${formatDate(dateFrom)} au ${formatDate(dateTo)}`],
      [],
      ['Date', 'Compte', 'Type', 'Entrée', 'Sortie', 'Solde'],
      ...data.entries.map(e => [
        formatDate(e.date),
        e.cashAccount.name,
        e.transaction?.description || '',
        e.type === 'IN' ? e.amount : '',
        e.type === 'OUT' ? e.amount : '',
        e.balanceAfter,
      ]),
      [],
      ['', '', 'Total Entrées', data.totalIn, '', ''],
      ['', '', 'Total Sorties', '', data.totalOut, ''],
      ['', '', 'Flux Net', '', '', data.netFlow],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flux-tresorerie-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Flux de Trésorerie"
        description="Suivi des entrées et sorties de cash"
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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Solde d'ouverture</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(data.openingBalance)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
                <p className="text-xs text-gray-500">Total Entrées</p>
              </div>
              <p className="text-lg font-bold text-green-700">{formatCurrency(data.totalIn)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
                <p className="text-xs text-gray-500">Total Sorties</p>
              </div>
              <p className="text-lg font-bold text-red-700">{formatCurrency(data.totalOut)}</p>
            </div>
            <div className={`rounded-xl border p-4 shadow-sm ${data.netFlow >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs text-gray-500">Flux Net</p>
              <p className={`text-lg font-bold ${data.netFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(data.netFlow)}</p>
              <p className="text-xs text-gray-500 mt-1">Solde final: {formatCurrency(data.closingBalance)}</p>
            </div>
          </div>

          {/* Chart */}
          {data.monthlyData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Évolution Mensuelle</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="in" name="Entrées" stroke="#16a34a" fill="#dcfce7" strokeWidth={2} />
                  <Area type="monotone" dataKey="out" name="Sorties" stroke="#dc2626" fill="#fee2e2" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Entries Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Détail des Mouvements ({data.entries.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Compte</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Entrée</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Sortie</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.entries.map(e => (
                    <tr key={e.id} className={`hover:bg-gray-50 ${e.type === 'IN' ? 'border-l-2 border-l-green-400' : 'border-l-2 border-l-red-400'}`}>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 text-gray-600">{e.cashAccount.name}</td>
                      <td className="px-4 py-3 text-gray-700">{e.transaction?.description || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">
                        {e.type === 'IN' ? formatCurrency(e.amount) : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-red-700">
                        {e.type === 'OUT' ? formatCurrency(e.amount) : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(e.balanceAfter)}</td>
                    </tr>
                  ))}
                  {data.entries.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun mouvement sur cette période</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">Aucune donnée disponible</div>
      )}
    </div>
  );
}
