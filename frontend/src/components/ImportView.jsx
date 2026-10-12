import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  FileCheck,
  CreditCard,
  Building,
  Sparkles,
  Plane,
  ShieldCheck,
  Layers,
  Trash2,
  Play,
  Loader2,
  FileText,
  Clock,
  XCircle,
  Plus,
  ArrowRight,
  Package,
  Wand2,
  Settings
} from 'lucide-react';
import { authFetch } from '../supabaseClient';

const REAL_SANTANDER_SAMPLE = `,,CUENTA ONLINE SANTANDER,DATE,,
,,ES13 0049 5525 5323 1245 0000,28/09/2026 | 20:54:22,,
,,Holder,Balance,,
,,USUARIO DEMO,"1.233,19 EUR",,
,,,,,
Transactions,,,,,
Transaction date,Value date,Description,Amount,Balance,Currency
28/09/2026,28/09/2026,"PAGO MOVIL EN SUPERMERCADO MADRID, MADRID ES, TARJ. :*0000","−29,90","1.233,19",EUR
28/09/2026,28/09/2026,"ANULACION REINTEGRO CONTRA CUENTA, ATM SUC.4338 EL 28/09/2026 A LAS 19:46","750,00","1.263,09",EUR
28/09/2026,28/09/2026,RETIRADA DE EFECTIVO EN CAJERO AUTOMATICO 004943380000 EL 28/09/2026 A LAS 19:46..PAN:5489010332450000.,"−750,00","513,09",EUR
28/09/2026,28/09/2026,"TRANSFERENCIA DE EMPRESA SL, CONCEPTO Reembolso gastos septiembre.","85,63","1.263,09",EUR
28/09/2026,28/09/2026,TRANSFERENCIA A FAVOR DE PROPIETARIO CONCEPTO: Alquiler mensual vivienda,"−654,00","1.177,46",EUR
28/09/2026,28/09/2026,TRANSFERENCIA CONCEPTO: gastos comunes piso,"−60,00","1.831,46",EUR
27/09/2026,27/09/2026,BIZUM A FAVOR DE COMPAÑERO CONCEPTO: cena sábado,"−3,82","1.889,48",EUR
27/09/2026,27/09/2026,TRANSFERENCIA INMEDIATA A FAVOR DE AMERICAN EXPRESS CONCEPTO Cuota tarjeta,"−14,13","1.893,30",EUR
26/09/2026,26/09/2026,"PAGO MOVIL EN CAFETERIA, MADRID ES, TARJ. :*0000","−9,80","2.666,10",EUR
25/09/2026,25/09/2026,"PAGO MOVIL EN SUPERMERCADO, MADRID ES, TARJ. :*0000","−66,39","2.683,50",EUR
25/09/2026,25/09/2026,"TRANSFERENCIA DE EMPRESA SL, CONCEPTO NOMINA MENSUAL.","2.772,89","2.809,79",EUR
24/09/2026,24/09/2026,"TRANSFERENCIA DE EMPRESA SL, CONCEPTO Gastos de viaje reunion clientes.","417,35","453,90",EUR
21/09/2026,21/09/2026,"PAGO MOVIL EN MERCADONA, MADRID ES, TARJ. :*0000","−39,87","296,55",EUR
20/09/2026,20/09/2026,"PAGO MOVIL EN APARCAMIENTO CIUDAD, TARJ. :*0000","−14,90","331,15",EUR
20/09/2026,20/09/2026,"TRANSFERENCIA INMEDIATA DESDE CUENTA AHORRO","100,00","393,95",EUR
18/09/2026,18/09/2026,"PAGO MOVIL EN RESTAURANTE, MADRID ES, TARJ. :*0000","−5,75","302,70",EUR
17/09/2026,15/09/2026,"COMPRA SUSCRIPCION SERVICIO ONLINE, TARJETA *0000","−2,50","318,44",EUR
16/09/2026,14/09/2026,"COMPRA APPLE SERVICES, TARJETA *0000","−4,49","320,94",EUR
16/09/2026,16/09/2026,"RECIBO ASESORIA Y SERVICIOS LEGALES REF. 0049-3477","−20,93","325,43",EUR
15/09/2026,15/09/2026,"RECIBO IBERIA CARDS, concepto: LIQUIDACION MENSUAL TARJETA","−272,90","346,36",EUR
14/09/2026,14/09/2026,"PAGO MOVIL EN SUPERMERCADO, MADRID ES, TARJ. :*0000","−55,06","619,26",EUR`;

