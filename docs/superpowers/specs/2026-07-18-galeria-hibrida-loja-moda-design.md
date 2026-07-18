# Galeria Híbrida — Loja Funcional de Moda

Data: 18/07/2026

## Objetivo

Evoluir a galeria da Propagação Digital para uma vitrine híbrida: a página central apresenta os modelos e cada cartão abre uma demonstração funcional independente. A primeira demonstração será uma loja de moda e calçados navegável, convincente e preparada para mostrar a futuros clientes como uma loja real pode funcionar.

## Arquitetura aprovada

- A galeria central permanece em `/galeria-modelos`.
- Cada modelo funcional possui endereço próprio e pode ser publicado como projeto independente.
- O cartão da galeria exibe imagem, segmento, principais recursos e o botão `Ver demo funcionando`.
- A primeira demo usa a rota local `/modelos/loja-moda/` durante o desenvolvimento e poderá receber uma URL pública independente na publicação.
- O Hélio Virtual só recebe a URL depois que a demonstração estiver publicada e verificada.

## Escopo da primeira demonstração

### Identidade fictícia

- Nome: `Lume Moda`.
- Posicionamento: moda feminina contemporânea, acessível e visualmente elegante.
- Aviso visível: demonstração criada pela Propagação Digital; produtos, preços e marca são fictícios.

### Experiência funcional

- Home com cabeçalho, busca, categorias, vitrine, benefícios e rodapé.
- Categorias: novidades, vestidos, conjuntos, calçados e acessórios.
- Busca por nome, categoria e descrição.
- Filtro por categoria.
- Catálogo com pelo menos oito produtos fictícios.
- Página ou painel de detalhes do produto com imagem, descrição, preço, tamanhos e cores.
- Carrinho demonstrativo com adicionar, alterar quantidade, remover e total.
- Persistência do carrinho em `localStorage`.
- Finalização por WhatsApp com resumo dos itens; nenhum pagamento real será processado.
- Botão claro para voltar à galeria da Propagação Digital.

## Conteúdo visual

- Reutilizar apenas imagens já pertencentes ao projeto ou imagens com origem e uso documentados.
- Não copiar vitrines de concorrentes nem apresentar capturas externas como trabalho próprio.
- O visual deve parecer uma loja real: fotografia de produto, preço, variações, navegação, benefícios, compra e atendimento.
- A versão móvel deve priorizar catálogo legível, carrinho acessível e botões sem sobreposição.

## Componentes e responsabilidades

- `modelos/loja-moda/index.html`: estrutura semântica e conteúdo da demo.
- `modelos/loja-moda/styles.css`: identidade visual responsiva exclusiva da loja.
- `modelos/loja-moda/app.js`: catálogo, busca, filtro, detalhes, carrinho e WhatsApp.
- `modelos/loja-moda/catalogo.js`: dados estáticos dos produtos fictícios.
- `galeria-modelos.html`: cartão e link para a demonstração funcional.
- `tests/loja-moda-funcional.test.js`: contrato estrutural e recursos obrigatórios.
- `tests/galeria-modelos.test.js`: confirmação de que a galeria abre a demo.

## Fluxo do visitante

1. O visitante abre a galeria central.
2. Seleciona `Moda e calçados` e toca em `Ver demo funcionando`.
3. Navega pelas categorias ou pesquisa um produto.
4. Abre detalhes, escolhe tamanho e cor e adiciona ao carrinho.
5. Revisa itens e quantidades.
6. Toca em `Finalizar pelo WhatsApp`.
7. O navegador abre o WhatsApp da Propagação Digital com uma mensagem identificando que o pedido veio da demonstração.

## Segurança e limites

- Não coletar senha, cartão, documento ou dado confidencial.
- Não usar checkout ou pagamento real.
- Não instalar biblioteca ou serviço externo para a primeira versão.
- Não expor chaves ou segredos no JavaScript do navegador.
- Não prometer estoque, entrega ou preço real.

## Acessibilidade e responsividade

- Imagens com texto alternativo.
- Botões com nomes compreensíveis.
- Navegação por teclado para busca, filtros, produto e carrinho.
- Contraste legível e foco visível.
- Sem rolagem horizontal em 390 px.
- Layout funcional em telas de 390 px, 768 px e 1280 px.

## Tratamento de erros

- Busca sem resultados exibe mensagem e botão para limpar o filtro.
- Produto inexistente não abre painel vazio.
- Carrinho vazio desabilita a finalização e explica como adicionar produtos.
- Falha de `localStorage` mantém o carrinho durante a sessão sem interromper a navegação.
- Link de WhatsApp só é criado com itens válidos do catálogo.

## Verificação de aceite

- Testes estruturais e comportamentais aprovados.
- Busca, filtro, detalhes, carrinho, quantidade, remoção e WhatsApp testados no navegador.
- Imagens carregadas sem erro.
- Nenhum erro no console.
- Sem estouro lateral no celular.
- A galeria central abre a demo e a demo oferece retorno à galeria.
- A URL pública responde com HTTP 200 antes de ser cadastrada no Hélio Virtual.

## Fora do escopo desta primeira demonstração

- Login de cliente.
- Banco de dados.
- Estoque real.
- Pagamento real.
- Frete calculado por CEP.
- Painel administrativo.
- Integração imediata com Botpress antes da publicação.
