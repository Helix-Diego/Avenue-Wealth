import os
import re
from backend.database import get_connection

# Diego's standardized categories from his reference Excel / PDF
DIEGO_CATEGORIES = [
    "Sueldo",
    "Alimentación",
    "Restaurantes",
    "Gasolina",
    "Parking/Peajes/Ubers",
    "Coche",
    "Vivienda",
    "Gastos Vivienda",
    "Servicios/Suscripciones",
    "Entretenimiento",
    "Gastos Viajes",
    "Vuelos",
    "Compra Ropa",
    "Deporte/Gimnasio",
    "Educación",
    "Salud/Farmancia",
    "Otras compras",
    "Prestamos familiares",
    "Deudas y créditos",
    "Liquidación Tarjetas",
    "Traspaso entre cuentas",
    "Inversiones y ahorros",
    "Otros ingresos",
    "Impuestos y tasas",
    "Gastos de Empresa"
]

# Raw Knowledge Base extracted from Diego's 27-page PDF reference
KNOWLEDGE_BASE_ENTRIES = [
    # Sueldo
    ("BMC SOFTWARE", "Sueldo", 3127.84, "Nómina de BMC Software Sa"),
    ("NOMINA BMC", "Sueldo", 3189.34, "Nómina"),
    ("TRANSFERENCIA DE BMC SOFTWARE", "Sueldo", 2610.76, "Nómina mensual"),

    # Vivienda & Gastos Vivienda
    ("AGUSTIN DE LA FUENTE MARTINEZ", "Vivienda", -600.00, "Alquiler mensual vivienda"),
    ("ALQUILER - DIEGO HERNANDEZ", "Vivienda", -600.00, "Alquiler"),
    ("GASTOS COMUNES", "Gastos Vivienda", -50.00, "Gastos comunes piso"),
    ("GASTOS PISO REEMBOLSO", "Gastos Vivienda", -53.00, "Ajuste gastos piso"),
    ("GARSTOS PISO", "Gastos Vivienda", -50.00, "Gastos piso"),
    ("RECIBO LUZ", "Gastos Vivienda", -26.66, "Recibo luz compartida"),
    ("AJUSTE FACTURA GAS", "Gastos Vivienda", 53.00, "Ajuste factura gas"),
    ("IKEA", "Gastos Vivienda", -40.62, "Muebles y menaje piso"),
    ("CAPEX PISO", "Gastos Vivienda", 25.80, "Inversiones y capex piso"),
    ("8246 MAJADAHOND", "Gastos Vivienda", -77.55, "Compras vivienda"),
    ("YUSO MONTECARME", "Gastos Vivienda", -4.90, "Vivienda"),

    # Inversiones y Ahorros
    ("INVERSION MENSUAL", "Inversiones y ahorros", -500.00, "Aportación periódica inversión"),
    ("DIEGO HERNANDEZ TCACH CONCEPTO: AHORRO", "Inversiones y ahorros", -110.00, "Ahorro"),
    ("APORTACION FIDELITY MSCI", "Inversiones y ahorros", -1000.00, "Fondo MSCI World"),
    ("FIDELITY MSCI WORLD", "Inversiones y ahorros", -1000.00, "Fondo indexado"),

    # Alimentación
    ("ALCAMPO", "Alimentación", -22.52, "Supermercado"),
    ("MERCADONA", "Alimentación", -37.34, "Supermercado"),
    ("ALDI", "Alimentación", -50.39, "Supermercado"),
    ("SUPERCOR", "Alimentación", -14.38, "Supermercado"),
    ("SIMPLY MARKET", "Alimentación", -22.58, "Supermercado"),
    ("HIPER ALPEDRETE", "Alimentación", -4.00, "Alimentación"),
    ("GEL DUCHA", "Alimentación", -4.07, "Alimentación/Higiene"),
    ("COMPRA EN SPAY&LATAM", "Alimentación", -1.50, "Alimentación"),
    ("NOVODIO", "Alimentación", -1.10, "Alimentación"),

    # Restaurantes
    ("CROCHE CAFETIN", "Restaurantes", -12.10, "Cafetería/Bar"),
    ("LUIGI CUCINIELL", "Restaurantes", -22.20, "Restaurante italiano"),
    ("CHUPI LERENDI", "Restaurantes", -7.00, "Restaurante"),
    ("BAR EL BOCATA", "Restaurantes", -20.00, "Bocatería"),
    ("HUNDRED", "Restaurantes", -20.50, "Hamburguesería"),
    ("CAFETERIA VIPS", "Restaurantes", -11.50, "Vips"),
    ("GLOVO", "Restaurantes", -48.00, "Comida a domicilio"),
    ("COMETA BISTRO", "Restaurantes", -53.50, "Restaurante"),
    ("BURGUER CANGREBURGUER", "Restaurantes", 15.90, "Hamburguesas"),
    ("MAZAL RESTAURAC", "Restaurantes", -48.00, "Restaurante"),
    ("LOS POETAS", "Restaurantes", -15.00, "Bar/Restaurante"),
    ("CERVECERIA ALL", "Restaurantes", -31.10, "Cervecería"),
    ("MCDONAL", "Restaurantes", -10.10, "Fast food"),
    ("CASA BENJAMIN", "Restaurantes", -57.50, "Restaurante Denia"),
    ("RA-MEN KAGURA", "Restaurantes", -38.50, "Ramen"),
    ("RESTAURANTE EL, LLANES", "Restaurantes", -48.88, "Restaurante Llanes"),
    ("80 GRADOS", "Restaurantes", -43.65, "Restaurante 80 Grados"),
    ("TRAMO", "Restaurantes", -77.50, "Restaurante"),
    ("RESTAURANTE CHU", "Restaurantes", -12.00, "Restaurante"),
    ("AB SERVICIOS SELECTA", "Restaurantes", -1.30, "Máquina café"),
    ("100 MONTADITOS", "Restaurantes", -11.50, "Montaditos"),
    ("RESTAURANTE WHY", "Restaurantes", -18.70, "Restaurante"),
    ("EL CORNER", "Restaurantes", -17.00, "Bar"),
    ("EL CANTONET", "Restaurantes", -9.00, "Restaurante"),
    ("LA FRAGUA BBQ", "Restaurantes", -30.00, "Barbacoa"),
    ("MAKKILA", "Restaurantes", -35.65, "Restaurante"),
    ("HAJASUN", "Restaurantes", -25.35, "Restaurante"),
    ("RESTAURANTE DON", "Restaurantes", -11.00, "Restaurante"),
    ("BASKERVILLE", "Restaurantes", -9.00, "Restaurante"),
    ("RESTAURANTE OCE", "Restaurantes", -24.00, "Restaurante"),
    ("UBER * EATS", "Restaurantes", -32.62, "Comida delivery"),
    ("CENA LLANES", "Restaurantes", -40.00, "Cena amigos"),
    ("COMIDA RICA", "Restaurantes", -42.00, "Comida"),
    ("COMIDA ESCORIAL", "Restaurantes", -52.70, "Comida"),
    ("BIZUM CARLOS CENA", "Restaurantes", 16.00, "Cobro cena"),

    # Gasolina
    ("REPSOL", "Gasolina", -71.32, "Gasolinera Repsol Waylet"),
    ("REPSOL WAYLET", "Gasolina", -20.00, "Gasolinera"),
    ("TPV FUENCARRAL", "Gasolina", -59.61, "Gasolinera Fuencarral"),
    ("E.S. POZUELO", "Gasolina", -20.00, "Estación de Servicio Pozuelo"),
    ("E.S. ARAFRE", "Gasolina", -29.00, "Estación de servicio"),
    ("PLENOIL", "Gasolina", -46.54, "Gasolinera Plenoil"),
    ("PETROPRIX", "Gasolina", -60.32, "Gasolinera Petroprix"),
    ("CEDIPSA", "Gasolina", -29.25, "Gasolinera Cedipsa"),
    ("SALVADOR MAELLA", "Gasolina", -72.08, "Gasolinera Salvador Maella"),

    # Parking/Peajes/Ubers
    ("ATPSEITT AEROPUERT", "Parking/Peajes/Ubers", -0.60, "Peaje/Parking aeropuerto"),
    ("VOLTIO", "Parking/Peajes/Ubers", -7.30, "Coche compartido Voltio"),
    ("EASYPARK", "Parking/Peajes/Ubers", -7.57, "App parking zona SER"),
    ("AUTOPISTA M12", "Parking/Peajes/Ubers", -0.95, "Peaje M-12"),
    ("CASTELLANA DE AUTOPISTAS", "Parking/Peajes/Ubers", -15.15, "Peaje AP-6"),
    ("CABIFY", "Parking/Peajes/Ubers", -7.42, "Taxi/VTC"),
    ("UBER *TRIP", "Parking/Peajes/Ubers", -12.99, "Uber viaje"),
    ("UBR* PENDING.UBER.COM", "Parking/Peajes/Ubers", -16.94, "Uber transporte"),
    ("BKT-MAD-PARK", "Parking/Peajes/Ubers", -2.70, "Parking Madrid"),
    ("PARQUING 86", "Parking/Peajes/Ubers", -11.00, "Parking"),
    ("A EUROPEOS TNA", "Parking/Peajes/Ubers", -5.80, "Parking"),
    ("MARINA EL PORTE", "Parking/Peajes/Ubers", -5.62, "Parking Denia"),
    ("LA PLAZA, DENIA", "Parking/Peajes/Ubers", -7.90, "Parking Denia"),
    ("P.ISABEL LA CAT", "Parking/Peajes/Ubers", -2.30, "Parking Valladolid"),

    # Transporte (Transporte público general)
    ("METRO DE MADRID", "Transporte", -61.80, "Abono transporte metro"),
    ("APP CRTM", "Transporte", -8.00, "Recarga tarjeta transporte Madrid"),
    ("RENFE CERCANIAS", "Transporte", -3.40, "Billete Renfe Cercanías"),

    # Deporte/Gimnasio
    ("GO FIT", "Deporte/Gimnasio", -62.08, "Cuota mensual Go Fit gimnasio"),
    ("PLAYTOMIC", "Deporte/Gimnasio", -18.72, "Reserva pistas pádel"),
    ("PADEL BOX", "Deporte/Gimnasio", -5.00, "Pádel"),
    ("PADEL PEOPLE", "Deporte/Gimnasio", -7.25, "Pádel"),
    ("PADEL EL VALLE", "Deporte/Gimnasio", -6.00, "Pádel"),
    ("BIZUM PADEL", "Deporte/Gimnasio", 4.50, "Bizum amigos pádel"),
    ("LLAVES Y PADEL", "Deporte/Gimnasio", -7.50, "Pádel"),

    # Servicios/Suscripciones
    ("OPENAI", "Servicios/Suscripciones", -23.22, "Suscripción ChatGPT Plus"),
    ("CHATGPT", "Servicios/Suscripciones", -22.42, "Suscripción ChatGPT"),
    ("GOOGLE ONE", "Servicios/Suscripciones", -9.99, "Almacenamiento Google Cloud"),
    ("GOOGLE PAYMENT", "Servicios/Suscripciones", -9.99, "Google Services"),
    ("APPLE.COM/BILL", "Servicios/Suscripciones", -0.99, "Apple iCloud storage"),
    ("OVHCLOUD", "Servicios/Suscripciones", -2.27, "Hosting servidor OVH"),
    ("PLAYSTATION NETWORK", "Servicios/Suscripciones", -39.99, "PSN Suscripción"),
    ("UBER *ONE", "Servicios/Suscripciones", -2.50, "Suscripción Uber One"),

    # Gastos Viajes & Vuelos
    ("IBERIA", "Vuelos", -174.98, "Billete de avión Iberia"),
    ("AIR EUROPA", "Vuelos", -135.19, "Billete avión Air Europa"),
    ("WISE, BRUXELLES", "Gastos Viajes", -50.44, "Cambio divisa / tarjeta Wise"),
    ("WISE EUROPE SA", "Gastos Viajes", -782.00, "Viaje Las Vegas"),
    ("BOOKING.COM", "Gastos Viajes", -108.16, "Alojamiento hotel Booking"),
    ("SERVICE NAVIGO, PARIS", "Gastos Viajes", -17.35, "Transporte Navigo París"),
    ("LE RONDOR, PARIS", "Gastos Viajes", -71.50, "Restaurante París"),
    ("PHCH, PARIS", "Gastos Viajes", -34.80, "Comercio París"),
    ("BISTROT P BERT, PARIS", "Gastos Viajes", -95.00, "Restaurante París"),
    ("SAS SERVIDIS, PARIS", "Gastos Viajes", -18.32, "Servidis París"),
    ("BOLT.EU", "Gastos Viajes", -30.50, "Transporte Bolt"),
    ("GATE GOURMET", "Gastos Viajes", -7.50, "Comida aeropuerto"),
    ("SNCF VOYAGEURS", "Gastos Viajes", -5.00, "Tren Francia SNCF"),
    ("L'AVANT GOUT", "Gastos Viajes", -23.35, "Restaurante Francia"),
    ("LES TRIOLLETS", "Gastos Viajes", -15.00, "Café París"),
    ("G20 GRENIER STLAZARE", "Gastos Viajes", -5.28, "Supermercado París"),
    ("MCDO LOHEARCHES", "Gastos Viajes", -11.50, "McDo Francia"),
    ("GREAT CANADIAN", "Gastos Viajes", -13.00, "Restaurante París"),
    ("LES PHILOSOPHES", "Gastos Viajes", -53.00, "Restaurante París"),
    ("SELECTA SAS, LE BOURGET", "Gastos Viajes", -1.60, "Café París"),
    ("RELAY, ORLY", "Gastos Viajes", -3.70, "Tienda Orly aeropuerto"),
    ("COLLECTION PINAU", "Gastos Viajes", -10.00, "Museo París"),
    ("CCLV - ADV DEP, LAS VEGAS", "Gastos Viajes", -106.42, "Hotel Las Vegas"),
    ("HAWAIIAN", "Gastos Viajes", -67.34, "Viaje/Vuelos"),
    ("HOLAFLY", "Gastos Viajes", -38.90, "eSIM internet internacional Holafly"),
    ("HOTEL GRAN BAVARO", "Gastos Viajes", -995.80, "Hotel Gran Bávaro Princess RD"),
    ("BEST OF ARUBA", "Gastos Viajes", -81.05, "Excursión Best of Aruba"),
    ("GETYOURGUIDE", "Gastos Viajes", -117.54, "Tours y actividades GetYourGuide"),
    ("WELCOMEPICKUPS", "Gastos Viajes", -28.55, "Traslados Welcome Pickups"),
    ("LUIS EXCURSIONES", "Gastos Viajes", -20.92, "Excursiones República Dominicana"),
    ("DUFRY AILA", "Gastos Viajes", -69.42, "Duty Free aeropuerto RD"),
    ("BELLA MARE MUSEUM", "Gastos Viajes", -18.09, "Museo"),
    ("FUNDACION GPC", "Gastos Viajes", -16.16, "Fundación RD"),
    ("LOEWS MIAMI BEACH", "Gastos Viajes", -49.34, "Hotel Miami Beach"),
    ("TST* MANGO'S TROPICAL", "Gastos Viajes", -9.75, "Restaurante Miami"),
    ("LITTLE HAVANA CIGAR", "Gastos Viajes", -45.52, "Cigar Miami"),
    ("NEWSLINK 09 MIA", "Gastos Viajes", -5.94, "Tienda aeropuerto Miami"),
    ("STARBUCKS D15 MIA", "Gastos Viajes", -12.87, "Starbucks aeropuerto Miami"),
    ("STARBUCKS AILA", "Gastos Viajes", -23.04, "Starbucks aeropuerto RD"),
    ("BUCHE PERICO", "Gastos Viajes", -80.55, "Restaurante Buche Perico RD"),
    ("CASA BARISTA COLONIAL", "Gastos Viajes", -36.65, "Cafetería Casa Barista RD"),
    ("MARACA", "Gastos Viajes", -70.43, "Restaurante Maraca RD"),
    ("EL BUHO GASTROPUB", "Gastos Viajes", -101.50, "Restaurante El Búho RD"),
    ("FDR FOOD DRINK", "Gastos Viajes", -10.88, "Food & Drink RD"),
    ("KAHKOW ZONA COLONIAL", "Gastos Viajes", -11.48, "Chocolatería Kahkow RD"),
    ("CHOCOCLUB ZONA COLON", "Gastos Viajes", -27.64, "Chococlub RD"),
    ("RESTAURANTE LA MARCHAN", "Gastos Viajes", -18.87, "Restaurante La Marchan RD"),
    ("TIENDA RIDDIN US", "Gastos Viajes", -12.75, "Tienda"),
    ("COVA D EN XOROI", "Entretenimiento", -45.00, "Entradas Cova d'en Xoroi Menorca"),
    ("MERCADONA POIMA", "Alimentación", -23.30, "Mercadona Menorca"),
    ("LA MAR SALA", "Restaurantes", -17.50, "Restaurante La Mar Salá"),
    ("MALA VITA DENIA", "Restaurantes", -28.00, "Restaurante Mala Vita Denia"),
    ("BISORUS", "Restaurantes", -30.00, "Restaurante Bisorus"),
    ("SES GARCES", "Restaurantes", -23.00, "Restaurante Ses Garces"),
    ("SA GELATERIA", "Restaurantes", -5.10, "Heladería Sa Gelateria"),
    ("SUMUP *EL PRAU DE TER", "Restaurantes", -6.00, "Bar El Prau de Ter"),
    ("BAR LA RASA DE BERBES", "Restaurantes", -5.00, "Bar La Rasa"),
    ("PARKING EL RESET", "Parking/Peajes/Ubers", -3.35, "Parking"),
    ("PARKING CLUBO JUAN BRA", "Parking/Peajes/Ubers", -8.20, "Parking Juan Bravo"),
    ("ARAFRE REPSOL", "Gasolina", -14.90, "Gasolinera Repsol"),

    # Prestamos Familiares
    ("ENDESA", "Prestamos familiares", -226.49, "Cuota préstamo Endesa familiar"),
    ("FC 1933692 CUOTA", "Prestamos familiares", -226.49, "Cuota préstamo familiar"),
    ("JAVIER HERNANDEZ PORRAS", "Prestamos familiares", -120.00, "Movimientos con Javier"),
    ("ALEJANDRA HERNANDEZ TCACH", "Prestamos familiares", 35.92, "Movimientos con Alejandra"),
    ("ELISA TCACH KUPER", "Prestamos familiares", 150.00, "Movimientos con mamá (Elisa)"),
    ("CONCEPTO MAMA", "Prestamos familiares", 500.00, "Movimientos con mamá"),
    ("GROVER RENTAL", "Prestamos familiares", -35.92, "Alquiler Grover compartido"),
    ("DGT SANCIONES", "Prestamos familiares", -50.00, "Sanción DGT abonada"),
    ("ORANGE RECOBRO", "Prestamos familiares", -188.51, "Recobro Orange familiar"),
    ("HOLALFLY", "Prestamos familiares", -12.30, "eSIM familiar"),
    ("IBI TOLEDO", "Prestamos familiares", -50.00, "Impuesto IBI Toledo familiar"),
    ("BANKINTER CONCEPTO: TARJETA", "Prestamos familiares", -444.34, "Liquidación tarjeta Bankinter familiar"),
    ("RYANAIR 224L12FPR", "Prestamos familiares", -58.85, "Vuelo familiar"),

    # Educación
    ("UNIVERSIDAD POLITECNICA DE MADRID", "Educación", -67.89, "Matrícula Grado en Sistemas de Información UPM"),
    ("UPMACA", "Educación", -67.89, "Recibo UPM"),
    ("COPYFLYPRINT", "Educación", -9.37, "Impresión apuntes universidad"),

    # Salud / Farmacia
    ("BARBERIA GRUPO", "Salud/Farmancia", -19.90, "Peluquería / Barbería"),
    ("FARMACIA", "Salud/Farmancia", -10.09, "Farmacia"),
    ("FCIA.BERECIARTU", "Salud/Farmancia", -16.97, "Farmacia"),
    ("FCIA. DEL PINO", "Salud/Farmancia", -16.42, "Farmacia"),
    ("DKV SEGUROS", "Salud/Farmancia", 5.04, "Devolución seguro DKV"),

    # Compra Ropa
    ("ZARA", "Compra Ropa", -34.79, "Ropa Zara"),
    ("ASOS.COM", "Compra Ropa", -45.24, "Ropa Asos"),
    ("ADIDAS", "Compra Ropa", -33.30, "Ropa/Zapatillas Adidas"),
    ("ALVARO MORENO", "Compra Ropa", -51.90, "Ropa Alvaro Moreno"),
    ("SANCHINARRO H", "Compra Ropa", -55.15, "Ropa El Corte Inglés / Sanchinarro"),
    ("ZALA NDO", "Compra Ropa", -2.95, "Zalando"),
    ("CHANDAL", "Compra Ropa", -53.00, "Ropa deportiva"),

    # Otras compras
    ("AMAZON", "Otras compras", -11.19, "Amazon compras"),
    ("AMZN MKTP", "Otras compras", -5.29, "Amazon Marketplace"),
    ("ALIEXPRESS", "Otras compras", -5.70, "AliExpress compras"),
    ("EL CORTE INGLES", "Otras compras", -40.00, "El Corte Inglés"),
    ("CASA DEL LIBRO", "Otras compras", -19.00, "Libros"),
    ("SAMSONITE", "Otras compras", -211.00, "Maleta Samsonite Las Rozas"),
    ("DRUNI", "Otras compras", -54.95, "Perfumería Druni"),
    ("EIFFELTEXTILE", "Otras compras", -91.90, "Textil hogar"),
    ("FERRETERIA SILO", "Otras compras", -3.35, "Ferretería"),
    ("ESTANCO", "Otras compras", -8.70, "Estanco"),
    ("GOOGLE STORE", "Otras compras", -79.99, "Google hardware"),
    ("XIAOMI", "Otras compras", -42.98, "Xiaomi Store"),
    ("TOY PLANET", "Otras compras", -52.94, "Juguetería"),
    ("FLORAQUEEN", "Otras compras", -57.80, "Flores FloraQueen"),
    ("REGALO", "Otras compras", 106.00, "Regalos"),

    # Entretenimiento
    ("FEVER", "Entretenimiento", -14.31, "Entradas Fever ocio"),
    ("LOOMISP", "Entretenimiento", -12.80, "Entretenimiento"),
    ("FIESTA", "Entretenimiento", 16.50, "Fiesta"),
    ("CAMINO, MADRID", "Entretenimiento", -10.00, "Ocio"),
    ("US43 SAN LORENZ", "Entretenimiento", -20.00, "Ocio"),
    ("FASS", "Entretenimiento", -4.95, "Cerveza/Ocio"),
    ("CERVES", "Entretenimiento", 7.00, "Cervezas"),
    ("JUEGO", "Entretenimiento", -30.00, "Juegos"),
    ("AFORO RMCF", "Entretenimiento", -140.00, "Entradas Real Madrid CF"),
    ("CINES IMF", "Entretenimiento", -14.00, "Entradas cine"),
    ("KINEPOLIS", "Entretenimiento", -22.00, "Cine"),

    # Deudas y créditos
    ("UNICAJA BANCO", "Deudas y créditos", -49.20, "Crédito Unicaja Fpv"),
    ("CAIXABANK PAYMENTS CONSUMER", "Deudas y créditos", -51.48, "Crédito CaixaBank Consumer"),

    # Liquidación Tarjetas (recibos domiciliados mensuales de tarjetas para no duplicar con extractos)
    ("RECIBO IBERIA CARDS", "Liquidación Tarjetas", -350.00, "Recibo domiciliado mensual tarjeta Iberia Cards (*2366)"),
    ("IBERIA CARDS 4361", "Liquidación Tarjetas", -350.00, "Recibo liquidación tarjeta Iberia Cards"),
    ("RECIBO AMERICAN EXPRESS", "Liquidación Tarjetas", -300.00, "Recibo domiciliado mensual tarjeta American Express"),
    ("LIQUIDACION DE LAS TARJETAS DE CREDITO", "Liquidación Tarjetas", -210.66, "Liquidación tarjetas crédito Santander (*3012)"),

    # Traspaso entre cuentas (transferencias a Amex y movimientos entre cuentas propias: Santander 3012, Ahorro 1842, N26, MyInvestor)
    ("TRANSFERENCIA INMEDIATA A FAVOR DE AMERICAN EXPRESS", "Traspaso entre cuentas", -500.00, "Transferencia enviada a American Express"),
    ("A FAVOR DE AMERICAN EXPRESS", "Traspaso entre cuentas", -500.00, "Transferencia a cuenta American Express"),
    ("TRASPASO: AMEX", "Traspaso entre cuentas", -200.00, "Traspaso a American Express"),
    ("CUOTA AMEX", "Traspaso entre cuentas", -65.00, "Traspaso / cuota Amex"),
    ("COMIDA AMEX", "Traspaso entre cuentas", -185.00, "Traspaso Amex"),
    ("SMEX", "Traspaso entre cuentas", -109.00, "Traspaso Amex"),
    ("TRAJE Y AMEX", "Traspaso entre cuentas", -160.00, "Traspaso Amex"),
    ("TRANSFERENCIA DESDE MYINVESTOR", "Traspaso entre cuentas", 200.00, "Traspaso interno desde MyInvestor"),
    ("DESDE MYINVESTOR", "Traspaso entre cuentas", 200.00, "Traspaso interno desde MyInvestor"),
    ("ENVIADA DESDE N26", "Traspaso entre cuentas", 20.00, "Traspaso interno desde cuenta N26"),
    ("N26 TOP-UP", "Traspaso entre cuentas", -30.00, "Recarga cuenta N26 propia"),
    ("TRASPASO: AHORRO", "Traspaso entre cuentas", -500.00, "Traspaso entre cuentas propias a cuenta ahorro"),
    ("CONCEPTO AHORRO", "Traspaso entre cuentas", -300.00, "Traspaso a cuenta de ahorro propia"),
    ("CONCEPTO: INVERSIÓN", "Traspaso entre cuentas", -750.00, "Traspaso a cuenta de inversión"),
    ("CONCEPTO: INVERSION", "Traspaso entre cuentas", -750.00, "Traspaso a cuenta de inversión"),
    ("CONCEPTO INVERSION", "Traspaso entre cuentas", -500.00, "Traspaso a cuenta de inversión"),
    ("AHORRO COCHE SOFI", "Traspaso entre cuentas", -160.00, "Traspaso a cuenta de ahorro coche"),
    ("COCHE SOFI", "Traspaso entre cuentas", -75.00, "Traspaso interno ahorro coche"),
    ("TRASPASO: TRAJE", "Traspaso entre cuentas", -382.00, "Traspaso interno entre cuentas"),
    ("TRASPASO: MENORCA", "Traspaso entre cuentas", -300.00, "Traspaso interno entre cuentas viaje"),
    ("TRASPASO: MÁLAGA", "Traspaso entre cuentas", -280.00, "Traspaso interno entre cuentas"),
    ("TRASPASO: MALAGA", "Traspaso entre cuentas", -280.00, "Traspaso interno entre cuentas"),
    ("TRASPASO: HOTEL MALAGA", "Traspaso entre cuentas", -250.00, "Traspaso interno entre cuentas"),
    ("TRASPASO: COCHE ARUBA", "Traspaso entre cuentas", -126.00, "Traspaso interno entre cuentas"),
    ("TRASPASO: DESAYUNO BMC", "Traspaso entre cuentas", -130.00, "Traspaso interno entre cuentas"),
    ("TRASPASO: ENTRADA NFL", "Traspaso entre cuentas", -60.00, "Traspaso interno entre cuentas"),
    ("TRASPASO: ZAPATOW", "Traspaso entre cuentas", -80.00, "Traspaso interno entre cuentas"),
    ("TRASPASO: CREDTO", "Traspaso entre cuentas", -50.00, "Traspaso interno entre cuentas"),

    # Impuestos y tasas
    ("DNI/PASAPORTE", "Impuestos y tasas", -12.00, "Tasa expedición DNI/Pasaporte"),
    ("IMAGE CENTER", "Impuestos y tasas", -6.00, "Fotos carnet"),

    # Otros ingresos
    ("LIQUIDACION POR BONIFICACION DE CAMPAÑA", "Otros ingresos", 243.00, "Bonificación bancaria contrato"),
    ("BONIFICACION DE CAMPAÑA", "Otros ingresos", 81.00, "Bonificación banco"),
    ("LOTERIA", "Otros ingresos", 50.00, "Premio lotería"),
    ("INGRESO CONTRA CUENTA EN ATM", "Otros ingresos", 220.00, "Ingreso en cajero"),

    # Comercios & Servicios Frecuentes (Revolut, CaixaBank, ING)
    ("SBB CFF FFS", "Transporte & Gasolina", -50.00, "Trenes y transporte público SBB CFF FFS"),
    ("DECATHLON", "Deporte & Gimnasio", -30.00, "Tienda de deportes Decathlon"),
    ("MIGROS", "Alimentación & Supermercado", -10.00, "Supermercado Migros"),
    ("UDEMY", "Educación", -20.00, "Cursos online Udemy"),
    ("DISNEY PLUS", "Suscripciones & Servicios", -6.99, "Suscripción Disney+"),
    ("DISNEY+", "Suscripciones & Servicios", -6.99, "Suscripción Disney+"),
    ("DGT SANCIONES", "Transporte & Gasolina", -50.00, "Sanciones de tráfico DGT"),
    ("CENTRO DE SEG", "Transporte & Gasolina", -20.66, "Centro de reconocimientos y seguridad"),
    ("SA FLORISTERIA", "Otras compras", -52.00, "Floristería"),
    ("UNIVERSITÉ DE LAUSANNE", "Educación", -20.00, "Tasas universitarias"),
    ("101RESTOS", "Restaurantes & Ocio", -6.45, "Restaurante"),
    ("PAGO EN REVOLUT", "Traspaso entre cuentas", -100.00, "Recarga de cuenta Revolut"),
    ("APPLE PAY TOP-UP", "Traspaso entre cuentas", 150.00, "Recarga con Apple Pay a Revolut"),
    ("EXCHANGED TO CHF", "Traspaso entre cuentas", -50.00, "Cambio de divisa entre cuentas propias"),
    ("TU AHORRO CRECE", "Inversiones y ahorros", -0.84, "Redondeo de compras a ahorro ING"),
]

