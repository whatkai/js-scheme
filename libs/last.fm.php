<?php

header('Content-type: text/xml');
ini_set('allow_url_fopen', 1);
$api_key = $_GET['api_key'];
$method = $_GET['method'];
$request = "http://ws.audioscrobbler.com/2.0/?method=$method&api_key=$api_key";
foreach ($_GET as $key => $value) {
    if ($key !== 'api_key' && $key !== 'method') {
        $request .= "&$key=$value";
    }
}
echo file_get_contents($request);

?>