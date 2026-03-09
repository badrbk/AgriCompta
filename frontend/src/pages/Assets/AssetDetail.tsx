import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assetService } from '../../services/api';
import { Asset } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate, formatNumber, getStatusColor, getStatusLabel } from '../../utils/formatters';
import { ArrowLeft, Edit, TrendingDown } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

export default function AssetDetail() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [data, setData] = useState<{ asset: Asset; depreciations: unknown[]; theoreticalTable: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!id) return;
    assetService.getDepreciation(id).then(res => setData(res.data)).finally(() => setLoading(false));
  }, [id]);

  const handleApplyDepreciation = async () => {
    if (!id) return;
    setApplying(true);
    try {
      await assetService.applyDepreciation(id, new Date().getFullYear());
      const res = await assetService.getDepreciation(id);
      setData(res.data);
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>;
  if (!data) return null;

  const { asset, theoreticalTable } = data;

  return (
    <div>
      <PageHeader
        title={asset.name}
        description={`${formatCurrency(asset.currentValue, currentProject?.currency)} - ${getStatusLabel(asset.status)}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate(`/projects/${projectId}/assets/${id}/edit`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Edit className="h-4 w-4" />Modifier
            </button>
            {asset.depreciationMethod !== 'NONE' && (
              <button onClick={handleApplyDepreciation} disabled={applying} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <TrendingDown className="h-4 w-4" />
                {applying ? 'En cours...' : `Amortir ${new Date().getFullYear()}`}
              </button>
            )}
            <button onClick={() => navigate(`/projects/${projectId}/assets`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />Retour
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Informations</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Catégorie</dt>
              <dd className="font-medium">{asset.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Date d'acquisition</dt>
              <dd className="font-medium">{formatDate(asset.acquisitionDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Valeur d'acquisition</dt>
              <dd className="font-medium">{formatCurrency(asset.acquisitionValue, currentProject?.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Valeur actuelle</dt>
              <dd className="font-semibold text-blue-700">{formatCurrency(asset.currentValue, currentProject?.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Dépréciation</dt>
              <dd className="text-red-600 font-medium">{formatCurrency(asset.acquisitionValue - asset.currentValue, currentProject?.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Statut</dt>
              <dd><span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(asset.status)}`}>{getStatusLabel(asset.status)}</span></dd>
            </div>
            {asset.location && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Localisation</dt>
                <dd className="font-medium">{asset.location}</dd>
              </div>
            )}
            {asset.serialNumber && (
              <div className="flex justify-between">
                <dt className="text-gray-500">N° de série</dt>
                <dd className="font-mono text-xs">{asset.serialNumber}</dd>
              </div>
            )}
          </dl>
          {asset.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{asset.notes}</p>
            </div>
          )}
        </div>

        {/* Tableau d'amortissement */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              Tableau d'amortissement
              {asset.depreciationMethod !== 'NONE' && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({asset.depreciationMethod === 'LINEAR' ? 'Linéaire' : 'Dégressif'} - {asset.usefulLifeYears} ans)
                </span>
              )}
            </h3>
          </div>
          {asset.depreciationMethod === 'NONE' ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              Pas d'amortissement pour cet actif
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Année</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Annuité</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amort. cumulé</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Valeur nette</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(theoreticalTable as { year: number; annualDepreciation: number; accumulatedDepreciation: number; bookValue: number }[]).map((row) => (
                    <tr key={row.year} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{row.year}</td>
                      <td className="px-4 py-2 text-right text-red-600">{formatCurrency(row.annualDepreciation, currentProject?.currency)}</td>
                      <td className="px-4 py-2 text-right text-orange-600">{formatCurrency(row.accumulatedDepreciation, currentProject?.currency)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-blue-700">{formatCurrency(row.bookValue, currentProject?.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
