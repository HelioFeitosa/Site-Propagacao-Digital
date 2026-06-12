# 🌐 Propagação Digital — Site Portfólio Bilíngue

Site institucional da **Propagação Digital — Web Designer Studio**, construído do zero, dark theme com identidade neon verde/amarelo, bilíngue (PT/EN), mobile-first, com botão flutuante de WhatsApp e cases reais.

---

## 📂 Estrutura dos arquivos

```
propagacao-digital/
├── index.html      # Página principal (HTML semântico)
├── styles.css      # Estilos (dark theme + neon)
├── script.js       # Scripts (bilíngue, animações, mobile)
└── README.md       # Este arquivo
```

**Não precisa de build.** É puro HTML + CSS + JS. Funciona em qualquer servidor estático.

---

## ✨ O que tem no site

- ✅ **Hero impactante** com 3 frases rotativas
- ✅ **Sobre** com missão/visão/valores
- ✅ **8 serviços** (sites, lojas, tráfego, SEO, IA, chatbots, landing pages, artes)
- ✅ **3 cases reais** (Big Blog Brasil, SND Agendamento, Multi-Shop Hub)
- ✅ **Processo** em 4 passos (Briefing → Orçamento → Execução → Entrega)
- ✅ **4 diferenciais** competitivos
- ✅ **FAQ** com 6 perguntas comuns
- ✅ **CTA final** com WhatsApp + email + horário
- ✅ **Footer** completo
- ✅ **Botão WhatsApp flutuante** (sempre visível, com mensagem pré-pronta)
- ✅ **Bilíngue PT/EN** (seletor no topo, traduz tudo)
- ✅ **100% responsivo** (mobile, tablet, desktop)
- ✅ **Animações sutis** (reveal on scroll)
- ✅ **SEO básico** (meta description, OG tags, lang)

---

## 🚀 Como colocar no ar (3 opções grátis)

### Opção 1: **Vercel** (RECOMENDADO — mais fácil) ⭐

1. Acesse: https://vercel.com
2. Faça login com GitHub (ou crie conta)
3. Clique em **"Add New → Project"**
4. Suba esta pasta (arraste e solte)
5. Deploy automático em ~30 segundos
6. Pronto! Você recebe uma URL tipo: `propagacao-digital.vercel.app`

**Domínio grátis:** `seu-projeto.vercel.app`
**Domínio custom (seu .com.br):** pode conectar depois (Configurações → Domains)

---

### Opção 2: **Netlify**

1. Acesse: https://netlify.com
2. Faça login
3. Arraste a pasta `propagacao-digital/` direto pra área de drop
4. Pronto! URL tipo: `propagacao-digital.netlify.app`

---

### Opção 3: **GitHub Pages**

1. Crie um repositório no GitHub: `propagacao-digital`
2. Suba estes 3 arquivos (`index.html`, `styles.css`, `script.js`) na raiz
3. Vá em **Settings → Pages**
4. Em "Source" escolha: **main / root**
5. Pronto! URL: `seu-usuario.github.io/propagacao-digital`

---

## 🌐 Como conectar um domínio próprio (.com.br)

Depois de subir em qualquer plataforma acima:

1. **Compre o domínio** (Registro.br, Namecheap, GoDaddy, etc.)
   - Sugestão: `propagacaodigital.com.br`
2. **Na plataforma de hospedagem** (Vercel/Netlify):
   - Vá em "Domains" ou "Custom Domain"
   - Adicione o domínio
   - Copie os DNS records que aparecem
3. **No painel do domínio:**
   - Cole os DNS records onde comprou
   - Espere 5-30 minutos pra propagar
4. **Pronto!** Seu site tá no `www.propagacaodigital.com.br`

---

## ✏️ Como editar o conteúdo

### Mudar textos (tudo bilíngue)

Abra o `index.html` no editor. Cada texto tem:
```html
data-pt="Texto em português"
data-en="Text in English"
```

Mude os dois. O JS cuida de trocar quando o usuário clica na bandeira.

### Mudar cores (tema neon)

Abra o `styles.css` e procure o `:root`:
```css
--color-accent: #00ff88;      /* verde neon principal */
--color-accent-2: #a3ff00;    /* verde-limão */
--color-accent-3: #ffe600;    /* amarelo neon */
```

Mude pra qualquer cor. O site inteiro se adapta.

### Mudar número do WhatsApp

Procure no `index.html` por `5591987137397` e troque pelo seu número no formato:
- `55` (Brasil) + DDD (91) + número (987137397)
- Exemplo: `55` + `11` + `999999999` = `5511999999999`

São **3 lugares** pra trocar:
1. Botão "Falar agora no WhatsApp" no CTA
2. Botão "Pedir orçamento" no hero
3. Botão WhatsApp flutuante (rodapé da página)

### Adicionar/Editar cases

No `index.html`, procure a seção `<!-- ===== CASES ===== -->` e copie o bloco `<article class="case-card">...</article>` pra cada novo case.

### Adicionar/Editar serviços

Na seção `<!-- ===== SERVIÇOS ===== -->`, copie o bloco `<article class="service-card">...</article>`.

---

## 📱 Testar localmente (antes de subir)

### Jeito 1: abrir direto
Clique duas vezes em `index.html` — abre no navegador. Funciona.

### Jeito 2: servidor local (recomendado)
No terminal, dentro da pasta:
```bash
# Se tem Python 3:
python3 -m http.server 8000

# Se tem Node.js:
npx serve
```
Abra: `http://localhost:8000`

---

## 🆘 Problemas comuns

| Problema | Solução |
|---|---|
| Site em branco | Verifique se os 3 arquivos estão na mesma pasta |
| Imagens não aparecem | Veja se está usando caminhos relativos (`images/foto.jpg` e não `C:\...`) |
| WhatsApp não abre | Verifique formato: `55` + DDD + número, sem espaços |
| Site em inglês mesmo selecionando PT | Limpe o cache do navegador (Ctrl+Shift+R) |
| Quer mudar pra `.com.br` | Veja seção "Como conectar um domínio próprio" acima |

---

## 🎯 Próximos passos (sugestões)

1. ✅ Suba no ar pelo Vercel/Netlify
2. ✅ Conecte um domínio `.com.br`
3. ✅ Crie versão bilíngue do **pacote de preços**
4. ✅ Adicione mais cases (depois de pegar os primeiros clientes)
5. ✅ Configure Google Analytics pra ver acessos
6. ✅ Crie um blog (opcional, pra SEO)

---

## 💚 Feito com IA + ☕ no Pará

Site construído com assistência de IA, mantendo a identidade visual da **Propagação Digital**.

© 2026 Propagação Digital — Hélio Feitosa. Todos os direitos reservados.
