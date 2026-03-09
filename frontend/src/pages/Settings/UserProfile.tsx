import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { userService } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../../components/Layout/PageHeader';
import { Save, CheckCircle, AlertCircle, Lock, User } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string().min(1, 'Confirmez le nouveau mot de passe'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  ASSOCIATE: 'Associé',
  ACCOUNTANT: 'Comptable',
  OBSERVER: 'Observateur',
};

export default function UserProfile() {
  const { user, setAuth, token, refreshToken } = useAuthStore();
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    setProfileError('');
    try {
      if (!user?.id) return;
      const res = await userService.updateProfile(user.id, data);
      // Update auth store with new user info
      setAuth({ ...user, ...res.data }, token!, refreshToken!);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordError('');
    try {
      if (!user?.id) return;
      await userService.changePassword(user.id, { currentPassword: data.currentPassword, newPassword: data.newPassword });
      setPasswordSaved(true);
      passwordForm.reset();
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
    }
  };

  return (
    <div>
      <PageHeader
        title="Mon Profil"
        description="Gérer vos informations personnelles et votre mot de passe"
      />

      <div className="max-w-2xl space-y-6">
        {/* User badge */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-green-700 text-white flex items-center justify-center text-xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
              {ROLE_LABELS[user?.role || ''] || user?.role}
            </span>
          </div>
        </div>

        {/* Profile form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Informations Personnelles</h3>
          </div>

          {profileError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />{profileError}
            </div>
          )}

          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                <input
                  {...profileForm.register('firstName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                {profileForm.formState.errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  {...profileForm.register('lastName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                {profileForm.formState.errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                {...profileForm.register('email')}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {profileForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={profileForm.formState.isSubmitting || !profileForm.formState.isDirty}
                className="flex items-center gap-2 px-5 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {profileForm.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              {profileSaved && (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle className="h-4 w-4" />Profil mis à jour
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Password form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Changer le Mot de Passe</h3>
          </div>

          {passwordError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />{passwordError}
            </div>
          )}

          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel *</label>
              <input
                {...passwordForm.register('currentPassword')}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe *</label>
              <input
                {...passwordForm.register('newPassword')}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Minimum 8 caractères</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe *</label>
              <input
                {...passwordForm.register('confirmPassword')}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {passwordForm.formState.isSubmitting ? 'Modification...' : 'Modifier le mot de passe'}
              </button>
              {passwordSaved && (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle className="h-4 w-4" />Mot de passe modifié
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Role info */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Votre rôle: {ROLE_LABELS[user?.role || ''] || user?.role}</p>
          <p className="text-blue-600">
            {user?.role === 'ADMIN' && 'Accès complet à toutes les fonctionnalités, gestion des utilisateurs et validation des clôtures.'}
            {user?.role === 'ACCOUNTANT' && 'Accès à la comptabilité complète, validation des clôtures, lecture des rapports.'}
            {user?.role === 'ASSOCIATE' && 'Saisie des opérations courantes, consultation de vos parts et distributions.'}
            {user?.role === 'OBSERVER' && 'Accès en lecture seule à tous les rapports et données du projet.'}
          </p>
        </div>
      </div>
    </div>
  );
}
