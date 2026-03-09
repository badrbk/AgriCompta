import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { closureService } from '../../services/api';
import PageHeader from '../../components/Layout/PageHeader';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

const schema = z.object({
  seasonName: z.string().min(1, 'Le nom de la saison est requis'),
  closureDate: z.string().min(1, 'La date de clôture est requise'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ClosureForm() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      seasonName: `Saison ${new Date().getFullYear()}`,
      closureDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: FormData) => {
    const res = await closureService.create({ ...data, projectId });
    navigate(`/projects/${projectId}/closures/${res.data.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Nouvelle Clôture de Saison"
        description="Arrêter les comptes et calculer le résultat de la saison"
      />

      <div className="max-w-2xl space-y-6">
        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Attention avant de créer une clôture</p>
            <ul className="space-y-1 list-disc list-inside text-yellow-700">
              <li>Vérifiez que toutes les transactions de la saison ont été enregistrées</li>
              <li>Contrôlez les valeurs des stocks et immobilisations</li>
              <li>La clôture calcule automatiquement le résultat net (produits - charges - amortissements)</li>
              <li>Une fois validée, la clôture ne pourra plus être modifiée</li>
            </ul>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-5">Informations de la clôture</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la saison *</label>
              <input
                {...register('seasonName')}
                placeholder="Ex: Saison 2024-2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {errors.seasonName && <p className="mt-1 text-xs text-red-600">{errors.seasonName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de clôture *</label>
              <input
                {...register('closureDate')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {errors.closureDate && <p className="mt-1 text-xs text-red-600">{errors.closureDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Observations sur la saison..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Calcul en cours...' : 'Créer la clôture'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />Annuler
              </button>
            </div>
          </form>
        </div>

        {/* Explanation */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-sm text-blue-800">
          <p className="font-semibold mb-2">Comment fonctionne la clôture ?</p>
          <ol className="space-y-1 list-decimal list-inside text-blue-700">
            <li>La clôture calcule automatiquement les produits, charges et amortissements</li>
            <li>Le résultat net = Produits - Charges - Amortissements</li>
            <li>Un administrateur ou comptable peut ensuite valider la clôture</li>
            <li>La validation calcule la part de bénéfice de chaque associé selon leur % de participation</li>
            <li>Enfin, la distribution permet de renseigner le mode de versement (cash, réinvestissement, mixte)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
