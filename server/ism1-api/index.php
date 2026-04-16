<?php
// index.php - RESTful API for dashboards, widgets, datasources (MySQL/PDO)
// Updated routing to handle index.php in URL and ?resource=... fallbacks
// Added data source execution endpoint for fetching external API data
// Added /sales_data endpoint for bar/line/pie charts
// TEXT/CUSTOM: chart_type forced null when not CHART; config_json sanitized (text, render_as_html, custom)
// CORS and content-type
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-User-Id");
header("Content-Type: application/json; charset=UTF-8");
// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
// Helpers
function send_json($data, $status = 200) {
    http_response_code($status);
    if ($data !== null) {
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    exit;
}
function send_error($message, $status = 400) {
    send_json(['error' => $message], $status);
}
function get_request_body() {
    $raw = file_get_contents('php://input');
    if (!$raw) return null;
    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return null;
    }
    return $decoded;
}
// Load config (update config.php with your DB credentials)
$config = require __DIR__ . '/config.php';
// Create PDO
$dsn = "mysql:host={$config->db_host};dbname={$config->db_name};charset={$config->db_charset}";
try {
    $pdo = new PDO($dsn, $config->db_user, $config->db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    send_error('Database connection failed: ' . $e->getMessage(), 500);
}
// minimal user id detection for audit logs (replace with your auth)
function current_user_id() {
    $hdr = $_SERVER['HTTP_X_USER_ID'] ?? null;
    if ($hdr !== null && is_numeric($hdr)) return (int)$hdr;
    return 1; // fallback
}
function create_audit_log($pdo, $userId, $action, $resourceType, $resourceId, $details = null) {
    try {
        $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details_json, ip_address, user_agent) VALUES (:user_id, :action, :resource_type, :resource_id, :details_json, :ip_address, :user_agent)");
        $stmt->execute([
            ':user_id' => $userId,
            ':action' => $action,
            ':resource_type' => $resourceType,
            ':resource_id' => $resourceId,
            ':details_json' => $details ? json_encode($details, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
            ':ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            ':user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ]);
    } catch (Exception $e) {
        // don't fail the API because audit failed
    }
}
/* -------------------- NEW: Normalization helpers -------------------- */
function to_int_or_default($value, $default = 0) {
    if ($value === null || $value === '' || !is_numeric($value)) return (int)$default;
    return (int)$value;
}
function to_bool_int($value, $default = 0) {
    if ($value === null) return (int)$default;
    if (is_bool($value)) return $value ? 1 : 0;
    if (is_numeric($value)) return ((int)$value) ? 1 : 0;
    if (is_string($value)) {
        $v = strtolower(trim($value));
        if (in_array($v, ['1', 'true', 'yes', 'on'], true)) return 1;
        if (in_array($v, ['0', 'false', 'no', 'off', ''], true)) return 0;
    }
    return (int)$default;
}
function normalize_csv_names($value) {
    $parts = array_filter(array_map('trim', explode(',', (string)($value ?? ''))), function ($v) {
        return $v !== '';
    });
    return implode(',', $parts);
}
function decode_json_if_not_null($value) {
    return isset($value) && $value !== null ? json_decode($value, true) : null;
}
/**
 * Chart variant normalization:
 * STACKED_BAR -> BAR
 * MULTI_SERIES_LINE -> LINE
 * COMBO -> BAR
 */
function normalize_chart_variant_value($variant) {
    if (!is_string($variant)) return null;
    $v = strtoupper(trim($variant));
    $allowed = ['BAR','PIE','LINE','DONUT','AREA','SCATTER','HORIZONTAL_BAR','STACKED_BAR','MULTI_SERIES_LINE','COMBO'];
    return in_array($v, $allowed, true) ? $v : null;
}
function chart_type_from_variant($variant, $fallbackChartType = null) {
    $v = normalize_chart_variant_value($variant);
    if ($v === 'STACKED_BAR' || $v === 'COMBO') return 'BAR';
    if ($v === 'MULTI_SERIES_LINE') return 'LINE';
    if ($v === 'DONUT') return 'PIE';
    if ($v === 'AREA' || $v === 'SCATTER') return 'LINE';
    if ($v === 'HORIZONTAL_BAR') return 'BAR';
    if ($v === 'BAR' || $v === 'PIE' || $v === 'LINE') return $v;
    return in_array($fallbackChartType, ['BAR','PIE','LINE'], true) ? $fallbackChartType : null;
}
/**
 * Normalize config_json for TEXT / CUSTOM (matches React: text, render_as_html, custom).
 */
function sanitize_widget_config_json($visualType, $config) {
    if ($config === null) {
        return null;
    }
    if (is_string($config)) {
        $dec = json_decode($config, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new stdClass();
        }
        $config = is_array($dec) ? $dec : [];
    }
    if (!is_array($config)) {
        return new stdClass();
    }
    $out = $config;
    if ($visualType === 'CHART') {
        if (array_key_exists('chart_variant', $out)) {
            $normalizedVariant = normalize_chart_variant_value($out['chart_variant']);
            if ($normalizedVariant !== null) {
                $out['chart_variant'] = $normalizedVariant;
            } else {
                unset($out['chart_variant']);
            }
        }
    }
    if (isset($out['tab_name']) && is_string($out['tab_name'])) {
        $out['tab_name'] = normalize_csv_names($out['tab_name']);
    }
    if ($visualType === 'TEXT') {
        if (isset($out['body']) && (!array_key_exists('text', $out) || $out['text'] === '' || $out['text'] === null)) {
            $out['text'] = $out['body'];
        }
        if (array_key_exists('render_as_html', $out)) {
            $out['render_as_html'] = to_bool_int($out['render_as_html'], 0) === 1;
        }
        unset($out['custom']);
    } elseif ($visualType === 'CUSTOM') {
        if (array_key_exists('custom', $out)) {
            if (is_string($out['custom'])) {
                $dec = json_decode($out['custom'], true);
                $out['custom'] = is_array($dec) ? $dec : [];
            } elseif (!is_array($out['custom'])) {
                $out['custom'] = [];
            }
        } else {
            $out['custom'] = [];
        }
    }
    if (($visualType === 'TEXT' || $visualType === 'CUSTOM') && $out === []) {
        return new stdClass();
    }
    return $out;
}
/**
 * @param array      $body
 * @param array|null $existingRow DB row on PUT so partial updates keep visual_type for TEXT/CUSTOM sanitization
 */
function normalize_widget_payload($body, $existingRow = null) {
    $visualType = 'CHART';
    if (array_key_exists('visual_type', $body)) {
        $visualType = in_array(($body['visual_type'] ?? 'CHART'), ['KPI','CHART','TABLE','TEXT','CUSTOM','MAP'], true)
            ? $body['visual_type']
            : 'CHART';
    } elseif ($existingRow && !empty($existingRow['visual_type'])) {
        $visualType = $existingRow['visual_type'];
    }
    $chartType = null;
    if ($visualType === 'CHART') {
        $configCandidate = null;
        if (array_key_exists('config_json', $body)) {
            $configCandidate = sanitize_widget_config_json($visualType, $body['config_json']);
        } elseif ($existingRow && array_key_exists('config_json', $existingRow)) {
            $configCandidate = decode_json_if_not_null($existingRow['config_json']);
        }
        $chartVariant = is_array($configCandidate) && array_key_exists('chart_variant', $configCandidate)
            ? $configCandidate['chart_variant']
            : null;
        if ($chartVariant === null && array_key_exists('chart_variant', $body)) {
            $chartVariant = $body['chart_variant'];
        }
        if (array_key_exists('chart_type', $body)) {
            $directChartType = in_array(($body['chart_type'] ?? ''), ['BAR','PIE','LINE'], true) ? $body['chart_type'] : null;
            $chartType = chart_type_from_variant($chartVariant, $directChartType);
        } elseif ($existingRow && isset($existingRow['chart_type']) && $existingRow['chart_type'] !== null && $existingRow['chart_type'] !== '') {
            $ct = $existingRow['chart_type'];
            $chartType = chart_type_from_variant($chartVariant, in_array($ct, ['BAR','PIE','LINE'], true) ? $ct : null);
        } else {
            $chartType = chart_type_from_variant($chartVariant, null);
        }
    }
    $configJson = null;
    if (array_key_exists('config_json', $body)) {
        $configJson = sanitize_widget_config_json($visualType, $body['config_json']);
    }
    return [
        'dashboard_id' => to_int_or_default($body['dashboard_id'] ?? null, 0),
        'tabname' => normalize_csv_names($body['tabname'] ?? ''),
        'title' => trim((string)($body['title'] ?? '')),
        'visual_type' => $visualType,
        'chart_type' => $chartType,
        'position_row' => max(0, to_int_or_default($body['position_row'] ?? null, 0)),
        'position_col' => max(0, to_int_or_default($body['position_col'] ?? null, 0)),
        'row_span' => max(1, to_int_or_default($body['row_span'] ?? null, 1)),
        'col_span' => max(1, to_int_or_default($body['col_span'] ?? null, 1)),
        'background_color' => $body['background_color'] ?? null,
        'config_json' => $configJson,
        'interaction_config_json' => array_key_exists('interaction_config_json', $body) ? $body['interaction_config_json'] : null,
        'data_source_id' => array_key_exists('data_source_id', $body)
            ? ($body['data_source_id'] === null || $body['data_source_id'] === '' ? null : to_int_or_default($body['data_source_id'], 0))
            : null,
        'refresh_interval_sec' => array_key_exists('refresh_interval_sec', $body) ? to_int_or_default($body['refresh_interval_sec'], 0) : 0,
        'is_visible' => to_bool_int($body['is_visible'] ?? 1, 1),
        'sort_order' => to_int_or_default($body['sort_order'] ?? 0, 0),
    ];
}
// ---------- Sales Data Endpoint (for charts) ----------
function get_sales_data($pdo, $period = 'monthly') {
    $valid_periods = ['monthly', 'quarterly', 'yearly'];
    if (!in_array($period, $valid_periods, true)) {
        $period = 'monthly';
    }
    switch ($period) {
        case 'yearly':
            $sql = "
                SELECT
                    YEAR(order_date) AS label,
                    SUM(total_amount) AS value
                FROM sales_data
                GROUP BY YEAR(order_date)
                ORDER BY label ASC
            ";
            break;
        case 'quarterly':
            $sql = "
                SELECT
                    CONCAT(YEAR(order_date), '-Q', QUARTER(order_date)) AS label,
                    SUM(total_amount) AS value
                FROM sales_data
                GROUP BY YEAR(order_date), QUARTER(order_date)
                ORDER BY label ASC
            ";
            break;
        case 'monthly':
        default:
            $sql = "
                SELECT
                    DATE_FORMAT(order_date, '%Y-%m') AS label,
                    SUM(total_amount) AS value
                FROM sales_data
                GROUP BY DATE_FORMAT(order_date, '%Y-%m')
                ORDER BY label ASC
            ";
            break;
    }
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $formatted = [];
        foreach ($rows as $row) {
            $formatted[] = [
                'label' => $row['label'],
                'value' => (float)$row['value'],
            ];
        }
        return $formatted;
    } catch (PDOException $e) {
        send_error('Database query failed: ' . $e->getMessage(), 500);
    }
}
// ---------- Helper DB functions ----------
function db_fetch_all_dashboards($pdo) {
    $stmt = $pdo->query("SELECT * FROM dashboards ORDER BY id ASC");
    return $stmt->fetchAll();
}
function db_fetch_dashboard($pdo, $id) {
    $stmt = $pdo->prepare("SELECT * FROM dashboards WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $id]);
    return $stmt->fetch();
}
function db_fetch_widgets_for_dashboard($pdo, $dashboard_id) {
    $stmt = $pdo->prepare("SELECT * FROM dashboard_widgets WHERE dashboard_id = :d ORDER BY sort_order ASC, position_row ASC, position_col ASC");
    $stmt->execute([':d' => $dashboard_id]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['config_json'] = decode_json_if_not_null($r['config_json'] ?? null);
        $r['interaction_config_json'] = decode_json_if_not_null($r['interaction_config_json'] ?? null);
    }
    return $rows;
}
function db_fetch_all_widgets($pdo) {
    $stmt = $pdo->query("SELECT * FROM dashboard_widgets ORDER BY sort_order ASC, id ASC");
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['config_json'] = decode_json_if_not_null($r['config_json'] ?? null);
        $r['interaction_config_json'] = decode_json_if_not_null($r['interaction_config_json'] ?? null);
    }
    return $rows;
}
function db_update_widget_layout($pdo, $id, $positionRow, $positionCol, $rowSpan, $colSpan) {
    $stmt = $pdo->prepare("
        UPDATE dashboard_widgets
        SET position_row = :position_row,
            position_col = :position_col,
            row_span = :row_span,
            col_span = :col_span,
            updated_at = NOW()
        WHERE id = :id
    ");
    $stmt->execute([
        ':id' => (int)$id,
        ':position_row' => max(0, (int)$positionRow),
        ':position_col' => max(0, (int)$positionCol),
        ':row_span' => max(1, (int)$rowSpan),
        ':col_span' => max(1, (int)$colSpan),
    ]);
    return $stmt->rowCount();
}
function db_fetch_all_datasources($pdo) {
    $stmt = $pdo->query("SELECT * FROM data_sources ORDER BY id ASC");
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        foreach (['request_headers_json','request_query_params_json','request_body_template_json','response_mapping_json'] as $col) {
            $r[$col] = decode_json_if_not_null($r[$col] ?? null);
        }
    }
    return $rows;
}
/* -------------------- NEW: Bulk widget delete helper -------------------- */
function db_delete_widgets_bulk($pdo, array $ids) {
    $normalizedIds = array_values(array_unique(array_map('intval', $ids)));
    $normalizedIds = array_values(array_filter($normalizedIds, function ($v) {
        return $v > 0;
    }));
    if (empty($normalizedIds)) {
        return ['deleted' => 0, 'deleted_ids' => [], 'missing_ids' => []];
    }
    $placeholders = implode(',', array_fill(0, count($normalizedIds), '?'));
    // Find which IDs actually exist
    $stmtSel = $pdo->prepare("SELECT id FROM dashboard_widgets WHERE id IN ($placeholders)");
    $stmtSel->execute($normalizedIds);
    $existingIds = array_map('intval', array_column($stmtSel->fetchAll(), 'id'));
    $missingIds = array_values(array_diff($normalizedIds, $existingIds));
    if (!empty($existingIds)) {
        $deletePlaceholders = implode(',', array_fill(0, count($existingIds), '?'));
        $stmtDel = $pdo->prepare("DELETE FROM dashboard_widgets WHERE id IN ($deletePlaceholders)");
        $stmtDel->execute($existingIds);
    }
    return [
        'deleted' => count($existingIds),
        'deleted_ids' => $existingIds,
        'missing_ids' => $missingIds,
    ];
}
// ---------- Context Menus CRUD ----------
function db_fetch_all_context_menus($pdo) {
    $stmt = $pdo->query("SELECT * FROM context_menus ORDER BY parent_id, sort_order, id");
    return $stmt->fetchAll();
}
function db_fetch_context_menu($pdo, $id) {
    $stmt = $pdo->prepare("SELECT * FROM context_menus WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    return $stmt->fetch();
}
function db_create_context_menu($pdo, $data) {
    $stmt = $pdo->prepare("INSERT INTO context_menus (menu_name, event_name, parent_id, sort_order) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $data['menu_name'],
        $data['event_name'],
        $data['parent_id'] ?? null,
        $data['sort_order'] ?? 0
    ]);
    return $pdo->lastInsertId();
}
function db_update_context_menu($pdo, $id, $data) {
    $stmt = $pdo->prepare("UPDATE context_menus SET menu_name = ?, event_name = ?, parent_id = ?, sort_order = ? WHERE id = ?");
    $stmt->execute([
        $data['menu_name'],
        $data['event_name'],
        $data['parent_id'] ?? null,
        $data['sort_order'] ?? 0,
        $id
    ]);
    return $stmt->rowCount();
}
function db_delete_context_menu($pdo, $id) {
    $stmt = $pdo->prepare("DELETE FROM context_menus WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->rowCount();
}
// ---------- Widget-Context Menu Assignments CRUD ----------
function db_fetch_all_widget_context_menu_assignments($pdo) {
    $sql = "
        SELECT
            wcm.id,
            wcm.widget_id,
            wcm.context_menu_id,
            w.title AS widget_title,
            w.dashboard_id,
            cm.menu_name,
            cm.event_name
        FROM widget_context_menu_assignments wcm
        JOIN dashboard_widgets w ON wcm.widget_id = w.id
        JOIN context_menus cm ON wcm.context_menu_id = cm.id
        ORDER BY wcm.id ASC
    ";
    $stmt = $pdo->query($sql);
    return $stmt->fetchAll();
}
function db_fetch_widget_context_menu_assignment($pdo, $id) {
    $sql = "
        SELECT
            wcm.id,
            wcm.widget_id,
            wcm.context_menu_id,
            w.title AS widget_title,
            w.dashboard_id,
            cm.menu_name,
            cm.event_name
        FROM widget_context_menu_assignments wcm
        JOIN dashboard_widgets w ON wcm.widget_id = w.id
        JOIN context_menus cm ON wcm.context_menu_id = cm.id
        WHERE wcm.id = :id
        LIMIT 1
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $id]);
    return $stmt->fetch();
}
function db_create_widget_context_menu_assignment($pdo, $data) {
    $stmtDel = $pdo->prepare("DELETE FROM widget_context_menu_assignments WHERE widget_id = :widget_id");
    $stmtDel->execute([':widget_id' => $data['widget_id']]);
    $stmt = $pdo->prepare("
        INSERT INTO widget_context_menu_assignments (widget_id, context_menu_id)
        VALUES (:widget_id, :context_menu_id)
    ");
    $stmt->execute([
        ':widget_id' => $data['widget_id'],
        ':context_menu_id' => $data['context_menu_id'],
    ]);
    return $pdo->lastInsertId();
}
function db_update_widget_context_menu_assignment($pdo, $id, $data) {
    $stmt = $pdo->prepare("
        UPDATE widget_context_menu_assignments
        SET widget_id = :widget_id,
            context_menu_id = :context_menu_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ");
    $stmt->execute([
        ':widget_id' => $data['widget_id'],
        ':context_menu_id' => $data['context_menu_id'],
        ':id' => $id,
    ]);
    return $stmt->rowCount();
}
function db_delete_widget_context_menu_assignment($pdo, $id) {
    $stmt = $pdo->prepare("DELETE FROM widget_context_menu_assignments WHERE id = :id");
    $stmt->execute([':id' => $id]);
    return $stmt->rowCount();
}
// ---------- Data Source Execution Function ----------
function execute_data_source($pdo, $dsId) {
    $stmt = $pdo->prepare("SELECT * FROM data_sources WHERE id = ?");
    $stmt->execute([$dsId]);
    $ds = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ds) {
        send_error('Data source not found', 404);
    }
    if ($ds['source_type'] === 'API' && $ds['endpoint_url']) {
        $ch = curl_init($ds['endpoint_url']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $ds['http_method'] ?? 'GET');
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        if ($ds['request_headers_json']) {
            $headers = json_decode($ds['request_headers_json'], true);
            if (is_array($headers)) {
                $headerArray = [];
                foreach ($headers as $key => $value) {
                    $headerArray[] = "$key: $value";
                }
                curl_setopt($ch, CURLOPT_HTTPHEADER, $headerArray);
            }
        }
        if ($ds['request_query_params_json']) {
            $queryParams = json_decode($ds['request_query_params_json'], true);
            if (is_array($queryParams) && !empty($queryParams)) {
                $url = $ds['endpoint_url'];
                $separator = (strpos($url, '?') === false) ? '?' : '&';
                $url .= $separator . http_build_query($queryParams);
                curl_setopt($ch, CURLOPT_URL, $url);
            }
        }
        if (($ds['http_method'] ?? 'GET') === 'POST' && $ds['request_body_template_json']) {
            $bodyPayload = json_decode($ds['request_body_template_json'], true);
            if (is_array($bodyPayload)) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($bodyPayload));
                $hasContentType = false;
                if (isset($headerArray) && is_array($headerArray)) {
                    foreach ($headerArray as $h) {
                        if (stripos($h, 'content-type:') !== false) {
                            $hasContentType = true;
                            break;
                        }
                    }
                }
                if (!isset($headerArray) || !$hasContentType) {
                    $existing = (isset($headerArray) && is_array($headerArray)) ? $headerArray : [];
                    curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge($existing, ['Content-Type: application/json']));
                }
            }
        }
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        if ($response === false) {
            send_error('Failed to fetch from data source: ' . $curlError, 500);
        }
        if ($httpCode >= 200 && $httpCode < 300) {
            $data = json_decode($response, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                send_json(['raw' => $response], 200);
            }
            if ($ds['response_mapping_json']) {
                $mapping = json_decode($ds['response_mapping_json'], true);
                if (is_array($mapping) && !empty($mapping)) {
                    // mapping logic placeholder
                }
            }
            send_json($data, 200);
        } else {
            send_error('Failed to fetch from data source. HTTP ' . $httpCode, 500);
        }
    } elseif ($ds['source_type'] === 'SQL') {
        send_error('SQL data sources not yet implemented', 501);
    } elseif ($ds['source_type'] === 'STATIC') {
        if ($ds['request_body_template_json']) {
            $staticData = json_decode($ds['request_body_template_json'], true);
            send_json($staticData, 200);
        } else {
            send_json(['message' => 'No static data configured'], 200);
        }
    } else {
        send_error('Invalid data source type', 400);
    }
}
// ---------- Robust routing ----------
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = $_SERVER['SCRIPT_NAME'];
$path = '';
if (!empty($_SERVER['PATH_INFO'])) {
    $path = ltrim($_SERVER['PATH_INFO'], '/');
} else {
    $scriptDir = rtrim(dirname($scriptName), '/');
    if ($scriptDir !== '' && strpos($uri, $scriptDir) === 0) {
        $rel = substr($uri, strlen($scriptDir));
    } else {
        $rel = $uri;
    }
    $rel = ltrim($rel, '/');
    if (strpos($rel, 'index.php') === 0) {
        $rel = ltrim(substr($rel, strlen('index.php')), '/');
    }
    $path = $rel;
}
if (($path === '' || $path === null) && isset($_GET['resource'])) {
    $path = trim($_GET['resource'], '/');
    if (isset($_GET['id']) && $_GET['id'] !== '') {
        $path .= '/' . intval($_GET['id']);
    }
}
$path = trim($path, '/');
$parts = $path === '' ? [] : explode('/', $path);
$resource = $parts[0] ?? null;
$id = isset($parts[1]) && is_numeric($parts[1]) ? intval($parts[1]) : null;
$subResource = $parts[2] ?? null;
if (($id === null || $id === 0) && isset($_GET['id']) && is_numeric($_GET['id'])) {
    $id = intval($_GET['id']);
}
if ($resource === 'sales_data') {
    $period = $_GET['period'] ?? 'monthly';
    $data = get_sales_data($pdo, $period);
    send_json($data, 200);
}
if (!$resource) {
    send_json(['message' => 'Dashboard Manager API. Use /dashboards, /widgets, /datasources, /context_menus, /widget_context_menu_assignments, /sales_data (or ?resource=dashboards)'], 200);
}
if ($resource === 'sample_kpi') {
    $sample = [
        "value" => 12345,
        "unit" => "USD",
        "trend" => "+3.2%",
        "trend_direction" => "up",
        "previous" => 11968,
        "description" => "Monthly Revenue",
        "metrics" => ["orders" => 312, "avg_order" => 39.6]
    ];
    send_json($sample, 200);
}
$allowed = ['dashboards', 'widgets', 'datasources', 'context_menus', 'widget_context_menu_assignments'];
if (!in_array($resource, $allowed, true)) {
    send_error("Unknown resource: $resource", 404);
}
$body = get_request_body();
try {
    if ($method === 'POST' && $resource === 'datasources' && $id && $subResource === 'execute') {
        execute_data_source($pdo, $id);
        exit;
    }
    if ($resource === 'widgets' && $method === 'PUT' && $id && $subResource === 'layout') {
        if (!is_array($body)) send_error('Invalid JSON body', 400);
        if (
            !array_key_exists('position_row', $body) ||
            !array_key_exists('position_col', $body) ||
            !array_key_exists('row_span', $body) ||
            !array_key_exists('col_span', $body)
        ) {
            send_error('position_row, position_col, row_span, col_span are required', 400);
        }
        $stmt = $pdo->prepare("SELECT * FROM dashboard_widgets WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch();
        if (!$existing) send_error('Widget not found', 404);

        db_update_widget_layout(
            $pdo,
            $id,
            $body['position_row'],
            $body['position_col'],
            $body['row_span'],
            $body['col_span']
        );

        $stmt2 = $pdo->prepare("SELECT * FROM dashboard_widgets WHERE id = :id LIMIT 1");
        $stmt2->execute([':id' => $id]);
        $updated = $stmt2->fetch();
        $updated['config_json'] = decode_json_if_not_null($updated['config_json'] ?? null);
        $updated['interaction_config_json'] = decode_json_if_not_null($updated['interaction_config_json'] ?? null);

        create_audit_log($pdo, current_user_id(), 'UPDATE', 'WIDGET', $id, [
            'layout_only' => true,
            'position_row' => $updated['position_row'],
            'position_col' => $updated['position_col'],
            'row_span' => $updated['row_span'],
            'col_span' => $updated['col_span'],
        ]);
        send_json($updated, 200);
    }
    if ($resource === 'widget_context_menu_assignments') {
        switch ($method) {
            case 'GET':
                parse_str($_SERVER['QUERY_STRING'] ?? '', $qs);
                if ($id) {
                    $row = db_fetch_widget_context_menu_assignment($pdo, $id);
                    if (!$row) send_error('Assignment not found', 404);
                    send_json($row, 200);
                } elseif (isset($qs['dashboard_id']) && is_numeric($qs['dashboard_id'])) {
                    $dashboardId = (int)$qs['dashboard_id'];
                    $sql = "
                        SELECT
                            wcm.id, wcm.widget_id, wcm.context_menu_id,
                            w.title AS widget_title, w.dashboard_id,
                            cm.menu_name, cm.event_name
                        FROM widget_context_menu_assignments wcm
                        JOIN dashboard_widgets w ON wcm.widget_id = w.id
                        JOIN context_menus cm ON wcm.context_menu_id = cm.id
                        WHERE w.dashboard_id = :dashboard_id
                        ORDER BY wcm.id ASC
                    ";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([':dashboard_id' => $dashboardId]);
                    send_json($stmt->fetchAll(), 200);
                } else {
                    send_json(db_fetch_all_widget_context_menu_assignments($pdo), 200);
                }
                break;
            case 'POST':
                if (!is_array($body)) send_error('Invalid JSON body', 400);
                if (empty($body['widget_id']) || empty($body['context_menu_id'])) {
                    send_error('widget_id and context_menu_id are required', 400);
                }
                $stmt = $pdo->prepare("SELECT id FROM dashboard_widgets WHERE id = :id");
                $stmt->execute([':id' => $body['widget_id']]);
                if (!$stmt->fetch()) send_error('Widget not found', 404);
                $stmt = $pdo->prepare("SELECT id FROM context_menus WHERE id = :id");
                $stmt->execute([':id' => $body['context_menu_id']]);
                if (!$stmt->fetch()) send_error('Context menu not found', 404);
                $newId = db_create_widget_context_menu_assignment($pdo, $body);
                send_json(db_fetch_widget_context_menu_assignment($pdo, $newId), 201);
                break;
            case 'PUT':
                if ($id === null || $id === 0) send_error('Missing id for PUT', 400);
                if (!is_array($body)) send_error('Invalid JSON body', 400);
                if (empty($body['widget_id']) || empty($body['context_menu_id'])) {
                    send_error('widget_id and context_menu_id are required', 400);
                }
                $exists = db_fetch_widget_context_menu_assignment($pdo, $id);
                if (!$exists) send_error('Assignment not found', 404);
                $updated = db_update_widget_context_menu_assignment($pdo, $id, $body);
                if ($updated === 0) send_error('Assignment not updated', 400);
                send_json(db_fetch_widget_context_menu_assignment($pdo, $id), 200);
                break;
            case 'DELETE':
                if ($id === null || $id === 0) send_error('Missing id for DELETE', 400);
                $deleted = db_delete_widget_context_menu_assignment($pdo, $id);
                if ($deleted === 0) send_error('Assignment not found', 404);
                send_json(['message' => 'Deleted'], 200);
                break;
            default:
                send_error('Method not allowed', 405);
        }
        exit;
    }
    if ($resource === 'context_menus') {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $row = db_fetch_context_menu($pdo, $id);
                    if (!$row) send_error('Context menu not found', 404);
                    send_json($row, 200);
                } else {
                    send_json(db_fetch_all_context_menus($pdo), 200);
                }
                break;
            case 'POST':
                if (!is_array($body)) send_error('Invalid JSON body', 400);
                if (empty(trim($body['menu_name'] ?? ''))) send_error('Menu name required', 400);
                if (empty(trim($body['event_name'] ?? ''))) send_error('Event name required', 400);
                $newId = db_create_context_menu($pdo, $body);
                $stmt = $pdo->prepare("SELECT * FROM context_menus WHERE id = ?");
                $stmt->execute([$newId]);
                send_json($stmt->fetch(), 201);
                break;
            case 'PUT':
                if ($id === null || $id === 0) send_error('Missing id for PUT', 400);
                if (!is_array($body)) send_error('Invalid JSON body', 400);
                if (empty(trim($body['menu_name'] ?? ''))) send_error('Menu name required', 400);
                if (empty(trim($body['event_name'] ?? ''))) send_error('Event name required', 400);
                $updated = db_update_context_menu($pdo, $id, $body);
                if ($updated === 0) send_error('Context menu not found', 404);
                $stmt = $pdo->prepare("SELECT * FROM context_menus WHERE id = ?");
                $stmt->execute([$id]);
                send_json($stmt->fetch(), 200);
                break;
            case 'DELETE':
                if ($id === null || $id === 0) send_error('Missing id for DELETE', 400);
                $deleted = db_delete_context_menu($pdo, $id);
                if ($deleted === 0) send_error('Context menu not found', 404);
                send_json(['message' => 'Deleted'], 200);
                break;
            default:
                send_error('Method not allowed', 405);
        }
        exit;
    }
    switch ($method) {
        case 'GET':
            parse_str($_SERVER['QUERY_STRING'] ?? '', $qs);
            if ($resource === 'dashboards') {
                if ($id) {
                    $dash = db_fetch_dashboard($pdo, $id);
                    if (!$dash) send_error('Dashboard not found', 404);
                    if (!isset($qs['include']) || $qs['include'] === 'widgets' || $qs['include'] === 'all') {
                        $dash['widgets'] = db_fetch_widgets_for_dashboard($pdo, $id);
                    }
                    send_json($dash, 200);
                } else {
                    send_json(db_fetch_all_dashboards($pdo), 200);
                }
            } elseif ($resource === 'widgets') {
                if ($id) {
                    $stmt = $pdo->prepare("SELECT * FROM dashboard_widgets WHERE id = :id LIMIT 1");
                    $stmt->execute([':id' => $id]);
                    $w = $stmt->fetch();
                    if (!$w) send_error('Widget not found', 404);
                    $w['config_json'] = decode_json_if_not_null($w['config_json'] ?? null);
                    $w['interaction_config_json'] = decode_json_if_not_null($w['interaction_config_json'] ?? null);
                    send_json($w, 200);
                } else {
                    if (isset($qs['dashboard_id']) && is_numeric($qs['dashboard_id'])) {
                        send_json(db_fetch_widgets_for_dashboard($pdo, intval($qs['dashboard_id'])), 200);
                    } else {
                        send_json(db_fetch_all_widgets($pdo), 200);
                    }
                }
            } elseif ($resource === 'datasources') {
                if ($id) {
                    $stmt = $pdo->prepare("SELECT * FROM data_sources WHERE id = :id LIMIT 1");
                    $stmt->execute([':id' => $id]);
                    $ds = $stmt->fetch();
                    if (!$ds) send_error('Data source not found', 404);
                    foreach (['request_headers_json','request_query_params_json','request_body_template_json','response_mapping_json'] as $col) {
                        $ds[$col] = decode_json_if_not_null($ds[$col] ?? null);
                    }
                    send_json($ds, 200);
                } else {
                    send_json(db_fetch_all_datasources($pdo), 200);
                }
            }
            break;
        case 'POST':
            if (!is_array($body)) send_error('Invalid JSON body', 400);
            $userId = current_user_id();
            if ($resource === 'dashboards') {
                if (empty(trim($body['name'] ?? ''))) send_error('Dashboard name required', 400);
                $stmt = $pdo->prepare("INSERT INTO dashboards (name, code, description, type, page_name, tab_name, owner_user_id, is_default, is_active, created_at, updated_at) VALUES (:name, :code, :description, :type, :page_name, :tab_name, :owner_user_id, :is_default, :is_active, NOW(), NOW())");
                $stmt->execute([
                    ':name' => trim((string)$body['name']),
                    ':code' => $body['code'] ?? null,
                    ':description' => $body['description'] ?? '',
                    ':type' => in_array($body['type'] ?? 'BASIC', ['BASIC','STANDARD'], true) ? $body['type'] : 'BASIC',
                    ':page_name' => '', // force empty (page removed on UI)
                    ':tab_name' => normalize_csv_names($body['tab_name'] ?? ''),
                    ':owner_user_id' => to_int_or_default($body['owner_user_id'] ?? $userId, $userId),
                    ':is_default' => to_bool_int($body['is_default'] ?? 0, 0),
                    ':is_active' => to_bool_int($body['is_active'] ?? 1, 1),
                ]);
                $newId = (int)$pdo->lastInsertId();
                $created = db_fetch_dashboard($pdo, $newId);
                create_audit_log($pdo, $userId, 'CREATE', 'DASHBOARD', $newId, $created);
                send_json($created, 201);
            } elseif ($resource === 'widgets') {
                $w = normalize_widget_payload($body);
                if ($w['dashboard_id'] <= 0) send_error('dashboard_id is required', 400);
                $stmt = $pdo->prepare("INSERT INTO dashboard_widgets (dashboard_id, tabname, title, visual_type, chart_type, position_row, position_col, row_span, col_span, background_color, config_json, interaction_config_json, data_source_id, refresh_interval_sec, is_visible, sort_order, created_at, updated_at) VALUES (:dashboard_id, :tabname, :title, :visual_type, :chart_type, :position_row, :position_col, :row_span, :col_span, :background_color, :config_json, :interaction_config_json, :data_source_id, :refresh_interval_sec, :is_visible, :sort_order, NOW(), NOW())");
                $stmt->execute([
                    ':dashboard_id' => $w['dashboard_id'],
                    ':tabname' => $w['tabname'],
                    ':title' => $w['title'] !== '' ? $w['title'] : null,
                    ':visual_type' => $w['visual_type'],
                    ':chart_type' => $w['chart_type'],
                    ':position_row' => $w['position_row'],
                    ':position_col' => $w['position_col'],
                    ':row_span' => $w['row_span'],
                    ':col_span' => $w['col_span'],
                    ':background_color' => $w['background_color'],
                    ':config_json' => $w['config_json'] !== null ? json_encode($w['config_json'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
                    ':interaction_config_json' => $w['interaction_config_json'] !== null ? json_encode($w['interaction_config_json'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
                    ':data_source_id' => $w['data_source_id'],
                    ':refresh_interval_sec' => $w['refresh_interval_sec'],
                    ':is_visible' => $w['is_visible'],
                    ':sort_order' => $w['sort_order'],
                ]);
                $newId = (int)$pdo->lastInsertId();
                $stmt2 = $pdo->prepare("SELECT * FROM dashboard_widgets WHERE id = :id");
                $stmt2->execute([':id' => $newId]);
                $created = $stmt2->fetch();
                $created['config_json'] = decode_json_if_not_null($created['config_json'] ?? null);
                $created['interaction_config_json'] = decode_json_if_not_null($created['interaction_config_json'] ?? null);
                create_audit_log($pdo, $userId, 'CREATE', 'WIDGET', $newId, $created);
                send_json($created, 201);
            } elseif ($resource === 'datasources') {
                if (empty(trim($body['name'] ?? ''))) send_error('Data source name required', 400);
                $rh = isset($body['request_headers_json']) ? json_encode($body['request_headers_json'], JSON_UNESCAPED_SLASHES) : null;
                $rq = isset($body['request_query_params_json']) ? json_encode($body['request_query_params_json'], JSON_UNESCAPED_SLASHES) : null;
                $rb = isset($body['request_body_template_json']) ? json_encode($body['request_body_template_json'], JSON_UNESCAPED_SLASHES) : null;
                $rm = isset($body['response_mapping_json']) ? json_encode($body['response_mapping_json'], JSON_UNESCAPED_SLASHES) : null;
                $stmt = $pdo->prepare("INSERT INTO data_sources (name, code, source_type, endpoint_url, http_method, request_headers_json, request_query_params_json, request_body_template_json, response_mapping_json, is_cached, cache_ttl_sec, created_at, updated_at) VALUES (:name, :code, :source_type, :endpoint_url, :http_method, :request_headers_json, :request_query_params_json, :request_body_template_json, :response_mapping_json, :is_cached, :cache_ttl_sec, NOW(), NOW())");
                $stmt->execute([
                    ':name' => $body['name'],
                    ':code' => $body['code'] ?? null,
                    ':source_type' => in_array($body['source_type'] ?? 'API', ['API','SQL','STATIC'], true) ? $body['source_type'] : 'API',
                    ':endpoint_url' => $body['endpoint_url'] ?? null,
                    ':http_method' => in_array($body['http_method'] ?? 'GET', ['GET','POST'], true) ? $body['http_method'] : 'GET',
                    ':request_headers_json' => $rh,
                    ':request_query_params_json' => $rq,
                    ':request_body_template_json' => $rb,
                    ':response_mapping_json' => $rm,
                    ':is_cached' => isset($body['is_cached']) ? (int)$body['is_cached'] : 0,
                    ':cache_ttl_sec' => $body['cache_ttl_sec'] ?? null,
                ]);
                $newId = (int)$pdo->lastInsertId();
                $stmt2 = $pdo->prepare("SELECT * FROM data_sources WHERE id = :id");
                $stmt2->execute([':id' => $newId]);
                $ds = $stmt2->fetch();
                foreach (['request_headers_json','request_query_params_json','request_body_template_json','response_mapping_json'] as $col) {
                    $ds[$col] = decode_json_if_not_null($ds[$col] ?? null);
                }
                create_audit_log($pdo, $userId, 'CREATE', 'DATA_SOURCE', $newId, $ds);
                send_json($ds, 201);
            }
            break;
        case 'PUT':
            if ($id === null || $id === 0) send_error('Missing id for PUT', 400);
            if (!is_array($body)) send_error('Invalid JSON body', 400);
            $userId = current_user_id();
            if ($resource === 'dashboards') {
                $exists = db_fetch_dashboard($pdo, $id);
                if (!$exists) send_error('Dashboard not found', 404);
                $fields = [];
                $params = [':id' => $id];
                $allowedFields = ['name','code','description','type','page_name','tab_name','owner_user_id','is_default','is_active'];
                foreach ($allowedFields as $f) {
                    if (!array_key_exists($f, $body)) continue;
                    $fields[] = "$f = :$f";
                    if ($f === 'type') {
                        $params[":$f"] = in_array($body[$f] ?? 'BASIC', ['BASIC','STANDARD'], true) ? $body[$f] : 'BASIC';
                    } elseif ($f === 'tab_name') {
                        $params[":$f"] = normalize_csv_names($body[$f] ?? '');
                    } elseif ($f === 'page_name') {
                        $params[":$f"] = '';
                    } elseif ($f === 'owner_user_id') {
                        $params[":$f"] = to_int_or_default($body[$f], 1);
                    } elseif (in_array($f, ['is_default','is_active'], true)) {
                        $params[":$f"] = to_bool_int($body[$f], 0);
                    } elseif ($f === 'name') {
                        $params[":$f"] = trim((string)$body[$f]);
                    } else {
                        $params[":$f"] = $body[$f];
                    }
                }
                if (!empty($fields)) {
                    $sql = "UPDATE dashboards SET " . implode(',', $fields) . ", updated_at = NOW() WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                }
                $updated = db_fetch_dashboard($pdo, $id);
                create_audit_log($pdo, $userId, 'UPDATE', 'DASHBOARD', $id, $updated);
                send_json($updated, 200);
            } elseif ($resource === 'widgets') {
                $stmt = $pdo->prepare("SELECT * FROM dashboard_widgets WHERE id = :id LIMIT 1");
                $stmt->execute([':id' => $id]);
                $existing = $stmt->fetch();
                if (!$existing) send_error('Widget not found', 404);
                $normalized = normalize_widget_payload($body, $existing);
                $fields = [];
                $params = [':id' => $id];
                $allowed = ['dashboard_id','tabname','title','visual_type','chart_type','position_row','position_col','row_span','col_span','background_color','config_json','interaction_config_json','data_source_id','refresh_interval_sec','is_visible','sort_order'];
                foreach ($allowed as $f) {
                    if (!array_key_exists($f, $body)) continue;
                    $fields[] = "$f = :$f";
                    if (in_array($f, ['config_json', 'interaction_config_json'], true)) {
                        $params[":$f"] = $normalized[$f] !== null ? json_encode($normalized[$f], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null;
                    } else {
                        $params[":$f"] = $normalized[$f];
                    }
                }
                if (!empty($fields)) {
                    $sql = "UPDATE dashboard_widgets SET " . implode(',', $fields) . ", updated_at = NOW() WHERE id = :id";
                    $stmt2 = $pdo->prepare($sql);
                    $stmt2->execute($params);
                }
                $stmt3 = $pdo->prepare("SELECT * FROM dashboard_widgets WHERE id = :id");
                $stmt3->execute([':id' => $id]);
                $updated = $stmt3->fetch();
                $updated['config_json'] = decode_json_if_not_null($updated['config_json'] ?? null);
                $updated['interaction_config_json'] = decode_json_if_not_null($updated['interaction_config_json'] ?? null);
                create_audit_log($pdo, $userId, 'UPDATE', 'WIDGET', $id, $updated);
                send_json($updated, 200);
            } elseif ($resource === 'datasources') {
                $stmt = $pdo->prepare("SELECT * FROM data_sources WHERE id = :id LIMIT 1");
                $stmt->execute([':id' => $id]);
                $ds = $stmt->fetch();
                if (!$ds) send_error('Data source not found', 404);
                $fields = [];
                $params = [':id' => $id];
                $allowed = ['name','code','source_type','endpoint_url','http_method','request_headers_json','request_query_params_json','request_body_template_json','response_mapping_json','is_cached','cache_ttl_sec'];
                foreach ($allowed as $f) {
                    if (array_key_exists($f, $body)) {
                        if (in_array($f, ['request_headers_json','request_query_params_json','request_body_template_json','response_mapping_json'], true)) {
                            $fields[] = "$f = :$f";
                            $params[":$f"] = $body[$f] !== null ? json_encode($body[$f], JSON_UNESCAPED_SLASHES) : null;
                        } else {
                            $fields[] = "$f = :$f";
                            $params[":$f"] = $body[$f];
                        }
                    }
                }
                if (!empty($fields)) {
                    $sql = "UPDATE data_sources SET " . implode(',', $fields) . ", updated_at = NOW() WHERE id = :id";
                    $stmt2 = $pdo->prepare($sql);
                    $stmt2->execute($params);
                }
                $stmt3 = $pdo->prepare("SELECT * FROM data_sources WHERE id = :id");
                $stmt3->execute([':id' => $id]);
                $updated = $stmt3->fetch();
                foreach (['request_headers_json','request_query_params_json','request_body_template_json','response_mapping_json'] as $col) {
                    $updated[$col] = decode_json_if_not_null($updated[$col] ?? null);
                }
                create_audit_log($pdo, $userId, 'UPDATE', 'DATA_SOURCE', $id, $updated);
                send_json($updated, 200);
            }
            break;
        case 'DELETE':
            $userId = current_user_id();
            if ($resource === 'dashboards') {
                if ($id === null || $id === 0) send_error('Missing id for DELETE', 400);
                $stmt = $pdo->prepare("SELECT * FROM dashboards WHERE id = :id LIMIT 1");
                $stmt->execute([':id' => $id]);
                $exists = $stmt->fetch();
                if (!$exists) send_error('Dashboard not found', 404);
                $stmt2 = $pdo->prepare("DELETE FROM dashboards WHERE id = :id");
                $stmt2->execute([':id' => $id]);
                create_audit_log($pdo, $userId, 'DELETE', 'DASHBOARD', $id, $exists);
                send_json(['message' => 'Deleted'], 200);
            } elseif ($resource === 'widgets') {
                // Single delete: /widgets/{id}
                if ($id !== null && $id > 0) {
                    $stmt = $pdo->prepare("SELECT * FROM dashboard_widgets WHERE id = :id LIMIT 1");
                    $stmt->execute([':id' => $id]);
                    $exists = $stmt->fetch();
                    if (!$exists) send_error('Widget not found', 404);
                    $stmt2 = $pdo->prepare("DELETE FROM dashboard_widgets WHERE id = :id");
                    $stmt2->execute([':id' => $id]);
                    create_audit_log($pdo, $userId, 'DELETE', 'WIDGET', $id, $exists);
                    send_json(['message' => 'Deleted', 'deleted_ids' => [$id]], 200);
                }
                // Bulk delete: /widgets with body {"ids":[1,2,3]}
                if (!is_array($body)) send_error('Invalid JSON body', 400);
                if (!isset($body['ids']) || !is_array($body['ids'])) {
                    send_error('For bulk delete, provide ids array in request body', 400);
                }
                $result = db_delete_widgets_bulk($pdo, $body['ids']);
                foreach ($result['deleted_ids'] as $wid) {
                    create_audit_log($pdo, $userId, 'DELETE', 'WIDGET', $wid, ['id' => $wid, 'bulk' => true]);
                }
                send_json([
                    'message' => 'Bulk delete completed',
                    'deleted_count' => $result['deleted'],
                    'deleted_ids' => $result['deleted_ids'],
                    'missing_ids' => $result['missing_ids']
                ], 200);
            } elseif ($resource === 'datasources') {
                if ($id === null || $id === 0) send_error('Missing id for DELETE', 400);
                $stmt = $pdo->prepare("SELECT * FROM data_sources WHERE id = :id LIMIT 1");
                $stmt->execute([':id' => $id]);
                $exists = $stmt->fetch();
                if (!$exists) send_error('Data source not found', 404);
                $stmt2 = $pdo->prepare("DELETE FROM data_sources WHERE id = :id");
                $stmt2->execute([':id' => $id]);
                create_audit_log($pdo, $userId, 'DELETE', 'DATA_SOURCE', $id, $exists);
                send_json(['message' => 'Deleted'], 200);
            }
            break;
        default:
            send_error('Method not allowed', 405);
    }
} catch (Exception $e) {
    send_error('Server error: ' . $e->getMessage(), 500);
}
