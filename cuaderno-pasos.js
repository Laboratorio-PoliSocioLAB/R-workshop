(() => {
  function iniciarCuadernoPasos() {
    const main = document.querySelector("main.content");
    if (!main) return;

    const sections = Array.from(main.querySelectorAll(":scope > section.level2"));
    if (sections.length === 0) return;

    const intro = document.getElementById("intro-cuaderno");
    const mobileToc = main.querySelector(".indice-cuaderno-movil");
    const pasos = intro ? [intro, ...sections] : sections;
    const soportaUntilFound = "onbeforematch" in HTMLElement.prototype;

    if (intro && !intro.hasAttribute("tabindex")) {
      intro.setAttribute("tabindex", "-1");
    }

    function extraerHash(enlace) {
      if (!enlace) return "";
      if (enlace.hash) {
        try {
          return decodeURIComponent(enlace.hash.replace(/^#/, ""));
        } catch {
          return enlace.hash.replace(/^#/, "");
        }
      }
      const href = enlace.getAttribute("href") || "";
      if (!href.includes("#")) return "";
      const raw = href.split("#")[1];
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }

    function ocultarPaso(sec, ocultar) {
      if (!ocultar) {
        sec.hidden = false;
        sec.removeAttribute("hidden");
        return;
      }
      if (soportaUntilFound) {
        sec.setAttribute("hidden", "until-found");
      } else {
        sec.hidden = true;
      }
    }

    function crearBotonPaso(claseExtra, direccionTexto, tituloTexto, onClick) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `boton-paso ${claseExtra}`;

      const dir = document.createElement("span");
      dir.className = "boton-paso-direccion";
      dir.textContent = direccionTexto;

      const tit = document.createElement("span");
      tit.className = "boton-paso-titulo";
      tit.textContent = tituloTexto;

      btn.append(dir, tit);
      btn.addEventListener("click", onClick);
      return btn;
    }

    function crearHuecoBoton() {
      const hueco = document.createElement("div");
      hueco.className = "boton-paso-hueco";
      hueco.setAttribute("aria-hidden", "true");
      return hueco;
    }

    // Asegurar que las listas del TOC no queden ocultas por la clase collapse de Bootstrap
    document.querySelectorAll("#TOC ul").forEach((ul) => {
      ul.classList.remove("collapse");
      ul.classList.add("show");
    });

    // Desactivar el scrollspy nativo de Quarto para que no interfiera ni desmarque
    // el apartado activo al quedar ocultos los demás pasos.
    const navToc = document.getElementById("TOC");
    if (navToc) {
      navToc.classList.remove("toc-active");
    }
    document.querySelectorAll("#TOC a").forEach((a) => {
      a.removeAttribute("data-scroll-target");
    });

    // Añadir "Presentación" al inicio del índice lateral de Quarto si existe #intro-cuaderno
    const tocUl = document.querySelector("#TOC > ul");
    if (intro && tocUl && !tocUl.querySelector('a[href="#intro-cuaderno"]')) {
      const liIntro = document.createElement("li");
      const aIntro = document.createElement("a");
      aIntro.href = "#intro-cuaderno";
      aIntro.id = "toc-intro-cuaderno";
      aIntro.className = "nav-link";
      aIntro.textContent = "Presentación";
      liIntro.appendChild(aIntro);
      tocUl.prepend(liIntro);
    }

    let modoCompleto = false;
    let pasoActual = 0;

    const titulos = pasos.map((sec, idx) => {
      if (sec === intro) return "Presentación";
      const h2 = sec.querySelector("h2");
      if (h2 && !h2.hasAttribute("tabindex")) {
        h2.setAttribute("tabindex", "-1");
      }
      return h2 ? h2.textContent.trim() : `Apartado ${idx}`;
    });

    // Navegación inferior en cada apartado
    const navsInferiores = pasos.map((sec, idx) => {
      const nav = document.createElement("nav");
      nav.className = "navegacion-pasos-cuaderno";
      nav.setAttribute("aria-label", `Navegación de ${titulos[idx]}`);

      const filaBotones = document.createElement("div");
      filaBotones.className = "navegacion-pasos-fila";

      if (idx > 0) {
        filaBotones.appendChild(
          crearBotonPaso("boton-paso-anterior", "← Anterior", titulos[idx - 1], () => {
            irAPaso(idx - 1, { scrollTop: true, focusHeading: true, actualizarHash: true });
          })
        );
      } else {
        filaBotones.appendChild(crearHuecoBoton());
      }

      if (idx < pasos.length - 1) {
        filaBotones.appendChild(
          crearBotonPaso("boton-paso-siguiente", "Siguiente →", titulos[idx + 1], () => {
            irAPaso(idx + 1, { scrollTop: true, focusHeading: true, actualizarHash: true });
          })
        );
      } else {
        filaBotones.appendChild(crearHuecoBoton());
      }

      const pieModo = document.createElement("div");
      pieModo.className = "navegacion-pasos-modo";
      const btnVerTodo = document.createElement("button");
      btnVerTodo.type = "button";
      btnVerTodo.className = "enlace-modo-completo";
      btnVerTodo.textContent = "Mostrar todo el cuaderno seguido";
      btnVerTodo.addEventListener("click", () => {
        cambiarModo(true);
      });
      pieModo.appendChild(btnVerTodo);

      nav.append(filaBotones, pieModo);
      sec.appendChild(nav);
      return nav;
    });

    // Enlace discreto al final cuando se muestra todo seguido
    const pieVolverPasos = document.createElement("div");
    pieVolverPasos.className = "navegacion-pasos-modo";
    const btnVolverPasos = document.createElement("button");
    btnVolverPasos.type = "button";
    btnVolverPasos.className = "enlace-modo-completo";
    btnVolverPasos.textContent = "Volver a mostrar por apartados";
    btnVolverPasos.addEventListener("click", () => {
      cambiarModo(false);
    });
    pieVolverPasos.appendChild(btnVolverPasos);
    main.appendChild(pieVolverPasos);

    let sincronizando = false;
    function sincronizarToc(idActivo) {
      if (!idActivo || sincronizando) return;
      sincronizando = true;
      const cleanId = idActivo.replace(/^#/, "");

      const tocLinks = document.querySelectorAll("#TOC a");
      tocLinks.forEach((a) => {
        const targetId = extraerHash(a);
        const coincide = targetId === cleanId;
        if (coincide) {
          a.classList.add("active", "toc-activo");
          a.setAttribute("aria-current", "true");
        } else {
          a.classList.remove("active", "toc-activo");
          a.removeAttribute("aria-current");
        }
      });

      if (mobileToc) {
        const mobileLinks = mobileToc.querySelectorAll("a");
        mobileLinks.forEach((a) => {
          const targetId = extraerHash(a);
          const coincide = targetId === cleanId;
          a.classList.toggle("active", coincide);
          a.classList.toggle("toc-activo", coincide);
        });
      }
      sincronizando = false;
    }

    function obtenerPasoVisibleId() {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50) {
        return pasos[pasos.length - 1].id;
      }
      const scrollPos = window.scrollY + 140;
      let pasoVisible = 0;
      for (let i = 0; i < pasos.length; i++) {
        if (pasos[i].offsetTop <= scrollPos) {
          pasoVisible = i;
        }
      }
      return pasos[pasoVisible]?.id || pasos[0].id;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (modoCompleto) {
          sincronizarToc(obtenerPasoVisibleId());
        } else {
          sincronizarToc(pasos[pasoActual].id);
        }
      },
      { passive: true }
    );

    const tocContainer = document.getElementById("TOC");
    if (tocContainer) {
      const observer = new MutationObserver(() => {
        if (sincronizando) return;
        const idEsperado = modoCompleto ? obtenerPasoVisibleId() : pasos[pasoActual]?.id;
        if (!idEsperado) return;
        const activeLinks = tocContainer.querySelectorAll("a.active, a.toc-activo");
        const cleanEsperado = idEsperado.replace(/^#/, "");
        let desajustado = false;
        if (activeLinks.length !== 1) {
          desajustado = true;
        } else if (extraerHash(activeLinks[0]) !== cleanEsperado) {
          desajustado = true;
        }
        if (desajustado) {
          sincronizarToc(idEsperado);
        }
      });
      observer.observe(tocContainer, { attributes: true, subtree: true, attributeFilter: ["class"] });
    }

    function actualizarVista() {
      if (modoCompleto) {
        pasos.forEach((sec) => ocultarPaso(sec, false));
        navsInferiores.forEach((nav) => {
          nav.hidden = true;
        });
        pieVolverPasos.hidden = false;
        sincronizarToc(obtenerPasoVisibleId());
      } else {
        pasos.forEach((sec, idx) => ocultarPaso(sec, idx !== pasoActual));
        navsInferiores.forEach((nav, idx) => {
          nav.hidden = idx !== pasoActual;
        });
        pieVolverPasos.hidden = true;
        sincronizarToc(pasos[pasoActual].id);
      }
    }

    function irAPaso(indice, opciones = {}) {
      const idx = Math.max(0, Math.min(pasos.length - 1, indice));
      pasoActual = idx;
      actualizarVista();

      const sec = pasos[idx];
      if (opciones.actualizarHash && sec.id) {
        const nuevoHash = sec === intro ? window.location.pathname : `#${sec.id}`;
        history.replaceState(null, "", nuevoHash);
      }
      if (opciones.scrollTop) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
      if (opciones.focusHeading) {
        const targetFocus = sec === intro ? intro : sec.querySelector("h2");
        if (targetFocus) targetFocus.focus({ preventScroll: true });
      }
    }

    function cambiarModo(nuevoModoCompleto) {
      modoCompleto = nuevoModoCompleto;
      actualizarVista();
    }

    function indiceDeHash(hash) {
      if (!hash || hash === "#") return -1;
      let id;
      try {
        id = decodeURIComponent(hash.slice(1));
      } catch {
        id = hash.slice(1);
      }
      const destino = document.getElementById(id);
      return destino ? pasos.findIndex((sec) => sec.contains(destino)) : -1;
    }

    // Revelar el apartado correspondiente si el navegador encuentra texto oculto con Ctrl+F / Cmd+F
    if (soportaUntilFound) {
      main.addEventListener("beforematch", (e) => {
        if (modoCompleto) return;
        const idx = pasos.findIndex((sec) => sec === e.target || sec.contains(e.target));
        if (idx === -1) return;
        pasoActual = idx;
        actualizarVista();
        const sec = pasos[idx];
        if (sec.id) {
          const nuevoHash = sec === intro ? window.location.pathname : `#${sec.id}`;
          history.replaceState(null, "", nuevoHash);
        }
      });
    }

    // Interceptar clics en el índice (TOC Quarto y móvil) y enlaces internos de la misma página
    document.addEventListener("click", (e) => {
      const link = e.target.closest('#TOC a, .indice-cuaderno-movil a, a.tour-rstudio-marca, a[href*="#"]');
      if (!link) return;

      const hrefAttr = link.getAttribute("href") || "";
      if (hrefAttr && !hrefAttr.startsWith("#")) {
        try {
          const urlDestino = new URL(link.href, window.location.href);
          if (urlDestino.origin !== window.location.origin || urlDestino.pathname !== window.location.pathname) {
            return;
          }
        } catch {
          return;
        }
      }

      const id = extraerHash(link);
      if (!id) return;

      const destino = document.getElementById(id);
      const idx = destino ? pasos.findIndex((sec) => sec.id === id || sec.contains(destino)) : -1;
      if (idx === -1) return;

      e.preventDefault();

      if (modoCompleto) {
        if (destino) {
          destino.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        sincronizarToc(pasos[idx].id);
        const nuevoHash = pasos[idx] === intro ? window.location.pathname : `#${id}`;
        history.replaceState(null, "", nuevoHash);
      } else {
        pasoActual = idx;
        actualizarVista();
        const nuevoHash = pasos[idx] === intro ? window.location.pathname : `#${pasos[idx].id}`;
        history.replaceState(null, "", nuevoHash);
        if (destino && destino !== pasos[idx]) {
          destino.scrollIntoView({ behavior: "instant", block: "start" });
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
      }

      if (mobileToc && mobileToc.open && mobileToc.contains(link)) {
        mobileToc.open = false;
      }
    });

    window.addEventListener("hashchange", () => {
      const idx = indiceDeHash(window.location.hash);
      if (idx !== -1 && !modoCompleto) {
        pasoActual = idx;
        actualizarVista();
        let id;
        try {
          id = decodeURIComponent(window.location.hash.slice(1));
        } catch {
          id = window.location.hash.slice(1);
        }
        const destino = document.getElementById(id);
        if (destino && destino !== pasos[idx]) {
          destino.scrollIntoView({ behavior: "instant", block: "start" });
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
      }
    });

    const idxInicial = indiceDeHash(window.location.hash);
    if (idxInicial !== -1) {
      pasoActual = idxInicial;
    }
    actualizarVista();
    if (idxInicial !== -1) {
      let id;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        id = window.location.hash.slice(1);
      }
      const destino = document.getElementById(id);
      if (destino && destino !== pasos[idxInicial]) {
        destino.scrollIntoView({ behavior: "instant", block: "start" });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarCuadernoPasos);
  } else {
    iniciarCuadernoPasos();
  }
})();
