<?php
/**
 * The add-ons data contract, pure PHP (no WordPress calls). Mirrors
 * lib/addons/contract.ts in the storefront exactly; the shared fixture
 * wordpress/fixtures/product-addons-contract.json is run against both.
 *
 * {"version":1,"groups":[{"id":"camo","type":"single","name":{"en":"…","el":"…"},
 *   "options":[{"id":"split","name":{"en":"…","el":"…"},"price":"30.00"}]}]}
 */
final class MPA_Core {
    const META_KEY = 'meister_addons';
    const LINE_META_KEY = '_meister_addons';
    const LINE_TOTAL_META_KEY = '_meister_addons_total';
    const LINE_ERROR_META_KEY = '_meister_addons_error';
    const VERSION = 1;
    const ID_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/D';
    const REF_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/D';
    const PRICE_PATTERN = '/^(?:0|[1-9][0-9]{0,4})\.[0-9]{2}$/D';
    const ID_MAX = 40;
    const NAME_MAX = 80;
    const MAX_GROUPS = 10;
    const MAX_OPTIONS_PER_GROUP = 20;
    const MAX_OPTIONS_TOTAL = 40;
    const MAX_RAW_BYTES = 20000;

    /** Validates a raw meta value. Returns the decoded config or throws with a message an editor can act on. */
    public static function validate($raw): array {
        if (!is_string($raw) || $raw === '') throw new InvalidArgumentException('Add-ons must be a JSON string.');
        if (strlen($raw) > self::MAX_RAW_BYTES) throw new InvalidArgumentException('Add-ons definition is too large.');
        try { $data = json_decode($raw, false, 64, JSON_THROW_ON_ERROR); }
        catch (JsonException $e) { throw new InvalidArgumentException('Add-ons are not valid JSON.'); }
        self::keys($data, ['version', 'groups'], 'The add-ons definition');
        if ($data->version !== self::VERSION) throw new InvalidArgumentException('Unsupported add-ons version.');
        if (!is_array($data->groups) || count($data->groups) === 0) throw new InvalidArgumentException('Add at least one add-on group, or remove all add-ons.');
        if (count($data->groups) > self::MAX_GROUPS) throw new InvalidArgumentException('At most ' . self::MAX_GROUPS . ' add-on groups.');
        $groupIds = []; $optionIds = []; $groups = [];
        foreach ($data->groups as $gi => $group) {
            $where = 'Group ' . ($gi + 1);
            self::keys($group, ['id', 'type', 'name', 'options'], $where);
            self::id($group->id, $where);
            if (isset($groupIds[$group->id])) throw new InvalidArgumentException("$where: the id \"{$group->id}\" is used twice.");
            if ($group->type !== 'single' && $group->type !== 'multi') throw new InvalidArgumentException("$where: type must be single (choose one) or multi (any number).");
            $name = self::name($group->name, $where);
            if (!is_array($group->options) || count($group->options) === 0) throw new InvalidArgumentException("$where: add at least one option.");
            if (count($group->options) > self::MAX_OPTIONS_PER_GROUP) throw new InvalidArgumentException("$where: at most " . self::MAX_OPTIONS_PER_GROUP . ' options.');
            $groupIds[$group->id] = true;
            $options = [];
            foreach ($group->options as $oi => $option) {
                $owhere = "$where, option " . ($oi + 1);
                self::keys($option, ['id', 'name', 'price'], $owhere);
                self::id($option->id, $owhere);
                if (isset($optionIds[$option->id])) throw new InvalidArgumentException("$owhere: the id \"{$option->id}\" is already used in this product.");
                $oname = self::name($option->name, $owhere);
                if (!is_string($option->price) || !preg_match(self::PRICE_PATTERN, $option->price) || self::cents($option->price) <= 0) {
                    throw new InvalidArgumentException("$owhere: price must be a euro amount above zero with two decimals, e.g. 30.00 (VAT included).");
                }
                $optionIds[$option->id] = true;
                $options[] = ['id' => $option->id, 'name' => $oname, 'price' => $option->price];
            }
            $groups[] = ['id' => $group->id, 'type' => $group->type, 'name' => $name, 'options' => $options];
        }
        if (count($optionIds) > self::MAX_OPTIONS_TOTAL) throw new InvalidArgumentException('At most ' . self::MAX_OPTIONS_TOTAL . ' options per product.');
        return ['version' => self::VERSION, 'groups' => $groups];
    }

    /** Fail closed: null for anything invalid. */
    public static function parse($raw): ?array {
        try { return self::validate($raw); } catch (InvalidArgumentException $e) { return null; }
    }

