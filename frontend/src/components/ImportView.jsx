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
  Package
} from 'lucide-react';

const REAL_SANTANDER_SAMPLE = `,,CUENTA ONLINE SANTANDER,DATE,,
,,ES13 0049 5525 5323 1245 3012,28/09/2026 | 20:54:22,,
,,Holder,Balance,,
,,HERNANDEZ TCACH DIEGO,"1.233,19 EUR",,
,,,,,
Transactions,,,,,
Transaction date,Value date,Description,Amount,Balance,Currency
28/09/2026,28/09/2026,"PAGO MOVIL EN T30 ALCAMPO MON, MADRID ES, TARJ. :*450871","−29,90","1.233,19",EUR
28/09/2026,28/09/2026,"ANULACION REINTEGRO CONTRA CUENTA, ATM SUC.4338 EL 28/09/2026 A LAS 19:46","750,00","1.263,09",EUR
28/09/2026,28/09/2026,RETIRADA DE EFECTIVO EN CAJERO AUTOMATICO 004943380000 EL 28/09/2026 A LAS 19:46..PAN:5489010332450871.,"−750,00","513,09",EUR
28/09/2026,28/09/2026,"TRANSFERENCIA DE BMC Helix Software SL, CONCEPTO September expenses.","85,63","1.263,09",EUR
28/09/2026,28/09/2026,TRANSFERENCIA A FAVOR DE AGUSTÍN DE LA FUENTE MARTÍNEZ CONCEPTO: Alquiler Diego Hernández,"−654,00","1.177,46",EUR
28/09/2026,28/09/2026,TRANSFERENCIA A FAVOR DE Diego Hernández Tcach CONCEPTO: gastos comunes piso,"−60,00","1.831,46",EUR
27/09/2026,27/09/2026,TRANSFERENCIA INMEDIATA A FAVOR DE DIEGO HERNANDEZ TCACH CONCEPTO paris,"−336,00","1.891,46",EUR
27/09/2026,27/09/2026,"TRANSFERENCIA INMEDIATA DE DIEGO HERNANDEZ TCACH, CONCEPTO Transferencia desde MyInvestor","337,98","2.227,46",EUR
27/09/2026,27/09/2026,BIZUM A FAVOR DE RAFAEL GALLEGO REVERT CONCEPTO: sábado,"−3,82","1.889,48",EUR
27/09/2026,27/09/2026,TRANSFERENCIA INMEDIATA A FAVOR DE AMERICAN EXPRESS CONCEPTO 375693722191003,"−14,13","1.893,30",EUR
27/09/2026,28/09/2026,TRANSFERENCIA A FAVOR DE HERNANDEZ TCACH DIEGO CONCEPTO coche,"−750,00","1.907,43",EUR
26/09/2026,26/09/2026,"COMPRA INTERNET EN PAGO DE IMPUEST, MADRID ES, TARJ. :*450871","−8,67","2.657,43",EUR
26/09/2026,26/09/2026,"PAGO MOVIL EN BAR SOL, ILLESCAS ES, TARJ. :*450871","−9,80","2.666,10",EUR
25/09/2026,25/09/2026,"PAGO MOVIL EN LA SUITE COCTEL, TORRELODONES ES, TARJ. :*450871","−7,60","2.675,90",EUR
25/09/2026,25/09/2026,"PAGO MOVIL EN T30 ALCAMPO MON, MADRID ES, TARJ. :*450871","−66,39","2.683,50",EUR
25/09/2026,25/09/2026,"PAGO MOVIL EN BARBERIA GRUPO, MADRID ES, TARJ. :*450871","−23,00","2.749,89",EUR
25/09/2026,25/09/2026,TRANSFERENCIA INMEDIATA A FAVOR DE AMERICAN EXPRESS CONCEPTO 375688314321000,"−36,90","2.772,89",EUR
25/09/2026,25/09/2026,"TRANSFERENCIA DE BMC Helix Software SL, CONCEPTO NOMINA/PID/09/B21986757.","2.772,89","2.809,79",EUR
24/09/2026,24/09/2026,TRANSFERENCIA INMEDIATA A FAVOR DE AMERICAN EXPRESS CONCEPTO 375688314321000,"−417,00","36,90",EUR
24/09/2026,24/09/2026,"TRANSFERENCIA DE BMC Helix Software SL, CONCEPTO Iberia customers keychainsBeiersdorf customer meeting.","417,35","453,90",EUR
23/09/2026,23/09/2026,"PAGO MOVIL EN 5654 EUREST, MADRID ES, TARJ. :*450871","−1,90","36,55",EUR
23/09/2026,23/09/2026,"PAGO MOVIL EN 5654 EUREST, MADRID ES, TARJ. :*450871","−3,10","38,45",EUR
22/09/2026,22/09/2026,TRANSFERENCIA INMEDIATA A FAVOR DE AMERICAN EXPRESS CONCEPTO 375688314321000,"−320,00","41,55",EUR
22/09/2026,22/09/2026,"TRANSFERENCIA DE HERNANDEZ TCACH DIEGO, CONCEPTO cuota amex.","65,00","361,55",EUR
21/09/2026,21/09/2026,"PAGO MOVIL EN MERCADONA MONTE, MADRID ES, TARJ. :*450871","−39,87","296,55",EUR
21/09/2026,21/09/2026,BIZUM DE RAFAEL MATAIX JIMENEZ CONCEPTO Free2move,"5,27","336,42",EUR
20/09/2026,20/09/2026,"PAGO MOVIL EN APARC. ISABEL L, ESCALINATA DEES, TARJ. :*450871","−14,90","331,15",EUR
20/09/2026,20/09/2026,BIZUM A FAVOR DE RAFAEL GALLEGO REVERT CONCEPTO: sabado night,"−51,40","346,05",EUR
20/09/2026,20/09/2026,BIZUM DE Sergio Garcia Munoz CONCEPTO Bizum de SERGIO,"3,50","397,45",EUR
20/09/2026,20/09/2026,"TRANSFERENCIA INMEDIATA DE DIEGO HERNANDEZ TCACH, CONCEPTO Transferencia desde MyInvestor","100,00","393,95",EUR
20/09/2026,20/09/2026,BIZUM DE Sergio Garcia Munoz CONCEPTO Bizum de SERGIO,"6,00","293,95",EUR
19/09/2026,19/09/2026,BIZUM A FAVOR DE ANGEL RAMON COBO CONCEPTO: cerve,"−10,50","287,95",EUR
18/09/2026,18/09/2026,"PAGO MOVIL EN MERCADONA MONTE, MADRID ES, TARJ. :*450871","−4,25","298,45",EUR
18/09/2026,18/09/2026,"PAGO MOVIL EN FUN BAR, MADRID ES, TARJ. :*450871","−5,75","302,70",EUR
18/09/2026,16/09/2026,"COMPRA APPLE.COM/BILL, CORK, TARJETA 5489010332450871 , COMISION 0,00","−9,99","308,45",EUR
17/09/2026,15/09/2026,"COMPRA UBER *ONE MEMBERSHIP, UBER.COM/BILL, TARJETA 5489010332450871 , COMISION 0,00","−2,50","318,44",EUR
16/09/2026,14/09/2026,"COMPRA APPLE.COM/BILL, CORK, TARJETA 5489010332450871 , COMISION 0,00","−4,49","320,94",EUR
16/09/2026,16/09/2026,"RECIBO Legalitas Asistencia Legal SL Nº RECIBO 0049 3477 755 BBGVDKT REF. MANDATO DST8Z22XVDH8XRQ9, DE","−20,93","325,43",EUR
15/09/2026,15/09/2026,"RECIBO IBERIA CARDS, concepto: TARJETA IBERIA CARDS 4361 9602 0002 2366/ MES DE SEPTIEMBRE","−272,90","346,36",EUR
14/09/2026,14/09/2026,"PAGO MOVIL EN T30 ALCAMPO MON, MADRID ES, TARJ. :*450871","−55,06","619,26",EUR`;

