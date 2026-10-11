import Cocoa
import WebKit
import Darwin

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var loadingLabel: NSTextField!
    var progressIndicator: NSProgressIndicator!
    var backendProcess: Process?
    var serverPort: Int = 8000
    var projectPath: String = ""

    func applicationDidFinishLaunching(_ notification: Notification) {
        // 1. Locate project path
        let bundlePath = Bundle.main.bundlePath
        let possibleRoot = (bundlePath as NSString).deletingLastPathComponent
        let fm = FileManager.default
        if fm.fileExists(atPath: "\(possibleRoot)/backend/app.py") {
            projectPath = possibleRoot
        } else {
            projectPath = possibleRoot
        }

        // 2. Setup native macOS window
        let screenRect = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1280, height: 850)
        let windowWidth: CGFloat = min(1380, screenRect.width - 60)
        let windowHeight: CGFloat = min(920, screenRect.height - 60)
        let windowRect = NSRect(
            x: screenRect.origin.x + (screenRect.width - windowWidth) / 2,
            y: screenRect.origin.y + (screenRect.height - windowHeight) / 2,
            width: windowWidth,
            height: windowHeight
        )

        window = NSWindow(
            contentRect: windowRect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Spend Agent"
        window.titlebarAppearsTransparent = false
        window.delegate = self
        window.minSize = NSSize(width: 960, height: 620)

        // 3. Webview configuration
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isHidden = true
        window.contentView!.addSubview(webView)

        // 4. Loading indicators container
        let container = NSView(frame: NSRect(x: 0, y: 0, width: windowWidth, height: windowHeight))
        container.autoresizingMask = [.width, .height]
        
        progressIndicator = NSProgressIndicator(frame: NSRect(x: (windowWidth - 36) / 2, y: windowHeight / 2 + 10, width: 36, height: 36))
        progressIndicator.style = .spinning
        progressIndicator.isIndeterminate = true
        progressIndicator.autoresizingMask = [.minXMargin, .maxXMargin, .minYMargin, .maxYMargin]
        progressIndicator.startAnimation(nil)
        container.addSubview(progressIndicator)

        loadingLabel = NSTextField(labelWithString: "🏦 Iniciando Spend Agent y cargando entorno...")
        loadingLabel.font = NSFont.systemFont(ofSize: 15, weight: .medium)
        loadingLabel.textColor = NSColor.secondaryLabelColor
        loadingLabel.alignment = .center
        loadingLabel.frame = NSRect(x: 0, y: windowHeight / 2 - 35, width: windowWidth, height: 30)
        loadingLabel.autoresizingMask = [.minXMargin, .maxXMargin, .minYMargin, .maxYMargin]
        container.addSubview(loadingLabel)

        window.contentView!.addSubview(container)
        container.identifier = NSUserInterfaceItemIdentifier("loadingContainer")

        // Setup Main Menu
        setupMainMenu()

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // 5. Start or connect backend in background
        DispatchQueue.global(qos: .userInitiated).async {
            self.prepareAndLaunchBackend()
        }
    }

    func setupMainMenu() {
        let mainMenu = NSMenu()
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        
        let appMenu = NSMenu()
        appMenuItem.submenu = appMenu
        
        appMenu.addItem(withTitle: "Acerca de Spend Agent", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        
        let openBrowserItem = NSMenuItem(title: "Abrir en Navegador Externo", action: #selector(openInBrowser), keyEquivalent: "b")
        openBrowserItem.keyEquivalentModifierMask = [.command, .shift]
        openBrowserItem.target = self
        appMenu.addItem(openBrowserItem)
        
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Ocultar Spend Agent", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let hideOthers = NSMenuItem(title: "Ocultar otros", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthers.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(hideOthers)
        appMenu.addItem(withTitle: "Mostrar todo", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Salir de Spend Agent", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

        // Edit Menu (Copy/Paste shortcuts for text fields)
        let editMenuItem = NSMenuItem()
        mainMenu.addItem(editMenuItem)
        let editMenu = NSMenu(title: "Edición")
        editMenuItem.submenu = editMenu
        editMenu.addItem(withTitle: "Deshacer", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Rehacer", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Cortar", action: Selector(("cut:")), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copiar", action: Selector(("copy:")), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Pegar", action: Selector(("paste:")), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Seleccionar todo", action: Selector(("selectAll:")), keyEquivalent: "a")

        // View Menu (Reload, Fullscreen)
        let viewMenuItem = NSMenuItem()
        mainMenu.addItem(viewMenuItem)
        let viewMenu = NSMenu(title: "Ver")
        viewMenuItem.submenu = viewMenu
        let reloadItem = NSMenuItem(title: "Recargar", action: #selector(reloadPage), keyEquivalent: "r")
        reloadItem.target = self
        viewMenu.addItem(reloadItem)

        NSApp.mainMenu = mainMenu
    }

    @objc func reloadPage() {
        DispatchQueue.main.async {
            self.webView.reload()
        }
    }

    @objc func openInBrowser() {
        if let url = URL(string: "http://localhost:\(serverPort)") {
            NSWorkspace.shared.open(url)
        }
    }

    func prepareAndLaunchBackend() {
        // First check if an existing instance of Bank Agent is already responding
        for checkPort in [8000, 8001, 8002, 8003] {
            if isPortResponding(port: checkPort) {
                self.serverPort = checkPort
                self.loadPage()
                return
            }
        }

        let fm = FileManager.default
        let venvPython = "\(projectPath)/venv/bin/python3"
        let pipBin = "\(projectPath)/venv/bin/pip"
        let reqFile = "\(projectPath)/requirements.txt"
        
        var customEnv = ProcessInfo.processInfo.environment
        customEnv["BANK_AGENT_ROOT"] = projectPath
        customEnv["OPEN_BROWSER"] = "0"
        customEnv["PATH"] = "/Library/Frameworks/Python.framework/Versions/3.14/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:" + (customEnv["PATH"] ?? "")

        if !fm.fileExists(atPath: venvPython) {
            DispatchQueue.main.async {
                self.loadingLabel.stringValue = "📦 Creando entorno virtual Python..."
            }
            let venvProc = Process()
            venvProc.currentDirectoryPath = projectPath
            venvProc.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
            venvProc.arguments = ["-m", "venv", "\(projectPath)/venv"]
            venvProc.environment = customEnv
            try? venvProc.run()
            venvProc.waitUntilExit()
        }

        DispatchQueue.main.async {
            self.loadingLabel.stringValue = "📦 Verificando dependencias..."
        }
        let pipProc = Process()
        pipProc.currentDirectoryPath = projectPath
        pipProc.executableURL = URL(fileURLWithPath: pipBin)
        pipProc.arguments = ["install", "-q", "-r", reqFile]
        pipProc.environment = customEnv
        try? pipProc.run()
        pipProc.waitUntilExit()

        DispatchQueue.main.async {
            self.loadingLabel.stringValue = "🔍 Comprobando base de datos..."
        }
        let seedProc = Process()
        seedProc.currentDirectoryPath = projectPath
        seedProc.executableURL = URL(fileURLWithPath: venvPython)
        seedProc.arguments = ["-m", "backend.seed_data"]
        seedProc.environment = customEnv
        try? seedProc.run()
        seedProc.waitUntilExit()

        // Find free port starting at 8000
        serverPort = findFreePort(start: 8000)
        customEnv["PORT"] = "\(serverPort)"

        DispatchQueue.main.async {
            self.loadingLabel.stringValue = "🚀 Conectando a Bank Agent en puerto \(self.serverPort)..."
        }

        // Launch server process
        let serverProcess = Process()
        serverProcess.currentDirectoryPath = projectPath
        serverProcess.executableURL = URL(fileURLWithPath: venvPython)
        serverProcess.arguments = ["\(projectPath)/run_server.py"]
        serverProcess.environment = customEnv

        let pipe = Pipe()
        serverProcess.standardOutput = pipe
        serverProcess.standardError = pipe

        do {
            try serverProcess.run()
            self.backendProcess = serverProcess
        } catch {
            print("Failed to run backend: \(error)")
        }

        // Poll until server is ready and responds
        var attempts = 0
        while attempts < 40 {
            if isPortResponding(port: serverPort) {
                break
            }
            Thread.sleep(forTimeInterval: 0.25)
            attempts += 1
        }

        loadPage()
    }

    func isPortResponding(port: Int) -> Bool {
        guard let url = URL(string: "http://127.0.0.1:\(port)/api/settings/general") else { return false }
        var request = URLRequest(url: url)
        request.timeoutInterval = 1.0
        let semaphore = DispatchSemaphore(value: 0)
        var ok = false
        let task = URLSession.shared.dataTask(with: request) { _, response, _ in
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                ok = true
            }
            semaphore.signal()
        }
        task.resume()
        _ = semaphore.wait(timeout: .now() + 1.2)
        return ok
    }

    func findFreePort(start: Int) -> Int {
        for port in start..<start+20 {
            let sock = socket(AF_INET, SOCK_STREAM, 0)
            if sock < 0 { continue }
            var addr = sockaddr_in()
            addr.sin_family = sa_family_t(AF_INET)
            addr.sin_port = in_port_t(UInt16(port).bigEndian)
            addr.sin_addr.s_addr = inet_addr("127.0.0.1")
            let bindRes = withUnsafePointer(to: &addr) {
                $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                    Darwin.bind(sock, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
                }
            }
            close(sock)
            if bindRes == 0 {
                return port
            }
        }
        return start
    }

    func loadPage() {
        DispatchQueue.main.async {
            let url = URL(string: "http://127.0.0.1:\(self.serverPort)")!
            self.webView.load(URLRequest(url: url))
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.async {
            for sub in self.window.contentView!.subviews {
                if sub.identifier?.rawValue == "loadingContainer" {
                    sub.removeFromSuperview()
                }
            }
            self.webView.isHidden = false
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("WebKit Navigation error: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("WebKit Provisional error: \(error.localizedDescription)")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            let url = URL(string: "http://127.0.0.1:\(self.serverPort)")!
            self.webView.load(URLRequest(url: url))
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        print("WebKit web content process terminated. Reloading page...")
        DispatchQueue.main.async {
            self.webView.reload()
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = "Bank Agent"
        alert.informativeText = message
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Aceptar")
        alert.runModal()
        completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = "Bank Agent"
        alert.informativeText = message
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Aceptar")
        alert.addButton(withTitle: "Cancelar")
        let response = alert.runModal()
        completionHandler(response == .alertFirstButtonReturn)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        backendProcess?.terminate()
        let pidFile = "\(projectPath)/.bank_agent.pid"
        try? FileManager.default.removeItem(atPath: pidFile)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
