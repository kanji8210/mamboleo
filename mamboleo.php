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