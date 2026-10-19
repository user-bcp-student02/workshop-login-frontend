# Resultado de tests antes del refactor

Repositorio: `workshop-login-frontend`.
Fecha: **2026-10-19**.

Este informe recupera el resultado real de la **primera ejecucion exitosa**
de tests registrada en esta conversacion, antes de agregar caracterizaciones
y modificar codigo de produccion. No se han vuelto a ejecutar los tests ni
se ha restaurado una version anterior para generar este documento.

## Comando y resultado

Comando ejecutado dentro del repositorio:

```powershell
npm.cmd test
```

El script del manifiesto ejecuto `vitest run`.

| Dato | Resultado registrado |
|---|---|
| Runner | Vitest 3.2.4 |
| Archivos de pruebas | **1 aprobado de 1** |
| Tests | **1 aprobado de 1** |
| Tests fallidos | **0** |
| Archivo | `src/app/utils/legacy-format.spec.ts` |
| Tiempo del test | **2 ms** |
| Inicio | **15:29:38**, UTC-05:00 |
| Duracion total | **393 ms** |
| Codigo de salida | **0** |

## Salida de la ejecucion

Se conserva el contenido del resultado, omitiendo unicamente la ruta absoluta
del equipo y normalizando los indicadores visuales del terminal:

```text
> workshop-login-frontend@0.1.0 test
> vitest run

RUN v3.2.4

PASS src/app/utils/legacy-format.spec.ts (1 test) 2ms

Test Files  1 passed (1)
     Tests  1 passed (1)
  Start at  15:29:38
  Duration  393ms (transform 30ms, setup 0ms, collect 30ms,
                  tests 2ms, environment 0ms, prepare 113ms)
```

## Que se comprobaba

La suite inicial tenia un unico caso de `formatTaskLabel`:

- Entrada: `{ priority: 'high', owner: 'student' }`.
- Salida esperada: `HIGH · STUDENT`.

La prueba actual esta en
[src/app/utils/legacy-format.spec.ts](src/app/utils/legacy-format.spec.ts),
pero ese archivo ya fue ampliado durante el refactor. El resultado anterior
describe su estado original, no su cantidad actual de casos.

## Intentos previos y limites

- El descubrimiento mediante la herramienta integrada de tests devolvio
  `No tests found in the files`. Eso no fue una ejecucion exitosa de la suite.
- El intento `npm test` en PowerShell fallo porque la politica de ejecucion
  bloqueo `npm.ps1`; Vitest no llego a ejecutarse.
- Se ejecuto entonces `npm.cmd test`, con el resultado aprobado anterior,
  sin modificar la politica de PowerShell.
- No se ejecuto cobertura en esa primera corrida: **no hay un porcentaje
  de cobertura inicial medido**.
- No se probaron login, sesion, tareas, logout, DOM ni integracion HTTP.
  Tampoco se ejecutaron build o type-check como parte de esa corrida.
- Este resultado no debe confundirse con la caracterizacion posterior de
  **46 tests**, tambien anterior a cambios de produccion, ni con los
  **95 tests finales** del refactor.

Los resultados posteriores estan en [RESULTADOTESTDESPUES.md](RESULTADOTESTDESPUES.md).
El seguimiento de hallazgos permanece exclusivamente en
[HALLAZGOS.md](HALLAZGOS.md).
