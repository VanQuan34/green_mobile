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
 * 1. TẠO BẢNG KHI KÍCH HOẠT PLUGIN
 */
register_activation_hook(__FILE__, 'gm_create_custom_tables');

function gm_create_custom_tables() {
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

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql_products);
    dbDelta($sql_invoices);
    dbDelta($sql_users);
}

/**
 * Helper: Lưu hoặc cập nhật thông tin khách hàng
 */
function gm_upsert_user($name, $phone, $address) {
    global $wpdb;
    $table = $wpdb->prefix . 'gm_users';
    
    $existing_id = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE phone = %s", $phone));
    
    $data = array(
        'name'    => sanitize_text_field($name),
        'phone'   => sanitize_text_field($phone),
        'address' => sanitize_textarea_field($address)
    );
    
    if ($existing_id) {
        $wpdb->update($table, $data, array('id' => $existing_id));
        return $existing_id;
    } else {
        $wpdb->insert($table, $data);
        return $wpdb->insert_id;
    }
}


/**
 * 2. ĐĂNG KÝ REST API ROUTES
 */
add_action('rest_api_init', 'gm_register_rest_routes');

function gm_register_rest_routes() {
    $namespace = 'gm/v1';

    // Products Endpoints
    register_rest_route($namespace, '/products', array(
        array(
            'methods'  => 'GET',
            'callback' => 'gm_handle_get_products',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods'  => 'POST',
            'callback' => 'gm_handle_create_product',
            'permission_callback' => '__return_true'
        )
    ));

    register_rest_route($namespace, '/products/(?P<id>\d+)', array(
        array(
            'methods'  => 'PUT',
            'callback' => 'gm_handle_update_product',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods'  => 'DELETE',
            'callback' => 'gm_handle_delete_product',
            'permission_callback' => '__return_true'
        )
    ));

    // Invoices Endpoints
    register_rest_route($namespace, '/invoices', array(
        array(
            'methods'  => 'GET',
            'callback' => 'gm_handle_get_invoices',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods'  => 'POST',
            'callback' => 'gm_handle_create_invoice',
            'permission_callback' => '__return_true'
        )
    ));

    register_rest_route($namespace, '/invoices/(?P<id>[a-zA-Z0-9_-]+)', array(
        array(
            'methods'  => 'DELETE',
            'callback' => 'gm_handle_delete_invoice',
            'permission_callback' => '__return_true'
        )
    ));

    // Customers Endpoint (Unique from Invoices)
    register_rest_route($namespace, '/customers', array(
        'methods'  => 'GET',
        'callback' => 'gm_handle_get_customers',
        'permission_callback' => '__return_true'
    ));
}

/**
 * 3. CALLBACK FUNCTIONS - PRODUCTS
 */
function gm_handle_get_products() {
    global $wpdb;
    $table = $wpdb->prefix . 'gm_products';
    $results = $wpdb->get_results("SELECT * FROM $table ORDER BY created_at DESC");
    
    // Convert types to match Angular expectations
    foreach ($results as &$row) {
        $row->originalPrice = (int)$row->original_price;
        $row->sellingPrice = (int)$row->selling_price;
        $row->sale = (bool)$row->sale;
        unset($row->original_price, $row->selling_price);
    }
    
    return new WP_REST_Response($results, 200);
}

function gm_handle_create_product($request) {
    global $wpdb;
    $params = $request->get_json_params();
    $table = $wpdb->prefix . 'gm_products';

    $data = array(
        'name'           => sanitize_text_field($params['name']),
        'imei'           => sanitize_text_field($params['imei']),
        'image'          => esc_url_raw($params['image'] ?? ''),
        'capacity'       => sanitize_text_field($params['capacity'] ?? ''),
        'color'          => sanitize_text_field($params['color'] ?? ''),
        'status'         => sanitize_text_field($params['status'] ?? ''),
        'original_price' => (int)($params['originalPrice'] ?? 0),
        'selling_price'  => (int)($params['sellingPrice'] ?? 0),
        'sale'           => (int)($params['sale'] ?? 0)
    );

    $inserted = $wpdb->insert($table, $data);

    if ($inserted) {
        return new WP_REST_Response(array('id' => $wpdb->insert_id, 'message' => 'Success'), 201);
    }
    return new WP_Error('db_error', 'Could not create product', array('status' => 500));
}