const REAL_IBERIA_CARDS_SAMPLE = `,Extracto mensual,,,,,
,Iberia Cards ,,,,,
,,,,,,
,Nombre y apellidos,Diego Hernandez Tcach,,,,
,Número de documento,051787958P,,,,
,,,,,,
,Extracto Mensual de,Fecha de cierre extracto,Importe a pagar,Importe operaciones mes,Deuda pendiente del mes anterior,Forma de pago
,Septiembre 2026,11 SEP 2026,272.9,263,0,Total fin de mes
,,,,,,
,IBERIA ICON                   ,,4361-********-2366,Diego Hernandez Tcach,,
,,,,,,
,Nº ,FECHA OPERACIÓN,COMERCIO,IMPORTE DIVISA,IMPORTE EUROS,
,1,15/08/2026,BUGA RAMEN,31.9,31.9,
,2,21/08/2026,OKAPPI SMOKE BBQ SL,52,52,
,3,22/08/2026,ASOC.CULTURAL EL LLACIN,100,100,
,4,24/08/2026,REPSOL WAYLET,79.1,79.1,
,5,11/09/2026,RENOVACION TARJETA,0,9.9,`;

const REAL_N26_SAMPLE = `Booking Date,Value Date,Partner Name,Partner Iban,Type,Payment Reference,Account Name,Amount (EUR),Original Amount,Original Currency,Exchange Rate
46038.0,46038.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Enviada desde N26,Main Account,-23.0,,,
46040.0,46040.0,PLAYTOMIC.IO C2067D22,,Presentment,,Main Account,-24.96,24.96,EUR,1.0
46043.0,46043.0,PLAYTOMIC.IO CB6E896C,,Presentment,,Main Account,-10.4,10.4,EUR,1.0
46043.0,46043.0,MAQUINAS EXPENDEDORAS,,Presentment,,Main Account,-7.0,7.0,EUR,1.0
46046.0,46046.0,PARKING CLUBO JUAN BRA,,Presentment,,Main Account,-8.2,8.2,EUR,1.0
46047.0,46047.0,ARAFRE REPSOL,,Presentment,,Main Account,-14.9,14.9,EUR,1.0
46048.0,46048.0,HERNANDEZ TCACH DIEGO,ES1300495525532312453012,Credit Transfer,viaje,Main Account,1000.0,,,
46052.0,46052.0,"N26
",,Fee,Additional Card Fee,Main Account,-10.0,,,
46055.0,46055.0,CARLA GARCIA FAYA,ES5921005602631300349267,Credit Transfer,RD,Main Account,100.0,,,
46076.0,46076.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Inversion,Main Account,-500.0,,,
46076.0,46076.0,Diego Hernandez Tcach,ES1215447889726651128615,Debit Transfer,Enviada desde N26,Main Account,-100.0,,,
46076.0,46076.0,DIEGO HERNANDEZ TCACH,ES1215447889726651128615,Credit Transfer,Transferencia desde MyInvestor,Main Account,104.24,,,
46078.0,46078.0,HERNANDEZ TCACH DIEGO,ES1300495525532312453012,Credit Transfer,ahorro viaje,Main Account,700.0,,,
46086.0,46086.0,CARLA GARCIA FAYA,ES5921005602631300349267,Credit Transfer,punta cana,Main Account,200.0,,,
46088.0,46088.0,welcomepickups.com,,Presentment,,Main Account,-28.55,33.0,USD,0.8651515152
46088.0,46088.0,AMERICAN,,Presentment,,Main Account,-129.26,129.26,EUR,1.0
46088.0,46088.0,AMERICAN,,Presentment,,Main Account,-129.26,129.26,EUR,1.0
46090.0,46090.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Reserva transporte RD,Main Account,-171.31,,,
46091.0,46090.0,welcomepickups.com,,Presentment,,Main Account,-28.59,33.0,USD,0.8663636364
46105.0,46105.0,HERNANDEZ TCACH DIEGO,ES1300495525532312453012,Credit Transfer,SIN CONCEPTO,Main Account,800.0,,,
46108.0,46108.0,CARLA GARCIA FAYA,ES5921005602631300349267,Credit Transfer,ahorro viaje,Main Account,1000.0,,,
46113.0,46113.0,CARLA GARCIA FAYA,ES5921005602631300349267,Credit Transfer,viaje,Main Account,100.0,,,
46121.0,46121.0,Carla garcia faya,ES5921005602631300349267,Debit Transfer,Enviada desde N26,Main Account,-150.0,,,
46122.0,46122.0,IBERIA LAE SA OPERADOR,,Presentment,,Main Account,-39.0,39.0,EUR,1.0
46123.0,46123.0,Rafael Mataix Jimenez,ES3820800100073041924326,Debit Transfer,Exchange,Main Account,-94.0,,,
46125.0,46125.0,Carla garcia faya,ES5921005602631300349267,Debit Transfer,Enviada desde N26,Main Account,-100.0,,,
46126.0,46126.0,HERNANDEZ TCACH DIEGO,ES1300495525532312453012,Credit Transfer,SIN CONCEPTO,Main Account,53.0,,,
46126.0,46126.0,INMOBILIARIA PALMA ORO,,Presentment,,Main Account,-186.62,12930.99,DOP,0.0144319963
46127.0,46127.0,LITTLE HAVANA CIGAR FA,,Presentment,,Main Account,-45.52,53.15,USD,0.8564440263
46127.0,46127.0,TST* MANGO'S TROPICAL,,Presentment,,Main Account,-9.75,11.37,USD,0.8575197889
46127.0,46127.0,SP HOLAFLY.COM,,Presentment,,Main Account,-9.99,11.7,USD,0.8538461538
46128.0,46128.0,LOEWS MIAMI BEACH FB,,Presentment,,Main Account,-9.86,11.61,USD,0.8492678725
46131.0,46130.0,LOEWS MIAMI BEACH FB,,Presentment,,Main Account,-49.34,58.05,USD,0.8499569337
46131.0,46130.0,NEWSLINK 09 MIA,,Presentment,,Main Account,-5.94,6.99,USD,0.8497854077
46131.0,46130.0,STARBUCKS D15 MIA,,Presentment,,Main Account,-12.87,15.14,USD,0.8500660502
46131.0,46130.0,SP HOLAFLY.COM,,Presentment,,Main Account,-38.9,38.9,EUR,1.0
46131.0,46131.0,CASA BARISTA COLONIAL,,Presentment,,Main Account,-36.65,2585.6,DOP,0.0141746597
46131.0,46131.0,BUCHE PERICO BY CONUCO,,Presentment,,Main Account,-80.55,5683.2,DOP,0.014173353
46131.0,46131.0,Kahkow Zona Colonial,,Presentment,,Main Account,-2.27,160.0,DOP,0.0141875
46131.0,46131.0,RESTAURANTE LA MARCHAN,,Presentment,,Main Account,-18.87,1331.2,DOP,0.0141751803
46131.0,46131.0,CHOCOCLUB ZONA COLON,,Presentment,,Main Account,-27.64,1950.0,DOP,0.014174359
46131.0,46131.0,Kahkow Zona Colonial,,Presentment,,Main Account,-11.48,810.0,DOP,0.0141728395
46132.0,46132.0,MARACA,,Presentment,,Main Account,-70.43,4969.11,DOP,0.0141735643
46132.0,46132.0,"N26
",,Fee,1.70% foreign ATM usage mark-up fee,Main Account,-0.88,,,
46132.0,46132.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Excursiones,Main Account,-350.0,,,
46133.0,46132.0,TIENDA RIDDIN US,,Presentment,,Main Account,-12.75,15.0,USD,0.85
46133.0,46132.0,HOTEL GRAN BAVARO PRIN,,Presentment,,Main Account,-995.8,70261.17,DOP,0.0141728354
46133.0,46132.0,STARBUCKS AILA,,Presentment,,Main Account,-23.04,1625.6,DOP,0.0141732283
46133.0,46133.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Tour,Main Account,-115.0,,,
46133.0,46133.0,BANCO POPULAR H.GRAND,,Presentment,,Main Account,-51.84,3657.5,DOP,0.0141736159
46133.0,46133.0,TIENDA RIDDIN US,,Presentment,,Main Account,-11.05,13.0,USD,0.85
46134.0,46134.0,FUNDACION GPC,,Presentment,,Main Account,-16.16,1137.38,DOP,0.0142080923
46135.0,46135.0,HOTEL GRAN BAVARO PRIN,,Presentment,,Main Account,-59.6,4165.0,DOP,0.0143097239
46135.0,46135.0,SP HOLAFLY.COM,,Presentment,,Main Account,-18.9,18.9,EUR,1.0
46136.0,46136.0,LUIS EXCURSIONES,,Presentment,,Main Account,-20.92,1450.0,DOP,0.0144275862
46136.0,46136.0,BELLA MARE MUSEUM STOR,,Presentment,,Main Account,-18.09,1253.98,DOP,0.0144260674
46136.0,46136.0,Y&C MARKET,,Presentment,,Main Account,-65.65,4550.0,DOP,0.0144285714
46137.0,46137.0,Carla garcia faya,ES5921005602631300349267,Debit Transfer,Flores,Main Account,-40.0,,,
46137.0,46137.0,,,Credit Transfer,Thank you for adding funds to your account using the card ending in *0871.,Main Account,30.0,,,
46137.0,46137.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Enviada desde N26,Main Account,-15.86,,,
46137.0,46137.0,HOTEL GRAN BAVARO PRIN,,Presentment,,Main Account,-17.92,1242.15,DOP,0.014426599
46137.0,46137.0,DUFRY AILA USD,,Presentment,,Main Account,-69.42,81.0,USD,0.857037037
46137.0,46137.0,CARL S JR AILA,,Presentment,,Main Account,-36.85,43.0,USD,0.8569767442
46140.0,46139.0,EL BUHO GASTROPUB,,Presentment,,Main Account,-101.5,7161.6,DOP,0.0141728105
46140.0,46139.0,FDR FOOD DRINK,,Presentment,,Main Account,-10.88,768.0,DOP,0.0141666667
46152.0,46152.0,HERNANDEZ TCACH DIEGO,ES1300495525532312453012,Credit Transfer,viaje,Main Account,100.0,,,
46152.0,46152.0,CARLA GARCIA FAYA,ES5921005602631300349267,Credit Transfer,aruba,Main Account,100.0,,,
46153.0,46153.0,Iberia Inflight Sales,,Presentment,,Main Account,-20.49,20.49,EUR,1.0
46153.0,46153.0,HOLAFLY LIMITED,,Presentment,,Main Account,-3.79,3.79,EUR,1.0
46155.0,46155.0,HERNANDEZ TCACH DIEGO,ES3000493477382014031842,Credit Transfer,trip,Main Account,20.0,,,
46155.0,46155.0,HERNANDEZ TCACH DIEGO,ES3000493477382014031842,Credit Transfer,SIN CONCEPTO,Main Account,3.0,,,
46157.0,46157.0,BEST OF ARUBA,,Presentment,,Main Account,-81.05,95.0,USD,0.8531578947
46157.0,46157.0,GetYourGuide,,Presentment,,Main Account,-117.54,117.54,EUR,1.0
46224.0,46224.0,HERNANDEZ TCACH DIEGO,ES3000493477382014031842,Credit Transfer,menorca,Main Account,270.0,,,
46228.0,46227.0,MERCADONA POIMA,,Presentment,,Main Account,-23.3,23.3,EUR,1.0
46228.0,46228.0,COVA D EN XOROI MENORC,,Presentment,,Main Account,-45.0,45.0,EUR,1.0
46229.0,46229.0,LA MAR SALA,,Presentment,,Main Account,-5.0,5.0,EUR,1.0
46229.0,46229.0,LA MAR SALA,,Presentment,,Main Account,-17.5,17.5,EUR,1.0
46229.0,46229.0,BISORUS SL,,Presentment,,Main Account,-30.0,30.0,EUR,1.0
46229.0,46229.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Cena,Main Account,-24.0,,,
46229.0,46229.0,SES GARCES,,Presentment,,Main Account,-23.0,23.0,EUR,1.0
46229.0,46229.0,DIEGO HERNANDEZ TCACH,ES1215447889726651128615,Credit Transfer,Denia,Main Account,250.0,,,
46229.0,46229.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Menorca restante,Main Account,-97.0,,,
46230.0,46230.0,SA GELATERIA,,Presentment,,Main Account,-5.1,5.1,EUR,1.0
46231.0,46231.0,NYX*AREASSAU,,Presentment,,Main Account,-2.0,2.0,EUR,1.0
46231.0,46231.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Cena,Main Account,-35.0,,,
46231.0,46231.0,HIPER ASIA,,Presentment,,Main Account,-1.2,1.2,EUR,1.0
46232.0,46232.0,PARKING EL RESET,,Presentment,,Main Account,-3.35,3.35,EUR,1.0
46233.0,46233.0,MALA VITA DENIA,,Presentment,,Main Account,-28.0,28.0,EUR,1.0
46233.0,46233.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Cena,Main Account,-27.0,,,
46234.0,46234.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Enviada desde N26,Main Account,-9.0,,,
46234.0,46234.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Comida Denia,Main Account,-60.0,,,
46234.0,46234.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Enviada desde N26,Main Account,-5.0,,,
46235.0,46235.0,PARKING EL RESET,,Presentment,,Main Account,-7.1,7.1,EUR,1.0
46238.0,46238.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Gym,Main Account,-15.0,,,
46239.0,46239.0,SumUp  *El prau de ter,,Presentment,,Main Account,-6.0,6.0,EUR,1.0
46240.0,46240.0,BAR LA RASA DE BERBES,,Presentment,,Main Account,-5.0,5.0,EUR,1.0
46240.0,46240.0,ASOCIACION DE VECINOS,,Presentment,,Main Account,-7.0,7.0,EUR,1.0
46240.0,46240.0,ASOCIACION DE VECINOS,,Presentment,,Main Account,-11.5,11.5,EUR,1.0
46240.0,46240.0,ASOCIACION DE VECINOS,,Presentment,,Main Account,-8.0,8.0,EUR,1.0
46240.0,46240.0,Diego Hernandez tcach,ES1300495525532312453012,Debit Transfer,Enviada desde N26,Main Account,-20.1,,,
46292.0,46292.0,HERNANDEZ TCACH DIEGO,ES1300495525532312453012,Credit Transfer,paris,Main Account,336.0,,,`;

