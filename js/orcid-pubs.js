jQuery(document).ready(function($) {
    const resultsDiv = $('#publicationsResults');
    const loadMoreBtn = $('#loadMoreBtn');
    const searchInput = $('#pubSearch');
    const yearFilter = $('#yearFilter');

    let allWorks = [];
    let currentPage = 1;
    const pageSize = 10;
    let currentOrcidContext = orcidPubVars.current_page; // This is crucial and must be correctly populated by PHP
    let isLoading = false;
    let currentSearch = '';
    // Initialize currentYear with the value of the visually selected option from PHP
    let currentYear = yearFilter.val(); // This will be '2025' on initial load

    let totalPublications = 0;

    // --- START CORRECTED JAVASCRIPT INITIALIZATION ---
    if (currentOrcidContext) {
        // If we are on a recognized publications page, immediately start fetching
        fetchPublications();
    } else {
        // If not a recognized page, show the "not configured" message
        resultsDiv.html(`
            <div class="empty-state">
                <i class="fas fa-info-circle"></i>
                <h3>Plugin Not Configured for This Page</h3>
                <p>Please ensure the shortcode is on the main publications page or a team member profile page with correct URL structure.</p>
            </div>
        `);
        loadMoreBtn.hide();
        // Hide initial empty state if present from PHP, as we're showing our own
        resultsDiv.find('.empty-state').remove();
    }
    // --- END CORRECTED JAVASCRIPT INITIALIZATION ---

    // Search handler
    searchInput.on('input', function() {
        currentSearch = $(this).val();
        currentPage = 1;
        fetchPublications();
    });

    // Year filter handler
    yearFilter.on('change', function() {
        currentYear = $(this).val();
        currentPage = 1;
        fetchPublications();
    });

    // Load more handler
    loadMoreBtn.on('click', function(e) {
        e.preventDefault();
        if (!isLoading) {
            currentPage++;
            fetchPublications(true);
        }
    });

    function fetchPublications(isLoadMore = false) {
        if (isLoading) return;

        isLoading = true;

        if (!isLoadMore) {
            // On initial load or filter change, ensure we show loading state
            // and clear previous content (like the initial PHP placeholder)
            showLoadingState();
        } else {
            loadMoreBtn.prop('disabled', true)
                       .html('<i class="fas fa-spinner fa-spin"></i> Loading...');
        }

        let endpoint;
        const params = {
            page: currentPage,
            limit: pageSize,
            search: currentSearch,
            year: currentYear
        };

        if (currentOrcidContext === 'all') {
            endpoint = 'publications';
        } else {
            endpoint = `publications/${currentOrcidContext}`;
            // No need to delete params.researcher as it's not added for this endpoint.
            // If for some reason it's being added elsewhere, ensure it's not.
        }

        $.get({
            url: `${orcidPubVars.rest_url}/${endpoint}`,
            data: params,
            success: function(response) {
                totalPublications = response.total;

                if (!isLoadMore) {
                    allWorks = response.data;
                    resultsDiv.empty(); // Clear existing content for new fetch
                } else {
                    allWorks = [...allWorks, ...response.data];
                }

                displayWorks(allWorks);

                if (allWorks.length < totalPublications) {
                    loadMoreBtn.show();
                } else {
                    loadMoreBtn.hide();
                }

                if (totalPublications === 0) {
                    showEmptyState();
                }
            },
            error: function(xhr, status, error) {
                showErrorState(xhr.responseJSON ? xhr.responseJSON.error : error);
                if (isLoadMore) {
                    currentPage--;
                }
            },
            complete: function() {
                isLoading = false;
                if (isLoadMore) {
                    loadMoreBtn.prop('disabled', false)
                               .html('<i class="fas fa-arrow-down"></i> Load More');
                }
            }
        });
    }

    function displayWorks(works) {
        console.log('displayWorks called. Number of works to display:', works.length);
        console.log('Works array content (first 2):', works.slice(0, 2));

        // Clear any previous states (loading, empty, error). This should always happen.
        console.log('Clearing previous states (loading, empty, error).');
        resultsDiv.find('.loading, .empty-state, .error-state').remove();

        // If it's the first page of a fetch (meaning it's not a "Load More" action),
        // clear the entire results container before appending new content.
        // This ensures the initial PHP placeholder is removed and previous filter results are cleared.
        if (currentPage === 1) { // Removed !isLoading condition here
            console.log('Clearing resultsDiv for a new fetch (currentPage is 1).');
            resultsDiv.empty();
        }

        if (works.length === 0) {
            console.log('Works array is empty, showing empty state.');
            showEmptyState();
            return;
        }

        works.forEach(work => {
            // Basic validation for critical properties
            if (!work.title || !work.author || !work.date) {
                console.warn('Skipping malformed work entry:', work);
                return;
            }
            const workEntry = $(`
                <div class="work-entry">
                    <div class="date-col">
                        <div class="date">
                            <i class="far fa-calendar-alt"></i> ${work.date}
                        </div>
                    </div>
                    <div class="content-col">
                        <div class="title">${work.title}</div>
                        <div class="author">by ${work.author}</div>
                        ${work.url ? `
                            <a class="read-more" href="${work.url}" target="_blank" rel="noopener noreferrer">
                                View Publication <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                    </div>
                </div>
            `);
            resultsDiv.append(workEntry);
        });
        console.log('Finished appending works. ResultsDiv content now:', resultsDiv.html()); // Final check
    }

    function showLoadingState() {
        resultsDiv.html(`
            <div class="loading">
                <div class="spinner"></div>
                <h3>Loading Publications</h3>
                <p>Please wait while we fetch the latest research...</p>
            </div>
        `);
        loadMoreBtn.hide();
    }

    function showEmptyState() {
        resultsDiv.html(`
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>No Publications Found</h3>
                <p>No publications match your current filters.</p>
            </div>
        `);
        loadMoreBtn.hide();
    }

    function showErrorState(error) {
        resultsDiv.html(`
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Publications</h3>
                <p>${error || 'An unknown error occurred'}</p>
                <p>Please try again later.</p>
            </div>
        `);
        loadMoreBtn.hide();
    }
});