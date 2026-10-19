# Plan de correccion del frontend

## Alcance y base de analisis

Seleccion confirmada por el usuario: H-01 a H-09, todos en estado Pendiente en
[HALLAZGOS.md](HALLAZGOS.md). Los motivos que siguen son una propuesta de
priorizacion tecnica, ya que no se indicaron motivos individuales.
Este documento no cambia estados ni sustituye la matriz de seguimiento.
## Aprobacion humana registrada

El 2026-10-19 el usuario aprobo en el formulario de esta conversacion:
"Apruebo registrar e implementar el plan con las diferencias descritas".
La aprobacion incluye H-01 a H-09, sesion en memoria sin persistencia entre
recargas/pestanas, mensajes locales seguros, preferencias conocidas validas
y errores explicitos para respuestas malformadas. Los contratos HTTP se
conservan. Dependencias nuevas requieren aprobacion adicional.
Se autoriza regenerar e incorporar el lockfile existente exclusivamente con
los cambios de dependencias previstos; se conserva una copia previa en Git
antes de regenerarlo.

Se consultaron [docs/ENDPOINTS.md](docs/ENDPOINTS.md),
[docs/GOOD_PRACTICES.md](docs/GOOD_PRACTICES.md) y [REGLAS.md](REGLAS.md),
y se leyeron los componentes, la plantilla de login, la utilidad, su prueba,
el manifiesto y las configuraciones de TypeScript y Vitest.
No se verificaron CVEs ni contratos reales de los backends.

La ejecucion anterior de `npm.cmd test` aprobo un archivo y un test de la
utilidad; no es evidencia de cobertura del flujo ni de un porcentaje medido.
Este plan no agrega pruebas ni vuelve a ejecutarlas.

## Contrato que no se cambia

- POST `http://localhost:8080/auth/login`, con los valores originales de
  `username` y `password`, `client: 'angular-workshop'` y timeout de 5000 ms.
  No agregar bearer token a esta solicitud.
- Consumir `token` y `user` de la respuesta de login sin exigir nuevos campos
  al backend; el usuario permite mostrar `displayName || username`.
- GET `http://localhost:8000/api/tasks?owner=` seguido del username o cadena
  vacia, con cabecera `Authorization: Bearer <token>`, sin timeout nuevo.
  No cambiar la serializacion actual del parametro durante este refactor.
- La respuesta de tareas sigue siendo un arreglo directo. Mantener el filtro
  exacto `status !== 'ARCHIVED'`, etiquetas, traducciones y comparacion actual
  de prioridad. No introducir un orden semantico nuevo.
- Conservar rutas, ausencia de consulta sin sesion y recorrido
  login -> guardar sesion -> consultar tareas -> cerrar sesion.
  No agregar endpoints de renovacion, logout o revocacion.
- Logout conserva preferencias. No introducir redireccion automatica en
  401/403 como efecto lateral del cambio de cliente HTTP.

No se editara [docs/ENDPOINTS.md](docs/ENDPOINTS.md) en esta etapa.
Las propuestas de almacenamiento y presentacion siguientes distinguen el
contrato HTTP intacto de cambios locales de UX que requieren aprobacion.

## Estrategia comun y riesgos funcionales

1. Escribir y ejecutar caracterizaciones del comportamiento existente antes
   de modificar produccion. Las expectativas de comportamiento nuevo se
   escribiran como pruebas de aceptacion separadas; no se presentaran como
   caracterizaciones ya satisfechas.
2. Hacer cambios pequenos: componentes para interaccion y presentacion;
   `AuthService` para autenticacion; `TasksService` para consulta;
   `SessionService` como unica autoridad de sesion y almacenamiento.
   Son nombres propuestos, no archivos existentes ni convenciones adicionales.
3. Usar interfaces de request/response, campos primitivos y errores `unknown`
   con guards. Evitar `any`, casts que simulen contratos y abstracciones
   genericas de repositorio o transporte innecesarias.
4. Llevar URLs a `src/environments/environment.ts`; centralizar claves,
   timeout, identificador de cliente y preferencias iniciales donde los
   consuma su responsable. No repetir valores magicos en los componentes.
5. Compartir solo logica realmente comun: traduccion segura de errores,
   sesion y finalizacion de carga. Validaciones con retornos anticipados.
6. Conservar mensajes de validacion y estados visibles; separar errores de
   transporte de mensajes de usuario. Los detalles internos no se imprimen
   en la UI; el registro explicito debe omitir credenciales, bearer tokens
   y objetos de error que incluyan el request completo.