const REAL_SANTANDER_CREDIT_SAMPLE = `,,CREDITO SANTANDER,Date
,,5415411648307772,28/09/2026 | 22:13:39
,,Holder,
,,HERNANDEZ TCACH DIEGO,
,,,
Transactions,,,
Transaction date,Description,Amount,Currency
28/08/2026,CUOTA FRACCIONAR COMPRA de 191€,"−191,00",EUR
06/08/2026,PAGO ONLINE,"−332,42",EUR
30/07/2026,CUOTA FRACCIONAR COMPRA de 191€,"−191,00",EUR
13/07/2026,CAX-VLC-PARK-V-,"−26,00",EUR
03/07/2026,Zara.com,"20,96",EUR
01/07/2026,COMISION APERTURA FRAC.COMPRA,"−12,00",EUR
29/06/2026,Zara.com,"−144,15",EUR
27/06/2026,Suit Supply,"573,00",EUR
27/06/2026,Suit Supply,"−573,00",EUR
09/06/2026,BAR JULIO CESAR,"−4,50",EUR
20/05/2026,APK2 RAMON DE L,"−14,40",EUR
03/05/2026,IBERDROLA SMART,"−1,02",EUR
13/04/2026,UBER   *TRIP,"−59,07",EUR
07/04/2026,EDC ETES260406009892,"−53,97",EUR`;

