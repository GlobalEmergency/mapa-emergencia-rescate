export interface ContactLine {
  type: "phone" | "email" | "web" | "hours";
  label: string;
  href?: string;
}

export interface DonationPoint {
  city: string;
  name: string;
  address: string;
  hours?: string;
  accepts?: string;
  source: string;
  sourceHref: string;
  updatedAt: string;
}

export interface ShareChannel {
  name: string;
  description: string;
  href: string;
  source: string;
  sourceHref: string;
  updatedAt: string;
  status?: "verified" | "social";
}

export interface CountryOffice {
  country: string;
  countryCode: string;
  organization: string;
  lines: ContactLine[];
  donationPoints?: DonationPoint[];
  shareChannels?: ShareChannel[];
}

export const OFFICES: CountryOffice[] = [
  {
    country: "Alemania",
    countryCode: "DE",
    organization: "Deutsches Rotes Kreuz / Aktion Deutschland Hilft",
    lines: [
      {
        type: "web",
        label: "DRK - Venezuela: Erdbebenhilfe",
        href: "https://www.drk.de/hilfe-weltweit/wo-wir-helfen/lateinamerika/venezuela-erdbebenhilfe/",
      },
      {
        type: "web",
        label: "Aktion Deutschland Hilft - Erdbeben Venezuela",
        href: "https://www.aktion-deutschland-hilft.de/de/hilfseinsaetze/erdbeben-venezuela-spenden-sie-jetzt/",
      },
    ],
    shareChannels: [
      {
        name: "Deutsches Rotes Kreuz",
        description:
          "Cruz Roja Alemana recaudando fondos para apoyar a las personas afectadas por los terremotos en Venezuela.",
        href: "https://www.drk.de/hilfe-weltweit/wo-wir-helfen/lateinamerika/venezuela-erdbebenhilfe/",
        source: "Deutsches Rotes Kreuz",
        sourceHref:
          "https://www.drk.de/hilfe-weltweit/wo-wir-helfen/lateinamerika/venezuela-erdbebenhilfe/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Aktion Deutschland Hilft",
        description:
          "Alianza alemana de organizaciones humanitarias con cuenta de donación específica para Erdbeben Venezuela.",
        href: "https://www.aktion-deutschland-hilft.de/de/hilfseinsaetze/erdbeben-venezuela-spenden-sie-jetzt/",
        source: "Aktion Deutschland Hilft",
        sourceHref:
          "https://www.aktion-deutschland-hilft.de/de/hilfseinsaetze/erdbeben-venezuela-spenden-sie-jetzt/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Argentina",
    countryCode: "AR",
    organization: "Cruz Roja Argentina",
    lines: [
      {
        type: "web",
        label: "cruzroja.org.ar/rcf",
        href: "https://www.cruzroja.org.ar/rcf/",
      },
    ],
    donationPoints: [
      {
        city: "Buenos Aires",
        name: "Colecta comunidad venezolana",
        address: "Amenábar 1024, Ciudad de Buenos Aires",
        hours: "13:00 a 19:00",
        accepts:
          "Ropa, calzado, alimentos no perecederos, higiene, medicamentos y primeros auxilios.",
        source: "Noticias Argentinas",
        sourceHref:
          "https://noticiasargentinas.com/internacionales/terremoto-en-venezuela--organizan-una-colecta-solidaria-en-buenos-aires-para-enviar-ayuda-a-los-damnificados_a6a3d5c14fd88dacfc571f701",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Buenos Aires",
        name: "Colecta comunidad venezolana",
        address: "Libertad 996, Ciudad de Buenos Aires",
        hours: "10:00 a 21:00",
        accepts:
          "Ropa, calzado, alimentos no perecederos, higiene, medicamentos y primeros auxilios.",
        source: "Noticias Argentinas",
        sourceHref:
          "https://noticiasargentinas.com/internacionales/terremoto-en-venezuela--organizan-una-colecta-solidaria-en-buenos-aires-para-enviar-ayuda-a-los-damnificados_a6a3d5c14fd88dacfc571f701",
        updatedAt: "25 jun 2026",
      },
      {
        city: "San Juan",
        name: "Venezolanos se movilizan en San Juan",
        address:
          "Salón B, planta baja del Centro de Convenciones, San Juan, Argentina",
        accepts:
          "Alimentos no perecederos, medicinas, ropa y otros insumos de ayuda humanitaria.",
        source: "Diario Móvil",
        sourceHref:
          "https://www.facebook.com/DiarioMovilOK/posts/venezolanos-se-movilizan-en-san-juan-la-tragedia-causada-por-los-terremotos-que-/1441568848018288/",
        updatedAt: "25 jun 2026",
      },
    ],
    shareChannels: [
      {
        name: "Alianza Venezuela",
        description:
          "Organización en CABA mencionada como canal para centralizar ayuda humanitaria enviada desde Argentina.",
        href: "https://www.eldiariosur.com/esteban-echeverria/2026/6/25/venezolanos-en-monte-grande-luis-guillon-organizan-una-colecta-para-ayudar-las-victimas-del-terremoto-81142.html",
        source: "El Diario Sur",
        sourceHref:
          "https://www.eldiariosur.com/esteban-echeverria/2026/6/25/venezolanos-en-monte-grande-luis-guillon-organizan-una-colecta-para-ayudar-las-victimas-del-terremoto-81142.html",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Aruba",
    countryCode: "AW",
    organization: "Aruba se une por Venezuela",
    lines: [
      {
        type: "web",
        label: "Centro principal en Paseo Herencia Mall",
        href: "https://www.facebook.com/calientearuba/posts/aruba-aruba-se-moviliza-para-brindar-ayuda-humanitaria-a-los-afectados-por-el-te/1326099352835331/",
      },
    ],
    donationPoints: [
      {
        city: "Palm Beach",
        name: "Paseo Herencia Mall",
        address: "J.E. Irausquin Blvd. 382-A, Palm Beach, Aruba",
        accepts:
          "Insumos destinados a familias afectadas por el terremoto; verificar lista vigente antes de trasladarse.",
        source: "Caliente 90.7 FM Aruba",
        sourceHref:
          "https://www.facebook.com/calientearuba/posts/aruba-aruba-se-moviliza-para-brindar-ayuda-humanitaria-a-los-afectados-por-el-te/1326099352835331/",
        updatedAt: "25 jun 2026",
      },
    ],
    shareChannels: [
      {
        name: "Aruba se une por Venezuela",
        description:
          "Campaña comunitaria con centro principal de acopio en Paseo Herencia Mall, Palm Beach.",
        href: "https://www.instagram.com/p/DaBIkBgGlT0/",
        source: "Instagram / Caliente 90.7 FM Aruba",
        sourceHref: "https://www.instagram.com/p/DaBIkBgGlT0/",
        updatedAt: "25 jun 2026",
        status: "social",
      },
    ],
  },
  {
    country: "Australia",
    countryCode: "AU",
    organization: "Emergency Action Alliance / Save the Children Australia",
    lines: [
      {
        type: "web",
        label: "Emergency Action Alliance - Venezuela Earthquake",
        href: "https://emergencyaction.org.au/venezuela-earthquake/",
      },
      {
        type: "web",
        label: "Australian Red Cross Global Emergency Fund",
        href: "https://www.redcross.org.au/global-emergency",
      },
    ],
    shareChannels: [
      {
        name: "Emergency Action Alliance Australia",
        description:
          "Alianza australiana monitoreando la emergencia y preparando rutas de apelación para organizaciones miembro.",
        href: "https://emergencyaction.org.au/venezuela-earthquake/",
        source: "Emergency Action Alliance",
        sourceHref: "https://emergencyaction.org.au/venezuela-earthquake/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Save the Children Australia",
        description:
          "Canal australiano de Save the Children difundiendo la respuesta a los terremotos en Venezuela.",
        href: "https://www.facebook.com/SaveTheChildrenAustralia/posts/powerful-earthquakes-have-devastated-parts-of-venezuela-leaving-people-trapped-b/1496229342537409/",
        source: "Save the Children Australia",
        sourceHref:
          "https://www.facebook.com/SaveTheChildrenAustralia/posts/powerful-earthquakes-have-devastated-parts-of-venezuela-leaving-people-trapped-b/1496229342537409/",
        updatedAt: "25 jun 2026",
        status: "social",
      },
      {
        name: "Australian Red Cross Global Emergency Fund",
        description:
          "Fondo global para emergencias internacionales de Cruz Roja Australiana.",
        href: "https://www.redcross.org.au/global-emergency",
        source: "Australian Red Cross",
        sourceHref: "https://www.redcross.org.au/global-emergency",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Barbados",
    countryCode: "BB",
    organization: "Gobierno de Barbados",
    lines: [
      {
        type: "web",
        label: "Barbados lista para asistir a Venezuela",
        href: "https://demerarawaves.com/2026/06/25/guyana-barbados-trinidad-ready-to-assist-earthquake-devastated-venezuela/",
      },
    ],
    shareChannels: [
      {
        name: "Apoyo de Barbados",
        description:
          "Barbados informó que está listo para asistir a Venezuela de cualquier forma posible tras los terremotos.",
        href: "https://demerarawaves.com/2026/06/25/guyana-barbados-trinidad-ready-to-assist-earthquake-devastated-venezuela/",
        source: "Demerara Waves",
        sourceHref:
          "https://demerarawaves.com/2026/06/25/guyana-barbados-trinidad-ready-to-assist-earthquake-devastated-venezuela/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Bolivia",
    countryCode: "BO",
    organization: "Gobierno de Bolivia",
    lines: [
      {
        type: "web",
        label: "Bolivia ofreció ayuda a Venezuela",
        href: "https://ticotimes.net/2026/06/25/venezuela-earthquake-death-toll-tops-160-as-costa-rica-pledges-aid",
      },
    ],
    shareChannels: [
      {
        name: "Apoyo de Bolivia",
        description:
          "Bolivia fue reportada entre los gobiernos que ofrecieron ayuda tras los terremotos en Venezuela.",
        href: "https://ticotimes.net/2026/06/25/venezuela-earthquake-death-toll-tops-160-as-costa-rica-pledges-aid",
        source: "The Tico Times",
        sourceHref:
          "https://ticotimes.net/2026/06/25/venezuela-earthquake-death-toll-tops-160-as-costa-rica-pledges-aid",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Brasil",
    countryCode: "BR",
    organization: "Gobierno de Brasil / Itamaraty",
    lines: [
      {
        type: "web",
        label: "Brasil evalúa asistencia para Venezuela",
        href: "https://contrapunto.com/global/latinoamerica/colombia-activo-todas-las-capacidades-para-apoyar-a-venezuela-tras-terremotos-brasil-ofrecio-ayuda-al-pais/",
      },
    ],
    shareChannels: [
      {
        name: "Apoyo humanitario de Brasil",
        description:
          "Brasil expresó solidaridad y pidió a Itamaraty evaluar, junto a la embajada en Caracas, medidas de asistencia para Venezuela.",
        href: "https://contrapunto.com/global/latinoamerica/colombia-activo-todas-las-capacidades-para-apoyar-a-venezuela-tras-terremotos-brasil-ofrecio-ayuda-al-pais/",
        source: "Contrapunto",
        sourceHref:
          "https://contrapunto.com/global/latinoamerica/colombia-activo-todas-las-capacidades-para-apoyar-a-venezuela-tras-terremotos-brasil-ofrecio-ayuda-al-pais/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Canadá",
    countryCode: "CA",
    organization: "San Lorenzo Community Center",
    lines: [
      {
        type: "phone",
        label: "416-831-4187",
        href: "tel:+14168314187",
      },
      {
        type: "email",
        label: "donation@sanlorenzo.ca",
        href: "mailto:donation@sanlorenzo.ca",
      },
    ],
    donationPoints: [
      {
        city: "Toronto",
        name: "San Lorenzo Community Center",
        address: "22 Wenderly Dr, Toronto, ON",
        accepts: "Donaciones presenciales y transferencias electrónicas.",
        source: "Toronto Hispano",
        sourceHref:
          "https://www.torontohispano.com/publicacion/donde-hacer-donaciones-en-toronto-venezuela-terremoto-2026/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Toronto",
        name: "Radiotón solidaria - Iglesia San Lorenzo",
        address: "2981 Dufferin St, Toronto, ON",
        hours: "27 y 28 de junio, 12:00 p.m. a 9:00 p.m.",
        accepts:
          "Fondos y apoyo comunitario para personas afectadas por el terremoto.",
        source: "Toronto Hispano",
        sourceHref:
          "https://www.torontohispano.com/publicacion/donde-hacer-donaciones-en-toronto-venezuela-terremoto-2026/",
        updatedAt: "25 jun 2026",
      },
    ],
    shareChannels: [
      {
        name: "San Lorenzo Community Center",
        description:
          "Campaña solidaria en Toronto con donaciones presenciales, e-transfer y radiotón.",
        href: "https://www.torontohispano.com/publicacion/donde-hacer-donaciones-en-toronto-venezuela-terremoto-2026/",
        source: "Toronto Hispano",
        sourceHref:
          "https://www.torontohispano.com/publicacion/donde-hacer-donaciones-en-toronto-venezuela-terremoto-2026/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Canadian Red Cross - Venezuela Earthquakes Appeal",
        description:
          "Apelación oficial de Cruz Roja Canadiense para apoyar a personas afectadas por los terremotos en Venezuela.",
        href: "https://give.redcross.ca/page/26VEA?_lang=en",
        source: "Canadian Red Cross",
        sourceHref: "https://www.redcross.ca/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Chequia",
    countryCode: "CZ",
    organization: "People in Need",
    lines: [
      {
        type: "web",
        label: "SOS Venezuela Emergency Appeal",
        href: "https://www.peopleinneed.net/launching-sos-venezuela-appeal-after-tragic-earthquake-13590gp",
      },
    ],
    shareChannels: [
      {
        name: "People in Need - SOS Venezuela",
        description:
          "Organización checa con operación en Venezuela y cuenta/IBAN publicados para aumentar ayuda humanitaria.",
        href: "https://www.peopleinneed.net/launching-sos-venezuela-appeal-after-tragic-earthquake-13590gp",
        source: "People in Need",
        sourceHref:
          "https://www.peopleinneed.net/launching-sos-venezuela-appeal-after-tragic-earthquake-13590gp",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "China",
    countryCode: "CN",
    organization: "Ministerio de Relaciones Exteriores de China",
    lines: [
      {
        type: "web",
        label: "China lista para asistir a Venezuela",
        href: "https://www.fmprc.gov.cn/mfa_eng/xw/fyrbt/202606/t20260625_11952387.html",
      },
    ],
    shareChannels: [
      {
        name: "Apoyo de China",
        description:
          "China informó que está lista para evaluar ayuda adecuada según las necesidades de Venezuela tras los terremotos.",
        href: "https://www.fmprc.gov.cn/mfa_eng/xw/fyrbt/202606/t20260625_11952387.html",
        source: "Foreign Ministry of China",
        sourceHref:
          "https://www.fmprc.gov.cn/mfa_eng/xw/fyrbt/202606/t20260625_11952387.html",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Chile",
    countryCode: "CL",
    organization: "Gobierno de Chile / Venezolanos en Chile",
    lines: [
      {
        type: "web",
        label: "Cómo ayudar desde Chile",
        href: "https://www.24horas.cl/internacional/noticias/terremoto-venezuela-campanas-desaparecidos-ayudar-chile",
      },
    ],
    shareChannels: [
      {
        name: "Ayuda humanitaria desde Chile",
        description:
          "Chile informó coordinación de mecanismos de cooperación y envío de ayuda humanitaria urgente para las zonas afectadas.",
        href: "https://www.24horas.cl/internacional/noticias/terremoto-venezuela-campanas-desaparecidos-ayudar-chile",
        source: "24 Horas",
        sourceHref:
          "https://www.24horas.cl/internacional/noticias/terremoto-venezuela-campanas-desaparecidos-ayudar-chile",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Venezolanos en Chile",
        description:
          "Agrupaciones venezolanas en Chile están difundiendo campañas solidarias y antecedentes para búsqueda de desaparecidos.",
        href: "https://www.24horas.cl/internacional/noticias/terremoto-venezuela-campanas-desaparecidos-ayudar-chile",
        source: "24 Horas",
        sourceHref:
          "https://www.24horas.cl/internacional/noticias/terremoto-venezuela-campanas-desaparecidos-ayudar-chile",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Colombia",
    countryCode: "CO",
    organization: "Cruz Roja Colombiana",
    lines: [
      {
        type: "email",
        label: "rcf@cruzrojacolombiana.org",
        href: "mailto:rcf@cruzrojacolombiana.org",
      },
      {
        type: "phone",
        label: "(+57) 321 213 9525",
        href: "tel:+573212139525",
      },
      {
        type: "phone",
        label: "Bogotá/Cundinamarca: WhatsApp 324 530 9495",
        href: "https://wa.me/573245309495",
      },
      {
        type: "email",
        label: "Bogotá/Cundinamarca: rcf@cruzrojabogota.org.co",
        href: "mailto:rcf@cruzrojabogota.org.co",
      },
    ],
    donationPoints: [
      {
        city: "Bogotá",
        name: "Fundación Juntos Se Puede",
        address: "Calle 104 #54-31, Pasadena, Suba",
        hours: "Desde las 7:00 a.m.",
        accepts: "Ayudas para familias afectadas y apoyo de búsqueda familiar.",
        source: "Infobae",
        sourceHref:
          "https://www.infobae.com/colombia/2026/06/25/en-bogota-habilitan-punto-de-acopio-para-recibir-ayudas-para-los-venezolanos-damnificados-por-los-recientes-terremotos/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Cartagena",
        name: "Centro Intégrate",
        address: "Barrio Líbano, Cra. 49 #31B-125, detrás de Unitecnar",
        hours: "8:00 a.m. a 4:00 p.m.",
        accepts:
          "Alimentos no perecederos, agua, aseo, higiene personal, ropa y primera necesidad.",
        source: "Infobae",
        sourceHref:
          "https://www.infobae.com/colombia/2026/06/25/alcalde-dumek-turbay-anuncio-ayuda-humanitaria-y-puntos-de-contacto-para-afectados-por-la-tragedia-en-venezuela/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Santander",
        name: "Campaña departamental de Gestión del Riesgo",
        address:
          "Gobernación de Santander, Indersantander, Lotería de Santander, Estadio Américo Montanini y Oficina Departamental para la Gestión del Riesgo en Floridablanca",
        hours: "Fin de semana, 9:00 a.m. a 6:00 p.m.",
        accepts:
          "Alimentos no perecederos, kits de aseo, colchonetas, frazadas para clima cálido y primera necesidad.",
        source: "Caracol Radio",
        sourceHref:
          "https://caracol.com.co/2026/06/25/en-santander-se-inicia-recoleccion-de-ayudas-para-afectados-por-terremoto-en-venezuela/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Barranquilla",
        name: "Centro de acopio Barranquillita",
        address: "Carrera 43 #6-120, sector Barranquillita",
        hours: "8:00 a.m. a 4:00 p.m.",
        accepts:
          "Agua potable, alimentos no perecederos, insumos médicos, medicamentos, ropa, abrigos, colchones, colchonetas y aseo personal.",
        source: "Caracol Radio",
        sourceHref:
          "https://caracol.com.co/2026/06/25/barranquilla-habilita-centro-de-acopio-para-apoyar-a-afectados-por-terremoto-en-venezuela/",
        updatedAt: "25 jun 2026",
      },
    ],
    shareChannels: [
      {
        name: "Fundación Juntos Se Puede",
        description:
          "Centro de acopio en Bogotá y apoyo para ubicar familiares en listas de desaparecidos.",
        href: "https://www.fundacionjuntossepuede.org/",
        source: "Infobae",
        sourceHref:
          "https://www.infobae.com/colombia/2026/06/25/en-bogota-habilitan-punto-de-acopio-para-recibir-ayudas-para-los-venezolanos-damnificados-por-los-recientes-terremotos/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Cuba",
    countryCode: "CU",
    organization: "Colaboradores de salud de Cuba",
    lines: [
      {
        type: "web",
        label: "Cuba moviliza colaboradores de salud",
        href: "https://www.swissinfo.ch/spa/pa%C3%ADses-de-todo-el-mundo-ofrecen-ayuda-a-venezuela-tras-los-mort%C3%ADferos-terremotos/91646660",
      },
    ],
    shareChannels: [
      {
        name: "Colaboradores de salud cubanos",
        description:
          "Cuba informó que sus colaboradores de salud presentes en Venezuela están movilizados y prestando servicios médicos a la población afectada.",
        href: "https://www.swissinfo.ch/spa/pa%C3%ADses-de-todo-el-mundo-ofrecen-ayuda-a-venezuela-tras-los-mort%C3%ADferos-terremotos/91646660",
        source: "AFP / Swissinfo",
        sourceHref:
          "https://www.swissinfo.ch/spa/pa%C3%ADses-de-todo-el-mundo-ofrecen-ayuda-a-venezuela-tras-los-mort%C3%ADferos-terremotos/91646660",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Costa Rica",
    countryCode: "CR",
    organization: "Cruz Roja Costarricense",
    lines: [
      {
        type: "phone",
        label: "+506 6060-8623",
        href: "tel:+50660608623",
      },
      {
        type: "email",
        label: "rcf@cruzroja.or.cr",
        href: "mailto:rcf@cruzroja.or.cr",
      },
      { type: "hours", label: "7:30 a.m. a 5:00 p.m." },
    ],
  },
  {
    country: "Ecuador",
    countryCode: "EC",
    organization: "Cruz Roja Ecuatoriana",
    lines: [
      {
        type: "phone",
        label: "+098 595 6683",
        href: "tel:+0985956683",
      },
      {
        type: "email",
        label: "busquedadefamiliares@cruzroja.org.ec",
        href: "mailto:busquedadefamiliares@cruzroja.org.ec",
      },
      { type: "hours", label: "08:30 a.m. a 5:00 p.m." },
    ],
    donationPoints: [
      {
        city: "Quito",
        name: "Cachapas El Félix",
        address: "Av. Naciones Unidas y Av. 10 de Agosto",
        accepts:
          "Alimentos no perecibles, agua, kits de higiene, medicamentos básicos, ropa y mantas.",
        source: "Teleamazonas",
        sourceHref:
          "https://www.teleamazonas.com/actualidad/noticias/sociedad/terremoto-venezuela-puntos-acopio-donaciones-ecuador-121128/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Quito",
        name: "IMPAQTO La Carolina",
        address: "Av. Shyris y Suecia, edificio IQON",
        accepts:
          "Alimentos no perecibles, agua, kits de higiene, medicamentos básicos, ropa y mantas.",
        source: "Teleamazonas",
        sourceHref:
          "https://www.teleamazonas.com/actualidad/noticias/sociedad/terremoto-venezuela-puntos-acopio-donaciones-ecuador-121128/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Quito",
        name: "Edificio Gaudí",
        address: "Calle Checoslovaquia; preguntar por Luis Magallanes",
        accepts:
          "Agua potable, alimentos no perecibles, insumos médicos, higiene, pañales, cobijas, linternas, baterías, radios y materiales básicos de rescate.",
        source: "Teleamazonas",
        sourceHref:
          "https://www.teleamazonas.com/actualidad/noticias/sociedad/terremoto-venezuela-puntos-acopio-donaciones-ecuador-121128/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Guayaquil",
        name: "Chamos Burger",
        address: "Av. Víctor Emilio Estrada y Jiguas",
        accepts:
          "Alimentos no perecibles, agua, kits de higiene, medicamentos básicos, ropa y mantas.",
        source: "Teleamazonas",
        sourceHref:
          "https://www.teleamazonas.com/actualidad/noticias/sociedad/terremoto-venezuela-puntos-acopio-donaciones-ecuador-121128/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Guayaquil",
        name: "Arepazo Guayanés",
        address: "Rodrigo Icaza Cornejo y Enrique Gil Gilbert",
        accepts: "Alimentos, ropa en buen estado y calzado.",
        source: "Ecuavisa",
        sourceHref:
          "https://www.ecuavisa.com/ecuador/terremoto-venezuela-puntos-donaciones-afectados-quito-guayaquil--20260625-0032.html",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Cuenca",
        name: "Edificio Portal del Sol",
        address: "Av. 12 de Octubre y calle Emilio Carrere, sector Yanuncay",
        accepts:
          "Alimentos no perecibles, agua, kits de higiene, medicamentos básicos, ropa y mantas.",
        source: "Teleamazonas",
        sourceHref:
          "https://www.teleamazonas.com/actualidad/noticias/sociedad/terremoto-venezuela-puntos-acopio-donaciones-ecuador-121128/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Guayaquil",
        name: "Centro de acopio Alborada",
        address: "Ciudadela Alborada, cuarta etapa, manzana FF, villa 6",
        source: "Ecuavisa",
        sourceHref:
          "https://www.ecuavisa.com/ecuador/terremoto-venezuela-puntos-donaciones-afectados-quito-guayaquil--20260625-0032.html",
        updatedAt: "25 jun 2026",
      },
    ],
    shareChannels: [
      {
        name: "Cruz Roja Ecuatoriana",
        description:
          "Canal para búsqueda y restablecimiento de contacto familiar desde Ecuador.",
        href: "https://www.cruzroja.org.ec/",
        source: "Ecuavisa",
        sourceHref:
          "https://www.ecuavisa.com/ecuador/terremoto-venezuela-puntos-donaciones-afectados-quito-guayaquil--20260625-0032.html",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Puntos en Quito y Guayaquil",
        description:
          "Información periodística con direcciones y tipos de donativos aceptados en Ecuador.",
        href: "https://www.ecuavisa.com/ecuador/terremoto-venezuela-puntos-donaciones-afectados-quito-guayaquil--20260625-0032.html",
        source: "Ecuavisa",
        sourceHref:
          "https://www.ecuavisa.com/ecuador/terremoto-venezuela-puntos-donaciones-afectados-quito-guayaquil--20260625-0032.html",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "IMPAQTO La Carolina",
        description:
          "Centro de acopio difundido en redes: Av. de los Shyris y Suecia, Edificio IQON.",
        href: "https://www.instagram.com/reel/DaBLb8YOJvt/",
        source: "Instagram",
        sourceHref: "https://www.instagram.com/reel/DaBLb8YOJvt/",
        updatedAt: "25 jun 2026",
        status: "social",
      },
      {
        name: "Yo Te Apoyo",
        description:
          "Centro de acopio difundido en redes: Jorge Juan N31-191 y Av. Mariana de Jesús, Quito.",
        href: "https://www.instagram.com/p/DaA_djUkdNS/",
        source: "Instagram",
        sourceHref: "https://www.instagram.com/p/DaA_djUkdNS/",
        updatedAt: "25 jun 2026",
        status: "social",
      },
    ],
  },
  {
    country: "El Salvador",
    countryCode: "SV",
    organization: "Gobierno de El Salvador",
    lines: [
      {
        type: "web",
        label: "Rescatistas y suministros para Venezuela",
        href: "https://www.al-monitor.com/originals/2026/06/factbox-international-aid-heads-venezuela-after-deadly-earthquake",
      },
    ],
    shareChannels: [
      {
        name: "Apoyo de El Salvador",
        description:
          "El Salvador informó que 300 rescatistas y paramédicos, junto a 50 toneladas de suministros médicos, estaban preparados para viajar a Venezuela.",
        href: "https://www.al-monitor.com/originals/2026/06/factbox-international-aid-heads-venezuela-after-deadly-earthquake",
        source: "Reuters / Al-Monitor",
        sourceHref:
          "https://www.al-monitor.com/originals/2026/06/factbox-international-aid-heads-venezuela-after-deadly-earthquake",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "España",
    countryCode: "ES",
    organization: "Venezuelan Press / asociaciones venezolanas",
    lines: [
      {
        type: "email",
        label: "directiva@venezuelanpress.com",
        href: "mailto:directiva@venezuelanpress.com",
      },
      {
        type: "web",
        label: "Guía de ayuda desde España",
        href: "https://www.venezuelanpress.com/2026/06/25/venezuelan-press-ante-el-terremoto-en-venezuela-informacion-y-redes-de-apoyo/",
      },
    ],
    donationPoints: [
      {
        city: "Madrid",
        name: "Asociación Civil Venezolanos en España",
        address:
          "Pardillo Center, Avda. de Madrid 4, Local 1, 28229 Villanueva del Pardillo",
        accepts: "Ayuda humanitaria para personas afectadas por el terremoto.",
        source: "Venezuelan Press",
        sourceHref:
          "https://www.venezuelanpress.com/2026/06/25/venezuelan-press-ante-el-terremoto-en-venezuela-informacion-y-redes-de-apoyo/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Tenerife",
        name: "Centro de acopio permanente",
        address: "Calle de Francisco García Talavera 2, 38009 Santa Cruz de Tenerife",
        accepts: "Ayuda humanitaria para personas afectadas por el terremoto.",
        source: "Venezuelan Press",
        sourceHref:
          "https://www.venezuelanpress.com/2026/06/25/venezuelan-press-ante-el-terremoto-en-venezuela-informacion-y-redes-de-apoyo/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Valencia",
        name: "Asociación Venezolana en España - Comunidad Valenciana",
        address: "Avenida Amado Granell Mesado 66, bajo derecha",
        accepts:
          "Alimentos no perecederos, material sanitario y donaciones económicas.",
        source: "Venezuelan Press",
        sourceHref:
          "https://www.venezuelanpress.com/2026/06/25/venezuelan-press-ante-el-terremoto-en-venezuela-informacion-y-redes-de-apoyo/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Valencia",
        name: "Testau Gastro Bar",
        address: "Avenida Burjassot, bajo 29",
        accepts:
          "Alimentos no perecederos, material sanitario y donaciones económicas.",
        source: "Venezuelan Press",
        sourceHref:
          "https://www.venezuelanpress.com/2026/06/25/venezuelan-press-ante-el-terremoto-en-venezuela-informacion-y-redes-de-apoyo/",
        updatedAt: "25 jun 2026",
      },
    ],
    shareChannels: [
      {
        name: "Cruz Roja Española",
        description:
          "Donaciones directas para Venezuela por Bizum 33512 o SMS con la palabra VENEZUELA al 38092.",
        href: "https://www.cruzroja.es/",
        source: "THE OBJECTIVE",
        sourceHref:
          "https://theobjective.com/internacional/2026-06-25/guia-ayuda-venezuela-espana-terremoto/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "We Love Venezuela Foundation",
        description:
          "Fondo de emergencia para apoyar familias y comunidades afectadas.",
        href: "https://www.welove.foundation/",
        source: "THE OBJECTIVE",
        sourceHref:
          "https://theobjective.com/internacional/2026-06-25/guia-ayuda-venezuela-espana-terremoto/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "GlobalGiving - Venezuela Earthquake Relief Fund",
        description:
          "Fondo internacional que canaliza donaciones hacia organizaciones locales verificadas.",
        href: "https://www.globalgiving.org/",
        source: "THE OBJECTIVE",
        sourceHref:
          "https://theobjective.com/internacional/2026-06-25/guia-ayuda-venezuela-espana-terremoto/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "World Central Kitchen",
        description:
          "Canal de donación desde España por Bizum 03843 o vía web.",
        href: "https://wck.org/",
        source: "THE OBJECTIVE",
        sourceHref:
          "https://theobjective.com/internacional/2026-06-25/guia-ayuda-venezuela-espana-terremoto/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Francia",
    countryCode: "FR",
    organization: "Croix-Rouge française",
    lines: [
      {
        type: "web",
        label: "Croix-Rouge française - séismes Venezuela",
        href: "https://donner.croix-rouge.fr/~share?cid=394&lang=en_EN",
      },
    ],
    shareChannels: [
      {
        name: "Croix-Rouge française",
        description:
          "Donaciones destinadas a acciones de la Cruz Roja Francesa en apoyo a poblaciones afectadas por los terremotos.",
        href: "https://donner.croix-rouge.fr/~share?cid=394&lang=en_EN",
        source: "Croix-Rouge française",
        sourceHref: "https://donner.croix-rouge.fr/~share?cid=394&lang=en_EN",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Guyana",
    countryCode: "GY",
    organization: "Gobierno de Guyana",
    lines: [
      {
        type: "web",
        label: "Guyana lista para asistir a Venezuela",
        href: "https://demerarawaves.com/2026/06/25/guyana-barbados-trinidad-ready-to-assist-earthquake-devastated-venezuela/",
      },
    ],
    shareChannels: [
      {
        name: "Apoyo de Guyana",
        description:
          "Guyana expresó solidaridad y disposición a ofrecer asistencia dentro de sus capacidades ante la emergencia en Venezuela.",
        href: "https://demerarawaves.com/2026/06/25/guyana-barbados-trinidad-ready-to-assist-earthquake-devastated-venezuela/",
        source: "Demerara Waves",
        sourceHref:
          "https://demerarawaves.com/2026/06/25/guyana-barbados-trinidad-ready-to-assist-earthquake-devastated-venezuela/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Honduras",
    countryCode: "HN",
    organization: "Cruz Roja Hondureña",
    lines: [
      {
        type: "phone",
        label: "+504 9849-5556",
        href: "tel:+50498495556",
      },
      {
        type: "email",
        label: "busquedarcf@cruzroja.org.hn",
        href: "mailto:busquedarcf@cruzroja.org.hn",
      },
      { type: "hours", label: "8:00 a.m. a 4:00 p.m." },
    ],
  },
  {
    country: "India",
    countryCode: "IN",
    organization: "Gobierno de India",
    lines: [
      {
        type: "web",
        label: "India ofrece asistencia a Venezuela",
        href: "https://www.newindianexpress.com/india/2026/Jun/25/india-stands-ready-to-help-pm-modi-condoles-loss-of-lives-in-venezuela-earthquake-disaster",
      },
    ],
    shareChannels: [
      {
        name: "Asistencia humanitaria de India",
        description:
          "India expresó solidaridad y disposición a extender toda la asistencia posible para labores de alivio y recuperación.",
        href: "https://www.newindianexpress.com/india/2026/Jun/25/india-stands-ready-to-help-pm-modi-condoles-loss-of-lives-in-venezuela-earthquake-disaster",
        source: "The New Indian Express",
        sourceHref:
          "https://www.newindianexpress.com/india/2026/Jun/25/india-stands-ready-to-help-pm-modi-condoles-loss-of-lives-in-venezuela-earthquake-disaster",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Irán",
    countryCode: "IR",
    organization: "Ministerio de Relaciones Exteriores de Irán",
    lines: [
      {
        type: "web",
        label: "Irán ofrece apoyo de rescate",
        href: "https://www.swissinfo.ch/spa/pa%C3%ADses-de-todo-el-mundo-ofrecen-ayuda-a-venezuela-tras-los-mort%C3%ADferos-terremotos/91646660",
      },
    ],
    shareChannels: [
      {
        name: "Apoyo de rescate de Irán",
        description:
          "Irán expresó disposición a proporcionar toda la ayuda necesaria en operaciones de rescate y salvamento en Venezuela.",
        href: "https://www.swissinfo.ch/spa/pa%C3%ADses-de-todo-el-mundo-ofrecen-ayuda-a-venezuela-tras-los-mort%C3%ADferos-terremotos/91646660",
        source: "AFP / Swissinfo",
        sourceHref:
          "https://www.swissinfo.ch/spa/pa%C3%ADses-de-todo-el-mundo-ofrecen-ayuda-a-venezuela-tras-los-mort%C3%ADferos-terremotos/91646660",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Irlanda",
    countryCode: "IE",
    organization: "UNICEF Ireland",
    lines: [
      {
        type: "web",
        label: "UNICEF Ireland - Venezuela Earthquake Appeal",
        href: "https://www.unicef.ie/donate/venezuela-earthquake-appeal/",
      },
    ],
    shareChannels: [
      {
        name: "UNICEF Ireland",
        description:
          "Campaña irlandesa de donación para agua, salud y protección de niños afectados por los terremotos.",
        href: "https://www.unicef.ie/donate/venezuela-earthquake-appeal/",
        source: "UNICEF Ireland",
        sourceHref: "https://www.unicef.ie/donate/venezuela-earthquake-appeal/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Israel",
    countryCode: "IL",
    organization: "IsraAID",
    lines: [
      {
        type: "web",
        label: "IsraAID Emergency Fund",
        href: "https://www.israaid.org/media/as-devastating-earthquakes-strike-venezuela-israaid-responds/",
      },
    ],
    shareChannels: [
      {
        name: "IsraAID",
        description:
          "ONG israelí desplegando equipo de emergencia hacia Venezuela, con foco en primeros auxilios psicológicos, agua, saneamiento y evaluación rápida de necesidades.",
        href: "https://www.israaid.org/media/as-devastating-earthquakes-strike-venezuela-israaid-responds/",
        source: "IsraAID",
        sourceHref:
          "https://www.israaid.org/media/as-devastating-earthquakes-strike-venezuela-israaid-responds/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Jamaica",
    countryCode: "JM",
    organization: "Gobierno de Jamaica",
    lines: [
      {
        type: "web",
        label: "Jamaica lista para apoyar alivio regional",
        href: "https://jamaica-gleaner.com/article/world-news/20260625/govt-opposition-voice-solidarity-venezuela-following-deadly-venezuela",
      },
    ],
    shareChannels: [
      {
        name: "Apoyo de Jamaica",
        description:
          "Jamaica informó que está lista para apoyar el esfuerzo de alivio y recuperación en lo que pueda, junto a la comunidad regional.",
        href: "https://jamaica-gleaner.com/article/world-news/20260625/govt-opposition-voice-solidarity-venezuela-following-deadly-venezuela",
        source: "Jamaica Gleaner",
        sourceHref:
          "https://jamaica-gleaner.com/article/world-news/20260625/govt-opposition-voice-solidarity-venezuela-following-deadly-venezuela",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Italia",
    countryCode: "IT",
    organization: "Croce Rossa Italiana / Save the Children Italia",
    lines: [
      {
        type: "web",
        label: "Croce Rossa Italiana - raccolta fondi",
        href: "https://cri.it/",
      },
      {
        type: "web",
        label: "Save the Children Italia - Terremoto Venezuela",
        href: "https://www.savethechildren.it/blog-notizie/terremoto-venezuela-bambini-e-famiglie-emergenza",
      },
    ],
    shareChannels: [
      {
        name: "Croce Rossa Italiana",
        description:
          "Raccolta fondi de Cruz Roja Italiana para apoyar a la población golpeada por los terremotos.",
        href: "https://cri.it/",
        source: "Croce Rossa Italiana",
        sourceHref: "https://cri.it/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Save the Children Italia",
        description:
          "Canal italiano de Save the Children para apoyo a niños y familias afectadas.",
        href: "https://www.savethechildren.it/blog-notizie/terremoto-venezuela-bambini-e-famiglie-emergenza",
        source: "Save the Children Italia",
        sourceHref:
          "https://www.savethechildren.it/blog-notizie/terremoto-venezuela-bambini-e-famiglie-emergenza",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Caritas Ambrosiana",
        description:
          "Raccolta fondi italiana con causale Emergenza terremoto Venezuela, coordinada con la red Caritas.",
        href: "https://www.chiesadimilano.it/news/attualita/venezuela-terremoto-aiuti-caritas-2876946.html",
        source: "Chiesa di Milano",
        sourceHref:
          "https://www.chiesadimilano.it/news/attualita/venezuela-terremoto-aiuti-caritas-2876946.html",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "México",
    countryCode: "MX",
    organization: "Cruz Roja Mexicana",
    lines: [
      {
        type: "phone",
        label: "56-45-85-32-74",
        href: "tel:+525645853274",
      },
    ],
    donationPoints: [
      {
        city: "Veracruz",
        name: "Centros de acopio de Cruz Roja Mexicana",
        address: "Puerto de Veracruz, Jalapa y Orizaba",
        source: "Cruz Roja Jalisco",
        sourceHref:
          "https://www.facebook.com/CruzRojaJalisco/posts/tras-los-sismos-registrados-este-24-de-junio-en-venezuela-cruz-roja-mexicana-bri/1480327794135225/",
        updatedAt: "25 jun 2026",
      },
    ],
  },
  {
    country: "Países Bajos",
    countryCode: "NL",
    organization: "Rode Kruis Nederland",
    lines: [
      {
        type: "web",
        label: "Rode Kruis - gironummer 5125",
        href: "https://www.rodekruis.nl/persberichten/rode-kruis-opent-gironummer-5125-voor-slachtoffers-aardbeving-venezuela/",
      },
    ],
    shareChannels: [
      {
        name: "Rode Kruis Nederland",
        description:
          "Cruz Roja Neerlandesa abrió el giro 5125 para ayudar a víctimas del terremoto en Venezuela.",
        href: "https://www.rodekruis.nl/persberichten/rode-kruis-opent-gironummer-5125-voor-slachtoffers-aardbeving-venezuela/",
        source: "Rode Kruis Nederland",
        sourceHref:
          "https://www.rodekruis.nl/persberichten/rode-kruis-opent-gironummer-5125-voor-slachtoffers-aardbeving-venezuela/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Panamá",
    countryCode: "PA",
    organization: "Alcaldía de Panamá / centros aliados",
    lines: [
      {
        type: "web",
        label: "Centros de acopio en Panamá",
        href: "https://www.telemetro.com/nacionales/lista-centros-acopio-panama-ayudar-victimas-del-terremoto-venezuela-n6083254",
      },
    ],
    donationPoints: [
      {
        city: "Ciudad de Panamá",
        name: "Teatro Gladys Vidal",
        address: "Planta baja del Edificio Hatillo, sede de la Alcaldía de Panamá",
        hours: "Jueves 25 y viernes 26 de junio, 8:00 a.m. a 4:00 p.m.",
        accepts:
          "Alimentos no perecederos, emergencia, higiene, ropa limpia o nueva, mochilas, útiles escolares y alimentos para mascotas.",
        source: "TVN",
        sourceHref:
          "https://www.tvn-2.com/nacionales/venezuela-alcaldia-panama-activa-centro-acopio-ayuda-humanitaria-terremotos_1_2247885.html",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Ciudad de Panamá",
        name: "Costa del Este - Este Sport Center",
        address:
          "Estacionamientos del Este Sport Center, entrada por avenida La Rotonda, contiguo al edificio Bladex y detrás de Nación Sushi",
        hours: "Jueves 25 y viernes 26 de junio, 12:00 m. a 8:00 p.m.",
        accepts:
          "Agua, alimentos no perecederos, fórmula y alimentos para bebés, higiene, primeros auxilios, carpas, lonas, mantas, colchonetas y mosquiteros.",
        source: "Ellas",
        sourceHref:
          "https://www.ellas.pa/estilo-de-vida/cinco-centros-de-acopio-en-panama-reciben-ayuda-para-afectados-por-el-terremoto-en-venezuela/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Panamá",
        name: "Supermercados Riba Smith",
        address: "Todas las sucursales de Riba Smith",
        hours: "Hasta el domingo 28 de junio; horario regular de cada sucursal",
        accepts:
          "Agua, alimentos no perecederos, medicamentos e insumos básicos de primeros auxilios e higiene personal.",
        source: "Telemetro",
        sourceHref:
          "https://www.telemetro.com/nacionales/lista-centros-acopio-panama-ayudar-victimas-del-terremoto-venezuela-n6083254",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Ciudad de Panamá",
        name: "Casa Club del Parque Omar",
        address: "Casa Club del Parque Omar",
        hours:
          "Jueves 25 y viernes 26 de junio, 8:00 a.m. a 8:00 p.m.; sábado 27, 8:00 a.m. a 2:00 p.m.",
        accepts: "Alimentos no perecederos y agua embotellada.",
        source: "Telemetro",
        sourceHref:
          "https://www.telemetro.com/nacionales/lista-centros-acopio-panama-ayudar-victimas-del-terremoto-venezuela-n6083254",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Panamá / Colón",
        name: "Iglesia Refugio Panamá",
        address:
          "Avenida Domingo Díaz, Plaza Roosevelt; y sede de La Verbena, Cativá, provincia de Colón",
        hours: "Jueves a domingo, 9:00 a.m. a 6:00 p.m.",
        accepts:
          "Alimentos, higiene, insumos médicos y productos de primera necesidad.",
        source: "Ellas",
        sourceHref:
          "https://www.ellas.pa/estilo-de-vida/cinco-centros-de-acopio-en-panama-reciben-ayuda-para-afectados-por-el-terremoto-en-venezuela/",
        updatedAt: "25 jun 2026",
      },
    ],
    shareChannels: [
      {
        name: "Alcaldía de Panamá",
        description:
          "Campaña Todos con Venezuela con centro de acopio en el Edificio Hatillo.",
        href: "https://www.tvn-2.com/nacionales/venezuela-alcaldia-panama-activa-centro-acopio-ayuda-humanitaria-terremotos_1_2247885.html",
        source: "TVN",
        sourceHref:
          "https://www.tvn-2.com/nacionales/venezuela-alcaldia-panama-activa-centro-acopio-ayuda-humanitaria-terremotos_1_2247885.html",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Perú",
    countryCode: "PE",
    organization: "Gobierno de Perú",
    lines: [
      {
        type: "web",
        label: "Perú comprometió personal de emergencia",
        href: "https://www.telesurenglish.net/venezuela-thanks-global-solidarity/",
      },
    ],
    shareChannels: [
      {
        name: "Apoyo de Perú",
        description:
          "Perú fue reportado entre los países que comprometieron personal de emergencia para apoyar a Venezuela tras los terremotos.",
        href: "https://www.telesurenglish.net/venezuela-thanks-global-solidarity/",
        source: "teleSUR English",
        sourceHref: "https://www.telesurenglish.net/venezuela-thanks-global-solidarity/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Nueva Zelanda",
    countryCode: "NZ",
    organization: "Save the Children New Zealand",
    lines: [
      {
        type: "web",
        label: "Save the Children NZ - Venezuela Earthquake",
        href: "https://www.savethechildren.org.nz/media-hub/venezuela-earthquake-rescuers-race-to-free-people",
      },
    ],
    shareChannels: [
      {
        name: "Save the Children New Zealand",
        description:
          "Canal de emergencia para apoyar protección, salud, refugio y alimentos para niños y familias afectadas.",
        href: "https://www.savethechildren.org.nz/media-hub/venezuela-earthquake-rescuers-race-to-free-people",
        source: "Save the Children NZ",
        sourceHref:
          "https://www.savethechildren.org.nz/media-hub/venezuela-earthquake-rescuers-race-to-free-people",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Puerto Rico",
    countryCode: "PR",
    organization: "Casa Venezuela Puerto Rico / Municipio de Aguadilla",
    lines: [
      {
        type: "web",
        label: "Coordinación de ayuda humanitaria",
        href: "https://www.elnuevodia.com/noticias/locales/notas/casi-no-hemos-dormido-a-la-expectativa-venezolanos-en-puerto-rico-tras-los-terremotos-en-su-pais/",
      },
    ],
    donationPoints: [
      {
        city: "San Juan",
        name: "Centro de Convenciones de Puerto Rico",
        address: "Salón B, planta baja, 100 Convention Blvd, San Juan, PR",
        accepts:
          "Alimentos no perecederos, medicinas, ropa, cajas o bolsas de ayuda humanitaria.",
        source: "El Vigía News",
        sourceHref:
          "https://www.facebook.com/ElVigiaNews/posts/%F0%9D%98%BE%F0%9D%99%8A%F0%9D%99%88%F0%9D%99%84%F0%9D%99%80%F0%9D%99%89%F0%9D%99%95%F0%9D%98%BC%F0%9D%99%89-%F0%9D%99%80%F0%9D%99%89-%F0%9D%99%8B%F0%9D%99%90%F0%9D%99%80%F0%9D%99%8D%F0%9D%99%8F%F0%9D%99%8A-%F0%9D%99%8D%F0%9D%99%84%F0%9D%98%BE%F0%9D%99%8A-%F0%9D%99%87%F0%9D%99%8A%F0%9D%99%8E-%F0%9D%99%8B%F0%9D%99%8D%F0%9D%99%80%F0%9D%99%8B%F0%9D%98%BC%F0%9D%99%8D%F0%9D%98%BC%F0%9D%99%8F%F0%9D%99%84%F0%9D%99%91%F0%9D%99%8A%F0%9D%99%8E-%F0%9D%99%8B%F0%9D%98%BC%F0%9D%99%8D%F0%9D%98%BC-%F0%9D%99%80%F0%9D%99%89%F0%9D%99%91%F0%9D%99%84%F0%9D%98%BC%F0%9D%99%8D-%F0%9D%98%BC%F0%9D%99%94%F0%9D%99%90%F0%9D%98%BF%F0%9D%98%BC-%F0%9D%99%83%F0%9D%99%90%F0%9D%99%88%F0%9D%98%BC%F0%9D%99%89%F0%9D%99%84%F0%9D%99%8F%F0%9D%98%BC%F0%9D%99%8D%F0%9D%99%84%F0%9D%98%BC-%F0%9D%98%BC-%F0%9D%99%91%F0%9D%99%80%F0%9D%99%89%F0%9D%99%80%F0%9D%99%95%F0%9D%99%90/1414816940680237/",
        updatedAt: "25 jun 2026",
      },
    ],
    shareChannels: [
      {
        name: "Casa Venezuela Puerto Rico",
        description:
          "Organización venezolana en Puerto Rico coordinando ayuda humanitaria; El Nuevo Día reportó coordinación con el Departamento de Estado y aviso del Municipio de Aguadilla sobre un centro de acopio.",
        href: "https://www.elnuevodia.com/noticias/locales/notas/casi-no-hemos-dormido-a-la-expectativa-venezolanos-en-puerto-rico-tras-los-terremotos-en-su-pais/",
        source: "El Nuevo Día",
        sourceHref:
          "https://www.elnuevodia.com/noticias/locales/notas/casi-no-hemos-dormido-a-la-expectativa-venezolanos-en-puerto-rico-tras-los-terremotos-en-su-pais/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Qatar",
    countryCode: "QA",
    organization: "Gobierno de Qatar",
    lines: [
      {
        type: "web",
        label: "Qatar despacha equipos de rescate",
        href: "https://www.dailysabah.com/world/americas/aid-pours-in-as-venezuela-reels-from-deadly-twin-earthquakes",
      },
    ],
    shareChannels: [
      {
        name: "Equipos de rescate de Qatar",
        description:
          "Qatar despachó equipos de rescate para asistir a Venezuela tras los terremotos, según reporte internacional de ayuda movilizada.",
        href: "https://www.dailysabah.com/world/americas/aid-pours-in-as-venezuela-reels-from-deadly-twin-earthquakes",
        source: "Daily Sabah",
        sourceHref:
          "https://www.dailysabah.com/world/americas/aid-pours-in-as-venezuela-reels-from-deadly-twin-earthquakes",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "República Dominicana",
    countryCode: "DO",
    organization: "Centro de Acopio Unidos por Venezuela",
    lines: [
      {
        type: "web",
        label: "Centro en Hard Rock Café Punta Cana",
        href: "https://bavaronews.com/locales/venezolanos-en-punta-cana-habilitan-centro-de-acopio-para-asistir-afectados-por-terremotos/",
      },
    ],
    donationPoints: [
      {
        city: "Punta Cana",
        name: "Hard Rock Café Punta Cana",
        address:
          "Plaza Downtown, Blvd. Turístico del Este esquina Ave. Barceló, Punta Cana",
        accepts:
          "Alimentos no perecederos, agua, medicamentos, ropa y artículos de primera necesidad.",
        source: "Bávaro News",
        sourceHref:
          "https://bavaronews.com/locales/venezolanos-en-punta-cana-habilitan-centro-de-acopio-para-asistir-afectados-por-terremotos/",
        updatedAt: "25 jun 2026",
      },
    ],
    shareChannels: [
      {
        name: "Centro de Acopio Unidos por Venezuela",
        description:
          "Iniciativa de venezolanos en Punta Cana para recibir ayuda humanitaria en Hard Rock Café Punta Cana.",
        href: "https://bavaronews.com/locales/venezolanos-en-punta-cana-habilitan-centro-de-acopio-para-asistir-afectados-por-terremotos/",
        source: "Bávaro News",
        sourceHref:
          "https://bavaronews.com/locales/venezolanos-en-punta-cana-habilitan-centro-de-acopio-para-asistir-afectados-por-terremotos/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Reino Unido",
    countryCode: "GB",
    organization: "British Red Cross / organizaciones humanitarias",
    lines: [
      {
        type: "web",
        label: "British Red Cross Disaster Fund",
        href: "https://www.redcross.org.uk/",
      },
      {
        type: "web",
        label: "Save the Children UK",
        href: "https://www.savethechildren.org.uk/how-you-can-help/emergencies/venezuela-earthquake",
      },
    ],
    shareChannels: [
      {
        name: "British Red Cross",
        description:
          "Apelación al Disaster Fund para apoyar a personas afectadas por los terremotos.",
        href: "https://www.redcross.org.uk/",
        source: "The Times",
        sourceHref:
          "https://www.thetimes.com/world/latin-america/article/venezuela-hit-by-powerful-back-to-back-earthquakes-pfjbxbvcz",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Save the Children UK",
        description:
          "Respuesta para salud, protección infantil, refugio y alimentos con equipos y socios movilizados.",
        href: "https://www.savethechildren.org.uk/how-you-can-help/emergencies/venezuela-earthquake",
        source: "Save the Children UK",
        sourceHref:
          "https://www.savethechildren.org.uk/how-you-can-help/emergencies/venezuela-earthquake",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Healing Venezuela",
        description:
          "Organización basada en Reino Unido que da soporte sanitario en Venezuela y abrió canales de donación para la emergencia.",
        href: "https://healingvenezuela.org/",
        source: "THE OBJECTIVE",
        sourceHref:
          "https://theobjective.com/internacional/2026-06-25/guia-ayuda-venezuela-espana-terremoto/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Islamic Relief UK",
        description:
          "Llamado de emergencia para apoyar a familias afectadas por el doble terremoto.",
        href: "https://www.islamic-relief.org.uk/giving/appeals/venezuela-earthquake-appeal/",
        source: "Islamic Relief UK",
        sourceHref:
          "https://www.islamic-relief.org.uk/giving/appeals/venezuela-earthquake-appeal/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Suiza",
    countryCode: "CH",
    organization: "Swiss Red Cross",
    lines: [
      {
        type: "web",
        label: "Swiss Red Cross - Earthquake in Venezuela",
        href: "https://www.redcross.ch/en",
      },
    ],
    shareChannels: [
      {
        name: "Swiss Red Cross",
        description:
          "Canal oficial suizo para apoyo a operaciones de rescate y asistencia médica a afectados por el terremoto.",
        href: "https://www.redcross.ch/en",
        source: "Swiss Red Cross",
        sourceHref: "https://www.redcross.ch/en",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Suecia",
    countryCode: "SE",
    organization: "Plan International Sverige",
    lines: [
      {
        type: "web",
        label: "Akut insamling jordbävning i Venezuela",
        href: "https://plansverige.org/",
      },
    ],
    shareChannels: [
      {
        name: "Plan International Sverige",
        description:
          "Campaña sueca de emergencia para niños y familias afectadas por los terremotos en Venezuela.",
        href: "https://plansverige.org/",
        source: "Plan Sverige",
        sourceHref: "https://plansverige.org/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Santa Sede",
    countryCode: "VA",
    organization: "Limosnería Apostólica",
    lines: [
      {
        type: "web",
        label: "Ayuda inicial del Papa León XIV",
        href: "https://www.ansa.it/english/news/vatican/2026/06/25/pope-sends-initial-aid-of-100000-euros-to-venezuela_28277e86-8eb4-4631-806b-446b2161846f.html",
      },
    ],
    shareChannels: [
      {
        name: "Limosnería Apostólica",
        description:
          "La Santa Sede envió una ayuda inicial de 100.000 euros para apoyar labores de socorro tras los terremotos en Venezuela.",
        href: "https://www.ansa.it/english/news/vatican/2026/06/25/pope-sends-initial-aid-of-100000-euros-to-venezuela_28277e86-8eb4-4631-806b-446b2161846f.html",
        source: "ANSA",
        sourceHref:
          "https://www.ansa.it/english/news/vatican/2026/06/25/pope-sends-initial-aid-of-100000-euros-to-venezuela_28277e86-8eb4-4631-806b-446b2161846f.html",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Sudáfrica",
    countryCode: "ZA",
    organization: "Islamic Relief South Africa",
    lines: [
      {
        type: "web",
        label: "Islamic Relief SA - Venezuela Earthquake Appeal",
        href: "https://islamic-relief.org.za/",
      },
    ],
    shareChannels: [
      {
        name: "Islamic Relief South Africa",
        description:
          "Canal sudafricano con Venezuela Earthquake Appeal para ayuda humanitaria a familias afectadas.",
        href: "https://islamic-relief.org.za/",
        source: "Islamic Relief South Africa",
        sourceHref: "https://islamic-relief.org.za/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Turquía",
    countryCode: "TR",
    organization: "Türk Kızılay",
    lines: [
      {
        type: "web",
        label: "Türk Kızılay - apoyo a Venezuela",
        href: "https://www.aa.com.tr/tr/gundem/turk-kizilaydan-venezuela-kizilhacina-yardim-teklifi/3977735",
      },
    ],
    shareChannels: [
      {
        name: "Türk Kızılay",
        description:
          "Media Luna Roja Turca en coordinación con la Cruz Roja Venezolana y la IFRC; reportó disponibilidad para enviar apoyo humanitario si se requiere.",
        href: "https://www.aa.com.tr/tr/gundem/turk-kizilaydan-venezuela-kizilhacina-yardim-teklifi/3977735",
        source: "Anadolu Ajansı",
        sourceHref:
          "https://www.aa.com.tr/tr/gundem/turk-kizilaydan-venezuela-kizilhacina-yardim-teklifi/3977735",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Trinidad y Tobago",
    countryCode: "TT",
    organization: "Gobierno de Trinidad y Tobago",
    lines: [
      {
        type: "web",
        label: "Trinidad y Tobago preparado para asistir",
        href: "https://demerarawaves.com/2026/06/25/guyana-barbados-trinidad-ready-to-assist-earthquake-devastated-venezuela/",
      },
    ],
    shareChannels: [
      {
        name: "Apoyo de Trinidad y Tobago",
        description:
          "El gobierno indicó que está preparado para proporcionar apoyo y asistencia solicitada a las autoridades venezolanas, donde sea posible.",
        href: "https://demerarawaves.com/2026/06/25/guyana-barbados-trinidad-ready-to-assist-earthquake-devastated-venezuela/",
        source: "Demerara Waves",
        sourceHref:
          "https://demerarawaves.com/2026/06/25/guyana-barbados-trinidad-ready-to-assist-earthquake-devastated-venezuela/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
  {
    country: "Uruguay",
    countryCode: "UY",
    organization: "Venezolanos en Uruguay",
    lines: [
      {
        type: "web",
        label: "Campaña de recolección en Uruguay",
        href: "https://www.instagram.com/venezolanosenuruguay/",
      },
    ],
    shareChannels: [
      {
        name: "Venezolanos en Uruguay",
        description:
          "Campaña de recolección de donaciones impulsada por la comunidad venezolana en Uruguay para apoyar a afectados por la emergencia.",
        href: "https://www.instagram.com/venezolanosenuruguay/",
        source: "Venezolanos en Uruguay",
        sourceHref: "https://www.instagram.com/venezolanosenuruguay/",
        updatedAt: "25 jun 2026",
        status: "social",
      },
      {
        name: "Cobertura Canal 4 Uruguay",
        description:
          "Canal 4 reportó que la comunidad venezolana en Uruguay recibe donaciones tras el terremoto.",
        href: "https://www.facebook.com/canal4uy/posts/-la-comunidad-de-venezolanos-en-uruguay-se-encuentra-recibiendo-donaciones-tras-/1367919068864666/",
        source: "Canal 4 Uruguay",
        sourceHref:
          "https://www.facebook.com/canal4uy/posts/-la-comunidad-de-venezolanos-en-uruguay-se-encuentra-recibiendo-donaciones-tras-/1367919068864666/",
        updatedAt: "25 jun 2026",
        status: "social",
      },
    ],
  },
  {
    country: "Estados Unidos",
    countryCode: "US",
    organization: "Cruz Roja Americana / organizaciones locales",
    lines: [
      {
        type: "web",
        label: "Global Empowerment Mission - Venezuela Earthquake",
        href: "https://www.globalempowermentmission.org/mission/venezuela-earthquake/",
      },
      {
        type: "phone",
        label: "AFE Doral: 305-602-4466",
        href: "tel:+13056024466",
      },
    ],
    donationPoints: [
      {
        city: "Doral, FL",
        name: "Global Empowerment Mission (GEM)",
        address: "1850 NW 84th Ave, Doral, FL",
        hours: "Lunes a viernes, 9:00 a.m. a 4:00 p.m.",
        accepts:
          "Primeros auxilios, linternas, baterías, cargadores solares, guantes, pañales y suministros esenciales.",
        source: "Local 10",
        sourceHref:
          "https://www.local10.com/news/local/2026/06/25/here-are-4-drop-off-locations-for-donations-to-help-venezuelans-after-earthquakes/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Doral, FL",
        name: "Miami-Dade Supervisor of Elections Office Lobby",
        address: "2700 NW 87th Ave, Doral, FL",
        hours: "Lunes a viernes, 8:00 a.m. a 5:00 p.m.",
        accepts:
          "Primeros auxilios, equipos de emergencia, artículos para bebés y suministros esenciales.",
        source: "Local 10",
        sourceHref:
          "https://www.local10.com/news/local/2026/06/25/here-are-4-drop-off-locations-for-donations-to-help-venezuelans-after-earthquakes/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Doral, FL",
        name: "Doral Legacy Park Community Center",
        address: "11400 NW 82 St, Doral, FL",
        hours:
          "Lunes a viernes, 5:00 p.m. a 9:00 p.m.; sábado y domingo, 8:00 a.m. a 5:00 p.m.",
        accepts:
          "Primeros auxilios, equipos de emergencia, artículos para bebés y suministros esenciales.",
        source: "Local 10",
        sourceHref:
          "https://www.local10.com/news/local/2026/06/25/here-are-4-drop-off-locations-for-donations-to-help-venezuelans-after-earthquakes/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Doral, FL",
        name: "El Arepazo",
        address: "10191 NW 58th St, Doral, FL",
        hours: "24 horas, lunes a domingo",
        accepts:
          "Primeros auxilios, equipos de emergencia, artículos para bebés y suministros esenciales.",
        source: "Local 10",
        sourceHref:
          "https://www.local10.com/news/local/2026/06/25/here-are-4-drop-off-locations-for-donations-to-help-venezuelans-after-earthquakes/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Miami, FL",
        name: "Centro Comunitario AFE",
        address: "6090 NW 84 Ave, Miami, FL 33166",
        hours: "9:30 a.m. a 3:00 p.m.",
        accepts:
          "Alimentos no perecederos, agua, higiene personal, pañales, leche para bebés, ropa, zapatos, cobijas, ropa de cama, carpas e insumos médicos básicos.",
        source: "Diario Las Américas",
        sourceHref:
          "https://www.diariolasamericas.com/florida/sur-la-florida-se-moviliza-ayuda-las-victimas-los-sismos-venezuela-n5397794",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Pembroke Pines, FL",
        name: "All for Venezuela",
        address: "1391 NW 187th Ave, Pembroke Pines, FL 33029",
        accepts:
          "Medicamentos e insumos solicitados por All for Venezuela; verificar lista vigente antes de llevar donaciones.",
        source: "Univision",
        sourceHref:
          "https://www.univision.com/local/miami-wltv/donde-miami-recolecta-ayuda-para-afectados-terremoto-venezuela",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Pineville, NC",
        name: "The Latin Corner CLT",
        address: "705 Main St, Pineville, NC 28134",
        accepts:
          "Pañales para niños y adultos, medicinas, alimentos no perecederos y suministros básicos.",
        source: "Instagram",
        sourceHref: "https://www.instagram.com/reel/DaBIm84zmmG/",
        updatedAt: "25 jun 2026",
      },
      {
        city: "Murray, UT",
        name: "Utah se une por Venezuela",
        address: "162 E 4500 S, Murray, UT 84107",
        accepts:
          "Insumos médicos, higiene personal, ropa ligera, alimentos no perecederos y artículos esenciales.",
        source: "Panas en Utah",
        sourceHref:
          "https://www.panasenutah.com/2026/06/25/comunidad-venezolana-en-utah-organiza-ayuda-urgente-para-afectados/",
        updatedAt: "25 jun 2026",
      },
    ],
    shareChannels: [
      {
        name: "Global Empowerment Mission",
        description:
          "ONG en Doral movilizada para ayuda humanitaria y donaciones económicas para la emergencia en Venezuela.",
        href: "https://www.globalempowermentmission.org/mission/venezuela-earthquake/",
        source: "GEM",
        sourceHref:
          "https://www.globalempowermentmission.org/mission/venezuela-earthquake/",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
      {
        name: "Cámara de Comercio Venezolana",
        description:
          "Canal de donaciones económicas reportado por Univision para apoyo desde el sur de Florida.",
        href: "https://www.univision.com/local/miami-wltv/donde-miami-recolecta-ayuda-para-afectados-terremoto-venezuela",
        source: "Univision",
        sourceHref:
          "https://www.univision.com/local/miami-wltv/donde-miami-recolecta-ayuda-para-afectados-terremoto-venezuela",
        updatedAt: "25 jun 2026",
        status: "verified",
      },
    ],
  },
];

export const TIME_ZONE_COUNTRY_CODES: Record<string, string> = {
  "Europe/Berlin": "DE",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Aruba": "AW",
  "America/Barbados": "BB",
  "America/La_Paz": "BO",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "America/Sao_Paulo": "BR",
  "America/Manaus": "BR",
  "America/Belem": "BR",
  "America/Boa_Vista": "BR",
  "America/Recife": "BR",
  "Europe/Zurich": "CH",
  "Asia/Shanghai": "CN",
  "Asia/Chongqing": "CN",
  "Asia/Urumqi": "CN",
  "Asia/Hong_Kong": "CN",
  "Asia/Macau": "CN",
  "America/Santiago": "CL",
  "Pacific/Easter": "CL",
  "America/Bogota": "CO",
  "Europe/Prague": "CZ",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Winnipeg": "CA",
  "America/Edmonton": "CA",
  "America/Halifax": "CA",
  "America/Costa_Rica": "CR",
  "America/Havana": "CU",
  "America/Guayaquil": "EC",
  "America/Santo_Domingo": "DO",
  "Europe/Madrid": "ES",
  "Atlantic/Canary": "ES",
  "America/El_Salvador": "SV",
  "Europe/Paris": "FR",
  "America/Guyana": "GY",
  "America/Tegucigalpa": "HN",
  "Asia/Kolkata": "IN",
  "Asia/Tehran": "IR",
  "Europe/Dublin": "IE",
  "Asia/Jerusalem": "IL",
  "Europe/Rome": "IT",
  "America/Jamaica": "JM",
  "America/Mexico_City": "MX",
  "Europe/Amsterdam": "NL",
  "Pacific/Auckland": "NZ",
  "America/Panama": "PA",
  "America/Lima": "PE",
  "America/Puerto_Rico": "PR",
  "Asia/Qatar": "QA",
  "Europe/Istanbul": "TR",
  "Europe/London": "GB",
  "Europe/Stockholm": "SE",
  "Europe/Vatican": "VA",
  "Africa/Johannesburg": "ZA",
  "America/Port_of_Spain": "TT",
  "America/Montevideo": "UY",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
};
