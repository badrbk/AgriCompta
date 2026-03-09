import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cropService } from '../../services/api';
import { Crop, CROP_STATUS_LABELS } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { formatDate, getStatusColor } from '../../utils/formatters';
import { Plus, Eye, Edit, Sprout } from 'lucide-react';

export default function CropsList() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!projectId) return;
    cropService.getCrops(projectId, statusFilter ? { status: statusFilter } : undefined)
      .then(res => setCrops(res.data))
      .finally(() => setLoading(false));
  }, [projectId, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Cultures"
        description={`${crops.length} culture(s) enregistrée(s)`}
        actions={
          <button onClick={() => navigate(`/projects/${projectId}/crops/new`)} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
            <Plus className="h-4 w-4" />Nouvelle culture
          </button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'PLANNED', 'PLANTED', 'GROWING', 'HARVESTED', 'FAILED'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === status ? 'bg-green-700 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            {status === '' ? 'Tous' : CROP_STATUS_LABELS[status as keyof typeof CROP_STATUS_LABELS]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : crops.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Sprout className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucune culture enregistrée</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Culture</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Parcelle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plantation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Superficie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {crops.map(crop => (
                <tr key={crop.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{crop.cropType}</p>
                    {crop.variety && <p className="text-xs text-gray-500">{crop.variety}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{crop.plot?.name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(crop.plantingDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{crop.areaPlanted} ha</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(crop.status)}`}>
                      {CROP_STATUS_LABELS[crop.status as keyof typeof CROP_STATUS_LABELS] || crop.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => navigate(`/projects/${projectId}/crops/${crop.id}`)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => navigate(`/projects/${projectId}/crops/${crop.id}/edit`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="h-4 w-4" />
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
  );
}
