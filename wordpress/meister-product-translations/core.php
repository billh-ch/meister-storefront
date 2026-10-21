<?php
/** Translation contract and bounded job validation; no WordPress I/O. */
final class MT_Core {
    const FIELDS = ['name', 'short_description', 'description'];
    const MAX_FIELD = 100000;
    const MAX_ROWS = 50;
    const MAX_JOB = 2097152;
    public static function decode(string $json): array {
        if (strlen($json) > self::MAX_JOB) throw new InvalidArgumentException('Job exceeds 2 MiB');
        $job = json_decode($json, true, 32);
        if (!is_array($job) || json_last_error() !== JSON_ERROR_NONE) throw new InvalidArgumentException('Invalid JSON');
        return self::job($job);
    }
    private static function keys(array $value, array $allowed): void {
        if (array_diff(array_keys($value), $allowed)) throw new InvalidArgumentException('Unknown keys');
    }
    public static function texts($value): array {
        if (!is_array($value) || !$value) throw new InvalidArgumentException('Translation fields required');
        self::keys($value, self::FIELDS);
        foreach ($value as $field=>$text) {
            $limit = $field === 'name' ? 1000 : self::MAX_FIELD;
            if (!is_string($text) || strlen($text) > $limit || strpos($text, "\0") !== false || !preg_match('//u', $text)) throw new InvalidArgumentException('Invalid text or '.$field.' exceeds '.$limit.' UTF-8 bytes');
        }
        return $value;
    }
    public static function locale($locale): string {
        if (!in_array($locale, ['en','el'], true)) throw new InvalidArgumentException('Unsupported locale');
        return $locale;
    }
    public static function job(array $job): array {
        self::keys($job, ['version','locale','products']);
        if (($job['version'] ?? null) !== 1) throw new InvalidArgumentException('Unsupported job version');
        self::locale($job['locale'] ?? null);
        $rows = $job['products'] ?? null;
        if (!is_array($rows) || !array_is_list($rows) || count($rows) < 1 || count($rows) > self::MAX_ROWS) throw new InvalidArgumentException('Job requires 1..50 products');
        $seen = [];
        foreach ($rows as $row) {
            if (!is_array($row)) throw new InvalidArgumentException('Invalid row');
            self::keys($row, ['id','source_hash','source','translation']);
            $id = $row['id'] ?? null;
            if (!is_int($id) || $id < 1 || isset($seen[$id])) throw new InvalidArgumentException('Invalid or duplicate product ID');
            $seen[$id] = true;
            if (!is_string($row['source_hash'] ?? null) || !preg_match('/^[a-f0-9]{64}$/D', $row['source_hash'])) throw new InvalidArgumentException('Invalid source hash');
            self::texts($row['translation'] ?? null);
            if (isset($row['source'])) {
                self::texts($row['source']);
                if (count($row['source']) !== count(self::FIELDS) || self::hash($row['source']) !== $row['source_hash']) throw new InvalidArgumentException('Invalid canonical source');
            }
        }
        if (strlen(json_encode($job, JSON_UNESCAPED_UNICODE)) > self::MAX_JOB) throw new InvalidArgumentException('Job exceeds 2 MiB');
        return $job;
    }
    public static function hash(array $source): string {
        return hash('sha256', implode("\0", array_map(static function($key) use ($source) { return $source[$key] ?? ''; }, self::FIELDS)));
    }
}
