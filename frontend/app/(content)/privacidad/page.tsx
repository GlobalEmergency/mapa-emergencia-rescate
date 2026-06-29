import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CONTACT_EMAIL, contactMailto } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Política de privacidad",
  description:
    "Cómo recolectamos, usamos, conservamos y protegemos los datos personales publicados en la plataforma humanitaria Terremoto Venezuela.",
  path: "/privacidad",
});

const LAST_UPDATED = "28 de junio de 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mt-8 scroll-mt-24 space-y-3 text-[15px] leading-relaxed text-slate-800"
    >
      <h2 className="text-xl font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 text-slate-800 sm:py-14">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
      >
        ← Volver al inicio
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Política de Privacidad y Tratamiento de Datos Personales
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Última actualización: {LAST_UPDATED}. Vigente desde su publicación.
      </p>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Aviso importante</p>
        <p className="mt-1 leading-relaxed">
          Esta plataforma opera durante una emergencia humanitaria por el
          terremoto en Venezuela. La información publicada (incluidos datos
          de personas desaparecidas) es{" "}
          <strong>visible públicamente</strong> y queda accesible para
          terceros, motores de búsqueda, rescatistas, familiares,
          organizaciones aliadas y medios. Antes de publicar lee esta
          política y nuestros{" "}
          <Link
            href="/terminos"
            className="font-semibold underline hover:text-amber-950"
          >
            Términos y Condiciones
          </Link>
          .
        </p>
      </div>

      <Section id="responsable" title="1. Responsable del tratamiento">
        <p>
          <strong>Terremoto Venezuela</strong> es una iniciativa ciudadana
          sin fines de lucro operada por personas voluntarias para
          coordinar ayuda humanitaria tras la emergencia sísmica en
          Venezuela. No existe una persona jurídica constituida detrás del
          proyecto; las decisiones de gobernanza se toman colectivamente
          por el equipo de mantenedores listado en el pie de página y en{" "}
          <a
            href="https://github.com/terremotovenezuela/mapa-emergencia-rescate"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-700 hover:underline"
          >
            GitHub
          </a>
          .
        </p>
        <p>
          Punto de contacto único para asuntos de privacidad:{" "}
          <a
            href={contactMailto("Privacidad")}
            className="font-semibold text-sky-700 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section id="datos" title="2. Datos que tratamos y su origen">
        <p>
          Solo recolectamos los datos estrictamente necesarios para los
          fines humanitarios descritos en esta política. Los datos
          provienen de quien los publica voluntariamente en cada
          formulario:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Reportes en el mapa</strong>: coordenadas (latitud /
            longitud), tipo (emergencia, suministro, acopio, edificación
            afectada, antena, etc.), descripción libre, cantidad de
            personas afectadas y foto opcional.
          </li>
          <li>
            <strong>Personas desaparecidas o encontradas</strong>: nombre,
            edad aproximada, nacionalidad opcional, descripción y señas
            particulares, último lugar visto, datos de contacto de quien
            reporta y foto opcional.
          </li>
          <li>
            <strong>Hospitales, pacientes y necesidades de suministro</strong>
            : nombre del hospital, ubicación, necesidades activas y
            referencias de contacto cuando las facilita una persona
            responsable del centro.
          </li>
          <li>
            <strong>Solicitudes de ayuda, ofertas de voluntariado, donaciones
            registradas y mensajes de contacto / chat</strong>: los campos
            que el usuario rellena en cada formulario.
          </li>
          <li>
            <strong>Datos técnicos mínimos</strong>: dirección IP (usada
            únicamente para limitar abuso vía rate-limit; cuando se
            persiste, se almacena hasheada con un salt secreto, jamás en
            crudo), agente de usuario en logs efímeros, y tokens de
            verificación anti-bot de Cloudflare Turnstile.
          </li>
        </ul>
        <p>
          <strong>No</strong> usamos cookies de seguimiento publicitario,
          no cargamos píxeles de redes sociales y no creamos perfiles
          comerciales de usuarios. La analítica utilizada (OpenPanel,
          autoalojada cuando es posible) se limita a métricas agregadas
          sin identificación personal.
        </p>
      </Section>

      <Section
        id="categorias-especiales"
        title="3. Categorías especiales y datos de menores"
      >
        <p>
          Por la naturaleza del servicio podemos llegar a tratar
          incidentalmente datos que en otras jurisdicciones se consideran{" "}
          <em>categorías especiales</em> (salud, condición médica,
          ubicación precisa, datos de menores de edad). En esos casos:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Pedimos no publicar diagnósticos médicos detallados,
            tratamientos, historias clínicas, números de documento de
            identidad, dirección domiciliaria exacta ni cualquier dato que
            no sea imprescindible para la búsqueda o la asistencia.
          </li>
          <li>
            Si un reporte involucra a una persona menor de edad, la
            publicación se restringe al mínimo necesario para su
            localización. Apenas exista una confirmación de que la persona
            apareció, retiramos el reporte sin esperar solicitud expresa.
          </li>
          <li>
            La base que legitima estos tratamientos excepcionales es el{" "}
            <strong>interés vital</strong> de la persona afectada y el
            consentimiento expreso de un familiar o allegado, declarado en
            cada formulario.
          </li>
        </ul>
      </Section>

      <Section id="finalidades" title="4. Finalidades y bases legales">
        <p>
          Tratamos los datos exclusivamente para:
        </p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Coordinar tareas humanitarias de búsqueda, rescate, asistencia
            médica, refugio, suministros y reunificación familiar.
          </li>
          <li>
            Mostrar reportes en el mapa público y en el directorio de
            personas desaparecidas para que cualquier persona con
            información útil pueda contactar.
          </li>
          <li>
            Operar la plataforma de forma segura: prevenir spam, ataques,
            suplantación y publicación maliciosa.
          </li>
          <li>
            Generar estadísticas agregadas y anónimas que ayuden a
            entender la magnitud de la crisis y a coordinar recursos.
          </li>
        </ol>
        <p>
          Las bases legales aplicables son, según corresponda, el{" "}
          <strong>consentimiento</strong> expreso de la persona que
          publica el dato, el <strong>interés vital</strong> de la persona
          afectada (especialmente en reportes de desaparecidos) y el{" "}
          <strong>interés legítimo humanitario</strong> del proyecto en
          coordinar respuesta a la emergencia.
        </p>
      </Section>

      <Section
        id="consentimiento-desaparecidos"
        title="5. Consentimiento para reportes de personas desaparecidas"
      >
        <p>
          Para publicar un reporte de persona desaparecida o encontrada{" "}
          <strong>exigimos confirmación expresa</strong> de que un
          familiar, allegado o representante autoriza divulgar los datos
          con el fin de localizar a la persona o reunirla con su familia.
          Esta confirmación se registra al marcar la casilla
          correspondiente en el formulario.
        </p>
        <p>
          Si publicaste un reporte por error, sin autorización suficiente
          o necesitas retirarlo por cualquier motivo, escríbenos a{" "}
          <a
            href={contactMailto("Retirar reporte")}
            className="font-semibold text-sky-700 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          o avisa en{" "}
          <a
            href="https://discord.gg/5hhaQxU3PM"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-700 hover:underline"
          >
            Discord
          </a>
          . Procesamos las solicitudes de retirada con prioridad.
        </p>
      </Section>

      <Section
        id="destinatarios"
        title="6. Visibilidad pública y destinatarios"
      >
        <p>
          Los reportes publicados son <strong>públicos por diseño</strong>:
          aparecen en el sitio web, son indexables por motores de búsqueda
          y pueden ser replicados por organizaciones aliadas con las que
          federamos información (por ejemplo plataformas hermanas como{" "}
          <em>Venezuela Te Busca</em> o <em>Venezuela Reporta</em>) con el
          único fin de ampliar la difusión humanitaria. La API pública
          permite también a medios, brigadas oficiales y voluntariado
          consultarla.
        </p>
        <p>
          Las fotos se almacenan en{" "}
          <strong>Cloudflare R2</strong> (CDN de objetos) y se sirven
          detrás de Cloudflare. La base de datos relacional vive en
          infraestructura privada de Hetzner Cloud, en la Unión Europea.
        </p>
        <p>
          No vendemos datos a terceros, no cedemos información a empresas
          de marketing y no compartimos datos con autoridades salvo
          requerimiento legal expreso, vinculante y proporcional dirigido
          al equipo del proyecto.
        </p>
      </Section>

      <Section
        id="transferencias"
        title="7. Transferencias internacionales"
      >
        <p>
          La infraestructura del proyecto utiliza proveedores
          internacionales (Cloudflare, Hetzner, OpenStreetMap, GitHub),
          por lo que tus datos pueden ser procesados o transitar por
          servidores ubicados fuera de Venezuela, incluidos Estados Unidos
          y la Unión Europea. Estos proveedores cuentan con sus propias
          políticas de seguridad y cumplimiento. Solo enviamos a cada
          proveedor el subconjunto de datos imprescindible para el
          servicio que prestan.
        </p>
      </Section>

      <Section id="retencion" title="8. Plazos de conservación">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Reportes activos</strong>: se conservan mientras el
            objetivo humanitario siga vigente.
          </li>
          <li>
            <strong>Reportes marcados como atendidos o personas
            encontradas</strong>: se conservan en estado archivado para
            trazabilidad agregada y se anonimizan o eliminan
            progresivamente.
          </li>
          <li>
            <strong>IPs hasheadas y registros técnicos</strong>: se
            mantienen el tiempo mínimo necesario para detectar abuso (en
            general menos de 90 días).
          </li>
          <li>
            <strong>Mensajes de chat y contacto</strong>: se eliminan o
            anonimizan cuando dejan de ser útiles para coordinar.
          </li>
        </ul>
        <p>
          Al cierre del despliegue humanitario el equipo evaluará la
          eliminación o el archivado anonimizado de las bases de datos
          con criterio de minimización.
        </p>
      </Section>

      <Section
        id="derechos"
        title="9. Tus derechos y cómo ejercerlos"
      >
        <p>
          De acuerdo con el artículo 60 de la Constitución de la República
          Bolivariana de Venezuela y con los principios generales de
          protección de datos personales reconocidos internacionalmente
          (incluidos GDPR de la Unión Europea y CCPA cuando apliquen por
          residencia del titular), puedes ejercer en cualquier momento los
          derechos de:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Acceso a los datos que tratamos sobre ti.</li>
          <li>Rectificación si son inexactos o están incompletos.</li>
          <li>Supresión (derecho al olvido).</li>
          <li>Oposición al tratamiento.</li>
          <li>
            Limitación del tratamiento mientras se resuelve una
            controversia.
          </li>
          <li>
            Retirada del consentimiento, sin que esto afecte la licitud
            del tratamiento previo.
          </li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos escríbenos a{" "}
          <a
            href={contactMailto("Ejercicio de derechos")}
            className="font-semibold text-sky-700 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          identificando el reporte o dato concreto. Atendemos las
          solicitudes en el menor plazo posible considerando la naturaleza
          voluntaria del proyecto.
        </p>
      </Section>

      <Section
        id="seguridad"
        title="10. Medidas de seguridad"
      >
        <ul className="list-disc space-y-1.5 pl-5">
          <li>HTTPS obligatorio en todo el sitio y la API.</li>
          <li>
            Prueba de humanidad Cloudflare Turnstile en mutaciones
            públicas para frenar bots.
          </li>
          <li>Rate-limit por IP con Valkey/Redis para frenar abuso.</li>
          <li>
            Las IPs nunca se almacenan en crudo: se hashean con sal
            secreta antes de cualquier persistencia.
          </li>
          <li>
            Acceso administrativo protegido con autenticación dedicada y
            registrado.
          </li>
          <li>
            Código abierto auditable por la comunidad en GitHub. Las
            vulnerabilidades se reportan de forma responsable según{" "}
            <a
              href="https://github.com/terremotovenezuela/mapa-emergencia-rescate/blob/main/docs/SECURITY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-700 hover:underline"
            >
              docs/SECURITY.md
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section id="cookies" title="11. Cookies y tecnologías similares">
        <p>
          Solo usamos cookies estrictamente necesarias (preferencia de
          tema, estado del consentimiento, sesión administrativa cuando
          aplica) y cookies de Cloudflare para seguridad y mitigación de
          ataques. No utilizamos cookies de marketing, retargeting ni
          terceros publicitarios.
        </p>
      </Section>

      <Section id="menores" title="12. Edad mínima de uso">
        <p>
          La plataforma está pensada para personas mayores de edad o
          menores con supervisión de un adulto responsable. Si detectamos
          que una cuenta o un reporte fue creado por un menor sin
          autorización, lo retiramos.
        </p>
      </Section>

      <Section
        id="responsabilidad"
        title="13. Limitación de responsabilidad y emergencias"
      >
        <p>
          Esta plataforma es una herramienta colaborativa de apoyo y{" "}
          <strong>
            no sustituye a los servicios oficiales de emergencia
          </strong>
          . En caso de peligro inminente llama siempre al{" "}
          <a href="tel:171" className="font-semibold underline">
            171
          </a>
          ,{" "}
          <a href="tel:911" className="font-semibold underline">
            911
          </a>{" "}
          o a las autoridades competentes. El equipo del proyecto no es
          responsable por la veracidad de la información publicada por
          terceros ni por el uso que terceros hagan de los datos que ellos
          mismos publican voluntariamente.
        </p>
      </Section>

      <Section id="cambios" title="14. Cambios en esta política">
        <p>
          Podemos actualizar esta política para reflejar cambios
          operativos, técnicos o legales. La versión vigente siempre es la
          publicada en esta URL con la fecha indicada al inicio. Los
          cambios sustanciales se anunciarán en el sitio.
        </p>
      </Section>

      <Section id="contacto" title="15. Contacto del equipo">
        <p>
          Para cualquier consulta sobre privacidad, ejercicio de
          derechos, retirada de información, denuncia de abuso o
          requerimiento legal, escribe a:
        </p>
        <p className="pl-2">
          ✉️{" "}
          <a
            href={contactMailto("Privacidad")}
            className="font-semibold text-sky-700 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p>
          También atendemos por el{" "}
          <a
            href="https://discord.gg/5hhaQxU3PM"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-700 hover:underline"
          >
            Discord de voluntarios
          </a>
          .
        </p>
      </Section>

      <p className="mt-10 text-xs text-slate-500">
        Esta política se complementa con los{" "}
        <Link
          href="/terminos"
          className="font-semibold text-sky-700 hover:underline"
        >
          Términos y Condiciones
        </Link>{" "}
        de uso de la plataforma.
      </p>
    </main>
  );
}