    /** Canonical JSON for storage. */
    public static function encode(array $config): string {
        $json = json_encode(self::validate(json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        return $json;
    }

    /** "30.00" → 3000 (only for strings that passed PRICE_PATTERN, or WooCommerce decimal prices). */
    public static function cents(string $amount): int {
        if (!preg_match('/^-?[0-9]+(?:\.[0-9]+)?$/D', $amount)) throw new InvalidArgumentException('Not a decimal amount.');
        return (int)round(((float)$amount) * 100);
    }
    public static function euros(int $cents): string {
        return sprintf('%d.%02d', intdiv($cents, 100), $cents % 100);
    }

    /**
     * Resolves "group:option" references against a valid config. Throws on
     * malformed, duplicate or unknown references and on two options of one
     * single group. Returns the chosen options in definition order.
     */
    public static function resolve(array $config, array $refs): array {
        if (count($refs) === 0 || count($refs) > self::MAX_OPTIONS_TOTAL) throw new InvalidArgumentException('Invalid add-on selection.');
        if (count(array_unique($refs)) !== count($refs)) throw new InvalidArgumentException('Duplicate add-on.');
        $index = [];
        foreach ($config['groups'] as $gi => $group) foreach ($group['options'] as $oi => $option) $index[$group['id'] . ':' . $option['id']] = [$gi, $oi];
        $found = []; $perGroup = [];
        foreach ($refs as $ref) {
            if (!is_string($ref) || !preg_match(self::REF_PATTERN, $ref)) throw new InvalidArgumentException('Malformed add-on reference.');
            if (!isset($index[$ref])) throw new InvalidArgumentException("Add-on $ref is not offered by this product.");
            [$gi, $oi] = $index[$ref];
            $group = $config['groups'][$gi];
            $perGroup[$group['id']] = ($perGroup[$group['id']] ?? 0) + 1;
            if ($group['type'] === 'single' && $perGroup[$group['id']] > 1) throw new InvalidArgumentException("Only one option of {$group['id']} may be chosen.");
            $found[] = [$gi, $oi];
        }
        usort($found, static fn($a, $b) => $a[0] <=> $b[0] ?: $a[1] <=> $b[1]);
        return array_map(static function ($position) use ($config) {
            $group = $config['groups'][$position[0]];
            $option = $group['options'][$position[1]];
            return ['ref' => $group['id'] . ':' . $option['id'], 'group' => $group['name'], 'option' => $option['name'], 'cents' => self::cents($option['price'])];
        }, $found);
    }

    /**
     * Builds a config from the editor form. Blank rows are ignored; ids are
     * generated from the English name once, then kept forever; prices accept
     * "30", "30,5" or "30.50". The result still goes through validate().
     * Returns null when every row was removed or blank (= no add-ons).
     */
    public static function from_form(array $form, callable $slugify): ?array {
        $groups = [];
        foreach (array_values(is_array($form['groups'] ?? null) ? $form['groups'] : []) as $gi => $g) {
            if (!is_array($g) || !empty($g['remove'])) continue;
            $options = [];
            foreach (array_values(is_array($g['options'] ?? null) ? $g['options'] : []) as $o) {
                if (!is_array($o) || !empty($o['remove'])) continue;
                $fields = array_map(static fn($k) => self::text($o[$k] ?? ''), ['id', 'name_en', 'name_el', 'price']);
                if (implode('', $fields) === '') continue;
                [$id, $en, $el, $price] = $fields;
                $options[] = ['id' => $id !== '' ? $id : $slugify($en), 'name' => ['en' => $en, 'el' => $el], 'price' => self::price_input($price)];
            }
            $fields = array_map(static fn($k) => self::text($g[$k] ?? ''), ['id', 'name_en', 'name_el']);
            if (implode('', $fields) === '' && !$options) continue;
            [$id, $en, $el] = $fields;
            $groups[] = ['id' => $id !== '' ? $id : $slugify($en), 'type' => (string)($g['type'] ?? ''), 'name' => ['en' => $en, 'el' => $el], 'options' => $options];
        }
        return $groups ? ['version' => self::VERSION, 'groups' => $groups] : null;
    }

    private static function text($value): string {
        return is_string($value) ? trim(preg_replace('/\s+/u', ' ', $value) ?? '') : '';
    }
    private static function price_input(string $value): string {
        $value = str_replace(',', '.', $value);
        if (preg_match('/^[0-9]+$/D', $value)) return $value . '.00';
        if (preg_match('/^[0-9]+\.[0-9]$/D', $value)) return $value . '0';
        return $value;
    }
    private static function keys($value, array $keys, string $where): void {
        if (!($value instanceof stdClass)) throw new InvalidArgumentException("$where is not an object.");
        $own = array_keys(get_object_vars($value));
        sort($own); $want = $keys; sort($want);
        if ($own !== $want) throw new InvalidArgumentException("$where must have exactly: " . implode(', ', $keys) . '.');
    }
    private static function id($value, string $where): void {
        if (!is_string($value) || strlen($value) > self::ID_MAX || !preg_match(self::ID_PATTERN, $value)) {
            throw new InvalidArgumentException("$where: id must be lowercase letters, digits and single hyphens (max " . self::ID_MAX . ' characters), e.g. knee-pads.');
        }
    }
    private static function name($value, string $where): array {
        self::keys($value, ['en', 'el'], "$where name");
        $out = [];
        foreach (['en' => 'English', 'el' => 'Greek'] as $locale => $label) {
            $text = $value->$locale;
            if (!is_string($text) || $text === '' || $text !== preg_replace('/^\s+|\s+$/u', '', $text) || !mb_check_encoding($text, 'UTF-8') || mb_strlen($text, 'UTF-8') > self::NAME_MAX || preg_match('/[\x00-\x1f\x7f<>]/', $text)) {
                throw new InvalidArgumentException("$where: the $label name is required, at most " . self::NAME_MAX . ' characters, without < or >.');
            }
            $out[$locale] = $text;
        }
        return $out;
    }
}
