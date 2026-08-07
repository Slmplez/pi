param(
    [Parameter(Mandatory = $true)]
    [string]$ModulePath
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\ascet-csharp-common.ps1"
(Invoke-AscetModuleLiveVerification -ModulePath $ModulePath) | ConvertTo-Json -Depth 6
