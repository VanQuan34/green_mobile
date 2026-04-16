<?php
/**
 * Plugin Name: Green Mobile Custom API
 * Description: Backend API và quản lý Database cho hệ thống Di Động Xanh (Angular).
 * Version: 1.1
 * Author: Antigravity AI
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * 0. CẤU HÌNH ĐỒNG BỘ GOOGLE SHEET
 * Lưu ý: Giá trị này hiện đã được chuyển vào Database (bảng gm_settings).
 * Hằng số này chỉ còn dùng làm giá trị mặc định ban đầu.
 */
define('GM_DEFAULT_GSHEET_URL', 'https://script.google.com/macros/s/AKfycbzipcDn2PEREmi0fx7ceQZ4rAgeRUEbldkV-ZhCEg843U6cqRPdn3P8tDyfacMmfojB/exec');

/**
 * 1. TẠO BẢNG KHI KÍCH HOẠT PLUGIN
 */
register_activation_hook(__FILE__, 'gm_create_custom_tables');

function gm_create_custom_tables()
{
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();

    // Bảng Sản phẩm
    $table_products = $wpdb->prefix . 'gm_products';
    $sql_products = "CREATE TABLE $table_products (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        name varchar(255) NOT NULL,
        imei varchar(50) NOT NULL,
        image text,
        capacity varchar(20),
        color varchar(50),
        status varchar(50),
        original_price bigint(20) DEFAULT 0,
        selling_price bigint(20) DEFAULT 0,
        sale tinyint(1) DEFAULT 0,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        UNIQUE KEY imei (imei)
    ) $charset_collate;";

    // Bảng Hóa đơn [Cập nhật cấu trúc: Dùng buyer_id]
    $table_invoices = $wpdb->prefix . 'gm_invoices';
    $sql_invoices = "CREATE TABLE $table_invoices (
        id varchar(50) NOT NULL,
        buyer_id bigint(20) NOT NULL,
        product_id bigint(20),
        product_name varchar(255),
        product_price bigint(20),
        amount_paid bigint(20),
        debt bigint(20),
        is_fully_paid tinyint(1) DEFAULT 0,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY  (id)
    ) $charset_collate;";

    // Bảng Khách hàng
    $table_users = $wpdb->prefix . 'gm_users';
    $sql_users = "CREATE TABLE $table_users (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        name varchar(255) NOT NULL,
        phone varchar(20) NOT NULL,
        address text,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        UNIQUE KEY phone (phone)
    ) $charset_collate;";

    // Bảng Chi tiết Hóa đơn [NEW]
    $table_items = $wpdb->prefix . 'gm_invoice_items';
    $sql_items = "CREATE TABLE $table_items (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        invoice_id varchar(50) NOT NULL,
        product_id bigint(20) NOT NULL,
        product_name varchar(255) NOT NULL,
        price bigint(20) NOT NULL,
        PRIMARY KEY  (id),
        KEY invoice_id (invoice_id)
    ) $charset_collate;";

    // Bảng Cài đặt [NEW]
    $table_settings = $wpdb->prefix . 'gm_settings';
    $sql_settings = "CREATE TABLE $table_settings (
        setting_key varchar(100) NOT NULL,
        setting_value text,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY  (setting_key)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql_products);
    dbDelta($sql_invoices);
    dbDelta($sql_users);
    dbDelta($sql_items);
    dbDelta($sql_settings);

    // Khởi tạo giá trị mặc định nếu chưa có
    $existing = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table_settings WHERE setting_key = %s", 'google_sheet_url'));
    if (!$existing) {
        $wpdb->insert($table_settings, array(
            'setting_key' => 'google_sheet_url',
            'setting_value' => GM_DEFAULT_GSHEET_URL
        ));
    }
}

/**
 * Helper: Lưu hoặc cập nhật thông tin khách hàng
 */
function gm_upsert_user($name, $phone, $address)
{
    global $wpdb;
    $table = $wpdb->prefix . 'gm_users';

    $phone = trim($phone);

    // Chỉ tìm kiếm khách hàng cũ nếu có số điện thoại thực sự
    if (!empty($phone)) {
        $existing_id = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE phone = %s", $phone));
        if ($existing_id) {
            $wpdb->update($table, array(
                'name' => sanitize_text_field($name),
                'address' => sanitize_textarea_field($address)
            ), array('id' => $existing_id));
            return $existing_id;
        }
    } else {
        // Dùng uniqid để đảm bảo không bao giờ trùng lặp UNIQUE KEY phone
        $phone = 'GUEST-' . uniqid();
    }

    $data = array(
        'name' => sanitize_text_field($name),
        'phone' => sanitize_text_field($phone),
        'address' => sanitize_textarea_field($address)
    );

    $wpdb->insert($table, $data);
    return $wpdb->insert_id;
}


/**
 * 2. ĐĂNG KÝ REST API ROUTES
 */
add_action('rest_api_init', 'gm_register_rest_routes');

