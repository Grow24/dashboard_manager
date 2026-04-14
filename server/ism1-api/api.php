<?php
/**
 * Filter Manager — create / update filter (filtermaster_1).
 * Deploy to: .../ism1/API/api.php
 *
 * Fixes vs older version:
 * - Persists cssCode (Styling tab).
 * - Correctly decodes queryBuilder when the client sends a JSON string.
 * - Avoids double-encoding tags / options / config when already JSON strings.
 */
error_reporting(0);
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = 'localhost';
$username = 'intellig_ism1';
$password = 'testism@1234';
$dbname = 'intellig_ism1';

$conn = new mysqli($host, $username, $password, $dbname);
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]));
}
$conn->set_charset('utf8mb4');

$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true);
if (!is_array($data)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON body']);
    $conn->close();
    exit;
}

/** @return array */
function decode_query_builder($raw) {
    if ($raw === null || $raw === '') {
        return [];
    }
    if (is_array($raw)) {
        return $raw;
    }
    if (is_string($raw)) {
        $a = json_decode($raw, true);
        return is_array($a) ? $a : [];
    }
    return [];
}

/** advancedConfig: string (JSON text) or array from client */
function adv_config_for_db(mysqli $conn, $value) {
    if ($value === null || $value === '') {
        return $conn->real_escape_string('');
    }
    if (is_string($value)) {
        return $conn->real_escape_string($value);
    }
    return $conn->real_escape_string(json_encode($value, JSON_UNESCAPED_UNICODE));
}

/** Store JSON columns: accept array or already-encoded JSON string from React */
function json_column_for_db($conn, $value, $default = '[]') {
    if ($value === null || $value === '') {
        return $conn->real_escape_string($default);
    }
    if (is_array($value)) {
        return $conn->real_escape_string(json_encode($value, JSON_UNESCAPED_UNICODE));
    }
    if (is_string($value)) {
        json_decode($value);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $conn->real_escape_string($value);
        }
        return $conn->real_escape_string(json_encode($value));
    }
    return $conn->real_escape_string($default);
}

/**
 * Ensure optional columns exist to avoid runtime SQL failures
 * when DB schema is partially migrated.
 */
function column_exists(mysqli $conn, string $table, string $column): bool {
    $tableEsc = $conn->real_escape_string($table);
    $columnEsc = $conn->real_escape_string($column);
    $existsSql = "SHOW COLUMNS FROM `{$tableEsc}` LIKE '{$columnEsc}'";
    $existsRes = $conn->query($existsSql);
    return (bool)($existsRes && $existsRes->num_rows > 0);
}

function pick_existing_column(mysqli $conn, string $table, array $candidates, string $fallback): string {
    foreach ($candidates as $candidate) {
        if (column_exists($conn, $table, $candidate)) {
            return $candidate;
        }
    }
    return $fallback;
}

$webapiTypeColumn = pick_existing_column($conn, 'filtermaster_1', ['webapiType', 'webapitype'], 'webapitype');
$staticOptionsColumn = pick_existing_column($conn, 'filtermaster_1', ['staticOptions', 'staticoption'], 'staticoption');
$hasStaticOptionsColumn = column_exists($conn, 'filtermaster_1', 'staticOptions');
$hasStaticoptionColumn = column_exists($conn, 'filtermaster_1', 'staticoption');

$queryBuilder = decode_query_builder($data['queryBuilder'] ?? null);
$joinConfig = isset($queryBuilder['joinConfig']) && is_array($queryBuilder['joinConfig'])
    ? $queryBuilder['joinConfig']
    : [];
$windowFunctionConfigs = isset($queryBuilder['windowFunctionConfigs']) && is_array($queryBuilder['windowFunctionConfigs'])
    ? $queryBuilder['windowFunctionConfigs']
    : [];

$tableename = $queryBuilder['tableName'] ?? '';

$qbJson = json_encode($queryBuilder, JSON_UNESCAPED_UNICODE);
$qbJsonEsc = $conn->real_escape_string($qbJson);

