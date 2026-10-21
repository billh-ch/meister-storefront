<?php
/** WP CLI output contains catalog content only; keep exports private. */
final class MT_CLI {
    private static function flag(array $assoc, string $name): bool {
        if (!array_key_exists($name, $assoc)) return false;
        if (!is_bool($assoc[$name])) throw new InvalidArgumentException('--'.$name.' must be a boolean flag; use --'.$name.' or --no-'.$name);
        return $assoc[$name];
    }
    private function execute(callable $operation): void {
        try { WP_CLI::line(wp_json_encode($operation())); }
        catch (Throwable $e) { WP_CLI::error($e->getMessage()); }
    }
    /** Export raw canonical sources without writing.
     * @synopsis --ids=<ids> [--locale=<locale>]
     */
    public function export($args, $assoc): void {
        $this->execute(static function() use ($assoc) { return MT_Service::export(MT_Admin::ids($assoc['ids'] ?? ''), $assoc['locale'] ?? 'el'); });
    }
    /** Import a bounded job. Dry-run and draft unless explicitly opted in.
     * @synopsis <file> [--apply] [--overwrite] [--publish]
     */
    public function import($args, $assoc): void {
        $this->execute(static function() use ($args,$assoc) {
            $file = $args[0] ?? '';
            if (!is_file($file) || !is_readable($file) || filesize($file)>MT_Core::MAX_JOB) throw new InvalidArgumentException('Readable JSON file up to 2 MiB required');
            $job = MT_Core::decode(file_get_contents($file));
            return MT_Service::import($job, ['apply'=>self::flag($assoc, 'apply'),'overwrite'=>self::flag($assoc, 'overwrite'),'publish'=>self::flag($assoc, 'publish')]);
        });
    }
    /** Generate up to three new draft translations; never overwrite or publish.
     * @synopsis --ids=<ids> [--locale=<locale>] [--apply] [--confirm-cost]
     */
    public function generate($args, $assoc): void {
        $this->execute(static function() use ($assoc) {
            $apply = self::flag($assoc, 'apply');
            $confirm_cost = self::flag($assoc, 'confirm-cost');
            if ($apply && !$confirm_cost) throw new InvalidArgumentException('--confirm-cost required with --apply');
            return MT_Generate::run(MT_Admin::ids($assoc['ids'] ?? ''), $assoc['locale'] ?? 'el', $apply);
        });
    }
}