function gm_register_rest_routes()
{
    $namespace = 'gm/v1';

    // Products Endpoints
    register_rest_route($namespace, '/products', array(
        array(
            'methods' => 'GET',
            'callback' => 'gm_handle_get_products',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods' => 'POST',
            'callback' => 'gm_handle_create_product',
            'permission_callback' => '__return_true'
        )
    ));

    // Settings Endpoints
    register_rest_route($namespace, '/settings', array(
        array(
            'methods' => 'GET',
            'callback' => 'gm_handle_get_settings',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods' => 'POST',
            'callback' => 'gm_handle_save_settings',
            'permission_callback' => '__return_true'
        )
    ));

    register_rest_route($namespace, '/products/(?P<id>\d+)', array(
        array(
            'methods' => 'PUT',
            'callback' => 'gm_handle_update_product',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods' => 'DELETE',
            'callback' => 'gm_handle_delete_product',
            'permission_callback' => '__return_true'
        )
    ));

    // Invoices Endpoints
    register_rest_route($namespace, '/invoices', array(
        array(
            'methods' => 'GET',
            'callback' => 'gm_handle_get_invoices',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods' => 'POST',
            'callback' => 'gm_handle_create_invoice',
            'permission_callback' => '__return_true'
        )
    ));

    // Login Endpoint
    register_rest_route($namespace, '/login', array(
        'methods' => 'POST',
        'callback' => 'gm_handle_login',
        'permission_callback' => '__return_true'
    ));

    register_rest_route($namespace, '/invoices/(?P<id>[a-zA-Z0-9_-]+)', array(
        array(
            'methods' => 'PUT',
            'callback' => 'gm_handle_update_invoice',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods' => 'DELETE',
            'callback' => 'gm_handle_delete_invoice',
            'permission_callback' => '__return_true'
        )
    ));

    // Customers Endpoints
    register_rest_route($namespace, '/customers', array(
        'methods' => 'GET',
        'callback' => 'gm_handle_get_customers',
        'permission_callback' => '__return_true'
    ));

    register_rest_route($namespace, '/customers/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'gm_handle_update_customer',
        'permission_callback' => '__return_true'
    ));

    // Media Endpoints
    register_rest_route($namespace, '/media', array(
        array(
            'methods' => 'GET',
            'callback' => 'gm_handle_get_media',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods' => 'POST',
            'callback' => 'gm_handle_upload_image',
            'permission_callback' => '__return_true'
        )
    ));

    // Dashboard Stats Endpoint
    register_rest_route($namespace, '/dashboard/stats', array(
        'methods' => 'GET',
        'callback' => 'gm_handle_get_dashboard_stats',
        'permission_callback' => '__return_true'
    ));

    // FCM Test Endpoint
    register_rest_route($namespace, '/test-fcm', array(
        'methods' => 'GET',
        'callback' => 'gm_handle_test_fcm',
        'permission_callback' => '__return_true'
    ));
}

/**
 * 3. CALLBACK FUNCTIONS - PRODUCTS
 */
function gm_handle_get_products($request)
{
    global $wpdb;
    $table = $wpdb->prefix . 'gm_products';

    // Get parameters
    $page = $request->get_param('page') ?: 1;
    $per_page = $request->get_param('per_page') ?: 10;
    $search = $request->get_param('search');

    $where_clause = " WHERE sale = 0 ";
    $sql_params = array();

    if (!empty($search)) {
        $search_term = '%' . $wpdb->esc_like($search) . '%';
        $where_clause .= " AND (name LIKE %s OR imei LIKE %s OR color LIKE %s) ";
        $sql_params[] = $search_term;
        $sql_params[] = $search_term;
        $sql_params[] = $search_term;
    }

    // Total count
    $total_sql = "SELECT COUNT(*) FROM $table $where_clause";
    if (!empty($sql_params)) {
        $total_sql = $wpdb->prepare($total_sql, ...$sql_params);
    }
    $total_items = (int) $wpdb->get_var($total_sql);

    // Pagination logic
    $offset = ($page - 1) * $per_page;
    $sql = "SELECT * FROM $table $where_clause ORDER BY created_at DESC LIMIT %d OFFSET %d";

    $final_params = $sql_params;
    $final_params[] = (int) $per_page;
    $final_params[] = (int) $offset;

    $results = $wpdb->get_results($wpdb->prepare($sql, ...$final_params));

    // Convert types to match Angular expectations
    foreach ($results as &$row) {
        $row->originalPrice = (int) $row->original_price;
        $row->sellingPrice = (int) $row->selling_price;
        $row->sale = (bool) $row->sale;
        unset($row->original_price, $row->selling_price);
    }

    $response = new WP_REST_Response($results, 200);
    $response->header('X-WP-Total', $total_items);
    $response->header('X-WP-TotalPages', ceil($total_items / $per_page));

    return $response;
}

function gm_handle_create_product($request)
{
    global $wpdb;
    $params = $request->get_json_params();
    $table = $wpdb->prefix . 'gm_products';

    $imei = sanitize_text_field($params['imei'] ?? '');
    if (empty($imei)) {
        return new WP_Error('missing_imei', 'Vui lòng nhập số IMEI.', array('status' => 400));
    }

    // Check if IMEI already exists
    $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE imei = %s LIMIT 1", $imei));
    if ($exists) {
        return new WP_Error('duplicate_imei', 'Số IMEI này đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.', array('status' => 400));
    }

    $data = array(
        'name' => sanitize_text_field($params['name']),
        'imei' => $imei,
        'image' => esc_url_raw($params['image'] ?? ''),
        'capacity' => sanitize_text_field($params['capacity'] ?? ''),
        'color' => sanitize_text_field($params['color'] ?? ''),
        'status' => sanitize_text_field($params['status'] ?? ''),
        'original_price' => (int) ($params['originalPrice'] ?? 0),
        'selling_price' => (int) ($params['sellingPrice'] ?? 0),
        'sale' => (int) ($params['sale'] ?? 0)
    );

    $inserted = $wpdb->insert($table, $data);

    if ($inserted) {
        $params['id'] = (string) $wpdb->insert_id;
        return new WP_REST_Response(array('data' => $params, 'message' => 'Success'), 201);
    }
    return new WP_Error('db_error', 'Could not create product', array('status' => 500));
}

function gm_handle_update_product($request)
{
    global $wpdb;
    $id = (int) $request['id'];
    $params = $request->get_json_params();
    $table = $wpdb->prefix . 'gm_products';

    $data = array();
    if (isset($params['name']))
        $data['name'] = sanitize_text_field($params['name']);

    if (isset($params['imei'])) {
        $imei = sanitize_text_field($params['imei']);
        // Check if IMEI already exists for ANOTHER product
        $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE imei = %s AND id != %d LIMIT 1", $imei, $id));
        if ($exists) {
            return new WP_Error('duplicate_imei', 'Số IMEI này đã bị trùng với một sản phẩm khác.', array('status' => 400));
        }
        $data['imei'] = $imei;
    }

    if (isset($params['image']))
        $data['image'] = esc_url_raw($params['image']);
    if (isset($params['status']))
        $data['status'] = sanitize_text_field($params['status']);
    if (isset($params['originalPrice']))
        $data['original_price'] = (int) $params['originalPrice'];
    if (isset($params['sellingPrice']))
        $data['selling_price'] = (int) $params['sellingPrice'];
    if (isset($params['sale']))
        $data['sale'] = (int) $params['sale'];

    $updated = $wpdb->update($table, $data, array('id' => $id));
    $params['id'] = $id;

    return new WP_REST_Response(array('data' => $params, 'message' => 'Updated successfully'), 200);
}

