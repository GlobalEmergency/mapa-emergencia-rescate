interface Contact {
  name: string;
  numbers: string[];
}

interface ContactGroup {
  title: string;
  icon: string;
  contacts: Contact[];
}

const GROUPS: ContactGroup[] = [
  {
    title: "Emergencias (línea directa)",
    icon: "🚨",
    contacts: [
      { name: "Cantv (desde fijo)", numbers: ["171"] },
      { name: "Movilnet", numbers: ["*1"] },
      { name: "Digitel", numbers: ["112"] },
      { name: "Movistar", numbers: ["911"] },
    ],
  },
  {
    title: "Ambulancias",
    icon: "🚑",
    contacts: [
      {
        name: "Aeroambulancias",
        numbers: [
          "(0212) 993.25.41",
          "(0212) 992.89.80",
          "(0212) 992.89.90",
          "(0212) 991.79.40",
        ],
      },
      {
        name: "Rescarven",
        numbers: [
          "(0212) 993.69.11",
          "(0212) 993.69.91",
          "(0212) 993.13.10",
          "(0212) 993.33.67",
        ],
      },
      {
        name: "Servicio de Ambulancia Metropolitano",
        numbers: ["(0212) 545.45.45", "(0212) 545.46.55", "(0212) 577.92.09"],
      },
    ],
  },
  {
    title: "Bomberos",
    icon: "🚒",
    contacts: [
      { name: "Antímano", numbers: ["(0212) 472.20.54"] },
      { name: "Catia la Mar", numbers: ["(0212) 351.99.66"] },
      { name: "Chacao", numbers: ["(0212) 265.32.61"] },
      { name: "del Este (Cafetal)", numbers: ["(0212) 987.43.34", "(0212) 985.50.60"] },
      { name: "Sucre", numbers: ["(0212) 985.36.40"] },
      { name: "El Cafetal", numbers: ["(0212) 985.36.40", "(0212) 985.29.77"] },
      { name: "El Paraíso", numbers: ["(0212) 481.09.61"] },
      { name: "El Valle", numbers: ["(0212) 672.01.75", "(0212) 672.06.36"] },
      { name: "La Guaira", numbers: ["(0212) 332.76.20", "(0212) 331.04.45"] },
      { name: "La Trinidad", numbers: ["(0212) 943.43.61"] },
      { name: "La Urbina", numbers: ["(0212) 241.66.41"] },
      { name: "Metropolitanos", numbers: ["(0212) 545.45.45"] },
      { name: "Miranda", numbers: ["(0212) 235.69.67"] },
      { name: "Plaza Venezuela", numbers: ["(0212) 793.00.39", "(0212) 793.64.57"] },
      { name: "San Bernardino", numbers: ["(0212) 577.92.09"] },
    ],
  },
];

/** Convierte un número mostrado a un href tel: válido para marcar al tocarlo. */
function telHref(display: string): string {
  const cleaned = display.replace(/[^\d*]/g, "");
  if (cleaned.length <= 4) return `tel:${cleaned}`;
  const national = cleaned.replace(/^0/, "");
  return `tel:+58${national}`;
}

export default function EmergencyContacts() {
  return (
    <section id="telefonos" className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">
          📞 Teléfonos de emergencia
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Toca cualquier número para llamar directamente. Referencial para Caracas
          y la Gran Caracas (código 0212).
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span aria-hidden>{group.icon}</span> {group.title}
              </h3>
              <ul className="space-y-2">
                {group.contacts.map((contact) => (
                  <li
                    key={contact.name}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {contact.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {contact.numbers.map((number) => (
                        <a
                          key={number}
                          href={telHref(number)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          📞 {number}
                        </a>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Comparte esta información: puede servir a personas que sí necesitan
          ayuda. Si un número no responde, intenta con la línea de emergencia
          general (171 / 911).
        </p>
      </div>
    </section>
  );
}
