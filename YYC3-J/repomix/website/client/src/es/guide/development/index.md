# Contribuir a Repomix

¡Gracias por tu interés en **Repomix**! 🚀 Nos encantaría contar con tu ayuda para mejorarlo aún más. Esta guía te ayudará a comenzar a contribuir al proyecto.

## Cómo contribuir

- **Marcar el repositorio con una estrella**: ¡Muestra tu apoyo [marcando el repositorio con una estrella](https://github.com/yamadashy/repomix)!
- **Crear un issue**: ¿Has encontrado un error? ¿Tienes una idea para una nueva función? Háznoslo saber [creando un issue](https://github.com/yamadashy/repomix/issues).
- **Enviar un Pull Request**: ¿Has encontrado algo para arreglar o mejorar? ¡Envía un PR!
- **Difundir la palabra**: Comparte tu experiencia con Repomix en redes sociales, blogs o con tu comunidad tecnológica.
- **Usar Repomix**: Los mejores comentarios provienen del uso en el mundo real, así que no dudes en integrar Repomix en tus propios proyectos.
- **Patrocinar**: Apoya el desarrollo de Repomix [convirtiéndote en patrocinador](https://github.com/sponsors/yamadashy).

## Inicio rápido

```bash
git clone https://github.com/yamadashy/repomix.git
cd repomix
npm install
```

## Comandos de desarrollo

```bash
# Ejecutar CLI
npm run repomix

# Ejecutar pruebas
npm run test
npm run test-coverage

# Linting de código
npm run lint
```

## Estilo de código

- Usa [Biome](https://biomejs.dev/) para linting y formateo
- Inyección de dependencias para la testabilidad
- Mantén los archivos por debajo de las 250 líneas
- Agrega pruebas para las nuevas funciones

## Pautas para Pull Requests

1. Ejecuta todas las pruebas
2. Pasa las comprobaciones de linting
3. Actualiza la documentación
4. Sigue el estilo de código existente

## Configuración de Desarrollo

### Requisitos previos

- Node.js ≥ 20.0.0
- Git
- npm
- Docker (opcional, para ejecutar el sitio web o el desarrollo en contenedores)

### Desarrollo local

Para configurar Repomix para desarrollo local:

```bash
# Clonar el repositorio
git clone https://github.com/yamadashy/repomix.git
cd repomix

# Instalar dependencias
npm install

# Ejecutar CLI
npm run repomix
```

### Desarrollo con Docker

También puedes ejecutar Repomix usando Docker:

```bash
# Construir imagen
docker build -t repomix .

# Ejecutar contenedor
docker run -v ./:/app -it --rm repomix
```

### Estructura del proyecto

El proyecto está organizado en los siguientes directorios:

```
src/
├── cli/          # Implementación de CLI
├── config/       # Manejo de configuración
├── core/         # Funcionalidad principal
│   ├── file/     # Manejo de archivos
│   ├── metrics/  # Cálculo de métricas
│   ├── output/   # Generación de salida
│   ├── security/ # Comprobaciones de seguridad
├── mcp/          # Integración de servidor MCP
└── shared/       # Utilidades compartidas
tests/            # Pruebas que reflejan la estructura src/
website/          # Sitio web de documentación
├── client/       # Frontend (VitePress)
└── server/       # API de Backend
```

## Desarrollo del sitio web

El sitio web de Repomix está construido con [VitePress](https://vitepress.dev/). Para ejecutar el sitio web localmente:

```bash
# Requisitos previos: Docker debe estar instalado en su sistema

# Iniciar el servidor de desarrollo del sitio web
npm run website

# Acceder al sitio web en http://localhost:5173/
```

Al actualizar la documentación, solo necesita actualizar primero la versión en inglés. Los mantenedores se encargarán de las traducciones a otros idiomas.

## Proceso de lanzamiento

Para mantenedores y colaboradores interesados en el proceso de lanzamiento:

1. Actualizar versión
```bash
npm version patch  # o minor/major
```

2. Ejecutar pruebas y construcción
```bash
npm run test-coverage
npm run build
```

3. Publicar
```bash
npm publish
```

Las nuevas versiones son gestionadas por el mantenedor. Si crees que es necesario un lanzamiento, abre un issue para discutirlo.

## ¿Necesitas ayuda?

- [Abre un issue](https://github.com/yamadashy/repomix/issues)
- [Únete a Discord](https://discord.gg/wNYzTwZFku)
