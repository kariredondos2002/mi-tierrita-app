import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { m } from "motion/react";
import { Carousel, PhotoBackdrop, type CarouselSlide } from "@/components/ui";
import { BrandMark, photoUrl } from "@/components/layout/AppShell";
import { useSendContact } from "@/hooks/contact";
import { fieldErrors } from "@/lib/errors";
import { useSessionStore } from "@/stores/session";
import logistics from "@/assets/ill/logistics_8vri.svg";
import budgeting from "@/assets/ill/budgeting_klon.svg";
import investing from "@/assets/ill/investing_uzcu.svg";
import farming from "@/assets/ill/farming_u62j.svg";
import styles from "./LandingScreen.module.css";

/** Aparece suavemente al entrar en pantalla (respeta «reducir movimiento»). */
const Reveal = ({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => (
  <m.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay }}>
    {children}
  </m.div>
);

const LINKS = [
  { href: "#que-es", label: "¿Qué es?" },
  { href: "#frentes", label: "Frentes" },
  { href: "#catalogo", label: "Catálogo" },
  { href: "#galeria", label: "Galería" },
  { href: "#quienes-somos", label: "Quiénes somos" },
  { href: "#contacto", label: "Contacto" },
];

const POINTS = [
  {
    n: "01",
    tag: "Bodega y mostrador",
    title: "Inventario que avisa antes de perder",
    text: "Cada compra entra como un lote con su fecha de vencimiento. Las ventas descuentan primero lo que vence antes (FEFO) y el sistema alerta los productos agotados y los lotes por vencer, para que el concentrado o la vacuna no se pierdan en la estantería.",
    bullets: ["Lotes y vencimientos por producto", "Alertas de stock bajo en tiempo real", "Proveedores y compras en un solo lugar"],
    art: logistics,
  },
  {
    n: "02",
    tag: "Clientes y caja",
    title: "Ventas y cartera bajo control",
    text: "El punto de venta registra contado y crédito con número de factura; el crédito respeta el cupo de cada cliente y los abonos bajan el saldo al instante. La cartera vencida se ve en el tablero, no en un cuaderno.",
    bullets: ["Punto de venta con factura", "Cupo de crédito y abonos", "Cartera vencida a 30 días"],
    art: budgeting,
  },
  {
    n: "03",
    tag: "Decisión de crecer",
    title: "¿Conviene ampliar el local?",
    text: "La evaluación financiera arma escenarios con la inversión, el crédito y el aumento de ventas esperado, y calcula VPN, TIR, periodo de recuperación, cobertura de la cuota y sensibilidad. Una decisión con números, no a ojo.",
    bullets: ["Escenarios comparables", "VPN, TIR y cobertura de la cuota", "Sensibilidad y punto de quiebre"],
    art: investing,
  },
];

const GALLERY: CarouselSlide[] = [
  { id: "bodega", image: photoUrl("bodega-estibas"), tag: "La bodega", title: "Mercancía ordenada, lote por lote", text: "Cada compra entra con su fecha de vencimiento y se vende primero lo que vence antes." },
  { id: "campo", image: photoUrl("amanecer-pradera"), tag: "El campo", title: "Atendemos al ganadero, al avicultor y al agricultor", text: "Insumos para cada temporada, con el consejo de quien conoce la región." },
  { id: "ganado", image: photoUrl("alimentando-vaca"), tag: "El ganado", title: "Alimento y sanidad para el hato", text: "Concentrados, sales, vacunas y desparasitantes con control de lote." },
  { id: "granos", image: photoUrl("manos-granos"), tag: "La cosecha", title: "Semillas y granos de confianza", text: "Maíz, pastos y abonos para sembrar bien desde el primer día." },
  { id: "clientes", image: photoUrl("clientes-finca"), tag: "Los clientes", title: "Crédito con cupo y abonos al instante", text: "La cartera se ve en el tablero, no en un cuaderno." },
  { id: "valle", image: photoUrl("valle-cordoba"), tag: "Sahagún, Córdoba", title: "Una tienda del campo cordobés", text: "Un negocio familiar que crece con información para decidir." },
];

