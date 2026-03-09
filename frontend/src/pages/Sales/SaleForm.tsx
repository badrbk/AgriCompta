import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { saleService } from '../../services/api';
import { Customer } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { formatCurrency } from '../../utils/formatters';
import { AxiosError } from 'axios';

const schema = z.object({
  customerId: z.string().optional(),
  saleDate: z.string().min(1),
  paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID']).default('UNPAID'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT']).default('CASH'),
  paidAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productName: z.string().min(1, 'Le produit est requis'),
    quantity: z.number().positive('La quantité est requise'),
    unit: z.string().min(1, 'L\'unité est requise'),
    unitPrice: z.number().positive('Le prix est requis'),
  })).min(1, 'Au moins une ligne est requise'),
});

type FormData = z.infer<typeof schema>;

export default function SaleForm() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [apiError, setApiError] = useState('');
  const isEdit = !!id;

  const { register, handleSubmit, watch, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      saleDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'UNPAID',
      paymentMethod: 'CASH',
      paidAmount: 0,
      lines: [{ productName: '', quantity: 1, unit: 'kg', unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');

  const totalAmount = lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0);

  useEffect(() => {
    if (projectId) saleService.getCustomers(projectId).then(res => setCustomers(res.data));
  }, [projectId]);

  const onSubmit = async (data: FormData) => {
    try {
      setApiError('');
      if (isEdit) {
        await saleService.update(id!, { paymentStatus: data.paymentStatus, paidAmount: data.paidAmount, notes: data.notes });
      } else {
        await saleService.create({ ...data, projectId });
      }
      navigate(`/projects/${projectId}/sales`);
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      setApiError(error.response?.data?.error || 'Erreur');
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifier la vente' : 'Nouvelle vente'}
        actions={
          <button onClick={() => navigate(`/projects/${projectId}/sales`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />Retour
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {apiError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{apiError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de vente *</label>
              <input {...register('saleDate')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select {...register('customerId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="">Client comptant</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut paiement</label>
              <select {...register('paymentStatus')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="PAID">Payé</option>
                <option value="PARTIAL">Partiel</option>
                <option value="UNPAID">Impayé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
              <select {...register('paymentMethod')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement</option>
                <option value="CHECK">Chèque</option>
                <option value="CREDIT">Crédit</option>
              </select>
            </div>
          </div>

          {/* Lignes de vente */}
          {!isEdit && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Articles vendus</h3>
                <button type="button" onClick={() => append({ productName: '', quantity: 1, unit: 'kg', unitPrice: 0 })}
                  className="flex items-center gap-1 text-sm text-green-700 hover:text-green-800">
                  <Plus className="h-4 w-4" />Ajouter
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-4">
                      <label className="block text-xs text-gray-500 mb-1">Produit *</label>
                      <input {...register(`lines.${index}.productName`)} placeholder="Nom du produit" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Qté *</label>
                      <input {...register(`lines.${index}.quantity`, { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Unité *</label>
                      <input {...register(`lines.${index}.unit`)} placeholder="kg" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-500 mb-1">Prix unit.</label>
                      <input {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                    <div className="col-span-1">
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-end mt-3">
                <div className="bg-green-50 px-4 py-2 rounded-lg">
                  <span className="text-sm text-gray-600">Total : </span>
                  <span className="font-bold text-green-700">{formatCurrency(totalAmount, currentProject?.currency)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant payé</label>
              <input {...register('paidAmount', { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input {...register('notes')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50">
              {isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer la vente'}
            </button>
            <button type="button" onClick={() => navigate(`/projects/${projectId}/sales`)} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}
