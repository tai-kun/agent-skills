#!/usr/bin/env node
import { spawn } from "node:child_process"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { maxSatisfying, validRange } from "semver"
import * as v from "valibot"

const rootDir = resolve(import.meta.dirname, "..")
const configFile = join(rootDir, "submodule.json")
const lockFile = join(rootDir, "submodule-lock.json")

function git(args: readonly string[], cwd: string): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "inherit"] })

    if (child.stdout === null) {
      rejectPromise(new Error("git の標準出力を取得できませんでした"))
      return
    }

    let stdout = ""
    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.on("error", rejectPromise)
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise(stdout.trim())
      } else {
        rejectPromise(new Error(`git ${args.join(" ")} が終了コード ${code} で失敗しました`))
      }
    })
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function objectSchema<const TEntries extends v.ObjectEntries>(entries: TEntries) {
  return v.pipe(
    v.custom<Record<string, unknown>>(isRecord, "オブジェクトである必要があります"),
    v.object(entries, (issue) => (issue.input === undefined ? "必須です" : "オブジェクトである必要があります")),
  )
}

function recordSchema<const TSchema extends v.GenericSchema>(value: TSchema) {
  return v.pipe(v.custom<Record<string, unknown>>(isRecord, "オブジェクトである必要があります"), v.record(v.string(), value))
}

function countCapturingGroups(source: string): number {
  let count = 0
  let inClass = false
  let escaped = false
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === "\\") {
      escaped = true
      continue
    }
    if (char === "[") {
      inClass = true
      continue
    }
    if (char === "]" && inClass) {
      inClass = false
      continue
    }
    if (inClass) {
      continue
    }
    if (char === "(") {
      if (source[i + 1] === "?") {
        if (source[i + 2] === "<" && source[i + 3] !== "=" && source[i + 3] !== "!") {
          count++
        }
      } else {
        count++
      }
    }
  }
  return count
}

const moduleConfigSchema = objectSchema({
  repository: v.pipe(v.string("文字列である必要があります"), v.nonEmpty("空でない文字列である必要があります")),
  tag_semver: v.pipe(
    v.string("文字列である必要があります"),
    v.check((input) => validRange(input) !== null, "有効な semver 範囲である必要があります"),
  ),
  regex: v.optional(
    v.pipe(
      v.string("文字列である必要があります"),
      v.check((input) => {
        try {
          new RegExp(input)
        } catch {
          return false
        }
        return countCapturingGroups(input) === 1
      }, "有効な正規表現で、1 つのキャプチャグループを含む必要があります"),
    ),
    "^v([0-9].+)",
  ),
})

const submoduleConfigSchema = objectSchema({
  directory: v.pipe(v.string("文字列である必要があります"), v.nonEmpty("空でない文字列である必要があります")),
  modules: recordSchema(moduleConfigSchema),
})

type ModuleConfig = v.InferOutput<typeof moduleConfigSchema>

type SubmoduleConfig = v.InferOutput<typeof submoduleConfigSchema>

type LockedModule = ModuleConfig & {
  version: string
  commit: string
}

function toPosix(path: string): string {
  return path.split(sep).join("/")
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

function formatIssues(issues: readonly v.BaseIssue<unknown>[]): string {
  return issues
    .map((issue) => {
      const path = issue.path?.map((item) => String(item.key)).join(".")
      const label = path === undefined || path === "" ? "ルートは" : `"${path}" は`
      return `${configFile}: ${label}${issue.message}`
    })
    .join("\n")
}

async function loadConfig(): Promise<SubmoduleConfig> {
  let source: string
  try {
    source = await readFile(configFile, "utf8")
  } catch {
    throw new Error(`${configFile} を読み込めませんでした`)
  }

  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new Error(`${configFile} は有効な JSON ではありません`)
  }

  const result = v.safeParse(submoduleConfigSchema, value)
  if (!result.success) {
    throw new Error(formatIssues(result.issues))
  }

  return result.output
}

async function getRegisteredPaths(): Promise<Set<string>> {
  if (!(await pathExists(join(rootDir, ".gitmodules")))) {
    return new Set()
  }

  const output = await git(["config", "--file", ".gitmodules", "--list"], rootDir)
  const paths = output
    .split("\n")
    .map((line) => /^submodule\..*\.path=(.*)$/.exec(line)?.[1])
    .filter((path): path is string => path !== undefined)

  return new Set(paths)
}

function resolveTag(tags: readonly string[], tagSemver: string, regexSource: string | undefined): string | null {
  if (regexSource === undefined) {
    return maxSatisfying(tags, tagSemver)
  }

  const pattern = new RegExp(regexSource)
  const candidates: { tag: string; version: string }[] = []
  for (const tag of tags) {
    pattern.lastIndex = 0
    const version = pattern.exec(tag)?.[1]
    if (version !== undefined) {
      candidates.push({ tag, version })
    }
  }

  const best = maxSatisfying(
    candidates.map((candidate) => candidate.version),
    tagSemver,
  )
  if (best === null) {
    return null
  }
  return candidates.find((candidate) => candidate.version === best)?.tag ?? null
}

async function setupModule(name: string, module: ModuleConfig, submodulesDir: string, registered: Set<string>): Promise<LockedModule> {
  const target = resolve(submodulesDir, name)
  const relativeToSubmodules = relative(submodulesDir, target)
  if (relativeToSubmodules === "" || relativeToSubmodules.startsWith("..") || isAbsolute(relativeToSubmodules)) {
    throw new Error(`モジュール名 "${name}" はサブモジュールディレクトリの外を指しています`)
  }

  const submodulePath = toPosix(relative(rootDir, target))

  if (!registered.has(submodulePath)) {
    if (await pathExists(target)) {
      throw new Error(`${submodulePath} は既に存在しますが、Git サブモジュールとして登録されていません`)
    }

    await mkdir(dirname(target), { recursive: true })
    console.log(`[${name}] add ${module.repository}`)
    await git(["submodule", "add", module.repository, submodulePath], rootDir)
    registered.add(submodulePath)
  }

  await git(["submodule", "update", "--init", "--", submodulePath], rootDir)
  await git(["fetch", "--tags", "--force", "origin"], target)

  const tags = (await git(["tag", "--list"], target)).split("\n").filter((tag) => tag !== "")
  const tag = resolveTag(tags, module.tag_semver, module.regex)
  if (tag === null) {
    throw new Error(`${submodulePath} に "${module.tag_semver}" を満たすタグがありません`)
  }

  await git(["-c", "advice.detachedHead=false", "checkout", "--detach", tag], target)
  console.log(`[${name}] checkout ${tag} (${module.tag_semver})`)

  const commit = await git(["rev-parse", "HEAD"], target)
  return { ...module, version: tag, commit }
}

async function main(): Promise<void> {
  const config = await loadConfig()
  const submodulesDir = resolve(rootDir, config.directory)
  await mkdir(submodulesDir, { recursive: true })

  const registered = await getRegisteredPaths()
  const modules: Record<string, LockedModule> = {}
  for (const [name, module] of Object.entries(config.modules)) {
    modules[name] = await setupModule(name, module, submodulesDir, registered)
  }

  await writeFile(lockFile, `${JSON.stringify({ modules }, null, 2)}\n`)
  console.log(`[submodule] lock ${toPosix(relative(rootDir, lockFile))}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
