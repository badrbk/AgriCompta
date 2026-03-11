import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  transactionService, accountService,
  associateService, treasuryService,
} from '../../services/api';
import { Account, TRANSACTION_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { useProjectStore } from '../../store/projectStore';
import { ArrowLeft, Upload, Info } from 'lucide-react';
import { AxiosError } from 'axios';

// Types qui génèrent un mouvement de trésorerie entrant
const TREASURY_IN_TYPES = ['SALE', 'CAPITAL_CONTRIBUTION'];
// Types qui impliquent un associé
const ASSOCIATE_TYPES = ['CAPITAL_CONTRIBUTION', 'DISTRIBUTION'];

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
  cashAccountId: z.string().optional(),
  paidByAssociateId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Associate {
  id: string;
  userId: string;
  participationPercentage: number;
  isActive: boolean;
  user: { firstName: string; lastName: string; email: string };
}

interface CashAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export default function TransactionForm() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
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
  const cashAccountId = watch('cashAccountId');
  const amount = watch('amount');

  const showAssociateField = ASSOCIATE_TYPES.includes(selectedType);
  const showTreasuryField = true; // Toujours disponible pour lier à un compte de trésorerie

  useEffect(() => {
    // Charger comptes comptables
    accountService.getAll().then(res => setAccounts(res.data));

    // Charger associés et comptes de trésorerie
    if (projectId) {
      associateService.getAll(projectId)
        .then(res => setAssociates((res.data as Associate[]).filter(a => a.isActive)));
      treasuryService.getAccounts(projectId)
        .then(res => setCashAccounts(res.data.accounts));
    }

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
        setValue('paidByAssociateId', tx.paidByAssociateId ?? '');
        // cashFlows linked account
        if (tx.cashFlows?.length > 0) {
          setValue('cashAccountId', tx.cashFlows[0].cashAccountId);
        }
      });
    }
  }, []);

  // Filtrer les comptes comptables selon le type de transaction
  const filteredAccounts = accounts.filter(acc => {
    if (['SALE'].includes(selectedType)) return acc.type === 'REVENUE';
    if (['EXPENSE'].includes(selectedType)) return acc.type === 'EXPENSE';
    if (['CAPITAL_ACQUISITION'].includes(selectedType)) return acc.type === 'ASSET';
    if (['STOCK_IN', 'STOCK_OUT'].includes(selectedType)) return acc.type === 'STOCK';
    return true;
  });

  // Solde prévu après opération sur le compte de trésorerie sélectionné
  const selectedCashAccount = cashAccounts.find(a => a.id === cashAccountId);
  const projectedBalance = selectedCashAccount && amount > 0
    ? TREASURY_IN_TYPES.includes(selectedType)
      ? selectedCashAccount.balance + amount
      : selectedCashAccount.balance - amount
    : null;

  const onSubmit = async (data: FormData) => {
    try {
      setApiError('');
      // Nettoyer les champs vides
      const payload = {
        ...data,
        projectId,
        cashAccountId: data.cashAccountId || undefined,
        paidByAssociateId: data.paidByAssociateId || undefined,
      };

      let txId = id;
      if (isEdit && id) {
        await transactionService.update(id, payload);
      } else {
        const res = await transactionService.create(payload);
        txId = res.data.id;
      }

      if (file && txId) {
        await transactionService.uploadAttachment(txId, file);
      }

      navigate(`/projects/${projectId}/transactions`);
    } catch (err) {
      const error = err as AxiosError<{ error: string; message: string }>;
      setApiError(error.response?.data?.message || error.response?.data?.error || 'Erreur lors de l\'enregistrement');
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

          {/* Date + Type */}
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

          {/* Banderole d'aide pour apport associé */}
          {selectedType === 'CAPITAL_CONTRIBUTION' && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Pour enregistrer l'apport d'un associé : sélectionnez l'associé concerné
                et le compte de trésorerie qui reçoit les fonds. Le solde sera mis à jour automatiquement.
              </span>
            </div>
          )}

          {/* Compte comptable */}
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

          {/* Associé apporteur — visible pour CAPITAL_CONTRIBUTION et DISTRIBUTION */}
          {showAssociateField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {selectedType === 'CAPITAL_CONTRIBUTION' ? 'Associé apporteur' : 'Associé concerné'}
              </label>
              {associates.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Aucun associé actif trouvé pour ce projet.
                </p>
              ) : (
                <select
                  {...register('paidByAssociateId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                >
                  <option value="">— Sélectionner un associé (optionnel) —</option>
                  {associates.map(a => (
                    <option key={a.userId} value={a.userId}>
                      {a.user.firstName} {a.user.lastName} ({a.participationPercentage}%)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Compte de trésorerie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compte de trésorerie
              <span className="ml-1 text-xs font-normal text-gray-400">(optionnel — met à jour le solde automatiquement)</span>
            </label>
            {cashAccounts.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Aucun compte de trésorerie — créez-en un dans la section Trésorerie.
              </p>
            ) : (
              <select
                {...register('cashAccountId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
              >
                <option value="">— Ne pas lier à la trésorerie —</option>
                {cashAccounts.map(ca => (
                  <option key={ca.id} value={ca.id}>
                    {ca.name} — solde : {new Intl.NumberFormat('fr-MA').format(ca.balance)} DH
                  </option>
                ))}
              </select>
            )}
            {/* Aperçu du solde après */}
            {projectedBalance !== null && (
              <p className={`mt-1 text-xs font-medium ${projectedBalance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                Solde après opération : {new Intl.NumberFormat('fr-MA').format(projectedBalance)} DH
                {projectedBalance < 0 && ' ⚠️ Solde insuffisant'}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder={
                selectedType === 'CAPITAL_CONTRIBUTION'
                  ? 'Ex: Apport en capital — tranche 1, Versement compte agricole...'
                  : 'Décrivez cette transaction...'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>

          {/* Montant + Quantité + Unité */}
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

          {/* Mode paiement + Référence */}
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

          {/* Pièce justificative */}
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

          {/* Boutons */}
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
