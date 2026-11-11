"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Distância de 1 card (largura do card + espaço entre eles)
function passoDoCard(el) {
  const filhos = el.children;
  if (filhos.length > 1) return filhos[1].offsetLeft - filhos[0].offsetLeft;
  return el.clientWidth;
}

// auto = tempo, em milissegundos, para passar sozinho de um card para o próximo
// (deixe sem o "auto" para não passar sozinho)
export default function Carrossel({ children, auto = 0 }) {
  const trilho = useRef(null);
  const pausado = useRef(false);
  const ultimaAcao = useRef(0);
  const [podeVoltar, setPodeVoltar] = useState(false);
  const [podeAvancar, setPodeAvancar] = useState(false);

  const atualizar = useCallback(() => {
    const el = trilho.current;
    if (!el) return;
    setPodeVoltar(el.scrollLeft > 4);
    setPodeAvancar(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    el.addEventListener("scroll", atualizar, { passive: true });
    const observador = new ResizeObserver(atualizar);
    observador.observe(el);
    return () => {
      el.removeEventListener("scroll", atualizar);
      observador.disconnect();
    };
  }, [atualizar]);

  // Copia o tamanho e o espaçamento dos cards da lista "Todas as promoções"
  useEffect(() => {
    const el = trilho.current;
    if (!el) return;

    function medir() {
      const grade = document.querySelector(".grade-cartoes");
      const cartao = document.querySelector(".grade-cartoes .cartao, .grade-cartoes .cf");
      if (!grade || !cartao) return;

      const largura = cartao.getBoundingClientRect().width;
      if (largura > 100) el.style.setProperty("--largura-card", `${largura}px`);

      const espaco = parseFloat(getComputedStyle(grade).columnGap);
      if (!Number.isNaN(espaco)) el.style.setProperty("--espaco-card", `${espaco}px`);
    }

    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  // Confere as setas depois de cada atualização da tela
  useEffect(() => {
    atualizar();
  });

  // Passagem automática
  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      const el = trilho.current;
      if (!el || pausado.current || document.hidden) return;
      if (Date.now() - ultimaAcao.current < auto) return; // a pessoa acabou de mexer

      const noFim = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (noFim) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: passoDoCard(el), behavior: "smooth" });
    }, auto);

    return () => clearInterval(id);
  }, [auto]);

  function rolar(direcao) {
    const el = trilho.current;
    if (!el) return;
    ultimaAcao.current = Date.now();
    el.scrollBy({ left: direcao * passoDoCard(el), behavior: "smooth" });
  }

  return (
    <div
      className="carrossel"
      onMouseEnter={() => (pausado.current = true)}
      onMouseLeave={() => (pausado.current = false)}
      onFocus={() => (pausado.current = true)}
      onBlur={() => (pausado.current = false)}
      onTouchStart={() => (ultimaAcao.current = Date.now())}
    >
      {podeVoltar && (
        <button
          type="button"
          className="carrossel-seta carrossel-seta--esq"
          aria-label="Ver o anterior"
          onClick={() => rolar(-1)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M9 5l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <div className="carrossel-trilho" ref={trilho}>
        {children}
      </div>

      {podeAvancar && (
        <button
          type="button"
          className="carrossel-seta carrossel-seta--dir"
          aria-label="Ver o próximo"
          onClick={() => rolar(1)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M9 5l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}