const REAL_IBERIA_CARDS_SAMPLE = `,Extracto mensual,,,,,
,Iberia Cards ,,,,,
,,,,,,
,Nombre y apellidos,Usuario Demo,,,,
,Número de documento,12345678X,,,,
,,,,,,
,Extracto Mensual de,Fecha de cierre extracto,Importe a pagar,Importe operaciones mes,Deuda pendiente del mes anterior,Forma de pago
,Septiembre 2026,11 SEP 2026,272.9,263,0,Total fin de mes
,,,,,,
,IBERIA ICON                   ,,4361-********-0000,Usuario Demo,,
,,,,,,
,Nº ,FECHA OPERACIÓN,COMERCIO,IMPORTE DIVISA,IMPORTE EUROS,
,1,15/08/2026,RESTAURANTE RAMEN,31.9,31.9,
,2,21/08/2026,BAR RESTAURANTE BBQ,52,52,
,3,22/08/2026,ACTIVIDAD CULTURAL Y OCIO,100,100,
,4,24/08/2026,ESTACION DE SERVICIO REPSOL,79.1,79.1,
,5,11/09/2026,RENOVACION TARJETA ANUAL,0,9.9,`;

const REAL_N26_SAMPLE = `Booking Date,Value Date,Partner Name,Partner Iban,Type,Payment Reference,Account Name,Amount (EUR),Original Amount,Original Currency,Exchange Rate
46038.0,46038.0,Usuario Demo,ES1300495525532312450000,Debit Transfer,Enviada desde N26,Main Account,-23.0,,,
46040.0,46040.0,CLUB DEPORTIVO RESERVA,,Presentment,,Main Account,-24.96,24.96,EUR,1.0
46043.0,46043.0,CLUB DEPORTIVO RESERVA,,Presentment,,Main Account,-10.4,10.4,EUR,1.0
46043.0,46043.0,MAQUINAS EXPENDEDORAS,,Presentment,,Main Account,-7.0,7.0,EUR,1.0
46046.0,46046.0,PARKING PUBLICO CIUDAD,,Presentment,,Main Account,-8.2,8.2,EUR,1.0
46047.0,46047.0,GASOLINERA REPSOL,,Presentment,,Main Account,-14.9,14.9,EUR,1.0
46048.0,46048.0,Usuario Demo,ES1300495525532312450000,Credit Transfer,viaje vacaciones,Main Account,1000.0,,,
46052.0,46052.0,N26 Bank,,Fee,Comision de mantenimiento,Main Account,-10.0,,,
46055.0,46055.0,COMPAÑERO VIAJE,ES5921005602631300340000,Credit Transfer,compartir gastos,Main Account,100.0,,,
46076.0,46076.0,Usuario Demo,ES1300495525532312450000,Debit Transfer,Aportacion Inversion,Main Account,-500.0,,,
46088.0,46088.0,HOTEL BOOKING RESERVA,,Presentment,,Main Account,-129.26,129.26,EUR,1.0
46122.0,46122.0,BILLETE DE AVION IBERIA,,Presentment,,Main Account,-39.0,39.0,EUR,1.0
46128.0,46128.0,HOTEL RESTAURANTE Y CAFE,,Presentment,,Main Account,-49.34,58.05,USD,0.8499569337
46131.0,46130.0,CAFETERIA STARBUCKS,,Presentment,,Main Account,-12.87,15.14,USD,0.8500660502
46131.0,46131.0,RESTAURANTE LOCAL TURISMO,,Presentment,,Main Account,-80.55,5683.2,DOP,0.014173353
46136.0,46136.0,EXCURSIONES Y ACTIVIDADES,,Presentment,,Main Account,-20.92,1450.0,DOP,0.0144275862
46228.0,46227.0,SUPERMERCADO ALIMENTACION,,Presentment,,Main Account,-23.3,23.3,EUR,1.0
46229.0,46229.0,CENA RESTAURANTE PLAYA,,Presentment,,Main Account,-24.0,,,`;

