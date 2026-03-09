import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { livestockService } from '../../services/api';
import { LivestockGroup } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import ConfirmDialog from '../../components/Modals/ConfirmDialog';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../utils/formatters';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

export default function LivestockList() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [groups, setGroups] = useState<LivestockGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!projectId) return;
    try {
      const res = await livestockService.getByProject(projectId);
      setGroups(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const totalValue = groups.filter(g => g.status === 'ACTIVE').reduce((sum, g) => sum + g.currentCount * g.unitValue, 0);

  return (
    <div>
      <PageHeader
        title="Cheptel"
        description={`Valeur totale : ${formatCurrency(totalValue, currentProject?.currency)}`}
        actions={
          <button onClick={() => navigate(`/projects/${projectId}/livestock/new`)} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
            <Plus className="h-4 w-4" />Ajouter un groupe
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-sm">Aucun groupe de cheptel enregistré</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <div key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{group.species}</h3>
                    {group.breed && <p className="text-sm text-gray-500">{group.breed}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(group.status)}`}>
                    {getStatusLabel(group.status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">Effectif actuel</p>
                    <p className="font-bold text-2xl text-gray-900">{group.currentCount}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">Valeur unitaire</p>
                    <p className="font-semibold text-green-700">{formatCurrency(group.unitValue, currentProject?.currency)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Valeur totale</p>
                    <p className="font-bold text-blue-700">{formatCurrency(group.currentCount * group.unitValue, currentProject?.currency)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/projects/${projectId}/livestock/${group.id}`)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => navigate(`/projects/${projectId}/livestock/${group.id}/edit`)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteId(group.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Supprimer ce groupe"
        message="Ce groupe de cheptel sera supprimé avec tous ses mouvements et dépenses."
        confirmLabel="Supprimer"
        onConfirm={async () => { await livestockService.delete(deleteId!); setDeleteId(null); load(); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
