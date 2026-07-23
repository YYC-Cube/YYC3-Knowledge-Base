# Contribuindo para o Repomix

Obrigado pelo seu interesse no **Repomix**! 🚀 Adoraríamos sua ajuda para torná-lo ainda melhor. Este guia irá ajudá-lo a começar a contribuir para o projeto.

## Como Contribuir

- **Estrelar o Repositório**: Mostre seu apoio [estrelando o repositório](https://github.com/yamadashy/repomix)!
- **Criar uma Issue**: Encontrou um bug? Tem uma ideia para um novo recurso? Informe-nos [criando uma issue](https://github.com/yamadashy/repomix/issues).
- **Enviar um Pull Request**: Encontrou algo para corrigir ou melhorar? Envie um PR!
- **Espalhar a Palavra**: Compartilhe sua experiência com o Repomix nas redes sociais, blogs ou com sua comunidade de tecnologia.
- **Usar o Repomix**: O melhor feedback vem do uso no mundo real, então sinta-se à vontade para integrar o Repomix em seus próprios projetos!
- **Patrocinar**: Apoie o desenvolvimento do Repomix [tornando-se um patrocinador](https://github.com/sponsors/yamadashy).

## Início Rápido

```bash
git clone https://github.com/yamadashy/repomix.git
cd repomix
npm install
```

## Comandos de Desenvolvimento

```bash
# Executar CLI
npm run repomix

# Executar testes
npm run test
npm run test-coverage

# Lintar código
npm run lint
```

## Estilo de Código

- Use [Biome](https://biomejs.dev/) para lintar e formatar
- Injeção de dependência para testabilidade
- Mantenha os arquivos com menos de 250 linhas
- Adicione testes para novos recursos

## Diretrizes para Pull Requests

1. Execute todos os testes
2. Passe nas verificações de lint
3. Atualize a documentação
4. Siga o estilo de código existente

## Configuração de Desenvolvimento

### Pré-requisitos

- Node.js ≥ 20.0.0
- Git
- npm
- Docker (opcional, para executar o website ou desenvolvimento em contêiner)

### Desenvolvimento Local

Para configurar o Repomix para desenvolvimento local:

```bash
# Clonar repositório
git clone https://github.com/yamadashy/repomix.git
cd repomix

# Instalar dependências
npm install

# Executar CLI
npm run repomix
```

### Desenvolvimento com Docker

Você também pode executar o Repomix usando Docker:

```bash
# Construir imagem
docker build -t repomix .

# Executar contêiner
docker run -v ./:/app -it --rm repomix
```

### Estrutura do Projeto

O projeto está organizado nos seguintes diretórios:

```
src/
├── cli/          # Implementação CLI
├── config/       # Manipulação de configuração
├── core/         # Funcionalidade principal
│   ├── file/     # Manipulação de arquivos
│   ├── metrics/  # Cálculo de métricas
│   ├── output/   # Geração de saída
│   ├── security/ # Verificações de segurança
├── mcp/          # Integração com servidor MCP
└── shared/       # Utilitários compartilhados
tests/            # Testes espelhando a estrutura src/
website/          # Website de documentação
├── client/       # Frontend (VitePress)
└── server/       # API Backend
```

## Desenvolvimento do Website

O website do Repomix é construído com [VitePress](https://vitepress.dev/). Para executar o website localmente:

```bash
# Pré-requisitos: Docker deve estar instalado no seu sistema

# Iniciar o servidor de desenvolvimento do website
npm run website

# Acessar o website em http://localhost:5173/
```

Ao atualizar a documentação, você só precisa atualizar primeiro a versão em inglês. Os mantenedores cuidarão das traduções para outros idiomas.

## Processo de Release

Para mantenedores e contribuidores interessados no processo de release:

1. Atualizar versão
```bash
npm version patch  # ou minor/major
```

2. Executar testes e build
```bash
npm run test-coverage
npm run build
```

3. Publicar
```bash
npm publish
```

Novas versões são gerenciadas pelo mantenedor. Se você acha que um lançamento é necessário, abra uma issue para discutir.

## Precisa de Ajuda?

- [Abra uma issue](https://github.com/yamadashy/repomix/issues)
- [Junte-se ao Discord](https://discord.gg/wNYzTwZFku)
