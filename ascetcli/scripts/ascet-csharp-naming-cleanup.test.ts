import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..', '..', '..')
const ascetCliRoot = join(repoRoot, 'src', 'ascetcli')
const oldCoreDir = join(ascetCliRoot, 'src', 'AscetCopolit')
const newCoreDir = join(ascetCliRoot, 'src', 'AscetCopilot')

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

describe('ASCET C# naming cleanup', () => {
  test('uses AscetCopilot as the active C# core directory', () => {
    expect(existsSync(newCoreDir)).toBe(true)
    expect(existsSync(oldCoreDir)).toBe(false)
  })

  test('active scripts and entry docs do not reference the old spelling', () => {
    const activeFiles = [
      {
        path: 'src/ascetcli/scripts/build-ascet-csharp.ps1',
        expected: 'AscetCopilot',
      },
      {
        path: 'src/ascetcli/scripts/test-ascet-csharp.ps1',
        expected: 'AscetCopilot',
      },
      {
        path: 'src/ascetcli/scripts/generate-ascet-cli-skills.ps1',
        expected: '/E:/Rep/AscetAgent/src/ascetcli/docs/ascet-cli-reference.md',
      },
      {
        path: 'src/ascetcli/README.md',
        expected: 'AscetCopilot',
      },
      {
        path: 'src/ascetcli/AGENTS.md',
        expected: 'AscetCopilot',
      },
    ]

    for (const file of activeFiles) {
      const content = read(file.path)
      expect(content).toContain(file.expected)
      expect(content).not.toContain('AscetCopolit')
      expect(content).not.toContain('E:/Rep/AscetCopolit')
      expect(content).not.toContain('E:\\Rep\\AscetCopolit')
    }
  })
})
