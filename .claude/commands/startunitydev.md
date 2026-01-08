---
description: Iniciar sesion de desarrollo Unity - carga contexto y verifica MCPs (project)
---

# Start Unity Dev Session

## Paso 1: Cargar Contexto

Lee estos archivos para entender donde quedamos:

1. `Donde_quedamos.md` - Estado actual del proyecto
2. `CLAUDE.md` - Reglas y arquitectura

## Paso 2: Verificar MCP Servers

### Unity MCP (puerto 8090)
Verifica conexion con: `Test-NetConnection -ComputerName localhost -Port 8090`
- Si no responde, indica: "Abre Unity > Tools > MCP Unity > Server Window > Start Server"
- Si hay errores de compilacion, revisar logs de Unity

### Chrome DevTools MCP
Para descargas de Mixamo y navegacion web:
- Verificar que este en `.mcp.json`
- Permite controlar Chrome: navegar, clicks, formularios, descargas

## Paso 3: Mostrar Estado

Resume brevemente:
- Fase actual del proyecto
- Tareas pendientes inmediatas
- Proximos pasos

## Paso 4: Continuar Trabajo

Pregunta al usuario si quiere continuar con las tareas pendientes o hacer algo diferente.
