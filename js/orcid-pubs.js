jQuery(document).ready(function($) {
    const resultsDiv = $('#publicationsResults');
    const loadMoreBtn = $('#loadMoreBtn');
    const searchInput = $('#pubSearch');
    const yearFilter = $('#yearFilter');

    let allWorks = [];
    let currentPage = 1;
    const pageSize = 10;
    let currentOrcidContext = orcidPubVars.current_page;
    let isLoading = false;
    let currentSearch = '';
    let currentYear = yearFilter.val(); 
    let apiUrl;

    let totalPublications = 0;

    fetchPublications();
    
  
    searchInput.on('input', function() {
        currentSearch = $(this).val();
        currentPage = 1;
        fetchPublications();
    });

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
            showLoadingState();
        } else {
            loadMoreBtn.prop('disabled', true)
                       .html('<i class="fas fa-spinner fa-spin"></i> Loading...');
        }
    
        // NEW: Build endpoint with non-ORCID support
        let endpoint;
        const params = {
            page: currentPage,
            limit: pageSize,
            search: currentSearch,
            year: currentYear
        };
    
        if (currentOrcidContext.startsWith('non_orcid:')) {
            const researcher_slug = currentOrcidContext.replace('non_orcid:', '');
            endpoint = `non-orcid-publications/${researcher_slug}`;
        } else if (currentOrcidContext === 'all') {
            endpoint = 'publications';
        } else {
            endpoint = `publications/${currentOrcidContext}`;
        }
    
        $.get({
            url: `${orcidPubVars.rest_url}/${endpoint}`,
            data: params,
            success: function(response) {
                totalPublications = response.total;
    
                if (!isLoadMore) {
                    allWorks = response.data;
                    resultsDiv.empty();
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
    if (!work.title || !work.author || !work.date) return;

    const workEntry = $(`
        <div class="work-entry">
            <div class="work-date">
                <div class="date-icon"><i class="far fa-calendar-alt"></i></div>
                <div class="date-text">${work.date}</div>
            </div>
            <div class="work-content">
                <div class="work-title">${work.title}</div>
                <div class="work-author">by ${work.author}</div>
                ${work.url ? `
                    <a class="work-link" href="${work.url}" target="_blank" rel="noopener noreferrer">
                        View Publication <i class="fas fa-external-link-alt"></i>
                    </a>` : ''}
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