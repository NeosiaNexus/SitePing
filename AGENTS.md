# Reglas del repositorio (fork `guidomodarelli/SitePing`)

Build, tests, arquitectura del monorepo y estilo base: ver [`CLAUDE.md`](./CLAUDE.md). Este archivo agrega las reglas de diseño del fork.

## Diseño del código

- **Inyección de dependencias.** Ningún módulo crea sus propias dependencias de infraestructura (store, base de datos, storage, logger, reloj, políticas de acceso): las recibe por constructor o por opciones. La lógica específica de una app (roles, allowlists, integraciones) entra por callbacks o hooks, nunca como código de la librería.
- **Clases solo con estado.** Usar una clase cuando hay estado propio que mantener (por ejemplo `DrizzleSitepingStore`, `PrismaStore`); si no, funciones factory que cierran sobre sus dependencias (`createSitepingHandler`, `createPgSitepingStore`). La API pública expone factories e interfaces, no clases internas concretas.
- **SOLID donde aporte valor real:**
  - Una responsabilidad por módulo: separar acceso, validación, CORS, operaciones HTTP, SQL por dialecto, etc.
  - Extender por opciones, hooks o nuevos adapters sin modificar el núcleo.
  - Todo `SitepingStore` debe ser intercambiable y pasar la suite de conformidad (`@siteping/core/testing` o `@siteping/adapter-kit/testing`).
  - Interfaces chicas: pedir solo lo que se usa (`Pick<…>`, un método obligatorio cuando alcance).
  - Depender de abstracciones (`SitepingStore`, `ScreenshotStorage`, gateways), no de un ORM, framework o proveedor.
- **Sin duplicación entre variantes.** Cuando dos implementaciones (dialectos SQL, métodos HTTP) comparten lógica, extraerla a un módulo común y dejar en cada variante solo lo que difiere.
- **Funciones cortas y cohesivas.** Si una función orquesta varias operaciones (por ejemplo un handler por método HTTP), dividirla en módulos por operación sobre un pipeline común.
- **Literales en `constants/`.** Límites, mensajes de error, claves de query, headers, nombres de tabla y otros valores con significado de dominio van a `src/constants/` del paquete, organizados por dominio, aunque tengan un solo consumidor. Quedan inline los triviales y el vocabulario estándar de la plataforma. Excepción: código movido desde upstream sin cambios de lógica puede conservar sus literales para no inflar el diff.
- **Runtime-agnóstico.** Los paquetes de servidor usan solo Web APIs (`Request`, `Response`, `crypto.randomUUID`, `TextEncoder`); nada de `node:*` salvo en paquetes con `platform: "node"`, y `process.env` siempre protegido.

## Tests

- Validar contra implementaciones reales en lugar de mocks: stores reales (`MemoryStore`), motores reales en memoria (PGlite, libSQL) y navegadores reales con Playwright para layout, foco y eventos.
- Todo fix incluye un test que falla sin el fix; comprobarlo antes de dar el cambio por terminado.

## Flujo del fork

- Los PRs van al fork (`guidomodarelli/SitePing`, base `main`), no a upstream.
- En Windows, correr los scripts con `npx -y bun@1.3.11` si `bun` no está instalado.
