import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency } from '../../utils/formatters';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LivestockAnalysisItem {
  groupId: string;
  species: string;
  breed: string;
  type: string;
  currentCount: number;
  unitValue: number;
  currentValue: number;
  totalExpenses: number;
  totalRevenue: number;
  netResult: number;
  roi: number;
}

interface LivestockAnalysisData {
  groups: LivestockAnalysisItem[];
  totals: {
    totalValue: number;
    totalExpenses: number;
    totalRevenue: number;
    netResult: number;
  };
}

const LIVESTOCK_TYPE_LABELS: Record<string, string> = {
  BREEDING: 'Élevage',
  FATTENING: 'Engraissement',
};

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

export default function LivestockAnalysis() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<LivestockAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getLivestockAnalysis(projectId);
      const d = res.data;
      // Support both old format (array) and new format ({groups, totals})
      const groups = Array.isArray(d) ? d.map((g: any) => ({
        groupId: g.groupId || g.id,
        species: g.species,
        breed: g.breed,
        type: g.type,
        currentCount: g.currentCount ?? 0,
        unitValue: g.unitValue ?? 0,
        currentValue: g.currentValue ?? 0,
        totalExpenses: g.totalExpenses ?? 0,
        totalRevenue: g.totalRevenue ?? 0,
        netResult: g.netResult ?? (g.totalRevenue ?? 0) + (g.currentValue ?? 0) - (g.totalExpenses ?? 0),
        roi: g.roi ?? 0,
      })) : Array.isArray(d.groups) ? d.groups : [];
      const totals = d.totals || {
        totalValue: groups.reduce((s: number, g: any) => s + g.currentValue, 0),
        totalExpenses: groups.reduce((s: number, g: any) => s + g.totalExpenses, 0),
        totalRevenue: groups.reduce((s: number, g: any) => s + g.totalRevenue, 0),
        netResult: groups.reduce((s: number, g: any) => s + g.netResult, 0),
      };
      setData({ groups, totals });
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
      ['ANALYSE DU CHEPTEL'],
      [],
      ['Espèce', 'Race', 'Type', 'Effectif', 'Valeur unitaire', 'Valeur totale', 'Charges', 'Revenus', 'Résultat', 'ROI (%)'],
      ...data.groups.map(g => [
        g.species, g.breed || '', LIVESTOCK_TYPE_LABELS[g.type] || g.type,
        g.currentCount, g.unitValue, g.currentValue,
        g.totalExpenses, g.totalRevenue, g.netResult, `${g.roi.toFixed(1)}%`,
      ]),
      [],
      ['TOTAUX', '', '', '', '', data.totals.totalValue, data.totals.totalExpenses, data.totals.totalRevenue, data.totals.netResult, ''],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analyse-cheptel.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = data?.groups.map(g => ({
    name: `${g.species}${g.breed ? ` (${g.breed})` : ''}`,
    Charges: g.totalExpenses,
    Revenus: g.totalRevenue,
    Valeur: g.currentValue,
  })) || [];

  return (
    <div>
      <PageHeader
        title="Analyse du Cheptel"
        description="Performance par groupe d'animaux: charges, revenus et rentabilité"
        actions={
          <button onClick={handleExport} disabled={!data} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
            <Download className="h-4 w-4" />Exporter CSV
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error}</div>
      ) : data ? (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Valeur du Cheptel</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(data.totals.totalValue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Total Charges</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(data.totals.totalExpenses)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Total Revenus</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(data.totals.totalRevenue)}</p>
            </div>
            <div className={`rounded-xl border p-4 shadow-sm ${data.totals.netResult >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs text-gray-500">Résultat Net</p>
              <p className={`text-lg font-bold ${data.totals.netResult >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(data.totals.netResult)}</p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Performance par Groupe</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 0, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="Valeur" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Charges" fill="#fca5a5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Revenus" fill="#86efac" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Détail par Groupe ({data.groups.length})</h3>
            </div>
            {data.groups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-4xl mb-3">🐄</p>
                <p className="text-gray-500">Aucun groupe d'animaux enregistré</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Espèce / Race</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Effectif</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Val. Unit.</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Val. Totale</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Charges</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Revenus</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Résultat</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.groups.map(g => (
                      <tr key={g.groupId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{g.species}</div>
                          {g.breed && <div className="text-xs text-gray-400">{g.breed}</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${g.type === 'BREEDING' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                            {LIVESTOCK_TYPE_LABELS[g.type] || g.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{g.currentCount}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(g.unitValue)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(g.currentValue)}</td>
                        <td className="px-4 py-3 text-right text-red-700">{formatCurrency(g.totalExpenses)}</td>
                        <td className="px-4 py-3 text-right text-blue-700">{formatCurrency(g.totalRevenue)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${g.netResult >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(g.netResult)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${g.roi >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {g.roi.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan={4} className="px-4 py-3 font-semibold text-gray-900">TOTAUX</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(data.totals.totalValue)}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-700">{formatCurrency(data.totals.totalExpenses)}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(data.totals.totalRevenue)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${data.totals.netResult >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(data.totals.netResult)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">Aucune donnée disponible</div>
      )}
    </div>
  );
}