function gm_handle_delete_product($request)
{
    global $wpdb;
    $id = $request['id'];
    $table = $wpdb->prefix . 'gm_products';
    $wpdb->delete($table, array('id' => $id));
    return new WP_REST_Response(array('message' => 'Deleted'), 200);
}

/**
 * 4. CALLBACK FUNCTIONS - INVOICES
 */
function gm_handle_get_invoices($request)
{
    global $wpdb;
    $table_inv = $wpdb->prefix . 'gm_invoices';
    $table_usr = $wpdb->prefix . 'gm_users';
    $table_items = $wpdb->prefix . 'gm_invoice_items';

    // Nhận tham số lọc ngày
    $from_date = $request->get_param('from_date');
    $to_date = $request->get_param('to_date');

    // Nhận tham số phân trang (Nếu không truyền page → legacy mode trả tất cả)
    $page = $request->get_param('page');
    $per_page = $request->get_param('per_page') ?: 15;
    $search = $request->get_param('search');
    $tab = $request->get_param('tab'); // 'all', 'paid', 'debt'
    $sort = $request->get_param('sort') ?: 'date_desc';

    $is_paginated = !empty($page);

    // ===== Build WHERE clause =====
    $where_conditions = array();
    $sql_params = array();

    if (!empty($from_date) && !empty($to_date)) {
        $start = sanitize_text_field($from_date) . ' 00:00:00';
        $end = sanitize_text_field($to_date) . ' 23:59:59';
        $where_conditions[] = "i.created_at BETWEEN %s AND %s";
        $sql_params[] = $start;
        $sql_params[] = $end;
    }

    // Lọc theo tab (chỉ khi phân trang)
    if ($is_paginated && !empty($tab) && $tab !== 'all') {
        if ($tab === 'paid') {
            $where_conditions[] = "i.is_fully_paid = 1";
        } elseif ($tab === 'debt') {
            $where_conditions[] = "i.is_fully_paid = 0";
        }
    }

    // Lọc tìm kiếm (chỉ khi phân trang)
    if ($is_paginated && !empty($search)) {
        $search_term = '%' . $wpdb->esc_like($search) . '%';
        $where_conditions[] = "(u.name LIKE %s OR u.phone LIKE %s OR i.product_name LIKE %s)";
        $sql_params[] = $search_term;
        $sql_params[] = $search_term;
        $sql_params[] = $search_term;
    }

    $where_clause = '';
    if (!empty($where_conditions)) {
        $where_clause = ' WHERE ' . implode(' AND ', $where_conditions);
    }

    // ===== Build ORDER BY =====
    $order_clause = 'ORDER BY i.created_at DESC';
    if ($is_paginated) {
        switch ($sort) {
            case 'date_asc':
                $order_clause = 'ORDER BY i.created_at ASC';
                break;
            case 'debt_desc':
                $order_clause = 'ORDER BY i.debt DESC';
                break;
            case 'debt_asc':
                $order_clause = 'ORDER BY i.debt ASC';
                break;
            default:
                $order_clause = 'ORDER BY i.created_at DESC';
                break;
        }
    }

    // ===== Tab counts (chỉ khi phân trang) =====
    $total_all = 0;
    $total_paid = 0;
    $total_debt = 0;

    if ($is_paginated) {
        // Build count WHERE (không bao gồm tab filter, giữ date/search filters)
        $count_conditions = array();
        $count_params = array();

        if (!empty($from_date) && !empty($to_date)) {
            $count_conditions[] = "i.created_at BETWEEN %s AND %s";
            $count_params[] = sanitize_text_field($from_date) . ' 00:00:00';
            $count_params[] = sanitize_text_field($to_date) . ' 23:59:59';
        }
        if (!empty($search)) {
            $search_term_count = '%' . $wpdb->esc_like($search) . '%';
            $count_conditions[] = "(u.name LIKE %s OR u.phone LIKE %s OR i.product_name LIKE %s)";
            $count_params[] = $search_term_count;
            $count_params[] = $search_term_count;
            $count_params[] = $search_term_count;
        }

        $count_where = '';
        if (!empty($count_conditions)) {
            $count_where = ' WHERE ' . implode(' AND ', $count_conditions);
        }

        // Total all
        $count_sql = "SELECT COUNT(*) FROM $table_inv i LEFT JOIN $table_usr u ON i.buyer_id = u.id $count_where";
        $total_all = !empty($count_params)
            ? (int) $wpdb->get_var($wpdb->prepare($count_sql, ...$count_params))
            : (int) $wpdb->get_var($count_sql);

        // Total paid
        $paid_where = !empty($count_conditions)
            ? ' WHERE ' . implode(' AND ', $count_conditions) . ' AND i.is_fully_paid = 1'
            : ' WHERE i.is_fully_paid = 1';
        $paid_sql = "SELECT COUNT(*) FROM $table_inv i LEFT JOIN $table_usr u ON i.buyer_id = u.id $paid_where";
        $total_paid = !empty($count_params)
            ? (int) $wpdb->get_var($wpdb->prepare($paid_sql, ...$count_params))
            : (int) $wpdb->get_var($paid_sql);

        $total_debt = $total_all - $total_paid;
    }

    // ===== Main query =====
    $base_sql = "SELECT i.*, u.name as buyer_name, u.phone as buyer_phone, u.address as buyer_address 
            FROM $table_inv i 
            LEFT JOIN $table_usr u ON i.buyer_id = u.id 
            $where_clause
            $order_clause";

    if ($is_paginated) {
        $offset = ((int) $page - 1) * (int) $per_page;
        $base_sql .= " LIMIT %d OFFSET %d";
        $sql_params[] = (int) $per_page;
        $sql_params[] = (int) $offset;
    }

    if (!empty($sql_params)) {
        $base_sql = $wpdb->prepare($base_sql, ...$sql_params);
    }

    $results = $wpdb->get_results($base_sql);

    if (empty($results)) {
        $response = new WP_REST_Response(array(), 200);
        if ($is_paginated) {
            $response->header('X-WP-Total', $total_all);
            $response->header('X-WP-TotalPaid', $total_paid);
            $response->header('X-WP-TotalDebt', $total_debt);
        }
        return $response;
    }

    // 2. Fetch all items for these invoices in one go to be efficient
    $invoice_ids = array_map(function ($row) {
        return $row->id; }, $results);
    $placeholders = implode(',', array_fill(0, count($invoice_ids), '%s'));

    $table_prod = $wpdb->prefix . 'gm_products';

    // JOIN with products table to get full info (imei, image, capacity, color, status, original_price)
    $items_sql = $wpdb->prepare("
        SELECT it.*, p.imei, p.image, p.capacity, p.color, p.status, p.original_price
        FROM $table_items it
        LEFT JOIN $table_prod p ON it.product_id = p.id
        WHERE it.invoice_id IN ($placeholders)
    ", $invoice_ids);

    $all_items = $wpdb->get_results($items_sql);

    // Group items by invoice_id
    $items_by_invoice = array();
    foreach ($all_items as $item) {
        $items_by_invoice[$item->invoice_id][] = array(
            'id' => (string) $item->product_id,
            'name' => $item->product_name,
            'sellingPrice' => (int) $item->price,
            'imei' => $item->imei ?? '',
            'image' => $item->image ?? '',
            'capacity' => $item->capacity ?? '',
            'color' => $item->color ?? '',
            'status' => $item->status ?? '',
            'originalPrice' => (int) ($item->original_price ?? 0)
        );
    }

    // 3. Format result to match Angular Invoice interface
    foreach ($results as &$row) {
        $row->buyerName = $row->buyer_name;
        $row->buyerAddress = $row->buyer_address;
        $row->buyerPhone = $row->buyer_phone;

        // Attach products array
        $row->products = $items_by_invoice[$row->id] ?? array();

        // Totals & Status
        $row->amountPaid = (int) $row->amount_paid;
        $row->debt = (int) $row->debt;
        $row->isFullyPaid = (bool) $row->is_fully_paid;
        $row->createdAt = $row->created_at;

        // Calculate totalAmount from items if not present in main table
        $total = 0;
        foreach ($row->products as $p) {
            $total += $p['sellingPrice'];
        }
        $row->totalAmount = $total;

        // Legacy fields for compatibility
        $row->productName = $row->product_name;
        $row->productPrice = (int) $row->product_price;
        $row->productId = (string) $row->product_id;

        unset(
            $row->buyer_name,
            $row->buyer_address,
            $row->buyer_phone,
            $row->product_id,
            $row->product_name,
            $row->product_price,
            $row->amount_paid,
            $row->is_fully_paid,
            $row->created_at,
            $row->updated_at
        );
    }

    $response = new WP_REST_Response($results, 200);
    if ($is_paginated) {
        $current_tab_total = $total_all;
        if ($tab === 'paid') $current_tab_total = $total_paid;
        elseif ($tab === 'debt') $current_tab_total = $total_debt;

        $response->header('X-WP-Total', $current_tab_total);
        $response->header('X-WP-TotalPages', ceil($current_tab_total / $per_page));
        $response->header('X-WP-TotalPaid', $total_paid);
        $response->header('X-WP-TotalDebt', $total_debt);
        $response->header('X-WP-TotalAll', $total_all);
    }
    return $response;
}

function gm_handle_create_invoice($request)
{
    global $wpdb;
    $params = $request->get_json_params();
    $table_inv = $wpdb->prefix . 'gm_invoices';
    $table_prod = $wpdb->prefix . 'gm_products';
    $table_items = $wpdb->prefix . 'gm_invoice_items';

    // Dùng uniqid nếu không có ID từ frontend
    $invoice_id = (!empty($params['id'])) ? $params['id'] : 'INV-' . uniqid();

    // 2. Lưu/Cập nhật khách hàng vào bảng gm_users trước để lấy ID
    $buyer_id = gm_upsert_user(
        $params['buyerName'] ?? '',
        $params['buyerPhone'] ?? '',
        $params['buyerAddress'] ?? ''
    );

    // 3. Chuẩn bị dữ liệu hóa đơn chính
    $data = array(
        'id' => $invoice_id,
        'buyer_id' => $buyer_id,
        'amount_paid' => (int) ($params['amountPaid'] ?? 0),
        'debt' => (int) ($params['debt'] ?? 0),
        'is_fully_paid' => (int) ($params['isFullyPaid'] ?? 0)
    );

    // Legacy support (optional: keep if you still have old code using these columns)
    $data['product_id'] = (int) ($params['productId'] ?? 0);
    $data['product_name'] = sanitize_text_field($params['productName'] ?? '');
    $data['product_price'] = (int) ($params['productPrice'] ?? 0);

    $inserted = $wpdb->insert($table_inv, $data);

    if ($inserted) {
        // 4. Xử lý mảng sản phẩm chi tiết
        $products = $params['products'] ?? array();

        // Nếu không có mảng products nhưng có single productId (từ app cũ), tạo mảng giả để đồng bộ
        if (empty($products) && !empty($params['productId'])) {
            $products[] = array(
                'id' => $params['productId'],
                'name' => $params['productName'] ?? '',
                'sellingPrice' => $params['productPrice'] ?? 0
            );
        }

        foreach ($products as $p) {
            $p_id = (int) $p['id'];

            // Lưu vào bảng chi tiết
            $wpdb->insert($table_items, array(
                'invoice_id' => $invoice_id,
                'product_id' => $p_id,
                'product_name' => sanitize_text_field($p['name'] ?? ''),
                'price' => (int) ($p['sellingPrice'] ?? 0)
            ));

            // Cập nhật trạng thái sản phẩm sang Đã bán
            $wpdb->update($table_prod, array('sale' => 1), array('id' => $p_id));
        }

        // 5. Đồng bộ Google Sheets (Nếu có URL)
        $gsheet_url = gm_get_setting('google_sheet_url');
        if (!empty($gsheet_url)) {
            $product_names = array();
            foreach ($products as $p) {
                $name = $p['name'] ?? '';
                $imei = $p['imei'] ?? 'N/A';
                $color = $p['color'] ?? 'N/A';
                $price = number_format($p['sellingPrice'] ?? 0, 0, ',', '.');
                $product_names[] = "$name (IMEI: $imei, Màu: $color) - $price VNĐ";
            }
            $sync_data = array(
                'id' => $invoice_id,
                'buyer_name' => $params['buyerName'] ?? '',
                'buyer_phone' => $params['buyerPhone'] ?? '',
                'amount_paid' => (int) ($params['amountPaid'] ?? 0),
                'debt' => (int) ($params['debt'] ?? 0),
                'product_summary' => implode(', ', $product_names)
            );
            gm_sync_to_google_sheet($sync_data);
        }

        // 6. Gửi thông báo FCM
        $buyer_name = $params['buyerName'] ?? 'Khách lẻ';
        $total_amount = 0;
        foreach ($products as $p) {
            $total_amount += (int) ($p['sellingPrice'] ?? 0);
        }
        $total_str = number_format($total_amount, 0, ',', '.') . ' VNĐ';

        gm_send_fcm_notification(
            "Hóa đơn mới: $buyer_name",
            "Đã bán đơn hàng trị giá $total_str. Kiểm tra ngay!",
            array(
                'invoice_id' => $invoice_id,
                'type' => 'new_invoice'
            )
        );

        $params['id'] = $invoice_id;
        return new WP_REST_Response(array('data' => $params, 'message' => 'Invoice created'), 201);
    }

    return new WP_Error('db_error', 'SQL Error: ' . $wpdb->last_error, array('status' => 500));
}

function gm_verify_jwt($token)
{
    if (empty($token))
        return false;

    $parts = explode('.', $token);
    if (count($parts) !== 3)
        return false;

    $header = $parts[0];
    $payload = $parts[1];
    $signature = $parts[2];

    $secret = defined('AUTH_KEY') ? AUTH_KEY : 'gm_secret_fallback_123';
    $valid_signature = gm_base64url_encode(hash_hmac('sha256', "$header.$payload", $secret, true));

    if ($signature !== $valid_signature)
        return false;

    $data = json_decode(base64_decode($payload), true);
    if (!$data || ($data['exp'] < time()))
        return false;

    return $data;
}

function gm_handle_delete_invoice($request)
{
    global $wpdb;
    $id = $request['id'];

    $table_inv = $wpdb->prefix . 'gm_invoices';
    $table_items = $wpdb->prefix . 'gm_invoice_items';
    $table_prod = $wpdb->prefix . 'gm_products';

    // 1. Kiểm tra xác thực qua Token
    $auth_header = $request->get_header('Authorization');
    $token = '';
    if ($auth_header && preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
        $token = $matches[1];
    } else {
        $token = $request->get_param('token');
    }

    $jwt_data = gm_verify_jwt($token);
    if (!$jwt_data) {
        return new WP_Error('unauthorized', 'Phiên đăng nhập hết hạn hoặc không hợp lệ.', array('status' => 401));
    }

    // Lấy password từ body request (Fix lỗi 400 do biến $password chưa định nghĩa)
    $params = $request->get_json_params();
    $password = isset($params['password']) ? $params['password'] : '';

    // 2. Kiểm tra mật khẩu của user đang đăng nhập
    if (empty($password)) {
        return new WP_Error('missing_password', 'Vui lòng nhập mật khẩu để xác nhận xóa.', array('status' => 400));
    }

    // Chấp nhận cả id và user_id từ token payload
    $token_user_id = isset($jwt_data['id']) ? $jwt_data['id'] : (isset($jwt_data['user_id']) ? $jwt_data['user_id'] : null);
    
    $user = get_userdata($token_user_id);
    if (!$user || !wp_check_password($password, $user->user_pass, $user->ID)) {
        return new WP_Error('wrong_password', 'Mật khẩu không chính xác.', array('status' => 403));
    }

    // 3. Khôi phục trạng thái sản phẩm sang "Chưa bán" (sale = 0)
    // Lấy danh sách product_id từ cả bảng items chi tiết và cột legacy product_id
    $product_ids = $wpdb->get_col($wpdb->prepare("SELECT product_id FROM $table_items WHERE invoice_id = %s", $id));
    $legacy_pid = $wpdb->get_var($wpdb->prepare("SELECT product_id FROM $table_inv WHERE id = %s", $id));
    if ($legacy_pid) {
        $product_ids[] = $legacy_pid;
    }
    $product_ids = array_unique(array_filter($product_ids));

    if (!empty($product_ids)) {
        $placeholders = implode(',', array_fill(0, count($product_ids), '%d'));
        $wpdb->query($wpdb->prepare("UPDATE $table_prod SET sale = 0 WHERE id IN ($placeholders)", ...$product_ids));
    }

    // 4. Xóa dữ liệu hóa đơn
    $wpdb->delete($table_items, array('invoice_id' => $id));
    $wpdb->delete($table_inv, array('id' => $id));

    return new WP_REST_Response(array('message' => 'Hóa đơn đã được xóa và sản phẩm đã được khôi phục.'), 200);
}

function gm_handle_update_invoice($request)
{
    global $wpdb;
    $id = $request['id'];
    $params = $request->get_json_params();
    $table_inv = $wpdb->prefix . 'gm_invoices';
    $table_items = $wpdb->prefix . 'gm_invoice_items';

    // 1. Cập nhật khách hàng
    $buyer_id = gm_upsert_user(
        $params['buyerName'] ?? '',
        $params['buyerPhone'] ?? '',
        $params['buyerAddress'] ?? ''
    );

    // 2. Cập nhật hóa đơn
    $data = array(
        'buyer_id' => $buyer_id,
        'amount_paid' => (int) ($params['amountPaid'] ?? 0),
        'debt' => (int) ($params['debt'] ?? 0),
        'is_fully_paid' => (int) ($params['isFullyPaid'] ?? 0)
    );

    $wpdb->update($table_inv, $data, array('id' => $id));

    // 3. Cập nhật items (xóa cũ thêm mới cho đơn giản)
    $wpdb->delete($table_items, array('invoice_id' => $id));
    $products = $params['products'] ?? array();
    foreach ($products as $p) {
        $wpdb->insert($table_items, array(
            'invoice_id' => $id,
            'product_id' => (int) ($p['id'] ?? 0),
            'product_name' => sanitize_text_field($p['name'] ?? ''),
            'price' => (int) ($p['sellingPrice'] ?? 0)
        ));
    }

    $params['id'] = $id;
    return new WP_REST_Response(array('data' => $params, 'message' => 'Updated'), 200);
}

function gm_handle_get_customers($request)
{
    global $wpdb;
    $table = $wpdb->prefix . 'gm_users';

    $page = $request->get_param('page');
    $per_page = $request->get_param('per_page') ?: 15;
    $search = $request->get_param('search');

    $is_paginated = !empty($page);

    $where_clause = '';
    $sql_params = array();

    if ($is_paginated && !empty($search)) {
        $search_term = '%' . $wpdb->esc_like($search) . '%';
        $where_clause = ' WHERE (name LIKE %s OR phone LIKE %s OR address LIKE %s)';
        $sql_params[] = $search_term;
        $sql_params[] = $search_term;
        $sql_params[] = $search_term;
    }

    if ($is_paginated) {
        // Count total
        $count_sql = "SELECT COUNT(*) FROM $table $where_clause";
        $total = !empty($sql_params)
            ? (int) $wpdb->get_var($wpdb->prepare($count_sql, ...$sql_params))
            : (int) $wpdb->get_var($count_sql);

        // Paginated query
        $offset = ((int) $page - 1) * (int) $per_page;
        $sql = "SELECT id as p_id, name, phone, address FROM $table $where_clause ORDER BY name ASC LIMIT %d OFFSET %d";
        $sql_params[] = (int) $per_page;
        $sql_params[] = (int) $offset;

        $results = $wpdb->get_results($wpdb->prepare($sql, ...$sql_params));

        $response = new WP_REST_Response($results, 200);
        $response->header('X-WP-Total', $total);
        $response->header('X-WP-TotalPages', ceil($total / $per_page));
        return $response;
    }

    // Legacy mode: trả tất cả (cho autocomplete, invoice form, debt list)
    $results = $wpdb->get_results("SELECT id as p_id, name, phone, address FROM $table ORDER BY name ASC");
    return new WP_REST_Response($results, 200);
}

function gm_handle_update_customer($request)
{
    global $wpdb;
    $id = $request->get_param('id');
    $params = $request->get_json_params();
    $table = $wpdb->prefix . 'gm_users';

    $data = array(
        'name' => sanitize_text_field($params['name'] ?? ''),
        'phone' => sanitize_text_field($params['phone'] ?? ''),
        'address' => sanitize_text_field($params['address'] ?? '')
    );

    $wpdb->update($table, $data, array('id' => $id));

    return new WP_REST_Response(array('message' => 'Customer updated'), 200);
}

/**
 * 4. CALLBACK FUNCTIONS - MEDIA
 */
function gm_handle_get_media($request)
{
    $per_page = (int) ($request->get_param('per_page') ?: 20);
    $page = (int) ($request->get_param('page') ?: 1);

    $args = array(
        'post_type' => 'attachment',
        'post_mime_type' => 'image',
        'post_status' => 'inherit',
        'posts_per_page' => $per_page,
        'paged' => $page,
        'orderby' => 'date',
        'order' => 'DESC'
    );

    $query = new WP_Query($args);
    $posts = $query->posts;

    $media = array();
    foreach ($posts as $post) {
        $full_url = wp_get_attachment_url($post->ID);
        // Lấy thêm thumbnail nếu có
        $thumb_url = wp_get_attachment_image_url($post->ID, 'thumbnail');

        $media[] = array(
            'id' => (string) $post->ID,
            'url' => $full_url,
            'thumbnail' => $thumb_url ?: $full_url,
            'name' => $post->post_title,
            'date' => $post->post_date
        );
    }

    $response = new WP_REST_Response($media, 200);
    $response->header('X-WP-Total', (int) $query->found_posts);
    $response->header('X-WP-TotalPages', (int) $query->max_num_pages);

    return $response;
}

function gm_handle_upload_image($request)
{
    if (empty($_FILES['image'])) {
        return new WP_Error('no_file', 'Không tìm thấy tệp tin.', array('status' => 400));
    }

    // Yêu cầu các file cần thiết của WordPress để xử lý upload
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');

    // 'image' là tên của field trong multipart form
    $attachment_id = media_handle_upload('image', 0);

    if (is_wp_error($attachment_id)) {
        return new WP_Error('upload_error', $attachment_id->get_error_message(), array('status' => 500));
    }

    $url = wp_get_attachment_url($attachment_id);

    return new WP_REST_Response(array(
        'id' => (string) $attachment_id,
        'url' => $url,
        'message' => 'Tải lên thành công.'
    ), 200);
}

/**
 * 4. AUTHENTICATION & JWT
 */
function gm_base64url_encode($data)
{
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

function gm_generate_jwt($user)
{
    $header = gm_base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));

    $issuedAt = time();
    $expire = $issuedAt + (24 * 60 * 60); // 24 hours

    $payload = gm_base64url_encode(json_encode([
        'user_id' => $user->ID,
        'username' => $user->user_login,
        'email' => $user->user_email,
        'iat' => $issuedAt,
        'exp' => $expire
    ]));

    $secret = defined('AUTH_KEY') ? AUTH_KEY : 'gm_secret_fallback_123';
    $signature = gm_base64url_encode(hash_hmac('sha256', "$header.$payload", $secret, true));

    return [
        'token' => "$header.$payload.$signature",
        'exp' => $expire
    ];
}

