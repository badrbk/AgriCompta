import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { closureService } from '../../services/api';
import { SeasonClosure } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Lock, CheckCircle, DollarSign } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Lock }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-yellow-100 text-yellow-800', icon: Lock },
  VALIDATED: { label: 'Validée', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  DISTRIBUTED: { label: 'Distribuée', color: 'bg-green-100 text-green-800', icon: DollarSign },
};

export default function ClosuresList() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [closures, setClosures] = useState<SeasonClosure[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!projectId) return;
    closureService.getAll(projectId).then(res => setClosures(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  return (
    <div>
      <PageHeader
        title="Clôtures de Saison"
        description={`${closures.length} clôture(s) enregistrée(s)`}
        actions={
          <button
            onClick={() => navigate(`/projects/${projectId}/closures/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
          >
            <Plus className="h-4 w-4" />Nouvelle clôture
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : closures.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Lock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune clôture de saison</p>
          <p className="text-gray-400 text-sm mt-1">Créez une clôture pour arrêter les comptes d'une saison</p>
          <button
            onClick={() => navigate(`/projects/${projectId}/closures/new`)}
            className="mt-4 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
          >
            Créer la première clôture
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {closures.map(closure => {
            const cfg = STATUS_CONFIG[closure.status] || STATUS_CONFIG.DRAFT;
            const Icon = cfg.icon;
            return (
              <div
                key={closure.id}
                onClick={() => navigate(`/projects/${projectId}/closures/${closure.id}`)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{closure.seasonName}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon className="h-3 w-3" />{cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">Date de clôture: {formatDate(closure.closureDate)}</p>
                    {closure.notes && <p className="text-sm text-gray-400 mt-1 italic">{closure.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${closure.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(closure.netProfit)}
                    </p>
                    <p className="text-xs text-gray-400">Résultat net</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Produits</p>
                    <p className="font-semibold text-blue-700">{formatCurrency(closure.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Charges</p>
                    <p className="font-semibold text-red-700">{formatCurrency(closure.totalExpenses)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amortissements</p>
                    <p className="font-semibold text-orange-700">{formatCurrency(closure.depreciation)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