def init_knowledge_base():
    """
    Initializes knowledge_base table in SQLite and populates it.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        sample_amount REAL,
        notes TEXT,
        frequency INTEGER DEFAULT 1
    )
    """)

    for pat, cat, amt, note in KNOWLEDGE_BASE_ENTRIES:
        cursor.execute("""
        INSERT INTO knowledge_base (pattern, category, sample_amount, notes, frequency)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(pattern) DO UPDATE SET
            category = excluded.category,
            sample_amount = excluded.sample_amount,
            notes = excluded.notes
        """, (pat.upper(), cat, amt, note))

    conn.commit()
    conn.close()

def match_knowledge_base(description: str):
    """
    Matches description against Diego's Knowledge Base.
    Returns (category, confidence, notes) or None.
    """
    desc_upper = description.upper()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT pattern, category, notes, sample_amount FROM knowledge_base ORDER BY LENGTH(pattern) DESC")
    entries = cursor.fetchall()
    conn.close()

    for row in entries:
        pattern = row["pattern"]
        if pattern in desc_upper:
            return {
                "category": row["category"],
                "confidence": 0.98,
                "notes": f"Coincidencia exacta con Knowledge Base: {pattern} ({row['notes']})",
                "matched_pattern": pattern
            }

    return None

def get_few_shots_for_ai(limit: int = 25):
    """
    Returns sample entries for few-shot prompting in DeepSeek.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT pattern, category, sample_amount, notes FROM knowledge_base ORDER BY id ASC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [{"concept": r["pattern"], "category": r["category"], "amount": r["sample_amount"], "notes": r["notes"]} for r in rows]

if __name__ == "__main__":
    init_knowledge_base()
    print("Knowledge Base initialized with", len(KNOWLEDGE_BASE_ENTRIES), "entries!")
