import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cropService } from '../../services/api';
import { Plot } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { Plus, MapPin, Edit } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  area: z.number().positive('La superficie est requise'),
  areaUnit: z.enum(['HA', 'M2']).default('HA'),
  location: z.string().optional(),
  soilType: z.string().optional(),
  irrigationType: z.enum(['DRIP', 'SPRINKLER', 'FLOOD', 'RAIN_FED']).default('RAIN_FED'),
});

type FormData = z.infer<typeof schema>;

const IRRIGATION_LABELS = { DRIP: 'Goutte-à-goutte', SPRINKLER: 'Aspersion', FLOOD: 'Inondation', RAIN_FED: 'Pluviale' };

export default function PlotsList() {
  const { projectId } = useParams<{ projectId: string }>();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { areaUnit: 'HA', irrigationType: 'RAIN_FED' },
  });

  const load = async () => {
    if (!projectId) return;
    try {
      const res = await cropService.getPlots(projectId);
      setPlots(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const onSubmit = async (data: FormData) => {
    if (editId) {
      await cropService.updatePlot(editId, data);
    } else {
      await cropService.createPlot({ ...data, projectId });
    }
    await load();
    setShowForm(false);
    setEditId(null);
    reset();
  };

  const startEdit = (plot: Plot) => {
    setEditId(plot.id);
    setValue('name', plot.name);
    setValue('area', plot.area);
    setValue('areaUnit', plot.areaUnit);
    setValue('location', plot.location || '');
    setValue('soilType', plot.soilType || '');
    setValue('irrigationType', plot.irrigationType);
    setShowForm(true);
  };

  const totalArea = plots.reduce((sum, p) => sum + p.area, 0);

  return (
    <div>
      <PageHeader
        title="Parcelles"
        description={`Surface totale : ${totalArea.toFixed(2)} ha`}
        actions={
          <button onClick={() => { setEditId(null); reset(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
            <Plus className="h-4 w-4" />Nouvelle parcelle
          </button>
        }
      />

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">{editId ? 'Modifier la parcelle' : 'Nouvelle parcelle'}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input {...register('name')} placeholder="Ex: Parcelle Nord" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Superficie *</label>
              <div className="flex gap-2">
                <input {...register('area', { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="0.00" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                <select {...register('areaUnit')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="HA">Ha</option>
                  <option value="M2">m²</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Irrigation</label>
              <select {...register('irrigationType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                {Object.entries(IRRIGATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
              <input {...register('location')} placeholder="Coordonnées ou description" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de sol</label>
              <input {...register('soilType')} placeholder="Argilo-limoneux, sableux..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
                {isSubmitting ? 'Enregistrement...' : editId ? 'Modifier' : 'Créer'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); reset(); }} className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : plots.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucune parcelle définie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plots.map(plot => (
            <div key={plot.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{plot.name}</h3>
                  <p className="text-sm text-gray-500">{plot.area} {plot.areaUnit === 'HA' ? 'ha' : 'm²'}</p>
                </div>
                <button onClick={() => startEdit(plot)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {plot.location && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{plot.location}</p>}
                {plot.soilType && <p>Sol : {plot.soilType}</p>}
                <p>Irrigation : {IRRIGATION_LABELS[plot.irrigationType]}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className={`text-xs px-2 py-1 rounded-full ${plot.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {plot.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