function gm_handle_login($request)
{
    $params = $request->get_json_params();
    $username = $params['username'] ?? '';
    $password = $params['password'] ?? '';

    if (empty($username) || empty($password)) {
        return new WP_Error('missing_params', 'Vui lòng nhập tên đăng nhập và mật khẩu.', array('status' => 400));
    }

    $user = wp_authenticate($username, $password);

    if (is_wp_error($user)) {
        return new WP_Error('auth_failed', 'Tên đăng nhập hoặc mật khẩu không chính xác.', array('status' => 403));
    }

    $jwt_data = gm_generate_jwt($user);

    return new WP_REST_Response([
        'token' => $jwt_data['token'],
        'expires' => $jwt_data['exp'],
        'user' => [
            'id' => $user->ID,
            'name' => $user->display_name,
            'username' => $user->user_login,
            'email' => $user->user_email,
            'roles' => $user->roles
        ]
    ], 200);
}

/**
 * 6. SETTINGS HELPERS
 */
function gm_get_setting($key, $default = '')
{
    global $wpdb;
    $table = $wpdb->prefix . 'gm_settings';
    $value = $wpdb->get_var($wpdb->prepare("SELECT setting_value FROM $table WHERE setting_key = %s", $key));
    return ($value !== null) ? $value : $default;
}

