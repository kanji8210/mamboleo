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
            'type'      => [
                'type'        => 'String',
                'description' => 'Incident type: fire | accident | police | weather',
            ],
            'latitude'  => [
                'type'        => 'Float',
                'description' => 'GPS latitude',
            ],
            'longitude' => [
                'type'        => 'Float',
                'description' => 'GPS longitude',
            ],
            'severity'  => [
                'type'        => 'String',
                'description' => 'Severity level: low | medium | high',
            ],
        ],
    ] );

    // Register the `incidentFields` field on the Incident type
    register_graphql_field( 'Incident', 'incidentFields', [
        'type'        => 'IncidentFields',
        'description' => __( 'Core incident metadata', 'mamboleo' ),
        'resolve'     => function ( \WPGraphQL\Model\Post $post ) {
            $id = $post->ID;
            return [
                'type'      => get_post_meta( $id, 'type',      true ) ?: 'fire',
                'latitude'  => (float) ( get_post_meta( $id, 'latitude',  true ) ?: 0 ),
                'longitude' => (float) ( get_post_meta( $id, 'longitude', true ) ?: 0 ),
                'severity'  => get_post_meta( $id, 'severity',  true ) ?: 'low',
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

    $type      = get_post_meta( $post->ID, 'type',      true ) ?: 'fire';
    $lat       = get_post_meta( $post->ID, 'latitude',  true ) ?: '';
    $lng       = get_post_meta( $post->ID, 'longitude', true ) ?: '';
    $severity  = get_post_meta( $post->ID, 'severity',  true ) ?: 'low';
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
}

// ─── 5. CORS for local dev (only in local/dev environments) ──────────────

add_action( 'graphql_response_headers_to_send', 'mamboleo_graphql_cors' );
function mamboleo_graphql_cors( array $headers ): array {
    $allowed_origins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ( in_array( $origin, $allowed_origins, true ) ) {
        $headers['Access-Control-Allow-Origin']  = $origin;
        $headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        $headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
    }

    return $headers;
}

// ─── 6. Seed sample incidents (WP-CLI or admin action) ───────────────────
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
