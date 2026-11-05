<?php
// Disposable local HTTP test server only. Never installed on an owner backend.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if($path!=='/' && is_file('/var/www/html'.$path)){return false;}
if(str_starts_with($path,'/wp-json/')){$_GET['rest_route']=substr($path,8);}
require '/var/www/html/index.php';
