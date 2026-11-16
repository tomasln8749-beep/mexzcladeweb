$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8901/')
$listener.Start()
$root = 'C:\Users\PC\Desktop\TOMK\web2.2'
$mime = @{ '.html'='text/html'; '.js'='text/javascript'; '.css'='text/css'; '.jpg'='image/jpeg'; '.png'='image/png'; '.svg'='image/svg+xml' }
while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = $ctx.Request.Url.LocalPath
    if ($path -eq '/') { $path = '/musica.html' }
    $file = Join-Path $root ($path.TrimStart('/') -replace '/', '\')
    if (Test-Path -LiteralPath $file -PathType Leaf) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file)
        $ctx.Response.ContentType = $mime[$ext]
        if (-not $ctx.Response.ContentType) { $ctx.Response.ContentType = 'application/octet-stream' }
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
}
