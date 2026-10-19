# Workshop Login Frontend — Angular

> **Laboratorio intencionalmente vulnerable.** Ejecutar únicamente en equipos de capacitación, repositorios privados y puertos locales. No publicar en Internet ni desplegar en CERT/PROD.

Aplicación web Angular para autenticar a un estudiante mediante el backend Quarkus y consultar tareas desde la API Python.

## Rama del laboratorio

La rama `main` contiene deuda técnica deliberada para practicar:

- refactorización asistida por prompts y agentes;
- clean code y reducción de complejidad;
- análisis de dependencias con CVEs;
- revisión de seguridad del frontend;
- pruebas unitarias y cobertura.

## Ejecución

Requisitos: Node.js 22.12 o superior y npm.

```bash
npm install
npm start
```

Abrir `http://localhost:4200`.

Credenciales de laboratorio:

- `student` / `Workshop123!`
- `trainer` / `Trainer123!`

## Servicios esperados

- Backend de autenticación: `http://localhost:8080`
- API de tareas: `http://localhost:8000`

## Hallazgos sembrados

Consulta [RETO.md](RETO.md) para los casos originales y
[HALLAZGOS.md](HALLAZGOS.md) para su estado y evidencia de correccion.
El plan aprobado esta en [PLAN.md](PLAN.md).

## Flujo y validacion tras el refactor

- Contratos y servicios: [docs/ENDPOINTS.md](docs/ENDPOINTS.md).
- Token y usuario permanecen solo en memoria: recargar o abrir otra pestana
  requiere iniciar sesion de nuevo. Logout conserva preferencias.
- Solo se persisten preferencias validas conocidas; cualquier recuperacion
  o fallo de almacenamiento se informa.
- Los errores muestran texto local, no HTML ni detalles internos del backend.

```bash
npm test
npm run test:coverage
npm run build
npm run audit:workshop
```

En PowerShell con scripts deshabilitados, usar `npm.cmd` en lugar de `npm`.
La cobertura exige al menos 85% en lineas, sentencias, funciones y ramas,
incluyendo todo el TypeScript de `src` salvo pruebas.
Las pruebas HTTP usan respuestas simuladas, no requieren backends activos.
La auditoria aun reporta avisos en Angular y herramientas de build/testing;
no se garantiza un arbol libre de vulnerabilidades ni se recomienda publicar
el laboratorio.
