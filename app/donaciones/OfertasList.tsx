"use client";

import { useMemo, useState } from "react";
import { ArrowRight, HeartHandshake, Search } from "lucide-react";

type Oferta = {
  name: string;
  logo?: string;
  description: string;
  action: string;
  url: string;
};

const OFERTAS: { category: string; items: Oferta[] }[] = [
  {
    category: "Fundaciones",
    items: [
      {
        name: "Cruz Roja Venezolana",
        logo: "/logos/cruz-roja-ve.jpeg",
        description: "Atención médica, rescate y ayuda humanitaria en Venezuela.",
        action: "Donar",
        url: "#",
      },
      {
        name: "Banco de Alimentos Venezuela",
        description: "Distribución de alimentos a familias en situación de vulnerabilidad.",
        action: "Donar",
        url: "#",
      },
      {
        name: "FUNDALATIN",
        description: "Apoyo a comunidades vulnerables y coordinación de refugios.",
        action: "Donar",
        url: "#",
      },
    ],
  },
  {
    category: "Donaciones y envío de dinero",
    items: [
      {
        name: "Binance",
        logo: "/logos/binance.png",
        description: "Recibe tu parte de $3MM de Binance Foundation en cupones de $20 USDT. Envíos P2P sin comisión hasta el 3 jul.",
        action: "Enviar dinero",
        url: "https://www.binance.com/es-LA/blog/fundación/494861573422684842",
      },
      {
        name: "Coco Wallet",
        logo: "/logos/coco-wallet.png",
        description: "Envía dinero rápido a la ONG “Ayuda Venezuela”. $3 gratis en tu primer depósito.",
        action: "Enviar dinero",
        url: "https://cocowallet.app",
      },
      {
        name: "Meru",
        logo: "/logos/meru.png",
        description: "Envía dinero a Venezuela totalmente gratis desde Latam, Europa y USA.",
        action: "Enviar dinero",
        url: "https://getmeru.com",
      },
      {
        name: "GoFundMe",
        logo: "/logos/gofundme.png",
        description: "Fondo de We Love Foundation para afectados por el terremoto. Más de $2M recaudados.",
        action: "Donar",
        url: "https://www.gofundme.com/f/emergency-relief-for-venezuela-earthquake-victims",
      },
      {
        name: "UCAB",
        logo: "/logos/ucab.png",
        description: "Fondo de emergencia de la Academia Blockchain, Trading & Cripto UCAB. Donaciones en cripto.",
        action: "Enviar cripto",
        url: "https://btc.academiasucab.com/fondo-emergencia-sismo-vzla-2026/",
      },
      {
        name: "Yummy Rides",
        logo: "/logos/yummy-rides.png",
        description: "Dona directamente a familias afectadas. Los conductores reciben el 100% de sus ganancias.",
        action: "Donar",
        url: "https://dona.yummyrides.com",
      },
    ],
  },
  {
    category: "Comida y mercado",
    items: [
      {
        name: "Coco Mercado",
        logo: "/logos/coco-mercado.png",
        description: "Envía comida y víveres a familiares y afectados. Cupón CONTIGO5: $5 de descuento.",
        action: "Enviar comida",
        url: "https://cocomercado.com",
      },
      {
        name: "Yummy Marketplace",
        logo: "/logos/yummy-marketplace.png",
        description: "Pide comida, mercado y productos a domicilio.",
        action: "Ir a la tienda",
        url: "https://yummysuperapp.com",
      },
    ],
  },
  {
    category: "Salud",
    items: [
      {
        name: "Latydo",
        logo: "/logos/latydo.png",
        description: "Consulta telemédica gratis para afectados por el terremoto.",
        action: "Consultar",
        url: "https://latydo.com",
      },
    ],
  },
  {
    category: "Transporte",
    items: [
      {
        name: "Ridery",
        logo: "/logos/ridery.png",
        description: "Taxi seguro para movilizarte o evacuar. Viajes gratis a clínicas y hospitales.",
        action: "Pedir viaje",
        url: "https://ridery.app",
      },
    ],
  },
  {
    category: "Hogar y reparaciones",
    items: [
      {
        name: "Tilín",
        logo: "/logos/tilin.svg",
        description: "Inspecciones gratuitas para hogares afectados y precios solidarios en reparaciones básicas.",
        action: "Solicitar",
        url: "https://tilinapp.com/inspeccion-emergencia",
      },
      {
        name: "Tecniko",
        logo: "/logos/tecniko.png",
        description: "Técnicos para reparar tu hogar: mecánica, plomería, electricidad y más. Paga en cuotas.",
        action: "Visitar sitio",
        url: "https://tecniko.com",
      },
    ],
  },
  {
    category: "Compras y pagos",
    items: [
      {
        name: "Cashea",
        logo: "/logos/cashea.png",
        description: "Compra lo que necesitas y paga en cuotas. Sin cargo de reactivación (23–30 jun).",
        action: "Visitar sitio",
        url: "https://www.cashea.app",
      },
    ],
  },
];

function OfertaCard({ name, logo, description, action, url }: Oferta) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="e-card group flex flex-col rounded-2xl bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex h-9 items-center justify-between gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={`Logo de ${name}`}
            loading="lazy"
            className="h-full w-auto max-w-[130px] object-contain object-left"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#c41a1a]">
            <HeartHandshake size={20} strokeWidth={2} />
          </span>
        )}
        <h3 className="truncate text-[13px] font-semibold text-slate-400">{name}</h3>
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-[12.5px] leading-snug text-slate-600">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-red-50 px-3.5 py-1.5 text-[13px] font-bold text-[#c41a1a] ring-1 ring-red-100 transition-all duration-200 group-hover:bg-[#c41a1a] group-hover:text-white group-hover:ring-[#c41a1a]">
        {action}
        <ArrowRight
          size={15}
          strokeWidth={2.5}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </a>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-[#c41a1a] text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export default function OfertasList() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = OFERTAS.map((group) => group.category);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OFERTAS.filter(
      (group) => !activeCategory || group.category === activeCategory,
    )
      .map((group) => ({
        ...group,
        items: q
          ? group.items.filter(
              (item) =>
                item.name.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q) ||
                group.category.toLowerCase().includes(q),
            )
          : group.items,
      }))
      .filter((group) => group.items.length > 0);
  }, [query, activeCategory]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterPill
          label="Todas"
          active={activeCategory === null}
          onClick={() => setActiveCategory(null)}
        />
        {categories.map((category) => (
          <FilterPill
            key={category}
            label={category}
            active={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          />
        ))}
      </div>

      <div className="relative mb-6">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar organización o servicio…"
          aria-label="Buscar organización o servicio"
          className="w-full rounded-full border border-slate-200 bg-white py-3 pr-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#c41a1a] focus:ring-2 focus:ring-red-100 focus:outline-none"
        />
      </div>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No se encontraron resultados para “{query}”.
        </p>
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2.5 text-[13px] font-bold text-slate-700">{group.category}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <OfertaCard key={item.name} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