const REAL_SANTANDER_CREDIT_SAMPLE = `,,CREDITO SANTANDER,Date
,,5415411648300000,28/09/2026 | 22:13:39
,,Holder,
,,USUARIO DEMO,
,,,
Transactions,,,
Transaction date,Description,Amount,Currency
28/08/2026,CUOTA FRACCIONAR COMPRA de 191€,"−191,00",EUR
06/08/2026,PAGO COMERCIO ELECTRONICO,"−332,42",EUR
30/07/2026,CUOTA FRACCIONAR COMPRA de 191€,"−191,00",EUR
13/07/2026,PARKING CENTRO CIUDAD,"−26,00",EUR
03/07/2026,DEVOLUCION COMPRA TIENDA,"20,96",EUR
01/07/2026,COMISION APERTURA FRAC.COMPRA,"−12,00",EUR
29/06/2026,TIENDA DE ROPA Y MODA,"−144,15",EUR
27/06/2026,COMPRA SASTRERIA MODA,"−573,00",EUR
09/06/2026,BAR CAFETERIA,"−4,50",EUR
20/05/2026,APARCAMIENTO PUBLICO,"−14,40",EUR
03/05/2026,SUMINISTRO ENERGIA HOGAR,"−1,02",EUR
13/04/2026,UBER VIAJE URBANO,"−59,07",EUR`;

const REAL_AMEX_SAMPLE = `Detalles de la operación,"The Platinum Card / 01 Jan, 2026 a 31 Dec, 2026",,,,,,,,,
Preparado para,,,,,,,,,,
USUARIO DEMO,,,,,,,,,,
Número de Cuenta,,,,,,,,,,
XXXX-XXXXXX-00000,,,,,,,,,,
,,,,,,,,,,
Fecha,Descripción,Importe,Detalles ampliados,Aparece en su Estado de Cuenta como,Dirección,Población/Provincia,Código postal,País,Referencia,Categoría
26/09/2026,RESTAURANTE GASTRONOMICO,141,,RESTAURANTE GASTRONOMICO,"CALLE PRINCIPAL 10",,28034,SPAIN,AT262700024000010058000,Entretenimiento-Restaurantes
26/09/2026,"ESTACION SERVICIO GASOLINA",74.41,,"ESTACION SERVICIO GASOLINA","CARRETERA M-607",,28770,SPAIN,AT262700024000010047177,Transporte-Gasolina
24/09/2026,PAGO RECIBIDO.GRACIAS,-417,,PAGO RECIBIDO.GRACIAS,,,,,AT262680042000010000047,
23/09/2026,COMPRA AMAZON ONLINE,82.57,,COMPRA AMAZON ONLINE,"38 AVENUE",,L-1855,LUXEMBOURG,AT262670077000010011494,Productos-Compra online
22/09/2026,PAGO RECIBIDO.GRACIAS,-320,,PAGO RECIBIDO.GRACIAS,,,,,AT262660036000010000063,
28/08/2026,CUOTA MENSUAL DE LA TARJETA,65,,CUOTA MENSUAL DE LA TARJETA,,,,,10000000010628999395700,
31/08/2026,RECIBO ENVIADO A SU BANCO.,-173.58,,RECIBO ENVIADO A SU BANCO.,,,,,10000000010829999845250,`;

