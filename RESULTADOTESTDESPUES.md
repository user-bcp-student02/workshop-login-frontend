# Resultado de pruebas

Repositorio: `workshop-login-frontend`.
Fecha de ejecucion: **2026-10-19**.

Este informe resume las ejecuciones reales realizadas durante el refactor.
No se volvieron a ejecutar comandos al generar este archivo.

## Resumen final

| Validacion | Resultado |
|---|---|
| `npm.cmd test` | **95 tests aprobados, 0 fallidos, 10 archivos aprobados** |
| `npm.cmd run test:coverage` | **95 tests aprobados, 0 fallidos** |
| Cobertura de sentencias | **100%** |
| Cobertura de ramas | **100%** |
| Cobertura de funciones | **100%** |
| Cobertura de lineas | **100%** |
| `npm.cmd run build` | **Aprobado** |
| `node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` | **Aprobado** |

La ultima ejecucion de cobertura comenzo a las **15:55:51** (UTC-05:00)
y duro **2,07 segundos**. La ultima ejecucion sin cobertura comenzo a las
**15:55:54** (UTC-05:00) y duro **1,59 segundos**.

## Detalle de la suite final

| Archivo | Tests | Resultado |
|---|---:|---|
| [src/app/utils/legacy-format.spec.ts](src/app/utils/legacy-format.spec.ts) | 6 | Aprobados |
| [src/app/utils/task-presentation.spec.ts](src/app/utils/task-presentation.spec.ts) | 11 | Aprobados |
| [src/app/services/session.service.spec.ts](src/app/services/session.service.spec.ts) | 15 | Aprobados |
| [src/app/utils/user-facing-error.spec.ts](src/app/utils/user-facing-error.spec.ts) | 8 | Aprobados |
| [src/app/services/tasks.service.spec.ts](src/app/services/tasks.service.spec.ts) | 15 | Aprobados |
| [src/app/services/auth.service.spec.ts](src/app/services/auth.service.spec.ts) | 13 | Aprobados |
| [src/app/dashboard/dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts) | 9 | Aprobados |
| [src/app/app.routes.spec.ts](src/app/app.routes.spec.ts) | 3 | Aprobados |
| [src/main.spec.ts](src/main.spec.ts) | 2 | Aprobados |
| [src/app/login/login.component.spec.ts](src/app/login/login.component.spec.ts) | 13 | Aprobados |
| **Total** | **95** | **Sin fallos** |

## Alcance de cobertura

La configuracion de [vitest.config.ts](vitest.config.ts) incluye todos los
archivos TypeScript de `src`, incluso los no importados por pruebas, y excluye
solo `src/**/*.spec.ts`. Exige al menos **85%** en las cuatro metricas.

El **100%** corresponde al codigo TypeScript instrumentable. Las interfaces
sin codigo ejecutable no aportan contadores. No representa cobertura
automatizada de las plantillas HTML, CSS ni de los servicios backend.

Los reportes generados estan en `coverage/`, carpeta ignorada por Git:

- `coverage/coverage-summary.json`: resumen de cobertura.
- `coverage/index.html`: reporte HTML.

## Comportamientos comprobados

- Login: campos requeridos, prioridad de validaciones, credenciales originales,
  sesion disponible antes de navegar, respuesta sin token, errores seguros,
  restauracion de carga y navegacion cancelada/rechazada.
- Autenticacion HTTP: POST, URL, cuerpo y client conservados; sin Authorization;
  timeout exacto de **5000 ms**; respuestas invalidas y rechazos 401/403/500.
- Tareas HTTP: GET con owner original, incluido vacio y caracteres especiales,
  bearer correcto, sin timeout adicional, errores HTTP/red y lista malformada.
- Sesion: token/usuario solo en memoria, limpieza de claves legadas,
  preferencias parciales validas, datos invalidos y fallos de almacenamiento.
- Dashboard: acceso con/sin sesion, tareas visibles, finalizacion unica en
  exito/error, resolucion fuera de zona y logout.
- Presentacion: exclusion exacta de ARCHIVED, etiquetas y valores de respaldo,
  traduccion de estados, estados desconocidos y orden actual de prioridades.
- Arranque y rutas: proveedores, carga diferida, redirecciones y fallo de inicio.

## Validacion complementaria en navegador

Se uso el navegador integrado con el frontend local en
`http://localhost:4201`. Las respuestas HTTP fueron interceptadas y simuladas;
no se contactaron los backends reales.

Resultados comprobados:

- Mensaje de usuario requerido.
- Boton deshabilitado durante la solicitud y restaurado tras finalizar.
- Errores 401/500 con texto local sin detalles internos.
- Cero nodos HTML creados a partir de etiquetas en usuario o error remoto.
- Flujo login -> dashboard -> consulta de tareas -> logout.
- Endpoints y bearer correctos; tareas ARCHIVED no visibles.
- Descripcion de tarea presentada como texto, no HTML interpretado.
- Token y usuario ausentes de `localStorage`.
- Recarga exige login y no hace GET de tareas sin sesion.
- Segundo login y logout conservan preferencias.
- Recuperacion de preferencias malformadas con aviso visible que sobrevive
  al login y al guardado de defaults.
- Estado vacio de tareas.

El recorrido exitoso no produjo errores de pagina (`pageerror`).
Los errores HTTP 401/500 y el aviso de preferencias fueron provocados
deliberadamente para validar sus estados de error.
El servidor temporal se detuvo al finalizar la comprobacion.

## Caracterizacion previa e incidencias corregidas

Antes de modificar produccion se ejecutaron **46 tests en 3 archivos**,
todos aprobados, sobre los componentes originales y la utilidad.
La suite final incorpora las diferencias de comportamiento aprobadas en
[PLAN.md](PLAN.md).

Durante el desarrollo hubo fallos intermedios que no se ocultan:

- Un test de red uso `ProgressEvent`, no disponible en el entorno Node.
  Se sustituyo por un evento compatible con las propiedades requeridas.
- La comprobacion visual detecto falta de refresco del login al completar
  una promesa. Se agrego `markForCheck` y su prueba.
- Un test adicional fallo porque guardar defaults borraba el aviso de
  recuperacion de preferencias. Se conservo el aviso y se verifico tanto
  en la suite como en navegador.

Las ejecuciones finales de 95 tests se realizaron despues de esas correcciones.

## Limites y auditoria separada

Las pruebas HTTP y de navegador usan respuestas simuladas. No demuestran
disponibilidad, CORS ni autorizacion real de token/owner en servicios externos.

La auditoria de dependencias no es un test funcional:
`npm audit --json` termino con codigo **1**, reportando **25 avisos**
(6 critical, 10 high y 9 moderate). Por tanto, aprobar tests y build
**no implica que el arbol de dependencias este libre de vulnerabilidades**.

El seguimiento de correcciones se mantiene exclusivamente en
[HALLAZGOS.md](HALLAZGOS.md); este archivo es solo un informe de resultados.
