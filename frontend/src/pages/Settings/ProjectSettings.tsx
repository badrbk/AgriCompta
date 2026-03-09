import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { projectService } from '../../services/api';
import { useProjectStore } from '../../store/projectStore';
import PageHeader from '../../components/Layout/PageHeader';
import { Save, CheckCircle } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Le nom du projet est requis'),
  description: z.string().optional(),
  currency: z.string().min(1, 'La devise est requise'),
  fiscalYearStart: z.coerce.number().min(1).max(12),
});

type FormData = z.infer<typeof schema>;

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

const CURRENCIES = [
  { code: 'MAD', label: 'Dirham marocain (MAD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'USD', label: 'Dollar US (USD)' },
  { code: 'XOF', label: 'Franc CFA (XOF)' },
  { code: 'DZD', label: 'Dinar algérien (DZD)' },
  { code: 'TND', label: 'Dinar tunisien (TND)' },
];

export default function ProjectSettings() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, setCurrentProject } = useProjectStore();
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      currency: 'MAD',
      fiscalYearStart: 1,
    },
  });

  useEffect(() => {
    if (!projectId) return;
    projectService.getById(projectId).then(res => {
      const p = res.data;
      reset({
        name: p.name,
        description: p.description || '',
        currency: p.currency,
        fiscalYearStart: p.fiscalYearStart,
      });
    });
  }, [projectId]);

  const onSubmit = async (data: FormData) => {
    if (!projectId) return;
    const res = await projectService.update(projectId, data);
    if (currentProject) {
      setCurrentProject({ ...currentProject, ...res.data });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <PageHeader
        title="Paramètres du Projet"
        description="Configuration générale du projet agricole"
      />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* General Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Informations Générales</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet *</label>
                <input
                  {...register('name')}
                  placeholder="Ex: Ferme Agricole Atlas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Description du projet, localisation, objectifs..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Financial Settings */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Paramètres Financiers</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                <select
                  {...register('currency')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Début de l'exercice fiscal</label>
                <select
                  {...register('fiscalYearStart')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {saved && (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="h-4 w-4" />Paramètres enregistrés
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
