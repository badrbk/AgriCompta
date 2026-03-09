import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assetService } from '../../services/api';
import { Asset, ASSET_CATEGORY_LABELS } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import ConfirmDialog from '../../components/Modals/ConfirmDialog';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../utils/formatters';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

export default function AssetsList() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!projectId) return;
    try {
      const res = await assetService.getByProject(projectId);
      setAssets(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await assetService.delete(deleteId);
      await load();
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const totalValue = assets.filter(a => a.status === 'ACTIVE').reduce((sum, a) => sum + a.currentValue, 0);

  const DEPR_LABELS: Record<string, string> = {
    LINEAR: 'Linéaire', DECLINING: 'Dégressif', NONE: 'Aucun'
  };

  return (
    <div>
      <PageHeader
        title="Immobilisations"
        description={`Valeur totale : ${formatCurrency(totalValue, currentProject?.currency)}`}
        actions={
          <button
            onClick={() => navigate(`/projects/${projectId}/assets/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">Aucune immobilisation enregistrée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Catégorie</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Acquisition</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Valeur d'achat</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Valeur actuelle</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Amortissement</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{asset.name}</td>
                    <td className="px-4 py-3 text-gray-600">{ASSET_CATEGORY_LABELS[asset.category]}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(asset.acquisitionDate)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(asset.acquisitionValue, currentProject?.currency)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700">{formatCurrency(asset.currentValue, currentProject?.currency)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {DEPR_LABELS[asset.depreciationMethod]}
                      {asset.usefulLifeYears && ` (${asset.usefulLifeYears} ans)`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(asset.status)}`}>
                        {getStatusLabel(asset.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => navigate(`/projects/${projectId}/assets/${asset.id}`)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => navigate(`/projects/${projectId}/assets/${asset.id}/edit`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(asset.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
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
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Supprimer l'immobilisation"
        message="Cette immobilisation sera définitivement supprimée avec ses amortissements."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={deleting}
      />
    </div>
  );
}
