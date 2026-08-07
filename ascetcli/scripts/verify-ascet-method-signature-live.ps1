param(
    [string]$ComponentPath = 'ESDL\Class_ESDL',
    [string]$MethodName = ('__signature_patch_probe_' + (Get-Date -Format 'yyyyMMddHHmmss')),
    [string]$DiagramName = 'Main',
    [string]$ArgumentName = 'p_CmpF_MC1',
    [string]$ArgumentType = 'cont',
    [string]$ReturnType = 'cont',
    [switch]$KeepProbe
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$binRoot = Join-Path $repoRoot 'src\ascetcli\output\ascet-csharp\bin'
$cliPath = Join-Path $binRoot 'AscetCli.exe'
if (-not (Test-Path -LiteralPath $cliPath)) {
    throw "ASCET CLI not found: $cliPath. Run src\ascetcli\scripts\build-ascet-csharp.ps1 -BuildMode core first."
}

$tempRoot = Join-Path $repoRoot 'tmp\ascet-method-signature-live'
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
$signaturePath = Join-Path $tempRoot "$MethodName.signature.json"
$codePath = Join-Path $tempRoot "$MethodName.esdl"

function Invoke-AscetCli {
    param([string[]]$Arguments)

    Write-Host ">>> AscetCli.exe $($Arguments -join ' ')" -ForegroundColor Cyan
    $stdoutPath = Join-Path $tempRoot ([Guid]::NewGuid().ToString('N') + '.stdout')
    $stderrPath = Join-Path $tempRoot ([Guid]::NewGuid().ToString('N') + '.stderr')
    $process = Start-Process -FilePath $cliPath -ArgumentList $Arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -Raw -Path $stdoutPath } else { '' }
    $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -Raw -Path $stderrPath } else { '' }
    if ($null -eq $stdout) {
        $stdout = ''
    }
    if ($null -eq $stderr) {
        $stderr = ''
    }
    Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue

    if ($stdout.Trim().Length -gt 0) {
        Write-Host $stdout.Trim()
    }
    if ($stderr.Trim().Length -gt 0) {
        Write-Host $stderr.Trim() -ForegroundColor Yellow
    }
    if ($process.ExitCode -ne 0) {
        throw "AscetCli.exe exited with code $($process.ExitCode): $($stderr.Trim()) $($stdout.Trim())"
    }

    return $stdout.Trim()
}

function Convert-JsonOutput {
    param(
        [string]$Json,
        [string]$Step
    )

    try {
        return $Json | ConvertFrom-Json
    } catch {
        throw "$Step did not return valid JSON: $Json"
    }
}

function Assert-Ok {
    param(
        [object]$Envelope,
        [string]$Step
    )

    if ($null -eq $Envelope -or $Envelope.ok -ne $true) {
        throw "$Step failed or did not return ok=true."
    }
}

Write-Host "ASCET method signature live verification start" -ForegroundColor Green

$signatureSpec = [ordered]@{
    returnType = $ReturnType
    ifReturnExists = 'replace'
    arguments = @(
        [ordered]@{
            name = $ArgumentName
            type = $ArgumentType
            ifExists = 'replace'
        }
    )
}
$signatureSpec | ConvertTo-Json -Depth 6 | Set-Content -Path $signaturePath -Encoding UTF8
Set-Content -Path $codePath -Value "return ($ArgumentName);" -Encoding UTF8

try {
    $createArgs = @(
        'exec',
        'create_method',
        $ComponentPath,
        $MethodName,
        '--method-kind',
        'abstract',
        '--if-exists',
        'return-existing',
        '--verify-readback',
        '--json'
    )
    if (-not [string]::IsNullOrWhiteSpace($DiagramName)) {
        $createArgs = @(
            'exec',
            'create_method',
            $ComponentPath,
            $MethodName,
            '--method-kind',
            'abstract',
            '--diagram',
            $DiagramName,
            '--if-exists',
            'return-existing',
            '--verify-readback',
            '--json'
        )
    }

    Assert-Ok (Convert-JsonOutput (Invoke-AscetCli $createArgs) 'create_method') 'create_method'

    $signature = Convert-JsonOutput (Invoke-AscetCli @(
        'exec',
        'set_method_signature',
        $ComponentPath,
        $MethodName,
        '--signature-json',
        $signaturePath,
        '--verify-readback',
        '--json'
    )) 'set_method_signature'
    Assert-Ok $signature 'set_method_signature'

    $payload = $signature.result.payload
    if ($payload.returnElementModelType -ne $ReturnType) {
        throw "Return readback mismatch. Expected $ReturnType, got $($payload.returnElementModelType)."
    }
    $argument = @($payload.arguments) | Where-Object { $_.name -eq $ArgumentName } | Select-Object -First 1
    if ($null -eq $argument) {
        throw "Argument '$ArgumentName' was not present in set_method_signature payload."
    }
    if ($argument.elementModelType -ne $ArgumentType -or $argument.isMethodArgument -ne $true -or $argument.readbackVerified -ne $true) {
        throw "Argument readback mismatch for '$ArgumentName'."
    }

    Assert-Ok (Convert-JsonOutput (Invoke-AscetCli @(
        'exec',
        'set_class_method_code',
        $ComponentPath,
        $MethodName,
        $codePath,
        '--verify-readback',
        '--json'
    )) 'set_class_method_code') 'set_class_method_code'

    $read = Convert-JsonOutput (Invoke-AscetCli @(
        'exec',
        'read_method_code',
        $ComponentPath,
        $MethodName,
        '--json'
    )) 'read_method_code'
    Assert-Ok $read 'read_method_code'

    $readCode = [string]$read.result.code
    if ($readCode.IndexOf($ArgumentName, [StringComparison]::Ordinal) -lt 0) {
        throw "read_method_code did not contain argument '$ArgumentName'."
    }

    [ordered]@{
        ok = $true
        componentPath = $ComponentPath
        methodName = $MethodName
        returnType = $ReturnType
        argumentName = $ArgumentName
        argumentType = $ArgumentType
        signaturePayload = $payload
        code = $readCode
    } | ConvertTo-Json -Depth 8
} finally {
    if (-not $KeepProbe) {
        try {
            Invoke-AscetCli @(
                'exec',
                'delete_method',
                $ComponentPath,
                $MethodName,
                '--if-missing',
                'ignore',
                '--verify-readback',
                '--json'
            ) | Out-Null
        } catch {
            Write-Host "Cleanup failed for ${ComponentPath}::${MethodName}: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    Remove-Item -LiteralPath $signaturePath, $codePath -Force -ErrorAction SilentlyContinue
}

Write-Host "ASCET method signature live verification complete" -ForegroundColor Green
