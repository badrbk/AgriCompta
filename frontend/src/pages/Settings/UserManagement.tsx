import { useEffect, useState } from 'react';
import { userService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { formatDate } from '../../utils/formatters';
import { User, UserRole } from '../../types';
import { Plus, Trash2, Edit2, X, Users, ShieldCheck, Eye, Calculator, UserCog } from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  ASSOCIATE: 'Associé',
  ACCOUNTANT: 'Comptable',
  OBSERVER: 'Observateur',
};

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  ASSOCIATE: 'bg-blue-100 text-blue-700',
  ACCOUNTANT: 'bg-green-100 text-green-700',
  OBSERVER: 'bg-gray-100 text-gray-600',
};

const ROLE_ICONS: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  ADMIN: ShieldCheck,
  ASSOCIATE: Users,
  ACCOUNTANT: Calculator,
  OBSERVER: Eye,
};

interface UserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

interface EditRoleForm {
  role: UserRole;
}

const emptyForm: UserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'ASSOCIATE',
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal création
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<UserForm>(emptyForm);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal édition rôle
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('ASSOCIATE');
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);

  // Suppression
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userService.getAll();
      setUsers(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // --- Création ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await userService.create(createForm);
      setShowCreate(false);
      setCreateForm(emptyForm);
      await load();
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  // --- Édition rôle ---
  const openEdit = (user: User) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditError('');
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditError('');
    setEditing(true);
    try {
      await userService.updateProfile(editUser.id, { role: editRole });
      setEditUser(null);
      await load();
    } catch (err: any) {
      setEditError(err?.response?.data?.error || 'Erreur lors de la modification');
    } finally {
      setEditing(false);
    }
  };

  // --- Suppression ---
  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await userService.delete(deleteUser.id);
      setDeleteUser(null);
      await load();
    } catch (err: any) {
      setDeleteUser(null);
    } finally {
      setDeleting(false);
    }
  };

  // Stats par rôle
  const stats = (['ADMIN', 'ASSOCIATE', 'ACCOUNTANT', 'OBSERVER'] as UserRole[]).map(role => ({
    role,
    count: users.filter(u => u.role === role).length,
  }));

  return (
    <div>
      <PageHeader
        title="Gestion des utilisateurs"
        description="Créer, modifier et supprimer les comptes utilisateurs"
        actions={
          <button
            onClick={() => { setShowCreate(true); setCreateForm(emptyForm); setCreateError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
          >
            <Plus className="h-4 w-4" /> Nouvel utilisateur
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(({ role, count }) => {
          const Icon = ROLE_ICONS[role];
          return (
            <div key={role} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
              <div className={`p-2 rounded-lg ${ROLE_COLORS[role].replace('text-', 'text-').split(' ')[0]}`}>
                <Icon className={`h-5 w-5 ${ROLE_COLORS[role].split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{ROLE_LABELS[role]}</p>
                <p className="text-xl font-bold text-gray-900">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-gray-500" />
            Utilisateurs ({users.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 text-sm">{error}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucun utilisateur</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Rôle</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Créé le</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Dernière connexion</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{user.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.lastLogin ? formatDate(user.lastLogin) : <span className="text-gray-300">Jamais</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier le rôle"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
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

      {/* ===== MODAL CRÉATION ===== */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Nouvel utilisateur</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={createForm.firstName}
                    onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={createForm.lastName}
                    onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nom"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe * (min. 8 caractères)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rôle *</label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {createForm.role === 'ADMIN' && 'Accès total à toutes les fonctionnalités.'}
                  {createForm.role === 'ASSOCIATE' && 'Peut gérer les données du projet.'}
                  {createForm.role === 'ACCOUNTANT' && 'Accès en lecture/écriture aux données comptables.'}
                  {createForm.role === 'OBSERVER' && 'Accès en lecture seule.'}
                </p>
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-600">
                  {createError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
                >
                  {creating ? 'Création...' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL ÉDITION RÔLE ===== */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Modifier le rôle</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditRole} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Utilisateur : <span className="font-semibold text-gray-900">{editUser.firstName} {editUser.lastName}</span>
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nouveau rôle</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-600">
                  {editError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {editing ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL SUPPRESSION ===== */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Supprimer l'utilisateur</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Voulez-vous vraiment supprimer <span className="font-semibold text-gray-900">{deleteUser.firstName} {deleteUser.lastName}</span> ({deleteUser.email}) ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
