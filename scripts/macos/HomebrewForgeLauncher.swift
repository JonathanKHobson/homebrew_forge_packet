import AppKit
import Foundation

let fileManager = FileManager.default
let bundle = Bundle.main
let bundlePath = bundle.bundlePath
let resourcesPath = bundle.resourcePath ?? "\(bundlePath)/Contents/Resources"
let macOSPath = "\(bundlePath)/Contents/MacOS"
let electronPath = "\(macOSPath)/Electron"
let repoMarkerPath = "\(resourcesPath)/homebrew-forge-repo-root.txt"
let logDir = "\(NSHomeDirectory())/Library/Logs/Homebrew Forge"
let logPath = "\(logDir)/native-launcher.log"
let port = ProcessInfo.processInfo.environment["HOMEBREW_FORGE_DESKTOP_PORT"] ?? "5187"
let healthURL = URL(string: "http://127.0.0.1:\(port)/api/health")!

func log(_ message: String) {
  try? fileManager.createDirectory(atPath: logDir, withIntermediateDirectories: true)
  let line = "[\(Date())] \(message)\n"
  if let data = line.data(using: .utf8) {
    if fileManager.fileExists(atPath: logPath), let handle = try? FileHandle(forWritingTo: URL(fileURLWithPath: logPath)) {
      _ = try? handle.seekToEnd()
      _ = try? handle.write(contentsOf: data)
      _ = try? handle.close()
    } else {
      try? data.write(to: URL(fileURLWithPath: logPath))
    }
  }
}

func showError(_ message: String) {
  DispatchQueue.main.async {
    let alert = NSAlert()
    alert.messageText = "Homebrew Forge failed to start"
    alert.informativeText = "\(message)\n\nSee \(logPath)"
    alert.alertStyle = .critical
    alert.runModal()
    NSApp.terminate(nil)
  }
  NSApp.run()
}

func repoRoot() throws -> String {
  let value = try String(contentsOfFile: repoMarkerPath, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
  if value.isEmpty {
    throw NSError(domain: "HomebrewForgeLauncher", code: 1, userInfo: [NSLocalizedDescriptionKey: "Repo marker is empty at \(repoMarkerPath)."])
  }
  return value
}

func activateExistingElectron() -> Bool {
  for runningApp in NSWorkspace.shared.runningApplications {
    if runningApp.executableURL?.path == electronPath {
      runningApp.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
      return true
    }
  }
  return false
}

func healthMatches(repo: String) -> Bool {
  let semaphore = DispatchSemaphore(value: 0)
  var ok = false
  let task = URLSession.shared.dataTask(with: healthURL) { data, response, _ in
    defer { semaphore.signal() }
    guard (response as? HTTPURLResponse)?.statusCode == 200, let data else {
      return
    }
    guard
      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let healthRepo = json["repoRoot"] as? String,
      let stale = json["stale"] as? Bool
    else {
      return
    }
    ok = healthRepo == repo && stale == false
  }
  task.resume()
  _ = semaphore.wait(timeout: .now() + 1.5)
  task.cancel()
  return ok
}

func waitForHealth(repo: String) -> Bool {
  for _ in 0..<120 {
    if healthMatches(repo: repo) {
      return true
    }
    Thread.sleep(forTimeInterval: 0.25)
  }
  return false
}

do {
  let repo = try repoRoot()
  log("Launcher start repo=\(repo)")

  if healthMatches(repo: repo), activateExistingElectron() {
    log("Existing healthy Electron app focused")
    exit(0)
  }

  guard fileManager.isExecutableFile(atPath: electronPath) else {
    throw NSError(domain: "HomebrewForgeLauncher", code: 2, userInfo: [NSLocalizedDescriptionKey: "Electron executable is missing at \(electronPath)."])
  }

  let process = Process()
  process.executableURL = URL(fileURLWithPath: electronPath)
  process.arguments = ["\(repo)/packages/desktop"]
  var environment = ProcessInfo.processInfo.environment
  environment["HOMEBREW_FORGE_REPO_ROOT"] = repo
  environment["HOMEBREW_FORGE_DESKTOP_BACKEND"] = environment["HOMEBREW_FORGE_DESKTOP_BACKEND"] ?? "vite"
  environment["HOMEBREW_FORGE_DESKTOP_PORT"] = port
  environment["HOMEBREW_FORGE_NODE_EXECUTABLE"] = environment["HOMEBREW_FORGE_NODE_EXECUTABLE"] ?? "/Applications/Codex.app/Contents/Resources/node"
  environment["PATH"] = "/Applications/Codex.app/Contents/Resources:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:\(environment["PATH"] ?? "")"
  process.environment = environment
  try process.run()
  log("Started Electron pid=\(process.processIdentifier)")

  if waitForHealth(repo: repo) {
    _ = activateExistingElectron()
    log("Health ready")
    exit(0)
  }

  showError("Homebrew Forge started but did not become ready.")
} catch {
  log("Launch failed: \(error.localizedDescription)")
  showError(error.localizedDescription)
}
