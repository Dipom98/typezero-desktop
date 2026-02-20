import os

wp_functions_path = "/Users/dipomdutta/Downloads/typezero 3/functions.php"
react_support_path = "/Users/dipomdutta/Downloads/typezero 2/pages/Support.tsx"

# 1. Append WordPress Backend Code
wp_code = """
// --- Custom Post Type for User Feedback ---

function typezero_register_feedback_cpt() {
    $labels = array(
        'name'               => 'User Feedback',
        'singular_name'      => 'Feedback Ticket',
        'menu_name'          => 'User Feedback',
        'add_new'            => 'Add New Ticket',
        'add_new_item'       => 'Add New Ticket',
        'edit_item'          => 'Edit Ticket',
        'new_item'           => 'New Ticket',
        'view_item'          => 'View Ticket',
        'search_items'       => 'Search Tickets',
        'not_found'          => 'No tickets found',
        'not_found_in_trash' => 'No tickets found in Trash',
    );

    $args = array(
        'labels'              => $labels,
        'public'              => false,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'menu_position'       => 26,
        'menu_icon'           => 'dashicons-tickets-alt',
        'supports'            => array('title', 'editor', 'custom-fields'),
        'has_archive'         => false,
        'rewrite'             => false,
        'capability_type'     => 'post',
    );

    register_post_type('typezero_feedback', $args);
}
add_action('init', 'typezero_register_feedback_cpt');

// Register REST API Endpoint
function typezero_register_support_api() {
    register_rest_route('typezero/v1', '/support', array(
        'methods'             => 'POST',
        'callback'            => 'typezero_handle_support_submission',
        'permission_callback' => '__return_true', // Public endpoint
    ));
}
add_action('rest_api_init', 'typezero_register_support_api');

function typezero_handle_support_submission($request) {
    $params = $request->get_params();
    $name = sanitize_text_field($params['name'] ?? '');
    $email = sanitize_email($params['email'] ?? '');
    $topic = sanitize_text_field($params['topic'] ?? '');
    $message = sanitize_textarea_field($params['message'] ?? '');

    if (empty($name) || empty($email) || empty($message)) {
        return new WP_Error('missing_fields', 'Missing required fields.', array('status' => 400));
    }

    $post_id = wp_insert_post(array(
        'post_title'   => sprintf('%s - %s', $topic, $name),
        'post_content' => $message,
        'post_status'  => 'publish',
        'post_type'    => 'typezero_feedback',
    ));

    if (is_wp_error($post_id)) {
        return new WP_Error('db_error', 'Could not create ticket.', array('status' => 500));
    }

    update_post_meta($post_id, '_feedback_email', $email);
    update_post_meta($post_id, '_feedback_topic', $topic);
    update_post_meta($post_id, '_feedback_name', $name);

    // Handle File Attachment
    $files = $request->get_file_params();
    if (!empty($files['attachment']) && $files['attachment']['size'] > 0) {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        
        $attachment_id = media_handle_sideload($files['attachment'], $post_id);
        if (!is_wp_error($attachment_id)) {
            update_post_meta($post_id, '_feedback_attachment_id', $attachment_id);
            $attachment_url = wp_get_attachment_url($attachment_id);
            update_post_meta($post_id, '_feedback_attachment_url', $attachment_url);
        }
    }

    // Optional Auto-Reply HTML string
    $reply_subject = "Support Ticket Received: " . $topic;
    $reply_message = "Hi " . $name . ",<br><br>We have received your support ticket regarding <b>" . $topic . "</b>. Our team will review it and get back to you within 24 hours.<br><br>Best Regards,<br>TypeZero Support";
    $headers = array('Content-Type: text/html; charset=UTF-8', 'From: TypeZero Support <Support@Dipomdutta.com>');
    wp_mail($email, $reply_subject, $reply_message, $headers);

    return rest_ensure_response(array('success' => true, 'message' => 'Ticket submitted successfully.'));
}

// Add Custom Columns to Admin
add_filter('manage_typezero_feedback_posts_columns', 'typezero_set_feedback_columns');
function typezero_set_feedback_columns($columns) {
    unset($columns['date']);
    $columns['email'] = 'Email';
    $columns['topic'] = 'Topic';
    $columns['attachment'] = 'Attachment';
    $columns['date'] = 'Date';
    return $columns;
}

add_action('manage_typezero_feedback_posts_custom_column', 'typezero_custom_feedback_column', 10, 2);
function typezero_custom_feedback_column($column, $post_id) {
    switch ($column) {
        case 'email':
            echo esc_html(get_post_meta($post_id, '_feedback_email', true));
            break;
        case 'topic':
            echo esc_html(get_post_meta($post_id, '_feedback_topic', true));
            break;
        case 'attachment':
            $url = get_post_meta($post_id, '_feedback_attachment_url', true);
            if ($url) {
                echo '<a href="' . esc_url($url) . '" target="_blank">View File</a>';
            } else {
                echo 'None';
            }
            break;
    }
}
"""

with open(wp_functions_path, 'r') as f:
    current_wp = f.read()

if "typezero_register_feedback_cpt" not in current_wp:
    with open(wp_functions_path, 'a') as f:
        f.write("\n" + wp_code)

# 2. Patch the React Frontend 
with open(react_support_path, 'r') as f:
    react_content = f.read()

# Replace endpoint and headers
old_fetch = 'const res = await fetch("https://api.web3forms.com/submit", {'
new_fetch = """const endpointUrl = window.location.hostname === 'localhost' ? 'https://typezero.dipomdutta.com/wp-json/typezero/v1/support' : '/wp-json/typezero/v1/support';
      const res = await fetch(endpointUrl, {"""

react_content = react_content.replace(old_fetch, new_fetch)

# we need to remove Accept application/json because WordPress accepts formData directly
old_headers = """headers: {
          Accept: "application/json"
        },"""
new_headers = """"""
react_content = react_content.replace(old_headers, new_headers)


old_hidden_inputs = """{/* Hidden access key for Web3Forms */}
              <input type="hidden" name="access_key" value="21844def-7473-49fd-a2f4-4915072ce5fa" />
              <input type="hidden" name="subject" value="New Support Request from TypeZero Website" />
              <input type="hidden" name="from_name" value="TypeZero Support Form" />"""
new_hidden_inputs = """{/* Submitting to internal WP REST API instead of Web3Forms */}"""
react_content = react_content.replace(old_hidden_inputs, new_hidden_inputs)


with open(react_support_path, 'w') as f:
    f.write(react_content)
    
print("Successfully updated WP and React")
