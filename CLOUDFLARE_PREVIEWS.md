# CORS para previews de frontend

Los orígenes exactos configurados mantienen su comportamiento. Los previews
están desactivados por defecto. Para activarlos únicamente en el despliegue de
pre, configurar:

```env
CORS_PREVIEW_DOMAINS=designer.leia.ovh,workbench.leia.ovh
```

Esto admite HTTPS en hosts `pre-<número>.<dominio>` y los hosts `branch-...`
generados por el comando de previews de los frontends. No permite otros
dominios, puertos, subdominios anidados ni URLs con rutas o credenciales.
Los dominios estables de pre siguen incluidos en las variables de orígenes
exactos que ya utiliza el servicio.

Dejar `CORS_PREVIEW_DOMAINS` vacío o ausente en producción. La autenticación y
los permisos de la API siguen aplicándose a todas las peticiones. En Workbench,
el mismo control se utiliza para HTTP y Socket.IO.

Validación: `npx vitest run tests/frontendOrigins.test.js`.