function gm_handle_get_settings()
{
    global $wpdb;
    $table = $wpdb->prefix . 'gm_settings';
    $results = $wpdb->get_results("SELECT setting_key as `key`, setting_value as `value` FROM $table");

    // Chuyển sang dạng object key-value cho dễ dùng ở frontend
    $settings = array();
    foreach ($results as $row) {
        $settings[$row->key] = $row->value;
    }
    return new WP_REST_Response($settings, 200);
}

function gm_handle_save_settings($request)
{
    global $wpdb;
    $table = $wpdb->prefix . 'gm_settings';
    $params = $request->get_json_params();

    foreach ($params as $key => $value) {
        $wpdb->replace($table, array(
            'setting_key' => sanitize_text_field($key),
            'setting_value' => sanitize_text_field($value)
        ));
    }

    return new WP_REST_Response(array('message' => 'Settings updated'), 200);
}

/**
 * 7. GOOGLE SHEET SYNC HELPER
 */
function gm_sync_to_google_sheet($invoice_data)
{
    $url = gm_get_setting('google_sheet_url');
    if (empty($url))
        return;

    $body = array(
        'invoice_id' => $invoice_data['id'],
        'date' => current_time('mysql'),
        'buyer_name' => $invoice_data['buyer_name'],
        'buyer_phone' => $invoice_data['buyer_phone'],
        'amount_paid' => $invoice_data['amount_paid'],
        'debt' => $invoice_data['debt'],
        'products' => $invoice_data['product_summary']
    );

    wp_remote_post($url, array(
        'method' => 'POST',
        'timeout' => 1,      // Giảm thời gian chờ kết nối (vì không cần đợi phản hồi)
        'redirection' => 5,
        'httpversion' => '1.0',
        'blocking' => false,  // CHẾ ĐỘ BẤT ĐỒNG BỘ: Gửi xong là trả kết quả ngay, không đợi Google phản hồi
        'headers' => array('Content-Type' => 'application/json'),
        'body' => json_encode($body),
        'cookies' => array(),
        'sslverify' => false
    ));
}

