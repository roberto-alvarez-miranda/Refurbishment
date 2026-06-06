# Refurbishment - Frontend

Este es el cliente frontend para el proyecto Refurbishment, encargado de visualizar y gestionar el flujo de presupuestos y planos de obra.

## Stack Tecnológico
- **React 19**
- **Vite** para el bundling y entorno de desarrollo
- **TypeScript** para un tipado estático seguro
- **TailwindCSS** para el estilizado, implementando las reglas del sistema de diseño (Stitch)

## Componentes y Estructura
- `src/components/layout/`: Contiene `Sidebar` y `Header`, que definen la estructura global (cinta de navegación, información del proyecto).
- `src/components/dashboard/`: Contiene el `Dashboard` principal y `AIPreview`, este último muestra las mediciones detectadas por la IA estructuradas por categoría y permite su guardado en la base de datos (Firestore).
- `src/services/api.ts`: Cliente para conectarse a los endpoints del Backend FastAPI.

## Desarrollo
Para correr el proyecto en modo desarrollo:
```bash
npm install
npm run dev
```

Para generar un build de producción:
```bash
npm run build
```