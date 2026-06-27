import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad · Mapa de Emergencia Venezuela",
  alternates: { canonical: "/privacidad" },
  description:
    "Cómo manejamos los datos publicados en el mapa, el chat y el módulo de personas desaparecidas.",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 text-slate-800">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
      >
        ← Volver al inicio
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        Política de privacidad y uso de datos
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Última actualización: junio de 2026
      </p>

      <section className="mt-8 space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-slate-900">
          1. Quiénes somos
        </h2>
        <p>
          Esta plataforma es una iniciativa ciudadana, sin fines de lucro, para
          coordinar ayuda humanitaria durante la emergencia por terremoto en
          Venezuela. El código es abierto y mantenido por voluntarios. No hay
          una empresa detrás.
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-slate-900">
          2. Qué datos recolectamos
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Reportes públicos</strong>: ubicación (lat/lng), tipo,
            descripción, número de afectados, fotos opcionales subidas por
            quien reporta. Todos estos datos son <strong>públicos</strong>.
          </li>
          <li>
            <strong>Personas desaparecidas</strong>: nombre, edad aproximada,
            nacionalidad opcional, descripción, último lugar visto, contacto y
            foto. Datos públicos por su naturaleza (ayudar a ubicarla).
          </li>
          <li>
            <strong>Chat de voluntarios</strong>: alias (no verificado) y
            mensaje. Datos públicos.
          </li>
          <li>
            <strong>Direcciones IP</strong>: usadas en memoria para limitar
            abuso (rate limiting). No se almacenan a largo plazo.
          </li>
        </ul>
        <p>
          <strong>No</strong> usamos analíticas de terceros, no hay rastreo de
          publicidad y no creamos perfiles de usuarios.
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-slate-900">
          3. Consentimiento para personas desaparecidas
        </h2>
        <p>
          Antes de publicar un reporte de desaparecida exigimos confirmación
          expresa de que un familiar o allegado autoriza divulgar los datos.
          Si publicaste un reporte por error o quieres retirarlo, escríbenos
          al{" "}
          <a
            href="https://discord.gg/5hhaQxU3PM"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-red-700 hover:underline"
          >
            Discord
          </a>{" "}
          y lo retiramos lo antes posible.
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-slate-900">
          4. Riesgos y recomendaciones
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>No publiques</strong> número de cédula, dirección exacta
            de vivienda u otros datos sensibles que no sean necesarios para la
            ayuda.
          </li>
          <li>
            Sé cauteloso con números de teléfono: prefiere un contacto
            intermedio (vecino, ONG) en vez del directo de la familia.
          </li>
          <li>
            Verifica la identidad de quien te contacta antes de compartir
            información adicional.
          </li>
        </ul>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-slate-900">
          5. Almacenamiento y borrado
        </h2>
        <p>
          Los reportes se guardan en una base de datos PostgreSQL gestionada
          (Neon, en Estados Unidos / Europa, según región). Las fotos se
          almacenan junto al reporte como base64 dentro de la misma base.
        </p>
        <p>
          Puedes solicitar el borrado de un reporte específico contactando al
          Discord. Las administradoras y administradores también pueden marcar
          reportes como atendidos o eliminarlos por moderación.
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-slate-900">
          6. Niños, niñas y adolescentes
        </h2>
        <p>
          Si reportas a una persona menor de edad como desaparecida, evita
          publicar su apellido completo y prefiere fotos donde no se reconozca
          el entorno escolar o doméstico. Los datos serán retirados apenas la
          persona aparezca.
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-slate-900">
          7. Limitación de responsabilidad
        </h2>
        <p>
          Esta plataforma es una herramienta de apoyo, no sustituye a los
          servicios oficiales de emergencia. En peligro inminente, contacta
          siempre al <a href="tel:171" className="font-semibold underline">171</a>{" "}
          o a las autoridades competentes. El equipo no se hace responsable
          por información incorrecta publicada por terceros.
        </p>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-slate-900">8. Contacto</h2>
        <p>
          Para cualquier consulta, solicitud de borrado o reporte de abuso:{" "}
          <a
            href="https://discord.gg/5hhaQxU3PM"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-red-700 hover:underline"
          >
            Discord de voluntarios
          </a>
          .
        </p>
      </section>
    </main>
  );
}
