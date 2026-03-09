import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cropService } from '../../services/api';
import { Plot } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  plotId: z.string().min(1, 'La parcelle est requise'),
  cropType: z.string().min(1, 'Le type de culture est requis'),
  variety: z.string().optional(),
  plantingDate: z.string().min(1),
  expectedHarvestDate: z.string().optional(),
  areaPlanted: z.number().positive('La superficie est requise'),
  status: z.enum(['PLANNED', 'PLANTED', 'GROWING', 'HARVESTED', 'FAILED']).default('PLANNED'),
});

type FormData = z.infer<typeof schema>;

const CROP_TYPES = ['Blé', 'Orge', 'Maïs', 'Tomate', 'Pomme de terre', 'Oignon', 'Carotte', 'Pastèque', 'Melon', 'Olivier', 'Agrumes', 'Autre'];

export default function CropForm() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const [plots, setPlots] = useState<Plot[]>([]);
  const isEdit = !!id;

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'PLANNED', plantingDate: new Date().toISOString().split('T')[0] },
  });

  useEffect(() => {
    if (projectId) cropService.getPlots(projectId).then(res => setPlots(res.data));
    if (isEdit && id) {
      cropService.getById(id).then(res => {
        const c = res.data;
        setValue('plotId', c.plotId);
        setValue('cropType', c.cropType);
        setValue('variety', c.variety || '');
        setValue('plantingDate', c.plantingDate.split('T')[0]);
        setValue('expectedHarvestDate', c.expectedHarvestDate?.split('T')[0] || '');
        setValue('areaPlanted', c.areaPlanted);
        setValue('status', c.status);
      });
    }
  }, []);

  const onSubmit = async (data: FormData) => {
    if (isEdit) {
      await cropService.update(id!, data);
    } else {
      await cropService.create({ ...data, projectId });
    }
    navigate(`/projects/${projectId}/crops`);
  };

  const STATUS_LABELS = { PLANNED: 'Planifié', PLANTED: 'Planté', GROWING: 'En croissance', HARVESTED: 'Récolté', FAILED: 'Échoué' };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifier la culture' : 'Nouvelle culture'}
        actions={
          <button onClick={() => navigate(`/projects/${projectId}/crops`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />Retour
          </button>
        }
      />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parcelle *</label>
              <select {...register('plotId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="">Sélectionner...</option>
                {plots.map(p => <option key={p.id} value={p.id}>{p.name} ({p.area} {p.areaUnit})</option>)}
              </select>
              {errors.plotId && <p className="mt-1 text-xs text-red-600">{errors.plotId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de culture *</label>
              <select {...register('cropType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="">Sélectionner...</option>
                {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.cropType && <p className="mt-1 text-xs text-red-600">{errors.cropType.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variété</label>
              <input {...register('variety')} placeholder="Ex: Karim, Marzak..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Superficie plantée (ha) *</label>
              <input {...register('areaPlanted', { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              {errors.areaPlanted && <p className="mt-1 text-xs text-red-600">{errors.areaPlanted.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de plantation *</label>
              <input {...register('plantingDate')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de récolte prévue</label>
              <input {...register('expectedHarvestDate')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select {...register('status')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
              {isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
            </button>
            <button type="button" onClick={() => navigate(`/projects/${projectId}/crops`)} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}