/**
 * 8. DASHBOARD STATS HELPER
 */
function gm_handle_get_dashboard_stats($request)
{
    global $wpdb;
    $table_products = $wpdb->prefix . 'gm_products';
    $table_invoices = $wpdb->prefix . 'gm_invoices';
    $table_items = $wpdb->prefix . 'gm_invoice_items';

    // Lấy tham số lọc thời gian
    $from_date = $request->get_param('from_date');
    $to_date = $request->get_param('to_date');

    // Điều kiện lọc chung cho hóa đơn (Sử dụng alias 'i')
    $inv_where = " WHERE i.id NOT LIKE 'MANUAL-%' ";
    $inv_params = array();

    if (!empty($from_date) && !empty($to_date)) {
        $start = sanitize_text_field($from_date) . ' 00:00:00';
        $end = sanitize_text_field($to_date) . ' 23:59:59';
        $inv_where .= " AND i.created_at BETWEEN %s AND %s ";
        $inv_params[] = $start;
        $inv_params[] = $end;
    }

    // 1. Đếm sản phẩm đã bán và tồn kho (Vẫn lấy tổng thực tế của kho hàng hiện tại)
    $sold_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM $table_products WHERE sale = 1") ?: 0;
    $inventory_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM $table_products WHERE sale = 0") ?: 0;
    $total_capital = (int) $wpdb->get_var("SELECT SUM(original_price) FROM $table_products") ?: 0;
    $total_expected_revenue = (int) $wpdb->get_var("SELECT SUM(selling_price) FROM $table_products") ?: 0;

    // 2. Doanh thu và thực thu từ hóa đơn (Có áp dụng bộ lọc)
    $revenue_sql = "SELECT SUM(i.amount_paid + i.debt) as total_revenue, SUM(i.amount_paid) as total_paid 
                    FROM $table_invoices i 
                    $inv_where";
    if (!empty($inv_params))
        $revenue_sql = $wpdb->prepare($revenue_sql, ...$inv_params);
    $revenue_data = $wpdb->get_row($revenue_sql);

    // 3. Tổng nợ (Bao gồm cả nợ nhập ngoài - Có áp dụng bộ lọc)
    $debt_where_clause = " WHERE d.id IS NOT NULL ";
    $debt_params = array();
    if (!empty($from_date) && !empty($to_date)) {
        $start = sanitize_text_field($from_date) . ' 00:00:00';
        $end = sanitize_text_field($to_date) . ' 23:59:59';
        $debt_where_clause .= " AND d.created_at BETWEEN %s AND %s ";
        $debt_params[] = $start;
        $debt_params[] = $end;
    }
    $debt_sql = "SELECT SUM(d.debt) FROM $table_invoices d $debt_where_clause";
    if (!empty($debt_params))
        $debt_sql = $wpdb->prepare($debt_sql, ...$debt_params);
    $total_debt = (int) $wpdb->get_var($debt_sql) ?: 0;

    // 4. Tính lợi nhuận (Profit)
    // Nguồn 1: Từ chi tiết hóa đơn (đơn hàng mới có invoice_items)
    $profit_items_sql = "SELECT SUM(it.price - IFNULL(p.original_price, 0)) 
                         FROM $table_items it
                         JOIN $table_invoices i ON it.invoice_id = i.id
                         LEFT JOIN $table_products p ON it.product_id = p.id
                         $inv_where";
    if (!empty($inv_params))
        $profit_items_sql = $wpdb->prepare($profit_items_sql, ...$inv_params);
    $profit_from_items = (int) $wpdb->get_var($profit_items_sql) ?: 0;

    // Nguồn 2: Từ thông tin sản phẩm trực tiếp trên hóa đơn (cho đơn hàng cũ không có items chi tiết)
    $profit_legacy_sql = "SELECT SUM(i.product_price - IFNULL(p.original_price, 0)) 
                          FROM $table_invoices i
                          LEFT JOIN $table_products p ON i.product_id = p.id
                          $inv_where 
                          AND i.id NOT IN (SELECT DISTINCT invoice_id FROM $table_items)";
    if (!empty($inv_params))
        $profit_legacy_sql = $wpdb->prepare($profit_legacy_sql, ...$inv_params);
    $profit_from_legacy = (int) $wpdb->get_var($profit_legacy_sql) ?: 0;

    $total_profit = $profit_from_items + $profit_from_legacy;

    return new WP_REST_Response(array(
        'soldCount' => $sold_count,
        'inventoryCount' => $inventory_count,
        'totalRevenue' => (int) ($revenue_data->total_revenue ?? 0),
        'totalPaid' => (int) ($revenue_data->total_paid ?? 0),
        'totalDebt' => $total_debt,
        'totalCapital' => $total_capital,
        'totalExpectedRevenue' => $total_expected_revenue,
        'totalProfit' => $total_profit
    ), 200);
}