const REAL_AMEX_SAMPLE = `Detalles de la operación,"The Platinum Card / 01 Jan, 2026 a 31 Dec, 2026",,,,,,,,,
Preparado para,,,,,,,,,,
D HERNANDEZ TCACH,,,,,,,,,,
Número de Cuenta,,,,,,,,,,
XXXX-XXXXXX-21000,,,,,,,,,,
,,,,,,,,,,
Fecha,Descripción,Importe,Detalles ampliados,Aparece en su Estado de Cuenta como,Dirección,Población/Provincia,Código postal,País,Referencia,Categoría
26/09/2026,CHUPI LERENDI 332473461 MADRID,141,,CHUPI LERENDI 332473461 MADRID,"MONASTERIO DE MONTESCLAROS ESQ",,28034,SPAIN,AT262700024000010058000,Entretenimiento-Restaurantes
26/09/2026,"ES ALER MULTIENERGÍA, S COLMENAR VIEJO",74.41,,"ES ALER MULTIENERGÍA, S COLMENAR VIEJO","CRTA M-607",,28770,SPAIN,AT262700024000010047177,Transporte-Gasolina
24/09/2026,PAGO RECIBIDO.GRACIAS,-417,,PAGO RECIBIDO.GRACIAS,,,,,AT262680042000010000047,
23/09/2026,WWW.AMAZON*NU8LT3DO4    AMZN.COM/BILL,82.57,,WWW.AMAZON*NU8LT3DO4    AMZN.COM/BILL,"38 AVENUE",,L-1855,LUXEMBOURG,AT262670077000010011494,Productos-Compra online
22/09/2026,PAGO RECIBIDO.GRACIAS,-320,,PAGO RECIBIDO.GRACIAS,,,,,AT262660036000010000063,
28/08/2026,CUOTA MENSUAL DE LA TARJETA,65,,CUOTA MENSUAL DE LA TARJETA,,,,,10000000010628999395700,
31/08/2026,RECIBO ENVIADO A SU BANCO.,-173.58,,RECIBO ENVIADO A SU BANCO.,,,,,10000000010829999845250,`;

