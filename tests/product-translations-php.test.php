<?php
error_reporting(E_ALL);
set_error_handler(function($n,$s) { throw new ErrorException($s,0,$n); });
function check($condition,$message) { if (!$condition) throw new Exception($message); }
function test($name,$fn) { $fn(); echo "PASS $name\n"; }
function plugin_file($name) { global $bundle; if (!isset($bundle[$name])) throw new Exception("Missing implementation: $name"); eval('?>'.base64_decode($bundle[$name])); }
plugin_file('core.php');
test('canonical SHA256 preserves raw UTF8 HTML whitespace', function() { global $fixtures; foreach($fixtures as $f) check(MT_Core::hash($f['source'])===$f['sha256'],'canonical mismatch'); });
function rejects($fn) { try { $fn(); } catch (InvalidArgumentException $e) { return; } throw new Exception('Expected validation rejection'); }
function row($id=7) { global $fixtures; return ['id'=>$id,'source_hash'=>$fixtures[0]['sha256'],'translation'=>['name'=>'Πέδιλα','description'=>'<p>Carbon</p>']]; }
function job($rows=null) { return ['version'=>1,'locale'=>'el','products'=>$rows ?? [row()]]; }
test('bounded import schema rejects malformed duplicate oversized unknown values', function() {
 check(MT_Core::job(job())['locale']==='el','valid job');
 foreach ([['version'=>2],['locale'=>'fr'],['products'=>[]],['products'=>[row(),row()]],['products'=>array_map('row',range(1,51))],['unexpected'=>true]] as $patch) rejects(fn()=>MT_Core::job(array_replace(job(),$patch)));
 foreach ([['id'=>'7'],['id'=>0],['source_hash'=>'BAD'],['translation'=>['name'=>[]]],['translation'=>['status'=>'published']],['translation'=>['name'=>str_repeat('x',100001)]],['translation'=>['name'=>"a\0b"]]] as $patch) rejects(fn()=>MT_Core::job(job([array_replace(row(),$patch)])));
 rejects(fn()=>MT_Core::decode(str_repeat(' ',2097153))); rejects(fn()=>MT_Core::decode('{broken'));
});
test('text limits count UTF8 bytes with title 1000 and descriptions 100000', function() {
 check(MT_Core::texts(['name'=>str_repeat('Π',500)])['name']===str_repeat('Π',500),'1000-byte title accepted');
 rejects(fn()=>MT_Core::texts(['name'=>str_repeat('x',1001)]));
 rejects(fn()=>MT_Core::texts(['name'=>str_repeat('Π',501)]));
 foreach (['short_description','description'] as $field) {
  check(strlen(MT_Core::texts([$field=>str_repeat('Π',50000)])[$field])===100000,'100000-byte description accepted');
  rejects(fn()=>MT_Core::texts([$field=>str_repeat('Π',50000).'x']));
 }
 $r=row(); $r['translation']['name']=str_repeat('x',1001); rejects(fn()=>MT_Core::job(job([$r])));
 $r=row(); $r['source']=['name'=>str_repeat('Π',501),'short_description'=>'','description'=>'']; $r['source_hash']=MT_Core::hash($r['source']); rejects(fn()=>MT_Core::job(job([$r])));
});
// Minimal WP/Woo boundaries only: production validation, merging and orchestration run unchanged.
$GLOBALS['products']=[]; $GLOBALS['caps']=['manage_woocommerce'=>true,'edit_post'=>true,'publish_products'=>true]; $GLOBALS['locks']=[];
function current_user_can($cap,...$args) { return $GLOBALS['caps'][$cap] ?? false; }
function wc_get_product($id) { return $GLOBALS['products'][$id] ?? false; }
function wp_strip_all_tags($s) { return strip_tags($s); }
function wp_kses_post($s) { return preg_replace('/<script\\b[^>]*>.*?<\/script>/is','',strip_tags($s,'<p><strong><em><br><ul><li>')); }
function add_option($key,$value,...$args) { if (isset($GLOBALS['locks'][$key])) return false; $GLOBALS['locks'][$key]=$value; return true; }
function delete_option($key) { unset($GLOBALS['locks'][$key]); }
class FakeProduct {
 public $id; public $meta=[]; public $saves=0; public $contexts=[];
 function __construct($id) { $this->id=$id; }
 function get_id() { return $this->id; }
 function get_name($context='view') { $this->contexts[]=$context; return 'Carbon & fin'; }
 function get_short_description($context='view') { $this->contexts[]=$context; return "<p>Short</p>\n"; }
 function get_description($context='view') { $this->contexts[]=$context; return '<p>Full</p>'; }
 function get_meta($key,$single=true,$context='view') { return $this->meta[$key] ?? ''; }
 function update_meta_data($key,$value) { $this->meta[$key]=$value; }
 public $on_save=null;
 function save() { $this->saves++; if (is_callable($this->on_save)) ($this->on_save)(); return $this->id; }
 function is_type($type) { return $type==='simple'; }
 public $readback_bad=false;
 function read_meta_data($force=false) { if ($this->readback_bad) $this->meta['meister_translations']=['version'=>1]; }
 public $meta_objects=null;
 function get_meta_data() { return $this->meta_objects ?? [new FakeWCMetaData(91,'meister_translations',[])]; }
}
plugin_file('service.php');
function get_metadata_by_mid($type,$id) {
 check($type==='post','Woo product metadata uses post storage');
 $row=$GLOBALS['persisted_meta'][$id] ?? false;
 return $row ? (object)$row : false;
}
function setup_products() {
 $GLOBALS['products']=[7=>new FakeProduct(7),8=>new FakeProduct(8)];
 $GLOBALS['caps']=['manage_woocommerce'=>true,'edit_post'=>true,'publish_products'=>true]; $GLOBALS['locks']=[];
 // Persisted rows stay independent of Woo's controller-prepared in-memory objects.
 $GLOBALS['persisted_meta']=[
  91=>['meta_id'=>91,'post_id'=>7,'meta_key'=>'meister_translations','meta_value'=>['version'=>1]],
  92=>['meta_id'=>92,'post_id'=>7,'meta_key'=>'other','meta_value'=>'keep'],
  93=>['meta_id'=>93,'post_id'=>8,'meta_key'=>'meister_translations','meta_value'=>['version'=>1]],
 ];
}
function actual_job($ids=[7]) { $job=MT_Service::export($ids,'el'); foreach($job['products'] as &$r) $r['translation']=['name'=>'Πέδιλα','description'=>'<p>Carbon</p><script>bad()</script>']; return $job; }
test('export raw source and import dry run safe rerun preservation and explicit publication', function() {
 setup_products(); $p=$GLOBALS['products'][7]; $p->meta=['unrelated'=>'keep','meister_translations'=>['version'=>1,'en'=>['name'=>'Manual English'],'custom'=>'keep']];
 $job=actual_job(); check($job['products'][0]['source']['short_description']==="<p>Short</p>\n",'raw source'); check(!in_array('view',$p->contexts,true),'edit context');
 $result=MT_Service::import($job); check($result['dry_run']===true && $p->saves===0,'default dry run');
 MT_Service::import($job,['apply'=>true]); $m=$p->meta['meister_translations']; check($p->saves===1 && $m['el']['status']==='draft','draft import'); check($m['en']['name']==='Manual English' && $m['custom']==='keep' && $p->meta['unrelated']==='keep','preserve'); check($m['el']['description']==='<p>Carbon</p>bad()','sanitize');
 MT_Service::import($job,['apply'=>true]); check($p->saves===1,'idempotent rerun');
 rejects(fn()=>MT_Service::import($job,['apply'=>true,'publish'=>true]));
 MT_Service::import($job,['apply'=>true,'publish'=>true,'overwrite'=>true]); check($p->meta['meister_translations']['el']['status']==='published','explicit publish');
 check($GLOBALS['locks']===[],'locks released');
});
test('import preflights all IDs hashes capabilities locks and manual work before writes', function() {
 setup_products(); $job=actual_job([7,8]); $job['products'][1]['source_hash']=str_repeat('0',64); unset($job['products'][1]['source']); rejects(fn()=>MT_Service::import($job,['apply'=>true])); check($GLOBALS['products'][7]->saves===0,'no partial validation writes');
 foreach ([['manage_woocommerce'=>false],['edit_post'=>false],['publish_products'=>false]] as $caps) { setup_products(); $job=actual_job(); $GLOBALS['caps']=array_replace($GLOBALS['caps'],$caps); rejects(fn()=>MT_Service::import($job,['apply'=>true,'publish'=>true])); }
 setup_products(); $job=actual_job(); $GLOBALS['products'][7]->meta['meister_translations']=['version'=>1,'el'=>['name'=>'Manual']]; rejects(fn()=>MT_Service::import($job,['apply'=>true]));
 $GLOBALS['products'][7]->meta['meister_translations']=['version'=>2]; rejects(fn()=>MT_Service::import($job,['overwrite'=>true]));
 setup_products(); $job=actual_job(); $GLOBALS['locks']['meister_translation_lock_7']='held'; rejects(fn()=>MT_Service::import($job,['apply'=>true])); check(isset($GLOBALS['locks']['meister_translation_lock_7']),'never release another owner lock');
 setup_products(); rejects(fn()=>MT_Service::export([7,7],'el')); rejects(fn()=>MT_Service::export([999],'el')); rejects(fn()=>MT_Service::import(actual_job(),['apply'=>'yes']));
});

