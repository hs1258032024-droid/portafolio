/**
 * =============================================================================
 * script.js — Portafolio Cristian Fernando Hércules Serrano
 * -----------------------------------------------------------------------------
 * JavaScript "vanilla" (sin librerías ni dependencias).
 *
 * Arquitectura:
 *  · IIFE: todo el código vive en su propio ámbito, sin variables globales.
 *  · Un módulo init* por funcionalidad (responsabilidad única) y "guard
 *    clauses" al inicio: si falta su HTML, el módulo sale sin romper nada.
 *  · Mejora progresiva: sin JavaScript el sitio es 100 % legible y navegable;
 *    JS solo añade animación e interactividad.
 *  · Seguridad: el contenido dinámico se inserta con textContent o nodos DOM
 *    (nunca innerHTML), lo que evita inyección de código (XSS).
 *  · Rendimiento: los listeners de scroll se limitan a un cálculo por frame
 *    (requestAnimationFrame) y se registran como "passive".
 *
 * Módulos:
 *   initSplitTitle     → divide el título del hero en palabras animables
 *   initLoader         → pantalla de carga (una vez por sesión)
 *   initMenu           → menú móvil a pantalla completa
 *   initScrollProgress → barra/línea de progreso de lectura
 *   initActiveSection  → marca en la navegación la sección visible
 *   initReveal         → aparición de elementos al hacer scroll
 *   initWorks          → contador de proyectos + vista previa que sigue al cursor
 *   initCaseDrawer     → panel lateral con el caso de estudio
 *   initAccordion      → respaldo del acordeón exclusivo de servicios
 *   initTimeline       → línea de tiempo que se llena con el scroll
 *   initCopyEmail      → copiar el correo al portapapeles
 *   initContactForm    → validación con la Constraint Validation API
 *   setCurrentYear     → año actual en el pie
 * =============================================================================
 */

