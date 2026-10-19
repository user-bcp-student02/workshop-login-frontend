# Pruebas de login y consulta de tareas

Ejecucion verificada el **2026-10-19**, sobre el componente
`workshop-login-frontend`. Contrato: [ENDPOINTS.md](ENDPOINTS.md).
Meta: al menos **85%** segun [REGLAS.md](../REGLAS.md).

## Alcance y estrategia

Se agrego [login-flow.spec.ts](../src/app/login/login-flow.spec.ts):
**53 casos** de integracion interna del frontend. Ejecuta los componentes y
los servicios AuthService, TasksService y SessionService reales, con HttpClient
y HttpTestingController. Se simulan transporte HTTP, almacenamiento, router y
notificacion de cambios. No se montan plantillas ni se llama a servicios reales.

Estas pruebas comprueban que errores del transporte/guardas llegan al estado
correcto del componente, no solo que una Promise rechaza. Tambien verifican
que no haya requests inesperados, reintentos o redirecciones no documentadas.
Los tokens y passwords son fixtures ficticios.

Se conservaron las suites anteriores. Se corrigio la parametrizacion de
arreglos en [tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts),
sin cambiar las expectativas ni el codigo de produccion. No se agregaron
dependencias ni se modificaron contratos, produccion o quality gates.

## Matriz de casos ejecutados

Las filas agrupan variantes parametrizadas; no representan una prueba unica
por cada fila. Salvo donde se indica otra suite, los casos se ejecutan en
[login-flow.spec.ts](../src/app/login/login-flow.spec.ts).

| flujo | caso | tipo | resultado esperado |
|---|---|---|---|
| Login -> tareas -> logout | Credenciales validas, respuesta con token/usuario, tareas TODO y ARCHIVED | Camino feliz | POST con body/client y sin Authorization; sesion disponible antes de navegar; GET con owner y bearer; solo tarea no ARCHIVED visible con etiqueta; logout limpia sesion/listas y conserva preferencias. |
| Login | Usuario vacio o espacios; ambos campos vacios | Caso borde | `Ingrese un usuario.` con prioridad; no hay HTTP, sesion ni navegacion. |
| Login | Password vacio o espacios con usuario valido | Caso borde | `Ingrese una contraseña.`; no hay HTTP. Null/undefined tambien se cubren en [login.component.spec.ts](../src/app/login/login.component.spec.ts). |
| Login | Token ausente, vacio, null, false o 0 | Caso borde | `El backend respondió sin token.`; sin sesion nueva, GET ni navegacion; busy false. |
| Login | HTTP 401/403 | Error | `No se pudo autenticar. Revisa tus credenciales.`; no se muestra message del backend; se restaura busy. |
| Login | HTTP 400/404/429/500/503 | Error | `No se pudo autenticar. Intenta nuevamente.`; sin sesion nueva ni navegacion. Incluye backend respondiendo 503. |
| Login | Backend caido o fallo de red/CORS reportado como status 0 | Error | Mensaje generico de login, busy false, sin GET. Se simula el error de transporte; no se afirma diagnosticar CORS real. |
| Login | Request pendiente durante 4999 ms y hasta 5000 ms | Error | Antes del limite sigue busy; a los 5000 ms cancela request, muestra `La solicitud tardó demasiado. Intenta nuevamente.`, restaura busy y no consulta tareas. |
| Login | Raiz null/arreglo/string, token numerico truthy, user arreglo o campos de usuario null | Error | `El servicio devolvió una respuesta no válida.`; no se registra sesion nueva ni se navega. |
| Login | 204 sin cuerpo | Error | Mismo error explicito de respuesta invalida; no se considera autenticacion exitosa. |
| Login | HttpClient entrega HttpErrorResponse de parseo JSON con status 200 | Error | Mensaje generico de login, no mensaje del guard de esquema. El error de parseo se inyecta; no se prueba el parser real del navegador. |
| Login | Fallo al persistir preferencias despues de respuesta valida | Error | Sesion autentica conservada y navegacion permitida; aviso `No se pudieron guardar las preferencias.` visible en estado de login/dashboard; tareas cargan. |
| Login | Navegacion a dashboard devuelve false o rechaza | Error | Mensaje generico, busy false, sesion ya creada no se revierte; no se inicia GET automaticamente en el test. |
| Inicio de sesion | JSON de preferencias malformado, claves/tipos invalidos o fallo de almacenamiento | Error | Defaults con aviso y registro seguro; no se oculta el fallo. Casos en [session.service.spec.ts](../src/app/services/session.service.spec.ts); el aviso no desaparece al guardar defaults. |
| Tareas | Lista vacia o todas ARCHIVED | Caso borde | visibleTasks vacio, error vacio y loading false; la plantilla correspondiente usa el mensaje de lista vacia, no un error. |
| Tareas | Owner vacio o con separadores | Caso borde | Mantener URL actual, sin inventar codificacion; casos en [tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts). No demuestra autorizacion del backend. |
| Tareas | Token enviado y servidor lo rechaza con 401/403 | Error | Mensaje generico de dashboard, loading false, sesion conservada; sin refresh, logout, reintento ni redireccion automatica. El fixture token es opaco; no se simula verificacion criptografica. |
| Tareas | HTTP 400/404/429/500/503 | Error | Mismo error generico, sin exponer detail del backend, finalizacion unica. |
| Tareas | Backend caido/status 0 | Error | `No se pudo cargar el dashboard. Intenta nuevamente.`; quita loading, no finge exito con lista vacia, conserva sesion. |
| Tareas | Respuesta null, objeto, envoltorio tasks, elemento null, title null, status boolean u owner objeto | Error | Rechaza toda la respuesta con `El servicio devolvió una respuesta no válida.`; finaliza loading una vez. Otros tipos invalidos se cubren tambien en la suite del servicio. |
| Tareas | 204 sin cuerpo | Error | Error explicito de respuesta invalida; no se acepta como lista vacia. |
| Tareas | HttpErrorResponse de parseo JSON con status 200 | Error | Mensaje generico de dashboard y finalizacion de carga; parser real no ejercitado por este doble. |
| Tareas | Request pendiente mas de 5000 ms | Caso borde | A los 6000 ms loading sigue true, sin error ni cancelacion; al resolver con [] termina. El GET no tiene timeout propio. |
| Tareas | TimeoutError suministrado externamente | Error | Traductor compartido muestra el mensaje de timeout y termina carga. Prueba de rama defensiva, no evidencia de timeout activo en TasksService. |
| Dashboard | Sin sesion | Caso borde | Navega a login sin ninguna solicitud HTTP. |
| Presentacion | Defaults, estados conocidos/desconocidos, prioridades distintas e iguales | Caso borde | Mantiene reglas de [ENDPOINTS.md](ENDPOINTS.md); pruebas en [task-presentation.spec.ts](../src/app/utils/task-presentation.spec.ts) y [legacy-format.spec.ts](../src/app/utils/legacy-format.spec.ts). No se redefine el orden de negocio. |

