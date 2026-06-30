# 🌆 Ecocity · Energia em Jogo

Jogo de tabuleiro digital para **até 4 jogadores** no mesmo dispositivo, baseado no
trabalho de ICT 2026 *"Ecocity – Energia em Jogo"*. É uma corrida por uma
cidade sustentável: escolhas limpas fazem avançar, a poluição atrasa. Vence quem
chegar primeiro ao **FIM**.

## ▶ Como jogar

1. Abra o jogo no navegador.
2. Escolha de 2 a 4 jogadores e digite os nomes.
3. Na sua vez, **gire o dado** (1 a 6) e ande as casas.
4. Cumpra a ação da casa onde parou: avançar, voltar, jogar de novo, ficar 1 rodada
   parado ou puxar uma carta de **Sorte ou Revés**.
5. Na **casa 6** escolha energia limpa (segura) ou poluente (arriscada).
6. Parou na **casa 22**? Escolha o **Caminho Verde** ou o **Atalho da Fumaça**
   — curto, porém perigoso!
7. O efeito da casa só vale quando você chega nela **pelo dado**.
8. Vence quem alcançar ou ultrapassar primeiro o **FIM**.

## 🧩 Conteúdo do jogo

- 34 casas na borda (INÍCIO, 32 ações e FIM) divididas em Energia, Transporte,
  Meio Ambiente, Economia e Sorte ou Revés.
- Atalho da Fumaça com 5 casas especiais (A1 a A5).
- 12 cartas (6 de Sorte e 6 de Revés).
- Dado de 6 faces e peões coloridos.

## 🚀 Hospedar no Vercel

O projeto é 100% estático (HTML + CSS + JS, sem build).

**Pelo site da Vercel:**
1. Faça o push deste repositório para o GitHub.
2. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe o repo.
3. Framework Preset: **Other** (sem build). Clique em **Deploy**.

**Pela CLI:**
```bash
npm i -g vercel
vercel        # preview
vercel --prod # produção
```

## 🗂 Estrutura

```
index.html   → telas (início, jogo, modais, vitória)
style.css    → estilos e layout do tabuleiro
game.js      → regras, casas, cartas e fluxo de turnos
vercel.json  → configuração de deploy estático
```

Baseado nos ODS 7 (Energia Limpa) e 11 (Cidades Sustentáveis).
