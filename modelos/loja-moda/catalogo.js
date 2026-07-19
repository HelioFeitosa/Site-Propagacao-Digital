(function exposeCatalog() {
  const sheet = 'assets/lume-products-sheet.png';

  const products = [
    { id: 'vestido-coral-midi', name: 'Vestido Coral Midi', category: 'vestidos', description: 'Vestido midi leve com cintura marcada e caimento fluido.', price: 189.9, image: sheet, imageIndex: 0, sizes: ['P', 'M', 'G'], colors: ['Coral', 'Preto'], featured: true },
    { id: 'macacao-essencial-preto', name: 'Macacão Essencial Preto', category: 'conjuntos', description: 'Macacão de alfaiataria versátil para produções elegantes.', price: 229.9, image: sheet, imageIndex: 1, sizes: ['P', 'M', 'G', 'GG'], colors: ['Preto'], featured: true },
    { id: 'conjunto-tricot-areia', name: 'Conjunto Tricot Areia', category: 'conjuntos', description: 'Conjunto confortável em tricot macio para dias leves.', price: 249.9, image: sheet, imageIndex: 2, sizes: ['P', 'M', 'G'], colors: ['Areia', 'Off-white'], featured: true },
    { id: 'blazer-aurora-rosa', name: 'Blazer Aurora Rosa', category: 'novidades', description: 'Blazer estruturado com corte contemporâneo e toque de cor.', price: 269.9, image: sheet, imageIndex: 3, sizes: ['P', 'M', 'G'], colors: ['Rosa', 'Preto'], featured: true },
    { id: 'tenis-nuvem-branco', name: 'Tênis Nuvem Branco', category: 'calcados', description: 'Tênis minimalista com acabamento limpo e sola confortável.', price: 219.9, image: sheet, imageIndex: 4, sizes: ['34', '35', '36', '37', '38', '39'], colors: ['Branco'], featured: true },
    { id: 'bolsa-vinho-urbana', name: 'Bolsa Vinho Urbana', category: 'acessorios', description: 'Bolsa de ombro espaçosa com formato elegante para o dia a dia.', price: 179.9, image: sheet, imageIndex: 5, sizes: ['Único'], colors: ['Vinho'], featured: false },
    { id: 'vestido-jardim-floral', name: 'Vestido Jardim Floral', category: 'vestidos', description: 'Vestido floral fresco com alças delicadas e saia fluida.', price: 199.9, image: sheet, imageIndex: 6, sizes: ['P', 'M', 'G'], colors: ['Floral'], featured: false },
    { id: 'calca-ampla-bege', name: 'Calça Ampla Bege', category: 'novidades', description: 'Calça de cintura alta e pernas amplas em alfaiataria leve.', price: 169.9, image: sheet, imageIndex: 7, sizes: ['36', '38', '40', '42', '44'], colors: ['Bege', 'Preto'], featured: false },
    { id: 'argolas-luz-dourada', name: 'Argolas Luz Dourada', category: 'acessorios', description: 'Argolas douradas leves para finalizar produções casuais.', price: 69.9, image: sheet, imageIndex: 8, sizes: ['Único'], colors: ['Dourado'], featured: false },
    { id: 'sandalia-noite-preta', name: 'Sandália Noite Preta', category: 'calcados', description: 'Sandália de salto baixo com tiras finas e estabilidade.', price: 189.9, image: sheet, imageIndex: 9, sizes: ['34', '35', '36', '37', '38', '39'], colors: ['Preto'], featured: false }
  ];

  if (typeof window !== 'undefined') window.LUME_PRODUCTS = products;
  else globalThis.LUME_PRODUCTS = products;
})();