$response = [];

$staticOptionsUpdateAssignments = "`{$staticOptionsColumn}` = '" . $conn->real_escape_string($data['staticOptions'] ?? '') . "'";
if ($hasStaticOptionsColumn && $hasStaticoptionColumn && strcasecmp($staticOptionsColumn, 'staticoption') !== 0) {
    $staticOptionsUpdateAssignments .= ",
        `staticoption` = '" . $conn->real_escape_string($data['staticOptions'] ?? '') . "'";
}

if (isset($data['id']) && $data['id'] !== '' && $data['id'] !== null) {
    $id = intval($data['id']);

    $sql = "UPDATE filtermaster_1 SET
        name = '" . $conn->real_escape_string($data['name'] ?? '') . "',
        type = '" . $conn->real_escape_string($data['type'] ?? '') . "',
        field = '" . $conn->real_escape_string($data['field'] ?? '') . "',
        defaultValue = '" . $conn->real_escape_string($data['defaultValue'] ?? '') . "',
        position = " . intval($data['position'] ?? 0) . ",
        description = '" . $conn->real_escape_string($data['description'] ?? '') . "',
        placeholder = '" . $conn->real_escape_string($data['placeholder'] ?? '') . "',
        isActive = " . (isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : 1) . ",
        required = " . (isset($data['required']) ? ($data['required'] ? 1 : 0) : 0) . ",
        visible = " . (isset($data['visible']) ? ($data['visible'] ? 1 : 0) : 1) . ",
        multiSelect = " . (isset($data['multiSelect']) ? ($data['multiSelect'] ? 1 : 0) : 0) . ",
        allowCustom = " . (isset($data['allowCustom']) ? ($data['allowCustom'] ? 1 : 0) : 0) . ",
        tags = '" . json_column_for_db($conn, $data['tags'] ?? null, '[]') . "',
        options = '" . json_column_for_db($conn, $data['options'] ?? null, '[]') . "',
        min = '" . $conn->real_escape_string($data['min'] ?? '') . "',
        max = '" . $conn->real_escape_string($data['max'] ?? '') . "',
        pattern = '" . $conn->real_escape_string($data['pattern'] ?? '') . "',
        queryPreview = " . (isset($data['queryPreview']) ? ($data['queryPreview'] ? 1 : 0) : 0) . ",
        filterApply = '" . $conn->real_escape_string($data['filterApply'] ?? 'Live') . "',
        onClickHandlerParams = '" . $conn->real_escape_string($data['onClickHandlerParams'] ?? '') . "',
        onClickHandlerResponse = '" . $conn->real_escape_string($data['onClickHandlerResponse'] ?? '') . "',
        onBlurHandlerParams = '" . $conn->real_escape_string($data['onBlurHandlerParams'] ?? '') . "',
        onBlurHandlerResponse = '" . $conn->real_escape_string($data['onBlurHandlerResponse'] ?? '') . "',
        onChangeHandlerParams = '" . $conn->real_escape_string($data['onChangeHandlerParams'] ?? '') . "',
        onChangeHandlerResponse = '" . $conn->real_escape_string($data['onChangeHandlerResponse'] ?? '') . "',
        onFocusHandlerParams = '" . $conn->real_escape_string($data['onFocusHandlerParams'] ?? '') . "',
        onFocusHandlerResponse = '" . $conn->real_escape_string($data['onFocusHandlerResponse'] ?? '') . "',
        onKeyDownHandlerParams = '" . $conn->real_escape_string($data['onKeyDownHandlerParams'] ?? '') . "',
        onKeyDownHandlerResponse = '" . $conn->real_escape_string($data['onKeyDownHandlerResponse'] ?? '') . "',
        onKeyUpHandlerParams = '" . $conn->real_escape_string($data['onKeyUpHandlerParams'] ?? '') . "',
        onKeyUpHandlerResponse = '" . $conn->real_escape_string($data['onKeyUpHandlerResponse'] ?? '') . "',
        advancedConfig = '" . adv_config_for_db($conn, $data['advancedConfig'] ?? null) . "',
        config = '" . json_column_for_db($conn, $data['config'] ?? null, '{}') . "',
        queryBuilder = '" . $qbJsonEsc . "',
        webapi = '" . $conn->real_escape_string($data['webapi'] ?? '') . "',
        `{$webapiTypeColumn}` = '" . $conn->real_escape_string($data['webapiType'] ?? '') . "',
        {$staticOptionsUpdateAssignments},
        cssClass = '" . $conn->real_escape_string($data['cssClass'] ?? '') . "',
        cssCode = '" . $conn->real_escape_string($data['cssCode'] ?? '') . "',
        inlineStyle = '" . $conn->real_escape_string($data['inlineStyle'] ?? '') . "',
        onClickHandler = '" . $conn->real_escape_string($data['onClickHandler'] ?? '') . "',
        onBlurHandler = '" . $conn->real_escape_string($data['onBlurHandler'] ?? '') . "',
        onChangeHandler = '" . $conn->real_escape_string($data['onChangeHandler'] ?? '') . "',
        onFocusHandler = '" . $conn->real_escape_string($data['onFocusHandler'] ?? '') . "',
        onKeyDownHandler = '" . $conn->real_escape_string($data['onKeyDownHandler'] ?? '') . "',
        onKeyUpHandler = '" . $conn->real_escape_string($data['onKeyUpHandler'] ?? '') . "',
        statement = '" . $conn->real_escape_string($queryBuilder['statement'] ?? 'SELECT') . "',
        columns = '" . $conn->real_escape_string($queryBuilder['columns'] ?? '*') . "',
        table_name = '" . $conn->real_escape_string($tableename) . "',
        where_conditions = '" . $conn->real_escape_string(json_encode($queryBuilder['whereConditions'] ?? [])) . "',
        group_by = '" . $conn->real_escape_string($queryBuilder['groupBy'] ?? '') . "',
        `having` = '" . $conn->real_escape_string($queryBuilder['having'] ?? '') . "',
        order_by = '" . $conn->real_escape_string($queryBuilder['orderBy'] ?? '') . "',
        `limit` = '" . $conn->real_escape_string($queryBuilder['limit'] ?? '') . "',
        query_preview = '" . $conn->real_escape_string($queryBuilder['queryPreview'] ?? '') . "',
        windowFunction = '" . $conn->real_escape_string(json_encode($windowFunctionConfigs)) . "',
        joinType = '" . $conn->real_escape_string($joinConfig['joinType'] ?? '') . "',
        primaryTable = '" . $conn->real_escape_string($joinConfig['primaryTable'] ?? '') . "',
        primaryAlias = '" . $conn->real_escape_string($joinConfig['primaryAlias'] ?? '') . "',
        primaryColumn = '" . $conn->real_escape_string($joinConfig['primaryColumn'] ?? '') . "',
        secondaryTable = '" . $conn->real_escape_string($joinConfig['secondaryTable'] ?? '') . "',
        secondaryAlias = '" . $conn->real_escape_string($joinConfig['secondaryAlias'] ?? '') . "',
        secondaryColumn = '" . $conn->real_escape_string($joinConfig['secondaryColumn'] ?? '') . "',
        joinCondition = '" . $conn->real_escape_string($joinConfig['joinCondition'] ?? '') . "',
        outputColumns = '" . $conn->real_escape_string(json_encode($joinConfig['outputColumns'] ?? [])) . "',
        updatedAt = NOW()
        WHERE id = $id
    ";

    $result = $conn->query($sql);

    if ($result) {
        $response = [
            'success' => true,
            'message' => 'Filter updated successfully',
            'updatedId' => $id,
        ];
    } else {
        $response = [
            'success' => false,
            'message' => 'Error: ' . $conn->error,
        ];
    }
} else {
    $type = !empty($data['type']) ? $data['type'] : ($queryBuilder['statement'] ?? 'SELECT');

    $insertStaticColumns = "`{$staticOptionsColumn}`";
    $insertStaticValues = "'" . $conn->real_escape_string($data['staticOptions'] ?? '') . "'";
    if ($hasStaticOptionsColumn && $hasStaticoptionColumn && strcasecmp($staticOptionsColumn, 'staticoption') !== 0) {
        $insertStaticColumns .= ", `staticoption`";
        $insertStaticValues .= ", '" . $conn->real_escape_string($data['staticOptions'] ?? '') . "'";
    }

    $sql = "INSERT INTO filtermaster_1 (
        name, type, field, defaultValue, position, description, placeholder, isActive, required, visible, multiSelect, allowCustom, tags, options, min, max, pattern, queryPreview, filterApply,
        onClickHandlerParams, onClickHandlerResponse,
        onBlurHandlerParams, onBlurHandlerResponse,
        onChangeHandlerParams, onChangeHandlerResponse,
        onFocusHandlerParams, onFocusHandlerResponse,
        onKeyDownHandlerParams, onKeyDownHandlerResponse,
        onKeyUpHandlerParams, onKeyUpHandlerResponse,
        advancedConfig, config, queryBuilder, webapi, `{$webapiTypeColumn}`, {$insertStaticColumns},
        cssClass, cssCode, inlineStyle, onClickHandler, onBlurHandler, onChangeHandler, onFocusHandler, onKeyDownHandler, onKeyUpHandler,
        statement, columns, table_name, where_conditions, group_by, `having`, order_by, query_preview,
        windowFunction,
        `limit`, joinType, primaryTable, primaryAlias, primaryColumn, secondaryTable, secondaryAlias, secondaryColumn, joinCondition, outputColumns,
        createdAt, updatedAt
    ) VALUES (
        '" . $conn->real_escape_string($data['name'] ?? '') . "',
        '" . $conn->real_escape_string($type) . "',
        '" . $conn->real_escape_string($data['field'] ?? '') . "',
        '" . $conn->real_escape_string($data['defaultValue'] ?? '') . "',
        " . intval($data['position'] ?? 0) . ",
        '" . $conn->real_escape_string($data['description'] ?? '') . "',
        '" . $conn->real_escape_string($data['placeholder'] ?? '') . "',
        " . (isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : 1) . ",
        " . (isset($data['required']) ? ($data['required'] ? 1 : 0) : 0) . ",
        " . (isset($data['visible']) ? ($data['visible'] ? 1 : 0) : 1) . ",
        " . (isset($data['multiSelect']) ? ($data['multiSelect'] ? 1 : 0) : 0) . ",
        " . (isset($data['allowCustom']) ? ($data['allowCustom'] ? 1 : 0) : 0) . ",
        '" . json_column_for_db($conn, $data['tags'] ?? null, '[]') . "',
        '" . json_column_for_db($conn, $data['options'] ?? null, '[]') . "',
        '" . $conn->real_escape_string($data['min'] ?? '') . "',
        '" . $conn->real_escape_string($data['max'] ?? '') . "',
        '" . $conn->real_escape_string($data['pattern'] ?? '') . "',
        " . (isset($data['queryPreview']) ? ($data['queryPreview'] ? 1 : 0) : 0) . ",
        '" . $conn->real_escape_string($data['filterApply'] ?? 'Live') . "',
        '" . $conn->real_escape_string($data['onClickHandlerParams'] ?? '') . "',
        '" . $conn->real_escape_string($data['onClickHandlerResponse'] ?? '') . "',
        '" . $conn->real_escape_string($data['onBlurHandlerParams'] ?? '') . "',
        '" . $conn->real_escape_string($data['onBlurHandlerResponse'] ?? '') . "',
        '" . $conn->real_escape_string($data['onChangeHandlerParams'] ?? '') . "',
        '" . $conn->real_escape_string($data['onChangeHandlerResponse'] ?? '') . "',
        '" . $conn->real_escape_string($data['onFocusHandlerParams'] ?? '') . "',
        '" . $conn->real_escape_string($data['onFocusHandlerResponse'] ?? '') . "',
        '" . $conn->real_escape_string($data['onKeyDownHandlerParams'] ?? '') . "',
        '" . $conn->real_escape_string($data['onKeyDownHandlerResponse'] ?? '') . "',
        '" . $conn->real_escape_string($data['onKeyUpHandlerParams'] ?? '') . "',
        '" . $conn->real_escape_string($data['onKeyUpHandlerResponse'] ?? '') . "',
        '" . adv_config_for_db($conn, $data['advancedConfig'] ?? null) . "',
        '" . json_column_for_db($conn, $data['config'] ?? null, '{}') . "',
        '" . $qbJsonEsc . "',
        '" . $conn->real_escape_string($data['webapi'] ?? '') . "',
        '" . $conn->real_escape_string($data['webapiType'] ?? '') . "',
        {$insertStaticValues},
        '" . $conn->real_escape_string($data['cssClass'] ?? '') . "',
        '" . $conn->real_escape_string($data['cssCode'] ?? '') . "',
        '" . $conn->real_escape_string($data['inlineStyle'] ?? '') . "',
        '" . $conn->real_escape_string($data['onClickHandler'] ?? '') . "',
        '" . $conn->real_escape_string($data['onBlurHandler'] ?? '') . "',
        '" . $conn->real_escape_string($data['onChangeHandler'] ?? '') . "',
        '" . $conn->real_escape_string($data['onFocusHandler'] ?? '') . "',
        '" . $conn->real_escape_string($data['onKeyDownHandler'] ?? '') . "',
        '" . $conn->real_escape_string($data['onKeyUpHandler'] ?? '') . "',
        '" . $conn->real_escape_string($queryBuilder['statement'] ?? 'SELECT') . "',
        '" . $conn->real_escape_string($queryBuilder['columns'] ?? '*') . "',
        '" . $conn->real_escape_string($tableename) . "',
        '" . $conn->real_escape_string(json_encode($queryBuilder['whereConditions'] ?? [])) . "',
        '" . $conn->real_escape_string($queryBuilder['groupBy'] ?? '') . "',
        '" . $conn->real_escape_string($queryBuilder['having'] ?? '') . "',
        '" . $conn->real_escape_string($queryBuilder['orderBy'] ?? '') . "',
        '" . $conn->real_escape_string($queryBuilder['queryPreview'] ?? '') . "',
        '" . $conn->real_escape_string(json_encode($windowFunctionConfigs)) . "',
        '" . $conn->real_escape_string($queryBuilder['limit'] ?? '') . "',
        '" . $conn->real_escape_string($joinConfig['joinType'] ?? '') . "',
        '" . $conn->real_escape_string($joinConfig['primaryTable'] ?? '') . "',
        '" . $conn->real_escape_string($joinConfig['primaryAlias'] ?? '') . "',
        '" . $conn->real_escape_string($joinConfig['primaryColumn'] ?? '') . "',
        '" . $conn->real_escape_string($joinConfig['secondaryTable'] ?? '') . "',
        '" . $conn->real_escape_string($joinConfig['secondaryAlias'] ?? '') . "',
        '" . $conn->real_escape_string($joinConfig['secondaryColumn'] ?? '') . "',
        '" . $conn->real_escape_string($joinConfig['joinCondition'] ?? '') . "',
        '" . $conn->real_escape_string(json_encode($joinConfig['outputColumns'] ?? [])) . "',
        NOW(),
        NOW()
    )";

    $result = $conn->query($sql);

    if ($result) {
        $response = [
            'success' => true,
            'message' => 'Filter created successfully',
            'insertId' => $conn->insert_id,
        ];
    } else {
        $response = [
            'success' => false,
            'message' => 'Error: ' . $conn->error,
        ];
    }
}

echo json_encode($response);
$conn->close();