const CATALOG = [
  { name: "Alimentos balanceados", text: "Concentrados para ganado, cerdos, aves y mascotas.", photo: "alimentando-vaca" },
  { name: "Medicina veterinaria", text: "Vacunas, desparasitantes y vitaminas con control de lote.", photo: "vaca-campo" },
  { name: "Semillas y fertilizantes", text: "Maíz, pastos y abonos para cada temporada de siembra.", photo: "manos-tierra" },
  { name: "Aves de corral", text: "Pollitas ponedoras y pollos de engorde.", photo: "clientes-finca" },
  { name: "Agroquímicos", text: "Herbicidas, insecticidas y fungicidas de uso agrícola.", photo: "valle-cordoba" },
  { name: "Ferretería agrícola", text: "Machetes, alambre, mangueras y herramienta de finca.", photo: "estibas-bultos" },
];

const TEAM = [
  { name: "Karina Redondo Sáez", role: "Ingeniería de Software · SIG e Ingeniería Económica" },
  { name: "Alexa Patricia Ricardo Lozano", role: "Ingeniería de Software · SIG e Ingeniería Económica" },
  { name: "Edgar Alexander Matos Rivera", role: "Ingeniería de Software · Ingeniería Económica" },
];

type ContactForm = { name: string; email: string; phone: string; message: string };
const EMPTY: ContactForm = { name: "", email: "", phone: "", message: "" };

/**
 * Página pública de inicio (v4), con la estructura editorial de un sitio agrotecnológico:
 * portada fotográfica, ¿qué es?, tres frentes alternados con ilustración, catálogo,
 * quiénes somos, formulario de contacto y pie negro con enlaces legales y boletín.
 */
