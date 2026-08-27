# OSRM local (Docker) — Nayarit, Jalisco y Sinaloa

Motor de ruteo alterno para RuterX: corre en Docker en local, no tiene límite
de peticiones (a diferencia del demo público `router.project-osrm.org` que usa
`calcularRutaOptimaYCarretera`), y puede pedirse que evite casetas de cuota
(`exclude=toll`). Cubre el corredor Tepic/Xalisco – Guadalajara – Puerto
Vallarta – Mazatlán.

## 1. Preparar los datos (una sola vez)

```powershell
cd osrm
.\preparar-osrm.ps1
```

Geofabrik no publica extractos por estado para México, solo el país completo.
El script descarga `mexico-latest.osm.pbf` (~1 GB), lo recorta con un bounding
box que cubre Nayarit + Jalisco + Sinaloa (`region.osm.pbf`, mucho más chico
que el país entero) y corre el pipeline **MLD** (`osrm-extract` →
`osrm-partition` → `osrm-customize`). El flag `exclude=toll` sólo funciona con
el algoritmo MLD, por eso se usa ese y no CH.

Puede tardar 15–40 minutos según la máquina, y consume varios GB de RAM
durante `osrm-extract`. Si el proceso muere sin más aviso que desaparecer,
sube la memoria de WSL2 en `%UserProfile%\.wslconfig`:

```ini
[wsl2]
memory=8GB
```

y reinicia Docker Desktop.

Todo lo descargado/generado queda en `osrm/data/` (gitignoreado). Para
refrescar el mapa con datos de OSM más recientes, borra `osrm/data/` y vuelve
a correr el script.

## 2. Levantar el servicio

```powershell
docker compose -f osrm/docker-compose.yml up -d
```

Queda escuchando en `http://localhost:5000` con `restart: unless-stopped`, así
que vuelve a levantarse solo cuando arranca Docker Desktop.

## 3. Verificar que responde

```powershell
curl "http://localhost:5000/nearest/v1/driving/-104.890221,21.453237"
```

Debe responder `"code":"Ok"`. Para comprobar que `exclude=toll` de verdad
cambia la ruta (Xalisco → Guadalajara):

```powershell
curl "http://localhost:5000/route/v1/driving/-104.890221,21.453237;-103.349609,20.659698?overview=false"
curl "http://localhost:5000/route/v1/driving/-104.890221,21.453237;-103.349609,20.659698?overview=false&exclude=toll"
```

Si ambas dan la misma `duration`/geometría, el tramo de autopista de cuota no
está bien etiquetado en OSM y conviene revisarlo antes de confiar en el botón.

## 4. Conectar la app

En `.env`:

```
VITE_OSRM_URL="http://localhost:5000"
```

Con el contenedor apagado, el botón "Mejorar con OSRM local" del panel queda
deshabilitado y el flujo normal (línea recta + OSRM público) sigue
funcionando igual que siempre.

## Apagar / borrar

```powershell
docker compose -f osrm/docker-compose.yml down
```

Los datos preprocesados sobreviven en `osrm/data/` aunque se baje el
contenedor; sólo hay que rehacer el pipeline si se borra esa carpeta.
