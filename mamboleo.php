<?php
/**
 * Plugin Name:  Mamboleo
 * Plugin URI:   https://github.com/kanji8210/mamboleo
 * Description:  Kenya real-time security map. Registers the <code>incident</code> Custom Post Type
 *               with latitude / longitude / type / severity meta fields and exposes them via WPGraphQL.
 * Version:      0.1.0
 * Author:       kanji8210
 * License:      MIT
 * Text Domain:  mamboleo
 * Requires PHP: 8.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ─── 1. Register Custom Post Type ────────────────────────────────────────

add_action( 'init', 'mamboleo_register_cpt' );
function mamboleo_register_cpt(): void {
    register_post_type( 'incident', [
        'labels' => [
            'name'               => __( 'Incidents',      'mamboleo' ),
            'singular_name'      => __( 'Incident',       'mamboleo' ),
            'add_new_item'       => __( 'Add New Incident', 'mamboleo' ),
            'edit_item'          => __( 'Edit Incident',  'mamboleo' ),
            'view_item'          => __( 'View Incident',  'mamboleo' ),
            'search_items'       => __( 'Search Incidents', 'mamboleo' ),
            'not_found'          => __( 'No incidents found.', 'mamboleo' ),
        ],
        'public'              => true,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'menu_icon'           => 'dashicons-location-alt',
        'supports'            => [ 'title', 'excerpt', 'custom-fields' ],
        'has_archive'         => false,
        'rewrite'             => [ 'slug' => 'incidents' ],
        // Expose to WPGraphQL
        'show_in_graphql'     => true,
        'graphql_single_name' => 'incident',
        'graphql_plural_name' => 'incidents',
    ] );
}

// ─── 2. Register Meta Fields ─────────────────────────────────────────────

add_action( 'init', 'mamboleo_register_meta' );
function mamboleo_register_meta(): void {
    $shared = [
        'object_subtype' => 'incident',
        'single'         => true,
        'show_in_rest'   => true,
    ];

    register_post_meta( 'incident', 'type', array_merge( $shared, [
        'type'         => 'string',
        'description'  => 'Incident type: fire | accident | police | weather',
        'default'      => 'fire',
    ] ) );

    register_post_meta( 'incident', 'latitude', array_merge( $shared, [
        'type'         => 'number',
        'description'  => 'GPS latitude',
        'default'      => 0,
    ] ) );

    register_post_meta( 'incident', 'longitude', array_merge( $shared, [
        'type'         => 'number',
        'description'  => 'GPS longitude',
        'default'      => 0,
    ] ) );

    register_post_meta( 'incident', 'severity', array_merge( $shared, [
        'type'         => 'string',
        'description'  => 'Severity level: low | medium | high',
        'default'      => 'low',
    ] ) );

    register_post_meta( 'incident', 'status', array_merge( $shared, [
        'type'         => 'string',
        'description'  => 'Situation status: unsafe | all_clear | police_operating | police_aggressive | unknown',
        'default'      => 'unsafe',
    ] ) );

    register_post_meta( 'incident', 'incident_time', array_merge( $shared, [
        'type'         => 'string',
        'description'  => 'ISO 8601 date-time when the incident occurred',
        'default'      => '',
    ] ) );

    register_post_meta( 'incident', 'video_url', array_merge( $shared, [
        'type'         => 'string',
        'description'  => 'Link to video evidence (Rumble, YouTube, etc.)',
        'default'      => '',
    ] ) );

    register_post_meta( 'incident', 'reporter_name', array_merge( $shared, [
        'type'         => 'string',
        'description'  => 'Reporter display name (empty for anonymous)',
        'default'      => '',
    ] ) );

    register_post_meta( 'incident', 'is_anonymous', array_merge( $shared, [
        'type'         => 'boolean',
        'description'  => 'Whether the report was submitted anonymously',
        'default'      => true,
    ] ) );

    register_post_meta( 'incident', 'is_verified', array_merge( $shared, [
        'type'         => 'boolean',
        'description'  => 'Whether the incident has been verified by a moderator',
        'default'      => false,
    ] ) );

    register_post_meta( 'incident', 'corroboration_count', array_merge( $shared, [
        'type'         => 'integer',
        'description'  => 'Number of independent corroborations',
        'default'      => 0,
    ] ) );
}

// ─── 3. Expose Meta via WPGraphQL ────────────────────────────────────────
//
//  WPGraphQL reads registered meta automatically when `show_in_rest => true` is set
//  on register_post_meta() AND when the CPT has `show_in_graphql => true`.
//  We additionally register a dedicated `incidentFields` object type so the frontend
//  query `incidentFields { type latitude longitude severity }` resolves correctly.

add_action( 'graphql_register_types', 'mamboleo_register_graphql_types' );
function mamboleo_register_graphql_types(): void {

    // Register the composite IncidentFields object type
    register_graphql_object_type( 'IncidentFields', [
        'description' => __( 'Incident metadata fields', 'mamboleo' ),
        'fields'      => [
            'type'               => [ 'type' => 'String',  'description' => 'Incident type: fire | accident | police | weather' ],
            'latitude'           => [ 'type' => 'Float',   'description' => 'GPS latitude' ],
            'longitude'          => [ 'type' => 'Float',   'description' => 'GPS longitude' ],
            'severity'           => [ 'type' => 'String',  'description' => 'Severity: low | medium | high' ],
            'status'             => [ 'type' => 'String',  'description' => 'Situation status' ],
            'incidentTime'       => [ 'type' => 'String',  'description' => 'ISO 8601 date-time the incident occurred' ],
            'videoUrl'           => [ 'type' => 'String',  'description' => 'Link to video evidence' ],
            'reporterName'       => [ 'type' => 'String',  'description' => 'Reporter display name' ],
            'isAnonymous'        => [ 'type' => 'Boolean', 'description' => 'Submitted anonymously?' ],
            'isVerified'         => [ 'type' => 'Boolean', 'description' => 'Verified by moderator?' ],
            'corroborationCount' => [ 'type' => 'Int',     'description' => 'Number of corroborations' ],
        ],
    ] );

    // Register the `incidentFields` field on the Incident type
    register_graphql_field( 'Incident', 'incidentFields', [
        'type'        => 'IncidentFields',
        'description' => __( 'Core incident metadata', 'mamboleo' ),
        'resolve'     => function ( \WPGraphQL\Model\Post $post ) {
            $id          = $post->ID;
            $is_verified = get_post_meta( $id, 'is_verified', true );
            return [
                'type'               => get_post_meta( $id, 'type',               true ) ?: 'fire',
                'latitude'           => (float) ( get_post_meta( $id, 'latitude',  true ) ?: 0 ),
                'longitude'          => (float) ( get_post_meta( $id, 'longitude', true ) ?: 0 ),
                'severity'           => get_post_meta( $id, 'severity',           true ) ?: 'low',
                'status'             => get_post_meta( $id, 'status',             true ) ?: 'unsafe',
                'incidentTime'       => get_post_meta( $id, 'incident_time',      true ) ?: null,
                'videoUrl'           => get_post_meta( $id, 'video_url',          true ) ?: null,
                'reporterName'       => get_post_meta( $id, 'reporter_name',      true ) ?: null,
                'isAnonymous'        => (bool) ( get_post_meta( $id, 'is_anonymous', true ) ),
                // Admin-created posts (no meta) default to verified=true
                'isVerified'         => $is_verified === '' ? true : (bool) $is_verified,
                'corroborationCount' => (int) ( get_post_meta( $id, 'corroboration_count', true ) ?: 0 ),
            ];
        },
    ] );
}

// ─── 4. Admin Meta Box (quick data entry) ────────────────────────────────

add_action( 'add_meta_boxes', 'mamboleo_add_meta_box' );
function mamboleo_add_meta_box(): void {
    add_meta_box(
        'mamboleo_incident_fields',
        __( 'Incident Details', 'mamboleo' ),
        'mamboleo_meta_box_cb',
        'incident',
        'normal',
        'high'
    );
}

function mamboleo_meta_box_cb( WP_Post $post ): void {
    wp_nonce_field( 'mamboleo_save_meta', 'mamboleo_nonce' );

    $type      = get_post_meta( $post->ID, 'type',         true ) ?: 'fire';
    $lat       = get_post_meta( $post->ID, 'latitude',     true ) ?: '';
    $lng       = get_post_meta( $post->ID, 'longitude',    true ) ?: '';
    $severity  = get_post_meta( $post->ID, 'severity',     true ) ?: 'low';
    $status    = get_post_meta( $post->ID, 'status',       true ) ?: 'unsafe';
    $inc_time  = get_post_meta( $post->ID, 'incident_time',true ) ?: '';
    $video_url = get_post_meta( $post->ID, 'video_url',    true ) ?: '';
    $is_verified = get_post_meta( $post->ID, 'is_verified', true );
    ?>
    <style>
        .mamboleo-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 20px; padding:4px 0; }
        .mamboleo-grid label { font-weight:600; font-size:13px; display:block; margin-bottom:4px; }
        .mamboleo-grid input, .mamboleo-grid select { width:100%; }
        .mamboleo-map-hint { margin-top:10px; font-size:12px; color:#666; }
    </style>
    <div class="mamboleo-grid">
        <div>
            <label for="mamboleo_type"><?php esc_html_e( 'Type', 'mamboleo' ); ?></label>
            <select id="mamboleo_type" name="mamboleo_type">
                <?php foreach ( [ 'fire', 'accident', 'police', 'weather' ] as $opt ) : ?>
                    <option value="<?php echo esc_attr( $opt ); ?>" <?php selected( $type, $opt ); ?>>
                        <?php echo esc_html( ucfirst( $opt ) ); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <label for="mamboleo_severity"><?php esc_html_e( 'Severity', 'mamboleo' ); ?></label>
            <select id="mamboleo_severity" name="mamboleo_severity">
                <?php foreach ( [ 'low', 'medium', 'high' ] as $opt ) : ?>
                    <option value="<?php echo esc_attr( $opt ); ?>" <?php selected( $severity, $opt ); ?>>
                        <?php echo esc_html( ucfirst( $opt ) ); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <label for="mamboleo_status"><?php esc_html_e( 'Status', 'mamboleo' ); ?></label>
            <select id="mamboleo_status" name="mamboleo_status">
                <?php foreach ( [ 'unsafe', 'all_clear', 'police_operating', 'police_aggressive', 'unknown' ] as $opt ) : ?>
                    <option value="<?php echo esc_attr( $opt ); ?>" <?php selected( $status, $opt ); ?>>
                        <?php echo esc_html( str_replace( '_', ' ', ucfirst( $opt ) ) ); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <label for="mamboleo_lat"><?php esc_html_e( 'Latitude', 'mamboleo' ); ?></label>
            <input type="number" id="mamboleo_lat" name="mamboleo_lat"
                   step="0.000001" value="<?php echo esc_attr( $lat ); ?>"
                   placeholder="-1.286389" />
        </div>
        <div>
            <label for="mamboleo_lng"><?php esc_html_e( 'Longitude', 'mamboleo' ); ?></label>
            <input type="number" id="mamboleo_lng" name="mamboleo_lng"
                   step="0.000001" value="<?php echo esc_attr( $lng ); ?>"
                   placeholder="36.817223" />
        </div>
        <div>
            <label for="mamboleo_incident_time"><?php esc_html_e( 'Incident Time', 'mamboleo' ); ?></label>
            <input type="datetime-local" id="mamboleo_incident_time" name="mamboleo_incident_time"
                   value="<?php echo esc_attr( $inc_time ); ?>" />
        </div>
        <div>
            <label for="mamboleo_video_url"><?php esc_html_e( 'Video URL', 'mamboleo' ); ?></label>
            <input type="url" id="mamboleo_video_url" name="mamboleo_video_url"
                   value="<?php echo esc_attr( $video_url ); ?>" placeholder="https://rumble.com/..." />
        </div>
        <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;">
            <input type="checkbox" id="mamboleo_is_verified" name="mamboleo_is_verified" value="1"
                   <?php checked( $is_verified === '' ? true : (bool) $is_verified ); ?> />
            <label for="mamboleo_is_verified" style="margin:0;font-weight:600;font-size:13px;">
                <?php esc_html_e( 'Verified', 'mamboleo' ); ?>
            </label>
        </div>
    </div>
    <p class="mamboleo-map-hint">
        💡 <?php esc_html_e( 'Find coordinates: right-click any location on Google Maps → "What\'s here?"', 'mamboleo' ); ?>
    </p>
    <?php
}

add_action( 'save_post_incident', 'mamboleo_save_meta' );
function mamboleo_save_meta( int $post_id ): void {
    if ( ! isset( $_POST['mamboleo_nonce'] )
        || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['mamboleo_nonce'] ) ), 'mamboleo_save_meta' )
    ) {
        return;
    }
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
        return;
    }
    if ( ! current_user_can( 'edit_post', $post_id ) ) {
        return;
    }

    $allowed_types     = [ 'fire', 'accident', 'police', 'weather' ];
    $allowed_severities = [ 'low', 'medium', 'high' ];

    if ( isset( $_POST['mamboleo_type'] ) ) {
        $type = sanitize_text_field( wp_unslash( $_POST['mamboleo_type'] ) );
        update_post_meta( $post_id, 'type', in_array( $type, $allowed_types, true ) ? $type : 'fire' );
    }

    if ( isset( $_POST['mamboleo_severity'] ) ) {
        $severity = sanitize_text_field( wp_unslash( $_POST['mamboleo_severity'] ) );
        update_post_meta( $post_id, 'severity', in_array( $severity, $allowed_severities, true ) ? $severity : 'low' );
    }

    if ( isset( $_POST['mamboleo_status'] ) ) {
        $allowed_statuses = [ 'unsafe', 'all_clear', 'police_operating', 'police_aggressive', 'unknown' ];
        $status = sanitize_text_field( wp_unslash( $_POST['mamboleo_status'] ) );
        update_post_meta( $post_id, 'status', in_array( $status, $allowed_statuses, true ) ? $status : 'unsafe' );
    }

    if ( isset( $_POST['mamboleo_lat'] ) ) {
        $lat = filter_var( wp_unslash( $_POST['mamboleo_lat'] ), FILTER_VALIDATE_FLOAT );
        if ( $lat !== false && $lat >= -90 && $lat <= 90 ) {
            update_post_meta( $post_id, 'latitude', $lat );
        }
    }

    if ( isset( $_POST['mamboleo_lng'] ) ) {
        $lng = filter_var( wp_unslash( $_POST['mamboleo_lng'] ), FILTER_VALIDATE_FLOAT );
        if ( $lng !== false && $lng >= -180 && $lng <= 180 ) {
            update_post_meta( $post_id, 'longitude', $lng );
        }
    }

    if ( isset( $_POST['mamboleo_incident_time'] ) ) {
        $inc_time = sanitize_text_field( wp_unslash( $_POST['mamboleo_incident_time'] ) );
        update_post_meta( $post_id, 'incident_time', $inc_time );
    }

    if ( isset( $_POST['mamboleo_video_url'] ) ) {
        $video_url = esc_url_raw( wp_unslash( $_POST['mamboleo_video_url'] ) );
        update_post_meta( $post_id, 'video_url', $video_url );
    }

    $is_verified = isset( $_POST['mamboleo_is_verified'] ) ? 1 : 0;
    update_post_meta( $post_id, 'is_verified', $is_verified );
}

// ─── 5. CORS for local dev ────────────────────────────────────────────────

$mamboleo_allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
];

add_action( 'graphql_response_headers_to_send', 'mamboleo_graphql_cors' );
function mamboleo_graphql_cors( array $headers ): array {
    global $mamboleo_allowed_origins;
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ( in_array( $origin, $mamboleo_allowed_origins, true ) ) {
        $headers['Access-Control-Allow-Origin']  = $origin;
        $headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        $headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
    }
    return $headers;
}

add_filter( 'rest_pre_serve_request', 'mamboleo_rest_cors', 10, 4 );
function mamboleo_rest_cors( bool $served, \WP_HTTP_Response $result, \WP_REST_Request $request, \WP_REST_Server $server ): bool {
    global $mamboleo_allowed_origins;
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ( in_array( $origin, $mamboleo_allowed_origins, true ) ) {
        header( 'Access-Control-Allow-Origin: '  . $origin );
        header( 'Access-Control-Allow-Headers: Content-Type, Authorization' );
        header( 'Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE' );
    }
    return $served;
}

// ─── 6. REST API endpoints ───────────────────────────────────────────────

add_action( 'rest_api_init', 'mamboleo_register_rest_routes' );
function mamboleo_register_rest_routes(): void {

    // POST /wp-json/mamboleo/v1/report
    register_rest_route( 'mamboleo/v1', '/report', [
        'methods'             => 'POST',
        'callback'            => 'mamboleo_rest_submit_report',
        'permission_callback' => '__return_true',
        'args'                => [
            'title'        => [ 'required' => true,  'type' => 'string',  'sanitize_callback' => 'sanitize_text_field' ],
            'type'         => [ 'required' => true,  'type' => 'string',  'sanitize_callback' => 'sanitize_text_field' ],
            'status'       => [ 'required' => false, 'type' => 'string',  'sanitize_callback' => 'sanitize_text_field', 'default' => 'unsafe' ],
            'latitude'     => [ 'required' => true,  'type' => 'number'  ],
            'longitude'    => [ 'required' => true,  'type' => 'number'  ],
            'incidentTime' => [ 'required' => false, 'type' => 'string',  'sanitize_callback' => 'sanitize_text_field' ],
            'description'  => [ 'required' => false, 'type' => 'string',  'sanitize_callback' => 'sanitize_textarea_field' ],
            'videoUrl'     => [ 'required' => false, 'type' => 'string',  'sanitize_callback' => 'esc_url_raw' ],
            'isAnonymous'  => [ 'required' => false, 'type' => 'boolean', 'default' => true ],
            'reporterName' => [ 'required' => false, 'type' => 'string',  'sanitize_callback' => 'sanitize_text_field' ],
        ],
    ] );

    // POST /wp-json/mamboleo/v1/corroborate/{id}
    register_rest_route( 'mamboleo/v1', '/corroborate/(?P<id>\d+)', [
        'methods'             => 'POST',
        'callback'            => 'mamboleo_rest_corroborate',
        'permission_callback' => '__return_true',
        'args'                => [
            'id' => [ 'required' => true, 'type' => 'integer', 'validate_callback' => 'is_numeric' ],
        ],
    ] );
}

function mamboleo_rest_submit_report( WP_REST_Request $request ): WP_REST_Response|WP_Error {
    // Rate limit: 1 report per 10 minutes per IP
    $ip_key  = 'mamboleo_rate_' . md5( $_SERVER['REMOTE_ADDR'] ?? '' );
    if ( get_transient( $ip_key ) ) {
        return new WP_Error(
            'rate_limited',
            __( 'Too many reports. Please wait 10 minutes before submitting again.', 'mamboleo' ),
            [ 'status' => 429 ]
        );
    }

    $params = $request->get_params();

    // Validate type
    $allowed_types = [ 'fire', 'accident', 'police', 'weather' ];
    $type = $params['type'] ?? '';
    if ( ! in_array( $type, $allowed_types, true ) ) {
        return new WP_Error( 'invalid_type', __( 'Invalid incident type.', 'mamboleo' ), [ 'status' => 400 ] );
    }

    // Validate coordinates (Kenya bounds approx: lat 5S–5N, lng 34–42E)
    $lat = (float) $params['latitude'];
    $lng = (float) $params['longitude'];
    if ( $lat < -5.0 || $lat > 5.0 || $lng < 33.5 || $lng > 42.5 ) {
        return new WP_Error( 'invalid_coords', __( 'Coordinates must be within Kenya.', 'mamboleo' ), [ 'status' => 400 ] );
    }

    // Validate title length
    $title = $params['title'] ?? '';
    if ( strlen( $title ) < 5 || strlen( $title ) > 200 ) {
        return new WP_Error( 'invalid_title', __( 'Title must be between 5 and 200 characters.', 'mamboleo' ), [ 'status' => 400 ] );
    }

    $post_id = wp_insert_post( [
        'post_type'    => 'incident',
        'post_title'   => $title,
        'post_excerpt' => $params['description'] ?? '',
        'post_status'  => 'pending', // Pending review — will not appear until verified
    ] );

    if ( is_wp_error( $post_id ) ) {
        return new WP_Error( 'insert_failed', __( 'Failed to save report.', 'mamboleo' ), [ 'status' => 500 ] );
    }

    $allowed_statuses = [ 'unsafe', 'all_clear', 'police_operating', 'police_aggressive', 'unknown' ];
    $status = $params['status'] ?? 'unsafe';

    update_post_meta( $post_id, 'type',               $type );
    update_post_meta( $post_id, 'latitude',            $lat );
    update_post_meta( $post_id, 'longitude',           $lng );
    update_post_meta( $post_id, 'severity',            'low' );
    update_post_meta( $post_id, 'status',              in_array( $status, $allowed_statuses, true ) ? $status : 'unsafe' );
    update_post_meta( $post_id, 'incident_time',       $params['incidentTime'] ?? '' );
    update_post_meta( $post_id, 'video_url',           $params['videoUrl']     ?? '' );
    update_post_meta( $post_id, 'is_anonymous',        (bool) ( $params['isAnonymous'] ?? true ) );
    update_post_meta( $post_id, 'reporter_name',       $params['reporterName'] ?? '' );
    update_post_meta( $post_id, 'is_verified',         0 );
    update_post_meta( $post_id, 'corroboration_count', 0 );

    // Set rate-limit transient (600 seconds = 10 minutes)
    set_transient( $ip_key, 1, 600 );

    return new WP_REST_Response( [ 'success' => true, 'id' => $post_id ], 201 );
}

function mamboleo_rest_corroborate( WP_REST_Request $request ): WP_REST_Response|WP_Error {
    $post_id = (int) $request->get_param( 'id' );
    $post    = get_post( $post_id );

    if ( ! $post || $post->post_type !== 'incident' ) {
        return new WP_Error( 'not_found', __( 'Incident not found.', 'mamboleo' ), [ 'status' => 404 ] );
    }

    $count = (int) get_post_meta( $post_id, 'corroboration_count', true );
    $count++;
    update_post_meta( $post_id, 'corroboration_count', $count );

    return new WP_REST_Response( [ 'success' => true, 'count' => $count ], 200 );
}

// ─── 7. Seed sample incidents (WP-CLI or admin action) ───────────────────
//  Run: wp eval "mamboleo_seed_incidents();" --path=/path/to/wordpress
//  Or:  Visit /wp-admin/?mamboleo_seed=1 as an admin (one-time use)

add_action( 'admin_init', 'mamboleo_maybe_seed' );
function mamboleo_maybe_seed(): void {
    if ( ! isset( $_GET['mamboleo_seed'] ) || ! current_user_can( 'manage_options' ) ) {
        return;
    }
    if ( get_option( 'mamboleo_seeded' ) ) {
        wp_die( esc_html__( 'Incidents already seeded.', 'mamboleo' ) );
    }
    mamboleo_seed_incidents();
    update_option( 'mamboleo_seeded', true );
    wp_die( esc_html__( 'Seeded 10 sample incidents. You can delete them from the Incidents admin screen.', 'mamboleo' ) );
}

function mamboleo_seed_incidents(): void {
    $samples = [
        [ 'title' => 'Westlands Building Fire',    'type' => 'fire',     'lat' => -1.2690, 'lng' => 36.8070, 'sev' => 'high'   ],
        [ 'title' => 'Thika Road Pile-up',          'type' => 'accident', 'lat' => -1.2200, 'lng' => 36.8900, 'sev' => 'medium' ],
        [ 'title' => 'CBD Police Incident',         'type' => 'police',   'lat' => -1.2864, 'lng' => 36.8172, 'sev' => 'medium' ],
        [ 'title' => 'Heavy Flooding - Eastleigh',  'type' => 'weather',  'lat' => -1.2750, 'lng' => 36.8550, 'sev' => 'high'   ],
        [ 'title' => 'Ngong Road Accident',         'type' => 'accident', 'lat' => -1.3010, 'lng' => 36.7850, 'sev' => 'low'    ],
        [ 'title' => 'Karen Bush Fire',             'type' => 'fire',     'lat' => -1.3320, 'lng' => 36.7120, 'sev' => 'medium' ],
        [ 'title' => 'Kilimani Police Op',          'type' => 'police',   'lat' => -1.2940, 'lng' => 36.7880, 'sev' => 'low'    ],
        [ 'title' => 'Storm Alert - Lang\'ata',     'type' => 'weather',  'lat' => -1.3190, 'lng' => 36.7650, 'sev' => 'medium' ],
        [ 'title' => 'Mombasa Road Truck Crash',    'type' => 'accident', 'lat' => -1.3380, 'lng' => 36.8330, 'sev' => 'high'   ],
        [ 'title' => 'Mathare Valley Fire',         'type' => 'fire',     'lat' => -1.2580, 'lng' => 36.8620, 'sev' => 'high'   ],
    ];

    foreach ( $samples as $s ) {
        $id = wp_insert_post( [
            'post_type'    => 'incident',
            'post_title'   => $s['title'],
            'post_excerpt' => sprintf(
                'Sample incident: %s severity %s event near Nairobi.',
                $s['sev'],
                $s['type']
            ),
            'post_status'  => 'publish',
        ] );

        if ( is_wp_error( $id ) ) {
            continue;
        }

        update_post_meta( $id, 'type',      $s['type'] );
        update_post_meta( $id, 'latitude',  $s['lat'] );
        update_post_meta( $id, 'longitude', $s['lng'] );
        update_post_meta( $id, 'severity',  $s['sev'] );
    }
}
