import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { livestockService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { ArrowLeft } from 'lucide-react';
import { AxiosError } from 'axios';

const schema = z.object({
  type: z.enum(['BREEDING', 'FATTENING']),
  species: z.string().min(1, 'L\'espèce est requise'),
  breed: z.string().optional(),
  initialCount: z.number().int().positive(),
  currentCount: z.number().int().min(0),
  averageWeight: z.number().positive().optional(),
  unitValue: z.number().positive('La valeur unitaire est requise'),
  acquisitionDate: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export default function LivestockForm() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const isEdit = !!id;

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'BREEDING', acquisitionDate: new Date().toISOString().split('T')[0] },
  });

  useEffect(() => {
    if (isEdit && id) {
      livestockService.getById(id).then(res => {
        const g = res.data;
        setValue('type', g.type);
        setValue('species', g.species);
        setValue('breed', g.breed);
        setValue('initialCount', g.initialCount);
        setValue('currentCount', g.currentCount);
        setValue('averageWeight', g.averageWeight);
        setValue('unitValue', g.unitValue);
        setValue('acquisitionDate', g.acquisitionDate.split('T')[0]);
      });
    }
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      setApiError('');
      if (isEdit) {
        await livestockService.update(id!, data);
      } else {
        await livestockService.create({ ...data, projectId });
      }
      navigate(`/projects/${projectId}/livestock`);
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      setApiError(error.response?.data?.error || 'Erreur');
    }
  };

  const TYPE_LABELS = { BREEDING: 'Élevage (reproducteur)', FATTENING: 'Engraissement' };
  const COMMON_SPECIES = ['Bovin', 'Ovin', 'Caprin', 'Équin', 'Volaille', 'Camelin', 'Porcin', 'Autre'];

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifier le groupe' : 'Nouveau groupe de cheptel'}
        actions={
          <button onClick={() => navigate(`/projects/${projectId}/livestock`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />Retour
          </button>
        }
      />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {apiError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{apiError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select {...register('type')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Espèce *</label>
              <select {...register('species')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="">Sélectionner...</option>
                {COMMON_SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.species && <p className="mt-1 text-xs text-red-600">{errors.species.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Race / Variété</label>
              <input {...register('breed')} placeholder="Ex: Sardi, Timahdite..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'acquisition *</label>
              <input {...register('acquisitionDate')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effectif initial *</label>
              <input {...register('initialCount', { valueAsNumber: true })} type="number" min="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              {errors.initialCount && <p className="mt-1 text-xs text-red-600">{errors.initialCount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effectif actuel *</label>
              <input {...register('currentCount', { valueAsNumber: true })} type="number" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poids moyen (kg)</label>
              <input {...register('averageWeight', { valueAsNumber: true })} type="number" step="0.1" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur unitaire *</label>
              <input {...register('unitValue', { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              {errors.unitValue && <p className="mt-1 text-xs text-red-600">{errors.unitValue.message}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
              {isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
            </button>
            <button type="button" onClick={() => navigate(`/projects/${projectId}/livestock`)} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}
