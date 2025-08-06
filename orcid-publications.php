<?php
/*
Plugin Name: ORCID Publications
Description: Displays ORCID publications with filtering and context-aware display
Version: 1.0.8
Author: <a href="https://dynamite.agency" target="_blank">Dynamite Agency</a>
Update URI: https://github.com/Kamva-pro/orcid-publications
*/


defined('ABSPATH') or die('Direct access not allowed');

class ORCID_Publications_Plugin {
    private $researchers;
    private $option_key = 'orcid_publications_researchers';

    public function __construct() {
        $this->researchers = $this->get_researchers();
        
        // Register hooks
        add_action('init', [$this, 'init']);
        add_action('rest_api_init', [$this, 'register_api_routes']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        add_shortcode('orcid_publications', [$this, 'render_publications']);
        
        // Admin hooks
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'settings_init']);
    }

    public function init() {
        if (false === $this->researchers) {
            $this->set_default_researchers();
        }
    }

    private function get_researchers() {
        return get_option($this->option_key, false);
    }

    private function set_default_researchers() {
        $default_researchers = [
            [
                'id' => '0000-0002-7629-0636',
                'name' => 'Prof Shabir Madhi',
                'url_segment' => 'prof-shabir-madhi'
            ],
            [
                'id' => '0000-0003-4089-147X',
                'name' => 'Prof Ziyaad Dangor',
                'url_segment' => 'professor-ziyaad-dangor'
            ],
            [
                'id' => '0000-0001-5893-3725',
                'name' => 'Prof Michelle Groome',
                'url_segment' => 'dr-michelle-groome'
            ],
            [
                'id' => '0000-0003-1327-9090',
                'name' => 'Dr Vicky Baillie',
                'url_segment' => 'dr-vicky-lynne-baillie'
            ],
            [
                'id' => '0000-0002-5547-7223',
                'name' => 'Dr Alane Izu',
                'url_segment' => 'dr-alane-izu'
            ],
            [
                'id' => '0000-0001-6420-8511',
                'name' => 'Dr Anthonet Koen',
                'url_segment' => 'anthonet-koen'
            ],
            [
                'id' => '0009-0007-3674-8415',
                'name' => 'Dr Courtney Olwagen',
                'url_segment' => 'dr-courtney-olwagen'
            ],
            [
                'id' => '0000-0001-9113-6584',
                'name' => 'Dr Renate Strehlau',
                'url_segment' => 'dr-renate-strehlau'
            ],
            [
                'id' => '0000-0001-8230-4910',
                'name' => 'Dr Shama Khan',
                'url_segment' => 'dr-shama-khan'
            ],
            [
                'id' => '0000-0003-2033-270X',
                'name' => 'Dr Siobhan Johnstone',
                'url_segment' => 'dr-siobhan-johnstone'
            ],
            [
                'id' => '0000-0002-9308-7525',
                'name' => 'Dr Takwanisa Machemedze',
                'url_segment' => 'dr-takwanisa-machemedze'
            ],
            [
                'id' => '0000-0001-5871-5373',
                'name' => 'Dr Sarah Downs',
                'url_segment' => 'dr-sarah-downs'
            ],
            [
                'id' => '0000-0002-7213-5399',
                'name' => 'Dr Megan Dempster',
                'url_segment' => 'dr-megan-dempster'
            ],
            [
                'id' => '0000-0003-0767-6233',
                'name' => 'Dr Thulo Monare',
                'url_segment' => 'dr-thulo-monare'
            ]
        ];
        
        update_option($this->option_key, $default_researchers);
        $this->researchers = $default_researchers;
    }

    public function register_api_routes() {
        register_rest_route('orcid-pubs/v1', '/publications', [
            'methods' => 'GET',
            'callback' => [$this, 'get_publications'],
            'permission_callback' => '__return_true'
        ]);
        
        register_rest_route('orcid-pubs/v1', '/publications/(?P<orcid_id>[a-zA-Z0-9\-]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_researcher_publications'],
            'permission_callback' => '__return_true'
        ]);
    }

    public function enqueue_assets() {
        wp_enqueue_style('orcid-pubs-css', plugins_url('css/orcid-pubs.css', __FILE__));
        wp_enqueue_script('orcid-pubs-js', plugins_url('js/orcid-pubs.js', __FILE__), ['jquery'], null, true);
        
        wp_localize_script('orcid-pubs-js', 'orcidPubVars', [
            'rest_url' => rest_url('orcid-pubs/v1'),
            'current_page' => $this->get_current_page_context(),
            'current_researcher' => isset($_GET['researcher']) ? sanitize_text_field($_GET['researcher']) : ''
        ]);
    }

    private function get_current_page_context() {
        $current_path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $current_path = untrailingslashit($current_path); // Normalize by removing trailing slash

        // Option 1: Main Publications Page
        if ($current_path === '/publications') { // Exact match for the main page
            return 'all';
        }

        // Option 2: Team Member Page (by URL parameter, e.g., /team-member/?researcher=slug)
        if (isset($_GET['researcher'])) {
            $slug = sanitize_text_field($_GET['researcher']);
            foreach ($this->researchers as $researcher) {
                if ($researcher['url_segment'] === $slug) {
                    return $researcher['id'];
                }
            }
        }

        // Option 3: Team Member Page (by URL slug, e.g., /team-member/prof-shabir-madhi/)
        // Check if the path starts with '/team-member/' and is longer than just '/team-member'
        if (strpos($current_path, '/team-member/') === 0 && strlen($current_path) > strlen('/team-member')) {
            $parts = explode('/', $current_path);
            $slug = end($parts); // Get the last part of the path (the slug)
            
            // Clean the slug just in case
            $slug = sanitize_title($slug); 

            foreach ($this->researchers as $researcher) {
                if ($researcher['url_segment'] === $slug) {
                    return $researcher['id'];
                }
            }
        }
        
        // If none of the above conditions match, it's not a recognized context for the plugin
        return '';
    }


   public function render_publications() {
        ob_start(); ?>
        <div class="orcid-publications-container">
            <div class="publications-header">
                <div class="controls">
                    <div class="search-box">
                        <input type="text" id="pubSearch" placeholder="Search publications...">
                        <i class="fas fa-search"></i>
                    </div>
                    <select id="yearFilter">
                        <option value="">All Years</option>
                        <?php
                        $current_year = date('Y'); // Get the current year (e.g., 2025)
                        for ($year = $current_year; $year >= 2000; $year--): ?>
                            <option value="<?php echo $year; ?>" <?php echo ($year == $current_year) ? 'selected' : ''; ?>>
                                <?php echo $year; ?>
                            </option>
                        <?php endfor; ?>
                    </select>
                </div>
            </div>

            <div id="publicationsResults">
                <div class="empty-state">
                    <i class="fas fa-cloud"></i>
                    <h3>No Publications Loaded</h3>
                    <p>Loading publications from ORCID...</p>
                </div>
            </div>

            <button id="loadMoreBtn" style="display:none;">
                <i class="fas fa-arrow-down"></i>
                Load More
            </button>
        </div>
        <?php
        return ob_get_clean();
    }

    // Admin menu and settings
    public function add_admin_menu() {
        add_options_page(
            'ORCID Publications Settings',
            'ORCID Publications',
            'manage_options',
            'orcid-publications',
            [$this, 'options_page_html']
        );
    }

    public function settings_init() {
        register_setting('orcid-publications', $this->option_key, [
            'sanitize_callback' => [$this, 'sanitize_researchers']
        ]);

        add_settings_section(
            'orcid_researchers_section',
            'Manage Researchers',
            [$this, 'settings_section_html'],
            'orcid-publications'
        );
    }

    public function settings_section_html() {
        echo '<p>Add or modify researchers and their ORCID IDs</p>';
    }

    public function options_page_html() {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('orcid-publications');
                do_settings_sections('orcid-publications');
                $this->researchers_table_html();
                submit_button('Save Researchers');
                ?>
            </form>
        </div>
        <?php
    }

    private function researchers_table_html() {
        ?>
        <table class="form-table" id="orcid-researchers-table">
            <thead>
                <tr>
                    <th>ORCID ID</th>
                    <th>Name</th>
                    <th>URL Segment</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($this->researchers as $index => $researcher): ?>
                <tr>
                    <td>
                        <input type="text" name="<?php echo $this->option_key; ?>[<?php echo $index; ?>][id]" 
                               value="<?php echo esc_attr($researcher['id']); ?>" class="regular-text">
                    </td>
                    <td>
                        <input type="text" name="<?php echo $this->option_key; ?>[<?php echo $index; ?>][name]" 
                               value="<?php echo esc_attr($researcher['name']); ?>" class="regular-text">
                    </td>
                    <td>
                        <input type="text" name="<?php echo $this->option_key; ?>[<?php echo $index; ?>][url_segment]" 
                               value="<?php echo esc_attr($researcher['url_segment']); ?>" class="regular-text">
                    </td>
                    <td>
                        <button type="button" class="button button-secondary remove-researcher">Remove</button>
                    </td>
                </tr>
                <?php endforeach; ?>
                <tr id="new-researcher-row">
                    <td>
                        <input type="text" name="<?php echo $this->option_key; ?>[new][0][id]" 
                               value="" class="regular-text" placeholder="0000-0000-0000-0000">
                    </td>
                    <td>
                        <input type="text" name="<?php echo $this->option_key; ?>[new][0][name]" 
                               value="" class="regular-text" placeholder="Full Name">
                    </td>
                    <td>
                        <input type="text" name="<?php echo $this->option_key; ?>[new][0][url_segment]" 
                               value="" class="regular-text" placeholder="URL segment">
                    </td>
                    <td>
                        <button type="button" class="button button-primary add-researcher">Add</button>
                    </td>
                </tr>
            </tbody>
        </table>
        <?php
    }

    public function sanitize_researchers($input) {
        $output = [];
        $seen_ids = [];
        
        // Process existing researchers
        foreach ($input as $key => $researchers) {
            if ($key === 'new') continue;
            
            foreach ($researchers as $index => $researcher) {
                if (empty($researcher['id'])) continue;
                
                $id = sanitize_text_field($researcher['id']);
                $name = sanitize_text_field($researcher['name']);
                $url_segment = sanitize_title($researcher['url_segment']);
                
                if (!preg_match('/^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9X]{4}$/', $id)) {
                    add_settings_error($this->option_key, 'invalid_orcid', 'Invalid ORCID ID format');
                    continue;
                }
                
                if (in_array($id, $seen_ids)) {
                    add_settings_error($this->option_key, 'duplicate_orcid', 'Duplicate ORCID ID found');
                    continue;
                }
                
                $output[] = [
                    'id' => $id,
                    'name' => $name,
                    'url_segment' => $url_segment
                ];
                
                $seen_ids[] = $id;
            }
        }
        
        // Process new researchers
        if (!empty($input['new'])) {
            foreach ($input['new'] as $researcher) {
                if (empty($researcher['id'])) continue;
                
                $id = sanitize_text_field($researcher['id']);
                $name = sanitize_text_field($researcher['name']);
                $url_segment = sanitize_title($researcher['url_segment']);
                
                if (!preg_match('/^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9X]{4}$/', $id)) {
                    add_settings_error($this->option_key, 'invalid_orcid', 'Invalid ORCID ID format');
                    continue;
                }
                
                if (in_array($id, $seen_ids)) {
                    add_settings_error($this->option_key, 'duplicate_orcid', 'Duplicate ORCID ID found');
                    continue;
                }
                
                $output[] = [
                    'id' => $id,
                    'name' => $name,
                    'url_segment' => $url_segment
                ];
                
                $seen_ids[] = $id;
            }
        }
        
        return $output;
    }

    // (get_publications, get_researcher_publications, fetch_orcid_works, etc.)
    public function get_publications(WP_REST_Request $request) {
        $params = $request->get_params();
        $page = isset($params['page']) ? max(1, intval($params['page'])) : 1;
        $limit = isset($params['limit']) ? max(1, intval($params['limit'])) : 10;
        $search = isset($params['search']) ? sanitize_text_field($params['search']) : '';
        $year = isset($params['year']) ? intval($params['year']) : null;
        $researcher_slug = isset($params['researcher']) ? sanitize_text_field($params['researcher']) : null;

        $all_works = [];
        $researchers_to_check = $this->researchers;
        
        // Filter researchers if slug is provided
        if ($researcher_slug) {
            $researchers_to_check = array_filter($this->researchers, 
                function($r) use ($researcher_slug) {
                    return $r['url_segment'] === $researcher_slug;
                }
            );
        }
    
        foreach ($researchers_to_check as $researcher) {
            $works = $this->fetch_orcid_works($researcher['id']);
            if ($works) {
                foreach ($works as $work) {
                    $entry = $this->format_work_entry($work, $researcher['name']);
                    if ($this->filter_work($entry, $search, $year)) {
                        $entry['orcid_id'] = $researcher['id'];
                        $all_works[] = $entry;
                    }
                }
            }
        }

        usort($all_works, function($a, $b) {
            return strtotime($b['raw_date']) - strtotime($a['raw_date']);
        });

        $total = count($all_works);
        $total_pages = ceil($total / $limit);
        $offset = ($page - 1) * $limit;
        $data = array_slice($all_works, $offset, $limit);

        return [
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => $total_pages,
            'data' => $data
        ];
    }

    public function get_researcher_publications(WP_REST_Request $request) {
        $orcid_id = $request->get_param('orcid_id');
        $params = $request->get_params();
        $page = isset($params['page']) ? max(1, intval($params['page'])) : 1;
        $limit = isset($params['limit']) ? max(1, intval($params['limit'])) : 10;
        $search = isset($params['search']) ? sanitize_text_field($params['search']) : '';
        $year = isset($params['year']) ? intval($params['year']) : null;

        $researcher = null;
        foreach ($this->researchers as $r) {
            if ($r['id'] === $orcid_id) {
                $researcher = $r;
                break;
            }
        }

        if (!$researcher) {
            return new WP_REST_Response(['error' => 'Researcher not found'], 404);
        }

        $works = $this->fetch_orcid_works($orcid_id);
        $filtered_works = [];

        if ($works) {
            foreach ($works as $work) {
                $entry = $this->format_work_entry($work, $researcher['name']);
                if ($this->filter_work($entry, $search, $year)) {
                    $filtered_works[] = $entry;
                }
            }
        }

        usort($filtered_works, function($a, $b) {
            return strtotime($b['raw_date']) - strtotime($a['raw_date']);
        });

        $total = count($filtered_works);
        $total_pages = ceil($total / $limit);
        $offset = ($page - 1) * $limit;
        $data = array_slice($filtered_works, $offset, $limit);

        return [
            'researcher' => $researcher,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => $total_pages,
            'data' => $data
        ];
    }

    private function filter_work($work, $search, $year) {
        if ($search && 
            stripos($work['title'], $search) === false && 
            stripos($work['author'], $search) === false) {
            return false;
        }
        
        if ($year && date('Y', strtotime($work['raw_date'])) != $year) {
            return false;
        }
        
        return true;
    }

    private function fetch_orcid_works($orcid_id) {
        $transient_key = 'orcid_works_' . md5($orcid_id);
        $cached = get_transient($transient_key);

        if ($cached !== false) {
            return $cached;
        }

        $url = "https://pub.orcid.org/v3.0/{$orcid_id}/works";
        $args = [
            'headers' => ['Accept' => 'application/json'],
            'timeout' => 30
        ];

        $response = wp_remote_get($url, $args);

        if (is_wp_error($response)) {
            error_log('ORCID API Error: ' . $response->get_error_message());
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (isset($data['group'])) {
            set_transient($transient_key, $data['group'], DAY_IN_SECONDS);
            return $data['group'];
        }

        return null;
    }

    private function format_work_entry($group, $author_name) {
        $work = $group['work-summary'][0] ?? [];
        $title = $work['title']['title']['value'] ?? 'Untitled Publication';
        $url = $work['url']['value'] ?? null;
        $date = $this->parse_work_date($work);

        return [
            'title' => $title,
            'author' => $author_name,
            'url' => $url,
            'date' => $date['formatted'],
            'raw_date' => $date['iso'],
            'year' => $date['year'],
            'orcid_data' => $work
        ];
    }

    private function parse_work_date($work) {
        $pub_date = $work['publication-date'] ?? null;
        if (!$pub_date) return [
            'formatted' => 'Date Unknown',
            'iso' => '',
            'year' => ''
        ];

        $year = $pub_date['year']['value'] ?? '1970';
        $month = isset($pub_date['month']['value']) ? str_pad($pub_date['month']['value'], 2, '0', STR_PAD_LEFT) : '01';
        $day = isset($pub_date['day']['value']) ? str_pad($pub_date['day']['value'], 2, '0', STR_PAD_LEFT) : '01';

        $iso_date = "{$year}-{$month}-{$day}";
        $formatted = date('j M Y', strtotime($iso_date));

        return [
            'formatted' => $formatted,
            'iso' => $iso_date,
            'year' => $year
        ];
    }
}

require_once plugin_dir_path(__FILE__) . 'vendor/autoload.php';
use YahnisElsts\PluginUpdateChecker\v5\PucFactory;

$myUpdateChecker = PucFactory::buildUpdateChecker(
    'https://github.com/Kamva-pro/orcid-publications', 
    __FILE__,
    'orcid-publications'
);

// Add these configurations:
$myUpdateChecker->setBranch('main');
$myUpdateChecker->getVcsApi()->enableReleaseAssets();

// For private repos (if needed):
$myUpdateChecker->setAuthentication([
    'token' => 'your-github-token' // Only needed for private repos
]);


new ORCID_Publications_Plugin();