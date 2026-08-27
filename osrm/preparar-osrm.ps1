<#
  Prepara los datos para el contenedor OSRM local (Nayarit + Jalisco + Sinaloa).
  Corre una sola vez (o cuando se quiera refrescar el mapa con datos de OSM más
  recientes). Después de esto, el servicio se levanta con:

      docker compose -f osrm/docker-compose.yml up -d

  Nota: Geofabrik no publica extractos por estado para México (solo el país
  completo), así que se descarga mexico-latest.osm.pbf (~1 GB) y se recorta
  con un bounding box que cubre Nayarit + Jalisco + Sinaloa antes de correr el
  pipeline de OSRM, para no tener que procesar todo el país.

  Requisitos: Docker Desktop corriendo. Puede tardar bastante (la descarga y el
  recorte del país completo son lo más pesado); si osrm-extract muere sin más
  mensaje que el proceso desaparece, sube la memoria asignada a Docker/WSL2 en
  %UserProfile%\.wslconfig (memory=8GB o más) y reinicia Docker Desktop.
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir = Join-Path $scriptDir "data"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

$mexicoUrl = "https://download.geofabrik.de/north-america/mexico-latest.osm.pbf"
$mexicoDestino = Join-Path $dataDir "mexico-latest.osm.pbf"

Write-Host "== Descargando mexico-latest.osm.pbf de Geofabrik (~1 GB) ==" -ForegroundColor Cyan
if (Test-Path $mexicoDestino) {
    Write-Host "Ya existe mexico-latest.osm.pbf, se omite descarga."
} else {
    Invoke-WebRequest -Uri $mexicoUrl -OutFile $mexicoDestino
}

# Bounding box (izquierda,abajo,derecha,arriba) que cubre Nayarit + Jalisco +
# Sinaloa con margen (incluye Tepic/Xalisco, Guadalajara, Puerto Vallarta y
# Mazatlán).
$bbox = "-109.6,18.8,-101.4,27.1"

Write-Host "== Recortando a Nayarit + Jalisco + Sinaloa (bbox $bbox) ==" -ForegroundColor Cyan
docker run --rm -v "${dataDir}:/data" stefda/osmium-tool osmium extract `
    -b $bbox /data/mexico-latest.osm.pbf -o /data/region.osm.pbf --overwrite
if ($LASTEXITCODE -ne 0) { throw "osmium extract falló (código $LASTEXITCODE)" }

Write-Host "== osrm-extract (perfil car.lua) ==" -ForegroundColor Cyan
docker run --rm -v "${dataDir}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/region.osm.pbf
if ($LASTEXITCODE -ne 0) { throw "osrm-extract falló (código $LASTEXITCODE)" }

Write-Host "== osrm-partition ==" -ForegroundColor Cyan
docker run --rm -v "${dataDir}:/data" osrm/osrm-backend osrm-partition /data/region.osrm
if ($LASTEXITCODE -ne 0) { throw "osrm-partition falló (código $LASTEXITCODE)" }

Write-Host "== osrm-customize ==" -ForegroundColor Cyan
docker run --rm -v "${dataDir}:/data" osrm/osrm-backend osrm-customize /data/region.osrm
if ($LASTEXITCODE -ne 0) { throw "osrm-customize falló (código $LASTEXITCODE)" }

Write-Host ""
Write-Host "Listo. Ahora levanta el servicio con:" -ForegroundColor Green
Write-Host "  docker compose -f osrm/docker-compose.yml up -d"