const REAL_MYINVESTOR_SAMPLE = `Fecha de operación;Fecha de valor;Concepto;Importe;Divisa
30/09/2026;29/09/2026;PERIODO 29/08/2026 29/09/2026;0,13;EUR
27/09/2026;27/09/2026;Transferencia desde MyInvestor;-337,98;EUR
20/09/2026;20/09/2026;Transferencia desde MyInvestor;-100;EUR
14/09/2026;15/09/2026;SUPER MICRO COMPUTER INC @ 7;-233,2;EUR
14/09/2026;14/09/2026;Transferencia desde MyInvestor;-180;EUR
06/09/2026;06/09/2026;ahorro coche sofi;160;EUR
02/09/2026;03/09/2026;FIDELITY MSCI WORLD INDEX P AC;-499,99;EUR
30/08/2026;29/08/2026;PERIODO 29/07/2026 29/08/2026;0,04;EUR
27/08/2026;28/08/2026;FIDELITY MSCI WORLD INDEX P AC;-15,99;EUR
26/08/2026;26/08/2026;inversion;750;EUR
25/08/2026;25/08/2026;ahorro;441;EUR
24/08/2026;25/08/2026;SUPER MICRO COMPUTER INC @ 1;-32,7;EUR
24/08/2026;25/08/2026;SUPER MICRO COMPUTER INC @ 8;-239,86;EUR
24/08/2026;25/08/2026;FLUENCE ENERGY INC @ 31;284,85;EUR
31/07/2026;03/08/2026;FIDELITY MSCI WORLD INDEX P AC;-500;EUR
30/07/2026;29/07/2026;PERIODO 29/06/2026 29/07/2026;0,08;EUR
27/07/2026;28/07/2026;FLUENCE ENERGY INC @ 20;-247,12;EUR
27/07/2026;27/07/2026;inversion;750;EUR
26/07/2026;26/07/2026;Denia;-250;EUR
19/07/2026;19/07/2026;Cena denia;-112,35;EUR
15/07/2026;15/07/2026;Verano 150;-150;EUR
30/06/2026;29/06/2026;PERIODO 29/05/2026 29/06/2026;0,02;EUR
29/06/2026;29/06/2026;inversion;500;EUR
02/06/2026;03/06/2026;FIDELITY MSCI WORLD INDEX P AC;-750;EUR
30/05/2026;29/05/2026;PERIODO 29/04/2026 29/05/2026;0,09;EUR
26/05/2026;26/05/2026;inversion;750;EUR
18/05/2026;19/05/2026;SUPER MICRO COMPUTER INC @ 1;-29,43;EUR
18/05/2026;19/05/2026;ALTC ACQUISITION CORP-CL A @ 4;-210,93;EUR
17/05/2026;17/05/2026;inversion;250;EUR
11/05/2026;12/05/2026;ALTC ACQUISITION CORP-CL A @ 1;-69,35;EUR
11/05/2026;11/05/2026;null;3;EUR
11/05/2026;12/05/2026;ALTC ACQUISITION CORP-CL A @ 3;-202,13;EUR
11/05/2026;11/05/2026;inversuon;10;EUR
11/05/2026;12/05/2026;FLUENCE ENERGY INC @ 11;-238,53;EUR
06/05/2026;06/05/2026;inversion adicional;500;EUR
06/05/2026;06/05/2026;null;1;EUR
06/05/2026;07/05/2026;SUPER MICRO COMPUTER INC @ 1;-30,93;EUR
06/05/2026;07/05/2026;SUPER MICRO COMPUTER INC @ 17;-471,53;EUR
01/05/2026;04/05/2026;FIDELITY MSCI WORLD INDEX P AC;-750;EUR
30/04/2026;29/04/2026;PERIODO 29/03/2026 29/04/2026;0,03;EUR
28/04/2026;28/04/2026;inversion;750;EUR
24/04/2026;24/04/2026;inversion;500;EUR
24/04/2026;24/04/2026;null;70;EUR
24/04/2026;27/04/2026;INTEL CORP @ 8;-568,11;EUR
23/04/2026;23/04/2026;inversion;500;EUR`;

