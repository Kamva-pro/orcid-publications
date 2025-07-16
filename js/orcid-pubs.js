jQuery(document).ready(function($) {
    const resultsDiv = $('#publicationsResults');
    const loadMoreBtn = $('#loadMoreBtn');
    const searchInput = $('#pubSearch');
    const yearFilter = $('#yearFilter');
    
    let allWorks = [];
    let displayedWorks = [];
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
        fetchPublications();
    });
    
    // Year filter handler
    yearFilter.on('change', function() {
        currentYear = $(this).val();
        currentIndex = 0;
        fetchPublications();
    });
    
    // Load more handler
    loadMoreBtn.on('click', function() {
        if (!isLoading) {
            currentIndex += pageSize;
            fetchPublications();
        }
    });
    
    function fetchPublications() {
        isLoading = true;
        
        // Only show loading state on initial load or when filters change
        if (currentIndex === 0) {
            showLoadingState();
        }
        
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
                    // First load or filter changed - replace all works
                    allWorks = response.data;
                    resultsDiv.empty(); // Only clear on initial load
                } else {
                    // Append new works to existing ones
                    allWorks = [...allWorks, ...response.data];
                }
                
                // Display all loaded works (not just the new ones)
                displayWorks(allWorks.slice(0, currentIndex + pageSize));
                
                // Update pagination controls
                if (currentIndex + pageSize < response.total) {
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
    
    function displayWorks(worksToDisplay) {
        if (worksToDisplay.length === 0) {
            showEmptyState();
            return;
        }
        
        // Clear only if it's the first page
        if (currentIndex === 0) {
            resultsDiv.empty();
        }
        
        // Only append the new works (not all of them)
        const worksToAdd = currentIndex === 0 
            ? worksToDisplay 
            : worksToDisplay.slice(currentIndex);
        
        worksToAdd.forEach(work => {
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
    }});
