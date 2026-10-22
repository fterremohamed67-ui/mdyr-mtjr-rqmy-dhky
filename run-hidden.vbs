Option Explicit

Dim shell, fileSystem, projectRoot, startScript
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")

projectRoot = fileSystem.GetParentFolderName(WScript.ScriptFullName)
startScript = fileSystem.BuildPath(projectRoot, "start-app.bat")

If Not fileSystem.FileExists(startScript) Then
    MsgBox "لم يتم العثور على ملف start-app.bat في مجلد المشروع.", vbCritical, "تعذر تشغيل متجر روبي الذكي"
    WScript.Quit 1
End If

shell.Run Chr(34) & startScript & Chr(34), 0, False
