import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { associateService, userService } from '../../services/api';
import { User } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Users, AlertCircle, Trash2, UserCheck, UserX, Pencil, X } from 'lucide-react';

const schema = z.object({
  userId: z.string().min(1, "L'identifiant utilisateur est requis"),
  participationPercentage: z.coerce.number().min(0.01, 'La participation doit être supérieure à 0').max(100),
  initialContribution: z.coerce.number().min(0).default(0),
  joinDate: z.string().optional(),
});

const editSchema = z.object({
  participationPercentage: z.coerce.number().min(0.01, 'La participation doit être supérieure à 0').max(100),
  initialContribution: z.coerce.number().min(0).default(0),
});

type FormData = z.infer<typeof schema>;
type EditFormData = z.infer<typeof editSchema>;

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [editingAssociate, setEditingAssociate] = useState<AssociateWithUser | null>(null);
  const [editError, setEditError] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { participationPercentage: 0, initialContribution: 0, joinDate: new Date().toISOString().split('T')[0] },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  const load = async () => {
    if (!projectId) return;
    const [assocRes, usersRes] = await Promise.all([
      associateService.getAll(projectId),
      userService.getAll(),
    ]);
    setAssociates(assocRes.data);
    setUsers(usersRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  // Utilisateurs pas encore associés à ce projet
  const availableUsers = users.filter(
    u => !associates.some(a => a.userId === u.id)
  );

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

  const openEdit = (a: AssociateWithUser) => {
    setEditingAssociate(a);
    setEditError('');
    resetEdit({
      participationPercentage: a.participationPercentage,
      initialContribution: a.initialContribution,
    });
  };

  const onEditSubmit = async (data: EditFormData) => {
    if (!editingAssociate) return;
    setEditError('');
    try {
      await associateService.update(editingAssociate.id, data);
      await load();
      setEditingAssociate(null);
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Erreur lors de la modification');
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Utilisateur *</label>
              {availableUsers.length === 0 ? (
                <div className="w-full px-3 py-2 border border-amber-200 bg-amber-50 rounded-lg text-sm text-amber-700">
                  Tous les utilisateurs sont déjà associés à ce projet, ou aucun utilisateur n'existe.
                </div>
              ) : (
                <select
                  {...register('userId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                >
                  <option value="">— Sélectionner un utilisateur —</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              )}
              {errors.userId && <p className="mt-1 text-xs text-red-600">{errors.userId.message}</p>}
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

      {/* Edit modal */}
      {editingAssociate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Modifier — {editingAssociate.user?.firstName} {editingAssociate.user?.lastName}
              </h3>
              <button onClick={() => setEditingAssociate(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />{editError}
              </div>
            )}

            <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participation (%) *</label>
                <input
                  {...registerEdit('participationPercentage')}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                {editErrors.participationPercentage && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.participationPercentage.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apport initial (MAD)</label>
                <input
                  {...registerEdit('initialContribution')}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
                >
                  {isEditSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAssociate(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
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
                        onClick={() => openEdit(a)}
                        title="Modifier les parts"
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
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