## Codigo de los tests

Codigo completo ejecutado:

- **Nuevo:** [login-flow.spec.ts](../src/app/login/login-flow.spec.ts).
- **Corregido:** [tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts).
- Soporte existente: [auth.service.spec.ts](../src/app/services/auth.service.spec.ts),
  [session.service.spec.ts](../src/app/services/session.service.spec.ts),
  [login.component.spec.ts](../src/app/login/login.component.spec.ts),
  [dashboard.component.spec.ts](../src/app/dashboard/dashboard.component.spec.ts),
  [user-facing-error.spec.ts](../src/app/utils/user-facing-error.spec.ts).

Los siguientes extractos son del archivo nuevo ejecutado. Usan su setup real:
componentes construidos con servicios reales, `http` como HttpTestingController,
`session` como SessionService, `navigate` como espia de Router y los helpers
`authenticate`, `expectLoginFailure` y `expectTasksFailure`. No son scripts
independientes: el archivo enlazado contiene todos los imports, fixtures,
setup y limpieza de mocks/relojes/globales.

### Camino feliz: contrato y carga

El helper de autenticacion ejecuta el componente real:

```typescript
async function authenticate(): Promise<void> {
  const pending = login.login();
  const request = http.expectOne(LOGIN_URL);
  expect(request.request.method).toBe('POST');
  expect(request.request.body).toEqual({
    username: 'student', password: 'test-password', client: 'angular-workshop'
  });
  expect(request.request.headers.has('Authorization')).toBe(false);
  request.flush(LOGIN_RESPONSE);
  await pending;
  expect(login.message).toBe('');
  expect(session.session).toEqual(LOGIN_RESPONSE);
  expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  navigate.mockClear();
}
```

