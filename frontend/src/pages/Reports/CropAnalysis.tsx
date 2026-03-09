import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency } from '../../utils/formatters';
import { Download, Sprout } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CropAnalysisItem {
  cropId: string;
  cropType: string;
  variety: string;
  plotName: string;
  areaPlanted: number;
  status: string;
  totalExpenses: number;
  totalHarvestKg: number;
  yieldPerHa: number;
  costPerKg: number;
  revenue: number;
  margin: number;
  marginRate: number;
}

interface CropAnalysisData {
  crops: CropAnalysisItem[];
  totals: {
    totalExpenses: number;
    totalRevenue: number;
    totalMargin: number;
    totalHarvestKg: number;
  };
}

const CROP_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planifiée',
  PLANTED: 'Plantée',
  GROWING: 'En croissance',
  HARVESTED: 'Récoltée',
  FAILED: 'Échouée',
};

const CROP_STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-gray-100 text-gray-700',
  PLANTED: 'bg-blue-100 text-blue-700',
  GROWING: 'bg-yellow-100 text-yellow-700',
  HARVESTED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
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

export default function CropAnalysis() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<CropAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getCropAnalysis(projectId);
      const d = res.data;
      // Support both old format (array) and new format ({crops, totals})
      const crops = Array.isArray(d) ? d.map((c: any) => ({
        cropId: c.cropId || c.id,
        cropType: c.cropType,
        variety: c.variety,
        plotName: c.plotName,
        areaPlanted: c.areaPlanted ?? c.area ?? 0,
        status: c.status,
        totalExpenses: c.totalExpenses ?? 0,
        totalHarvestKg: c.totalHarvestKg ?? 0,
        yieldPerHa: c.yieldPerHa ?? 0,
        costPerKg: c.costPerKg ?? 0,
        revenue: c.revenue ?? 0,
        margin: c.margin ?? -(c.totalExpenses ?? 0),
        marginRate: c.marginRate ?? 0,
      })) : Array.isArray(d.crops) ? d.crops : [];
      const totals = d.totals || {
        totalExpenses: crops.reduce((s: number, c: any) => s + c.totalExpenses, 0),
        totalRevenue: crops.reduce((s: number, c: any) => s + c.revenue, 0),
        totalMargin: crops.reduce((s: number, c: any) => s + c.margin, 0),
        totalHarvestKg: crops.reduce((s: number, c: any) => s + c.totalHarvestKg, 0),
      };
      setData({ crops, totals });
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
      ['ANALYSE DES CULTURES'],
      [],
      ['Culture', 'Variété', 'Parcelle', 'Surface (ha)', 'Statut', 'Charges', 'Récolte (kg)', 'Rendement (kg/ha)', 'Coût/kg', 'CA', 'Marge', 'Taux marge'],
      ...data.crops.map(c => [
        c.cropType, c.variety || '', c.plotName, c.areaPlanted, CROP_STATUS_LABELS[c.status] || c.status,
        c.totalExpenses, c.totalHarvestKg, c.yieldPerHa.toFixed(0), c.costPerKg.toFixed(2), c.revenue, c.margin, `${c.marginRate.toFixed(1)}%`,
      ]),
      [],
      ['TOTAUX', '', '', '', '', data.totals.totalExpenses, data.totals.totalHarvestKg, '', '', data.totals.totalRevenue, data.totals.totalMargin, ''],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analyse-cultures.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = data?.crops.slice(0, 10).map(c => ({
    name: `${c.cropType}${c.variety ? ` (${c.variety})` : ''}`,
    Charges: c.totalExpenses,
    Revenus: c.revenue,
    Marge: c.margin,
  })) || [];

  return (
    <div>
      <PageHeader
        title="Analyse des Cultures"
        description="Performance par culture: rendements, coûts et marges"
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
              <p className="text-xs text-gray-500">Total Charges</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(data.totals.totalExpenses)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Total Revenus</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(data.totals.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Récolte Totale</p>
              <p className="text-lg font-bold text-gray-900">{data.totals.totalHarvestKg.toLocaleString('fr-MA')} kg</p>
            </div>
            <div className={`rounded-xl border p-4 shadow-sm ${data.totals.totalMargin >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs text-gray-500">Marge Nette</p>
              <p className={`text-lg font-bold ${data.totals.totalMargin >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(data.totals.totalMargin)}</p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Charges vs Revenus par Culture</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 0, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="Charges" fill="#fca5a5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Revenus" fill="#86efac" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Marge" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Détail par Culture ({data.crops.length})</h3>
            </div>
            {data.crops.length === 0 ? (
              <div className="text-center py-12">
                <Sprout className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune culture enregistrée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Culture</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Parcelle</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Surface</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Charges</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Récolte (kg)</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Rdmt (kg/ha)</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Coût/kg</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">CA</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Marge</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.crops.map(c => (
                      <tr key={c.cropId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{c.cropType}</div>
                          {c.variety && <div className="text-xs text-gray-400">{c.variety}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.plotName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CROP_STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-700'}`}>
                            {CROP_STATUS_LABELS[c.status] || c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{c.areaPlanted} ha</td>
                        <td className="px-4 py-3 text-right text-red-700">{formatCurrency(c.totalExpenses)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{c.totalHarvestKg.toLocaleString('fr-MA')}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{c.yieldPerHa.toFixed(0)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(c.costPerKg)}</td>
                        <td className="px-4 py-3 text-right text-blue-700">{formatCurrency(c.revenue)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${c.margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(c.margin)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${c.marginRate >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {c.marginRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan={4} className="px-4 py-3 font-semibold text-gray-900">TOTAUX</td>
                      <td className="px-4 py-3 text-right font-bold text-red-700">{formatCurrency(data.totals.totalExpenses)}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{data.totals.totalHarvestKg.toLocaleString('fr-MA')}</td>
                      <td colSpan={2} />
                      <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(data.totals.totalRevenue)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${data.totals.totalMargin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(data.totals.totalMargin)}
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