const REAL_MYINVESTOR_SAMPLE = `Fecha de operación;Fecha de valor;Concepto;Importe;Divisa
30/09/2026;29/09/2026;Liquidación cuenta remunerada mensual;0,13;EUR
27/09/2026;27/09/2026;Transferencia hacia cuenta corriente;-337,98;EUR
20/09/2026;20/09/2026;Transferencia hacia cuenta corriente;-100;EUR
14/09/2026;15/09/2026;COMPRA ACCIONES MERCADO;-233,2;EUR
02/09/2026;03/09/2026;FIDELITY MSCI WORLD INDEX P AC;-499,99;EUR
27/08/2026;28/08/2026;FIDELITY MSCI WORLD INDEX P AC;-15,99;EUR
26/08/2026;26/08/2026;Aportacion ahorro inversion;750;EUR
25/08/2026;25/08/2026;Ahorro mensual transferido;441;EUR
31/07/2026;03/08/2026;FIDELITY MSCI WORLD INDEX P AC;-500;EUR
27/07/2026;27/07/2026;Aportacion ahorro inversion;750;EUR
02/06/2026;03/06/2026;FIDELITY MSCI WORLD INDEX P AC;-750;EUR
26/05/2026;26/05/2026;Aportacion ahorro inversion;750;EUR
01/05/2026;04/05/2026;FIDELITY MSCI WORLD INDEX P AC;-750;EUR`;