El test de camino feliz usa ese helper y verifica la respuesta transformada,
el bearer, la exclusión de ARCHIVED, la ausencia de credenciales persistidas
y el logout con preferencias conservadas. El codigo completo esta en el primer
`it` de [login-flow.spec.ts](../src/app/login/login-flow.spec.ts).

### Casos borde: respuesta sin token

```typescript
it.each([{}, { token: '' }, { token: null }, { token: false }, { token: 0 }])
  ('edge: missing/falsy token %j prevents session and tasks', async response => {
    const pending = login.login();
    http.expectOne(LOGIN_URL).flush(response);
    await pending;
    expectLoginFailure('El backend respondió sin token.');
  });
```

`expectLoginFailure` verifica mensaje, busy false, notificacion de cambio,
sesion null, ausencia de navegacion, token no persistido y ausencia de GET.

### Error: timeout de login medido, no espera real de cinco segundos

```typescript
it('login timeout occurs at 5000ms, cancels request, restores UI and does not query tasks', async () => {
  vi.useFakeTimers();
  const pending = login.login();
  const request = http.expectOne(LOGIN_URL);
  await vi.advanceTimersByTimeAsync(4999);
  expect(login.busy).toBe(true);
  expect(login.message).toBe('');
  expect(request.cancelled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await pending;
  expect(request.cancelled).toBe(true);
  expectLoginFailure(TIMEOUT_MESSAGE);
});
```

### Error: token rechazado u otro fallo HTTP de tareas

```typescript
it.each([400, 401, 403, 404, 429, 500, 503])('tasks HTTP %i preserves session and does not redirect or retry', async status => {
  await authenticate();
  const pending = dashboard.ngOnInit();
  const request = http.expectOne(TASKS_URL);
  expect(request.request.headers.get('Authorization')).toBe(`Bearer ${LOGIN_RESPONSE.token}`);
  request.flush({ detail: 'PRIVATE_DETAIL' }, { status, statusText: 'Rejected' });
  await pending;
  expectTasksFailure(TASKS_ERROR);
});
```

`expectTasksFailure` verifica mensaje, loading false, lista visible vacia,
una sola llamada a detectChanges, sesion intacta y ausencia de nuevas
solicitudes/navegacion. El fallo no se interpreta como lista vacia exitosa:
`dashboard.error` debe contener el mensaje esperado.

### Error: backend caido en login

```typescript
it('login backend unavailable / CORS-style status 0 reaches generic UI error', async () => {
  const pending = login.login();
  http.expectOne(LOGIN_URL).error(networkFailure());
  await pending;
  expectLoginFailure(LOGIN_ERROR);
});
```

`networkFailure()` crea un evento compatible con las propiedades de
ProgressEvent en Node; no agrega un entorno DOM ni llama a la red real.

## Comandos y resultados realmente ejecutados

Directorio de trabajo en todas las corridas:

```text
C:\Users\Usuario\Documents\t22028-cristianjara\reqflow-workspace\workshop-login-frontend
```

Se uso `npm.cmd` por la politica de scripts de PowerShell. Las dependencias
ya estaban instaladas; no se instalo ni actualizo ningun paquete.

| Comando | Codigo de salida | Resultado real |
|---|---:|---|
| `npm.cmd test -- src\app\login\login-flow.spec.ts` | 1 | Primera corrida: 51 aprobados y 2 fallidos, de 53; 1 archivo. Duracion 2,35 s, inicio 16:52:44 UTC-05:00. Detalle de fallos abajo. |
| `npm.cmd test -- src\app\login\login-flow.spec.ts src\app\services\tasks.service.spec.ts` | 0 | Tras corregir fixtures: 68/68 aprobados, 2 archivos; 1,91 s, inicio 16:53:17 UTC-05:00. |
| `npm.cmd run test:coverage` | 0 | Suite completa: **148/148 aprobados, 0 fallidos, 11 archivos**, duracion **5,67 s**, inicio **16:53:39 UTC-05:00**. |
| `node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` | 0 | Comprobacion estricta de tipos aprobada, incluidos los nuevos tests. |
| `git --no-pager diff --check` | 0 | Sin errores de espacios en el diff versionado inspeccionado. |

La herramienta integrada `runTests` no descubrio el archivo nuevo y devolvio
`No tests found in the files`; no se conto como ejecucion exitosa. Se uso el
runner real del repositorio mediante los comandos anteriores.

### Resultado de cobertura

