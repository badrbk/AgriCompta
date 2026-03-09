// Types partagés de l'application

export type UserRole = 'ADMIN' | 'ASSOCIATE' | 'ACCOUNTANT' | 'OBSERVER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  lastLogin?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export type ProjectStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  status: ProjectStatus;
  currency: string;
  fiscalYearStart: number;
  createdAt: string;
  associates?: Associate[];
  _count?: { transactions: number; assets: number };
}

export interface Associate {
  id: string;
  projectId: string;
  userId: string;
  participationPercentage: number;
  initialContribution: number;
  joinDate: string;
  isActive: boolean;
  user?: Pick<User, 'firstName' | 'lastName' | 'email'>;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  classCode: string;
  type: 'ASSET' | 'STOCK' | 'EXPENSE' | 'REVENUE';
  parentAccountId?: string;
  isActive: boolean;
  children?: Account[];
}

export type TransactionType = 'CAPITAL_ACQUISITION' | 'EXPENSE' | 'SALE' | 'STOCK_IN' | 'STOCK_OUT' | 'CAPITAL_CONTRIBUTION' | 'DISTRIBUTION';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CREDIT';

export interface Transaction {
  id: string;
  projectId: string;
  accountId: string;
  date: string;
  type: TransactionType;
  amount: number;
  quantity?: number;
  unit?: string;
  description: string;
  paymentMethod: PaymentMethod;
  documentReference?: string;
  attachmentUrl?: string;
  paidByAssociateId?: string;
  createdByUserId: string;
  createdAt: string;
  account?: Pick<Account, 'code' | 'name' | 'type'>;
  createdBy?: Pick<User, 'firstName' | 'lastName'>;
}

export interface Asset {
  id: string;
  projectId: string;
  accountId: string;
  name: string;
  category: 'LAND' | 'BUILDING' | 'EQUIPMENT' | 'VEHICLE' | 'LIVESTOCK' | 'INSTALLATION';
  acquisitionDate: string;
  acquisitionValue: number;
  depreciationMethod: 'LINEAR' | 'DECLINING' | 'NONE';
  usefulLifeYears?: number;
  residualValue?: number;
  currentValue: number;
  status: 'ACTIVE' | 'SOLD' | 'SCRAPPED';
  location?: string;
  serialNumber?: string;
  notes?: string;
  depreciations?: Depreciation[];
}