export default function ImportView({ onUploadComplete, setActiveTab, setSelectedMonth }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('Auto');
  const [supportedBanks, setSupportedBanks] = useState([]);
  const [existingAccounts, setExistingAccounts] = useState([]);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customAccountName, setCustomAccountName] = useState('');
  
  const [fileQueue, setFileQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [aggregateStats, setAggregateStats] = useState(null);

  const fileInputRef = useRef(null);
  const queueRef = useRef([]);
  const isProcessingRef = useRef(false);

  // Fetch banks & active accounts
  const fetchBanksAndAccounts = async () => {
    try {
      const [banksRes, accsRes] = await Promise.all([
        authFetch('/api/settings/banks'),
        authFetch('/api/accounts')
      ]);
      const banksData = await banksRes.json();
      const accsData = await accsRes.json();
      if (banksData?.banks) {
        setSupportedBanks(banksData.banks);
      }
      if (accsData?.accounts) {
        setExistingAccounts(accsData.accounts);
      }
    } catch (e) {
      console.error('Error fetching banks and accounts in ImportView:', e);
    }
  };

  useEffect(() => {
    fetchBanksAndAccounts();
  }, []);

  // Build dynamic list of active account choices based on enabled banks in Settings
  const enabledBanks = supportedBanks.filter(b => b.enabled !== 0);
  
  const accounts = [
    { id: 'Auto', label: '✨ Auto-detectar Banco', isAuto: true },
    ...enabledBanks.map(b => ({
      id: b.name,
      label: b.name,
      bankId: b.id,
      color: b.badge_color
    })),
    ...existingAccounts
      .filter(a => !enabledBanks.some(b => b.name === a.account_name) && a.account_name !== 'Auto')
      .map(a => ({
        id: a.account_name,
        label: a.account_name,
        isCustom: true
      }))
  ];

  // Sync queueRef with state
  const updateQueue = (updater) => {
    setFileQueue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      queueRef.current = next;
      return next;
    });
  };

  const enqueueFiles = (filesList, targetAccount = null) => {
    if (!filesList || filesList.length === 0) return;
    const newItems = Array.from(filesList).map((item, idx) => {
      const file = item.file || item;
      const accountForFile = item.account || targetAccount || selectedAccount;
      return {
        id: `${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        account: accountForFile,
        status: 'pending', // 'pending' | 'processing' | 'completed' | 'error'
        result: null,
        error: null,
      };
    });

    updateQueue(prev => [...prev, ...newItems]);
  };

  const updateItemAccount = (id, newAccount) => {
    updateQueue(prev => prev.map(it => it.id === id && it.status === 'pending' ? { ...it, account: newAccount } : it));
  };

  // Watch queue and trigger worker if pending files exist and not running
  useEffect(() => {
    const hasPending = queueRef.current.some(it => it.status === 'pending');
    if (hasPending && !isProcessingRef.current) {
      processNextItem();
    }
  }, [fileQueue]);

  const processNextItem = async () => {
    if (isProcessingRef.current) return;

    const pendingIndex = queueRef.current.findIndex(it => it.status === 'pending');
    if (pendingIndex === -1) {
      setIsProcessingQueue(false);
      isProcessingRef.current = false;
      return;
    }

    const currentItem = queueRef.current[pendingIndex];
    setIsProcessingQueue(true);
    isProcessingRef.current = true;

    // Mark current item as processing
    updateQueue(prev => prev.map(it => it.id === currentItem.id ? { ...it, status: 'processing' } : it));

    try {
      const formData = new FormData();
      formData.append('file', currentItem.file);
      formData.append('account', currentItem.account || 'Auto');

      const res = await authFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Error al procesar el archivo');
      }

      // Mark success
      updateQueue(prev => prev.map(it => it.id === currentItem.id ? {
        ...it,
        status: 'completed',
        result: data,
        detectedAccount: data.account_detected || currentItem.account
      } : it));

      // Accumulate stats
      setAggregateStats(prev => {
        const base = prev || {
          totalFiles: 0,
          imported: 0,
          duplicates_skipped: 0,
          flagged_doubts: 0,
          months: {},
          accounts: [],
          fund_subs_updated: 0
        };

        const accountsSet = new Set([...base.accounts, currentItem.account]);
        if (data.account_detected) accountsSet.add(data.account_detected);

        const newMonths = { ...base.months };
        if (data.breakdown_by_month) {
          Object.entries(data.breakdown_by_month).forEach(([m, count]) => {
            newMonths[m] = (newMonths[m] || 0) + count;
          });
        }

        return {
          totalFiles: base.totalFiles + 1,
          imported: base.imported + (data.imported || 0),
          duplicates_skipped: base.duplicates_skipped + (data.duplicates_skipped || 0),
          flagged_doubts: base.flagged_doubts + (data.flagged_doubts || 0),
          fund_subs_updated: base.fund_subs_updated + (data.fund_subs_updated || 0),
          months: newMonths,
          accounts: Array.from(accountsSet),
          latestMonth: data.most_frequent_month || base.latestMonth
        };
      });

      if (onUploadComplete) {
        onUploadComplete(data.most_frequent_month || data.month_detected || currentItem.month);
      }

    } catch (err) {
      console.error('Error importing file in batch:', err);
      updateQueue(prev => prev.map(it => it.id === currentItem.id ? {
        ...it,
        status: 'error',
        error: err.message
      } : it));

      setAggregateStats(prev => {
        const base = prev || {
          totalFiles: 0,
          imported: 0,
          duplicates_skipped: 0,
          flagged_doubts: 0,
          months: {},
          accounts: [],
          fund_subs_updated: 0
        };
        return {
          ...base,
          totalFiles: base.totalFiles + 1
        };
      });
    } finally {
      isProcessingRef.current = false;
      // Trigger next item in sequence
      setTimeout(() => {
        processNextItem();
      }, 150);
    }
  };

  const removeItemFromQueue = (id) => {
    updateQueue(prev => prev.filter(it => it.id !== id));
  };

  const clearCompleted = () => {
    updateQueue(prev => prev.filter(it => it.status !== 'completed'));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      enqueueFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      enqueueFiles(e.target.files);
    }
  };

  const handleAddCustomAccount = (e) => {
    e.preventDefault();
    const trimmed = customAccountName.trim();
    if (!trimmed) return;
    setSelectedAccount(trimmed);
    setCustomAccountName('');
    setIsCustomOpen(false);
  };

  const handleLoadSample = (bankName, sampleCsvContent) => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], `${bankName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_extracto.csv`);
    enqueueFiles([{ file, account: bankName }]);
  };

  const handleLoadMultiSample = () => {
    const toEnqueue = [];
    const isEnabled = (bId) => enabledBanks.some(b => b.id === bId);

    if (isEnabled('amex')) {
      const blobAmex = new Blob([REAL_AMEX_SAMPLE], { type: 'text/csv;charset=utf-8;' });
      toEnqueue.push({ file: new File([blobAmex], 'amex_platinum_extracto.csv'), account: 'American Express' });
    }
    if (isEnabled('santander')) {
      const blobSantander = new Blob([REAL_SANTANDER_SAMPLE], { type: 'text/csv;charset=utf-8;' });
      toEnqueue.push({ file: new File([blobSantander], 'santander_extracto.csv'), account: 'Banco Santander' });
    }
    if (isEnabled('iberia_cards')) {
      const blobIberia = new Blob([REAL_IBERIA_CARDS_SAMPLE], { type: 'text/csv;charset=utf-8;' });
      toEnqueue.push({ file: new File([blobIberia], 'iberia_cards_extracto.csv'), account: 'Iberia Cards' });
    }

    if (toEnqueue.length > 0) {
      enqueueFiles(toEnqueue);
    }
  };

  const totalInQueue = fileQueue.length;
  const completedInQueue = fileQueue.filter(it => it.status === 'completed').length;
  const failedInQueue = fileQueue.filter(it => it.status === 'error').length;
  const pendingInQueue = fileQueue.filter(it => it.status === 'pending').length;
  const progressPercent = totalInQueue > 0 ? Math.round(((completedInQueue + failedInQueue) / totalInQueue) * 100) : 0;

  const isBankSupported = (bankId) => enabledBanks.some(b => b.id === bankId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">📥</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f0f0f0]">
              Importar Extractos Bancarios
            </h1>
            <p className="text-xs text-[#787774] dark:text-[#9c9c9c]">
              Sube uno o varios extractos en CSV o Excel. El sistema los apila y procesa archivo por archivo con prevención inteligente de duplicados.
            </p>
          </div>
        </div>
      </div>

      {/* Account Selection */}
      <div className="p-4 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            Cuenta o Tarjeta seleccionada para subir:
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              💡 Recomendado: Auto-detectar para clasificar bancos según el contenido del archivo
            </span>
            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('settings')}
              className="text-[11px] flex items-center gap-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline cursor-pointer"
            >
              <Settings className="w-3 h-3" /> Configurar Bancos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => setSelectedAccount(acc.id)}
              className={`p-2.5 rounded-md text-xs font-medium border text-center transition-all cursor-pointer truncate ${
                selectedAccount === acc.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-xs font-semibold'
                  : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700/80'
              }`}
            >
              {acc.label}
            </button>
          ))}
          
          <button
            type="button"
            onClick={() => setIsCustomOpen(true)}
            className="p-2.5 rounded-md text-xs font-medium border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" /> Otra Cuenta...
          </button>
        </div>

        {/* Custom Account Modal / Input Popover */}
        {isCustomOpen && (
          <form onSubmit={handleAddCustomAccount} className="pt-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ej. BBVA Nómina, Revolut, CaixaBank..."
              value={customAccountName}
              onChange={(e) => setCustomAccountName(e.target.value)}
              autoFocus
              className="flex-1 px-3 py-1.5 text-xs rounded-md bg-neutral-50 dark:bg-[#2b2b2b] border border-neutral-300 dark:border-neutral-700 outline-none text-neutral-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
            >
              Usar Cuenta
            </button>
            <button
              type="button"
              onClick={() => setIsCustomOpen(false)}
              className="px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 cursor-pointer"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Drag & Drop Box (Supports Multiple Files) */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-[#d6d6d4] dark:border-[#3d3d3d] hover:border-neutral-400 dark:hover:border-neutral-500 bg-white dark:bg-[#242424]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.xslx,.xlsm,.xltx,.ods"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
            {isProcessingQueue ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {isProcessingQueue
                ? `Procesando lote de archivos (${completedInQueue + failedInQueue + 1}/${totalInQueue})...`
                : 'Arrastra y suelta varios archivos aquí, o haz clic para explorar'}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Admite Santander, Iberia Cards, Amex, N26, MyInvestor y formatos genéricos (CSV, Excel .xlsx, .xls)
            </p>
          </div>
          <div className="flex items-center space-x-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full">
            <span>Cuenta asignada: <strong>{selectedAccount}</strong></span>
          </div>
        </div>
      </div>

      {/* Aggregate Batch Stats Banner */}
      {aggregateStats && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-indigo-950/30 border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                Resumen del Procesamiento en Lote
              </h3>
            </div>
            {aggregateStats.latestMonth && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (setSelectedMonth) setSelectedMonth(aggregateStats.latestMonth);
                    if (setActiveTab) setActiveTab('transactions');
                  }}
                  className="text-xs flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs font-bold cursor-pointer transition-all"
                >
                  <span>Ver Transacciones ({aggregateStats.imported})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (setSelectedMonth) setSelectedMonth(aggregateStats.latestMonth);
                    if (setActiveTab) setActiveTab('dashboard');
                  }}
                  className="text-xs flex items-center space-x-1 px-3 py-1.5 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 shadow-2xs font-semibold cursor-pointer"
                >
                  <span>Ver Dashboard</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 bg-white/70 dark:bg-neutral-900/60 rounded-lg border border-emerald-100 dark:border-neutral-800">
              <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                +{aggregateStats.imported}
              </div>
              <div className="text-[11px] text-neutral-500">Transacciones Importadas</div>
            </div>

            <div className="p-2.5 bg-white/70 dark:bg-neutral-900/60 rounded-lg border border-emerald-100 dark:border-neutral-800">
              <div className="text-lg font-extrabold text-neutral-700 dark:text-neutral-300 font-mono">
                {aggregateStats.duplicates_skipped}
              </div>
              <div className="text-[11px] text-neutral-500">Duplicados Omitidos</div>
            </div>

            <div className="p-2.5 bg-white/70 dark:bg-neutral-900/60 rounded-lg border border-emerald-100 dark:border-neutral-800">
              <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {aggregateStats.flagged_doubts}
              </div>
              <div className="text-[11px] text-neutral-500">Dudas para Revisión</div>
            </div>

            <div className="p-2.5 bg-white/70 dark:bg-neutral-900/60 rounded-lg border border-emerald-100 dark:border-neutral-800">
              <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                {aggregateStats.fund_subs_updated}
              </div>
              <div className="text-[11px] text-neutral-500">Aportaciones a Fondos o Acciones</div>
            </div>
          </div>

          {aggregateStats.months && Object.keys(aggregateStats.months).length > 0 && (
            <div className="pt-1 flex items-center space-x-2 flex-wrap text-xs text-neutral-600 dark:text-neutral-300">
              <span className="font-semibold text-[11px] text-neutral-500 uppercase tracking-wider">
                Distribución por meses:
              </span>
              {Object.entries(aggregateStats.months).map(([m, cnt]) => (
                <button
                  key={m}
                  onClick={() => {
                    if (setSelectedMonth) setSelectedMonth(m);
                    if (setActiveTab) setActiveTab('transactions');
                  }}
                  className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-mono hover:border-indigo-500 cursor-pointer"
                >
                  {m}: <strong>{cnt}</strong> tx
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Queue Section */}
      {fileQueue.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs overflow-hidden">
          {/* Queue Header & Global Controls */}
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Cola de Archivos ({fileQueue.length})</span>
              </h3>
              <p className="text-[11px] text-neutral-500">
                {completedInQueue} completados • {pendingInQueue} pendientes • {failedInQueue} con error
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {completedInQueue > 0 && (
                <button
                  onClick={clearCompleted}
                  className="px-2.5 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md cursor-pointer"
                >
                  Limpiar terminados
                </button>
              )}

              {pendingInQueue > 0 && !isProcessingQueue && (
                <button
                  onClick={processNextItem}
                  className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Procesar pendientes ({pendingInQueue})</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {totalInQueue > 0 && (
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Items List */}
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[420px] overflow-y-auto">
            {fileQueue.map((item) => (
              <div 
                key={item.id}
                className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                  item.status === 'processing'
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                    : item.status === 'completed'
                    ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                    : item.status === 'error'
                    ? 'bg-red-50/30 dark:bg-red-950/10'
                    : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40'
                }`}
              >
                {/* File info */}
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="mt-0.5">
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : item.status === 'error' ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : item.status === 'processing' ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <p className="font-semibold text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center space-x-2 text-[11px] text-neutral-500">
                      <span>{item.size}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <span>Cuenta:</span>
                        {item.status === 'pending' ? (
                          <select
                            value={item.account}
                            onChange={(e) => updateItemAccount(item.id, e.target.value)}
                            className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5 cursor-pointer"
                          >
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.label}</option>
                            ))}
                          </select>
                        ) : (
                          <strong className="text-neutral-700 dark:text-neutral-300">{item.account}</strong>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status & actions */}
                <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                  {item.status === 'pending' && (
                    <div className="flex items-center space-x-1.5">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[11px]">
                        <Clock className="w-3 h-3" />
                        <span>En cola</span>
                      </span>
                      <button
                        onClick={() => removeItemFromQueue(item.id)}
                        className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer rounded"
                        title="Eliminar de la cola"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {item.status === 'processing' && (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-medium text-[11px]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Procesando...</span>
                    </span>
                  )}

                  {item.status === 'completed' && item.result && (
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-mono">
                        <span>+{item.result.imported} nuevas</span>
                      </span>
                      {item.result.duplicates_skipped > 0 && (
                        <span className="text-[11px] text-neutral-500">
                          ({item.result.duplicates_skipped} dup.)
                        </span>
                      )}
                      {item.result.flagged_doubts > 0 && (
                        <button
                          onClick={() => setActiveTab && setActiveTab('clarifications')}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-semibold cursor-pointer"
                        >
                          <span>{item.result.flagged_doubts} dudas</span>
                        </button>
                      )}
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 text-[11px] max-w-xs truncate" title={item.error}>
                        {item.error}
                      </span>
                      <button
                        onClick={() => removeItemFromQueue(item.id)}
                        className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test with Realistic Samples */}
      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#202020] border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-base">🧪</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Demostración y Pruebas con Extractos de Ejemplo
            </h3>
          </div>

          <button
            onClick={handleLoadMultiSample}
            disabled={isProcessingQueue}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-semibold rounded-md shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Probar Lote Multi-Banco</span>
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Haz clic en cualquiera de estos extractos de muestra para encolar o prueba el lote multi-banco:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {isBankSupported('santander') && (
            <button
              onClick={() => handleLoadSample('Banco Santander', REAL_SANTANDER_SAMPLE)}
              disabled={isProcessingQueue}
              className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-600">Santander Online</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/60 font-mono">20 mov.</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                Supermercados, alquiler vivienda, nómina, transferencias...
              </p>
            </button>
          )}

          {isBankSupported('santander') && (
            <button
              onClick={() => handleLoadSample('Tarjeta Santander', REAL_SANTANDER_CREDIT_SAMPLE)}
              disabled={isProcessingQueue}
              className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-600">Santander Tarjeta</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 dark:bg-orange-950/60 font-mono">12 mov.</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                Compras moda, devoluciones, fraccionamientos, aparcamiento...
              </p>
            </button>
          )}

          {isBankSupported('iberia_cards') && (
            <button
              onClick={() => handleLoadSample('Iberia Cards', REAL_IBERIA_CARDS_SAMPLE)}
              disabled={isProcessingQueue}
              className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-700 dark:text-amber-400">Iberia Cards</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 font-mono">5 mov.</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                Restaurantes, gasolineras, cuota de tarjeta (liquidación 272,90€).
              </p>
            </button>
          )}

          {isBankSupported('amex') && (
            <button
              onClick={() => handleLoadSample('American Express', REAL_AMEX_SAMPLE)}
              disabled={isProcessingQueue}
              className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-700 dark:text-blue-400">Amex Platinum</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 font-mono">7 mov.</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                Signos auto-invertidos, compras online, pagos recibidos...
              </p>
            </button>
          )}

          {isBankSupported('n26') && (
            <button
              onClick={() => handleLoadSample('N26', REAL_N26_SAMPLE)}
              disabled={isProcessingQueue}
              className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-600 dark:text-teal-400">N26</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/60 font-mono">18 mov.</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                Viajes, multidivisa, comisiones, transferencias entre amigos...
              </p>
            </button>
          )}

          {isBankSupported('myinvestor') && (
            <button
              onClick={() => handleLoadSample('MyInvestor', REAL_MYINVESTOR_SAMPLE)}
              disabled={isProcessingQueue}
              className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">MyInvestor</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 font-mono">13 mov.</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                Fondos de inversión, aportaciones periódicas, cuenta remunerada...
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