/**
 * 9. FCM NOTIFICATION HELPERS
 */
function gm_get_fcm_access_token()
{
    $token = get_transient('gm_fcm_access_token');
    if ($token)
        return $token;

    $json_path = plugin_dir_path(__FILE__) . 'fcm-mobile-415a5-firebase-adminsdk-h3nc7-505ea43322.json';
    if (!file_exists($json_path))
        return false;

    $config = json_decode(file_get_contents($json_path), true);
    $client_email = $config['client_email'];
    $private_key = $config['private_key'];

    $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
    $now = time();
    $payload = json_encode([
        'iss' => $client_email,
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $now + 3600,
        'iat' => $now
    ]);

    $base64UrlHeader = gm_base64url_encode($header);
    $base64UrlPayload = gm_base64url_encode($payload);

    $signature = '';
    if (!openssl_sign($base64UrlHeader . "." . $base64UrlPayload, $signature, $private_key, OPENSSL_ALGO_SHA256)) {
        return false;
    }
    $base64UrlSignature = gm_base64url_encode($signature);
    $jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;

    $response = wp_remote_post('https://oauth2.googleapis.com/token', array(
        'body' => array(
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        )
    ));

    if (is_wp_error($response))
        return false;
    $data = json_decode(wp_remote_retrieve_body($response), true);
    $access_token = $data['access_token'] ?? false;

    if ($access_token) {
        set_transient('gm_fcm_access_token', $access_token, 3500);
    }

    return $access_token;
}