export interface Depreciation {
  id: string;
  assetId: string;
  year: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export interface StockItem {
  id: string;
  projectId: string;
  name: string;
  category: 'HARVEST' | 'LIVESTOCK' | 'CONSUMABLE';
  currentQuantity: number;
  unit: string;
  unitValue: number;
  totalValue: number;
  minimumThreshold?: number;
  location?: string;
  expiryDate?: string;
}

export interface LivestockGroup {
  id: string;
  projectId: string;
  type: 'BREEDING' | 'FATTENING';
  species: string;
  breed?: string;
  initialCount: number;
  currentCount: number;
  averageWeight?: number;
  unitValue: number;
  acquisitionDate: string;
  status: 'ACTIVE' | 'SOLD' | 'CLOSED';
  movements?: LivestockMovement[];
  expenses?: LivestockExpense[];
}

export interface LivestockMovement {
  id: string;
  livestockGroupId: string;
  date: string;
  type: 'BIRTH' | 'PURCHASE' | 'SALE' | 'DEATH' | 'TRANSFER';
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  weight?: number;
  reason?: string;
  notes?: string;
}

export interface LivestockExpense {
  id: string;
  livestockGroupId: string;
  date: string;
  type: 'FEED' | 'VETERINARY' | 'LABOR' | 'OTHER';
  amount: number;
  description: string;
}

export interface Plot {
  id: string;
  projectId: string;
  name: string;
  area: number;
  areaUnit: 'HA' | 'M2';
  location?: string;
  soilType?: string;
  irrigationType: 'DRIP' | 'SPRINKLER' | 'FLOOD' | 'RAIN_FED';
  isActive: boolean;
}

export interface Crop {
  id: string;
  projectId: string;
  plotId: string;
  cropType: string;
  variety?: string;
  plantingDate: string;
  expectedHarvestDate?: string;
  actualHarvestDate?: string;
  areaPlanted: number;
  status: 'PLANNED' | 'PLANTED' | 'GROWING' | 'HARVESTED' | 'FAILED';
  plot?: Pick<Plot, 'name' | 'area' | 'areaUnit'>;
  expenses?: CropExpense[];
  harvests?: Harvest[];
  analytics?: {
    totalExpenses: number;
    totalHarvestKg: number;
    costPerKg?: number;
    yieldPerHa?: number;
  };
}

export interface CropExpense {
  id: string;
  cropId: string;
  expenseType: 'SEED' | 'FERTILIZER' | 'PESTICIDE' | 'IRRIGATION' | 'LABOR' | 'OTHER';
  amount: number;
  date: string;
}

export interface Harvest {
  id: string;
  cropId: string;
  date: string;
  quantity: number;
  unit: 'KG' | 'TON' | 'QUINTAL';
  qualityGrade: 'A' | 'B' | 'C';
  destination: 'STOCK' | 'DIRECT_SALE' | 'LOSS';
  notes?: string;
}

export interface Customer {
  id: string;
  projectId: string;
  name: string;
  type: 'INDIVIDUAL' | 'COMPANY';
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
}

export interface Sale {
  id: string;
  projectId: string;
  customerId?: string;
  saleDate: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod: PaymentMethod;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  customer?: Pick<Customer, 'name' | 'type'>;
  lines?: SaleLine[];
}

export interface SaleLine {
  id: string;
  saleId: string;
  stockItemId?: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface CashAccount {
  id: string;
  projectId: string;
  name: string;
  type: 'CASH' | 'BANK' | 'MOBILE_MONEY';
  balance: number;
  currency: string;
  isActive: boolean;
}

export interface SeasonClosure {
  id: string;
  projectId: string;
  closureDate: string;
  seasonName: string;
  totalRevenue: number;
  totalExpenses: number;
  depreciation: number;
  netProfit: number;
  status: 'DRAFT' | 'VALIDATED' | 'DISTRIBUTED';
  notes?: string;
  distributions?: ProfitDistribution[];
}

export interface ProfitDistribution {
  id: string;
  closureId: string;
  associateId: string;
  sharePercentage: number;
  profitShare: number;
  distributionMethod: 'CASH' | 'REINVEST' | 'MIXED';
  cashAmount?: number;
  reinvestAmount?: number;
  paymentDate?: string;
  paymentStatus: 'PENDING' | 'PAID';
  associate?: {
    user: Pick<User, 'firstName' | 'lastName'>;
  };
}

export interface DashboardData {
  tresorerie: number;
  capitalTotal: number;
  stocksValeur: number;
  chiffreAffairesMois: number;
  chargesMois: number;
  chiffreAffairesTotal: number;
  chargesTotal: number;
  resultatPrevisionnel: number;
  transactionsRecentes: Transaction[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  CAPITAL_ACQUISITION: 'Acquisition d\'immobilisation',
  EXPENSE: 'Charge',
  SALE: 'Vente',
  STOCK_IN: 'Entrée en stock',
  STOCK_OUT: 'Sortie de stock',
  CAPITAL_CONTRIBUTION: 'Apport en capital',
  DISTRIBUTION: 'Distribution',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
  CREDIT: 'Crédit',
};

export const ASSET_CATEGORY_LABELS = {
  LAND: 'Terrain',
  BUILDING: 'Bâtiment',
  EQUIPMENT: 'Équipement',
  VEHICLE: 'Véhicule',
  LIVESTOCK: 'Cheptel',
  INSTALLATION: 'Installation',
};

export const CROP_STATUS_LABELS = {
  PLANNED: 'Planifié',
  PLANTED: 'Planté',
  GROWING: 'En croissance',
  HARVESTED: 'Récolté',
  FAILED: 'Échoué',
};
