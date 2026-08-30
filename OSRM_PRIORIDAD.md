# Motor de ruteo OSRM local + prioridad de entrega

Guía de referencia de lo que se implementó y cómo levantar el mismo entorno en otra computadora (ej. la de trabajo). Todo el código ya está commiteado en la rama `geren` (commit `3a745ad`).

---

## 1. Qué se implementó

### 1.1 Motor de ruteo alterno (OSRM local, Docker)

Antes solo existía un motor "básico": ordena las paradas por distancia en línea recta (haversine) y usa el servidor **público** de OSRM (`router.project-osrm.org`) solo para dibujar la línea sobre la carretera — sin límite de uso garantizado, sin evitar casetas.

Se agregó un segundo motor que corre contra un **OSRM propio en Docker**, con el mapa de Nayarit + Jalisco + Sinaloa (cubre Tepic/Xalisco, Guadalajara, Puerto Vallarta y Mazatlán), configurado para **evitar autopistas de cuota** (`exclude=toll`) y sin límite de peticiones.

En el panel (`Admin → Mapa`), al seleccionar clientes aparecen dos botones:
- **"Trazar Ruta Óptima"** → motor básico, sin cambios.
- **"Mejorar con OSRM local"** → motor nuevo. Se deshabilita solo si el contenedor no está corriendo.

Archivos:
- `src/utils/rutasUtils.ts` — `calcularRutaOptimaOSRM()`, `osrmLocalDisponible()`.
- `src/components/MapaRutero.tsx` — estado, botones, manejo de errores.
- `src/components/mapa/PanelLateralMapaAdmin.tsx` — UI del segundo botón y el resumen de km/min.

### 1.2 Prioridad de entrega (3 niveles, por viaje)

Al seleccionar clientes para armar una ruta, cada uno puede marcarse como **Normal / Prioritario / Urgente**. No se guarda en Firestore ni en el cliente — es solo para ese viaje que estás armando en ese momento. Solo afecta al motor OSRM local (el básico no cambió).

**Cómo funciona por dentro:** ni OSRM ni VROOM (la alternativa "profesional" de ruteo con prioridades) tienen forma nativa de decir "visita a este primero" sin ser todo o nada — se investigó a fondo y ninguno lo resuelve como se necesitaba (ver sección 1.3). Se construyó un optimizador propio:

1. Se pide a OSRM el servicio `/table/` (matriz de tiempos reales de manejo entre todos los puntos, ya evitando cuota).
2. Se arma un recorrido inicial (vecino más cercano) y se refina con 2-opt, igual que el motor básico — pero la función de costo no es solo "minimizar tiempo total", es:

   ```
   costoTotal = Σ tiempo real de cada tramo
              + PESO_PRIORIDAD · Σ (nivel_prioridad − 1) · tiempo_de_llegada_acumulado
   ```

   Si un cliente prioritario queda "tarde" en la ruta, su tiempo de llegada es grande y penaliza fuerte el costo total → el algoritmo prefiere adelantarlo. Si todos son "Normal", el término extra es 0 y el resultado es idéntico a no tener prioridades.

   Es un **empuje suave**, no una regla dura: decide bien los empates cercanos, pero no va a mandar el camión a dar una vuelta enorme solo porque un cliente es "Urgente". Se validó numéricamente contra el contenedor real antes de darlo por bueno.

3. Con el orden final, se pide la geometría/distancia/duración real a `/route/` (igual que el motor OSRM sin prioridades).

El único número ajustable es `PESO_PRIORIDAD` en `src/utils/rutasUtils.ts` (hoy en `0.5`). Subirlo hace que la prioridad "empuje" más fuerte frente a la distancia.

### 1.3 Por qué no se usó VROOM

VROOM es el optimizador de rutas open-source más conocido y tiene un campo `priority` (0-100) — pero **no ordena la visita**, solo decide qué tarea se descarta cuando no caben todas en la ruta (confirmado en la documentación oficial y en los issues del proyecto). Para forzar orden en VROOM se necesitan ventanas horarias (`time_windows`), que es una herramienta distinta a "empuje suave" y hubiera significado meter un contenedor adicional (con su propia configuración de red apuntando al OSRM) para un mecanismo que igual no encajaba con lo que se pidió. Por eso se optó por construirlo directamente sobre `/table/`, que ya estaba disponible.

