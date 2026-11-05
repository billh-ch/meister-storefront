<?php
/** Pure matching and integer allocation; no WordPress state or prices from clients. */
final class Meister_Promotions_Engine {
    public static function validate_rule(array $rule): array {
        $requirements = $rule['requirements'] ?? [];
        if (count($requirements) < 2 || count($requirements) > 12) {
            throw new InvalidArgumentException('A bundle needs 2–12 product requirements.');
        }
        $seen = [];
        foreach ($requirements as $r) {
            $p = $r['productId'] ?? 0; $v = $r['variationId'] ?? 0; $q = $r['quantity'] ?? 0;
            if (!is_int($p) || $p < 1 || !is_int($v) || $v < 0 || !is_int($q) || $q < 1 || $q > 99) {
                throw new InvalidArgumentException('Invalid bundle product or quantity.');
            }
            $key = "$p:$v";
            if (isset($seen[$key])) { throw new InvalidArgumentException('Combine duplicate bundle requirements.'); }
            $seen[$key] = true;
        }
        if (isset($rule['type']) && !in_array($rule['type'], ['percent','fixed'], true)) {
            throw new InvalidArgumentException('Invalid bundle discount type.');
        }
        if (isset($rule['amount']) && (!is_numeric($rule['amount']) || (float)$rule['amount'] <= 0 || (float)$rule['amount'] > 100000 || (($rule['type'] ?? '') === 'percent' && (float)$rule['amount'] > 100))) {
            throw new InvalidArgumentException('Invalid bundle discount amount.');
        }
        $max = $rule['maxSets'] ?? 0;
        if (!is_int($max) || $max < 0 || $max > 99) { throw new InvalidArgumentException('Invalid bundle set limit.'); }
        return $rule;
    }

    public static function bundle_sets(array $lines, array $rule): array {
        self::validate_rule($rule);
        $requirements = $rule['requirements'];
        // Exact variations consume their units first; parent selectors can use remaining variations.
        usort($requirements, static fn($a,$b) => (($b['variationId'] ?? 0) > 0) <=> (($a['variationId'] ?? 0) > 0));
        $try = static function(int $sets) use ($lines,$requirements): ?array {
            $remaining = []; $used = [];
            foreach ($lines as $line) { $remaining[$line['key']] = $line['quantity']; }
            foreach ($requirements as $r) {
                $needed = $r['quantity'] * $sets;
                foreach ($lines as $line) {
                    if ($line['productId'] !== $r['productId'] || (($r['variationId'] ?? 0) && ($line['variationId'] ?? 0) !== $r['variationId'])) { continue; }
                    $n = min($needed, $remaining[$line['key']]);
                    if ($n > 0) { $remaining[$line['key']] -= $n; $used[$line['key']] = ($used[$line['key']] ?? 0) + $n; $needed -= $n; }
                    if (!$needed) { break; }
                }
                if ($needed) { return null; }
            }
            // Preserve input line ordering for deterministic allocation and snapshots.
            $ordered = [];
            foreach ($lines as $line) { if (isset($used[$line['key']])) { $ordered[$line['key']] = $used[$line['key']]; } }
            return $ordered;
        };
        $low = 0; $high = $rule['maxSets'] ?? 0;
        if (!$high) { $high = array_sum(array_column($lines,'quantity')); }
        while ($low < $high) { $mid = intdiv($low + $high + 1,2); if ($try($mid) !== null) { $low = $mid; } else { $high = $mid - 1; } }
        return ['sets'=>$low, 'quantities'=>$low ? $try($low) : []];
    }

    /** Amount-only refunds are allocated using the original gross merchandise/order ratio. */
    public static function net_merchandise(int $merchandise,int $orderTotal,array $refunds): int {
        if(array_sum(array_column($refunds,'total')) >= $orderTotal && $orderTotal>0){return 0;}
        $net=$merchandise;
        foreach($refunds as $refund){$known=max(0,$refund['merchandise']);$unallocated=max(0,$refund['total']-$known-max(0,$refund['shipping']));$share=$orderTotal>0?intdiv($unallocated*$merchandise+intdiv($orderTotal,2),$orderTotal):0;$net-=$known+$share;}
        return max(0,$net);
    }
    /** Largest remainder, stable input ordering for tied cents. */
    public static function allocate(int $saving, array $weights): array {
        $sum = array_sum($weights); $saving = max(0,min($saving,$sum)); $out = []; $remainders = [];
        foreach ($weights as $key=>$weight) {
            if (!is_int($weight) || $weight < 0) { throw new InvalidArgumentException('Invalid merchandise allocation.'); }
            $out[$key] = $sum ? intdiv($saving*$weight,$sum) : 0;
            $remainders[$key] = $sum ? ($saving*$weight)%$sum : 0;
        }
        arsort($remainders,SORT_NUMERIC); $left = $saving-array_sum($out);
        foreach ($remainders as $key=>$_) { if ($left-- <= 0) { break; } $out[$key]++; }
        return $out;
    }
}
