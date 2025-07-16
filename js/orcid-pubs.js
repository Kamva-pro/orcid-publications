jQuery(document).ready(function($) {
    const resultsDiv = $('#publicationsResults');
    const loadMoreBtn = $('#loadMoreBtn');
    const searchInput = $('#pubSearch');
    const yearFilter = $('#yearFilter');
    
    let allWorks = [];
    let currentIndex = 0;
    const pageSize = 10;
    let currentOrcidId = orcidPubVars.current_page;
    let isLoading = false;
    let currentSearch = '';
    let currentYear = '';
    
    // Initial load
    if (currentOrcidId) {
        fetchPublications();
    } else {
        resultsDiv.html('');
    }
    
    // Search handler
    searchInput.on('input', function() {
        currentSearch = $(this).val();
        currentIndex = 0;
        resultsDiv.empty();
        fetchPublications();
    });
    
    // Year filter handler
    yearFilter.on('change', function() {
        currentYear = $(this).val();
        currentIndex = 0;
        resultsDiv.empty();
        fetchPublications();
    });
    
    // Load more handler
    loadMoreBtn.on('click', function() {
        if (!isLoading) {
            fetchPublications();
        }
    });
    
    function fetchPublications() {
        isLoading = true;
        showLoadingState();
        
        const endpoint = currentOrcidId === 'all' 
            ? 'publications' 
            : `publications/${currentOrcidId}`;
            
        const params = {
            page: Math.floor(currentIndex / pageSize) + 1,
            limit: pageSize,
            search: currentSearch,
            year: currentYear
        };
        
        $.get({
            url: `${orcidPubVars.rest_url}/${endpoint}`,
            data: params,
            success: function(response) {
                if (currentIndex === 0) {
                    allWorks = response.data;
                    resultsDiv.empty();
                } else {
                    allWorks = [...allWorks, ...response.data];
                }
                
                displayWorks(response.data);
                
                currentIndex += response.data.length;
                
                if (currentIndex < response.total) {
                    loadMoreBtn.show();
                } else {
                    loadMoreBtn.hide();
                }
                
                if (response.data.length === 0 && currentIndex === 0) {
                    showEmptyState();
                }
            },
            error: function(xhr, status, error) {
                showErrorState(error);
            },
            complete: function() {
                isLoading = false;
            }
        });
    }
    
    function displayWorks(works) {
        if (works.length === 0 && currentIndex === 0) {
            showEmptyState();
            return;
        }
        
        works.forEach(work => {
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