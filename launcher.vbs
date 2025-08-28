' Create WScript.Shell object
Set WshShell = CreateObject("WScript.Shell")

' Start backend
WshShell.Run """C:\Users\airoot\Desktop\Medical Project\test\start-backend.bat""", 0, False

' Start frontend
WshShell.Run """C:\Users\airoot\Desktop\Medical Project\test\start-frontend.bat""", 0, False

' Wait until http://localhost:5173/ responds with HTTP 200
Function WaitForHttpServer(url, timeoutSeconds)
    Dim http, startTime, elapsedTime
    Set http = CreateObject("MSXML2.XMLHTTP")
    startTime = Timer

    Do
        On Error Resume Next
        http.Open "GET", url, False
        http.Send
        If http.Status = 200 Then
            Exit Function
        End If
        On Error GoTo 0
        WScript.Sleep 1000
        elapsedTime = Timer - startTime
        If elapsedTime > timeoutSeconds Then
            MsgBox "Timeout waiting for " & url, vbExclamation
            Exit Function
        End If
    Loop
End Function

' Wait up to 30 seconds for Vite to be ready
WaitForHttpServer "http://localhost:5173/", 60

' Launch Chrome
Set objExec = WshShell.Exec("""C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"" --new-window http://localhost:5173")

' Wait for Chrome to close
Do While objExec.Status = 0
    WScript.Sleep 1000
Loop

' Kill Node.js processes
WshShell.Run "taskkill /F /IM node.exe", 0, True
WshShell.Run "taskkill /F /IM cmd.exe", 0, True

' Wait 3 seconds to allow ports to be released
WScript.Sleep 3000

' Remove Vite .vite cache directory to prevent stale state
WshShell.Run "cmd /c rmdir /s /q ""C:\Users\airoot\Desktop\Medical Project\test\frontend\.vite""", 0, True