function gm_send_fcm_notification($title, $body, $data = [])
{
    $access_token = gm_get_fcm_access_token();
    if (!$access_token)
        return false;

    $token = gm_get_setting('fcm_token');
    if (empty($token))
        return false;

    $project_id = 'fcm-mobile-415a5'; // Lấy từ file JSON
    $url = "https://fcm.googleapis.com/v1/projects/$project_id/messages:send";

    $message = [
        'message' => [
            'token' => $token,
            'notification' => [
                'title' => $title,
                'body' => $body
            ],
            'data' => array_map('strval', $data),
            'apns' => [
                'payload' => [
                    'aps' => [
                        'sound' => 'default',
                        'badge' => 1
                    ]
                ]
            ]
        ]
    ];

    $response = wp_remote_post($url, array(
        'headers' => array(
            'Authorization' => "Bearer $access_token",
            'Content-Type' => 'application/json'
        ),
        'body' => json_encode($message),
        'timeout' => 1,
        'blocking' => false, // CHẾ ĐỘ BẤT ĐỒNG BỘ
        'sslverify' => false
    ));

    return !is_wp_error($response);
}

function gm_handle_test_fcm($request)
{
    $success = gm_send_fcm_notification(
        "Thông báo thử nghiệm",
        "Nếu bạn thấy thông báo này, FCM đã hoạt động! " . date('H:i:s'),
        ['test' => 'true']
    );

    if ($success) {
        return new WP_REST_Response(['message' => 'Test notification sent to topic: admin_invoices'], 200);
    } else {
        return new WP_REST_Response(['message' => 'Failed to send notification. Check logs or credentials.'], 500);
    }
}

/**
 * 10. CORS SUPPORT
 */
add_action('init', function () {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if ('OPTIONS' == $_SERVER['REQUEST_METHOD']) {
        status_header(200);
        exit();
    }
});

// Override WordPress core's Expose-Headers (chạy sau rest_send_cors_headers ở priority 10)
add_filter('rest_pre_serve_request', function ($served) {
    header("Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages, X-WP-TotalAll, X-WP-TotalPaid, X-WP-TotalDebt, Link");
    return $served;
}, 15);
