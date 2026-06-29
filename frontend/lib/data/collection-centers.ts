export interface CollectionCenter {
  id: string;
  organization: string;
  state: string;
  municipality?: string;
  parish?: string;
  address: string;
  items: string[];
  schedule?: string;
  phones?: string[];
  source: string;
}

export const CENTERS: CollectionCenter[] = [
  {
    id: "farmapaz",
    organization: "Farmapaz",
    state: "Nacional",
    address: "En todas las sucursales Farmapaz",
    items: ["Ropa", "Alimentos no perecederos", "Insumos para bebés"],
    source: "Farmapaz — Unidos por Venezuela",
  },
  {
    id: "operacion-boqueron",
    organization: "Operación Todos con VZLA",
    state: "Monagas",
    municipality: "Maturín",
    parish: "Boquerón",
    address:
      "Av. principal de Boquerón, frente a la panadería Escorpión Pan",
    items: [
      "Agua potable",
      "Alimentos no perecederos",
      "Insumos médicos",
      "Ropa y abrigos",
    ],
    source: "Operación Todos con VZLA",
  },
  {
    id: "operacion-vente-monagas",
    organization: "Operación Todos con VZLA — Sede Vente Monagas",
    state: "Monagas",
    municipality: "Maturín",
    address:
      "Calle Carvajal, casa N.º 90, sector La Manga. Diagonal a Perozo Motors",
    items: [
      "Agua potable",
      "Alimentos no perecederos",
      "Insumos médicos",
      "Ropa y abrigos",
    ],
    source: "Operación Todos con VZLA",
  },
  {
    id: "operacion-la-pica",
    organization: "Operación Todos con VZLA",
    state: "Monagas",
    municipality: "Maturín",
    parish: "La Pica",
    address:
      "Av. Principal La Pica, casa de la Sra. Irma, frente a la licorería",
    items: [
      "Agua potable",
      "Alimentos no perecederos",
      "Insumos médicos",
      "Ropa y abrigos",
    ],
    source: "Operación Todos con VZLA",
  },
  {
    id: "operacion-san-simon",
    organization: "Operación Todos con VZLA",
    state: "Monagas",
    municipality: "Maturín",
    parish: "San Simón",
    address:
      "Calle Chimborazo Sur, a 100 m de la parada de los 26",
    items: [
      "Agua potable",
      "Alimentos no perecederos",
      "Insumos médicos",
      "Ropa y abrigos",
    ],
    source: "Operación Todos con VZLA",
  },
  {
    id: "udo-los-guaritos",
    organization:
      "Estudiantes de la Universidad de Oriente — Núcleo Monagas",
    state: "Monagas",
    municipality: "Maturín",
    address: "Entrada de la UDO Monagas, Campus Los Guaritos",
    schedule: "Lunes a viernes, 9:00 a.m. a 12:00 p.m.",
    phones: ["0412-0984394", "0424-9068784", "0424-9570080"],
    items: [
      "Agua potable",
      "Alimentos no perecederos y enlatados",
      "Medicamentos básicos y de primeros auxilios",
      "Productos de higiene personal",
      "Ropa y zapatos en buen estado",
    ],
    source: "UDO Monagas / AIPA / Fundación Lirio Mayero",
  },
];
