import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatCurrency = (amount: number, currency: string = 'MAD'): string => {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: currency === 'MAD' ? 'MAD' : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('MAD', 'DH');
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatDate = (dateStr: string | Date, fmt: string = 'dd/MM/yyyy'): string => {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, fmt, { locale: fr });
  } catch {
    return '-';
  }
};

export const formatDateTime = (dateStr: string | Date): string => {
  return formatDate(dateStr, 'dd/MM/yyyy HH:mm');
};

export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${formatNumber(value, decimals)}%`;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    ARCHIVED: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    PARTIAL: 'bg-orange-100 text-orange-800',
    UNPAID: 'bg-red-100 text-red-800',
    DRAFT: 'bg-blue-100 text-blue-800',
    VALIDATED: 'bg-green-100 text-green-800',
    DISTRIBUTED: 'bg-purple-100 text-purple-800',
    PLANNED: 'bg-blue-100 text-blue-800',
    PLANTED: 'bg-cyan-100 text-cyan-800',
    GROWING: 'bg-green-100 text-green-800',
    HARVESTED: 'bg-amber-100 text-amber-800',
    FAILED: 'bg-red-100 text-red-800',
    SOLD: 'bg-gray-100 text-gray-800',
    SCRAPPED: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    ACTIVE: 'Actif',
    CLOSED: 'Fermé',
    ARCHIVED: 'Archivé',
    PAID: 'Payé',
    PARTIAL: 'Partiel',
    UNPAID: 'Impayé',
    DRAFT: 'Brouillon',
    VALIDATED: 'Validé',
    DISTRIBUTED: 'Distribué',
    PLANNED: 'Planifié',
    PLANTED: 'Planté',
    GROWING: 'En croissance',
    HARVESTED: 'Récolté',
    FAILED: 'Échoué',
    SOLD: 'Vendu',
    SCRAPPED: 'Mis au rebut',
    PENDING: 'En attente',
    BREEDING: 'Élevage',
    FATTENING: 'Engraissement',
  };
  return labels[status] || status;
};