Riesgos principales: cambiar persistencia y recarga (H-01), alterar mensajes
y formato (H-02), perder equivalencia de timeout o errores al migrar HTTP
(H-03), cambiar la mezcla de preferencias (H-04), romper orden de navegacion
y almacenamiento al extraer servicios (H-05), restringir respuestas antes
aceptadas al tipar (H-06), y dejar una vista cargando fuera de Angular (H-09).
No se corrigen otros comportamientos incidentalmente.

## H-01 — Token persistido en localStorage

**Hallazgo y motivo.** H-01 de [HALLAZGOS.md](HALLAZGOS.md), severidad alta.
Priorizar la reduccion de persistencia de una credencial accesible a scripts,
sin afirmar que exista una explotacion demostrada.

**Problema.** El token se escribe en
[login.component.ts:47](src/app/login/login.component.ts#L47) y se recupera en
[dashboard.component.ts:36](src/app/dashboard/dashboard.component.ts#L36).
El almacenamiento esta repartido entre componentes.

**Cambio propuesto.** Introducir una unica instancia raiz de `SessionService`
con token y usuario en memoria. Login registra la sesion antes de navegar;
dashboard la consulta; logout la limpia. Persistir solo preferencias no
sensibles mediante el mismo responsable y claves centralizadas. No migrar un
token antiguo a memoria: retirar las claves legadas de token/usuario de forma
explicita. Ante fallo del almacenamiento de preferencias, informar/registrar
el fallo sin fingir que se guardaron.

Esta es una alternativa acotada al laboratorio, no una solucion completa
contra XSS: un script comprometido durante la sesion sigue siendo un riesgo.
Cookies HttpOnly exigirian coordinacion de backend fuera del alcance y no se
introducen. `sessionStorage` tampoco se propone como proteccion frente a XSS.

**Diferencia que requiere aprobacion antes de implementar.** Recargar o abrir
otra pestana requerira volver a autenticarse; la sesion existente en
`localStorage` dejara de recuperarse. No crear persistencia encubierta para
evitar esa diferencia. Si no se aprueba, limitar el incremento a centralizar
la sesion, sin dar H-01 por corregido.

**Archivos a tocar en implementacion.** Existentes:
[login.component.ts](src/app/login/login.component.ts),
[dashboard.component.ts](src/app/dashboard/dashboard.component.ts).
Nuevos propuestos: `src/app/services/session.service.ts`,
`src/app/models/auth.models.ts`, `src/app/models/preferences.models.ts`
y sus pruebas. Reutilizar estos archivos con H-04/H-05/H-06.

**Caracterizacion antes de tocar produccion.** En nuevos
`src/app/login/login.component.spec.ts` y
`src/app/dashboard/dashboard.component.spec.ts`, simular Axios, router y
almacenamiento: login guarda token/usuario antes de navegar; dashboard envia
ese token; sin token no hace GET; logout borra token/usuario y conserva
preferencias. Caracterizar tambien la recuperacion tras recrear componentes.
Despues agregar `src/app/services/session.service.spec.ts`: sesion compartida
entre vistas, borrado al salir, nueva instancia sin sesion, token no escrito
en Web Storage y limpieza de claves legadas. La expectativa de recarga se
cambia solo con aprobacion y se documenta como cambio intencional.

## H-02 — Mensaje dinamico renderizado como HTML

**Hallazgo y motivo.** H-02 de [HALLAZGOS.md](HALLAZGOS.md), severidad media.
Seleccion por superficie visible y sustitucion local verificable, no por
un supuesto XSS confirmado.

**Problema.** Se concatena usuario y mensaje remoto en
[login.component.ts:55](src/app/login/login.component.ts#L55) y se usa
[[innerHTML]](src/app/login/login.component.html#L39).
La sanitizacion predeterminada de Angular no equivale a un bypass confirmado.

**Cambio propuesto.** Sustituir HTML concatenado por estado de mensaje tipado
y texto interpolado. Si se conserva enfasis o salto de linea, definir
`strong` y separacion estaticos en la plantilla, nunca dentro del dato.
No usar `bypassSecurityTrustHtml`. Compartir un traductor pequeno de errores
para login y tareas, con mensajes controlados por la aplicacion y registro
seguro de diagnostico; no trasladar mensajes arbitrarios del backend a la UI.

**Diferencia que requiere aprobacion.** Los detalles tecnicos del backend se
sustituyen por texto local comprensible; el marcado recibido se trata como
texto o no se muestra, nunca se interpreta. Mantener mensajes de campos
requeridos, ausencia de token y estados de carga. No cambia requests.

**Archivos a tocar en implementacion.** Existentes:
[login.component.ts](src/app/login/login.component.ts),
[login.component.html](src/app/login/login.component.html),
[dashboard.component.ts](src/app/dashboard/dashboard.component.ts).
Nuevos: `src/app/utils/user-facing-error.ts` y
`src/app/utils/user-facing-error.spec.ts`; pruebas de los dos componentes.

**Caracterizacion antes de tocar produccion.** Cubrir mensajes actuales para
usuario/password vacios, respuesta sin token y rechazo con `message` o fallback,
incluido `busy = false`. Guardar la distincion entre error de login y `detail`
de tareas antes de normalizarlos. Como aceptacion posterior, verificar que
entrada con etiquetas no crea elementos desde datos, que no se expongan
detalles internos y que la plantilla preserve mensajes y deshabilitado.
Una asercion sobre una cadena TypeScript no sustituye la comprobacion del DOM;
ver la estrategia de prueba de H-07.

## H-03 — Axios 0.31.0 en componentes

**Hallazgo y motivo.** H-03 de [HALLAZGOS.md](HALLAZGOS.md), severidad media.
Seleccion para reducir una dependencia directa y alinear HTTP con Angular;
no presupone CVEs aplicables.

**Problema.** La version se declara en [package.json:19](package.json#L19);
ambos componentes usan Axios directamente y dependen de su forma de errores.

**Cambio propuesto.** Migrar llamadas a `HttpClient` dentro de `AuthService`
y `TasksService`. Usar `provideHttpClient` al arrancar y RxJS ya declarado
para aplicar timeout de 5000 ms solo al login y, si se conservan metodos async,
convertir con `firstValueFrom`. Ajustar el traductor de H-02 a
`HttpErrorResponse`/timeout sin exponer requests. No agregar interceptores de
renovacion ni bearer global. Construir la misma URL de tareas, sin cambiar
inadvertidamente el owner mediante un serializador distinto.

Eliminar Axios del manifiesto y del lockfile solo tras comprobar que no quedan
consumidores. Revisar avisos de las dependencias restantes con evidencia,
sin prometer ausencia de CVEs por retirar un paquete. No se necesita una nueva
dependencia: `HttpClient` pertenece a `@angular/common` ya declarado.

**Archivos a tocar en implementacion.** Existentes:
[package.json](package.json), [main.ts](src/main.ts),
[login.component.ts](src/app/login/login.component.ts),
[dashboard.component.ts](src/app/dashboard/dashboard.component.ts).
`package-lock.json` ya existe sin seguimiento en Git: preservarlo y coordinar
su incorporacion antes de regenerarlo, sin sobrescribir trabajo previo.
Nuevos: `src/app/services/auth.service.ts`,
`src/app/services/tasks.service.ts` y sus respectivos `.spec.ts`.

**Caracterizacion antes de tocar produccion.** Fijar las llamadas Axios
exactas con mocks: metodo, URL, cuerpo, client, timeout y bearer solo en GET;
respuesta sin token, rechazo y lista directa. Incluir username vacio y con
caracteres especiales para detectar cambios de serializacion. Tras migrar,
repetir esas expectativas con las utilidades de testing de HttpClient,
simular 401/403, error de red y timeout con reloj controlado. Verificar que
no aparecen solicitudes extra ni logout automatico y que el GET no adquiere
un timeout nuevo.

## H-04 — Lodash para mezclar preferencias

**Hallazgo y motivo.** H-04 de [HALLAZGOS.md](HALLAZGOS.md), severidad media.
Seleccion por uso localizado y oportunidad de reducir dependencias, sin
atribuir vulnerabilidades no verificadas.

**Problema.** [login.component.ts:24](src/app/login/login.component.ts#L24)
parsea JSON y usa mezcla profunda sin contrato de preferencias.
Reemplazarla directamente por un spread no garantiza equivalencia.

**Cambio propuesto.** Llevar carga/guardado de preferencias a `SessionService`
y definir `Preferences` para theme, showTips y compact, con valores iniciales
centralizados. Caracterizar primero `merge`; para preferencias planas validas,
usar una funcion nativa pequena de lectura y combinacion, sin reimplementar
una biblioteca generica de mezcla profunda. Errores de parseo/validacion se
registran de forma segura y se comunican; el uso de valores iniciales debe ser
una recuperacion explicita, no un fallo silencioso.

**Diferencia que requiere aprobacion.** Objetos anidados, claves desconocidas
y tipos invalidos pueden ser aceptados hoy por `merge`. Proponer conservar
solo las tres preferencias validas es una restriccion local del almacenamiento,
no una convencion ya existente. Acordarla antes de eliminar Lodash; si se exige
compatibilidad arbitraria, revisar actualizacion con evidencia en vez de
simular equivalencia mediante spread. No cambia el contrato HTTP.

**Archivos a tocar en implementacion.** Existentes:
[login.component.ts](src/app/login/login.component.ts),
[package.json](package.json) y lockfile bajo la precaucion de H-03.
Nuevos compartidos con H-01: servicio de sesion y modelo de preferencias;
`src/app/services/session.service.spec.ts`. Eliminar `@types/lodash` solo
cuando tampoco queden usos tipados de la biblioteca.

**Caracterizacion antes de tocar produccion.** Casos sin clave, objeto vacio,
preferencias parciales, false explicito, JSON malformado, null, valores de
tipos incorrectos, claves adicionales y objetos anidados; observar resultado
y registro actual sin dar resultados por anticipado. Comprobar que login
guarda las preferencias y logout no las borra. Las restricciones aprobadas
tendran pruebas de aceptacion diferenciadas.

## H-05 — Responsabilidades acopladas

**Hallazgo y motivo.** H-05 de [HALLAZGOS.md](HALLAZGOS.md), severidad media.
Seleccion como soporte estructural para sesion, transporte y pruebas comunes.

**Problema.** Los dos componentes combinan HTTP, acceso a almacenamiento y
navegacion; dashboard tambien transforma tareas. Evidencia:
[login.component.ts:41](src/app/login/login.component.ts#L41) y
[dashboard.component.ts:35](src/app/dashboard/dashboard.component.ts#L35).

**Cambio propuesto.** Extraer los servicios especificos descritos arriba y
configuracion de ambiente. Los componentes mantienen interaccion, estado de
presentacion y navegacion; no leen/escriben Web Storage ni construyen URLs.
`AuthService` autentica usando el transporte y registra sesion por el servicio
unico; `TasksService` consulta el endpoint; una funcion pura transforma la
lista para presentacion usando la utilidad existente. No agregar una fachada
generica ni duplicar servicios para cada hallazgo.

Centralizar `angular-workshop` y timeout en autenticacion, claves y defaults
en sesion, URLs en ambiente. Mantener el orden guardar -> navegar -> consultar,
el filtro exacto y la comparacion de prioridad; no arreglar el comparador
incidentalmente. Aplicar H-08 y H-09 en sus propios incrementos.

**Archivos a tocar en implementacion.** Existentes: ambos componentes,
[main.ts](src/main.ts) y
[legacy-format.ts](src/app/utils/legacy-format.ts) solo si lo exige el tipado.
Nuevos compartidos: servicios de autenticacion, tareas y sesion; modelos;
`src/environments/environment.ts`; `src/app/utils/task-presentation.ts`
y sus pruebas. No tocar rutas o plantillas sin necesidad funcional.

**Caracterizacion antes de tocar produccion.** Flujo completo simulado sin
backends: login exitoso, almacenamiento antes de navegar, dashboard con/sin
sesion, encabezado bearer, errores sin redireccion extra y logout. Verificar
ARCHIVED exacto, etiquetas con defaults, estados conocidos/desconocidos y
orden actual con prioridades distintas e iguales. Tras extraer, mantener
aserciones de comportamiento y probar servicios de forma aislada.

## H-06 — Uso extensivo de any

**Hallazgo y motivo.** H-06 de [HALLAZGOS.md](HALLAZGOS.md), severidad media.
Seleccion para dar contratos a los nuevos limites y detectar regresiones
antes de ejecucion.

**Problema.** Estado, respuestas y utilidad usan `any`; por ejemplo,
[login.component.ts:16](src/app/login/login.component.ts#L16),
[dashboard.component.ts:23](src/app/dashboard/dashboard.component.ts#L23) y
[legacy-format.ts:1](src/app/utils/legacy-format.ts#L1).

**Cambio propuesto.** Definir interfaces propias para login, usuario, tarea
y preferencias a partir de los campos realmente consumidos. Flags booleanos,
mensajes string y listas tipadas; errores `unknown` con guards. Separar tarea
recibida de tarea visible con etiqueta. No inferir campos obligatorios o
enums exhaustivos a partir de una sola pantalla; conservar estados desconocidos
y fallbacks actuales. Validar limites de red/JSON sin casts dobles ni
respuestas vacias que finjan exito.

Si falta informacion sobre tipos reales, coordinar ejemplos de contrato sin
leer otros componentes ni imponer cambios al backend. Para respuestas
malformadas proponer error visible en vez de crash; aprobar esa diferencia
antes de aplicarla. Tipar no debe cambiar respuestas validas.
Activar comprobacion estricta de TypeScript y plantillas una vez tipadas las
superficies afectadas, sin suprimir errores ni ampliar a refactors ajenos.

**Archivos a tocar en implementacion.** Existentes: ambos componentes,
[legacy-format.ts](src/app/utils/legacy-format.ts),
[legacy-format.spec.ts](src/app/utils/legacy-format.spec.ts) y
[tsconfig.json](tsconfig.json). Nuevos compartidos:
`src/app/models/auth.models.ts`, `src/app/models/task.models.ts`,
`src/app/models/preferences.models.ts`, servicios y guardas solo necesarias.

**Caracterizacion antes de tocar produccion.** Cubrir campos opcionales
realmente usados, nombre visible con fallback, tareas sin prioridad/owner,
estados desconocidos, ausencia de token y respuestas malformadas. Registrar
que algunos casos pueden fallar hoy; no convertir ese fallo en un resultado
exitoso ficticio. Despues probar errores explicitos y ejecutar compilacion
estricta y build de plantillas; mantener el caso existente de la utilidad.

## H-07 — Pruebas limitadas a una utilidad

**Hallazgo y motivo.** H-07 de [HALLAZGOS.md](HALLAZGOS.md), severidad media.
Seleccion como prerrequisito de los cambios de produccion restantes.

**Problema.** Solo hay un caso en
[legacy-format.spec.ts:5](src/app/utils/legacy-format.spec.ts#L5);
[vitest.config.ts](vitest.config.ts) usa entorno Node.
No existe aun cobertura demostrada del flujo.

**Cambio propuesto.** Ampliar la utilidad y crear las caracterizaciones de
componentes/flujo antes de extraer servicios; despues agregar pruebas unitarias
de servicios, traductor de errores y transformacion de tareas. Usar Vitest
existente, mocks tipados de transporte/router/almacenamiento y reloj controlado;
sin llamadas reales ni credenciales reales.

Para logica sin DOM usar Node y dependencias simuladas. Para H-02 comprobar la
vista en navegador local con respuestas de laboratorio simuladas: texto,
ausencia de nodos creados por entrada, boton y transicion al dashboard.
Esto no se contara como cobertura automatizada de plantilla. Si se requiere
automatizar DOM con TestBed, primero validar su arranque con Angular y el
runner actual; solo si falta soporte, justificar y pedir aprobacion de un
entorno DOM de desarrollo como `jsdom`, con compatibilidad verificada. No
agregarlo preventivamente ni cambiar de runner.

**Archivos a tocar en implementacion.** Existentes:
[legacy-format.spec.ts](src/app/utils/legacy-format.spec.ts),
[vitest.config.ts](vitest.config.ts) y, solo con justificacion aprobada,
[package.json](package.json) y lockfile.
Nuevos `.spec.ts` junto a componentes, servicios y funciones indicados en
los otros apartados. No crear un segundo registro de estados.

**Caracterizacion previa.** Ejecutar primero la suite existente; luego cubrir
sin cambiar produccion login/validacion, sesion, GET, presentacion y logout,
con ramas de error. Los tests de aceptacion del comportamiento cambiado se
agregan aparte. Medir cobertura del codigo modificado incluyendo archivos no
ejercitados; no declarar 85% basandose solo en archivos importados.
Usar como gate al menos 85% en lineas, sentencias, funciones y ramas del
conjunto modificado, sin excluir rutas dificiles para inflar el resultado.

## H-08 — Anidamiento en login

**Hallazgo y motivo.** H-08 de [HALLAZGOS.md](HALLAZGOS.md), severidad baja.
Seleccion por mejora pequena y revisable tras proteger la validacion.

**Problema.** Validaciones, llamada y comprobacion del token se anidan en
[login.component.ts:33](src/app/login/login.component.ts#L33).

**Cambio propuesto.** Retornos anticipados para campos requeridos, funcion
pequena compartida para detectar entrada vacia si evita duplicacion real y
una sola secuencia async delegada al servicio. Mantener prioridad del mensaje
de usuario sobre password, valores enviados sin recortar, y `busy` restaurado
en `finally`. No introducir un motor de validacion.

**Archivos a tocar en implementacion.**
[login.component.ts](src/app/login/login.component.ts) y
`src/app/login/login.component.spec.ts`; reutilizar AuthService y modelos,
sin nuevas dependencias.

**Caracterizacion antes de tocar produccion.** Ambos vacios, solo password
vacio, espacios, null/undefined en limites que hoy los admiten, credenciales
validas, respuesta sin token, fallo HTTP y navegacion rechazada. Verificar
mensaje prioritario, numero de llamadas, valores enviados y restauracion
de `busy`; no eliminar cobertura de entradas invalidas al estrechar tipos.

## H-09 — Finalizacion de carga duplicada

**Hallazgo y motivo.** H-09 de [HALLAZGOS.md](HALLAZGOS.md), severidad baja.
Seleccion por eliminacion localizada de duplicacion con riesgo visible de
dashboard bloqueado si se pierde sincronizacion.

**Problema.** Exito y error repiten entrada a zona, fin de carga y deteccion
de cambios en
[dashboard.component.ts:59](src/app/dashboard/dashboard.component.ts#L59) y
[dashboard.component.ts:66](src/app/dashboard/dashboard.component.ts#L66).

**Cambio propuesto.** Dejar asignaciones de resultado y error en sus ramas y
una unica finalizacion en `finally`, dentro de `zone.run`, que quite loading
y actualice la vista. Si las asignaciones requieren zona, agrupar el cambio
visible completo mediante un unico helper pequeno tipado; elegir segun la
prueba de vista, no agregar ambas soluciones. No retirar `NgZone` o
`detectChanges` solo porque se cambie de cliente HTTP.
No capturar errores para convertirlos en lista vacia ni borrar la sesion
automaticamente.

**Archivos a tocar en implementacion.**
[dashboard.component.ts](src/app/dashboard/dashboard.component.ts) y
`src/app/dashboard/dashboard.component.spec.ts`. No cambiar plantilla ni
servicios salvo necesidad demostrada por las pruebas.

**Caracterizacion antes de tocar produccion.** Promesa pendiente mantiene
loading; resolucion presenta tareas y lo termina; rechazo presenta error y lo
termina. Simular resolucion fuera de zona y comprobar actualizacion visual,
ademas de espias de finalizacion; conservar ruta sin token sin GET.
Tras refactor, exigir una sola finalizacion por carga completada.

## Orden de implementacion y validacion futura

1. H-07: caracterizaciones de los componentes actuales y utilidad. Resolver
   las aprobaciones de UX de H-01/H-02/H-04 y las dudas de contratos de H-06
   antes de implementar sus diferencias.
2. H-05 y H-06: extraer limites tipados, sesion centralizada inicialmente con
   el almacenamiento actual y configuracion; probar equivalencia.
3. H-03: migrar transporte y verificar contrato antes de retirar Axios.
4. H-02: texto y errores seguros con expectativas de UX aprobadas.
5. H-04: preferencias tipadas y retiro de Lodash solo tras verificar equivalencia
   para datos validos y aprobar restricciones.
6. H-01: pasar la sesion centralizada a memoria solo si se aprueba el efecto en
   recarga/pestanas; mantener HTTP intacto.
7. H-08 y H-09: simplificaciones con pruebas; pueden revisarse por separado.
8. Completar H-07: cobertura medida del codigo modificado y prueba visual del
   flujo integrado. Actualizar solo [HALLAZGOS.md](HALLAZGOS.md) para reflejar
   avances verificados, sin duplicar estados aqui.

En cada incremento ejecutar el selector Vitest mas pequeno que lo cubra;
al cerrar el conjunto, `npm.cmd test`, `npm.cmd run test:coverage` y
`npm.cmd run build`. Verificar umbrales sobre el conjunto modificado y
compilacion estricta; no reducir quality gates ni ocultar alertas.
Tras modificar manifiestos, regenerar dependencias con npm y verificar el
lockfile; usar `npm.cmd run audit:workshop` como evidencia de auditoria,
sin confundir alertas reportadas con explotabilidad del navegador.

No se instalan paquetes ni se modifican codigo, configuraciones, contratos
o estados durante la elaboracion de este plan.
