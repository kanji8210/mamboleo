<?php
/**
 * Plugin Name:  Mamboleo
 * Plugin URI:   https://github.com/kanji8210/mamboleo
 * Description:  Kenya real-time security map - frontend React PWA loader.
 * Version:      0.1.0
 * Author:       kanji8210
 * License:      MIT
 * Text Domain:  mamboleo
 * Requires PHP: 8.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ── Enqueue the built React app ───────────────────────────────────────────────
add_action( 'wp_enqueue_scripts', 'mamboleo_enqueue_app' );
function mamboleo_enqueue_app(): void {
    $dist = plugin_dir_path( __FILE__ ) . 'dist/assets/';
    $url  = plugin_dir_url( __FILE__ )  . 'dist/assets/';

    if ( ! is_dir( $dist ) ) {
        return;
    }

    foreach ( glob( $dist . '*.js' ) as $file ) {
        $handle = 'mamboleo-' . basename( $file, '.js' );
        wp_enqueue_script( $handle, $url . basename( $file ), [], null, true );
    }
    foreach ( glob( $dist . '*.css' ) as $file ) {
        $handle = 'mamboleo-' . basename( $file, '.css' );
        wp_enqueue_style( $handle, $url . basename( $file ), [], null );
    }
}

// Vite outputs ES modules — WordPress doesn't add type="module" by default.
add_filter( 'script_loader_tag', 'mamboleo_add_module_type', 10, 3 );
function mamboleo_add_module_type( string $tag, string $handle, string $src ): string {
    if ( str_starts_with( $handle, 'mamboleo-' ) ) {
        $tag = str_replace( '<script ', '<script type="module" ', $tag );
    }
    return $tag;
}

// ── [mamboleo] shortcode → mounts the React app ───────────────────────────────
add_shortcode( 'mamboleo', 'mamboleo_shortcode' );
function mamboleo_shortcode(): string {
    // Ensure assets are enqueued even if called outside the normal loop
    mamboleo_enqueue_app();
    return '<div id="root"></div>';
}

// ── REST API ──────────────────────────────────────────────────────────────────
//
// Endpoints:
//   POST /wp-json/mamboleo/v1/report              → create an `incident` post
//   POST /wp-json/mamboleo/v1/corroborate/{id}    → toggle "I see this too" for
//                                                   the current PHP session
//
// Both endpoints are public (permission_callback => __return_true). A PHP
// session is started so that the same browser can un-confirm its own
// corroboration. The list of session IDs that confirmed a given incident is
// stored in post meta `_mamboleo_corroborators`.

add_action( 'rest_api_init', 'mamboleo_register_rest_routes' );
function mamboleo_register_rest_routes(): void {
    register_rest_route( 'mamboleo/v1', '/report', [
        'methods'             => 'POST',
        'callback'            => 'mamboleo_rest_submit_report',
        'permission_callback' => '__return_true',
    ] );

    register_rest_route( 'mamboleo/v1', '/corroborate/(?P<id>\d+)', [
        'methods'             => 'POST',
        'callback'            => 'mamboleo_rest_toggle_corroboration',
        'permission_callback' => '__return_true',
        'args'                => [
            'id' => [
                'validate_callback' => static fn( $v ) => is_numeric( $v ),
            ],
        ],
    ] );

    register_rest_route( 'mamboleo/v1', '/view/(?P<id>\d+)', [
        'methods'             => 'POST',
        'callback'            => 'mamboleo_rest_record_view',
        'permission_callback' => '__return_true',
        'args'                => [
            'id' => [
                'validate_callback' => static fn( $v ) => is_numeric( $v ),
            ],
        ],
    ] );
}

function mamboleo_start_session(): string {
    if ( PHP_SESSION_ACTIVE !== session_status() ) {
        if ( ! headers_sent() ) {
            session_set_cookie_params( [
                'lifetime' => 60 * 60 * 24 * 30, // 30 days
                'path'     => '/',
                'secure'   => is_ssl(),
                'httponly' => true,
                'samesite' => 'Lax',
            ] );
        }
        @session_start();
    }
    return session_id();
}

function mamboleo_rest_submit_report( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    if ( ! is_array( $params ) ) {
        $params = $request->get_params();
    }

    // ── Rate limit: 1 report per 10 minutes per session ─────────────────
    mamboleo_start_session();
    $last = $_SESSION['mamboleo_last_report'] ?? 0;
    if ( $last && ( time() - $last ) < 600 ) {
        return new WP_Error(
            'mamboleo_rate_limited',
            'You can only submit one report every 10 minutes.',
            [ 'status' => 429 ]
        );
    }

    // ── Validate required fields ────────────────────────────────────────
    $title = isset( $params['title'] ) ? sanitize_text_field( (string) $params['title'] ) : '';
    $type  = isset( $params['type'] )  ? sanitize_key( (string) $params['type'] )         : '';
    $lat   = isset( $params['latitude'] )  ? (float) $params['latitude']  : null;
    $lng   = isset( $params['longitude'] ) ? (float) $params['longitude'] : null;

    if ( $title === '' || $type === '' || $lat === null || $lng === null ) {
        return new WP_Error(
            'mamboleo_invalid',
            'Missing required fields: title, type, latitude, longitude.',
            [ 'status' => 400 ]
        );
    }

    $allowed_types = [ 'fire', 'accident', 'police', 'weather' ];
    if ( ! in_array( $type, $allowed_types, true ) ) {
        return new WP_Error( 'mamboleo_invalid_type', 'Invalid incident type.', [ 'status' => 400 ] );
    }

    $status         = isset( $params['status'] ) ? sanitize_key( (string) $params['status'] ) : 'unknown';
    $description    = isset( $params['description'] ) ? wp_kses_post( (string) $params['description'] ) : '';
    $incident_time  = isset( $params['incidentTime'] ) ? sanitize_text_field( (string) $params['incidentTime'] ) : '';
    $video_url      = isset( $params['videoUrl'] ) ? esc_url_raw( (string) $params['videoUrl'] ) : '';
    $is_anonymous   = ! empty( $params['isAnonymous'] );
    $reporter_name  = ( ! $is_anonymous && isset( $params['reporterName'] ) )
        ? sanitize_text_field( (string) $params['reporterName'] )
        : '';
    $reporter_phone = ( ! $is_anonymous && isset( $params['reporterPhone'] ) )
        ? sanitize_text_field( (string) $params['reporterPhone'] )
        : '';
    $reporter_email = ( ! $is_anonymous && isset( $params['reporterEmail'] ) )
        ? sanitize_email( (string) $params['reporterEmail'] )
        : '';

    // Named contributors must supply valid contact details.
    if ( ! $is_anonymous ) {
        if ( $reporter_name === '' ) {
            return new WP_Error(
                'mamboleo_invalid_name',
                'Name is required for named reports.',
                [ 'status' => 400 ]
            );
        }
        if ( $reporter_phone === '' || ! preg_match( '/^[+\d][\d\s\-()]{7,20}$/', $reporter_phone ) ) {
            return new WP_Error(
                'mamboleo_invalid_phone',
                'A valid phone number is required for named reports.',
                [ 'status' => 400 ]
            );
        }
        if ( $reporter_email === '' || ! is_email( $reporter_email ) ) {
            return new WP_Error(
                'mamboleo_invalid_email',
                'A valid email address is required for named reports.',
                [ 'status' => 400 ]
            );
        }
    }

    // ── Create post ─────────────────────────────────────────────────────
    // Published immediately so it shows on the map right away, but flagged
    // as `is_verified = false` so the UI badges it as an unconfirmed user
    // report until a moderator verifies it.
    $post_id = wp_insert_post( [
        'post_type'    => 'incident',
        'post_title'   => $title,
        'post_content' => $description,
        'post_excerpt' => wp_trim_words( wp_strip_all_tags( $description ), 40 ),
        'post_status'  => 'publish',
    ], true );

    if ( is_wp_error( $post_id ) ) {
        return new WP_Error( 'mamboleo_insert_failed', $post_id->get_error_message(), [ 'status' => 500 ] );
    }

    // ── Save ACF / meta fields ─────────────────────────────────────────
    $fields = [
        'type'                => $type,
        'status'              => $status,
        'latitude'            => $lat,
        'longitude'           => $lng,
        'severity'            => 'medium',
        'incident_time'       => $incident_time,
        'video_url'           => $video_url,
        'reporter_name'       => $reporter_name,
        'is_anonymous'        => $is_anonymous,
        'is_verified'         => false,
        'corroboration_count' => 0,
    ];

    foreach ( $fields as $key => $value ) {
        if ( function_exists( 'update_field' ) ) {
            update_field( $key, $value, $post_id );
        }
        update_post_meta( $post_id, $key, $value );
    }

    // Audit
    update_post_meta( $post_id, '_mamboleo_reporter_ip', $_SERVER['REMOTE_ADDR'] ?? '' );
    update_post_meta( $post_id, '_mamboleo_reporter_session', session_id() );

    // Private contact details — prefixed with "_" so they are NOT exposed via
    // the REST API or WPGraphQL by default. Only moderators with backend
    // access can see them.
    if ( ! $is_anonymous ) {
        update_post_meta( $post_id, '_mamboleo_reporter_phone', $reporter_phone );
        update_post_meta( $post_id, '_mamboleo_reporter_email', $reporter_email );
    }

    $_SESSION['mamboleo_last_report'] = time();

    return rest_ensure_response( [
        'success' => true,
        'id'      => $post_id,
        'message' => 'Report published. It is marked unconfirmed until verified.',
    ] );
}

function mamboleo_rest_toggle_corroboration( WP_REST_Request $request ) {
    $post_id = (int) $request['id'];
    $post    = get_post( $post_id );

    if ( ! $post || $post->post_type !== 'incident' ) {
        return new WP_Error( 'mamboleo_not_found', 'Incident not found.', [ 'status' => 404 ] );
    }

    $session_id = mamboleo_start_session();
    if ( $session_id === '' ) {
        return new WP_Error( 'mamboleo_no_session', 'Could not establish a session.', [ 'status' => 500 ] );
    }

    $corroborators = get_post_meta( $post_id, '_mamboleo_corroborators', true );
    if ( ! is_array( $corroborators ) ) {
        $corroborators = [];
    }

    $index     = array_search( $session_id, $corroborators, true );
    $confirmed = false;

    if ( $index === false ) {
        // Not yet confirmed → add
        $corroborators[] = $session_id;
        $confirmed       = true;
    } else {
        // Already confirmed → remove (unconfirm)
        array_splice( $corroborators, $index, 1 );
        $confirmed = false;
    }

    update_post_meta( $post_id, '_mamboleo_corroborators', $corroborators );

    $count = count( $corroborators );
    if ( function_exists( 'update_field' ) ) {
        update_field( 'corroboration_count', $count, $post_id );
    }
    update_post_meta( $post_id, 'corroboration_count', $count );

    return rest_ensure_response( [
        'count'     => $count,
        'confirmed' => $confirmed,
    ] );
}

function mamboleo_rest_record_view( WP_REST_Request $request ) {
    $post_id = (int) $request['id'];
    $post    = get_post( $post_id );

    if ( ! $post || $post->post_type !== 'incident' ) {
        return new WP_Error( 'mamboleo_not_found', 'Incident not found.', [ 'status' => 404 ] );
    }

    $session_id = mamboleo_start_session();
    if ( $session_id === '' ) {
        return new WP_Error( 'mamboleo_no_session', 'Could not establish a session.', [ 'status' => 500 ] );
    }

    // ── Total view count (every click counts) ──────────────────────────
    $total = (int) get_post_meta( $post_id, 'view_count', true );
    $total++;
    update_post_meta( $post_id, 'view_count', $total );
    if ( function_exists( 'update_field' ) ) {
        update_field( 'view_count', $total, $post_id );
    }

    // ── Unique viewers (session-deduplicated) ──────────────────────────
    $viewers = get_post_meta( $post_id, '_mamboleo_viewers', true );
    if ( ! is_array( $viewers ) ) {
        $viewers = [];
    }
    if ( ! in_array( $session_id, $viewers, true ) ) {
        $viewers[] = $session_id;
        update_post_meta( $post_id, '_mamboleo_viewers', $viewers );
        update_post_meta( $post_id, 'unique_view_count', count( $viewers ) );
        if ( function_exists( 'update_field' ) ) {
            update_field( 'unique_view_count', count( $viewers ), $post_id );
        }
    }

    return rest_ensure_response( [
        'views'        => $total,
        'uniqueViews'  => count( $viewers ),
    ] );
}

// ── CORS: allow credentials from the configured frontend origin ──────────────
//
// Required so the React dev server (e.g. http://localhost:5173) can send the
// PHP session cookie with fetch({ credentials: 'include' }). Safe in prod too:
// only reflects the Origin header when it matches the site's home URL host or
// when WP_DEBUG is on (dev).
add_action( 'rest_api_init', function (): void {
    remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
    add_filter( 'rest_pre_serve_request', 'mamboleo_rest_cors_headers', 15 );
}, 15 );

function mamboleo_rest_cors_headers( $value ) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ( $origin !== '' ) {
        $host_ok = parse_url( $origin, PHP_URL_HOST ) === parse_url( home_url(), PHP_URL_HOST );
        if ( $host_ok || ( defined( 'WP_DEBUG' ) && WP_DEBUG ) ) {
            header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
            header( 'Access-Control-Allow-Credentials: true' );
            header( 'Vary: Origin' );
            header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
            header( 'Access-Control-Allow-Headers: Content-Type, X-WP-Nonce' );
        }
    }
    return $value;
}