function gm_handle_update_product($request) {
    global $wpdb;
    $id = $request['id'];
    $params = $request->get_json_params();
    $table = $wpdb->prefix . 'gm_products';

    $data = array();
    if (isset($params['name'])) $data['name'] = sanitize_text_field($params['name']);
    if (isset($params['imei'])) $data['imei'] = sanitize_text_field($params['imei']);
    if (isset($params['image'])) $data['image'] = esc_url_raw($params['image']);
    if (isset($params['status'])) $data['status'] = sanitize_text_field($params['status']);
    if (isset($params['originalPrice'])) $data['original_price'] = (int)$params['originalPrice'];
    if (isset($params['sellingPrice'])) $data['selling_price'] = (int)$params['sellingPrice'];
    if (isset($params['sale'])) $data['sale'] = (int)$params['sale'];

    $updated = $wpdb->update($table, $data, array('id' => $id));

    return new WP_REST_Response(array('message' => 'Updated successfully'), 200);
}

function gm_handle_delete_product($request) {
    global $wpdb;
    $id = $request['id'];
    $table = $wpdb->prefix . 'gm_products';
    $wpdb->delete($table, array('id' => $id));
    return new WP_REST_Response(array('message' => 'Deleted'), 200);
}

/**
 * 4. CALLBACK FUNCTIONS - INVOICES
 */
function gm_handle_get_invoices() {
    global $wpdb;
    $table_inv = $wpdb->prefix . 'gm_invoices';
    $table_usr = $wpdb->prefix . 'gm_users';
    
    // JOIN giữa Hóa đơn và Khách hàng để lấy thông tin hiển thị
    $sql = "SELECT i.*, u.name as buyer_name, u.phone as buyer_phone, u.address as buyer_address 
            FROM $table_inv i 
            LEFT JOIN $table_usr u ON i.buyer_id = u.id 
            ORDER BY i.created_at DESC";
            
    $results = $wpdb->get_results($sql);

    foreach ($results as &$row) {
        $row->buyerName = $row->buyer_name;
        $row->buyerAddress = $row->buyer_address;
        $row->buyerPhone = $row->buyer_phone;
        $row->productName = $row->product_name;
        $row->productPrice = (int)$row->product_price;
        $row->amountPaid = (int)$row->amount_paid;
        $row->debt = (int)$row->debt;
        $row->isFullyPaid = (bool)$row->is_fully_paid;
        $row->productId = (string)$row->product_id;
        $row->createdAt = $row->created_at;
        
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

    return new WP_REST_Response($results, 200);
}

function gm_handle_create_invoice($request) {
    global $wpdb;
    $params = $request->get_json_params();
    $table_inv = $wpdb->prefix . 'gm_invoices';
    $table_prod = $wpdb->prefix . 'gm_products';

    // 1. Xử lý ID hóa đơn
    $invoice_id = (!empty($params['id'])) ? $params['id'] : 'INV-' . time() . '-' . rand(100, 999);

    // 2. Lưu/Cập nhật khách hàng vào bảng gm_users trước để lấy ID
    $buyer_id = gm_upsert_user(
        $params['buyerName'] ?? '', 
        $params['buyerPhone'] ?? '', 
        $params['buyerAddress'] ?? ''
    );

    // 3. Chuẩn bị dữ liệu hóa đơn (Dùng buyer_id thay cho thông tin tên/địa chỉ)
    $data = array(
        'id'             => $invoice_id,
        'buyer_id'       => $buyer_id, // Khóa ngoại
        'product_id'     => (int)($params['productId'] ?? 0),
        'product_name'   => sanitize_text_field($params['productName'] ?? ''),
        'product_price'  => (int)($params['productPrice'] ?? 0),
        'amount_paid'    => (int)($params['amountPaid'] ?? 0),
        'debt'           => (int)($params['debt'] ?? 0),
        'is_fully_paid'  => (int)($params['isFullyPaid'] ?? 0)
    );

    $inserted = $wpdb->insert($table_inv, $data);

    if ($inserted) {
        // Cập nhật trạng thái sản phẩm sang Đã bán
        $wpdb->update($table_prod, array('sale' => 1), array('id' => $params['productId']));
        
        return new WP_REST_Response(array('id' => $invoice_id, 'message' => 'Invoice created'), 201);
    }
    
    return new WP_Error('db_error', 'SQL Error: ' . $wpdb->last_error, array('status' => 500));
}

function gm_handle_delete_invoice($request) {
    global $wpdb;
    $id = $request['id'];
    $table = $wpdb->prefix . 'gm_invoices';
    $wpdb->delete($table, array('id' => $id));
    return new WP_REST_Response(array('message' => 'Deleted'), 200);
}

function gm_handle_get_customers() {
    global $wpdb;
    $table = $wpdb->prefix . 'gm_users';
    $results = $wpdb->get_results("SELECT name, phone, address FROM $table ORDER BY name ASC");
    return new WP_REST_Response($results, 200);
}

/**
 * 5. CORS SUPPORT
 */
add_action('init', function() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if ('OPTIONS' == $_SERVER['REQUEST_METHOD']) {
        status_header(200);
        exit();
    }
});
