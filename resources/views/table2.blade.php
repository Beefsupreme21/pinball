<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Pinball - Table 2</title>
    @vite(['resources/css/app.css', 'resources/js/pinball-table2.js'])
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            overflow: hidden;
            background: #0d1117;
        }
        #pinball-container {
            width: 100vw;
            height: 100vh;
        }
        #pinball-container canvas {
            display: block;
        }
    </style>
</head>
<body>
    <div id="pinball-container"></div>
</body>
</html>

