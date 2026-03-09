import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { assetService, accountService } from '../../services/api';
import { Account, ASSET_CATEGORY_LABELS } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { ArrowLeft } from 'lucide-react';
import { AxiosError } from 'axios';

const schema = z.object({
  accountId: z.string().min(1, 'Le compte est requis'),
  name: z.string().min(1, 'Le nom est requis'),
  category: z.enum(['LAND', 'BUILDING', 'EQUIPMENT', 'VEHICLE', 'LIVESTOCK', 'INSTALLATION']),
  acquisitionDate: z.string().min(1),
  acquisitionValue: z.number().positive('La valeur doit être positive'),
  currentValue: z.number().min(0),
  depreciationMethod: z.enum(['LINEAR', 'DECLINING', 'NONE']),
  usefulLifeYears: z.number().int().positive().optional(),
  residualValue: z.number().min(0).optional(),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AssetForm() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [apiError, setApiError] = useState('');
  const isEdit = !!id;

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      depreciationMethod: 'LINEAR',
      acquisitionDate: new Date().toISOString().split('T')[0],
      category: 'EQUIPMENT',
    },
  });

  const depreciationMethod = watch('depreciationMethod');
  const acquisitionValue = watch('acquisitionValue');

  useEffect(() => {
    accountService.getAll().then(res => setAccounts(res.data.filter((a: Account) => a.type === 'ASSET')));
    if (isEdit && id) {
      assetService.getById(id).then(res => {
        const a = res.data;
        Object.keys(a).forEach(key => {
          if (key === 'acquisitionDate') {
            setValue('acquisitionDate', a.acquisitionDate.split('T')[0]);
          } else {
            setValue(key as keyof FormData, a[key]);
          }
        });
      });
    }
  }, []);

  // Auto-remplir la valeur actuelle si c'est la première création
  useEffect(() => {
    if (!isEdit && acquisitionValue) {
      setValue('currentValue', acquisitionValue);
    }
  }, [acquisitionValue, isEdit]);

  const onSubmit = async (data: FormData) => {
    try {
      setApiError('');
      if (isEdit) {
        await assetService.update(id!, data);
      } else {
        await assetService.create({ ...data, projectId });
      }
      navigate(`/projects/${projectId}/assets`);
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      setApiError(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifier l\'immobilisation' : 'Nouvelle immobilisation'}
        actions={
          <button onClick={() => navigate(`/projects/${projectId}/assets`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />Retour
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {apiError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{apiError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input {...register('name')} placeholder="Ex: Tracteur John Deere" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <select {...register('category')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compte comptable *</label>
              <select {...register('accountId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="">Sélectionner...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
              {errors.accountId && <p className="mt-1 text-xs text-red-600">{errors.accountId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'acquisition *</label>
              <input {...register('acquisitionDate')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur d'acquisition *</label>
              <input {...register('acquisitionValue', { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              {errors.acquisitionValue && <p className="mt-1 text-xs text-red-600">{errors.acquisitionValue.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur actuelle *</label>
              <input {...register('currentValue', { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Amortissement</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Méthode</label>
                <select {...register('depreciationMethod')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                  <option value="LINEAR">Linéaire</option>
                  <option value="DECLINING">Dégressif</option>
                  <option value="NONE">Aucun</option>
                </select>
              </div>
              {depreciationMethod !== 'NONE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée (années)</label>
                    <input {...register('usefulLifeYears', { valueAsNumber: true })} type="number" min="1" placeholder="Ex: 10" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valeur résiduelle</label>
                    <input {...register('residualValue', { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
              <input {...register('location')} placeholder="Hangar principal..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° de série</label>
              <input {...register('serialNumber')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
              {isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
            </button>
            <button type="button" onClick={() => navigate(`/projects/${projectId}/assets`)} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
