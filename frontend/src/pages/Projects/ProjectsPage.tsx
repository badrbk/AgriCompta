import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { projectService } from '../../services/api';
import { useProjectStore } from '../../store/projectStore';
import { Project } from '../../types';
import PageHeader from '../../components/Layout/PageHeader';
import { formatDate, getStatusColor, getStatusLabel } from '../../utils/formatters';
import { Plus, Folder, ArrowRight, Users, Activity } from 'lucide-react';

const projectSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'La date de début est requise'),
  currency: z.string().default('MAD'),
  fiscalYearStart: z.number().int().min(1).max(12).default(1),
});

type ProjectForm = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { setCurrentProject } = useProjectStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { currency: 'MAD', fiscalYearStart: 1 },
  });

  const loadProjects = async () => {
    try {
      const res = await projectService.getAll();
      setProjects(res.data);
    } catch {
      setError('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const onSubmit = async (data: ProjectForm) => {
    try {
      await projectService.create(data);
      await loadProjects();
      setShowForm(false);
      reset();
    } catch {
      setError('Erreur lors de la création du projet');
    }
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    navigate(`/projects/${project.id}/dashboard`);
  };

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Mes Projets Agricoles"
        description="Gérez vos exploitations agricoles et leur comptabilité"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouveau projet
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Formulaire de création */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nouveau projet</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet *</label>
                <input
                  {...register('name')}
                  placeholder="Ex: Ferme El Baraka"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                <input
                  {...register('startDate')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Description du projet..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                <select
                  {...register('currency')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  <option value="MAD">MAD - Dirham marocain</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dollar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Début exercice fiscal</label>
                <select
                  {...register('fiscalYearStart', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  {months.map((month, i) => (
                    <option key={i + 1} value={i + 1}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Création...' : 'Créer le projet'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); }}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des projets */}
      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet</h3>
          <p className="text-gray-500 text-sm mb-4">Créez votre premier projet agricole pour commencer</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
          >
            Créer un projet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
              onClick={() => handleSelectProject(project)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Folder className="h-5 w-5 text-green-700" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-1">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{project.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Depuis le {formatDate(project.startDate)}
                  </span>
                  {project.associates && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project.associates.length} associé(s)
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-500">{project.currency}</span>
                  <span className="flex items-center gap-1 text-sm text-green-700 font-medium group-hover:gap-2 transition-all">
                    Ouvrir <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
