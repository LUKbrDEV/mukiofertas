// Mini motor 3D "low poly" para os vídeos (Canvas 2D, faces chapadas, sem bibliotecas).
// Tem o mascote Muki montado em código, com poses animadas, e alguns objetos (pódio, caixa, moedas).
// Tudo é função do tempo t: o mesmo t sempre gera o mesmo quadro (o gerador tira foto quadro a quadro).
//
// Usado pelo template.html:  const m = LowPoly.criarMuki(); LowPoly.desenhar(ctx, cena, camera)
(function () {
  // ---------------- vetores e matrizes (4x4, linha a linha) ----------------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  function mul(a, b) {
    const r = new Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j] + a[i * 4 + 3] * b[12 + j];
    }
    return r;
  }
  const T = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
  const S = (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
  const RX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]; };
  const RY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]; };
  const RZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };
  const aplicar = (m, p) => [
    m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
    m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
    m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11],
  ];

  // ---------------- formas (malhas convexas) ----------------
  function malha(v, f, cor) {
    const c = v.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((x) => x / v.length);
    return { v, f, cor, centro: c };
  }
  function caixa(w, h, d, cor) {
    const x = w / 2, y = h / 2, z = d / 2;
    const v = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
    return malha(v, [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]], cor);
  }
  // esfera low poly (icosaedro subdividido uma vez = 80 faces)
  function bola(r, cor, detalhe = 1) {
    const t = (1 + Math.sqrt(5)) / 2;
    let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
    let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let k = 0; k < detalhe; k++) {
      const meio = {};
      const m = (a, b) => {
        const chave = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (meio[chave] == null) { meio[chave] = v.length; v.push(norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2])); }
        return meio[chave];
      };
      const nf = [];
      for (const [a, b, c] of f) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
      f = nf;
    }
    return malha(v.map((p) => [p[0] * r, p[1] * r, p[2] * r]), f, cor);
  }
  // cilindro/cone em pé (eixo Y), centrado
  function tubo(rCima, rBaixo, h, lados, cor) {
    const v = [];
    for (let i = 0; i < lados; i++) {
      const a = (i / lados) * Math.PI * 2;
      v.push([Math.cos(a) * rBaixo, -h / 2, Math.sin(a) * rBaixo]);
      v.push([Math.cos(a) * rCima, h / 2, Math.sin(a) * rCima]);
    }
    const f = [];
    for (let i = 0; i < lados; i++) {
      const j = (i + 1) % lados;
      if (rCima > 0.0001) f.push([i * 2, j * 2, j * 2 + 1, i * 2 + 1]);
      else f.push([i * 2, j * 2, i * 2 + 1]);
    }
    f.push(Array.from({ length: lados }, (_, i) => i * 2));
    if (rCima > 0.0001) f.push(Array.from({ length: lados }, (_, i) => i * 2 + 1));
    return malha(v, f, cor);
  }

  // ---------------- cena (nós com filhos) ----------------
  const no = (nome, malhaOuNada, opc = {}) => ({
    nome, malha: malhaOuNada || null, pos: opc.pos ?? [0, 0, 0], rot: opc.rot ?? [0, 0, 0], esc: opc.esc ?? [1, 1, 1], filhos: [], visivel: true,
    vies: opc.vies ?? 0, // puxa o desenho para a frente (detalhes colados no corpo: barriga, olhos, focinho)
  });
  const add = (pai, ...f) => { pai.filhos.push(...f); return pai; };

  function matrizDo(n) {
    return mul(mul(mul(mul(T(...n.pos), RY(n.rot[1])), RX(n.rot[0])), RZ(n.rot[2])), S(...n.esc));
  }

  // ---------------- desenho ----------------
  function corRGB(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const cacheCor = {};

  // camera: { pos:[x,y,z], alvo:[x,y,z], fov (graus), cx, cy }  luz: direção de onde vem a luz
  function desenhar(ctx, raiz, camera, { luz = [-0.5, 0.9, 0.7], ambiente = 0.48, sombras = [] } = {}) {
    const L = norm(luz);
    const frente = norm(sub(camera.alvo, camera.pos));
    const direita = norm(cross(frente, [0, 1, 0]));
    const cima = cross(direita, frente);
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const f = (H / 2) / Math.tan(((camera.fov ?? 40) * Math.PI) / 360);
    const cx = camera.cx ?? W / 2, cy = camera.cy ?? H / 2;
    const paraCamera = (p) => { const d = sub(p, camera.pos); return [dot(d, direita), dot(d, cima), dot(d, frente)]; };
    const projetar = (pc) => [cx + (pc[0] * f) / pc[2], cy - (pc[1] * f) / pc[2]];

    // sombras no chão (elipses), desenhadas antes de tudo
    for (const s of sombras) {
      const c = paraCamera(s.pos);
      if (c[2] <= 0.1) continue;
      const p = projetar(c);
      const rx = (s.r * f) / c[2];
      ctx.fillStyle = `rgba(0,0,0,${s.alfa ?? 0.28})`;
      ctx.beginPath(); ctx.ellipse(p[0], p[1], rx, rx * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    }

    const polys = [];
    (function percorrer(n, mPai, viesPai) {
      if (!n.visivel) return;
      const m = mul(mPai, matrizDo(n));
      // o "vies" só vale quando o detalhe está virado para a câmera (de lado, um olho não passa por cima da cabeça)
      let vies = viesPai;
      if (n.vies) {
        const origem = aplicar(m, [0, 0, 0]);
        const frenteNo = norm(sub(aplicar(m, [0, 0, 1]), origem));
        vies += n.vies * Math.max(0, dot(frenteNo, norm(sub(camera.pos, origem))));
      }
      if (n.malha) {
        const mm = n.malha;
        const vw = mm.v.map((p) => aplicar(m, p));
        const cw = aplicar(m, mm.centro);
        const rgb = cacheCor[mm.cor] ?? (cacheCor[mm.cor] = corRGB(mm.cor));
        for (const face of mm.f) {
          const a = vw[face[0]], b = vw[face[1]], c = vw[face[2]];
          let nrm = norm(cross(sub(b, a), sub(c, a)));
          const centroFace = face.reduce((s, i) => [s[0] + vw[i][0], s[1] + vw[i][1], s[2] + vw[i][2]], [0, 0, 0]).map((x) => x / face.length);
          if (dot(nrm, sub(centroFace, cw)) < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]]; // normal para fora
          if (dot(nrm, sub(camera.pos, centroFace)) <= 0) continue; // de costas para a câmera
          const pc = face.map((i) => paraCamera(vw[i]));
          if (pc.some((p) => p[2] <= 0.1)) continue;
          const luzFace = ambiente + (1 - ambiente) * Math.max(0, dot(nrm, L));
          const k = Math.min(1.15, luzFace);
          polys.push({
            z: pc.reduce((s, p) => s + p[2], 0) / pc.length - vies,
            pts: pc.map(projetar),
            cor: `rgb(${Math.min(255, rgb[0] * k) | 0},${Math.min(255, rgb[1] * k) | 0},${Math.min(255, rgb[2] * k) | 0})`,
          });
        }
      }
      for (const fl of n.filhos) percorrer(fl, m, vies);
    })(raiz, I(), 0);

    polys.sort((p, q) => q.z - p.z); // do mais longe para o mais perto
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.2;
    for (const p of polys) {
      ctx.beginPath();
      ctx.moveTo(p.pts[0][0], p.pts[0][1]);
      for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = p.cor; ctx.strokeStyle = p.cor;
      ctx.fill(); ctx.stroke();
    }
    return { projetar: (p) => projetar(paraCamera(p)) };
  }

  // ---------------- mascote Muki ----------------
  const COR = { azul: "#2f6fe0", azulEscuro: "#1d3f8f", branco: "#f2f5fb", laranja: "#ff6a1f", preto: "#1c2432", rosa: "#ff8fa3" };

  function criarMuki() {
    const raiz = no("muki", null);
    const quadril = no("quadril", null, { pos: [0, 1.0, 0] });
    add(raiz, quadril);

    // pernas (o pivô fica no quadril; a malha desce)
    const perna = (lado) => {
      const p = no(`perna${lado}`, null, { pos: [lado * 0.24, 0, 0] });
      add(p, no("coxa", tubo(0.15, 0.13, 0.62, 7, COR.azulEscuro), { pos: [0, -0.31, 0] }));
      add(p, no("pe", caixa(0.3, 0.16, 0.42, COR.branco), { pos: [0, -0.66, 0.08] }));
      return p;
    };
    const pE = perna(-1), pD = perna(1);
    add(quadril, pE, pD);

    const tronco = no("tronco", null, { pos: [0, 0.05, 0] });
    add(quadril, tronco);
    add(tronco, no("corpo", bola(1, COR.azul), { pos: [0, 0.42, 0], esc: [0.56, 0.62, 0.46] }));
    add(tronco, no("barriga", bola(1, COR.branco), { pos: [0, 0.36, 0.2], esc: [0.38, 0.45, 0.3], vies: 0.3 }));
    add(tronco, no("rabo", tubo(0, 0.2, 0.8, 6, COR.azulEscuro), { pos: [0, 0.2, -0.5], rot: [-1.9, 0, 0] }));

    // braços (pivô no ombro)
    const braco = (lado) => {
      const b = no(`braco${lado}`, null, { pos: [lado * 0.5, 0.78, 0], rot: [0, 0, lado * 0.18] });
      add(b, no("braco", tubo(0.11, 0.13, 0.56, 7, COR.azul), { pos: [0, -0.28, 0] }));
      add(b, no("mao", bola(0.14, COR.branco), { pos: [0, -0.6, 0] }));
      return b;
    };
    const bE = braco(-1), bD = braco(1);
    add(tronco, bE, bD);

    // cabeça (pivô no pescoço)
    const cabeca = no("cabeca", null, { pos: [0, 1.0, 0] });
    add(tronco, cabeca);
    add(cabeca, no("cranio", bola(0.52, COR.azul), { pos: [0, 0.38, 0], esc: [1, 0.9, 0.92] }));
    add(cabeca, no("mascara", bola(0.3, COR.azulEscuro), { pos: [0, 0.44, 0.24], esc: [1.35, 0.5, 0.7], vies: 0.12 }));
    add(cabeca, no("focinho", bola(0.3, COR.branco), { pos: [0, 0.24, 0.36], esc: [1.05, 0.72, 0.85], vies: 0.22 }));
    add(cabeca, no("nariz", bola(0.08, COR.preto), { pos: [0, 0.32, 0.6], vies: 0.4 }));
    const olho = (lado) => {
      const o = no(`olho${lado}`, null, { pos: [lado * 0.19, 0.47, 0.42], vies: 0.3 });
      add(o, no("branco", bola(0.12, COR.branco), { esc: [1, 1.15, 0.7] }));
      add(o, no("pupila", bola(0.065, COR.preto), { pos: [0, 0, 0.07], vies: 0.1 }));
      return o;
    };
    const oE = olho(-1), oD = olho(1);
    add(cabeca, oE, oD);
    const orelha = (lado) => {
      const o = no(`orelha${lado}`, null, { pos: [lado * 0.34, 0.76, -0.05], rot: [0, 0, -lado * 0.35] });
      add(o, no("orelha", tubo(0, 0.17, 0.34, 5, COR.azul), { pos: [0, 0.12, 0] }));
      add(o, no("dentro", tubo(0, 0.09, 0.2, 5, COR.rosa), { pos: [0, 0.08, 0.07], vies: 0.05 }));
      return o;
    };
    add(cabeca, orelha(-1), orelha(1));
    // boné laranja
    add(cabeca, no("bone", bola(0.5, COR.laranja), { pos: [0, 0.66, -0.02], esc: [1.04, 0.5, 1.02] }));
    add(cabeca, no("aba", caixa(0.66, 0.07, 0.46, COR.laranja), { pos: [0, 0.64, 0.5], rot: [0.12, 0, 0], vies: 0.15 }));
    add(cabeca, no("botao", bola(0.06, COR.laranja), { pos: [0, 0.92, 0] }));

    const partes = { raiz, quadril, tronco, cabeca, bE, bD, pE, pD, oE, oD };
    return partes;
  }

  // ---------------- poses (função do tempo) ----------------
  const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const suave = (p) => p * p * (3 - 2 * p);
  const saltinho = (t, alt, vel) => Math.abs(Math.sin(t * vel)) * alt;

  function posePadrao(m) {
    m.raiz.pos = [0, 0, 0]; m.raiz.rot = [0, 0, 0];
    m.quadril.pos = [0, 1.0, 0]; m.quadril.rot = [0, 0, 0];
    m.tronco.rot = [0, 0, 0];
    m.cabeca.rot = [0, 0, 0];
    m.bE.rot = [0, 0, -0.18]; m.bD.rot = [0, 0, 0.18];
    m.pE.rot = [0, 0, 0]; m.pD.rot = [0, 0, 0];
    m.oE.esc = [1, 1, 1]; m.oD.esc = [1, 1, 1];
  }
  // piscar de vez em quando
  function piscar(m, t) {
    const fase = (t % 2.7) / 2.7;
    const fechado = fase > 0.94 ? 0.12 : 1;
    m.oE.esc = [1, fechado, 1]; m.oD.esc = [1, fechado, 1];
  }

  const POSES = {
    parado(m, t) {
      m.quadril.pos[1] = 1.0 + 0.03 * Math.sin(t * 3);
      m.bE.rot[2] = -0.2 - 0.05 * Math.sin(t * 3); m.bD.rot[2] = 0.2 + 0.05 * Math.sin(t * 3);
      m.cabeca.rot[2] = 0.05 * Math.sin(t * 1.5);
    },
    acena(m, t) {
      POSES.parado(m, t);
      m.bD.rot[2] = 2.5 + 0.35 * Math.sin(t * 11);
      m.cabeca.rot[2] = -0.12;
      m.raiz.rot[1] = -0.15;
    },
    entra(m, t) {
      const p = lim(t / 1.1);
      m.raiz.pos[0] = -5.5 * (1 - suave(p));
      m.raiz.rot[1] = p < 1 ? 0.9 * (1 - p) : 0;
      const passo = Math.sin(t * 13) * (1 - p);
      m.pE.rot[0] = 0.6 * passo; m.pD.rot[0] = -0.6 * passo;
      m.bE.rot[0] = -0.5 * passo; m.bD.rot[0] = 0.5 * passo;
      m.quadril.pos[1] = 1.0 + Math.abs(passo) * 0.08;
      if (p >= 1) POSES.acena(m, t - 1.1);
    },
    comemora(m, t) {
      const pulo = saltinho(t, 0.55, 6);
      m.quadril.pos[1] = 1.0 + pulo;
      m.bE.rot[2] = -2.7 - 0.2 * Math.sin(t * 12); m.bD.rot[2] = 2.7 + 0.2 * Math.sin(t * 12);
      m.pE.rot[0] = -0.4 * (pulo / 0.55); m.pD.rot[0] = -0.4 * (pulo / 0.55);
      m.cabeca.rot[0] = -0.15; m.cabeca.rot[2] = 0.15 * Math.sin(t * 6);
    },
    susto(m, t) {
      const p = lim(t / 0.35);
      m.quadril.pos[1] = 1.0 + Math.sin(p * Math.PI) * 0.7;
      m.raiz.pos[2] = -0.4 * suave(p);
      const treme = Math.sin(t * 45) * 0.06 * (t > 0.35 ? 1 : 0);
      m.bE.rot[2] = -2.2 + treme; m.bD.rot[2] = 2.2 - treme;
      m.bE.rot[0] = -0.4; m.bD.rot[0] = -0.4;
      m.cabeca.rot[0] = -0.3; m.tronco.rot[0] = -0.12;
      const olhoGrande = 1 + 0.35 * suave(p);
      m.oE.esc = [olhoGrande, olhoGrande, 1]; m.oD.esc = [olhoGrande, olhoGrande, 1];
      m.raiz.pos[0] = treme * 2;
    },
    danca(m, t) {
      const b = Math.sin(t * 7);
      m.quadril.pos = [0.18 * b, 1.0 + 0.08 * Math.abs(Math.cos(t * 7)), 0];
      m.raiz.rot[1] = 0.35 * Math.sin(t * 3.5);
      m.tronco.rot[2] = -0.12 * b;
      m.bE.rot[2] = -1.2 - 1.0 * Math.max(0, b); m.bD.rot[2] = 1.2 + 1.0 * Math.max(0, -b);
      m.bE.rot[0] = -0.5 * b; m.bD.rot[0] = 0.5 * b;
      m.pE.rot[2] = 0.15 * b; m.pD.rot[2] = 0.15 * b;
      m.cabeca.rot[2] = 0.18 * b;
    },
    apresenta(m, t) {
      POSES.parado(m, t);
      m.raiz.rot[1] = -0.35;
      m.bD.rot[2] = 1.25 + 0.06 * Math.sin(t * 4); m.bD.rot[0] = -0.5;
      m.bE.rot[2] = -0.5;
      m.cabeca.rot[1] = 0.3; m.cabeca.rot[0] = -0.1;
    },
    aponta_cima(m, t) {
      m.quadril.pos[1] = 1.0 + saltinho(t, 0.12, 5);
      m.bD.rot[2] = 2.95; m.bD.rot[0] = -0.2;
      m.bE.rot[2] = -0.9; m.bE.rot[0] = 0.6;
      m.cabeca.rot[0] = -0.25; m.cabeca.rot[2] = 0.08 * Math.sin(t * 5);
    },
  };

  function posar(m, pose, t) {
    posePadrao(m);
    (POSES[pose] ?? POSES.parado)(m, t);
    if (pose !== "susto") piscar(m, t);
  }

  // ---------------- objetos ----------------
  function podio(cor = "#ff5a1f") {
    const p = no("podio", null, { pos: [0, 0, 0] });
    add(p, no("base", tubo(1.25, 1.35, 0.32, 8, "#26365f"), { pos: [0, -0.16, 0] })); // escuro: a legenda branca passa por cima
    add(p, no("faixa", tubo(1.36, 1.38, 0.1, 8, cor), { pos: [0, -0.24, 0] }));
    return p;
  }
  function presente(cor = "#ff5a1f") {
    const g = no("presente", null);
    add(g, no("caixa", caixa(0.8, 0.7, 0.8, cor)));
    add(g, no("fita1", caixa(0.84, 0.72, 0.16, "#ffffff")));
    add(g, no("fita2", caixa(0.16, 0.72, 0.84, "#ffffff")));
    add(g, no("tampa", caixa(0.9, 0.16, 0.9, cor), { pos: [0, 0.4, 0] }));
    add(g, no("laco", bola(0.16, "#ffffff"), { pos: [0, 0.55, 0], esc: [1.6, 0.8, 1] }));
    return g;
  }
  // moedas caindo (posições fixas por semente)
  function chuvaDeMoedas(n = 26, semente = 11) {
    let s = semente;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const grupo = no("moedas", null);
    const dados = [];
    for (let i = 0; i < n; i++) {
      const moeda = no(`m${i}`, tubo(0.2, 0.2, 0.05, 10, "#ffc533"));
      dados.push({ moeda, x: (rnd() - 0.5) * 5.5, z: (rnd() - 0.5) * 2 - 0.5, atraso: rnd() * 1.2, vel: 3 + rnd() * 2, giro: rnd() * 6 });
      add(grupo, moeda);
    }
    grupo.animar = (t) => {
      for (const d of dados) {
        const tt = t - d.atraso;
        d.moeda.visivel = tt > 0;
        const y = 6.5 - tt * d.vel;
        d.moeda.pos = [d.x, Math.max(-0.2, y), d.z];
        d.moeda.rot = [1.2 + tt * d.giro, tt * 2, 0];
        if (y < -0.2) d.moeda.visivel = false;
      }
    };
    return grupo;
  }

  window.LowPoly = { criarMuki, posar, desenhar, podio, presente, chuvaDeMoedas, no, add, caixa, bola, tubo, POSES: Object.keys(POSES) };
})();