// IIFE: función anónima que se ejecuta de inmediato y encapsula todo el código
(() => {
  // Modo estricto: convierte errores silenciosos en errores visibles
  'use strict';

  /* ---------------------------------------------------------------------------
   * 1. CONFIGURACIÓN Y UTILIDADES
   * ------------------------------------------------------------------------- */

  // true si el sistema operativo pide reducir animaciones (accesibilidad)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Media query del diseño de escritorio; coincide con el breakpoint de 1024px del CSS
  const desktopQuery = window.matchMedia('(min-width: 1024px)');

  // true solo con mouse o trackpad (cursor preciso con hover): ahí tiene sentido la vista previa flotante
  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

  // Comportamiento del scroll programático: suave o instantáneo según la preferencia
  const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

  /**
   * Limita una función a una ejecución por frame de pantalla (patrón "throttle").
   * @param {Function} callback - Función a limitar.
   * @returns {Function} Función limitada.
   */
  const rafThrottle = (callback) => {
    // Indica si ya hay un frame agendado
    let ticking = false;
    // Closure que recuerda "ticking" entre llamadas
    return (...args) => {
      // Si ya hay trabajo pendiente, ignora esta llamada
      if (ticking) return;
      // Marca trabajo pendiente
      ticking = true;
      // Ejecuta justo antes del siguiente repintado
      window.requestAnimationFrame(() => {
        // Llama a la función original
        callback(...args);
        // Libera la bandera
        ticking = false;
      });
    };
  };

  /**
   * Restringe un número a un rango.
   * @param {number} value - Valor de entrada.
   * @param {number} min - Mínimo permitido.
   * @param {number} max - Máximo permitido.
   * @returns {number} Valor dentro del rango.
   */
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  /**
   * Formatea un número con dos dígitos (1 → "01").
   * @param {number} value - Número a formatear.
   * @returns {string} Número con cero a la izquierda.
   */
  const padNumber = (value) => String(value).padStart(2, '0');

  /**
   * Obtiene las iniciales de un nombre ("Café Altamira" → "CA").
   * Ignora palabras que no empiezan con letra, como "&".
   * @param {string} text - Texto de origen.
   * @returns {string} Hasta dos iniciales en mayúscula.
   */
  const getInitials = (text) => text
    // Separa por cualquier espacio
    .split(/\s+/)
    // \p{L} = cualquier letra Unicode (incluye tildes); descarta símbolos
    .filter((word) => /^\p{L}/u.test(word))
    // Toma las dos primeras palabras
    .slice(0, 2)
    // Toma la primera letra de cada una en mayúscula
    .map((word) => word.charAt(0).toUpperCase())
    // Las une
    .join('');

  /**
   * Muestra una notificación breve en pantalla (y la anuncia a lectores de pantalla).
   * Se crea con una IIFE para que el temporizador quede privado (closure).
   * @param {string} message - Texto a mostrar.
   */
  const showToast = (() => {
    // Temporizador de ocultado, compartido entre llamadas
    let hideTimer = 0;
    // Función real que se expone
    return (message) => {
      // Busca el contenedor de la notificación
      const toast = document.getElementById('toast');
      // Guard clause
      if (!toast) return;
      // Escribe el mensaje de forma segura
      toast.textContent = message;
      // La muestra
      toast.classList.add('is-visible');
      // Cancela un ocultado previo si había otra notificación en curso
      window.clearTimeout(hideTimer);
      // Programa el ocultado a los 3.2 segundos
      hideTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
    };
  })();

  /* ---------------------------------------------------------------------------
   * 2. TÍTULO DIVIDIDO EN PALABRAS
   * ------------------------------------------------------------------------- */

  /**
   * Envuelve cada palabra del título del hero en dos <span> para animarlas
   * subiendo una a una. Para no afectar la accesibilidad, las líneas divididas
   * se ocultan a lectores de pantalla y se añade una copia del texto completo.
   */
  function initSplitTitle() {
    // Sección hero
    const hero = document.querySelector('.hero');
    // Título dentro del hero (?. evita error si hero no existe)
    const title = hero?.querySelector('.hero__title');
    // Líneas marcadas para dividir
    const lines = title?.querySelectorAll('[data-split]');
    // Guard clause
    if (!hero || !title || !lines?.length) return;

    // Crea la copia accesible del título completo
    const accessibleText = document.createElement('span');
    // Clase que la oculta visualmente pero la mantiene para lectores
    accessibleText.className = 'sr-only';
    // Une el texto de todas las líneas
    accessibleText.textContent = [...lines].map((line) => line.textContent.trim()).join(' ');

    // Contador global de palabras: define el retraso escalonado de cada una
    let wordIndex = 0;

    // Recorre cada línea
    lines.forEach((line) => {
      // Separa la línea en palabras
      const words = line.textContent.trim().split(/\s+/);
      // DocumentFragment: arma los nodos fuera del DOM y los inserta de una vez (un solo repintado)
      const fragment = document.createDocumentFragment();

      // Recorre cada palabra
      words.forEach((word, index) => {
        // Envoltura que recorta (overflow: hidden)
        const outer = document.createElement('span');
        // Clase de la envoltura
        outer.className = 'word';
        // Palabra que se desplaza
        const inner = document.createElement('span');
        // Clase de la palabra
        inner.className = 'word__inner';
        // --i le dice al CSS el orden para calcular el retraso
        inner.style.setProperty('--i', String(wordIndex));
        // Texto de la palabra
        inner.textContent = word;
        // Anida la palabra en su envoltura
        outer.append(inner);
        // Añade el conjunto al fragmento
        fragment.append(outer);
        // Repone el espacio entre palabras (excepto tras la última)
        if (index < words.length - 1) fragment.append(' ');
        // Avanza el contador global
        wordIndex += 1;
      });

      // Sustituye el texto original por las palabras envueltas
      line.replaceChildren(fragment);
      // Oculta la versión dividida a lectores de pantalla (leerían palabra por palabra)
      line.setAttribute('aria-hidden', 'true');
    });

    // Inserta la copia accesible al inicio del h1
    title.prepend(accessibleText);
    // Activa los estilos de animación del hero
    hero.classList.add('hero-ready');
  }

  /* ---------------------------------------------------------------------------
   * 3. PANTALLA DE CARGA
   * ------------------------------------------------------------------------- */

  /**
   * Muestra el telón de entrada un tiempo mínimo, luego lo desliza hacia arriba
   * y añade .is-loaded al <body> para disparar la animación del hero.
   * Solo aparece en la primera visita de la sesión (sessionStorage).
   */
  function initLoader() {
    // Telón
    const loader = document.getElementById('loader');
    // Evita ejecutar el cierre dos veces (por "load" y por el temporizador de seguridad)
    let finished = false;

    /**
     * Cierra el telón y marca la página como cargada.
     */
    const finish = () => {
      // Si ya se cerró, no hace nada
      if (finished) return;
      // Marca como cerrado
      finished = true;
      // Dispara la animación de entrada del hero (CSS)
      document.body.classList.add('is-loaded');
      // Si no hay telón, termina
      if (!loader) return;
      // Inicia la transición de salida (CSS)
      loader.classList.add('is-hidden');
      // Elimina el telón del DOM al terminar la transición (0.9 s)
      window.setTimeout(() => loader.remove(), 1000);
    };

    // ¿Ya se vio la intro en esta sesión?
    let alreadySeen = false;
    // sessionStorage puede estar bloqueado (modo privado estricto): try/catch evita que el sitio falle
    try {
      // Lee la marca guardada
      alreadySeen = window.sessionStorage.getItem('ch-intro-vista') === '1';
      // Guarda la marca para las próximas recargas
      window.sessionStorage.setItem('ch-intro-vista', '1');
    } catch {
      // Sin almacenamiento disponible: se muestra la intro igualmente
    }

    // Sin telón, con movimiento reducido o ya vista: se omite
    if (!loader || prefersReducedMotion || alreadySeen) {
      // Quita el telón de inmediato (si existe)
      loader?.remove();
      // Marca como cerrado
      finished = true;
      // Muestra el hero
      document.body.classList.add('is-loaded');
      // Termina
      return;
    }

    // Duración mínima del telón para que la animación se aprecie
    const MIN_DURATION = 1200;
    // Momento de inicio
    const startedAt = performance.now();

    /**
     * Cierra el telón respetando la duración mínima.
     */
    const finishAfterMinimum = () => {
      // Tiempo transcurrido
      const elapsed = performance.now() - startedAt;
      // Espera lo que falte para llegar al mínimo
      window.setTimeout(finish, Math.max(0, MIN_DURATION - elapsed));
    };

    // Si la página (imágenes, fuentes) ya terminó de cargar…
    if (document.readyState === 'complete') {
      // …cierra tras el mínimo
      finishAfterMinimum();
    // Si no…
    } else {
      // …espera al evento "load" (una sola vez)
      window.addEventListener('load', finishAfterMinimum, { once: true });
    }

    // Seguro: si "load" tarda (red lenta), cierra igual a los 3.5 s
    window.setTimeout(finish, 3500);
  }

  /* ---------------------------------------------------------------------------
   * 4. MENÚ MÓVIL
   * ------------------------------------------------------------------------- */

  /**
   * Abre y cierra el menú a pantalla completa: estados ARIA, texto del botón,
   * bloqueo del scroll, contenido de fondo inerte y tecla Escape.
   */
  function initMenu() {
    // Botón
    const toggle = document.getElementById('menuToggle');
    // Panel del menú
    const menu = document.getElementById('menuOverlay');
    // Guard clause
    if (!toggle || !menu) return;

    // Texto visible del botón ("Menú" / "Cerrar")
    const label = toggle.querySelector('.menu-toggle__text');
    // Zonas que quedan inertes con el menú abierto
    const background = [document.getElementById('contenido'), document.getElementById('footer')];

    /**
     * Aplica el estado abierto/cerrado (fuente única de verdad).
     * @param {boolean} isOpen - Estado deseado.
     */
    const setOpen = (isOpen) => {
      // Comunica el estado a tecnologías de asistencia
      toggle.setAttribute('aria-expanded', String(isOpen));
      // Cambia el texto del botón
      if (label) label.textContent = isOpen ? 'Cerrar' : 'Menú';
      // Muestra u oculta el panel (CSS anima el telón)
      menu.classList.toggle('is-open', isOpen);
      // Bloquea o libera el scroll
      document.body.classList.toggle('no-scroll', isOpen);
      // inert impide enfocar o pulsar lo que queda detrás del menú
      background.forEach((element) => {
        // Solo si el elemento existe
        if (element) element.inert = isOpen;
      });
    };

    // Clic en el botón
    toggle.addEventListener('click', () => {
      // Calcula el estado siguiente
      const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
      // Lo aplica
      setOpen(willOpen);
      // Al abrir, lleva el foco al primer enlace sin mover la página
      if (willOpen) menu.querySelector('.menu__link')?.focus({ preventScroll: true });
    });

    // Cada enlace del menú…
    menu.querySelectorAll('.menu__link').forEach((link) => {
      // …cierra el menú al elegir una sección
      link.addEventListener('click', () => setOpen(false));
    });

    // Tecla Escape
    document.addEventListener('keydown', (event) => {
      // Solo si es Escape y el menú está abierto
      if (event.key !== 'Escape' || !menu.classList.contains('is-open')) return;
      // Cierra
      setOpen(false);
      // Devuelve el foco al botón
      toggle.focus();
    });

    // Si la ventana pasa a escritorio con el menú abierto, lo cierra para no dejar el fondo bloqueado
    desktopQuery.addEventListener('change', (event) => {
      // matches = true al entrar en escritorio
      if (event.matches) setOpen(false);
    });
  }

  /* ---------------------------------------------------------------------------
   * 5. PROGRESO DE LECTURA
   * ------------------------------------------------------------------------- */

  /**
   * Calcula el porcentaje de scroll (0 a 1) y lo publica como variable CSS
   * en <html>. La barra móvil y la línea del riel leen ese mismo valor.
   */
  function initScrollProgress() {
    // Elemento raíz donde se publica la variable
    const root = document.documentElement;

    // Cálculo limitado a uno por frame
    const update = rafThrottle(() => {
      // Distancia máxima que se puede desplazar
      const maxScroll = root.scrollHeight - window.innerHeight;
      // Proporción recorrida (evita dividir entre 0 en páginas cortas)
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      // Publica el valor con 4 decimales
      root.style.setProperty('--scroll-progress', clamp(progress, 0, 1).toFixed(4));
    });

    // Cálculo inicial (por si la página se recarga a media altura)
    update();
    // Recalcula al hacer scroll (passive: no bloquea el desplazamiento)
    window.addEventListener('scroll', update, { passive: true });
    // Recalcula al cambiar el tamaño de la ventana
    window.addEventListener('resize', update);
  }

  /* ---------------------------------------------------------------------------
   * 6. SECCIÓN ACTIVA EN LA NAVEGACIÓN
   * ------------------------------------------------------------------------- */

  /**
   * Con IntersectionObserver detecta la sección que cruza el centro de la
   * pantalla y marca sus enlaces (riel y menú móvil) como activos.
   */
  function initActiveSection() {
    // Secciones con id dentro del contenido
    const sections = document.querySelectorAll('main section[id]');
    // Todos los enlaces de navegación marcados con data-nav-link
    const links = document.querySelectorAll('[data-nav-link]');
    // Guard clause (incluye navegadores sin IntersectionObserver)
    if (!sections.length || !links.length || !('IntersectionObserver' in window)) return;

    /**
     * Marca como activos los enlaces que apuntan a la sección indicada.
     * @param {string} id - id de la sección visible.
     */
    const setActive = (id) => {
      // Recorre todos los enlaces
      links.forEach((link) => {
        // link.hash devuelve "#id"
        const isActive = link.hash === `#${id}`;
        // Clase visual
        link.classList.toggle('is-active', isActive);
        // aria-current comunica la ubicación actual a lectores de pantalla
        if (isActive) link.setAttribute('aria-current', 'true');
        // Lo quita de los demás
        else link.removeAttribute('aria-current');
      });
    };

    // Observador
    const observer = new IntersectionObserver((entries) => {
      // Recorre los cambios
      entries.forEach((entry) => {
        // Activa la sección que entra en la franja central
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, {
      // Franja central: recorta 45 % arriba y 50 % abajo del área visible
      rootMargin: '-45% 0px -50% 0px',
    });

    // Observa cada sección
    sections.forEach((section) => observer.observe(section));
  }

  /* ---------------------------------------------------------------------------
   * 7. APARICIÓN AL HACER SCROLL
   * ------------------------------------------------------------------------- */

  /**
   * Activa el estado oculto de los [data-reveal] (añadiendo .reveal-ready a
   * <html>) y los descubre al entrar en pantalla. Si JS no corre, nada se oculta.
   */
  function initReveal() {
    // Elementos animables
    const elements = document.querySelectorAll('[data-reveal]');
    // Sin elementos, con movimiento reducido o sin soporte: se muestran tal cual
    if (!elements.length || prefersReducedMotion || !('IntersectionObserver' in window)) return;

    // Habilita los estilos de estado inicial (opacidad 0, desplazamiento, máscara)
    document.documentElement.classList.add('reveal-ready');

    // Observador
    const observer = new IntersectionObserver((entries, obs) => {
      // Recorre los cambios
      entries.forEach((entry) => {
        // Solo los que entran en pantalla
        if (!entry.isIntersecting) return;
        // Dispara la transición
        entry.target.classList.add('is-revealed');
        // Deja de observarlo (aparece una sola vez)
        obs.unobserve(entry.target);
      });
    }, {
      // Basta con que se vea el 12 %
      threshold: 0.12,
      // Recorta el 8 % inferior: aparece un poco después de asomar
      rootMargin: '0px 0px -8% 0px',
    });

    // Observa cada elemento
    elements.forEach((element) => observer.observe(element));
  }

  /* ---------------------------------------------------------------------------
   * 8. TRABAJOS: CONTADOR Y VISTA PREVIA FLOTANTE
   * ------------------------------------------------------------------------- */

  /**
   * Actualiza el contador "(06)" y, con mouse, muestra una tarjeta con los
   * colores del proyecto que sigue al cursor con inercia (interpolación lineal).
   */
  function initWorks() {
    // Lista de proyectos
    const list = document.getElementById('worksList');
    // Guard clause
    if (!list) return;

    // Proyectos
    const works = list.querySelectorAll('.work');
    // Contador junto al título
    const count = document.getElementById('worksCount');
    // Escribe el total real con dos dígitos
    if (count) count.textContent = `(${padNumber(works.length)})`;

    // Vista previa flotante
    const preview = document.getElementById('workPreview');
    // Contenedor de las iniciales
    const initials = preview?.querySelector('.works__preview-initials');
    // Sin vista previa, en pantallas táctiles o con movimiento reducido: no se activa
    if (!preview || !initials || !finePointerQuery.matches || prefersReducedMotion) return;

    // Factor de suavizado: cuánto se acerca la tarjeta al cursor en cada frame (0–1)
    const EASING = 0.14;
    // Distancia horizontal entre el cursor y la tarjeta (para no tapar el título)
    const OFFSET = 32;
    // Margen mínimo con los bordes de la ventana
    const EDGE = 16;
    // Posición actual de la tarjeta
    const position = { x: 0, y: 0 };
    // Posición objetivo (cursor)
    const target = { x: 0, y: 0 };
    // Tamaño de la tarjeta (se mide al entrar)
    let size = { width: 0, height: 0 };
    // Identificador del frame en curso (para cancelarlo)
    let frameId = 0;

    /**
     * Bucle de animación: interpolación lineal (lerp) hacia el cursor.
     */
    const render = () => {
      // Avanza un porcentaje de la distancia restante en X
      position.x += (target.x - position.x) * EASING;
      // Igual en Y
      position.y += (target.y - position.y) * EASING;
      // X final: a la derecha del cursor, sin salirse de la ventana
      const x = clamp(position.x + OFFSET, EDGE, window.innerWidth - size.width - EDGE);
      // Y final: centrada en el cursor, sin salirse de la ventana
      const y = clamp(position.y - size.height / 2, EDGE, window.innerHeight - size.height - EDGE);
      // translate3d usa la GPU: movimiento fluido sin recalcular el layout
      preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      // Siguiente frame
      frameId = window.requestAnimationFrame(render);
    };

    // El cursor se mueve sobre la lista
    list.addEventListener('pointermove', (event) => {
      // Actualiza el objetivo X
      target.x = event.clientX;
      // Actualiza el objetivo Y
      target.y = event.clientY;
    });

    // El cursor entra en la lista
    list.addEventListener('pointerenter', (event) => {
      // Mide la tarjeta
      const rect = preview.getBoundingClientRect();
      // Guarda su tamaño
      size = { width: rect.width, height: rect.height };
      // Coloca la tarjeta directamente en el cursor (sin "viajar" desde la esquina)
      position.x = event.clientX;
      // Igual en Y
      position.y = event.clientY;
      // El objetivo coincide con la posición inicial
      target.x = event.clientX;
      // Igual en Y
      target.y = event.clientY;
      // Cancela un bucle anterior por seguridad
      window.cancelAnimationFrame(frameId);
      // Inicia el bucle
      frameId = window.requestAnimationFrame(render);
    });

    // El cursor sale de la lista
    list.addEventListener('pointerleave', () => {
      // Oculta la tarjeta
      preview.classList.remove('is-visible');
      // Detiene el bucle (ahorra batería)
      window.cancelAnimationFrame(frameId);
    });

    // Cada proyecto
    works.forEach((work) => {
      // Al pasar el cursor sobre él…
      work.addEventListener('pointerenter', () => {
        // …copia su color 1
        preview.style.setProperty('--tone-1', work.style.getPropertyValue('--tone-1'));
        // …su color 2
        preview.style.setProperty('--tone-2', work.style.getPropertyValue('--tone-2'));
        // …escribe sus iniciales
        initials.textContent = getInitials(work.querySelector('.work__title')?.textContent ?? '');
        // …y muestra la tarjeta
        preview.classList.add('is-visible');
      });
    });
  }

  /* ---------------------------------------------------------------------------
   * 9. PANEL DE CASO DE ESTUDIO
   * ------------------------------------------------------------------------- */

  /**
   * Abre un <dialog> lateral con el caso del proyecto pulsado, clonando su
   * <template>. Incluye navegación anterior/siguiente (botones y flechas del
   * teclado) y una animación de salida antes de cerrar.
   */
  function initCaseDrawer() {
    // Panel
    const drawer = document.getElementById('caseDrawer');
    // Filas de proyectos convertidas a array (permite usar índices)
    const rows = [...document.querySelectorAll('.work__row[data-case]')];
    // Guard clause (incluye navegadores sin <dialog>)
    if (!drawer || !rows.length || typeof drawer.showModal !== 'function') return;

    // Referencias a las partes del panel
    const ui = {
      // Número del caso actual
      index: document.getElementById('caseIndex'),
      // Total de casos
      total: document.getElementById('caseTotal'),
      // Portada
      cover: document.getElementById('caseCover'),
      // Iniciales de la portada
      initials: document.getElementById('caseInitials'),
      // Disciplina y año
      type: document.getElementById('caseType'),
      // Título
      title: document.getElementById('caseTitle'),
      // Contenedor del contenido clonado
      content: document.getElementById('caseContent'),
    };

    // Índice del caso mostrado
    let currentIndex = 0;
    // Elemento que abrió el panel (para devolverle el foco)
    let lastTrigger = null;

    // Escribe el total de casos
    if (ui.total) ui.total.textContent = padNumber(rows.length);

    /**
     * Pinta en el panel el caso indicado.
     * @param {number} index - Posición del caso en "rows".
     */
    const render = (index) => {
      // Fila del caso
      const row = rows[index];
      // Proyecto contenedor (tiene los colores en su atributo style)
      const work = row.closest('.work');
      // <template> asociado mediante data-case
      const template = document.getElementById(row.dataset.case);
      // Título leído de la propia fila (una sola fuente de datos)
      const title = row.querySelector('.work__title')?.textContent.trim() ?? '';
      // Disciplina
      const type = row.querySelector('.work__type')?.textContent.trim() ?? '';
      // Año
      const year = row.querySelector('.work__year')?.textContent.trim() ?? '';

      // Guarda el índice actual
      currentIndex = index;
      // Número del caso
      ui.index.textContent = padNumber(index + 1);
      // Título
      ui.title.textContent = title;
      // Disciplina · año (filter evita un "·" suelto si falta alguno)
      ui.type.textContent = [type, year].filter(Boolean).join(' · ');
      // Iniciales
      ui.initials.textContent = getInitials(title);
      // Copia el color 1 a la portada
      ui.cover.style.setProperty('--tone-1', work?.style.getPropertyValue('--tone-1') ?? '');
      // Copia el color 2
      ui.cover.style.setProperty('--tone-2', work?.style.getPropertyValue('--tone-2') ?? '');
      // Clona el contenido del template (cloneNode(true) copia todo su árbol)
      if (template) ui.content.replaceChildren(template.content.cloneNode(true));
      // Si no hay template, vacía el contenedor
      else ui.content.replaceChildren();
      // Vuelve al inicio del panel
      drawer.scrollTop = 0;
    };

    /**
     * Abre el panel con un caso.
     * @param {number} index - Caso a mostrar.
     * @param {HTMLElement} trigger - Botón que lo abrió.
     */
    const open = (index, trigger) => {
      // Recuerda el disparador
      lastTrigger = trigger;
      // Pinta el contenido
      render(index);
      // Limpia un posible estado de cierre previo
      drawer.classList.remove('is-closing');
      // Abre como modal (bloquea el resto y atrapa el foco)
      drawer.showModal();
      // Bloquea el scroll del fondo
      document.body.classList.add('no-scroll');
    };

    /**
     * Cierra el panel con animación de salida.
     */
    const close = () => {
      // Si ya está cerrado o cerrándose, no hace nada
      if (!drawer.open || drawer.classList.contains('is-closing')) return;
      // Con movimiento reducido, cierra sin animación
      if (prefersReducedMotion) {
        // Cierre inmediato
        drawer.close();
        // Termina
        return;
      }

      /**
       * Cierra de verdad cuando termina la animación del panel.
       * @param {AnimationEvent} event - Evento de fin de animación.
       */
      const onAnimationEnd = (event) => {
        // Ignora animaciones de hijos o del ::backdrop (también llegan aquí)
        if (event.target !== drawer || event.pseudoElement) return;
        // Quita el listener
        drawer.removeEventListener('animationend', onAnimationEnd);
        // Quita la clase de salida
        drawer.classList.remove('is-closing');
        // Cierra el diálogo
        drawer.close();
      };

      // Escucha el fin de la animación
      drawer.addEventListener('animationend', onAnimationEnd);
      // Inicia la animación de salida (CSS)
      drawer.classList.add('is-closing');
      // Seguro: si "animationend" no llegara, cierra a los 700 ms
      window.setTimeout(() => {
        // Solo si sigue cerrándose
        if (!drawer.classList.contains('is-closing')) return;
        // Quita el listener
        drawer.removeEventListener('animationend', onAnimationEnd);
        // Quita la clase
        drawer.classList.remove('is-closing');
        // Cierra
        drawer.close();
      }, 700);
    };

    /**
     * Avanza o retrocede entre casos de forma circular.
     * @param {number} step - +1 siguiente, -1 anterior.
     */
    const goTo = (step) => {
      // Suma rows.length antes del módulo para que -1 desde 0 dé el último
      const nextIndex = (currentIndex + step + rows.length) % rows.length;
      // Pinta el nuevo caso
      render(nextIndex);
      // Al cerrar, el foco volverá a la fila del caso que se estaba viendo
      lastTrigger = rows[nextIndex];
    };

    // Cada fila abre su caso
    rows.forEach((row, index) => {
      // Clic (o Enter/Espacio, porque es un <button>)
      row.addEventListener('click', () => open(index, row));
    });

    // Botón cerrar
    drawer.querySelector('[data-drawer-close]')?.addEventListener('click', close);

    // Botones anterior/siguiente
    drawer.querySelectorAll('[data-drawer-step]').forEach((button) => {
      // data-drawer-step contiene -1 o 1
      button.addEventListener('click', () => goTo(Number(button.dataset.drawerStep)));
    });

    // Escape dispara "cancel": se intercepta para cerrar con animación
    drawer.addEventListener('cancel', (event) => {
      // Evita el cierre inmediato del navegador
      event.preventDefault();
      // Cierra con animación
      close();
    });

    // Flechas del teclado para navegar entre casos
    drawer.addEventListener('keydown', (event) => {
      // Flecha derecha → siguiente
      if (event.key === 'ArrowRight') goTo(1);
      // Flecha izquierda → anterior
      if (event.key === 'ArrowLeft') goTo(-1);
    });

    // Clic fuera del panel (en el fondo oscuro)
    drawer.addEventListener('click', (event) => {
      // Rectángulo del panel
      const rect = drawer.getBoundingClientRect();
      // ¿El clic cayó dentro del panel?
      const isInside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      // Si fue fuera, cierra
      if (!isInside) close();
    });

    // Al cerrarse por cualquier vía
    drawer.addEventListener('close', () => {
      // Libera el scroll
      document.body.classList.remove('no-scroll');
      // Devuelve el foco al disparador sin mover la página
      lastTrigger?.focus({ preventScroll: true });
    });
  }

  /* ---------------------------------------------------------------------------
   * 10. ACORDEÓN DE SERVICIOS
   * ------------------------------------------------------------------------- */

  /**
   * HTML moderno ya hace exclusivo el acordeón con <details name="…">.
   * Este módulo es solo un respaldo para navegadores que aún no lo soportan.
   */
  function initAccordion() {
    // Elementos del acordeón
    const items = document.querySelectorAll('details[name="servicios"]');
    // Sin elementos o con soporte nativo del atributo name: no hace falta JS
    if (!items.length || 'name' in HTMLDetailsElement.prototype) return;

    // Recorre cada <details>
    items.forEach((item) => {
      // "toggle" se dispara al abrir o cerrar
      item.addEventListener('toggle', () => {
        // Solo interesa cuando se abre
        if (!item.open) return;
        // Cierra los demás
        items.forEach((other) => {
          // Excepto el actual
          if (other !== item) other.open = false;
        });
      });
    });
  }

  /* ---------------------------------------------------------------------------
   * 11. LÍNEA DE TIEMPO
   * ------------------------------------------------------------------------- */

  /**
   * Llena la línea dorada según cuánto se ha recorrido la lista y rellena el
   * rombo de cada hito cuando la línea lo alcanza.
   */
  function initTimeline() {
    // Lista de la línea de tiempo
    const timeline = document.getElementById('timeline');
    // Guard clause
    if (!timeline) return;

    // Hitos
    const items = timeline.querySelectorAll('.timeline__item');

    // Cálculo limitado a uno por frame
    const update = rafThrottle(() => {
      // Punto de referencia: 60 % de la altura de la ventana
      const anchor = window.innerHeight * 0.6;
      // Posición de la lista
      const rect = timeline.getBoundingClientRect();
      // Proporción de la lista que ya pasó el punto de referencia
      const progress = clamp((anchor - rect.top) / rect.height, 0, 1);
      // La publica como variable CSS de la lista
      timeline.style.setProperty('--timeline-progress', progress.toFixed(3));
      // Activa los hitos ya alcanzados
      items.forEach((item) => {
        // +8 px ≈ posición del rombo dentro del hito
        item.classList.toggle('is-active', item.getBoundingClientRect().top + 8 <= anchor);
      });
    });

    // Cálculo inicial
    update();
    // Recalcula con el scroll
    window.addEventListener('scroll', update, { passive: true });
    // Recalcula al redimensionar
    window.addEventListener('resize', update);
  }

  /* ---------------------------------------------------------------------------
   * 12. COPIAR CORREO
   * ------------------------------------------------------------------------- */

  /**
   * Copia al portapapeles el texto de data-copy usando la Clipboard API
   * (asíncrona, devuelve una promesa) y confirma con una notificación.
   */
  function initCopyEmail() {
    // Cada botón con data-copy
    document.querySelectorAll('[data-copy]').forEach((button) => {
      // Manejador asíncrono para poder usar await
      button.addEventListener('click', async () => {
        // Texto a copiar
        const text = button.dataset.copy ?? '';
        // try/catch: la API puede no existir o el permiso puede negarse
        try {
          // Verifica que la API exista (requiere HTTPS o localhost)
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard API no disponible');
          // Copia el texto
          await navigator.clipboard.writeText(text);
          // Confirma
          showToast('Correo copiado al portapapeles.');
        } catch {
          // Alternativa: muestra el correo para copiarlo a mano
          showToast(`No se pudo copiar. Escribe a ${text}`);
        }
      });
    });
  }

  /* ---------------------------------------------------------------------------
   * 13. FORMULARIO DE CONTACTO
   * ------------------------------------------------------------------------- */

  /**
   * Validación basada en la Constraint Validation API del navegador: las reglas
   * viven en el HTML (required, minlength, type, pattern) y JS solo lee
   * field.validity para mostrar mensajes claros y accesibles.
   * IMPORTANTE: el servidor siempre debe volver a validar.
   */
  function initContactForm() {
    // Formulario
    const form = document.getElementById('contactForm');
    // Guard clause
    if (!form) return;

    // Campos de texto con etiqueta flotante
    const fields = [...form.querySelectorAll('.field__input')];
    // Botón de envío
    const submitButton = form.querySelector('[type="submit"]');
    // Texto del botón
    const submitLabel = submitButton?.querySelector('.btn__text');
    // Texto original para restaurarlo
    const defaultLabel = submitLabel?.textContent ?? '';

    /**
     * Traduce el estado de validez nativo a un mensaje en español.
     * @param {HTMLInputElement|HTMLTextAreaElement} field - Campo a revisar.
     * @returns {string} Mensaje de error o cadena vacía.
     */
    const getErrorMessage = (field) => {
      // validity es un objeto ValidityState con una bandera por cada regla
      const { validity } = field;
      // required sin valor
      if (validity.valueMissing) return 'Este campo es obligatorio.';
      // type="email" o pattern no cumplidos
      if (validity.typeMismatch || validity.patternMismatch) return 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
      // minlength no alcanzado
      if (validity.tooShort) return `Escribe al menos ${field.minLength} caracteres (llevas ${field.value.length}).`;
      // Regla personalizada (setCustomValidity)
      if (validity.customError) return field.validationMessage;
      // Sin error
      return '';
    };

    /**
     * Valida un campo y actualiza su estado visual y accesible.
     * @param {HTMLInputElement|HTMLTextAreaElement} field - Campo a validar.
     * @returns {boolean} true si es válido.
     */
    const validateField = (field) => {
      // Regla extra: texto formado solo por espacios
      const onlySpaces = field.value.length > 0 && field.value.trim() === '';
      // setCustomValidity con texto marca error; con '' lo limpia
      field.setCustomValidity(onlySpaces ? 'El texto no puede contener solo espacios.' : '');
      // checkValidity evalúa todas las reglas del campo
      const isValid = field.checkValidity();
      // aria-invalid avisa a lectores de pantalla y activa el estilo de error
      field.setAttribute('aria-invalid', String(!isValid));
      // Párrafo de error asociado (convención id + "-error")
      const errorElement = document.getElementById(`${field.id}-error`);
      // Muestra u oculta el mensaje
      if (errorElement) errorElement.textContent = isValid ? '' : getErrorMessage(field);
      // Devuelve el resultado
      return isValid;
    };

    // Validación en vivo de cada campo
    fields.forEach((field) => {
      // Al salir del campo: valida solo si escribió algo o ya tenía error (no regaña al tabular)
      field.addEventListener('blur', () => {
        // Condición para validar
        if (field.value !== '' || field.hasAttribute('aria-invalid')) validateField(field);
      });
      // Mientras escribe en un campo marcado con error, revalida para quitarlo en cuanto se corrija
      field.addEventListener('input', () => {
        // Solo si tenía error
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    // Envío del formulario
    form.addEventListener('submit', async (event) => {
      // Evita la recarga de la página
      event.preventDefault();

      // Campo trampa: si tiene texto, es un bot y se descarta en silencio
      if (form.elements.namedItem('sitio_web')?.value) return;

      // Valida todos (filter recorre todos los campos, así se marcan todos los errores)
      const invalidFields = fields.filter((field) => !validateField(field));

      // Si hay errores…
      if (invalidFields.length) {
        // …lleva el foco al primero
        invalidFields[0].focus();
        // …y lo resume en una notificación
        showToast(invalidFields.length === 1 ? 'Revisa el campo marcado.' : `Revisa los ${invalidFields.length} campos marcados.`);
        // Detiene el envío
        return;
      }

      // Convierte el formulario en un objeto { nombre, correo, empresa, presupuesto, mensaje, sitio_web }
      const data = Object.fromEntries(new FormData(form));
      // Quita el campo trampa
      delete data.sitio_web;

      // Evita envíos dobles
      submitButton.disabled = true;
      // Indica el estado
      if (submitLabel) submitLabel.textContent = 'Enviando…';

      // Manejo de éxito, error y limpieza
      try {
        // Envía (actualmente simulado)
        await sendMessage(data);
        // Limpia el formulario (también restablece el presupuesto a "Por definir")
        form.reset();
        // Quita las marcas de validación
        fields.forEach((field) => field.removeAttribute('aria-invalid'));
        // Confirma
        showToast('Gracias. Tu mensaje fue enviado; te responderé personalmente muy pronto.');
      } catch (error) {
        // Registra el detalle técnico
        console.error('Error al enviar el formulario:', error);
        // Informa con amabilidad
        showToast('No se pudo enviar el mensaje. Inténtalo de nuevo o escríbeme por correo.');
      } finally {
        // Reactiva el botón
        submitButton.disabled = false;
        // Restaura el texto
        if (submitLabel) submitLabel.textContent = defaultLabel;
      }
    });
  }

  /**
   * Envía los datos del formulario.
   * ACTUALMENTE ES UNA SIMULACIÓN (resuelve a los 1.2 s). Para producción,
   * reemplázala por un fetch real, por ejemplo con Formspree:
   *
   *   const response = await fetch('https://formspree.io/f/TU_ID', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
   *     body: JSON.stringify(data),
   *   });
   *   if (!response.ok) throw new Error(`HTTP ${response.status}`);
   *
   * @param {Record<string, string>} data - Datos del formulario.
   * @returns {Promise<Record<string, string>>} Promesa resuelta al "enviar".
   */
  function sendMessage(data) {
    // Promesa que imita la latencia de red
    return new Promise((resolve) => {
      // Resuelve tras 1200 ms
      window.setTimeout(() => resolve(data), 1200);
    });
  }

  /* ---------------------------------------------------------------------------
   * 14. AÑO ACTUAL
   * ------------------------------------------------------------------------- */

  /**
   * Escribe el año en curso en el pie de página.
   */
  function setCurrentYear() {
    // Elemento del año
    const yearElement = document.getElementById('year');
    // Escribe el año de 4 dígitos
    if (yearElement) yearElement.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------------------------
   * 15. ARRANQUE
   * ------------------------------------------------------------------------- */

  /**
   * Inicializa los módulos. El título se divide antes de quitar la pantalla
   * de carga para que la animación del hero arranque con todo listo.
   */
  function init() {
    // Prepara el título
    initSplitTitle();
    // Pantalla de carga
    initLoader();
    // Menú móvil
    initMenu();
    // Progreso de lectura
    initScrollProgress();
    // Sección activa
    initActiveSection();
    // Apariciones
    initReveal();
    // Lista de trabajos
    initWorks();
    // Panel de casos
    initCaseDrawer();
    // Acordeón
    initAccordion();
    // Línea de tiempo
    initTimeline();
    // Copiar correo
    initCopyEmail();
    // Formulario
    initContactForm();
    // Año
    setCurrentYear();
  }

  // Si el HTML todavía se está analizando…
  if (document.readyState === 'loading') {
    // …espera a que el DOM esté listo
    document.addEventListener('DOMContentLoaded', init);
  // Si ya está listo (lo habitual con "defer")…
  } else {
    // …inicializa de inmediato
    init();
  }
// Cierra y ejecuta la IIFE
})();
