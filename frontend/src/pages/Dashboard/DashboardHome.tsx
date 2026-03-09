import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../../services/api';
import { useProjectStore } from '../../store/projectStore';
import { DashboardData, Transaction } from '../../types';
import StatCard from '../../components/Cards/StatCard';
import PageHeader from '../../components/Layout/PageHeader';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Wallet, TrendingUp, TrendingDown, Package, Building2,
  ArrowLeftRight, Plus
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subMonths, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#16a34a', '#dc2626', '#2563eb', '#d97706', '#7c3aed'];

export default function DashboardHome() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject } = useProjectStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    const loadData = async () => {
      try {
        const [dashRes, projectRes] = await Promise.all([
          projectService.getDashboard(projectId),
          currentProject?.id !== projectId ? projectService.getById(projectId) : Promise.resolve(null),
        ]);
        setData(dashRes.data);
        if (projectRes) setCurrentProject(projectRes.data);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  if (!data) return null;

  // Données pour le graphique en camembert des charges
  const expenseData = [
    { name: 'Charges', value: data.chargesTotal },
    { name: 'Bénéfice', value: Math.max(0, data.resultatPrevisionnel) },
  ].filter(d => d.value > 0);

  // Simulation de données mensuelles pour le graphique
  const monthlyData = Array.from({ length: 6 }, (_, i) => ({
    month: format(subMonths(new Date(), 5 - i), 'MMM', { locale: fr }),
    chiffreAffaires: Math.random() * data.chiffreAffairesTotal / 6,
    charges: Math.random() * data.chargesTotal / 6,
  }));

  const TRANSACTION_TYPE_FR: Record<string, string> = {
    EXPENSE: 'Charge',
    SALE: 'Vente',
    CAPITAL_ACQUISITION: 'Immobilisation',
    STOCK_IN: 'Entrée stock',
    STOCK_OUT: 'Sortie stock',
    CAPITAL_CONTRIBUTION: 'Apport capital',
    DISTRIBUTION: 'Distribution',
  };

  return (
    <div>
      <PageHeader
        title={`Tableau de bord - ${currentProject?.name || ''}`}
        description="Vue d'ensemble de votre exploitation agricole"
        actions={
          <button
            onClick={() => navigate(`/projects/${projectId}/transactions/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
          >
            <Plus className="h-4 w-4" />
            Nouvelle transaction
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Trésorerie disponible"
          value={formatCurrency(data.tresorerie, currentProject?.currency)}
          icon={Wallet}
          variant={data.tresorerie >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          title="Capital immobilisé"
          value={formatCurrency(data.capitalTotal, currentProject?.currency)}
          icon={Building2}
          variant="info"
        />
        <StatCard
          title="Valeur des stocks"
          value={formatCurrency(data.stocksValeur, currentProject?.currency)}
          icon={Package}
          variant="default"
        />
        <StatCard
          title="Résultat prévisionnel"
          value={formatCurrency(data.resultatPrevisionnel, currentProject?.currency)}
          icon={data.resultatPrevisionnel >= 0 ? TrendingUp : TrendingDown}
          variant={data.resultatPrevisionnel >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Statistiques du mois */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-600 mb-1">Chiffre d'affaires ce mois</p>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(data.chiffreAffairesMois, currentProject?.currency)}</p>
          <p className="text-xs text-gray-500 mt-1">Total saison : {formatCurrency(data.chiffreAffairesTotal, currentProject?.currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-600 mb-1">Charges ce mois</p>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(data.chargesMois, currentProject?.currency)}</p>
          <p className="text-xs text-gray-500 mt-1">Total saison : {formatCurrency(data.chargesTotal, currentProject?.currency)}</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Évolution CA/Charges */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Évolution des 6 derniers mois</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCharges" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value, currentProject?.currency)} />
              <Area type="monotone" dataKey="chiffreAffaires" name="CA" stroke="#16a34a" fill="url(#colorCA)" strokeWidth={2} />
              <Area type="monotone" dataKey="charges" name="Charges" stroke="#dc2626" fill="url(#colorCharges)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition résultat</h3>
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={expenseData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={false}>
                  {expenseData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                <Tooltip formatter={(value: number) => formatCurrency(value, currentProject?.currency)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-gray-500" />
            Transactions récentes
          </h3>
          <button
            onClick={() => navigate(`/projects/${projectId}/transactions`)}
            className="text-sm text-green-700 hover:underline font-medium"
          >
            Voir tout
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {data.transactionsRecentes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Aucune transaction enregistrée
            </div>
          ) : (
            data.transactionsRecentes.map((tx: Transaction) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    ['SALE', 'CAPITAL_CONTRIBUTION'].includes(tx.type) ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-500">
                      {TRANSACTION_TYPE_FR[tx.type] || tx.type} • {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  ['SALE', 'CAPITAL_CONTRIBUTION'].includes(tx.type) ? 'text-green-700' : 'text-red-600'
                }`}>
                  {['SALE', 'CAPITAL_CONTRIBUTION'].includes(tx.type) ? '+' : '-'}
                  {formatCurrency(tx.amount, currentProject?.currency)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