function apply_filters($name,$value,...$args) { return $GLOBALS['filters'][$name] ?? $value; }
function wp_json_encode($value) { return json_encode($value); }
function is_wp_error($value) { return $value instanceof WP_Error; }
class WP_Error { public $code; function __construct($code='error',$message='',$data=[]) { $this->code=$code; } }
function wp_remote_post($url,$args) { $GLOBALS['http_calls'][]=[$url,$args]; return $GLOBALS['http_reply']; }
function wp_remote_retrieve_response_code($response) { return $response['response']['code']; }
function wp_remote_retrieve_body($response) { return $response['body']; }
plugin_file('provider.php');
test('server generation is dry by default preserves manual drafts skips safe reruns', function() {
 setup_products(); $GLOBALS['provider_calls']=0;
 $provider=function($source,$locale) { $GLOBALS['provider_calls']++; check($locale==='el','locale'); return ['name'=>'Πέδιλα Carbon','short_description'=>'','description'=>'<p>Carbon</p>']; };
 $r=MT_Generate::run([7],'el',false,$provider); check($GLOBALS['provider_calls']===0 && $GLOBALS['products'][7]->saves===0 && $r['dry_run'],'dry generation no network');
 $r=MT_Generate::run([7],'el',true,$provider); check($GLOBALS['provider_calls']===1 && $GLOBALS['products'][7]->meta['meister_translations']['el']['status']==='draft','genuine generation persists draft');
 MT_Generate::run([7],'el',true,$provider); check($GLOBALS['provider_calls']===1 && $GLOBALS['products'][7]->saves===1,'rerun never regenerate existing');
 setup_products(); rejects(fn()=>MT_Generate::run([7,8,9,10],'el',true,$provider));
 rejects(fn()=>MT_Generate::run([7],'el',true,fn()=>['invented'=>'bad'])); check($GLOBALS['products'][7]->saves===0,'invalid provider saves nothing');
});
test('generation reserves every product before provider and rejects overlapping concurrent requests', function() {
 setup_products(); $calls=0;
 $provider=function($source,$locale) use (&$calls) {
  $calls++;
  check(isset($GLOBALS['locks']['meister_translation_generate_lock_7']) && isset($GLOBALS['locks']['meister_translation_generate_lock_8']),'all generation reservations precede provider');
  check(!isset($GLOBALS['locks']['meister_translation_lock_7']),'generation namespace separate from import');
  rejects(fn()=>MT_Generate::run([7],$locale,true,function() { throw new Exception('Concurrent provider must never run'); }));
  return ['name'=>'Generated'];
 };
 MT_Generate::run([7,8],'el',true,$provider);
 check($calls===2 && $GLOBALS['products'][7]->saves===1 && $GLOBALS['products'][8]->saves===1,'one provider call per product');
 check($GLOBALS['locks']===[],'success releases generation and import locks');
 MT_Generate::run([7,8],'el',true,function() { throw new Exception('Rerun must never charge'); });
 check($GLOBALS['locks']===[],'rerun reservations released');
});
test('generation failure releases only owned reservations and dry run never reserves', function() {
 setup_products(); $GLOBALS['locks']['meister_translation_generate_lock_8']='other-owner'; $before=$GLOBALS['locks'];
 $r=MT_Generate::run([7,8],'el',false,function() { throw new Exception('Dry run called provider'); });
 check($r['dry_run'] && $GLOBALS['locks']===$before,'dry run does not touch reservations');
 rejects(fn()=>MT_Generate::run([7,8],'el',true,function() { throw new Exception('Provider called before entire batch reserved'); }));
 check($GLOBALS['locks']===$before && $GLOBALS['products'][7]->saves===0,'partial acquisition releases own lock only');
 setup_products();
 try { MT_Generate::run([7,8],'el',true,function() { throw new RuntimeException('Provider failed'); }); throw new Exception('Expected provider exception'); }
 catch (RuntimeException $e) { check($e->getMessage()==='Provider failed','original provider error'); }
 check($GLOBALS['locks']===[],'provider error releases reservations');
 rejects(fn()=>MT_Generate::run([7],'el',true,fn()=>['name'=>str_repeat('Π',501)]));
 check($GLOBALS['locks']===[] && $GLOBALS['products'][7]->saves===0,'invalid provider output releases reservations');
 setup_products(); $GLOBALS['products'][7]->readback_bad=true;
 try { MT_Generate::run([7],'el',true,fn()=>['name'=>'Generated']); throw new Exception('Expected persistence exception'); }
 catch (RuntimeException $e) { check(strpos($e->getMessage(),'persistence')!==false,'persistence error'); }
 check($GLOBALS['locks']===[],'persistence error releases both lock namespaces');
});
test('generation preserves manual locales before and during provider execution', function() {
 setup_products(); $manual=['status'=>'draft','name'=>'Manual'];
 $GLOBALS['products'][7]->meta['meister_translations']=['version'=>1,'el'=>$manual];
 $r=MT_Generate::run([7],'el',true,function() { throw new Exception('Manual translation called provider'); });
 check($r['skipped_existing']===[7] && $GLOBALS['locks']===[],'manual locale skipped');
 setup_products();
 rejects(fn()=>MT_Generate::run([7],'el',true,function() use ($manual) {
  $job=actual_job(); $job['products'][0]['translation']=['name'=>$manual['name']]; MT_Service::import($job,['apply'=>true]);
  return ['name'=>'Generated must not overwrite manual'];
 }));
 check($GLOBALS['products'][7]->meta['meister_translations']['el']['name']==='Manual' && $GLOBALS['products'][7]->saves===1,'intervening manual save preserved');
 check($GLOBALS['locks']===[],'manual conflict releases reservations');
});
test('OpenAI adapter emits constrained request handles errors refusal truncation bad JSON', function() {
 define('OPENAI_API_KEY','test-not-a-real-secret'); define('MEISTER_TRANSLATION_MODEL','gpt-5-mini-2025-08-07');
 $GLOBALS['http_calls']=[];
 $reply=['status'=>'completed','output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>json_encode(['name'=>'Πέδιλα','short_description'=>'','description'=>'<p>Carbon</p>'])]]]]];
 $GLOBALS['http_reply']=['response'=>['code'=>200],'body'=>json_encode($reply)];
 $r=MT_Provider::translate(['name'=>'fin','short_description'=>'','description'=>''],'el'); check($r['name']==='Πέδιλα','parsed real schema');
 [$url,$args]=$GLOBALS['http_calls'][0]; $body=json_decode($args['body'],true); check($url==='https://api.openai.com/v1/responses' && $args['redirection']===0 && $args['sslverify']===true,'fixed secure endpoint'); check($body['store']===false && $body['text']['format']['strict']===true,'private structured outputs'); check(strpos($body['instructions'],'Λεπίδες')!==false,'Greek glossary');
 foreach ([new WP_Error(),['response'=>['code'=>429],'body'=>'SECRET'],['response'=>['code'=>200],'body'=>'bad'],['response'=>['code'=>200],'body'=>json_encode(['status'=>'incomplete'])],['response'=>['code'=>200],'body'=>json_encode(['status'=>'completed','output'=>[['content'=>[['type'=>'refusal']]]]])]] as $bad) { $GLOBALS['http_reply']=$bad; rejects(fn()=>MT_Provider::translate(['name'=>'fin'],'el')); }
});
$GLOBALS['hooks']=[];
function add_action($name,$fn,$priority=10,$args=1) { $GLOBALS['hooks'][$name]=$fn; }
function add_filter($name,$fn,$priority=10,$args=1) { $GLOBALS['hooks'][$name]=$fn; }
function register_rest_route($namespace,$path,$args) { $GLOBALS['routes'][$namespace.$path]=$args; }
function wp_verify_nonce($nonce,$action) { return $nonce==='valid'; }
function wp_unslash($value) { return $value; }
class FakeResponse { public $data; function __construct($data) { $this->data=$data; } function get_data() { return $this->data; } function set_data($data) { $this->data=$data; } }
class FakeRequest { public $data; function __construct($data) { $this->data=$data; } function get_param($name) { return $this->data[$name] ?? null; } function get_json_params() { return $this->data; } }
class WC_Admin_Meta_Boxes { static function add_error($s) { $GLOBALS['admin_errors'][]=$s; } }
plugin_file('wordpress.php');
test('Woo REST exposes exact raw canonical source only to privileged authenticated readers blocks unguarded writes', function() {
 setup_products(); $p=$GLOBALS['products'][7]; $p->meta['meister_translations']=['version'=>1,'el'=>['status'=>'draft']];
 $response=new FakeResponse(['name'=>'Display name','description'=>'<p>Formatted</p>','meta_data'=>[['key'=>'meister_translations','value'=>'private'],['key'=>'other','value'=>'keep']]]);
 $result=MT_WordPress::rest_product($response,$p,null); check($result->data['meister_translation_source']===MT_Service::source($p),'raw canonical response'); check($result->data['name']==='Display name','display unchanged'); check($result->data['meister_translations']===$p->meta['meister_translations'],'read metadata');
 $GLOBALS['caps']['manage_woocommerce']=false; $result=MT_WordPress::rest_product($response,$p,null); check(!isset($result->data['meister_translation_source']) && !isset($result->data['meister_translations']),'no anonymous fields'); check(count($result->data['meta_data'])===1 && $result->data['meta_data'][0]['key']==='other','strip generic translation meta');
 check(MT_WordPress::rest_write($p,new FakeRequest(['meta_data'=>[['key'=>'meister_translations','value'=>[]]]])) instanceof WP_Error,'prevent bypass');
 check(MT_WordPress::rest_write($p,new FakeRequest(['meta_data'=>[['key'=>'other','value'=>'ok']]]))===$p,'unrelated untouched');
 check(MT_WordPress::rest_write($p,new FakeRequest(['meta_data'=>[['id'=>91,'value'=>'bypass']]])) instanceof WP_Error,'prevent metadata ID-only bypass');
});
class FakeWCMetaData {
 private $data;
 function __construct($id,$key,$value) { $this->data=['id'=>$id,'key'=>$key,'value'=>$value]; }
 function get_data() { return $this->data; }
 function __get($key) { return $this->data[$key] ?? null; }
}
test('Woo REST rejects persisted protected IDs after controller preparation renames or deletes in-memory metadata', function() {
 $failures=[];
 foreach (['rename','delete'] as $operation) {
  setup_products(); $p=$GLOBALS['products'][7]; $before=$GLOBALS['persisted_meta'];
  // Woo v3 prepares metadata BEFORE woocommerce_rest_pre_insert_product_object.
  // Renaming changes the key; deletion leaves no visible protected metadata object.
  $p->meta_objects=$operation==='rename' ? [new FakeWCMetaData(91,'other','bypass')] : [];
  $meta=['id'=>91,'key'=>'other','value'=>$operation==='delete' ? null : 'bypass'];
  $result=MT_WordPress::rest_write($p,new FakeRequest(['meta_data'=>[$meta]]));
  if (!($result instanceof WP_Error) || $result->code!=='meister_read_only') $failures[]=$operation;
  check($p->saves===0 && $GLOBALS['persisted_meta']===$before,'guard performs no saves or persisted mutations');
 }
 check($failures===[],'protected persisted ID bypass after controller preparation: '.implode(', ',$failures));
});
test('Woo REST persisted ID ownership checks preserve unrelated metadata updates', function() {
 setup_products(); $p=$GLOBALS['products'][7]; $p->meta_objects=[]; $before=$GLOBALS['persisted_meta'];
 foreach ([['id'=>92,'key'=>'renamed_other','value'=>'changed'],['id'=>92,'value'=>null],['id'=>93,'key'=>'other','value'=>'foreign product ID'],['id'=>999,'key'=>'other','value'=>'missing ID'],['key'=>'other','value'=>'new metadata']] as $meta) {
  check(MT_WordPress::rest_write($p,new FakeRequest(['meta_data'=>[$meta]]))===$p,'only persisted protected IDs owned by this product are blocked');
 }
 check($p->saves===0 && $GLOBALS['persisted_meta']===$before,'unrelated guard checks remain read-only');
});
test('Woo REST handles unserialized WC metadata objects and arrays preserving unrelated objects', function() {
 setup_products(); $p=$GLOBALS['products'][7];
 $private=new FakeWCMetaData(91,'meister_translations',['version'=>1]);
 $other=new FakeWCMetaData(92,'other','keep'); $array=['id'=>93,'key'=>'array_other','value'=>'also keep'];
 $response=new FakeResponse(['meta_data'=>[$private,$other,['key'=>'meister_translations','value'=>'private'],$array]]);
 MT_WordPress::rest_product($response,$p,null);
 check($response->data['meta_data']===[$other,$array],'remove private array/object entries without converting unrelated objects');
 $GLOBALS['caps']['manage_woocommerce']=false;
 $response=new FakeResponse(['meta_data'=>[$private,$other]]); MT_WordPress::rest_product($response,$p,null);
 check($response->data['meta_data']===[$other] && !isset($response->data['meister_translations']),'anonymous object metadata protected');
});
test('editor nonce permissions explicit save and source-change guard protect manual edits', function() {
 setup_products(); $GLOBALS['admin_errors']=[]; $p=$GLOBALS['products'][7]; $hash=MT_Core::hash(MT_Service::source($p));
 $_POST=['mt_nonce'=>'wrong','mt'=>['el'=>['save'=>'1','source_hash'=>$hash,'status'=>'published','name'=>'Νέο']]];
 MT_WordPress::save_editor(7); check($p->saves===0,'nonce');
 $_POST['mt_nonce']='valid'; $_POST['mt']['el']['source_hash']=str_repeat('0',64); MT_WordPress::save_editor(7); check($p->saves===0,'stale editing');
 $_POST['mt']['el']['source_hash']=$hash; unset($_POST['mt']['el']['save']); MT_WordPress::save_editor(7); check($p->saves===0,'explicit save only');
 $_POST['mt']['el']['save']='1'; $GLOBALS['caps']['publish_products']=false; MT_WordPress::save_editor(7); check($p->saves===0,'publication permission');
 $_POST['mt']['el']['status']='draft'; MT_WordPress::save_editor(7); check($p->saves===1 && $p->meta['meister_translations']['el']['name']==='Νέο','draft editor CRUD');
 $_POST=[];
});
test('REST bounded tools routes defaults and strict option rejection', function() {
 setup_products(); MT_WordPress::routes(); check(count($GLOBALS['routes'])===3,'three routes');
 $route=$GLOBALS['routes']['meister-translations/v1/import']; check(call_user_func($route['permission_callback'])===true,'privileged permission');
 $r=MT_WordPress::endpoint('import',new FakeRequest(['job'=>actual_job()])); check($r['dry_run']===true && $GLOBALS['products'][7]->saves===0,'dry REST');
 check(MT_WordPress::endpoint('import',new FakeRequest(['job'=>actual_job(),'apply'=>'true'])) instanceof WP_Error,'strict boolean');
 check(MT_WordPress::endpoint('generate',new FakeRequest(['ids'=>[7],'locale'=>'el','apply'=>true])) instanceof WP_Error,'cost confirmation required');
 $GLOBALS['caps']['manage_woocommerce']=false; check(call_user_func($route['permission_callback']) instanceof WP_Error,'unauthorized');
});
function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES); }
function esc_attr($s) { return esc_html($s); }
function esc_textarea($s) { return esc_html($s); }
function wp_nonce_field($action,$name) { echo '<input name="'.$name.'" value="valid">'; }
function add_meta_box(...$args) { $GLOBALS['meta_box']=$args; }
function add_submenu_page(...$args) { $GLOBALS['submenu']=$args; }
function get_the_ID() { return 7; }
class WP_CLI {
 static $commands=[]; static $output=[];
 static function add_command($name,$class) { self::$commands[$name]=$class; }
 static function line($line) { self::$output[]=$line; }
 static function error($line) { throw new InvalidArgumentException($line); }
}
plugin_file('admin.php');
plugin_file('cli.php');
test('product editor shows escaped bilingual draft fields source-change warning explicit review controls', function() {
 setup_products(); $GLOBALS['products'][7]->meta['meister_translations']=['version'=>1,'el'=>['status'=>'draft','source_hash'=>str_repeat('0',64),'name'=>'<script>unsafe</script>']];
 ob_start(); MT_Admin::editor(); $html=ob_get_clean(); check(strpos($html,'Source changed')!==false,'source warning'); check(strpos($html,'&lt;script&gt;')!==false && strpos($html,'<script>unsafe')===false,'escape editor values'); check(strpos($html,'mt[el][save]')!==false && strpos($html,'mt[en][name]')!==false && strpos($html,'mt_nonce')!==false,'bilingual explicit editor');
 ob_start(); MT_Admin::tools(); $html=ob_get_clean(); check(strpos($html,'Generate')!==false && strpos($html,'confirm_cost')!==false && strpos($html,'OPENAI_API_KEY')===false,'tools no credential field');
});
test('CLI explicit false apply remains a no-network dry run', function() {
 setup_products(); $cli=new MT_CLI();
 $cli->generate([],['ids'=>'7','apply'=>false]);
 $r=json_decode(end(WP_CLI::$output),true);
 check($r['dry_run']===true && $GLOBALS['products'][7]->saves===0,'--no-apply must not apply or require cost confirmation');
});
// Readable JSON fixture without disk or database writes, including over SSH stdin.
class FakeCLIJobStream {
 public $context; private $offset=0;
 function stream_open($path,$mode,$options,&$opened_path) { $this->offset=0; return true; }
 function stream_read($count) { $chunk=substr($GLOBALS['cli_job_json'],$this->offset,$count); $this->offset+=strlen($chunk); return $chunk; }
 function stream_eof() { return $this->offset>=strlen($GLOBALS['cli_job_json']); }
 function stream_stat() { return ['mode'=>0100444,'size'=>strlen($GLOBALS['cli_job_json'])]; }
 function url_stat($path,$flags) { return $this->stream_stat(); }
}
stream_wrapper_register('mtjob',FakeCLIJobStream::class);
test('CLI import honors explicit false apply publish and overwrite flags', function() {
 $cli=new MT_CLI(); setup_products(); $GLOBALS['cli_job_json']=json_encode(actual_job());
 $cli->import(['mtjob://fixture'],['apply'=>false,'publish'=>false,'overwrite'=>false]);
 $r=json_decode(end(WP_CLI::$output),true);
 check($r['dry_run']===true && $GLOBALS['products'][7]->saves===0,'false apply must remain dry');
 $cli->import(['mtjob://fixture'],['apply'=>true,'publish'=>false,'overwrite'=>false]);
 check($GLOBALS['products'][7]->meta['meister_translations']['el']['status']==='draft','false publish must remain draft');
 setup_products(); $GLOBALS['products'][7]->meta['meister_translations']=['version'=>1,'el'=>['name'=>'Manual']];
 $GLOBALS['cli_job_json']=json_encode(actual_job());
 rejects(fn()=>$cli->import(['mtjob://fixture'],['apply'=>true,'overwrite'=>false]));
 check($GLOBALS['products'][7]->saves===0,'false overwrite preserves manual translation');
});
test('CLI rejects ambiguous flag values before any product save or paid provider call', function() {
 $cli=new MT_CLI();
 foreach (['false','true','0','1','',0,1,null,[]] as $value) {
  foreach (['apply','publish','overwrite'] as $flag) {
   setup_products(); $GLOBALS['cli_job_json']=json_encode(actual_job()); $calls=count($GLOBALS['http_calls']);
   rejects(fn()=>$cli->import(['mtjob://fixture'],array_replace(['apply'=>true],[$flag=>$value])));
   check($GLOBALS['products'][7]->saves===0 && count($GLOBALS['http_calls'])===$calls,'invalid import flag must not write or call provider');
  }
  foreach (['apply','confirm-cost'] as $flag) {
   setup_products(); $calls=count($GLOBALS['http_calls']);
   rejects(fn()=>$cli->generate([],array_replace(['ids'=>'7','apply'=>true,'confirm-cost'=>true],[$flag=>$value])));
   check($GLOBALS['products'][7]->saves===0 && count($GLOBALS['http_calls'])===$calls,'invalid generation flag must not write or call provider');
  }
 }
 setup_products(); $calls=count($GLOBALS['http_calls']);
 rejects(fn()=>$cli->generate([],['ids'=>'7','apply'=>true,'confirm-cost'=>false]));
 check($GLOBALS['products'][7]->saves===0 && count($GLOBALS['http_calls'])===$calls,'false cost consent must not call paid provider');
 $GLOBALS['cli_job_json']=json_encode(actual_job());
 $cli->import(['mtjob://fixture'],['apply'=>true,'publish'=>true]);
 check($GLOBALS['products'][7]->meta['meister_translations']['el']['status']==='published','explicit boolean true publication remains supported');
});
test('bulk admin nonce enforced and CLI export dry-run generate cost guard', function() {
 setup_products(); $_POST=['mt_tool_action'=>'export','mt_tools_nonce'=>'wrong'];
 rejects(fn()=>MT_Admin::request());
 $_POST=['mt_tool_action'=>'export','mt_tools_nonce'=>'valid','mt_ids'=>'7,8','mt_locale'=>'el']; $job=MT_Admin::request(); check(count($job['products'])===2,'admin export');
 $_POST=['mt_tool_action'=>'import','mt_tools_nonce'=>'valid','mt_job'=>json_encode(actual_job())]; check(MT_Admin::request()['dry_run']===true,'admin dry default');
 $_POST=['mt_tool_action'=>'generate','mt_tools_nonce'=>'valid','mt_ids'=>'7','mt_apply'=>'1']; rejects(fn()=>MT_Admin::request()); $_POST=[];
 $cli=new MT_CLI(); $cli->export([],['ids'=>'7,8','locale'=>'el']); $r=json_decode(end(WP_CLI::$output),true); check(count($r['products'])===2,'CLI bounded export');
 $cli->generate([],['ids'=>'7']); $r=json_decode(end(WP_CLI::$output),true); check($r['dry_run']===true,'CLI default no network'); rejects(fn()=>$cli->generate([],['ids'=>'7','apply'=>true]));
 rejects(fn()=>MT_Admin::ids('7,7')); rejects(fn()=>MT_Admin::ids('7evil')); rejects(fn()=>MT_Admin::ids('0')); rejects(fn()=>MT_Admin::ids('1, 2,'));
});
define('ABSPATH','/not-a-real-wordpress/'); define('WP_CLI',true);
plugin_file('meister-product-translations.php');
test('plugin bootstrap registers Woo editor REST guards menu and CLI without installation', function() {
 foreach(['woocommerce_rest_prepare_product_object','woocommerce_rest_pre_insert_product_object','woocommerce_process_product_meta','rest_api_init','add_meta_boxes','admin_menu'] as $hook) check(isset($GLOBALS['hooks'][$hook]),'missing hook '.$hook);
 check(isset(WP_CLI::$commands['meister-translations']),'CLI registered');
});
test('import verifies persisted metadata readback and releases locks on database failure', function() {
 setup_products(); $job=actual_job(); $GLOBALS['products'][7]->readback_bad=true;
 try { MT_Service::import($job,['apply'=>true]); } catch (RuntimeException $e) { check($GLOBALS['locks']===[],'failure releases locks'); return; }
 throw new Exception('Expected failed persistence verification');
});
test('canonical source object key order does not change job hash validation', function() {
 $job=actual_job(); $job['products'][0]['source']=array_reverse($job['products'][0]['source'],true); check(MT_Core::job($job)['version']===1,'unordered JSON object');
});
test('optimistic validation never clobbers intervening manual metadata', function() {
 setup_products(); $job=actual_job([7,8]);
 $GLOBALS['products'][7]->on_save=function() { $GLOBALS['products'][8]->meta['meister_translations']=['version'=>1,'en'=>['name'=>'Intervening manual English']]; };
 rejects(fn()=>MT_Service::import($job,['apply'=>true]));
 check($GLOBALS['products'][8]->meta['meister_translations']['en']['name']==='Intervening manual English' && $GLOBALS['products'][8]->saves===0,'intervening work preserved');
 check($GLOBALS['locks']===[],'conflict locks released');
});
