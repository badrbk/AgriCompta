import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { associateService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Users, AlertCircle, Trash2, UserCheck, UserX } from 'lucide-react';

const schema = z.object({
  userId: z.string().min(1, "L'identifiant utilisateur est requis"),
  participationPercentage: z.coerce.number().min(0.01, 'La participation doit être supérieure à 0').max(100),
  initialContribution: z.coerce.number().min(0).default(0),
  joinDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AssociateWithUser {
  id: string;
  userId: string;
  participationPercentage: number;
  initialContribution: number;
  joinDate: string;
  isActive: boolean;
  user: { firstName: string; lastName: string; email: string; role: string };
}

export default function Associates() {
  const { projectId } = useParams<{ projectId: string }>();
  const [associates, setAssociates] = useState<AssociateWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { participationPercentage: 0, initialContribution: 0, joinDate: new Date().toISOString().split('T')[0] },
  });

  const load = async () => {
    if (!projectId) return;
    associateService.getAll(projectId).then(res => setAssociates(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const totalParticipation = associates.filter(a => a.isActive).reduce((sum, a) => sum + a.participationPercentage, 0);
  const totalCapital = associates.reduce((sum, a) => sum + a.initialContribution, 0);

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await associateService.create({ ...data, projectId });
      await load();
      setShowForm(false);
      reset();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'ajout de l\'associé');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await associateService.update(id, { isActive: !isActive });
      await load();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet associé ? Cette action est irréversible.')) return;
    try {
      await associateService.delete(id);
      await load();
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <PageHeader
        title="Associés"
        description={`${associates.length} associé(s) — Participation totale: ${totalParticipation.toFixed(1)}%`}
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
            <Plus className="h-4 w-4" />Ajouter un associé
          </button>
        }
      />

      {/* Participation bar */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Répartition des participations</p>
          <p className="text-sm font-medium text-gray-900">{totalParticipation.toFixed(1)}% / 100%</p>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${totalParticipation > 100 ? 'bg-red-500' : totalParticipation === 100 ? 'bg-green-600' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(totalParticipation, 100)}%` }}
          />
        </div>
        {totalParticipation > 100 && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Le total dépasse 100%</p>
        )}
        {totalParticipation < 100 && totalParticipation > 0 && (
          <p className="text-xs text-yellow-600 mt-1">{(100 - totalParticipation).toFixed(1)}% non attribué</p>
        )}
        <p className="text-xs text-gray-500 mt-2">Capital total apporté: {formatCurrency(totalCapital)}</p>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">Ajouter un associé</h3>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />{error}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Utilisateur *</label>
              <input
                {...register('userId')}
                placeholder="CUID de l'utilisateur (ex: clxxxxxxxxxxxxxxxx)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none font-mono"
              />
              {errors.userId && <p className="mt-1 text-xs text-red-600">{errors.userId.message}</p>}
              <p className="mt-1 text-xs text-gray-400">L'utilisateur doit d'abord avoir un compte dans le système.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Participation (%) *</label>
              <input
                {...register('participationPercentage')}
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {errors.participationPercentage && <p className="mt-1 text-xs text-red-600">{errors.participationPercentage.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apport initial (MAD)</label>
              <input
                {...register('initialContribution')}
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'entrée</label>
              <input
                {...register('joinDate')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
                {isSubmitting ? 'Ajout...' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); reset(); setError(''); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Associates list */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : associates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun associé enregistré</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Associé</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Part (%)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Apport</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Entrée</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {associates.map(a => (
                <tr key={a.id} className={`hover:bg-gray-50 ${!a.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.user?.firstName} {a.user?.lastName}</div>
                    <div className="text-xs text-gray-400">{a.user?.role}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.user?.email}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{a.participationPercentage.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(a.initialContribution)}</td>
                  <td className="px-4 py-3 text-gray-500">{a.joinDate ? formatDate(a.joinDate) : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${a.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {a.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(a.id, a.isActive)}
                        title={a.isActive ? 'Désactiver' : 'Réactiver'}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                      >
                        {a.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      >
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
  );
}
