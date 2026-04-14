<?php
// get_filters.php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$host = 'localhost';
$db   = 'intellig_ism1';
$user = 'intellig_ism1';
$pass = 'testism@1234';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

/**
 * Safe JSON decode.
 * Returns $default when input is empty/invalid JSON.
 */
function safe_json_decode($value, $default = null) {
    if ($value === null || $value === '') {
        return $default;
    }
    if (is_array($value)) {
        return $value;
    }
    if (!is_string($value)) {
        return $default;
    }
    $decoded = json_decode($value, true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : $default;
}

/**
 * Parse options robustly:
 * - JSON array
 * - double-encoded JSON array string
 * - legacy comma-separated text
 */
function parse_options_field($value): array {
    if ($value === null || $value === '') return [];

    if (is_array($value)) {
        return array_values(array_map('strval', $value));
    }

    if (is_string($value)) {
        $trimmed = trim($value);

        // Try normal + double decode
        for ($i = 0; $i < 2; $i++) {
            $decoded = safe_json_decode($trimmed, null);
            if (is_array($decoded)) {
                return array_values(array_map(function ($item) {
                    if (is_scalar($item) || $item === null) return (string)$item;
                    if (is_array($item)) {
                        if (isset($item['label'])) return (string)$item['label'];
                        if (isset($item['value'])) return (string)$item['value'];
                        return json_encode($item);
                    }
                    return (string)$item;
                }, $decoded));
            }
            if (is_string($decoded)) {
                $trimmed = trim($decoded);
                continue;
            }
            break;
        }

        // Legacy CSV fallback
        if ($trimmed !== '' && $trimmed[0] !== '[' && $trimmed[0] !== '{') {
            return array_values(array_filter(array_map('trim', explode(',', $trimmed)), function ($x) {
                return $x !== '';
            }));
        }
    }

    return [];
}

/**
 * Normalize bool from MySQL-ish values.
 */
function normalize_bool($value, bool $default = false): bool {
    if (is_bool($value)) return $value;
    if (is_int($value)) return $value === 1;
    if (is_string($value)) {
        $v = strtolower(trim($value));
        if ($v === '1' || $v === 'true' || $v === 'yes') return true;
        if ($v === '0' || $v === 'false' || $v === 'no' || $v === '') return false;
    }
    return $default;
}

/**
 * Normalize queryPreview flag from queryPreview/query_preview/querypreview.
 */
function normalize_query_preview_flag(array $row): bool {
    $candidates = [
        $row['queryPreview'] ?? null,
        $row['query_preview'] ?? null,
        $row['querypreview'] ?? null,
    ];

    foreach ($candidates as $v) {
        if ($v === true || $v === 1) return true;
        if ($v === false || $v === 0 || $v === null || $v === '') continue;
        if (is_string($v)) {
            $t = trim($v);
            if ($t === '1' || strcasecmp($t, 'true') === 0) return true;
            if ($t === '0' || strcasecmp($t, 'false') === 0) continue;
        }
    }
    return false;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Keep current behavior: return active filters only
    $stmt = $pdo->query("SELECT * FROM filtermaster_1 WHERE isActive = 1 ORDER BY position ASC, id ASC");
    $filters = $stmt->fetchAll();

    foreach ($filters as &$filter) {
        // JSON-like columns
        $filter['options'] = parse_options_field($filter['options'] ?? null);

        $config = safe_json_decode($filter['config'] ?? null, null);
        if ($config !== null) {
            $filter['config'] = $config;
        }

        $tags = safe_json_decode($filter['tags'] ?? null, null);
        if ($tags !== null) {
            $filter['tags'] = $tags;
        }

        $advancedConfig = safe_json_decode($filter['advancedConfig'] ?? null, null);
        if ($advancedConfig !== null) {
            $filter['advancedConfig'] = $advancedConfig;
        }

        // queryBuilder may be object JSON or string (possibly double-encoded)
        if (isset($filter['queryBuilder']) && $filter['queryBuilder'] !== null && $filter['queryBuilder'] !== '') {
            $qb = safe_json_decode($filter['queryBuilder'], null);
            if (is_string($qb)) {
                $qb = safe_json_decode($qb, null);
            }
            if ($qb !== null) {
                $filter['queryBuilder'] = $qb;
            }
        }

        // Canonical aliases (support old+new schema names)
        if (!isset($filter['webapiType']) && isset($filter['webapitype'])) {
            $filter['webapiType'] = $filter['webapitype'];
        }
        if (!isset($filter['staticOptions']) && isset($filter['staticoption'])) {
            $filter['staticOptions'] = $filter['staticoption'];
        }

        // Keep staticOptions as plain string (do NOT json_decode this)
        if (!isset($filter['staticOptions'])) {
            $filter['staticOptions'] = '';
        }

        // Normalize flags/booleans for frontend consistency
        $filter['isActive'] = normalize_bool($filter['isActive'] ?? null, true);
        $filter['required'] = normalize_bool($filter['required'] ?? null, false);
        $filter['visible'] = normalize_bool($filter['visible'] ?? null, true);
        $filter['multiSelect'] = normalize_bool($filter['multiSelect'] ?? null, false);
        $filter['allowCustom'] = normalize_bool($filter['allowCustom'] ?? null, false);

        // Normalize queryPreview toggle for frontend
        $filter['queryPreview'] = normalize_query_preview_flag($filter);
    }
    unset($filter);

    echo json_encode([
        'success' => true,
        'filters' => $filters
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