| Metrica | Resultado | Minimo configurado |
|---|---:|---:|
| Sentencias | **100%** | 85% |
| Ramas | **100%** | 85% |
| Funciones | **100%** | 85% |
| Lineas | **100%** | 85% |

Configuracion sin cambios: [vitest.config.ts](../vitest.config.ts).
Incluye todo `src/**/*.ts`, incluso archivos no importados por pruebas, y
excluye solo `src/**/*.spec.ts`. Por tanto la medicion cubre todo el TypeScript
instrumentable de produccion, no solo los servicios importados por el nuevo
test. Las interfaces sin ejecucion no aportan contadores.
Los archivos modificados en esta tarea son pruebas y documentacion;
no se modifico codigo de produccion ni se excluyeron ramas para alcanzar la meta.

Reportes generados en `coverage/coverage-summary.json` y `coverage/index.html`,
ignorados por Git. Los historicos [RESULTADOTESTANTES.md](../RESULTADOTESTANTES.md)
y [RESULTADOTESTDESPUES.md](../RESULTADOTESTDESPUES.md) se conservan como
resultados de sus respectivas corridas; este documento registra la suite
ampliada de 148 pruebas, no reescribe esos historicos.

## Fallos y defectos encontrados, separados de las expectativas

**Defecto del arnes de pruebas, corregido:** `it.each` interpreta una fila
arreglo como lista de argumentos. Los fixtures `[]` y `[{ status: 'ARCHIVED' }]`
no estaban llegando completos a `flush`. Esto provoco los dos fallos iniciales:
conversion JSON no soportada y un mensaje de respuesta invalida en vez de exito.
Se cambiaron las filas a `{ response: [...] }`, manteniendo la expectativa
correcta de exito vacio.

El mismo defecto existia en los casos de respuestas malformadas de
[tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts):
por ejemplo, `[{ title: 1 }]` llegaba como `{ title: 1 }` y ejercitaba la raiz
invalida en vez del elemento invalido. Se corrigio con filas `{ response }`;
los casos ahora rechazan la estructura que su nombre declara.
**No se adapto ninguna expectativa para tolerar un bug de produccion.**

**Fallos finales:** ninguno en las ejecuciones finales.
**Bugs de produccion nuevos demostrados por esta ampliacion:** ninguno.
Los comportamientos documentados como limitaciones (GET sin timeout,
serializacion de owner, sesion sin renovacion) no se corrigieron ni se
presentan como funcionalidades nuevas.

## Pendientes y pruebas propuestas, no ejecutadas en esta tarea

- **Pendiente de coordinacion externa:** disponibilidad, CORS real, codigos
  efectivos y autorizacion del owner/token en backends reales. Ninguna prueba
  simulada demuestra esos controles. No se accedio a otros componentes.
- **Propuesta:** prueba de navegador automatizada contra respuestas de JSON
  sintacticamente roto. Los casos nuevos inyectan el HttpErrorResponse que
  representa ese fallo; HttpTestingController no ejercita el parser real
  del transporte del navegador.
- **Propuesta:** automatizar renderizado DOM, anuncios accesibles, boton,
  esqueletos y mensajes vacios. Aqui se comprobo estado de componentes y
  notificaciones de cambio, no el DOM ni accesibilidad. Las validaciones
  visuales historicas no se volvieron a ejecutar.
- **No ejecutados aqui:** build, scanners ni auditoria de dependencias; esta
  tarea no cambia produccion/manifiestos. Una suite verde no implica ausencia
  de vulnerabilidades de dependencias.

No se agregaron tests omitidos (`skip`/`todo`), gates debilitados ni
resultados propuestos mezclados con resultados ejecutados.

## Documentos consultados

- [ENDPOINTS.md](ENDPOINTS.md): contratos, errores y reacciones actuales.
- [REGLAS.md](../REGLAS.md): cobertura y reglas del laboratorio.
- [GOOD_PRACTICES.md](GOOD_PRACTICES.md): tipos, servicios y errores.
- [package.json](../package.json) y [vitest.config.ts](../vitest.config.ts):
  scripts, runner, descubrimiento y gates.

Tambien se leyeron los componentes de login/dashboard, los tres servicios,
el traductor de errores y las pruebas HTTP existentes. La matriz de seguimiento
de hallazgos sigue siendo [HALLAZGOS.md](../HALLAZGOS.md); este documento es
el catalogo y evidencia de pruebas.
