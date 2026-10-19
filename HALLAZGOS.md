# Hallazgos del frontend

Unico registro de seguimiento. Implementacion aprobada por el usuario el
2026-10-19, registrada en [PLAN.md](PLAN.md#aprobacion-humana-registrada).
Se conservan los IDs y severidades de la revision inicial; la evidencia
ahora apunta a la correccion y sus pruebas. Los seis casos de
[RETO.md](RETO.md) se desglosan en estos nueve hallazgos.

| id | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|
| H-01 | Token persistido en `localStorage` | Vulnerabilidad | Riesgo original: lectura y reutilizacion de la credencial por scripts del mismo origen. Resuelto con token/usuario en memoria, borrado de claves legadas y logout centralizado; solo preferencias se persisten. Recargas y otras pestanas requieren login, como se aprobo. No elimina el riesgo de scripts comprometidos durante una sesion activa. | [src/app/services/session.service.ts:13](src/app/services/session.service.ts#L13); [src/app/services/session.service.spec.ts:18](src/app/services/session.service.spec.ts#L18) | alta | Resuelto |
| H-02 | Mensaje dinamico interpretado como HTML | Refactor | Riesgo original: datos no confiables controlaban marcado visible, sin XSS ejecutable demostrado. Resuelto con interpolacion, marcado estatico y mensajes locales seguros compartidos. Diagnosticos solo incluyen operacion, categoria y status, nunca credenciales ni detalle remoto. | [src/app/login/login.component.html:39](src/app/login/login.component.html#L39); [src/app/utils/user-facing-error.ts:10](src/app/utils/user-facing-error.ts#L10); [src/app/utils/user-facing-error.spec.ts:9](src/app/utils/user-facing-error.spec.ts#L9) | media | Resuelto |
| H-03 | Axios 0.31.0 en los componentes | Refactor | Riesgo original: dependencia antigua y acoplamiento al transporte, sin CVE aplicable demostrado. Resuelto retirando Axios directo y usando HttpClient en servicios; se conservan URLs, cuerpo, bearer y timeout solo del login. No significa que todo el arbol de dependencias este libre de avisos; ver auditoria residual. | [src/app/services/auth.service.ts:17](src/app/services/auth.service.ts#L17); [src/app/services/tasks.service.ts:25](src/app/services/tasks.service.ts#L25); [src/app/services/auth.service.spec.ts:27](src/app/services/auth.service.spec.ts#L27); [package.json:12](package.json#L12) | media | Resuelto |
| H-04 | Lodash 4.17.21 para mezclar preferencias | Refactor | Riesgo original: mezcla profunda sin contrato y dependencia sin CVEs aplicables verificados. Resuelto retirando Lodash y sus tipos directos; combinacion nativa de preferencias conocidas, defaults y validacion explicita. Datos invalidos se recuperan con aviso visible y registro seguro; restricciones aprobadas. | [src/app/services/session.service.ts:51](src/app/services/session.service.ts#L51); [src/app/models/preferences.models.ts:1](src/app/models/preferences.models.ts#L1); [src/app/services/session.service.spec.ts:35](src/app/services/session.service.spec.ts#L35) | media | Resuelto |
| H-05 | URLs, HTTP, sesion y presentacion acoplados | Refactor | Riesgo original: cambios parciales podian desalinear el flujo. Resuelto con AuthService, TasksService, SessionService, configuracion de ambiente y transformacion pura. Los componentes coordinan interaccion/vista y navegacion sin acceder a Web Storage ni construir requests. | [src/environments/environment.ts:1](src/environments/environment.ts#L1); [src/app/login/login.component.ts:24](src/app/login/login.component.ts#L24); [src/app/dashboard/dashboard.component.ts:25](src/app/dashboard/dashboard.component.ts#L25); [src/app/utils/task-presentation.ts:16](src/app/utils/task-presentation.ts#L16) | media | Resuelto |
| H-06 | Uso extensivo de `any` | Refactor | Riesgo original: contratos incompatibles no detectados al compilar. Resuelto con interfaces, valores primitivos, errores unknown y guards de respuestas/JSON, sin casts que simulen validacion. TypeScript y plantillas estrictos. Respuestas malformadas producen errores explicitos; estados desconocidos y campos opcionales conservan respaldo. | [src/app/models/auth.models.ts:1](src/app/models/auth.models.ts#L1); [src/app/models/task.models.ts:1](src/app/models/task.models.ts#L1); [src/app/services/auth.service.ts:28](src/app/services/auth.service.ts#L28); [tsconfig.json:7](tsconfig.json#L7) | media | Resuelto |
| H-07 | Pruebas limitadas a una utilidad | Refactor | Riesgo original: regresiones de flujo no detectadas. Resuelto con caracterizacion previa y suite de componentes, servicios HTTP, sesion, errores, formato, rutas y arranque; gate de 85% para las cuatro metricas. El reporte incluye todo el TypeScript de src no-test, tambien archivos no importados. DOM verificado aparte en navegador con APIs simuladas, no contado como cobertura de plantilla. | [vitest.config.ts:7](vitest.config.ts#L7); [src/app/login/login.component.spec.ts:10](src/app/login/login.component.spec.ts#L10); [src/app/dashboard/dashboard.component.spec.ts:10](src/app/dashboard/dashboard.component.spec.ts#L10); [src/app/services/tasks.service.spec.ts:9](src/app/services/tasks.service.spec.ts#L9) | media | Resuelto |
| H-08 | Validacion y autenticacion anidadas | Refactor | Riesgo original: salidas y estado busy dificiles de revisar. Resuelto con retornos anticipados, prioridad del usuario requerido, delegacion al servicio y unica restauracion finally. Se conservan valores originales enviados y se informa navegacion rechazada/cancelada. | [src/app/login/login.component.ts:29](src/app/login/login.component.ts#L29); [src/app/login/login.component.spec.ts:37](src/app/login/login.component.spec.ts#L37) | baja | Resuelto |
| H-09 | Finalizacion de carga duplicada | Refactor | Riesgo original: una rama podia quedar sin actualizacion de vista. Resuelto con un solo finally en dashboard, dentro de NgZone, que termina carga y llama detectChanges una vez tanto en exito como en error. El error no se convierte en una lista vacia exitosa ni provoca logout extra. | [src/app/dashboard/dashboard.component.ts:34](src/app/dashboard/dashboard.component.ts#L34); [src/app/dashboard/dashboard.component.spec.ts:82](src/app/dashboard/dashboard.component.spec.ts#L82) | baja | Resuelto |

## Revalidacion de las filas H-01 a H-09 — 2026-10-19

El usuario autorizo revalidar los nueve items sin reimplementarlos.
Se mantienen sus estados **Resuelto**; las notas siguientes complementan
individualmente las filas de la matriz. No se reabrieron items ni se genero
un diff artificial para repetir cambios ya presentes.

La caracterizacion anterior al refactor sigue siendo la ejecucion historica
de 46 tests descrita abajo. En esta revalidacion no hubo cambio de produccion:
no existe un nuevo "antes/despues" ni una secuencia nueva de nueve entregas.
La unica edicion de esta tarea es esta actualizacion de evidencia.

| Item | Diff conceptual existente y nota de resolucion revalidada | Prueba propia ejecutada en la suite final |
|---|---|---|
| H-01 | Token/usuario de localStorage a memoria; limpieza legada y logout centralizados en [SessionService](src/app/services/session.service.ts). | [session.service.spec.ts](src/app/services/session.service.spec.ts): 15/15; [login-flow.spec.ts](src/app/login/login-flow.spec.ts): sesion antes de navegar, sin token persistido y logout preservando preferencias. |
| H-02 | HTML concatenado a interpolacion estatica en [login.component.html](src/app/login/login.component.html); errores compartidos sin detalle remoto en [user-facing-error.ts](src/app/utils/user-facing-error.ts). | [user-facing-error.spec.ts](src/app/utils/user-facing-error.spec.ts): 8/8; [login.component.spec.ts](src/app/login/login.component.spec.ts): 13/13; flujo verifica mensajes exactos ante errores HTTP. DOM historico no reejecutado. |
| H-03 | Axios sustituido por HttpClient en [AuthService](src/app/services/auth.service.ts) y [TasksService](src/app/services/tasks.service.ts); provider en [main.ts](src/main.ts). | [auth.service.spec.ts](src/app/services/auth.service.spec.ts): 13/13; [tasks.service.spec.ts](src/app/services/tasks.service.spec.ts): 15/15; timeout exacto y contratos de requests. Axios ausente de manifiesto y lockfile. |
| H-04 | Merge Lodash a preferencias conocidas tipadas y recuperacion explicita en [SessionService](src/app/services/session.service.ts). | [session.service.spec.ts](src/app/services/session.service.spec.ts): 15/15; defaults, parciales, invalidos, fallos de guardado y aviso persistente. Lodash y sus tipos ausentes de manifiesto y lockfile. |
| H-05 | Componentes sin HTTP/Web Storage directo; servicios especificos, [environment.ts](src/environments/environment.ts) y [task-presentation.ts](src/app/utils/task-presentation.ts). | [login-flow.spec.ts](src/app/login/login-flow.spec.ts): 53/53; camino feliz integrado con servicios reales, HTTP controlado y router simulado. |
| H-06 | Any sustituido por interfaces, guards y errores unknown; comprobacion estricta en [tsconfig.json](tsconfig.json). | Guards ejercitados por suites de servicios y flujo; type-check de todo el proyecto y build de plantillas: exit 0. Busqueda en src TS/HTML: sin any explicito ni innerHTML. |
| H-07 | Suite de utilidad ampliada a flujo, servicios, componentes y arranque; gate 85% en cuatro metricas en [vitest.config.ts](vitest.config.ts). | Suite completa: 148/148, 11 archivos, 100% en las cuatro metricas del TypeScript instrumentable. Las pruebas no demuestran integracion con backends ni cobertura DOM. |
| H-08 | Condicionales anidados a retornos anticipados y finally unico en [LoginComponent](src/app/login/login.component.ts). | [login.component.spec.ts](src/app/login/login.component.spec.ts): 13/13; flujo cubre vacios, prioridad de mensaje, busy, rechazo/cancelacion de navegacion y respuestas sin token. |
| H-09 | Finalizacion repetida a un solo finally con NgZone/detectChanges en [DashboardComponent](src/app/dashboard/dashboard.component.ts). | [dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts): 9/9; flujo confirma loading, mensajes y sesion en exito, red, 401/403 y respuestas invalidas. |

**Evidencia del diff local:** rama `day1/prompting`, comparacion `git diff main`
desde la raiz del componente, junto con `git status --short` y lectura de
archivos nuevos. Los servicios, modelos, utilidades nuevas, pruebas nuevas y
lockfile siguen sin seguimiento: **no aparecen en `git diff main`**. Deben
incluirse con los archivos versionados al preparar una entrega; no se presupone
commit, PR o merge. No se agregaron archivos al index en esta revalidacion.

**Comandos reales**, ejecutados desde la raiz de `workshop-login-frontend`:

| Comando | Resultado |
|---|---|
| `npm.cmd run test:coverage` | Exit 0; 148/148 tests, 11 archivos; inicio 17:15:25 UTC-05:00, duracion 2,23 s. |
| `npm.cmd run build` | Exit 0; build Angular y plantillas estrictas aprobados. |
| `node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` | Exit 0; tipos estrictos, incluidos tests. |
| `git --no-pager diff --check` | Exit 0 antes de esta actualizacion documental. |
| Inspeccion JSON de manifiesto/lockfile | Exit 0; cero entradas de axios, lodash y @types/lodash, sin modificar paquetes. |

Cobertura: **100%** lineas, sentencias, funciones y ramas; gate **85%** sin
reducciones. Se incluyen todos los archivos TS de src excepto pruebas, no HTML
ni CSS. Se confirmo ausencia de `any` explicito, `[innerHTML]` y bypass de
sanitizacion en src TS/HTML. Web Storage de produccion queda solo en el servicio
de sesion y persiste preferencias, no credenciales.

Los contratos se revalidan con transporte controlado, no con backends reales.
No se ejecutaron navegador ni auditoria de dependencias en esta revalidacion;
los avisos residuales documentados abajo no se consideran resueltos por
aprobar tests/build. Catalogo ampliado: [docs/TESTING.md](docs/TESTING.md).

## Caracterizacion anterior y prueba de correccion por hallazgo

Antes de tocar produccion se ejecutaron **46 tests, 3 archivos, todos
aprobados** sobre los componentes originales y la utilidad (2026-10-19).
La suite posterior conserva expectativas funcionales y cambia expresamente
las relativas a las diferencias aprobadas. Los tests reemplazados no se
presentan como si siguieran probando el codigo antiguo.

| Hallazgo | Antes: comportamiento realmente caracterizado | Despues: prueba de correccion |
|---|---|---|
| H-01 | Escritura token/usuario antes de navegar, lectura en dashboard y borrado al salir conservando preferencias. | [Sesion](src/app/services/session.service.spec.ts): claves legadas eliminadas, ningun token/usuario escrito, nueva instancia sin sesion y logout. Navegador confirma token/user null en localStorage, recarga al login sin GET adicional y segundo login/logout. |
| H-02 | Mensajes requeridos, sin token y precedencia de message remoto/fallback; busy restaurado. | [Errores seguros](src/app/utils/user-facing-error.spec.ts) y [login](src/app/login/login.component.spec.ts): texto local y registro sin datos sensibles. Navegador con etiquetas en usuario/error confirma cero nodos dinamicos y sin detalles remotos. |
| H-03 | POST con cuerpo/client/timeout exactos; GET con owner, bearer y sin timeout configurado. | [Auth HTTP](src/app/services/auth.service.spec.ts) y [Tasks HTTP](src/app/services/tasks.service.spec.ts): 5000 ms exactos solo en login, owner vacio/especial, 401/403/red y ausencia de requests extra. `npm ls axios lodash --depth=0` devuelve arbol directo vacio (exit 1 esperado para paquetes ausentes). |
| H-04 | Defaults, false, parciales, null, claves adicionales, tipos incorrectos, anidados y JSON malformado frente a merge. | [Sesion](src/app/services/session.service.spec.ts): equivalencia para preferencias validas y recuperacion explicita para invalidas. Una prueba adicional detecto que guardar defaults borraba el aviso; fallo primero y paso tras mantener el aviso. |
| H-05 | Navegacion tras guardar y carga con/sin token; filtrado, etiquetas, estados y orden lexical, incluyendo igualdad. | [Dashboard](src/app/dashboard/dashboard.component.spec.ts), servicios y [presentacion](src/app/utils/task-presentation.spec.ts); navegador recorre dos logins, consulta con bearer y logout usando servicios reales con respuestas HTTP simuladas. |
| H-06 | Campos opcionales/fallbacks; usuario persistido malformado rechazaba antes del request y tareas null dejaban un error visible. | Guards rechazan explicitamente token, usuario y tareas invalidas; estados desconocidos y escalares validos siguen admitidos. `tsc --noEmit -p tsconfig.json` y build Angular estricto aprobados. |
| H-07 | Suite inicial: 1 test. Caracterizacion previa a produccion: 46 tests aprobados. | Suite final y cobertura descritas abajo; validacion DOM real separada. No se agregaron dependencias para DOM ni se cambio de runner. |
| H-08 | Null/undefined/vacio/espacios en usuario/password, credenciales originales, sin token, fallo HTTP y navegacion rechazada. | [Login](src/app/login/login.component.spec.ts): mismas validaciones y prioridad, busy y markForCheck tras completar, errores y navegacion cancelada/rechazada. |
| H-09 | Loading mientras se espera; exito/error terminan y detectan cambios una vez. | [Dashboard](src/app/dashboard/dashboard.component.spec.ts): misma finalizacion unica, resolucion asincrona fuera de zona y error sin redireccion. Navegador confirma tareas visibles, no solo espias. |

## Resultados reales de validacion

- Baseline antes de produccion: `npm.cmd test`, **46/46**, 3 archivos.
- Suite final: `npm.cmd test`, **95/95**, 10 archivos.
- `npm.cmd run test:coverage`: **95/95**; **100%** lineas, sentencias,
  funciones y ramas del TypeScript instrumentable de `src`, excluyendo solo
  `.spec.ts`. Las interfaces sin codigo ejecutable no aportan contadores.
  Umbral de 85% configurado para las cuatro metricas.
- `npm.cmd run build`: aprobado con comprobacion estricta de plantillas.
- `node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json`: aprobado, incluidos
  los archivos de prueba.
- Navegador integrado en `http://localhost:4201`: formulario requerido,
  boton deshabilitado mientras espera, errores 401/500 seguros y boton
  restaurado, ausencia de nodos procedentes de HTML dinamico, tareas visibles
  sin ARCHIVED, descripcion literal, bearer correcto, recarga sin sesion,
  segundo login y logout con preferencias conservadas. **Sin pageerrors**
  en el recorrido exitoso. Respuestas interceptadas: no se contactaron
  backends reales ni otros componentes del workspace.

Los reportes de cobertura se generan en `coverage/` (ignorado por Git).
La evidencia durable son las pruebas, sus gates y este resumen; no se declara
cobertura automatizada de HTML/CSS ni integracion con backends reales.

## Desviaciones acotadas y riesgos residuales

- Se agruparon los cambios de servicios, tipos y transporte relacionados para
  no introducir una arquitectura temporal duplicada. Las caracterizaciones
  de los nueve hallazgos se ejecutaron antes de cualquier cambio de produccion.
- Se agregaron pruebas de arranque/rutas para incluir todo `src/**/*.ts` en
  cobertura, no para excluir codigo sin ejercicio. No se cambio su conducta.
- El navegador detecto falta de refresco del login tras completar una promesa;
  se agrego `markForCheck` en finally y su asercion. Es una correccion ligada
  al cambio, necesaria para restaurar mensaje/boton en la vista real.
- Se actualizaron README y la descripcion local de endpoints para no dejar
  documentado almacenamiento/HTML anteriores como comportamiento actual.
  **Los contratos HTTP no se cambiaron.**
- El lockfile previo sin seguimiento se preservo como objeto Git
  `388dc8ab92983a91a92886ee7f50abccfc65c4a0` antes de regenerarlo con npm.
  npm retiro 30 entradas del lockfile (incluidas entradas opcionales anidadas
  de herramientas); la comparacion JSON verifico cero paquetes agregados y
  cero cambios de version entre paquetes conservados. La instalacion retiro
  12 paquetes presentes en node_modules.
  No se crearon commits ni se modificaron archivos previos ajenos al alcance.
- Auditoria real `npm audit --json`: exit **1**, **25 avisos** (6 critical,
  10 high, 9 moderate), incluidos Angular y herramientas de build/testing.
  No son una prueba de explotabilidad en navegador. No se aplico
  `npm audit fix --force` ni se actualizaron paquetes ajenos a lo previsto.
  Resolver esos avisos requiere un siguiente cambio aprobado; retirar
  Axios/Lodash no sanea automaticamente todo el arbol.
- La sesion en memoria no protege de scripts comprometidos durante la sesion
  ni revoca tokens en el servidor. Si Web Storage esta bloqueado, puede fallar
  la limpieza legada: se registra y se muestra aviso, no se afirma limpieza
  exitosa. Las preferencias invalidas usan defaults con aviso persistente.
- Se conservan deliberadamente el orden lexical de prioridades, la
  serializacion actual del owner y la falta de renovacion/revocacion o logout
  automatico en 401/403. Los servicios externos deben seguir autorizando
  token y owner; esa autorizacion no fue verificada en este repositorio.
