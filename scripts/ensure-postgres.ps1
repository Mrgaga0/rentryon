param(
  [string]$ContainerName = "rentsmart-postgres",
  [int]$HostPort = 5432,
  [string]$Password = "postgres",
  [string]$Database = "rentsmart_home"
)

function Test-Command($Name) {
  try {
    Get-Command $Name -ErrorAction Stop | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-Command 'docker')) {
  Write-Error "Docker is required to bootstrap PostgreSQL automatically."
  exit 1
}

$existingId = (docker ps -a --filter "name=$ContainerName" --format "{{.ID}}" | Select-Object -First 1).Trim()

if ([string]::IsNullOrEmpty($existingId)) {
  Write-Host "Creating PostgreSQL container '$ContainerName'..."
  docker run -d --name $ContainerName -e POSTGRES_PASSWORD=$Password -e POSTGRES_DB=$Database -p $HostPort:5432 postgres:16 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create PostgreSQL container."
    exit 1
  }
} else {
  $state = (docker inspect -f "{{.State.Running}}" $ContainerName).Trim()
  if ($state -ne "true") {
    Write-Host "Starting PostgreSQL container '$ContainerName'..."
    docker start $ContainerName | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Failed to start PostgreSQL container '$ContainerName'."
      exit 1
    }
  } else {
    Write-Host "PostgreSQL container '$ContainerName' is already running."
  }
}

Write-Host "Waiting for PostgreSQL on port $HostPort..."
$maxAttempts = 40
for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient("127.0.0.1", $HostPort)
    $client.Close()
    Write-Host "PostgreSQL is ready."
    exit 0
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

Write-Error "Timed out waiting for PostgreSQL to accept connections on port $HostPort."
exit 1