---

## 2. Instalar Docker Desktop en una PC nueva (arreglo de WSL2)

El error típico de "WSL no me deja correr Docker" casi siempre es que faltan habilitar las features de Windows, no un problema de Docker en sí.

**En PowerShell como Administrador:**

```powershell
wsl --install
```

Reinicia la PC. Si ya tenías WSL a medias y ese comando no cambia nada, fuerza las dos features manualmente:

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

Reinicia, y luego:

```powershell
wsl --set-default-version 2
wsl --update
```

**Confirma que la virtualización esté prendida en el firmware** (no en Windows):

```powershell
systeminfo | findstr /i "Virtualization"
```

Si dice `Virtualization Enabled In Firmware: No`, hay que activar Intel VT-x / AMD-V en el BIOS/UEFI. En laptops de trabajo a veces está bloqueado por política de TI — si no aparece la opción, pide a sistemas que lo habilite o te dé acceso.

Instala Docker Desktop desde [docker.com](https://www.docker.com/products/docker-desktop/) (el instalador ya marca "Use WSL 2 based engine" por defecto). Ábrelo y espera a que diga **"Engine running"** abajo a la izquierda.

> ⚠️ **Licenciamiento:** si la empresa tiene más de 250 empleados o más de $10M USD de ingresos anuales, Docker Desktop requiere una suscripción de pago para uso comercial (política de Docker Inc., no técnica). Vale la pena confirmarlo con quien maneje software en la empresa antes de instalarlo en una PC de trabajo.

---

## 3. Migrar el contenedor a la otra PC

El código (scripts de Docker, algoritmo de prioridad, UI) ya está en git — con un `git pull` en la rama `geren` lo tienes. Lo único que **no** viaja con git es el mapa ya procesado (`osrm/data/`, está en `.gitignore` porque pesa ~1.9 GB).

### Opción A — copiar los datos ya procesados (más rápido, sin depender de internet en el momento)

En esta PC, comprime la carpeta `osrm/data/region.osrm*` (son los únicos archivos que `osrm-routed` necesita para arrancar — **no** hace falta copiar `mexico-latest.osm.pbf` ni `region.osm.pbf`, esos solo sirven si quieres reprocesar desde cero):

```powershell
cd D:\Cir\rutasmart-app\osrm\data
Compress-Archive -Path region.osrm* -DestinationPath region-osrm-data.zip
```

Pasa `region-osrm-data.zip` (~1.9 GB) por USB, disco externo o red a la otra PC, y descomprímelo en la misma ruta: `D:\Cir\rutasmart-app\osrm\data\` (o la ruta equivalente donde clones el repo allá).

### Opción B — reprocesar desde cero (necesita internet, pero es 100% automático)

En la PC de trabajo, después de clonar el repo y con Docker ya corriendo:

```powershell
cd D:\Cir\rutasmart-app\osrm
.\preparar-osrm.ps1
```

Descarga `mexico-latest.osm.pbf` (~615 MB) de Geofabrik, lo recorta al bounding box de Nayarit+Jalisco+Sinaloa y corre el pipeline de OSRM (`osrm-extract` → `osrm-partition` → `osrm-customize`). Tarda entre 15 y 40 minutos según la máquina. Todos los detalles y qué hacer si se queda sin RAM están en `osrm/README.md`.

### En ambos casos, para terminar

```powershell
cd D:\Cir\rutasmart-app
docker compose -f osrm/docker-compose.yml up -d
```

Y agrega en el `.env` de esa PC (no se versiona, hay que ponerlo a mano cada vez que clonas el repo en una máquina nueva):

```
VITE_OSRM_URL="http://localhost:5000"
```

### Verificar que quedó bien

```powershell
curl "http://localhost:5000/nearest/v1/driving/-104.890221,21.453237"
```

Debe responder `"code":"Ok"`. Si además quieres confirmar que `exclude=toll` funciona en esa instalación:

```powershell
curl "http://localhost:5000/route/v1/driving/-104.890221,21.453237;-103.349609,20.659698?overview=false"
curl "http://localhost:5000/route/v1/driving/-104.890221,21.453237;-103.349609,20.659698?overview=false&exclude=toll"
```

La segunda debe dar más distancia/duración que la primera (la ruta libre de cuota es más larga). Si dan igual, el corredor de prueba no tiene bien etiquetada la cuota en OSM en esa región del mapa.

---

## 4. Alternativas a tener un contenedor corriendo en cada PC

Si no quieres repetir todo este proceso en cada máquina (casa, trabajo, laptop del chofer, etc.), el diseño ya lo permite sin tocar código: `VITE_OSRM_URL` es una variable de entorno, así que basta con apuntarla a donde sea que viva el contenedor.

| Opción | Cuándo conviene | Cómo |
|---|---|---|
| **Red local (LAN)** | Ambas PCs están en la misma red (oficina, mismo WiFi) | En la PC que hostea el contenedor, `docker-compose.yml` ya publica el puerto 5000 en todas las interfaces. Desde la otra PC, `VITE_OSRM_URL="http://IP_DE_LA_PC_HOST:5000"` (obtén la IP con `ipconfig`). |
| **VPN mesh (Tailscale / ZeroTier)** | Necesitas conectarte entre casa y trabajo sin exponer nada a internet público | Instala Tailscale en ambas máquinas (gratis para uso personal/pocos dispositivos), y usa la IP que te asigna Tailscale (ej. `100.x.x.x`) en `VITE_OSRM_URL`. Es la opción más segura para "quiero usar el de mi casa desde el trabajo". |
| **Túnel temporal (Cloudflare Tunnel / ngrok)** | Pruebas rápidas o demos, no para dejarlo así permanentemente | `cloudflared tunnel --url http://localhost:5000` te da una URL pública temporal. **OSRM no tiene autenticación propia** — cualquiera con esa URL puede consultarlo, así que no lo dejes corriendo indefinidamente. |
| **Servidor/VPS con IP fija** | Quieres que TODAS las PCs (oficina, casa, futuros choferes) usen el mismo OSRM sin duplicar el proceso ni la RAM en cada máquina | Sube el contenedor a un VPS (DigitalOcean, Hetzner, etc.), agrega un proxy (Nginx/Caddy) con HTTPS si la app corre en producción bajo https (los navegadores bloquean llamadas http:// desde una página https://), y pon esa URL en `VITE_OSRM_URL`. Es la ruta natural si esto deja de ser "para probar en mi compu" y pasa a producción. |

En cualquier caso donde el contenedor quede accesible desde fuera de tu propia máquina, considera poner al menos un firewall con lista blanca de IPs o un proxy con autenticación — OSRM por sí solo no tiene ningún control de acceso.

---

## 5. Problemas ya resueltos (por si se repiten)

- **`docker : Unable to find image ... locally` / errores raros en PowerShell aunque el comando sí funcionó:** en PowerShell 5.1, cualquier línea que un programa externo (`docker`) escriba en stderr se convierte en un "error" aunque el programa termine bien. La solución fue no usar `$ErrorActionPreference = "Stop"` en el script y confiar en los códigos de salida (`$LASTEXITCODE`) para detectar fallas reales — ya está así en `preparar-osrm.ps1`.
- **Geofabrik no tiene extractos por estado de México** (`nayarit-latest.osm.pbf` no existe, devuelve una página HTML de error en vez del archivo) — por eso el script descarga México completo y lo recorta con un bounding box.
- **OSRM responde `"NotImplemented"` al pedir el orden de paradas con `source=first&destination=any&roundtrip=false`:** esa combinación no está soportada. La solución fue pedir el orden como loop cerrado (`roundtrip=true`) y luego pedir la geometría real por separado con `/route/`.
- **`/trip/` no acepta `annotations` con lista de campos** (solo `true`/`false`), a diferencia de `/route/` y `/table/`.
