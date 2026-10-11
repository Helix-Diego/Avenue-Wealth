import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Upload, 
  CreditCard, 
  HelpCircle, 
  Briefcase, 
  TrendingUp, 
  Settings, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  FileSpreadsheet, 
  ShieldCheck, 
  Search, 
  ChevronRight, 
  ChevronDown,
  ExternalLink, 
  Lightbulb,
  Zap,
  Target,
  Layers,
  Building,
  FileText,
  Folder,
  FolderOpen,
  X,
  Sliders,
  DollarSign,
  PieChart,
  EyeOff
} from 'lucide-react';

export default function GuideView({ setActiveTab }) {
  const [selectedArticleId, setSelectedArticleId] = useState('getting_started');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({
    setup: true,
    banks: true,
    import: true,
    transactions: true,
    doubts: true,
    company: true,
    investments: true,
    goals: true,
    chat: true
  });

  // Tree Structure Data Definition
  const knowledgeTree = useMemo(() => [
    {
      id: 'setup',
      title: '1. Puesta en Marcha & Ajustes',
      icon: Sparkles,
      color: 'text-violet-600 dark:text-violet-400',
      articles: [
        {
          id: 'getting_started',
          title: '1.1 Arquitectura 100% Local',
          summary: 'La aplicación se ejecuta de forma totalmente local en tu ordenador sin enviar tus transacciones a la nube.',
          targetTab: 'dashboard',
          tabButtonLabel: 'Ir a Visión General',
          tags: ['local', 'privacidad', 'sqlite', 'instalación'],
          readingTime: '2 min',
          sections: [
            {
              heading: '¿Por qué 100% Local?',
              content: 'Spend Agent ha sido concebido desde el principio con la máxima premisa de privacidad financiera. A diferencia de las plataformas habituales de agregación bancaria que almacenan tus cuentas en servidores de terceros, Spend Agent guarda absolutamente todo en una base de datos local SQLite (`data/bank_agent.db`) en tu propio disco duro.'
            },
            {
              heading: 'Componentes del Sistema',
              bullets: [
                'Backend Motor (Python & FastAPI): Procesa archivos de extractos, calcula la matriz financiera y ejecuta reglas en milisegundos.',
                'Base de Datos SQLite Local: Transacciones, clasificaciones, reglas aprendidas y cartera de inversión.',
                'Frontend React & Tailwind: Interfaz moderna inspirada en Notion con soporte para Modo Claro y Modo Oscuro.',
                'Cero telemetría ni cookies de rastreo: Tu información económica no sale jamás de tu máquina.'
              ]
            },
            {
              type: 'tip',
              title: 'Copia de Seguridad Rápida',
              text: 'Para hacer una copia de seguridad o transferir tus datos a otro ordenador, solo necesitas copiar la carpeta "data/" de la aplicación.'
            }
          ]
        },
        {
          id: 'onboarding_settings',
          title: '1.2 Asistente Inicial & Ajustes',
          summary: 'Configura tu nombre de espacio, saldo inicial de efectivo y preferencias de la aplicación.',
          targetTab: 'settings',
          tabButtonLabel: 'Ir a Ajustes',
          tags: ['onboarding', 'perfil', 'configuración'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Asistente de Bienvenida (Onboarding)',
              content: 'Al abrir Spend Agent por primera vez, verás la pantalla de Ajustes para guiarte en los primeros pasos:'
            },
            {
              bullets: [
                'Nombre del Espacio: Personaliza el nombre que aparece en la cabecera (por defecto "Mi Espacio").',
                'Saldo Inicial en Efectivo: Si tienes efectivo guardado fuera de cuentas bancarias, puedes registrarlo para sumarlo a tu capital global.',
                'Módulo de Gastos de Empresa: Si eres empleado o autónomo y adelantas gastos que luego te reembolsan, puedes activarlo o desactivarlo según tus necesidades.',
                'Reseteo Completo de Datos: Si deseas empezar de cero en cualquier momento, el botón "Limpiar Base de Datos" en Ajustes vacía los movimientos dejando tus configuraciones listas.'
              ]
            }
          ]
        },
        {
          id: 'ai_deepseek',
          title: '1.3 Conexión con IA DeepSeek',
          summary: 'Conecta opcionalmente un modelo inteligente para categorizar comercios no vistos y auditar tus finanzas.',
          targetTab: 'settings',
          tabButtonLabel: 'Configurar API Key',
          tags: ['ia', 'deepseek', 'api key', 'asistente'],
          readingTime: '3 min',
          sections: [
            {
              heading: 'Inteligencia Híbrida: Reglas Locales + IA Opcional',
              content: 'Spend Agent no requiere obligatoriamente una clave de IA para funcionar: incluye más de 50 reglas deterministas para supermercados, gasolina, suministros, streaming y nóminas. Sin embargo, si configuras una clave API de DeepSeek, desbloquearás superpoderes:'
            },
            {
              bullets: [
                'Clasificación de comercios raros o extranjeros que no coinciden con ninguna regla.',
                'Detección inteligente de conceptos ambiguos con preguntas dirigidas en la "Cola de Dudas".',
                'Chat interactivo para responder a preguntas como "¿Cuánto he gastado este mes en ocio?" o "¿Qué suscripciones puedo recortar?".'
              ]
            },
            {
              type: 'tip',
              title: 'Obtener Clave de DeepSeek',
              text: 'Puedes generar una clave API en platform.deepseek.com. La API de DeepSeek-V3/chat es sumamente económica (unos céntimos por miles de transacciones analizadas).'
            }
          ]
        }
      ]
    },
    {
      id: 'banks',
      title: '2. Bancos Soportados & Alias',
      icon: Building,
      color: 'text-blue-600 dark:text-blue-400',
      articles: [
        {
          id: 'banks_activation',
          title: '2.1 Activación Selectiva de Bancos',
          summary: 'Por seguridad e higiene visual, todos los bancos inician desactivados hasta que actives los tuyos.',
          targetTab: 'settings',
          tabButtonLabel: 'Gestionar Bancos en Ajustes',
          tags: ['bancos', 'activar', 'interruptor'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Control Total de tus Entidades',
              content: 'En la sección "Ajustes > Bancos y Cuentas Soportadas", encontrarás el listado completo de entidades integradas. Al iniciar la aplicación, todos los bancos aparecen desactivados. Solo tienes que activar el interruptor de aquellos en los que tengas cuenta o tarjeta activa.'
            },
            {
              bullets: [
                'Filtro limpio en Transacciones: Los bancos desactivados no ensucian la lista de filtros de cuentas.',
                'Subida protegida: Al importar un extracto, el importador prioriza tus bancos habilitados.',
                'Activación en 1 click: Puedes activar o pausar cualquier banco en cualquier instante sin perder tus transacciones.'
              ]
            }
          ]
        },
        {
          id: 'bank_aliases',
          title: '2.2 Alias Personalizados para Cuentas',
          summary: 'Pon nombres comprensibles a tus cuentas y tarjetas (ej. "Nómina Santander", "Revolut Viajes").',
          targetTab: 'settings',
          tabButtonLabel: 'Definir Alias en Ajustes',
          tags: ['alias', 'cuentas', 'etiquetas', 'filtros'],
          readingTime: '2 min',
          sections: [
            {
              heading: '¿Qué es un Alias de Banco?',
              content: 'A menudo los extractos bancarios exportan nombres técnicos o números de contrato enmascarados como "ES76 0049 1500...". Para facilitarte la vida, Spend Agent te permite asignar un Alias Personalizado a cada entidad en la pestaña Ajustes.'
            },
            {
              bullets: [
                'Reflejo en Transacciones: En la tabla de movimientos, la columna "Cuenta / Tarjeta" mostrará tu alias en lugar del texto crudo del banco.',
                'Pestañas de Filtro Inteligentes: En la parte superior de Transacciones, verás botones de filtro directo con tus alias personalizados.',
                'Búsqueda unificada: Si buscas por tu alias en cualquier buscador de la app, coincidirá inmediatamente con todas sus operaciones.'
              ]
            }
          ]
        },
        {
          id: 'supported_entities',
          title: '2.3 CaixaBank, Revolut, ING y Más',
          summary: 'Guía específica de entidades con compatibilidad probada y reglas particulares.',
          targetTab: 'import',
          tabButtonLabel: 'Probar Importación',
          tags: ['caixabank', 'revolut', 'ing', 'santander', 'amex'],
          readingTime: '3 min',
          sections: [
            {
              heading: 'Entidades Bancarias Certificadas (100% de Pruebas Superadas)',
              content: 'Spend Agent incluye parsers dedicados capaces de digerir las peculiaridades de los extractos españoles y europeos:'
            },
            {
              bullets: [
                'CaixaBank: Admite ficheros CSV y Excel con líneas de cabecera desplazadas, columnas de saldo y divisas pegadas al importe (ej. "-20,00EUR").',
                'Revolut: Soporta extractos multidivisa (EUR, CHF, USD), redondeos de ahorro y recargas de cuenta ("Top-Up"), clasificándolas automáticamente como traspaso interno neutro.',
                'ING Direct: Maneja fechas de operación y valor, columnas "F. VALOR" e importes con signo europeo.',
                'Banco Santander: Formato estándar de cuentas corrientes y tarjetas con saldo.',
                'American Express: Normaliza importes con signos invertidos de cargos y abonos de puntos.',
                'Iberia Cards: Compatible con extractos de tarjetas Icon Visa y Mastercard con deduplicación de recibos domiciliados.',
                'Formato Genérico: Admite cualquier tabla de Excel o CSV que contenga columnas identificables como Fecha, Concepto e Importe.'
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'import',
      title: '3. Importación de Extractos',
      icon: Upload,
      color: 'text-emerald-600 dark:text-emerald-400',
      articles: [
        {
          id: 'import_formats',
          title: '3.1 Formatos CSV, XLSX y XLS',
          summary: 'Soporte universal para cualquier tipo de exportación que te ofrezca tu banca online.',
          targetTab: 'import',
          tabButtonLabel: 'Ir al Importador',
          tags: ['formatos', 'csv', 'xlsx', 'xls', 'excel'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Importa tus Ficheros Directamente',
              content: 'No necesitas convertir tus archivos a mano ni cambiar formatos. La aplicación acepta arrastrar y soltar:'
            },
            {
              bullets: [
                'Ficheros Excel Modernos (.xlsx): La exportación habitual de CaixaBank, ING, BBVA y Santander.',
                'Ficheros Excel Clásicos (.xls): Hojas de cálculo en formato binario antiguo BIFF8.',
                'Ficheros de Texto Plano (.csv): Con punto y coma (;), coma (,) o tabulaciones, e importes con coma decimal española (12,50) o punto anglosajón (12.50).'
              ]
            },
            {
              type: 'tip',
              title: 'Subida Múltiple en Lote',
              text: 'Puedes seleccionar varios ficheros a la vez (por ejemplo, el extracto de CaixaBank y el de Revolut simultáneamente) y la app procesará ambos en paralelo.'
            }
          ]
        },
        {
          id: 'deduplication',
          title: '3.2 Deduplicación & Protección Anti-Duplicados',
          summary: 'Importa extractos solapados tantas veces como quieras sin preocuparte de duplicar apuntes.',
          targetTab: 'import',
          tabButtonLabel: 'Ver Historial de Importación',
          tags: ['deduplicación', 'sha256', 'seguridad', 'reimportar'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Huella Digital Criptográfica (SHA-256)',
              content: 'Para garantizar que nunca se dupliquen gastos si descargas extractos que se solapan en fechas, Spend Agent calcula una huella hash SHA-256 única para cada movimiento compuesta por:'
            },
            {
              bullets: [
                'Fecha exacta del movimiento.',
                'Concepto normalizado del banco.',
                'Importe con signo.',
                'Cuenta o tarjeta emisora.'
              ]
            },
            {
              content: 'Si un movimiento ya existe en la base de datos, el sistema lo detecta y lo descarta silenciosamente, importando únicamente las operaciones nuevas.'
            }
          ]
        },
        {
          id: 'parser_architecture',
          title: '3.3 Arquitectura de Parsers & Firmas Estructurales',
          summary: 'Cómo Spend Agent procesa extractos de múltiples bancos sin almacenar extractos personales en el sistema.',
          targetTab: 'import',
          tabButtonLabel: 'Ir a Importar Extractos',
          tags: ['parser', 'firmas', 'caixabank', 'revolut', 'ing', 'santander', 'privacidad'],
          readingTime: '3 min',
          sections: [
            {
              heading: '¿Cómo reconoce la estructura de tus bancos sin guardar extractos?',
              content: 'Por principios estrictos de privacidad y neutralidad, Spend Agent NO almacena tus extractos bancarios personales en el código ni en el paquete de distribución. La aplicación viaja 100% vacía y segura.'
            },
            {
              heading: 'Firmas Estructurales Deterministas (Signature Parsers)',
              content: 'En su lugar, el motor de backend (`backend/bank_parser.py`) incorpora una biblioteca de firmas estructurales y expresiones regulares que reconocen automáticamente el diseño y peculiaridades de cada banco:'
            },
            {
              bullets: [
                'Banco Santander: Detecta extractos de cuenta corriente y tarjeta de crédito por sus columnas de fecha de operación, fecha valor e importes con signo estándar.',
                'CaixaBank: Identifica delimitadores por punto y coma (;), cabeceras de Concepto;Fecha;Importe;Saldo y codificaciones especiales ISO-8859/UTF-8.',
                'Revolut: Soporta extractos multidivisa (EUR, USD, CHF, etc.), cabeceras en inglés y español ("Started Date", "Completed Date", "State"), transferencias instantáneas y redondeos ("Pocket / Vault Vaults").',
                'ING Direct: Reconoce firmas "Movimientos de la cuenta", columnas de "F. Valor" y "F. Operación".',
                'N26: Soporta tanto fechas formateadas como números de fecha serial de Excel (ej. 46038) y mapea las columnas internacionales de Partner Name.',
                'American Express: Detecta automáticamente el formato Amex e invierte los signos contables para que los consumos computen como gasto negativo y los pagos como abonos.',
                'Iberia Cards: Detección de liquidaciones de tarjeta y cargos mensuales de Visa/Mastercard.',
                'MyInvestor: Procesamiento de cuentas de inversión, aportaciones a fondos indexados (Fidelity MSCI World) y cuentas remuneradas.',
                'Formato Genérico: Motor heurístico universal que permite importar cualquier archivo CSV o Excel que tenga al menos Fecha, Concepto e Importe.'
              ]
            },
            {
              type: 'tip',
              title: 'Prueba Rápida con Formatos de Muestra',
              text: 'En la pantalla de importación, dispones de botones de prueba rápida ("Santander", "Amex", "Iberia Cards", "N26", "MyInvestor", "CaixaBank", "Revolut", etc.) que cargan extractos sintéticos de ejemplo con un solo clic para comprobar cómo responde el motor.'
            }
          ]
        }
      ]
    },
    {
      id: 'transactions',
      title: '4. Transacciones & Filtros',
      icon: CreditCard,
      color: 'text-amber-600 dark:text-amber-400',
      articles: [
        {
          id: 'filtering_search',
          title: '4.1 Buscador Inteligente y Filtros Rápidos',
          summary: 'Encuentra cualquier gasto en menos de un segundo por comercio, importe o etiqueta.',
          targetTab: 'transactions',
          tabButtonLabel: 'Ir a Transacciones',
          tags: ['buscador', 'filtros', 'pills', 'cuentas'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Buscador Prominente en la Cabecera',
              content: 'En la pestaña "Transacciones", dispones de una barra de búsqueda destacada con botones rápidos (pills) para filtrar instantáneamente:'
            },
            {
              bullets: [
                'Búsqueda por texto: Escribe cualquier comercio (ej. "Mercadona", "Netflix", "Gasolina") y se filtrará en vivo.',
                'Filtro por Banco / Alias: Selecciona "Todas", o haz clic directamente en el chip de tu cuenta (ej. "Nómina Principal").',
                'Filtro por Categoría: Aísla partidas específicas como "Alimentación", "Restaurantes" o "Suministros".',
                'Filtro por Mes: Navega entre periodos mensuales o visualiza el histórico completo seleccionando "Todos los meses".'
              ]
            }
          ]
        },
        {
          id: 'batch_operations',
          title: '4.2 Edición Masiva y Sistema Deshacer (Undo)',
          summary: 'Recategoriza o gestiona decenas de movimientos a la vez y revierte con un solo clic si te equivocas.',
          targetTab: 'transactions',
          tabButtonLabel: 'Probar en Transacciones',
          tags: ['masivo', 'lote', 'undo', 'deshacer'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Barra de Acciones Masivas',
              content: 'Al marcar la casilla de verificación de una o varias transacciones, aparecerá una barra flotante inferior que te permite:'
            },
            {
              bullets: [
                'Cambiar categoría en lote: Asigna una nueva categoría a todas las transacciones marcadas a la vez.',
                'Eliminar en lote: Borra movimientos de prueba o apuntes no deseados con confirmación previa.',
                'Notificación Deshacer (Undo Toast): Tras aplicar cualquier cambio masivo, aparecerá un aviso con un botón "Deshacer" disponible durante 10 segundos para restaurar los valores anteriores.'
              ]
            }
          ]
        },
        {
          id: 'split_transactions',
          title: '4.3 Cortar / Dividir Transacción (Herramienta Split & Bizums)',
          summary: 'Desglosa cobros o pagos combinados como Bizums que agrupan varias transacciones distintas.',
          targetTab: 'transactions',
          tabButtonLabel: 'Ir a Transacciones',
          tags: ['split', 'cortar', 'bizum', 'desglose', 'tijeras', 'subtransacciones'],
          readingTime: '3 min',
          sections: [
            {
              heading: '¿Por qué es fundamental la herramienta de "Cortar Transacción"?',
              content: 'En la contabilidad del día a día, con frecuencia un único apunte bancario agrupa diferentes conceptos de gasto. El caso más típico y frecuente son los BIZUMS:'
            },
            {
              bullets: [
                'Bizum de Gastos Compartidos: Un amigo te transfiere 55 € por Bizum que incluye 35 € de una cena en un restaurante y 20 € de unas entradas de cine que adelantaste tú.',
                'Bizum con Gasto de Empresa: Envías o recibes un Bizum de 60 € donde 40 € son de compras personales y 20 € corresponden a un taxi o comida reembolsable por tu empresa.',
                'Compras en Grandes Superficies: Un ticket de 90 € en El Corte Inglés, Carrefour o Amazon que combina 50 € de alimentación y 40 € de ropa o electrónica.'
              ]
            },
            {
              heading: 'Cómo Cortar un Movimiento Paso a Paso con las Tijeras',
              content: 'Si dejas el Bizum o compra como un apunte único, distorsionará tus estadísticas por categoría. Con Spend Agent puedes cortarlo en segundos:'
            },
            {
              bullets: [
                '1. Localiza el movimiento: En la tabla de Transacciones, pulsa el icono de las Tijeras ("Desglosar movimiento en varias categorías") situado a la derecha de la fila.',
                '2. Añade las sub-partidas: Por defecto se divide en 2 partes, pero puedes pulsar "Añadir otra parte" para desglosarlo en 3, 4 o tantas como necesites.',
                '3. Asigna importes y categorías: Establece el importe exacto de cada fracción (ej. 35 € para "Restaurantes" y 20 € para "Entretenimiento").',
                '4. Etiquetado Reembolsable Individual: Si una de las fracciones corresponde a un gasto de tu empresa, puedes marcar la casilla "Gasto de Empresa Reembolsable" exclusivamente para esa parte.',
                '5. Control de Cuadre Matemático en Vivo: El modal te muestra en tiempo real el indicador "Restante por asignar". El botón de guardar sólo se activa cuando el total asignado coincide al 100% (al céntimo) con el importe bancario original.',
                '6. Resultado Contable Limpio: Al guardar, la transacción original se sustituye por las sub-partidas con el distintivo visual "Desglosado", manteniendo tu saldo cuadrado y tus categorías perfectas.'
              ]
            },
            {
              type: 'tip',
              title: 'Reversibilidad Total',
              text: 'Si en el futuro deseas re-agrupar el movimiento o eliminar una fracción, el sistema conserva el vínculo original en la base de datos.'
            }
          ]
        },
        {
          id: 'transfers_and_settlements',
          title: '4.4 Conciliación Bilateral de Traspasos & Liquidaciones',
          summary: 'Deduplica traspasos internos entre tus bancos y neutraliza recibos de tarjeta de crédito.',
          targetTab: 'transactions',
          tabButtonLabel: 'Ver Transacciones',
          tags: ['traspasos', 'liquidaciones', 'tarjetas', 'conciliación'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Vinculación Bilateral de Traspasos Propios',
              content: 'Cuando transfieres dinero entre tus propias cuentas (por ejemplo, de tu cuenta corriente a tu cuenta de ahorro o a Revolut), se generan dos movimientos: una salida en el banco origen y una entrada en el banco destino. El agente detecta ambas operaciones por fecha e importe y las vincula bilateralmente como un traspaso neutro para no inflar artificialmente tus ingresos ni tus gastos.'
            },
            {
              heading: 'Liquidación de Tarjetas de Crédito',
              content: 'Al pagar el recibo mensual de tu tarjeta de crédito (Iberia Cards, Amex o Santander Tarjeta), el dinero sale de tu cuenta corriente. Spend Agent neutraliza este cargo clasificándolo como "Liquidación Tarjetas", ya que cada compra individual ya fue computada el día en que se produjo con la tarjeta.'
            }
          ]
        }
      ]
    },
    {
      id: 'doubts',
      title: '5. Dudas del Agente & Aprendizaje',
      icon: HelpCircle,
      color: 'text-orange-600 dark:text-orange-400',
      articles: [
        {
          id: 'clarifications_queue',
          title: '5.1 Cola de Dudas para Gastos Ambiguos',
          summary: 'El agente te consulta únicamente cuando no está seguro de la clasificación de un comercio.',
          targetTab: 'clarifications',
          tabButtonLabel: 'Revisar Cola de Dudas',
          tags: ['dudas', 'clarificaciones', 'certeza'],
          readingTime: '2 min',
          sections: [
            {
              heading: '¿Cómo funciona la Cola de Dudas?',
              content: 'Cuando importas un extracto bancario con un comercio nuevo o una descripción confusa, el agente calcula un grado de confianza. Si la certeza es inferior al 85%, el movimiento se añade a la pestaña "Dudas del Agente" con una insignia amarilla en el menú lateral.'
            },
            {
              bullets: [
                'Pregunta directa y concisa: El agente te explica por qué duda (ej. "¿Este cargo en Repsol es combustible o compra de tienda?").',
                'Opciones rápidas con 1 clic: Puedes elegir la categoría sugerida o seleccionar otra de la lista.',
                'Feedback inmediato: En cuanto resuelves la duda, la transacción se actualiza instantáneamente en todos los informes.'
              ]
            }
          ]
        },
        {
          id: 'continuous_learning',
          title: '5.2 Aprendizaje Automático de Reglas',
          summary: 'Cada duda que resuelves se convierte en una regla permanente para no volverte a preguntar nunca más.',
          targetTab: 'settings',
          tabButtonLabel: 'Ver Reglas en Ajustes',
          tags: ['reglas', 'aprendizaje', 'memoria', 'retroactivo'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Memoria Local del Agente',
              content: 'Al resolver una duda en la cola, Spend Agent no solo actualiza ese movimiento, sino que guarda una regla en la tabla `category_rules` de la base de datos local y aplica el aprendizaje retroactivamente a cualquier otra transacción similar que comparta el mismo patrón de comercio.'
            },
            {
              bullets: [
                'Extractos futuros automáticos: La próxima vez que importes extractos con ese comercio, se clasificará al 100% de certeza sin preguntarte.',
                'Edición de Reglas: Puedes consultar y gestionar todas tus reglas guardadas en la pestaña "Ajustes > Reglas de Categorización".'
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'company',
      title: '6. Gastos Reembolsables de Empresa',
      icon: Briefcase,
      color: 'text-sky-600 dark:text-sky-400',
      articles: [
        {
          id: 'company_enable_disable',
          title: '6.1 Activación o Desactivación Completa',
          summary: 'Si no gestionas gastos de trabajo reembolsables, apágalo y desaparecerá 100% de la aplicación.',
          targetTab: 'settings',
          tabButtonLabel: 'Ajustes de Empresa',
          tags: ['empresa', 'activar', 'desactivar', 'ocultar', 'menú'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Desaparición Total cuando está Desactivado',
              content: 'Entendemos que muchos usuarios utilizan Spend Agent estrictamente para su economía doméstica y no necesitan adelantar gastos corporativos. Por eso, si en "Ajustes" desactivas el interruptor "Habilitar Gastos Reembolsables":'
            },
            {
              bullets: [
                'La pestaña "Gastos Reembolsables" desaparece por completo del menú lateral izquierdo.',
                'En el Dashboard y Portfolio se ocultan los indicadores y tarjetas de pendientes de cobro.',
                'En la tabla de Transacciones se oculta la columna "Gasto Empresa" y el filtro de tipo.',
                'El categorizador inteligente no te preguntará si tus gastos de gasolina o restaurantes son adelantos laborales.'
              ]
            },
            {
              type: 'tip',
              title: 'Reactivación Sencilla',
              text: 'Si en el futuro empiezas a viajar o adelantar gastos para tu empresa, puedes volver a activarlo en Ajustes en cualquier momento con un solo clic.'
            }
          ]
        },
        {
          id: 'company_lifecycle',
          title: '6.2 Ciclo de Reembolsos y Vinculación',
          summary: 'Control de pagos adelantados, balance pendiente y conciliación con la transferencia de la empresa.',
          targetTab: 'company',
          tabButtonLabel: 'Ir a Gastos Reembolsables',
          tags: ['adelantos', 'reembolsos', 'bmc', 'empresa', 'cobrado'],
          readingTime: '3 min',
          sections: [
            {
              heading: 'Flujo de Trabajo para Gastos Reembolsables',
              content: 'Cuando el módulo está activado, puedes llevar un control milimétrico de cuánto dinero te debe tu empresa por viajes, comidas de trabajo, hoteles o billetes de tren:'
            },
            {
              bullets: [
                'Marcar como Reembolsable: Marca los tickets pagados de tu bolsillo que tu empresa te debe devolver.',
                'Estado Pendiente vs Cobrado: El sistema calcula en vivo el importe acumulado que tienes pendiente de cobrar.',
                'Vinculación de la Transferencia: Al recibir la transferencia bancaria con el concepto de liquidación de gastos, puedes vincularla para saldar los movimientos y dejarlos como "Cobrados".'
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'investments',
      title: '7. Inversiones & Activos en Tiempo Real',
      icon: TrendingUp,
      color: 'text-indigo-600 dark:text-indigo-400',
      articles: [
        {
          id: 'mutual_funds_isin',
          title: '7.1 Fondos de Inversión por Código ISIN',
          summary: 'Registra cualquier fondo global mediante su código ISIN único con valor liquidativo actualizado.',
          targetTab: 'portfolio',
          tabButtonLabel: 'Gestionar Fondos en Portfolio',
          tags: ['fondos', 'isin', 'nav', 'aportaciones', 'cartera'],
          readingTime: '3 min',
          sections: [
            {
              heading: 'Registro Generalista de Fondos',
              content: 'Spend Agent no está atado a ningún fondo específico: te permite añadir cualquier fondo de inversión del mundo (indexado o gestión activa) mediante su código ISIN internacional (ej. `IE00BYX5P602`, `LU0996177134`, `ES0152769032`).'
            },
            {
              bullets: [
                'Búsqueda en Vivo: Al introducir el ISIN, la app consulta el nombre oficial y el último valor liquidativo (NAV) publicado.',
                'Aportaciones Periódicas: Puedes registrar cada aportación mensual con su fecha, importe en euros y participaciones asignadas.',
                'Rentabilidad P&L en Vivo: El sistema calcula tu beneficio monetario (+€) y rentabilidad porcentual (+%) respecto al capital invertido.'
              ]
            }
          ]
        },
        {
          id: 'live_stocks_finnhub',
          title: '7.2 Acciones & ETFs en Directo con Finnhub',
          summary: 'Busca empresas por ticker (AAPL, MSFT, SAN) y obtén cotizaciones de mercado en tiempo real.',
          targetTab: 'portfolio',
          tabButtonLabel: 'Ir a Cartera de Acciones',
          tags: ['acciones', 'stocks', 'finnhub', 'ticker', 'mercado'],
          readingTime: '3 min',
          sections: [
            {
              heading: 'Cotizaciones en Tiempo Real sin Retardo',
              content: 'En la sección "Portfolio & Capital Global", cuentas con un módulo de Cartera de Acciones conectado directamente a la API gratuita de Finnhub:'
            },
            {
              bullets: [
                'Buscador por Símbolo / Empresa: Escribe "Apple", "Tesla" o "Santander" para seleccionar el ticker correspondiente.',
                'Conversión Automática USD a EUR: Si la acción cotiza en dólares, la app aplica el tipo de cambio oficial EUR/USD para mostrar el valor exacto en euros en tu patrimonio.',
                'Variación 24h y Ganancias no realizadas: Monitorea las subidas y bajadas diarias de tu cartera con colores dinámicos.'
              ]
            },
            {
              type: 'tip',
              title: 'API Key de Finnhub Gratuita',
              text: 'Puedes obtener una API key gratuita en finnhub.io e introducirla en la pestaña Ajustes para tener cotizaciones en tiempo real ilimitadas.'
            }
          ]
        },
        {
          id: 'portfolio_capital',
          title: '7.3 Capital Global y Patrimonio Neto',
          summary: 'La fórmula que combina efectivo bancario, fondos, acciones y préstamos en una sola cifra.',
          targetTab: 'portfolio',
          tabButtonLabel: 'Ver Capital Global',
          tags: ['capital', 'patrimonio neto', 'deuda', 'liquidez'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Fórmula de Patrimonio Real',
              content: 'El indicador de Capital Global visible en la parte superior izquierda del menú calcula tu salud patrimonial exacta:'
            },
            {
              bullets: [
                '(+) Saldo actual en cuentas bancarias y efectivo.',
                '(+) Valoración actual de tus fondos de inversión.',
                '(+) Valoración en euros de tu cartera de acciones y ETFs.',
                '(-) Deuda viva en préstamos o compras financiadas.',
                '(=) Patrimonio Neto Real disponible.'
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'goals',
      title: '8. Planificador & Objetivos Financieros',
      icon: Target,
      color: 'text-rose-600 dark:text-rose-400',
      articles: [
        {
          id: 'habit_goals',
          title: '8.1 Metas de Ahorro Basadas en Hábitos',
          summary: 'Transforma pequeños hábitos diarios en metas financieras tangibles (ej. fondo de emergencia, viajes).',
          targetTab: 'portfolio',
          tabButtonLabel: 'Ver Simulador en Portfolio',
          tags: ['metas', 'hábitos', 'ahorro', 'objetivos'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Objetivos Financieros Conectados a la Realidad',
              content: 'En lugar de fijar metas abstractas difíciles de cumplir, el planificador financiero de Spend Agent te permite asociar metas de ahorro al recorte de gastos específicos identificados en tus transacciones:'
            },
            {
              bullets: [
                'Reducir pedidos a domicilio o restaurantes: Simula cuánto acumularías reduciendo dos cenas fuera al mes.',
                'Optimización de suscripciones: Visualiza el impacto anual de cancelar servicios que no utilizas.',
                'Progreso Visual: Barras de cumplimiento que te indican los meses necesarios para alcanzar tu meta con tu ritmo actual.'
              ]
            }
          ]
        },
        {
          id: 'compound_interest',
          title: '8.2 Simulador de Interés Compuesto',
          summary: 'Proyecciones a 5, 10 y 20 años de tus aportaciones mensuales a fondos indexados.',
          targetTab: 'portfolio',
          tabButtonLabel: 'Abrir Simulador de Interés',
          tags: ['interés compuesto', 'proyección', 'futuro', 'jubilación'],
          readingTime: '3 min',
          sections: [
            {
              heading: 'El Poder del Tiempo y el Crecimiento Exponencial',
              content: 'Dentro de la pestaña Portfolio dispones de un simulador de interés compuesto interactivo que calcula el crecimiento proyectado de tu dinero:'
            },
            {
              bullets: [
                'Aportación periódica mensual ajustable con deslizador.',
                'Tasa de rentabilidad estimada (ej. 7% anual histórico del MSCI World).',
                'Curva comparativa: Muestra con claridad la diferencia abismal entre "Capital Invertido de tu bolsillo" y "Beneficios generados por el interés compuesto".'
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'loans',
      title: '9. Créditos, Préstamos & Compras a Plazos',
      icon: Layers,
      color: 'text-indigo-600 dark:text-indigo-400',
      articles: [
        {
          id: 'loans_management',
          title: '9.1 Gestión de Préstamos y Financiaciones',
          summary: 'Diferencia entre préstamos personales con desembolso y compras fraccionadas a plazos.',
          targetTab: 'loans',
          tabButtonLabel: 'Ir a Créditos & Financiaciones',
          tags: ['préstamos', 'créditos', 'financiación', 'deuda', 'intereses', 'tin', 'tae'],
          readingTime: '3 min',
          sections: [
            {
              heading: 'Los Dos Tipos de Financiación Soportados',
              content: 'En Spend Agent puedes dar de alta y controlar cualquier tipo de pasivo financiero:'
            },
            {
              bullets: [
                '1. Préstamo Personal Bancario (Con Desembolso): Un crédito donde recibes el capital en tu cuenta corriente (ej. 10.000 € de Santander o BBVA) y abonas cuotas mensuales. El sistema neutraliza contablemente el ingreso inicial para que no figure como renta salarial ficticia.',
                '2. Compra a Plazos / Fraccionada (Sin Desembolso): Una compra directa de un bien o servicio diferida en varias cuotas (ej. un ordenador de 1.800 € financiado a 12 meses, un tratamiento o un billete de avión). No hay abono de efectivo previo, sólo las cuotas recurrentes.'
              ]
            },
            {
              heading: 'Parámetros y Cálculo Automático de Cuota Francesa',
              content: 'Al registrar un nuevo crédito en el modal, defines:'
            },
            {
              bullets: [
                'Entidad Financiera y Nombre: Ej. "Préstamo Coche Santander" o "Apple MacBook Pro Plazos".',
                'Capital Inicial Financiado (€): El importe total prestado.',
                'Tipo de Interés Anual (% TIN / TAE) y Plazo (Meses): El motor calcula matemáticamente la cuota mensual mediante el sistema de amortización francés.',
                'Patrón de Detección Bancaria: Una palabra clave del extracto (ej. "PRESTAMO", "FINANCIACION", "CUOTA SANTANDER") para que el agente reconozca y vincule automáticamente cada cuota mensual cuando importes nuevos extractos.'
              ]
            },
            {
              heading: 'Impacto en el Patrimonio Neto Real',
              content: 'El capital pendiente (deuda viva) de todos tus préstamos activos se suma automáticamente y se descuenta de tus activos brutos en el Dashboard y en la vista de Portfolio, mostrando en todo momento tu Patrimonio Neto Real fidedigno.'
            }
          ]
        },
        {
          id: 'loans_amortization_sim',
          title: '9.2 Amortización Extraordinaria & Ahorro de Intereses',
          summary: 'Simula el impacto de anticipar capital: compara reducir cuota mensual vs reducir plazo en meses.',
          targetTab: 'loans',
          tabButtonLabel: 'Probar Simulador en Créditos',
          tags: ['amortización', 'simulador', 'ahorro intereses', 'anticipar capital'],
          readingTime: '3 min',
          sections: [
            {
              heading: 'Simulador de Amortización Extraordinaria',
              content: 'Si acumulas ahorro o recibes un ingreso extraordinario (paga extra, bonus, reembolso) y quieres valorar amortizar parte de tu préstamo, cada tarjeta de crédito incluye un botón "Simular Amortización Extraordinaria".'
            },
            {
              heading: 'Comparativa en Tiempo Real: Opción 1 vs Opción 2',
              content: 'Al introducir el capital a amortizar (ej. 1.500 € o 3.000 €), el simulador calcula simultáneamente las dos alternativas bancarias:'
            },
            {
              bullets: [
                'Opción A: Reducir Cuota Mensual: Mantienes la fecha de vencimiento final del préstamo, pero tu cuota mensual disminuye inmediatamente. Es la mejor opción si buscas desahogar tu flujo de caja mensual y aumentar tu margen de gasto seguro.',
                'Opción B: Reducir Plazo (Meses): Mantienes la cuota mensual idéntica a la actual, pero terminas de pagar el préstamo varios meses o años antes. Es la opción más eficiente financieramente porque elimina el devengo de intereses en los meses suprimidos, logrando el máximo ahorro total en intereses bancarios.'
              ]
            },
            {
              type: 'tip',
              title: 'Cálculo del Ahorro Total',
              text: 'El simulador te muestra exactamente el dinero que te ahorras en intereses con un indicador verde destacado ("Ahorro: +XXX,XX €"), permitiéndote tomar decisiones informadas antes de hablar con tu entidad bancaria.'
            }
          ]
        }
      ]
    },
    {
      id: 'chat',
      title: '10. Asistente Conversacional (Chat IA)',
      icon: MessageSquare,
      color: 'text-teal-600 dark:text-teal-400',
      articles: [
        {
          id: 'chat_queries',
          title: '10.1 Consultas en Lenguaje Natural',
          summary: 'Habla con tu asesor financiero personal sobre tus gastos, anomalías y consejos de optimización.',
          targetTab: 'chat',
          tabButtonLabel: 'Abrir Chat Asistente',
          tags: ['chat', 'preguntas', 'auditoría', 'análisis'],
          readingTime: '2 min',
          sections: [
            {
              heading: 'Ejemplos de Preguntas que Puedes Hacerle',
              content: 'El asistente tiene acceso seguro a los agregados y sumas de tu mes seleccionado para responder preguntas contextuales:'
            },
            {
              bullets: [
                '"¿Cuánto he gastado este mes en ocio y restaurantes y cómo se compara con mi nómina?"',
                '"¿Cuáles han sido mis 3 compras más elevadas de este periodo?"',
                '"¿Cuánto dinero puedo destinar a invertir en fondos manteniendo un colchón de seguridad?"',
                '"Audita mis gastos fijos y sugiere dónde puedo recortar un 10%."'
              ]
            }
          ]
        },
        {
          id: 'chat_memory',
          title: '10.2 Historial Persistente & Privacidad',
          summary: 'Las conversaciones se guardan en tu navegador hasta que pulses "Nuevo Chat".',
          targetTab: 'chat',
          tabButtonLabel: 'Ir al Chat',
          tags: ['historial', 'memoria', 'privacidad', 'limpiar'],
          readingTime: '1 min',
          sections: [
            {
              heading: 'Memoria de Conversación',
              content: 'El chat mantiene el hilo de tus preguntas anteriores para que puedas profundizar en tus análisis sin repetir información. El historial se almacena en el almacenamiento local de tu navegador y nunca en ningún servidor ajeno.'
            },
            {
              bullets: [
                'Botón "Nuevo Chat": Reinicia la conversación cuando desees comenzar un análisis fresco desde cero.',
                'Cambio de mes interactivo: Si cambias de mes en la cabecera, el asistente adapta sus respuestas al periodo seleccionado.'
              ]
            }
          ]
        }
      ]
    }
  ], []);

  // Flattened articles for previous / next navigation
  const allArticles = useMemo(() => {
    const list = [];
    knowledgeTree.forEach(folder => {
      folder.articles.forEach(article => {
        list.push({ ...article, folderTitle: folder.title, folderId: folder.id });
      });
    });
    return list;
  }, [knowledgeTree]);

  // Current active article object
  const currentArticle = useMemo(() => {
    return allArticles.find(a => a.id === selectedArticleId) || allArticles[0];
  }, [allArticles, selectedArticleId]);

  // Filtered tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return knowledgeTree;
    const q = searchQuery.toLowerCase().trim();

    return knowledgeTree.map(folder => {
      const matchingArticles = folder.articles.filter(article => {
        const inTitle = article.title.toLowerCase().includes(q);
        const inSummary = article.summary.toLowerCase().includes(q);
        const inTags = article.tags.some(t => t.toLowerCase().includes(q));
        const inSections = article.sections?.some(s => 
          (s.heading && s.heading.toLowerCase().includes(q)) ||
          (s.content && s.content.toLowerCase().includes(q)) ||
          (s.bullets && s.bullets.some(b => b.toLowerCase().includes(q)))
        );
        return inTitle || inSummary || inTags || inSections;
      });

      return {
        ...folder,
        articles: matchingArticles
      };
    }).filter(folder => folder.articles.length > 0);
  }, [knowledgeTree, searchQuery]);

  const totalMatchesCount = useMemo(() => {
    return filteredTree.reduce((acc, folder) => acc + folder.articles.length, 0);
  }, [filteredTree]);

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const expandAll = () => {
    const nextState = {};
    knowledgeTree.forEach(f => { nextState[f.id] = true; });
    setExpandedFolders(nextState);
  };

  const collapseAll = () => {
    const nextState = {};
    knowledgeTree.forEach(f => { nextState[f.id] = false; });
    setExpandedFolders(nextState);
  };

  // Previous & Next navigation handlers
  const currentIdx = allArticles.findIndex(a => a.id === currentArticle.id);
  const prevArticle = currentIdx > 0 ? allArticles[currentIdx - 1] : null;
  const nextArticle = currentIdx < allArticles.length - 1 ? allArticles[currentIdx + 1] : null;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📚</span>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
                Base de Conocimiento & Documentación
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Manual Interactivo de Spend Agent
            </h1>
            <p className="text-xs text-neutral-300 max-w-xl">
              Navega en formato de árbol jerárquico por todas las funciones, formatos soportados, inversiones y ajustes de la herramienta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-400" />
              <span>Ajustes</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Extractos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Tree Navigation + Right Article Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Tree Navigation Directory (col-span-4) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#202020] rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden flex flex-col sticky top-4">
          {/* Tree Header & Search */}
          <div className="p-3.5 border-b border-neutral-100 dark:border-neutral-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Árbol de Contenidos</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono font-medium">
                  {allArticles.length} guías
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                <button
                  type="button"
                  onClick={expandAll}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 px-1 py-0.5 rounded cursor-pointer transition-colors"
                  title="Expandir todas las carpetas"
                >
                  Expandir
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 px-1 py-0.5 rounded cursor-pointer transition-colors"
                  title="Colapsar todas las carpetas"
                >
                  Colapsar
                </button>
              </div>
            </div>

            {/* Tree Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar temas, bancos, ISIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs bg-neutral-50 dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                {totalMatchesCount} artículos encontrados
              </div>
            )}
          </div>

          {/* Tree Node List */}
          <div className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {filteredTree.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400 space-y-1">
                <Search className="w-5 h-5 mx-auto text-neutral-300 dark:text-neutral-600" />
                <p>No se encontraron resultados para "{searchQuery}"</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-indigo-600 dark:text-indigo-400 underline font-medium cursor-pointer"
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              filteredTree.map(folder => {
                const isExpanded = searchQuery ? true : Boolean(expandedFolders[folder.id]);
                const FolderIcon = folder.icon || Folder;
                const hasActiveArticle = folder.articles.some(a => a.id === selectedArticleId);

                return (
                  <div key={folder.id} className="select-none">
                    {/* Folder Header Item */}
                    <div
                      onClick={() => toggleFolder(folder.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        hasActiveArticle 
                          ? 'text-neutral-900 dark:text-white bg-neutral-100/70 dark:bg-neutral-800/50' 
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-neutral-400">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <FolderIcon className={`w-3.5 h-3.5 flex-shrink-0 ${folder.color}`} />
                        <span className="truncate">{folder.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 ml-1.5 flex-shrink-0">
                        {folder.articles.length}
                      </span>
                    </div>

                    {/* Children Articles (Indent level 1) */}
                    {isExpanded && (
                      <div className="ml-5 pl-2 border-l border-neutral-200 dark:border-neutral-800 space-y-0.5 mt-0.5 mb-1">
                        {folder.articles.map(article => {
                          const isSelected = article.id === selectedArticleId;

                          return (
                            <button
                              key={article.id}
                              type="button"
                              onClick={() => setSelectedArticleId(article.id)}
                              className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <FileText className={`w-3 h-3 flex-shrink-0 ${isSelected ? 'text-indigo-200' : 'text-neutral-400'}`} />
                                <span className="truncate">{article.title}</span>
                              </div>
                              <span className={`text-[10px] font-mono ml-2 flex-shrink-0 ${isSelected ? 'text-indigo-200' : 'text-neutral-400'}`}>
                                {article.readingTime}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Article Reader (col-span-8) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#202020] rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs p-6 space-y-6">
          {/* Breadcrumbs & Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center space-x-2 text-xs text-neutral-400">
              <span className="font-medium text-neutral-600 dark:text-neutral-300">Manual</span>
              <span>/</span>
              <span className="truncate max-w-[180px]">{currentArticle.folderTitle}</span>
              <span>/</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[200px]">
                {currentArticle.title}
              </span>
            </div>

            {currentArticle.targetTab && (
              <button
                type="button"
                onClick={() => setActiveTab(currentArticle.targetTab)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <span>{currentArticle.tabButtonLabel || 'Abrir Sección'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Article Header */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {currentArticle.title}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {currentArticle.summary}
            </p>

            {/* Tags Strip */}
            {currentArticle.tags && currentArticle.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {currentArticle.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-[10.5px] px-2 py-0.5 rounded-md font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Article Structured Body */}
          <div className="space-y-5 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {currentArticle.sections?.map((sec, idx) => {
              if (sec.type === 'tip') {
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 space-y-1"
                  >
                    <div className="flex items-center space-x-2 font-bold text-xs text-indigo-900 dark:text-indigo-300">
                      <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{sec.title}</span>
                    </div>
                    <p className="text-xs text-indigo-900/90 dark:text-indigo-200 pl-6">
                      {sec.text}
                    </p>
                  </div>
                );
              }

              return (
                <div key={idx} className="space-y-2">
                  {sec.heading && (
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center space-x-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{sec.heading}</span>
                    </h3>
                  )}
                  {sec.content && (
                    <p className="text-neutral-600 dark:text-neutral-300">
                      {sec.content}
                    </p>
                  )}
                  {sec.bullets && (
                    <ul className="space-y-2 pl-4 list-disc marker:text-indigo-500">
                      {sec.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="text-neutral-700 dark:text-neutral-300">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Navigation Pagination (Previous / Next Article) */}
          <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
            {prevArticle ? (
              <button
                type="button"
                onClick={() => setSelectedArticleId(prevArticle.id)}
                className="flex items-center space-x-2 text-left p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors group cursor-pointer max-w-[48%]"
              >
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-indigo-500 rotate-180 flex-shrink-0" />
                <div className="truncate">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono">Anterior</div>
                  <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                    {prevArticle.title}
                  </div>
                </div>
              </button>
            ) : <div />}

            {nextArticle && (
              <button
                type="button"
                onClick={() => setSelectedArticleId(nextArticle.id)}
                className="flex items-center justify-end space-x-2 text-right p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors group cursor-pointer max-w-[48%]"
              >
                <div className="truncate">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono">Siguiente</div>
                  <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                    {nextArticle.title}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-indigo-500 flex-shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