export const LandingScreen = () => {
  const signedIn = useSessionStore((s) => s.token !== null);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [form, setForm] = useState<ContactForm>(EMPTY);
  const [sent, setSent] = useState(false);
  const [mail, setMail] = useState("");
  const [subscribed, setSubscribed] = useState<"idle" | "ok" | "error">("idle");
  const [legal, setLegal] = useState<"privacidad" | "terminos" | null>(null);
  const send = useSendContact();
  const newsletter = useSendContact();
  const errors = send.error ? fieldErrors(send.error) : {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = "Agropecuaria Mi Tierrita · Sahagún, Córdoba";
    return () => {
      document.title = prev;
    };
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send.mutate(
      { name: form.name.trim(), email: form.email.trim(), message: form.message.trim(), ...(form.phone.trim() ? { phone: form.phone.trim() } : {}) },
      {
        onSuccess: () => {
          setSent(true);
          setForm(EMPTY);
        },
      },
    );
  };

  const subscribe = (e: FormEvent) => {
    e.preventDefault();
    newsletter.mutate(
      { name: "Suscripción al boletín", email: mail.trim(), message: "Quiero recibir novedades, temporadas y ofertas de Mi Tierrita." },
      { onSuccess: () => (setSubscribed("ok"), setMail("")), onError: () => setSubscribed("error") },
    );
  };

  const cta = signedIn ? { to: "/", label: "Ir al tablero" } : { to: "/iniciar-sesion", label: "Ingresar al sistema" };

  return (
    <div className={styles.page}>
      {/* ---------- barra de navegación ---------- */}
      <header className={[styles.nav, scrolled ? styles.navSolid : ""].join(" ")}>
        <a href="#inicio" className={styles.brand} aria-label="Mi Tierrita, inicio">
          <BrandMark size={40} />
          <span>
            <strong>Mi Tierrita</strong>
            <small>Agropecuaria · Sahagún</small>
          </span>
        </a>
        <nav className={[styles.links, menu ? styles.linksOpen : ""].join(" ")} aria-label="Secciones">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenu(false)}>
              {l.label}
            </a>
          ))}
          <Link to={cta.to} className={styles.navCta}>
            {cta.label}
          </Link>
        </nav>
        <button type="button" className={styles.burger} aria-label={menu ? "Cerrar el menú" : "Abrir el menú"} aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* ---------- portada ---------- */}
      <section id="inicio" className={styles.hero}>
        <PhotoBackdrop images={["hero-tractor", "amanecer-pradera", "tablero-ganado", "valle-cordoba"].map(photoUrl)} interval={10000} />
        <div className={styles.heroInner}>
          <Reveal>
            <p className={styles.kicker}>Insumos agropecuarios · Sahagún, Córdoba</p>
            <h1>
              Todo para el campo,
              <br />
              con información que
              <br />
              <span>siembra decisiones</span>
            </h1>
            <p className={styles.heroScript}>La tienda de siempre, ahora con un sistema que cuida la mercancía, el dinero y la decisión de crecer.</p>
            <div className={styles.heroActions}>
              <a href="#contacto" className={styles.btnLime}>
                Escríbanos
              </a>
              <Link to={cta.to} className={styles.btnGhost}>
                {cta.label} →
              </Link>
            </div>
          </Reveal>
        </div>
        <a href="#que-es" className={styles.scrollHint} aria-label="Bajar a ¿Qué es?">
          <span />
        </a>
      </section>

      {/* ---------- franja ---------- */}
      <div className={styles.strip}>
        <span>ERP · operación diaria</span>
        <i aria-hidden="true" />
        <span>BI · tablero gerencial</span>
        <i aria-hidden="true" />
        <span>DSS · evaluación financiera</span>
        <i aria-hidden="true" />
        <span>Tiempo real · chat y avisos</span>
      </div>

      {/* ---------- ¿qué es? ---------- */}
      <section id="que-es" className={styles.about} style={{ backgroundImage: `url(${photoUrl("bodega-sacos")})` }}>
        <Reveal className={styles.aboutCard}>
          <p className={styles.eyebrow}>¿Qué es Mi Tierrita SIG?</p>
          <h2>Un sistema de información gerencial hecho a la medida de una agropecuaria</h2>
          <p>
            Agropecuaria Mi Tierrita vende alimentos balanceados, medicina veterinaria, semillas, agroquímicos y herramienta a fincas y familias de Sahagún y sus
            veredas. Mi Tierrita SIG reúne en un solo lugar el inventario por lotes, el punto de venta, la cartera, los proveedores, los reportes gerenciales y la
            evaluación de la ampliación del local, con roles para administración, caja y bodega.
          </p>
          <div className={styles.aboutFacts}>
            <div>
              <strong>3</strong>
              <span>roles con permisos propios</span>
            </div>
            <div>
              <strong>FEFO</strong>
              <span>primero vence, primero sale</span>
            </div>
            <div>
              <strong>100 %</strong>
              <span>de los cambios quedan en la auditoría</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- 3 puntos ---------- */}
      <section id="frentes" className={styles.points}>
        <Reveal className={styles.sectionHead}>
          <p className={styles.eyebrow}>Tres frentes</p>
          <h2>Para leer el negocio y decidir la ampliación</h2>
        </Reveal>
        {POINTS.map((p, i) => (
          <article key={p.n} className={[styles.point, i % 2 === 1 ? styles.pointReverse : ""].join(" ")}>
            <Reveal className={styles.pointText}>
              <span className={styles.pointNum}>{p.n}</span>
              <p className={styles.pointTag}>{p.tag}</p>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
              <ul>
                {p.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal className={styles.pointArt} delay={0.1}>
              <img src={p.art} alt="" loading="lazy" />
            </Reveal>
          </article>
        ))}
      </section>

      {/* ---------- catálogo ---------- */}
      <section id="catalogo" className={styles.catalog}>
        <Reveal className={styles.sectionHead}>
          <p className={styles.eyebrow}>Lo que encuentra en la tienda</p>
          <h2>Catálogo por líneas</h2>
        </Reveal>
        <div className={styles.catalogGrid}>
          {CATALOG.map((c, i) => (
            <Reveal key={c.name} delay={(i % 3) * 0.06}>
              <div className={styles.catalogCard} style={{ backgroundImage: `url(${photoUrl(c.photo)})` }}>
                <div>
                  <h3>{c.name}</h3>
                  <p>{c.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- galería ---------- */}
      <section id="galeria" className={styles.gallery}>
        <Reveal className={styles.sectionHead}>
          <p className={styles.eyebrow}>Del campo a la bodega</p>
          <h2>Así se ve Mi Tierrita</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <Carousel slides={GALLERY} label="Galería de fotografías de Mi Tierrita" interval={7000} />
        </Reveal>
      </section>

      {/* ---------- quiénes somos ---------- */}
      <section id="quienes-somos" className={styles.who}>
        <Reveal className={styles.whoArt}>
          <img src={farming} alt="" loading="lazy" />
        </Reveal>
        <Reveal className={styles.whoText} delay={0.08}>
          <p className={styles.eyebrow}>Quiénes somos</p>
          <h2>Una tienda del campo cordobés y un equipo universitario</h2>
          <p>
            Mi Tierrita es un negocio familiar de Sahagún, Córdoba, que atiende a ganaderos, avicultores y agricultores de la región. El sistema nació como
            trabajo de grado del programa de Ingeniería de Software de la Universidad de Cartagena, en los cursos de Sistemas de Información Gerencial e
            Ingeniería Económica (2026-2).
          </p>
          <ul className={styles.team}>
            {TEAM.map((t) => (
              <li key={t.name}>
                <span className={styles.teamAvatar} aria-hidden="true">
                  {t.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")}
                </span>
                <span>
                  <strong>{t.name}</strong>
                  <small>{t.role}</small>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* ---------- contacto ---------- */}
      <section id="contacto" className={styles.contact}>
        <Reveal className={styles.contactInfo}>
          <p className={styles.eyebrow}>Contacto</p>
          <h2>¿Necesita una cotización o un pedido grande?</h2>
          <p>Déjenos sus datos y lo que necesita. El mensaje llega directo a la administración de la tienda y le respondemos por correo o teléfono.</p>
          <dl>
            <div>
              <dt>Dónde estamos</dt>
              <dd>Sahagún, Córdoba, Colombia</dd>
            </div>
            <div>
              <dt>Para clientes del sistema</dt>
              <dd>
                <Link to={cta.to}>{cta.label}</Link>
              </dd>
            </div>
          </dl>
        </Reveal>
        <Reveal className={styles.formCard} delay={0.08}>
          {sent ? (
            <div className={styles.thanks} role="status">
              <h3>¡Gracias por escribirnos!</h3>
              <p>Recibimos su mensaje. La administración de Mi Tierrita le responderá pronto.</p>
              <button type="button" className={styles.btnDark} onClick={() => setSent(false)}>
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className={styles.formRow}>
                <label>
                  Nombre
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} autoComplete="name" />
                  {errors["name"] ? <span className={styles.err}>{errors["name"]}</span> : null}
                </label>
                <label>
                  Teléfono <em>(opcional)</em>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} autoComplete="tel" inputMode="tel" />
                </label>
              </div>
              <label>
                Correo electrónico
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={160} autoComplete="email" />
                {errors["email"] ? <span className={styles.err}>{errors["email"]}</span> : null}
              </label>
              <label>
                Mensaje
                <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required maxLength={2000} placeholder="Cuéntenos qué producto busca, cantidades y para cuándo." />
                {errors["message"] ? <span className={styles.err}>{errors["message"]}</span> : null}
              </label>
              {send.error && Object.keys(errors).length === 0 ? (
                <p className={styles.err} role="alert">
                  {send.error.code === "640" ? "Ya recibimos varios mensajes desde esta conexión. Intente de nuevo en una hora." : send.error.message}
                </p>
              ) : null}
              <p className={styles.consent}>
                Al enviar acepta el{" "}
                <button type="button" onClick={() => setLegal("privacidad")}>
                  tratamiento de sus datos
                </button>{" "}
                solo para responderle.
              </p>
              <button type="submit" className={styles.btnDark} disabled={send.isPending}>
                {send.isPending ? "Enviando…" : "Enviar mensaje"}
              </button>
            </form>
          )}
        </Reveal>
      </section>

      {/* ---------- pie ---------- */}
      <footer className={styles.footer}>
        <div className={styles.footBrand}>
          <BrandMark size={44} />
          <div>
            <strong>Mi Tierrita</strong>
            <small>Agropecuaria · Sahagún, Córdoba</small>
          </div>
          <p className={styles.footScript}>Información que siembra mejores decisiones</p>
        </div>
        <div className={styles.footCol}>
          <h4>Secciones</h4>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </div>
        <div className={styles.footCol}>
          <h4>Legal</h4>
          <button type="button" onClick={() => setLegal("privacidad")}>
            Política de tratamiento de datos
          </button>
          <button type="button" onClick={() => setLegal("terminos")}>
            Términos de uso
          </button>
          <Link to="/iniciar-sesion">Acceso del personal</Link>
        </div>
        <form className={styles.footNews} onSubmit={subscribe}>
          <h4>Boletín</h4>
          <p>Temporadas de siembra, jornadas de vacunación y ofertas.</p>
          <div className={styles.newsRow}>
            <label className="sr-only" htmlFor="news-mail">
              Correo para el boletín
            </label>
            <input id="news-mail" type="email" required placeholder="su@correo.com" value={mail} onChange={(e) => (setMail(e.target.value), setSubscribed("idle"))} />
            <button type="submit" disabled={newsletter.isPending} aria-label="Suscribirme">
              →
            </button>
          </div>
          {subscribed === "ok" ? <small className={styles.newsOk}>¡Listo! Quedó suscrito.</small> : null}
          {subscribed === "error" ? <small className={styles.newsErr}>Revise el correo e intente de nuevo.</small> : null}
        </form>
        <div className={styles.footBottom}>
          <span>© {new Date().getFullYear()} Agropecuaria Mi Tierrita · Proyecto académico, Universidad de Cartagena</span>
          <span>Fotografías: Unsplash · Ilustraciones: unDraw</span>
        </div>
      </footer>

      {legal ? (
        <div className={styles.legalOverlay} role="dialog" aria-modal="true" aria-label={legal === "privacidad" ? "Política de tratamiento de datos" : "Términos de uso"} onMouseDown={(e) => e.target === e.currentTarget && setLegal(null)}>
          <div className={styles.legalBox}>
            <h3>{legal === "privacidad" ? "Política de tratamiento de datos" : "Términos de uso"}</h3>
            {legal === "privacidad" ? (
              <>
                <p>
                  En cumplimiento de la Ley 1581 de 2012, los datos que deja en el formulario (nombre, correo, teléfono y mensaje) se usan únicamente para
                  responder su solicitud o enviarle el boletín si lo pidió. No se venden ni se comparten con terceros.
                </p>
                <p>Puede pedir que se consulten, corrijan o eliminen sus datos escribiendo por este mismo formulario.</p>
              </>
            ) : (
              <>
                <p>Este sitio presenta la tienda y su sistema de información. Los precios y existencias se confirman en la tienda o por respuesta escrita.</p>
                <p>El acceso al sistema es exclusivo del personal autorizado; cada acción queda registrada en la auditoría.</p>
              </>
            )}
            <button type="button" className={styles.btnDark} onClick={() => setLegal(null)}>
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