export default function ImportView({ onUploadComplete, setActiveTab, setSelectedMonth }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('Santander (*3012)');
  const [fileQueue, setFileQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [aggregateStats, setAggregateStats] = useState(null);

  const fileInputRef = useRef(null);
  const queueRef = useRef([]);
  const isProcessingRef = useRef(false);

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

    isProcessingRef.current = true;
    setIsProcessingQueue(true);

    const currentItem = queueRef.current[pendingIndex];

    // Mark as processing
    updateQueue(prev => prev.map((it, idx) => idx === pendingIndex ? { ...it, status: 'processing', error: null } : it));

    try {
      const formData = new FormData();
      formData.append('file', currentItem.file);
      formData.append('account', currentItem.account);

      let res;
      try {
        res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
      } catch (netErr) {
        throw new Error('Error al conectar con el servidor: ' + (netErr.message || ''));
      }

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text || `Error HTTP ${res.status}` };
      }

      if (!res.ok) {
        throw new Error(data.detail || `Error al procesar el archivo (${res.status})`);
      }

      // Mark completed
      updateQueue(prev => prev.map((it, idx) => idx === pendingIndex ? { ...it, status: 'completed', result: data } : it));

      // Update aggregate stats
      setAggregateStats(prev => {
        const base = prev || {
          totalFiles: 0,
          successfulFiles: 0,
          failedFiles: 0,
          totalImported: 0,
          totalDuplicates: 0,
          totalDoubts: 0,
          totalTransfers: 0,
          accounts: [],
          months: {},
        };
        const accountsSet = new Set([...base.accounts, currentItem.account]);
        const months = { ...base.months };
        if (data.months_breakdown) {
          for (const [m, cnt] of Object.entries(data.months_breakdown)) {
            months[m] = (months[m] || 0) + cnt;
          }
        }
        return {
          totalFiles: base.totalFiles + 1,
          successfulFiles: base.successfulFiles + 1,
          failedFiles: base.failedFiles,
          totalImported: base.totalImported + (data.imported_count ?? data.imported ?? 0),
          totalDuplicates: base.totalDuplicates + (data.duplicates_skipped || 0),
          totalDoubts: base.totalDoubts + (data.flagged_doubts || 0),
          totalTransfers: base.totalTransfers + (data.paired_transfers || 0),
          accounts: Array.from(accountsSet),
          months,
        };
      });

      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      updateQueue(prev => prev.map((it, idx) => idx === pendingIndex ? { ...it, status: 'error', error: err.message } : it));

      setAggregateStats(prev => {
        const base = prev || {
          totalFiles: 0,
          successfulFiles: 0,
          failedFiles: 0,
          totalImported: 0,
          totalDuplicates: 0,
          totalDoubts: 0,
          totalTransfers: 0,
          accounts: [],
          months: {},
        };
        return {
          ...base,
          totalFiles: base.totalFiles + 1,
          failedFiles: base.failedFiles + 1,
        };
      });
    } finally {
      isProcessingRef.current = false;
      setTimeout(() => {
        processNextItem();
      }, 150);
    }
  };

  const removeItemFromQueue = (id) => {
    updateQueue(prev => prev.filter(it => it.id !== id || it.status === 'processing'));
  };

  const clearQueue = () => {
    if (isProcessingQueue) return;
    updateQueue([]);
    setAggregateStats(null);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      enqueueFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleLoadSample = (bankName, sampleCsvContent) => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], `${bankName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_extracto.csv`);
    enqueueFiles([{ file, account: bankName }]);
  };

  const handleLoadMultiSample = () => {
    const blobAmex = new Blob([REAL_AMEX_SAMPLE], { type: 'text/csv;charset=utf-8;' });
    const fileAmex = new File([blobAmex], 'amex_platinum_extracto.csv');

    const blobSantander = new Blob([REAL_SANTANDER_SAMPLE], { type: 'text/csv;charset=utf-8;' });
    const fileSantander = new File([blobSantander], 'santander_3012_extracto.csv');

    const blobIberia = new Blob([REAL_IBERIA_CARDS_SAMPLE], { type: 'text/csv;charset=utf-8;' });
    const fileIberia = new File([blobIberia], 'iberia_cards_2366_extracto.csv');

    enqueueFiles([
      { file: fileAmex, account: 'American Express Platinum' },
      { file: fileSantander, account: 'Santander (*3012)' },
      { file: fileIberia, account: 'Iberia Cards (*2366)' },
    ]);
  };

  const accounts = [
    { id: 'Santander (*3012)', label: 'Santander Principal (*3012)' },
    { id: 'Santander Ahorro (*1842)', label: 'Santander Ahorro (*1842)' },
    { id: 'Santander Tarjeta (*0871)', label: 'Santander Tarjeta (*0871)' },
    { id: 'Iberia Cards (*2366)', label: 'Iberia Cards (*2366)' },
    { id: 'N26 (*7089)', label: 'N26 Viajes (*7089)' },
    { id: 'American Express Platinum', label: 'American Express Platinum' },
    { id: 'MyInvestor', label: 'MyInvestor (Fondo & Acciones)' },
  ];

  const totalInQueue = fileQueue.length;
  const completedInQueue = fileQueue.filter(it => it.status === 'completed').length;
  const failedInQueue = fileQueue.filter(it => it.status === 'error').length;
  const pendingInQueue = fileQueue.filter(it => it.status === 'pending').length;
  const progressPercent = totalInQueue > 0 ? Math.round(((completedInQueue + failedInQueue) / totalInQueue) * 100) : 0;

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
              Sube uno o varios extractos en CSV o Excel. El sistema los apila y procesa archivo por archivo con prevención de duplicados.
            </p>
          </div>
        </div>
      </div>

      {/* Account Selection */}
      <div className="p-4 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            Cuenta o Tarjeta activa para subir:
          </label>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            💡 Selecciona una cuenta y añade archivos. Puedes cambiar de cuenta y añadir más; se van apilando en la cola.
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
        </div>
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
                : 'Arrastra aquí tus archivos de extractos bancarios (puedes soltar varios a la vez)'}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Acepta múltiples archivos de la misma tarjeta o de varias cuentas. Los apila en cola y los procesa uno a uno de forma segura.
            </p>
          </div>
          
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-700 dark:text-indigo-300">
            <span>Los archivos que sueltes se asignarán a:</span>
            <span className="font-semibold underline">{selectedAccount}</span>
          </div>

          <div className="pt-1">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>Seleccionar uno o varios archivos</span>
            </span>
          </div>
        </div>
      </div>

      {/* File Stack / Queue Section */}
      {fileQueue.length > 0 && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#242424] border border-neutral-200 dark:border-neutral-700 space-y-3 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Pila de archivos ({fileQueue.length})
              </h3>
              <span className="text-[11px] text-neutral-500 font-mono">
                {completedInQueue} completados · {pendingInQueue} en espera {failedInQueue > 0 && `· ${failedInQueue} errores`}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingQueue}
                className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Añadir más</span>
              </button>
              <button
                type="button"
                onClick={clearQueue}
                disabled={isProcessingQueue}
                className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-neutral-100 hover:bg-rose-100 hover:text-rose-700 dark:bg-neutral-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 text-neutral-600 dark:text-neutral-300 disabled:opacity-50 cursor-pointer transition-colors"
                title="Limpiar pila"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar pila</span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  failedInQueue > 0 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
              <span>{isProcessingQueue ? 'Procesando archivo por archivo...' : 'Pila lista'}</span>
              <span>{progressPercent}%</span>
            </div>
          </div>

          {/* Stacked File Cards */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {fileQueue.map((item) => {
              const isExcel = ['.xlsx', '.xls', '.xslx', '.xlsm', '.xltx', '.ods'].some(ext => item.name.toLowerCase().endsWith(ext));
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-all text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    item.status === 'processing'
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs ring-1 ring-indigo-400/30'
                      : item.status === 'completed'
                      ? 'bg-white dark:bg-[#282828] border-neutral-200 dark:border-neutral-700'
                      : item.status === 'error'
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                      : 'bg-neutral-50/70 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 opacity-80'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                      isExcel 
                         ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                         : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                    }`}>
                      {isExcel ? <FileSpreadsheet className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[220px] sm:max-w-xs" title={item.name}>
                          {item.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">({item.size})</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-neutral-500">
                        <span>Destino:</span>
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
                          className="p-1 text-neutral-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                          title="Quitar de la cola"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {item.status === 'processing' && (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 text-[11px] font-medium animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>Procesando archivo...</span>
                      </span>
                    )}

                    {item.status === 'completed' && item.result && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>+{(item.result.imported_count ?? item.result.imported ?? 0)} nuevos</span>
                        </span>
                        {item.result.duplicates_skipped > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[10px] font-mono">
                            {item.result.duplicates_skipped} duplicados omitidos
                          </span>
                        )}
                        {item.result.paired_transfers > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-medium">
                            {item.result.paired_transfers} traspasos
                          </span>
                        )}
                        {item.result.flagged_doubts > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-medium">
                            {item.result.flagged_doubts} dudas
                          </span>
                        )}
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-900/60 dark:text-rose-200 text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                        <span className="font-medium max-w-xs sm:max-w-md break-words">{item.error || 'Error'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            updateQueue(prev => prev.map(it => it.id === item.id ? { ...it, status: 'pending', error: null } : it));
                          }}
                          className="ml-2 underline text-[10px] text-rose-700 dark:text-rose-300 hover:text-rose-900 cursor-pointer"
                        >
                          Reintentar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aggregate Batch Result Summary */}
      {aggregateStats && !isProcessingQueue && (
        <div className="p-5 rounded-xl border bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/80 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                  ¡Lote de {aggregateStats.successfulFiles} {aggregateStats.successfulFiles === 1 ? 'archivo procesado' : 'archivos procesados'} con éxito!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Los ficheros han sido analizados, desglosados por fecha, prevenidos contra duplicados y conciliados.
                </p>
              </div>
            </div>

            {setActiveTab && (
              <button
                onClick={() => setActiveTab('transactions')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs cursor-pointer transition-colors"
              >
                <span>Ver Transacciones</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-emerald-200/60 dark:border-emerald-800/40">
              <div className="text-[11px] text-neutral-500">Nuevos Importados</div>
              <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100 font-mono">
                +{aggregateStats.totalImported}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-emerald-200/60 dark:border-emerald-800/40">
              <div className="text-[11px] text-neutral-500">Duplicados Prevenidos</div>
              <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100 font-mono">
                {aggregateStats.totalDuplicates}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-emerald-200/60 dark:border-emerald-800/40">
              <div className="text-[11px] text-neutral-500">Traspasos Vinculados</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
                {aggregateStats.totalTransfers}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-emerald-200/60 dark:border-emerald-800/40">
              <div className="text-[11px] text-neutral-500">Dudas a Confirmar</div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
                {aggregateStats.totalDoubts}
              </div>
            </div>
          </div>

          {/* Months breakdown */}
          {Object.keys(aggregateStats.months).length > 0 && (
            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60 space-y-2">
              <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                <span>📅 Meses actualizados en el lote:</span>
                {setSelectedMonth && setActiveTab && (
                  <button
                    onClick={() => {
                      setSelectedMonth('all');
                      setActiveTab('transactions');
                    }}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                  >
                    Ver todos en Transacciones →
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(aggregateStats.months).map(([m, cnt]) => (
                  <button
                    key={m}
                    onClick={() => {
                      if (setSelectedMonth && setActiveTab) {
                        setSelectedMonth(m);
                        setActiveTab('transactions');
                      }
                    }}
                    className="px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 font-mono text-[11px] hover:border-emerald-400 cursor-pointer transition-colors shadow-2xs"
                  >
                    {m}: {cnt} movs. ↗
                  </button>
                ))}
              </div>
            </div>
          )}

          {aggregateStats.totalDoubts > 0 && setActiveTab && (
            <div className="pt-1">
              <button
                onClick={() => setActiveTab('clarifications')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs cursor-pointer shadow-xs"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Resolver {aggregateStats.totalDoubts} dudas pendientes con el agente →</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Realistic One-Click Test Statements from Diego's Banks */}
      <div className="p-4 rounded-lg bg-neutral-50 dark:bg-[#252525] border border-neutral-200 dark:border-neutral-700 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Prueba rápida con tus formatos bancarios reales
            </h3>
          </div>
          <button
            onClick={handleLoadMultiSample}
            disabled={isProcessingQueue}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Probar Lote Multi-Tarjeta (Amex + Santander + Iberia)</span>
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Haz clic en cualquiera de estos extractos reales para encolar o prueba el botón de lote para ver la pila procesar varios archivos uno tras otro:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
          <button
            onClick={() => handleLoadSample('Santander (*3012)', REAL_SANTANDER_SAMPLE)}
            disabled={isProcessingQueue}
            className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-600">Santander (*3012)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/60 font-mono">40 mov.</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
              Alcampo, Alquiler Agustín, BMC September expenses, nómina, transferencias Amex...
            </p>
          </button>

          <button
            onClick={() => handleLoadSample('Santander Tarjeta (*0871)', REAL_SANTANDER_CREDIT_SAMPLE)}
            disabled={isProcessingQueue}
            className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-orange-600">Santander Tarjeta</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 dark:bg-orange-950/60 font-mono">14 mov.</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
              Suit Supply, devoluciones Zara, fraccionamiento compras, Ubers, Parking...
            </p>
          </button>

          <button
            onClick={() => handleLoadSample('Iberia Cards (*2366)', REAL_IBERIA_CARDS_SAMPLE)}
            disabled={isProcessingQueue}
            className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-700 dark:text-amber-400">Iberia Cards (*2366)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 font-mono">15 del mes</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
              Buga Ramen, Okappi BBQ, Repsol Waylet, renovación tarjeta... (liquidación 272,90€).
            </p>
          </button>

          <button
            onClick={() => handleLoadSample('American Express Platinum', REAL_AMEX_SAMPLE)}
            disabled={isProcessingQueue}
            className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-700 dark:text-blue-400">Amex Platinum</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 font-mono">138 mov.</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
              Signos auto-invertidos, categorías Amex mapeadas, pagos cruzados con Santander...
            </p>
          </button>

          <button
            onClick={() => handleLoadSample('N26 (*7089)', REAL_N26_SAMPLE)}
            disabled={isProcessingQueue}
            className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-600 dark:text-teal-400">N26 (*7089)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/60 font-mono">102 mov.</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
              RD, Miami, Aruba, Denia, Menorca, traspasos cruzados Santander...
            </p>
          </button>

          <button
            onClick={() => handleLoadSample('MyInvestor', REAL_MYINVESTOR_SAMPLE)}
            disabled={isProcessingQueue}
            className="p-3 rounded-lg bg-white dark:bg-[#303030] border border-neutral-200 dark:border-neutral-700 text-left text-xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">MyInvestor</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 font-mono">45 mov.</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
              Fondo Fidelity MSCI World, compra acciones, traspasos internos, remuneración...
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
