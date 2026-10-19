# Endpoints externos consumidos por el frontend

Descripcion del cliente Angular actual, revisada el 2026-10-19. Solo consume
los dos endpoints siguientes. No se inspeccionaron backends ni otros componentes.
Los ejemplos son **fixtures verificables del repositorio**, no capturas de una
API real; los tokens y passwords de pruebas no son credenciales de produccion.

Las URLs proceden de [environment.ts](../src/environments/environment.ts).
HttpClient entrega el cuerpo JSON directamente al servicio; no hay envoltorio
Axios `response.data`. No se configura `withCredentials`, autenticacion por
cookies ni interceptores propios en [main.ts](../src/main.ts).
Las cabeceras automaticas de HttpClient/navegador se distinguen de las
configuradas explicitamente; no se pretende listar todas las cabeceras de red.

## POST http://localhost:8080/auth/login

### 1. Quien lo llama

[LoginComponent.login](../src/app/login/login.component.ts#L29), invocado por el
boton Ingresar, llama a [AuthService.login](../src/app/services/auth.service.ts#L17).
AuthService hace el POST con HttpClient, valida el cuerpo y registra la sesion
en [SessionService](../src/app/services/session.service.ts).

Antes de solicitar, el componente rechaza usuario/password null, undefined,
vacios o solo espacios. Muestra primero `Ingrese un usuario.` y, si el usuario
es valido pero falta password, `Ingrese una contraseña.`. En esos casos no hay
request. Durante el request el boton queda deshabilitado y dice `Ingresando...`.

### 2. Que envia

Sin query params. Body JSON:

| Campo o cabecera | Ubicacion | Tipo / valor | Comportamiento |
|---|---|---|---|
| `username` | Body | string | Valor original del campo Usuario; no se recorta al transmitir. |
| `password` | Body | string | Valor original del campo Contraseña; no se recorta al transmitir. |
| `client` | Body | string, `angular-workshop` | Constante del servicio. |
| `Authorization` | Header | Ausente | No se configura bearer en login. |
| `Content-Type` | Header automatico | `application/json` para el objeto enviado | Inferido por HttpClient, no fijado por AuthService. |
| `Accept` | Header automatico | `application/json, text/plain, */*` | Valor predeterminado de HttpClient; no hay override propio. |

Timeout RxJS: **5000 ms** esperando respuesta. No hay reintento automatico.

Ejemplo del request de
[auth.service.spec.ts](../src/app/services/auth.service.spec.ts#L27);
los espacios son deliberados y se conservan:

```http
POST http://localhost:8080/auth/login
Content-Type: application/json
Accept: application/json, text/plain, */*

{
  "username": " student ",
  "password": " password ",
  "client": "angular-workshop"
}
```

### 3. Que espera recibir en exito

**Estado HTTP:** el fixture de pruebas usa **200 OK** (valor predeterminado de
`HttpTestingController.flush`). AuthService no compara un status concreto:
procesa las respuestas que HttpClient considera exitosas (2xx), siempre que
su cuerpo cumpla las condiciones siguientes. Un 204 sin cuerpo no constituye
exito funcional, porque falla la validacion.

| Campo | Tipo aceptado | Requerido / uso actual |
|---|---|---|
| Cuerpo raiz | Objeto JSON, no null ni arreglo | Obligatorio. |
| `token` | string no vacio | Obligatorio; se guarda en memoria. No se verifica formato JWT, firma ni expiracion. Una cadena de espacios no se recorta y pasa el guard actual. |
| `user` | Objeto JSON | Opcional; ausencia o null se convierten en `{}`. Si esta presente con otro tipo, se rechaza. |
| `user.username` | string | Opcional; alimenta `owner` en la consulta de tareas y el saludo de respaldo. Ausente o vacio produce `owner=`. Null se rechaza. |
| `user.displayName` | string | Opcional; el saludo usa `displayName || username`. Null se rechaza. |
| Campos adicionales | No restringidos por este guard | No se exigen; se descartan al construir la sesion tipada. |

Ejemplo exacto del fixture de exito:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "token": "test-token",
  "user": {
    "username": "student",
    "displayName": "Student"
  }
}
```

El servicio establece la sesion antes de navegar y guarda solo preferencias
en almacenamiento local. Login navega a `/dashboard`; alli empieza el GET de
tareas. La UI muestra `Hola, Student` para este ejemplo.

Evidencia: [readResponse](../src/app/services/auth.service.ts#L28),
[modelo de autenticacion](../src/app/models/auth.models.ts),
[prueba de exito](../src/app/services/auth.service.spec.ts#L27) y
[saludo](../src/app/dashboard/dashboard.component.html#L6).

**Pregunta abierta:** el frontend no permite confirmar si el backend garantiza
200 exclusivamente ni si siempre devuelve ambos campos de usuario. El esquema
anterior describe lo que el cliente acepta, no una garantia del servidor.

### 4. Como reacciona ante errores

En solicitudes iniciadas, login restaura `busy = false` y notifica a Angular
para refrescar la vista. No muestra `message`/`detail` arbitrarios del backend.
No hay reintento automatico; el boton vuelve a permitir intentarlo.

| Condicion | Mensaje exacto / reaccion de la UI |
|---|---|
| HTTP 401 o 403 | `No se pudo autenticar. Revisa tus credenciales.`; no navega al dashboard. |
| Timeout de 5000 ms | `La solicitud tardó demasiado. Intenta nuevamente.`; RxJS cancela la suscripcion al request; no navega. |
| Otro error HTTP, por ejemplo 400/404/429/500/503 | `No se pudo autenticar. Intenta nuevamente.`; no navega. No interpreta campos del cuerpo del error. |
| Fallo de red o CORS reportado por HttpClient | Mismo mensaje generico de autenticacion; el cliente no distingue la causa de red en la UI. |
| Objeto con token falsy: ausente, null, `""`, false o 0 | `El backend respondió sin token.`; no se registra una nueva sesion ni navega. |
| Token truthy no string, raiz null/arreglo/no objeto, usuario o sus campos con tipos invalidos | `El servicio devolvió una respuesta no válida.`; no se registra una nueva sesion ni navega. |
| JSON no parseable por HttpClient | Error de transporte/parseo: mensaje generico de autenticacion, no el mensaje del guard de objetos. |
| Token string expirado, firma incorrecta o formato no valido | **No se detecta aqui.** Si el cuerpo pasa el guard, se establece sesion y se consulta tareas; un eventual 401/403 de tareas se trata como se indica en ese endpoint. |
| Falla al guardar preferencias despues de autenticar | Aviso `No se pudieron guardar las preferencias.`; se registra advertencia segura. La sesion queda en memoria y la navegacion continua; el aviso se muestra tambien en dashboard. |
| Navegacion a dashboard cancelada o rechazada tras autenticar | Mensaje generico de autenticacion; el finally restaura el boton. La sesion ya registrada no se revierte. No equivale a rechazo del backend. |

Los errores de autenticacion anteriores al registro de sesion no limpian una
sesion preexistente: el servicio solo llama a `start` despues de validar.

Al inicializar SessionService, si falla la limpieza legada, lectura o validacion
de preferencias, se muestra `No se pudieron cargar las preferencias o limpiar
la sesión anterior. Se usan preferencias iniciales.`. No bloquea el POST.
Ese aviso no se borra al guardar defaults.

Evidencia: [traductor de errores](../src/app/utils/user-facing-error.ts#L10),
[login](../src/app/login/login.component.ts#L29),
[sesion y avisos](../src/app/services/session.service.ts),
[pruebas HTTP/timeout](../src/app/services/auth.service.spec.ts) y
[pruebas de login](../src/app/login/login.component.spec.ts).

### 5. Notas de seguridad

- Token y usuario viven solo en memoria del servicio raiz SessionService.
  No se escriben en localStorage/sessionStorage ni se introducen cookies.
  Recargar o abrir otra pestana requiere autenticar de nuevo.
- Al construir el servicio se intentan borrar `workshop_token` y
  `workshop_user` legados. Si Web Storage falla, se informa, no se garantiza
  que esas claves hayan podido borrarse.
- Solo persisten preferencias conocidas: theme string, showTips boolean y
  compact boolean, con defaults light/true/false. Datos invalidos producen
  recuperacion explicita con aviso.
- [La plantilla de login](../src/app/login/login.component.html#L39) interpola
  texto dentro de marcado estatico. Ya no usa `[innerHTML]` ni bypass de
  sanitizacion para los mensajes.
- El diagnostico registra solo operacion, categoria y status; no el password,
  token, usuario ni el objeto completo de error/request.
- La URL es HTTP localhost para laboratorio, no transporte apropiado de
  credenciales reales por Internet. La sesion en memoria no protege de scripts
  comprometidos durante una sesion activa.

## GET http://localhost:8000/api/tasks

### 1. Quien lo llama

[DashboardComponent.ngOnInit](../src/app/dashboard/dashboard.component.ts#L34)
obtiene la sesion en memoria y llama a
[TasksService.list](../src/app/services/tasks.service.ts#L25) con
`user.username || ''` y el token. TasksService hace el GET con HttpClient.

Sin sesion, dashboard navega a `/login` y **no consulta tareas**. La carga se
inicia al entrar al dashboard; no hay polling, reintento ni boton de recarga.
Mientras espera, se muestran esqueletos de carga.

### 2. Que envia

Sin body:

| Campo o cabecera | Ubicacion | Tipo / valor | Comportamiento |
|---|---|---|---|
| `owner` | Query param | string | Username de la sesion o cadena vacia. Se concatena directamente a `?owner=`; no se usa codificacion explicita ni HttpParams. |
| `Authorization` | Header explicito | Esquema Bearer, espacio y token de sesion | No se valida expiracion localmente. |
| `Accept` | Header automatico | `application/json, text/plain, */*` | Predeterminado de HttpClient. |
| `Content-Type` | Header | No se configura para este GET sin body | No se envia JSON de solicitud. |

**No hay timeout configurado para tareas.** Los 5000 ms del login no se aplican.

Ejemplo con owner/token del fixture de
[tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts#L21):

```http
GET http://localhost:8000/api/tasks?owner=student
Authorization: Bearer test-token
Accept: application/json, text/plain, */*
```

Tambien se prueban `?owner=` y el username `a&owner=b`, que actualmente genera
`?owner=a&owner=b`, no un valor escapado unico. Es descripcion del codigo actual,
no una recomendacion de serializacion.

### 3. Que espera recibir en exito

**Estado HTTP:** **200 OK** en los fixtures. TasksService no exige un status
especifico: acepta respuestas exitosas de HttpClient (2xx) solo si el cuerpo
es un arreglo valido. Un 204 sin cuerpo falla esa condicion.

| Campo | Tipo aceptado | Requerido / uso actual |
|---|---|---|
| Cuerpo raiz | Arreglo JSON | Obligatorio, directo: no `{ tasks: [...] }` ni `{ data: [...] }`. `[]` es exito vacio. |
| Cada elemento | Objeto JSON, no null ni arreglo | Obligatorio; un solo elemento invalido rechaza toda la lista. `{}` es aceptado por el guard actual. |
| `title` | string | Opcional; titulo visible de la tarjeta. Null u otro tipo se rechazan. |
| `description` | string | Opcional; texto descriptivo visible. Null u otro tipo se rechazan. |
| `status` | string | Opcional; determina filtro, etiqueta y clase visual. Null u otro tipo se rechazan. No es un enum cerrado. |
| `priority` | string, number, boolean o null | Opcional; etiqueta y orden. Objetos/arreglos se rechazan. |
| `owner` | string, number, boolean o null | Opcional; etiqueta de asignacion, no se usa para autorizar en el cliente. Objetos/arreglos se rechazan. |
| Campos adicionales | No restringidos por el guard | No se exigen ni se presentan por esta pantalla. |

Ejemplo exacto del fixture para owner `student`:

```http
HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "title": "Task",
    "description": "Description",
    "status": "CUSTOM",
    "priority": "HIGH",
    "owner": "student"
  }
]
```

El dashboard conserva la lista recibida y crea una lista visible sin mutar sus
objetos. Para ese ejemplo muestra titulo `Task`, descripcion `Description`,
etiqueta `HIGH · STUDENT` y estado `CUSTOM`.

Reglas de presentacion actuales:

- Excluye solo `status === 'ARCHIVED'` (comparacion sensible a mayusculas).
  `archived` no se excluye.
- Para etiqueta, priority/owner truthy se convierten a string y mayusculas.
  Valores falsy (ausentes, null, `""`, 0 o false) usan `NORMAL`/`SIN-ASIGNAR`.
- Ordena descending mediante comparacion lexical si ambas prioridades son
  strings; en los otros casos compara sus conversiones con `Number`.
  Devuelve -1 si la primera es mayor y 1 en otro caso, incluso igualdad.
  No hay mapa de urgencia de negocio ni desempate explicito.
- Traduce status ignorando mayusculas para la etiqueta: TODO -> Por hacer,
  IN_PROGRESS -> En progreso, DONE/COMPLETED -> Completado,
  RESUELTO -> Resuelto. Otros valores se presentan tal cual; ausente/vacio
  da etiqueta vacia.
- Cuando no quedan tareas visibles, muestra
  `No hay tareas para mostrar todavía.`, tambien si todas estaban ARCHIVED.
- Al terminar una carga exitosa, quita esqueletos y actualiza la vista.

Evidencia: [validador y GET](../src/app/services/tasks.service.ts),
[modelo Task](../src/app/models/task.models.ts),
[presentacion](../src/app/utils/task-presentation.ts),
[formato](../src/app/utils/legacy-format.ts),
[plantilla](../src/app/dashboard/dashboard.component.html) y
[fixture HTTP](../src/app/services/tasks.service.spec.ts#L21).

**Preguntas abiertas:** el frontend no confirma el codigo de exito exclusivo
del backend, si exige owner no vacio, ni el vocabulario/tipo de prioridad real.
La tabla documenta el guard efectivo, no requisitos inferidos del servidor.

### 4. Como reacciona ante errores

Si la consulta termina en error, dashboard establece `error`, ejecuta una
unica finalizacion dentro de NgZone, quita loading y actualiza la vista.
Mientras hay error, oculta la seccion de tarjetas y el mensaje de lista vacia.
Conserva la sesion y permite usar Cerrar sesion; no reintenta automaticamente.

| Condicion | Mensaje exacto / reaccion de la UI |
|---|---|
| HTTP 401/403, incluido token invalido o expirado rechazado por el servidor | `No se pudo cargar el dashboard. Intenta nuevamente.`; no renueva token, no limpia sesion y no redirige automaticamente a login. |
| Otros errores HTTP (400/404/429/500/503, etc.) | Mismo mensaje generico de dashboard; no interpreta `detail` del backend. |
| Red/CORS, o JSON que HttpClient no puede parsear | Mismo mensaje generico de dashboard; termina loading cuando HttpClient entrega el error. |
| Raiz no arreglo, envoltorio inesperado, elemento no objeto o campo con tipo invalido | `El servicio devolvió una respuesta no válida.`; rechaza la lista completa, no finge exito con `[]`. |
| Request que no responde | **No existe timeout propio:** los esqueletos pueden continuar hasta que la red entregue respuesta/error. El timeout de login no limita esta espera. |
| Error `TimeoutError` recibido por la funcion compartida | El traductor tiene mensaje `La solicitud tardó demasiado. Intenta nuevamente.`, pero TasksService no genera ese timeout mediante un operador propio. No documentarlo como timeout activo del GET. |
| Token string invalido que todavia no ha sido rechazado por el servidor | El cliente envia el request igualmente; no hay validacion criptografica o de expiracion local. |
| No existe sesion al iniciar dashboard | Navega a login antes del GET. Es una decision local, no una respuesta HTTP 401. |

Los avisos de preferencias son independientes del GET: se muestran en un
parrafo adicional y no activan por si solos la rama `error` de tareas.

Evidencia: [ngOnInit/finally](../src/app/dashboard/dashboard.component.ts#L34),
[mensajes](../src/app/utils/user-facing-error.ts#L10),
[plantilla](../src/app/dashboard/dashboard.component.html#L12),
[pruebas de red/HTTP/sin timeout](../src/app/services/tasks.service.spec.ts) y
[pruebas de estados](../src/app/dashboard/dashboard.component.spec.ts).

**Pregunta abierta:** que codigos devuelve realmente el backend por token
invalido/expirado o falta de autorizacion del owner no se puede determinar
desde este repositorio. La UI agrupa cualquier 401/403 de la forma descrita.

### 5. Notas de seguridad

- El bearer procede exclusivamente de la sesion en memoria, no de Web Storage.
  La API debe validar el token y autorizar owner; el filtro de query del
  frontend no prueba autorizacion ni aislamiento entre usuarios.
- Owner se concatena sin codificacion explicita. No se afirma explotacion,
  pero valores con separadores no se transmiten como un unico valor escapado.
- Los campos de tareas y los errores se interpolan como texto en la plantilla;
  no se usa `[innerHTML]` ni se muestran detalles internos del backend.
- Logout limpia sesion en memoria, usuario y listas visibles, navega a login
  y conserva preferencias. **No llama a un endpoint externo de logout,
  revocacion o refresh**; no se puede afirmar revocacion del token en servidor.
- No hay renovacion, reintento automatico ni logout automatico ante 401/403.
  La URL HTTP localhost se limita al laboratorio.
- Los diagnosticos de errores excluyen el bearer y el cuerpo del backend.

Evidencia: [logout](../src/app/dashboard/dashboard.component.ts#L54),
[sesion](../src/app/services/session.service.ts),
[plantilla](../src/app/dashboard/dashboard.component.html),
[errores seguros](../src/app/utils/user-facing-error.ts).

---

Documentos de contexto consultados: version anterior de este documento,
[README.md](../README.md), [PLAN.md](../PLAN.md),
[docs/GOOD_PRACTICES.md](GOOD_PRACTICES.md), [REGLAS.md](../REGLAS.md),
[RETO.md](../RETO.md) y [HALLAZGOS.md](../HALLAZGOS.md).
La fuente de verdad de cada campo y ejemplo son los servicios, modelos,
componentes, plantillas, configuracion y pruebas enlazados en sus apartados.
No se ejecutaron pruebas ni solicitudes externas para esta actualizacion
documental y no se modifico codigo.
