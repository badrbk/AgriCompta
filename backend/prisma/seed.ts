/**
 * Seed Script - Application de Gestion Comptable Agricole
 * Insère des données de démonstration complètes pour tester l'application
 *
 * Exécuter avec: npx ts-node prisma/seed.ts
 * Ou via: npm run seed
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed...');

  // ============================================================
  // 1. UTILISATEURS
  // ============================================================
  console.log('👤 Création des utilisateurs...');

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const passwordHashUser = await bcrypt.hash('User123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@agri.com' },
    update: {},
    create: {
      email: 'admin@agri.com',
      passwordHash,
      firstName: 'Ahmed',
      lastName: 'Benali',
      role: 'ADMIN',
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'comptable@agri.com' },
    update: {},
    create: {
      email: 'comptable@agri.com',
      passwordHash: passwordHashUser,
      firstName: 'Fatima',
      lastName: 'Zahra',
      role: 'ACCOUNTANT',
    },
  });

  const associate1 = await prisma.user.upsert({
    where: { email: 'associe1@agri.com' },
    update: {},
    create: {
      email: 'associe1@agri.com',
      passwordHash: passwordHashUser,
      firstName: 'Mohamed',
      lastName: 'Tazi',
      role: 'ASSOCIATE',
    },
  });

  const associate2 = await prisma.user.upsert({
    where: { email: 'associe2@agri.com' },
    update: {},
    create: {
      email: 'associe2@agri.com',
      passwordHash: passwordHashUser,
      firstName: 'Khadija',
      lastName: 'Rahimi',
      role: 'ASSOCIATE',
    },
  });

  const observer = await prisma.user.upsert({
    where: { email: 'observateur@agri.com' },
    update: {},
    create: {
      email: 'observateur@agri.com',
      passwordHash: passwordHashUser,
      firstName: 'Youssef',
      lastName: 'Mansouri',
      role: 'OBSERVER',
    },
  });

  console.log('✅ 5 utilisateurs créés');

  // ============================================================
  // 2. PROJET
  // ============================================================
  console.log('📁 Création du projet...');

  const project = await prisma.project.upsert({
    where: { id: 'demo-project-001' },
    update: {},
    create: {
      id: 'demo-project-001',
      name: 'Ferme Atlas - Saison 2024',
      description: 'Exploitation agricole collective sur les versants de l\'Atlas. Productions: blé, maraîchage, arboriculture et élevage ovin.',
      startDate: new Date('2024-01-01'),
      status: 'ACTIVE',
      currency: 'MAD',
      fiscalYearStart: 1,
    },
  });

  console.log('✅ Projet créé:', project.name);

  // ============================================================
  // 3. ASSOCIÉS
  // ============================================================
  console.log('🤝 Création des associés...');

  const assoc1 = await prisma.associate.upsert({
    where: { projectId_userId: { projectId: project.id, userId: admin.id } },
    update: {},
    create: {
      projectId: project.id,
      userId: admin.id,
      participationPercentage: 40,
      initialContribution: 200000,
      joinDate: new Date('2024-01-01'),
      isActive: true,
    },
  });

  const assoc2 = await prisma.associate.upsert({
    where: { projectId_userId: { projectId: project.id, userId: associate1.id } },
    update: {},
    create: {
      projectId: project.id,
      userId: associate1.id,
      participationPercentage: 35,
      initialContribution: 175000,
      joinDate: new Date('2024-01-01'),
      isActive: true,
    },
  });

  const assoc3 = await prisma.associate.upsert({
    where: { projectId_userId: { projectId: project.id, userId: associate2.id } },
    update: {},
    create: {
      projectId: project.id,
      userId: associate2.id,
      participationPercentage: 25,
      initialContribution: 125000,
      joinDate: new Date('2024-01-15'),
      isActive: true,
    },
  });

  console.log('✅ 3 associés créés (total: 100%)');

  // ============================================================
  // 4. PLAN COMPTABLE (marocain agricole simplifié)
  // ============================================================
  console.log('📋 Création du plan comptable...');

  const accounts = [
    // CLASSE 1 - FINANCEMENT PERMANENT (Capital & Réserves)
    { code: '11', name: 'Capitaux propres', classCode: '1', type: 'ASSET' as const },
    { code: '1111', name: 'Capital social', classCode: '1', type: 'ASSET' as const },
    { code: '1121', name: 'Réserves légales', classCode: '1', type: 'ASSET' as const },
    { code: '1181', name: 'Report à nouveau', classCode: '1', type: 'ASSET' as const },
    { code: '119', name: 'Résultats nets en instance d\'affectation', classCode: '1', type: 'ASSET' as const },
    { code: '14', name: 'Dettes de financement', classCode: '1', type: 'ASSET' as const },
    { code: '1481', name: 'Emprunts auprès d\'établissements de crédit', classCode: '1', type: 'ASSET' as const },

    // CLASSE 4 - COMPTES DE TIERS
    { code: '44', name: 'Comptes courants des associés', classCode: '4', type: 'ASSET' as const },
    { code: '4461', name: 'Comptes courants associés - Apports en capital', classCode: '4', type: 'ASSET' as const },
    { code: '4462', name: 'Comptes courants associés - Retraits', classCode: '4', type: 'ASSET' as const },
    { code: '441', name: 'Fournisseurs', classCode: '4', type: 'ASSET' as const },
    { code: '442', name: 'Clients', classCode: '4', type: 'ASSET' as const },

    // CLASSE 2 - IMMOBILISATIONS
    { code: '20', name: 'Immobilisations en non-valeurs', classCode: '2', type: 'ASSET' as const },
    { code: '21', name: 'Immobilisations incorporelles', classCode: '2', type: 'ASSET' as const },
    { code: '22', name: 'Terrains', classCode: '2', type: 'ASSET' as const },
    { code: '23', name: 'Constructions', classCode: '2', type: 'ASSET' as const },
    { code: '232', name: 'Bâtiments agricoles', classCode: '2', type: 'ASSET' as const },
    { code: '24', name: 'Installations techniques', classCode: '2', type: 'ASSET' as const },
    { code: '241', name: 'Systèmes d\'irrigation', classCode: '2', type: 'ASSET' as const },
    { code: '242', name: 'Serres et abris', classCode: '2', type: 'ASSET' as const },
    { code: '25', name: 'Matériel et outillage', classCode: '2', type: 'ASSET' as const },
    { code: '251', name: 'Matériel agricole', classCode: '2', type: 'ASSET' as const },
    { code: '2511', name: 'Tracteurs', classCode: '2', type: 'ASSET' as const },
    { code: '2512', name: 'Moissonneuses-batteuses', classCode: '2', type: 'ASSET' as const },
    { code: '2513', name: 'Outils et équipements', classCode: '2', type: 'ASSET' as const },
    { code: '26', name: 'Matériel de transport', classCode: '2', type: 'ASSET' as const },
    { code: '261', name: 'Véhicules agricoles', classCode: '2', type: 'ASSET' as const },
    { code: '27', name: 'Cheptel (immobilisé)', classCode: '2', type: 'ASSET' as const },
    { code: '271', name: 'Animaux reproducteurs', classCode: '2', type: 'ASSET' as const },
    { code: '28', name: 'Amortissements des immobilisations', classCode: '2', type: 'ASSET' as const },

    // CLASSE 3 - STOCKS
    { code: '31', name: 'Stocks de semences', classCode: '3', type: 'STOCK' as const },
    { code: '32', name: 'Stocks de produits phytosanitaires', classCode: '3', type: 'STOCK' as const },
    { code: '33', name: 'Stocks d\'engrais', classCode: '3', type: 'STOCK' as const },
    { code: '35', name: 'Stocks de récoltes', classCode: '3', type: 'STOCK' as const },
    { code: '351', name: 'Stocks de céréales', classCode: '3', type: 'STOCK' as const },
    { code: '352', name: 'Stocks de légumes', classCode: '3', type: 'STOCK' as const },
    { code: '353', name: 'Stocks de fruits', classCode: '3', type: 'STOCK' as const },
    { code: '36', name: 'Stocks animaux (engraissement)', classCode: '3', type: 'STOCK' as const },
    { code: '37', name: 'Stocks d\'aliments bétail', classCode: '3', type: 'STOCK' as const },
    { code: '38', name: 'Autres stocks et approvisionnements', classCode: '3', type: 'STOCK' as const },

    // CLASSE 6 - CHARGES
    { code: '61', name: 'Charges d\'exploitation agricole', classCode: '6', type: 'EXPENSE' as const },
    { code: '611', name: 'Achats de semences et plants', classCode: '6', type: 'EXPENSE' as const },
    { code: '612', name: 'Achats d\'engrais et amendements', classCode: '6', type: 'EXPENSE' as const },
    { code: '613', name: 'Achats de produits phytosanitaires', classCode: '6', type: 'EXPENSE' as const },
    { code: '614', name: 'Achats d\'aliments pour animaux', classCode: '6', type: 'EXPENSE' as const },
    { code: '62', name: 'Frais d\'irrigation', classCode: '6', type: 'EXPENSE' as const },
    { code: '621', name: 'Eau d\'irrigation', classCode: '6', type: 'EXPENSE' as const },
    { code: '622', name: 'Énergie (pompage)', classCode: '6', type: 'EXPENSE' as const },
    { code: '63', name: 'Frais de main-d\'œuvre', classCode: '6', type: 'EXPENSE' as const },
    { code: '631', name: 'Salaires permanents', classCode: '6', type: 'EXPENSE' as const },
    { code: '632', name: 'Main-d\'œuvre saisonnière', classCode: '6', type: 'EXPENSE' as const },
    { code: '633', name: 'Charges sociales', classCode: '6', type: 'EXPENSE' as const },
    { code: '64', name: 'Frais vétérinaires et sanitaires', classCode: '6', type: 'EXPENSE' as const },
    { code: '641', name: 'Frais vétérinaires', classCode: '6', type: 'EXPENSE' as const },
    { code: '642', name: 'Médicaments et vaccins', classCode: '6', type: 'EXPENSE' as const },
    { code: '65', name: 'Autres charges d\'exploitation', classCode: '6', type: 'EXPENSE' as const },
    { code: '651', name: 'Carburant et lubrifiants', classCode: '6', type: 'EXPENSE' as const },
    { code: '652', name: 'Entretien du matériel', classCode: '6', type: 'EXPENSE' as const },
    { code: '653', name: 'Frais de transport et vente', classCode: '6', type: 'EXPENSE' as const },
    { code: '654', name: 'Assurances agricoles', classCode: '6', type: 'EXPENSE' as const },
    { code: '655', name: 'Locations (terres, matériel)', classCode: '6', type: 'EXPENSE' as const },
    { code: '68', name: 'Dotations aux amortissements', classCode: '6', type: 'EXPENSE' as const },
    { code: '681', name: 'Amortissement du matériel agricole', classCode: '6', type: 'EXPENSE' as const },
    { code: '682', name: 'Amortissement des constructions', classCode: '6', type: 'EXPENSE' as const },

    // CLASSE 7 - PRODUITS
    { code: '71', name: 'Ventes de productions végétales', classCode: '7', type: 'REVENUE' as const },
    { code: '711', name: 'Ventes de céréales', classCode: '7', type: 'REVENUE' as const },
    { code: '712', name: 'Ventes de légumes', classCode: '7', type: 'REVENUE' as const },
    { code: '713', name: 'Ventes de fruits', classCode: '7', type: 'REVENUE' as const },
    { code: '714', name: 'Ventes de cultures industrielles', classCode: '7', type: 'REVENUE' as const },
    { code: '72', name: 'Ventes de productions animales', classCode: '7', type: 'REVENUE' as const },
    { code: '721', name: 'Ventes d\'animaux sur pied', classCode: '7', type: 'REVENUE' as const },
    { code: '722', name: 'Ventes de lait', classCode: '7', type: 'REVENUE' as const },
    { code: '723', name: 'Ventes d\'œufs et aviculture', classCode: '7', type: 'REVENUE' as const },
    { code: '724', name: 'Ventes de laine et autres sous-produits', classCode: '7', type: 'REVENUE' as const },
    { code: '75', name: 'Autres produits d\'exploitation', classCode: '7', type: 'REVENUE' as const },
    { code: '751', name: 'Subventions agricoles', classCode: '7', type: 'REVENUE' as const },
    { code: '752', name: 'Indemnités d\'assurance', classCode: '7', type: 'REVENUE' as const },
    { code: '753', name: 'Produits divers', classCode: '7', type: 'REVENUE' as const },
  ];

  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: { ...acc, isActive: true },
    });
  }

  console.log(`✅ ${accounts.length} comptes créés`);

  // ============================================================
  // 5. COMPTES DE TRÉSORERIE
  // ============================================================
  console.log('💰 Création des comptes de trésorerie...');

  const cashAccount1 = await prisma.cashAccount.create({
    data: {
      projectId: project.id,
      name: 'Caisse Principale',
      type: 'CASH',
      balance: 45000,
      currency: 'MAD',
      isActive: true,
    },
  });

  const cashAccount2 = await prisma.cashAccount.create({
    data: {
      projectId: project.id,
      name: 'Compte Bancaire CIH',
      type: 'BANK',
      balance: 132500,
      currency: 'MAD',
      isActive: true,
    },
  });

  console.log('✅ 2 comptes de trésorerie créés');

  // ============================================================
  // 6. IMMOBILISATIONS
  // ============================================================
  console.log('🚜 Création des immobilisations...');

  const accountAsset = await prisma.account.findFirst({ where: { code: '251' } });
  const accountVehicle = await prisma.account.findFirst({ where: { code: '261' } });
  const accountBuilding = await prisma.account.findFirst({ where: { code: '232' } });

  if (accountAsset && accountVehicle && accountBuilding) {
    const tractor = await prisma.asset.create({
      data: {
        projectId: project.id,
        accountId: accountAsset.id,
        name: 'Tracteur John Deere 5090E',
        category: 'EQUIPMENT',
        acquisitionDate: new Date('2022-03-15'),
        acquisitionValue: 280000,
        depreciationMethod: 'LINEAR',
        usefulLifeYears: 10,
        residualValue: 28000,
        currentValue: 224000,
        status: 'ACTIVE',
        serialNumber: 'JD5090E-2022-0315',
        notes: 'Tracteur principal, 90 CV, 4x4',
      },
    });

    // Depreciation entries for the tractor
    await prisma.depreciation.createMany({
      data: [
        { assetId: tractor.id, year: 2022, annualDepreciation: 25200, accumulatedDepreciation: 25200, bookValue: 254800 },
        { assetId: tractor.id, year: 2023, annualDepreciation: 25200, accumulatedDepreciation: 50400, bookValue: 229600 },
      ],
      skipDuplicates: true,
    });

    await prisma.asset.create({
      data: {
        projectId: project.id,
        accountId: accountVehicle.id,
        name: 'Camion Benne Isuzu',
        category: 'VEHICLE',
        acquisitionDate: new Date('2023-06-01'),
        acquisitionValue: 180000,
        depreciationMethod: 'LINEAR',
        usefulLifeYears: 7,
        residualValue: 18000,
        currentValue: 157143,
        status: 'ACTIVE',
        notes: 'Transport des récoltes',
      },
    });

    await prisma.asset.create({
      data: {
        projectId: project.id,
        accountId: accountBuilding.id,
        name: 'Hangar de Stockage',
        category: 'BUILDING',
        acquisitionDate: new Date('2021-09-01'),
        acquisitionValue: 120000,
        depreciationMethod: 'LINEAR',
        usefulLifeYears: 20,
        residualValue: 0,
        currentValue: 99000,
        status: 'ACTIVE',
        location: 'Parcelle principale - Sector A',
      },
    });
  }

  console.log('✅ 3 immobilisations créées avec amortissements');

  // ============================================================
  // 7. PARCELLES ET CULTURES
  // ============================================================
  console.log('🌾 Création des parcelles et cultures...');

  const plot1 = await prisma.plot.create({
    data: {
      projectId: project.id,
      name: 'Parcelle Nord - Blé',
      area: 12.5,
      areaUnit: 'HA',
      location: 'Zone Nord, coordonnées 31.52N 7.41W',
      soilType: 'Argilo-limoneux',
      irrigationType: 'RAIN_FED',
      isActive: true,
    },
  });

  const plot2 = await prisma.plot.create({
    data: {
      projectId: project.id,
      name: 'Serre Maraîchage',
      area: 2.0,
      areaUnit: 'HA',
      location: 'Zone Sud-Est',
      soilType: 'Sableux amendé',
      irrigationType: 'DRIP',
      isActive: true,
    },
  });

  const plot3 = await prisma.plot.create({
    data: {
      projectId: project.id,
      name: 'Oliveraie',
      area: 5.0,
      areaUnit: 'HA',
      location: 'Zone Ouest',
      soilType: 'Calcaire',
      irrigationType: 'DRIP',
      isActive: true,
    },
  });

  const crop1 = await prisma.crop.create({
    data: {
      projectId: project.id,
      plotId: plot1.id,
      cropType: 'Blé tendre',
      variety: 'Arrehane',
      plantingDate: new Date('2023-11-15'),
      expectedHarvestDate: new Date('2024-06-30'),
      actualHarvestDate: new Date('2024-06-25'),
      areaPlanted: 12.5,
      status: 'HARVESTED',
    },
  });

  const crop2 = await prisma.crop.create({
    data: {
      projectId: project.id,
      plotId: plot2.id,
      cropType: 'Tomates',
      variety: 'Marmande',
      plantingDate: new Date('2024-02-01'),
      expectedHarvestDate: new Date('2024-07-31'),
      areaPlanted: 1.5,
      status: 'HARVESTED',
    },
  });

  const crop3 = await prisma.crop.create({
    data: {
      projectId: project.id,
      plotId: plot3.id,
      cropType: 'Olives',
      variety: 'Picholine marocaine',
      plantingDate: new Date('2010-01-01'),
      expectedHarvestDate: new Date('2024-11-30'),
      areaPlanted: 5.0,
      status: 'GROWING',
    },
  });

  // Harvests
  await prisma.harvest.createMany({
    data: [
      { cropId: crop1.id, date: new Date('2024-06-25'), quantity: 5750, unit: 'KG', qualityGrade: 'A', destination: 'STOCK', notes: 'Bonne récolte malgré la sécheresse de mai' },
      { cropId: crop1.id, date: new Date('2024-06-28'), quantity: 2100, unit: 'KG', qualityGrade: 'B', destination: 'DIRECT_SALE' },
      { cropId: crop2.id, date: new Date('2024-05-15'), quantity: 8500, unit: 'KG', qualityGrade: 'A', destination: 'DIRECT_SALE' },
      { cropId: crop2.id, date: new Date('2024-06-20'), quantity: 6200, unit: 'KG', qualityGrade: 'A', destination: 'STOCK' },
    ],
  });

  console.log('✅ 3 parcelles, 3 cultures et 4 récoltes créées');

  // ============================================================
  // 8. ÉLEVAGE
  // ============================================================
  console.log('🐑 Création du cheptel...');

  const livestockGroup1 = await prisma.livestockGroup.create({
    data: {
      projectId: project.id,
      type: 'BREEDING',
      species: 'Ovins',
      breed: 'D\'man',
      initialCount: 85,
      currentCount: 92,
      averageWeight: 38.5,
      unitValue: 1800,
      acquisitionDate: new Date('2024-01-10'),
      status: 'ACTIVE',
    },
  });

  const livestockGroup2 = await prisma.livestockGroup.create({
    data: {
      projectId: project.id,
      type: 'FATTENING',
      species: 'Bovins',
      breed: 'Local',
      initialCount: 12,
      currentCount: 10,
      averageWeight: 280,
      unitValue: 12000,
      acquisitionDate: new Date('2024-03-01'),
      status: 'ACTIVE',
    },
  });

  await prisma.livestockMovement.createMany({
    data: [
      { livestockGroupId: livestockGroup1.id, date: new Date('2024-01-10'), type: 'PURCHASE', quantity: 85, unitPrice: 1800, totalValue: 153000, notes: 'Achat initial du troupeau' },
      { livestockGroupId: livestockGroup1.id, date: new Date('2024-03-20'), type: 'BIRTH', quantity: 14, notes: 'Agnelage de printemps' },
      { livestockGroupId: livestockGroup1.id, date: new Date('2024-04-15'), type: 'DEATH', quantity: 2, reason: 'Maladie', notes: 'Pertes suite à enterotoxémie' },
      { livestockGroupId: livestockGroup1.id, date: new Date('2024-07-01'), type: 'SALE', quantity: 5, unitPrice: 2200, totalValue: 11000, notes: 'Vente avant Aïd Al Adha' },
      { livestockGroupId: livestockGroup2.id, date: new Date('2024-03-01'), type: 'PURCHASE', quantity: 12, unitPrice: 10500, totalValue: 126000 },
      { livestockGroupId: livestockGroup2.id, date: new Date('2024-07-15'), type: 'SALE', quantity: 2, unitPrice: 15000, totalValue: 30000 },
    ],
  });

  await prisma.livestockExpense.createMany({
    data: [
      { livestockGroupId: livestockGroup1.id, date: new Date('2024-02-01'), type: 'FEED', amount: 8500, description: 'Orge et son de blé - 1 tonne' },
      { livestockGroupId: livestockGroup1.id, date: new Date('2024-03-15'), type: 'VETERINARY', amount: 3200, description: 'Vaccination et déparasitage' },
      { livestockGroupId: livestockGroup1.id, date: new Date('2024-05-01'), type: 'FEED', amount: 12000, description: 'Aliment composé concentré' },
      { livestockGroupId: livestockGroup2.id, date: new Date('2024-03-15'), type: 'FEED', amount: 15000, description: 'Alimentation engraissement - maïs et tourteau' },
      { livestockGroupId: livestockGroup2.id, date: new Date('2024-05-20'), type: 'VETERINARY', amount: 2800, description: 'Suivi sanitaire mensuel' },
      { livestockGroupId: livestockGroup2.id, date: new Date('2024-06-01'), type: 'FEED', amount: 18000, description: 'Ration finition - dernier mois' },
    ],
  });

  console.log('✅ 2 groupes d\'élevage avec mouvements et charges créés');

  // ============================================================
  // 9. STOCKS
  // ============================================================
  console.log('📦 Création des stocks...');

  const accountStock = await prisma.account.findFirst({ where: { code: '351' } });
  const accountSeed = await prisma.account.findFirst({ where: { code: '31' } });

  if (accountStock && accountSeed) {
    const stockBle = await prisma.stockItem.create({
      data: {
        projectId: project.id,
        accountId: accountStock.id,
        name: 'Blé tendre Arrehane',
        category: 'HARVEST',
        currentQuantity: 5750,
        unit: 'kg',
        unitValue: 3.2,
        totalValue: 18400,
        minimumThreshold: 500,
        location: 'Hangar principal',
      },
    });

    await prisma.stockMovement.create({
      data: {
        stockItemId: stockBle.id,
        date: new Date('2024-06-25'),
        type: 'IN',
        source: 'HARVEST',
        quantity: 5750,
        unitCost: 3.2,
        notes: 'Récolte saison 2024',
      },
    });

    const stockTomate = await prisma.stockItem.create({
      data: {
        projectId: project.id,
        accountId: accountStock.id,
        name: 'Tomates fraîches',
        category: 'HARVEST',
        currentQuantity: 1200,
        unit: 'kg',
        unitValue: 2.8,
        totalValue: 3360,
        minimumThreshold: 200,
        location: 'Chambre froide',
      },
    });

    await prisma.stockMovement.createMany({
      data: [
        { stockItemId: stockTomate.id, date: new Date('2024-05-15'), type: 'IN', source: 'HARVEST', quantity: 8500, unitCost: 2.5 },
        { stockItemId: stockTomate.id, date: new Date('2024-05-20'), type: 'OUT', source: 'SALE', quantity: 7300, notes: 'Vente souk local' },
        { stockItemId: stockTomate.id, date: new Date('2024-06-20'), type: 'IN', source: 'HARVEST', quantity: 6200, unitCost: 2.8 },
        { stockItemId: stockTomate.id, date: new Date('2024-06-25'), type: 'OUT', source: 'SALE', quantity: 6200, notes: 'Vente grossiste Casablanca' },
      ],
    });
  }

  console.log('✅ Stocks créés avec mouvements');

  // ============================================================
  // 10. CLIENTS ET VENTES
  // ============================================================
  console.log('🛒 Création des clients et ventes...');

  const customer1 = await prisma.customer.create({
    data: {
      projectId: project.id,
      name: 'Coopérative Souss-Massa',
      type: 'COMPANY',
      phone: '+212 5XX-XXX-001',
      email: 'achat@coop-souss.ma',
      address: 'Agadir, Souss-Massa',
      paymentTerms: '30 jours',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      projectId: project.id,
      name: 'Hammou Ait Brahim',
      type: 'INDIVIDUAL',
      phone: '+212 6XX-XXX-002',
      address: 'Souk de Midelt',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      projectId: project.id,
      name: 'AZIZ Distribution SARL',
      type: 'COMPANY',
      phone: '+212 5XX-XXX-003',
      email: 'commandes@aziz-distrib.ma',
      address: 'Zone industrielle, Meknès',
      paymentTerms: '45 jours',
    },
  });

  // ============================================================
  // 11. TRANSACTIONS COMPTABLES
  // ============================================================
  console.log('📊 Création des transactions...');

  const accSemences = await prisma.account.findFirst({ where: { code: '611' } });
  const accEngrais = await prisma.account.findFirst({ where: { code: '612' } });
  const accPhyto = await prisma.account.findFirst({ where: { code: '613' } });
  const accMOeuvre = await prisma.account.findFirst({ where: { code: '632' } });
  const accCarburant = await prisma.account.findFirst({ where: { code: '651' } });
  const accVenteCereales = await prisma.account.findFirst({ where: { code: '711' } });
  const accVenteLegumes = await prisma.account.findFirst({ where: { code: '712' } });
  const accVenteAnimaux = await prisma.account.findFirst({ where: { code: '721' } });
  const accIrrigation = await prisma.account.findFirst({ where: { code: '621' } });
  const accVeterin = await prisma.account.findFirst({ where: { code: '641' } });
  const accAliments = await prisma.account.findFirst({ where: { code: '614' } });
  const accEntretien = await prisma.account.findFirst({ where: { code: '652' } });
  const accSubvention = await prisma.account.findFirst({ where: { code: '751' } });
  const accTransport = await prisma.account.findFirst({ where: { code: '653' } });

  const transactions = [];

  if (accSemences && accEngrais && accPhyto && accMOeuvre && accCarburant &&
      accVenteCereales && accVenteLegumes && accVenteAnimaux && accIrrigation &&
      accVeterin && accAliments && accEntretien && accSubvention && accTransport) {

    transactions.push(
      // CHARGES
      {
        projectId: project.id, accountId: accSemences.id, date: new Date('2024-01-20'),
        type: 'EXPENSE' as const, amount: 12500, description: 'Semences blé Arrehane certifiées - 500 kg',
        paymentMethod: 'BANK_TRANSFER' as const, createdByUserId: admin.id,
        quantity: 500, unit: 'kg',
      },
      {
        projectId: project.id, accountId: accEngrais.id, date: new Date('2024-02-05'),
        type: 'EXPENSE' as const, amount: 28000, description: 'NPK 15-15-15 et Urée 46% - 4 tonnes',
        paymentMethod: 'CASH' as const, createdByUserId: associate1.id,
        quantity: 4000, unit: 'kg',
      },
      {
        projectId: project.id, accountId: accPhyto.id, date: new Date('2024-03-10'),
        type: 'EXPENSE' as const, amount: 8500, description: 'Herbicides et fongicides saison blé',
        paymentMethod: 'CASH' as const, createdByUserId: admin.id,
      },
      {
        projectId: project.id, accountId: accIrrigation.id, date: new Date('2024-02-15'),
        type: 'EXPENSE' as const, amount: 4200, description: 'Eau irrigation serre - facture ONEE février',
        paymentMethod: 'BANK_TRANSFER' as const, createdByUserId: admin.id,
      },
      {
        projectId: project.id, accountId: accIrrigation.id, date: new Date('2024-03-15'),
        type: 'EXPENSE' as const, amount: 5100, description: 'Eau irrigation serre - facture ONEE mars',
        paymentMethod: 'BANK_TRANSFER' as const, createdByUserId: admin.id,
      },
      {
        projectId: project.id, accountId: accMOeuvre.id, date: new Date('2024-04-01'),
        type: 'EXPENSE' as const, amount: 18000, description: 'Main-d\'œuvre saisonnière - labour et plantation',
        paymentMethod: 'CASH' as const, createdByUserId: admin.id,
      },
      {
        projectId: project.id, accountId: accMOeuvre.id, date: new Date('2024-06-20'),
        type: 'EXPENSE' as const, amount: 22000, description: 'Main-d\'œuvre moisson blé - 30 ouvriers x 7 jours',
        paymentMethod: 'CASH' as const, createdByUserId: associate1.id,
      },
      {
        projectId: project.id, accountId: accCarburant.id, date: new Date('2024-03-31'),
        type: 'EXPENSE' as const, amount: 9800, description: 'Carburant tracteur et véhicule Q1 2024',
        paymentMethod: 'CASH' as const, createdByUserId: admin.id,
      },
      {
        projectId: project.id, accountId: accCarburant.id, date: new Date('2024-06-30'),
        type: 'EXPENSE' as const, amount: 11200, description: 'Carburant tracteur et véhicule Q2 2024',
        paymentMethod: 'CASH' as const, createdByUserId: admin.id,
      },
      {
        projectId: project.id, accountId: accAliments.id, date: new Date('2024-02-01'),
        type: 'EXPENSE' as const, amount: 23500, description: 'Aliments bétail - ovins et bovins',
        paymentMethod: 'CASH' as const, createdByUserId: associate1.id,
      },
      {
        projectId: project.id, accountId: accAliments.id, date: new Date('2024-05-01'),
        type: 'EXPENSE' as const, amount: 27000, description: 'Aliments bétail Q2 - concentré finition',
        paymentMethod: 'CASH' as const, createdByUserId: admin.id,
      },
      {
        projectId: project.id, accountId: accVeterin.id, date: new Date('2024-03-15'),
        type: 'EXPENSE' as const, amount: 6000, description: 'Frais vétérinaires - vaccination annuelle cheptel',
        paymentMethod: 'CASH' as const, createdByUserId: admin.id,
      },
      {
        projectId: project.id, accountId: accEntretien.id, date: new Date('2024-04-20'),
        type: 'EXPENSE' as const, amount: 7500, description: 'Révision tracteur + remplacement pneus',
        paymentMethod: 'BANK_TRANSFER' as const, createdByUserId: admin.id,
      },
      {
        projectId: project.id, accountId: accTransport.id, date: new Date('2024-07-05'),
        type: 'EXPENSE' as const, amount: 4800, description: 'Transport récolte blé vers moulin',
        paymentMethod: 'CASH' as const, createdByUserId: associate1.id,
      },
      // PRODUITS / REVENUS
      {
        projectId: project.id, accountId: accVenteCereales.id, date: new Date('2024-07-10'),
        type: 'SALE' as const, amount: 25200, description: 'Vente blé Arrehane Q1 - 7000 kg x 3.60 DH/kg',
        paymentMethod: 'BANK_TRANSFER' as const, createdByUserId: admin.id,
        quantity: 7000, unit: 'kg',
      },
      {
        projectId: project.id, accountId: accVenteLegumes.id, date: new Date('2024-05-20'),
        type: 'SALE' as const, amount: 18250, description: 'Vente tomates souk local - 7300 kg x 2.50 DH/kg',
        paymentMethod: 'CASH' as const, createdByUserId: associate1.id,
        quantity: 7300, unit: 'kg',
      },
      {
        projectId: project.id, accountId: accVenteLegumes.id, date: new Date('2024-07-02'),
        type: 'SALE' as const, amount: 37200, description: 'Vente tomates grossiste Casa - 6200 kg x 6.00 DH/kg',
        paymentMethod: 'BANK_TRANSFER' as const, createdByUserId: admin.id,
        quantity: 6200, unit: 'kg',
      },
      {
        projectId: project.id, accountId: accVenteAnimaux.id, date: new Date('2024-07-01'),
        type: 'SALE' as const, amount: 11000, description: 'Vente 5 brebis D\'man - 5 x 2200 DH',
        paymentMethod: 'CASH' as const, createdByUserId: associate1.id,
        quantity: 5, unit: 'têtes',
      },
      {
        projectId: project.id, accountId: accVenteAnimaux.id, date: new Date('2024-07-15'),
        type: 'SALE' as const, amount: 30000, description: 'Vente 2 bovins engraissés - 2 x 15000 DH',
        paymentMethod: 'CASH' as const, createdByUserId: admin.id,
        quantity: 2, unit: 'têtes',
      },
      {
        projectId: project.id, accountId: accSubvention.id, date: new Date('2024-04-30'),
        type: 'SALE' as const, amount: 15000, description: 'Subvention Plan Maroc Vert - prime à la productivité',
        paymentMethod: 'BANK_TRANSFER' as const, createdByUserId: admin.id,
      },
    );

    for (const tx of transactions) {
      await prisma.transaction.create({ data: tx });
    }
  }

  console.log(`✅ ${transactions.length} transactions créées`);

  console.log('\n🎉 Seed terminé avec succès!\n');
  console.log('='.repeat(50));
  console.log('COMPTES DE DÉMONSTRATION:');
  console.log('='.repeat(50));
  console.log('👑 Admin:       admin@agri.com       / Admin123!');
  console.log('📊 Comptable:   comptable@agri.com   / User123!');
  console.log('🤝 Associé 1:   associe1@agri.com    / User123!');
  console.log('🤝 Associé 2:   associe2@agri.com    / User123!');
  console.log('👁  Observateur: observateur@agri.com / User123!');
  console.log('='.repeat(50));
  console.log(`📁 Projet démo: "${project.name}" (ID: ${project.id})`);
  console.log(`🌐 Frontend:    http://localhost`);
  console.log(`🔌 API:         http://localhost/api`);
  console.log(`📖 Swagger:     http://localhost/api/docs`);
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
