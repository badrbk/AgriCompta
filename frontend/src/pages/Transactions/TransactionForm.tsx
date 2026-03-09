import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { transactionService, accountService } from '../../services/api';
import { Account, TRANSACTION_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { ArrowLeft, Upload } from 'lucide-react';
import { AxiosError } from 'axios';

const schema = z.object({
  accountId: z.string().min(1, 'Le compte est requis'),
  date: z.string().min(1, 'La date est requise'),
  type: z.enum(['CAPITAL_ACQUISITION', 'EXPENSE', 'SALE', 'STOCK_IN', 'STOCK_OUT', 'CAPITAL_CONTRIBUTION', 'DISTRIBUTION']),
  amount: z.number({ invalid_type_error: 'Montant invalide' }).positive('Le montant doit être positif'),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  description: z.string().min(1, 'La description est requise'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT']),
  documentReference: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function TransactionForm() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [apiError, setApiError] = useState('');
  const isEdit = !!id;

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethod: 'CASH',
      date: new Date().toISOString().split('T')[0],
      type: 'EXPENSE',
    },
  });

  const selectedType = watch('type');
  const quantity = watch('quantity');
  const amount = watch('amount');

  useEffect(() => {
    accountService.getAll().then(res => setAccounts(res.data));
    if (isEdit && id) {
      transactionService.getById(id).then(res => {
        const tx = res.data;
        setValue('accountId', tx.accountId);
        setValue('date', tx.date.split('T')[0]);
        setValue('type', tx.type);
        setValue('amount', tx.amount);
        setValue('quantity', tx.quantity);
        setValue('unit', tx.unit);
        setValue('description', tx.description);
        setValue('paymentMethod', tx.paymentMethod);
        setValue('documentReference', tx.documentReference);
      });
    }
  }, []);

  // Filtrer les comptes selon le type de transaction
  const filteredAccounts = accounts.filter(acc => {
    if (['SALE'].includes(selectedType)) return acc.type === 'REVENUE';
    if (['EXPENSE'].includes(selectedType)) return acc.type === 'EXPENSE';
    if (['CAPITAL_ACQUISITION'].includes(selectedType)) return acc.type === 'ASSET';
    if (['STOCK_IN', 'STOCK_OUT'].includes(selectedType)) return acc.type === 'STOCK';
    return true;
  });

  const onSubmit = async (data: FormData) => {
    try {
      setApiError('');
      let txId = id;

      if (isEdit && id) {
        await transactionService.update(id, data);
      } else {
        const res = await transactionService.create({ ...data, projectId });
        txId = res.data.id;
      }

      // Upload pièce justificative
      if (file && txId) {
        await transactionService.uploadAttachment(txId, file);
      }

      navigate(`/projects/${projectId}/transactions`);
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      setApiError(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifier la transaction' : 'Nouvelle transaction'}
        actions={
          <button
            onClick={() => navigate(`/projects/${projectId}/transactions`)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {apiError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                {...register('date')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compte comptable *</label>
            <select
              {...register('accountId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              <option value="">Sélectionner un compte</option>
              {filteredAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
              ))}
            </select>
            {errors.accountId && <p className="mt-1 text-xs text-red-600">{errors.accountId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Décrivez cette transaction..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant ({currentProject?.currency || 'MAD'}) *</label>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
              <input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                step="0.001"
                min="0"
                placeholder="Optionnel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
              <input
                {...register('unit')}
                placeholder="kg, L, unité..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
              <select
                {...register('paymentMethod')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Référence document</label>
              <input
                {...register('documentReference')}
                placeholder="N° facture, bon de commande..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Upload pièce justificative */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pièce justificative</label>
            <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
              <Upload className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Cliquer pour ajouter un fichier (PDF, JPG, PNG)'}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer la transaction'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}/transactions`)}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
